// Routes for writing sessions and their events.
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { computeMetrics } from "../metrics.js";

export const sessionsRouter = Router();

const VALID_EVENT_TYPES = new Set(["INSERT", "DELETE", "PASTE", "PAUSE"]);

// Prepared statements (compiled once, reused per request).
const insertSession = db.prepare(`
  INSERT INTO sessions (id, document_id, document_title, source, scenario, started_at, ended_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
`);
const insertEvent = db.prepare(`
  INSERT INTO events (session_id, type, at, length, meta) VALUES (?, ?, ?, ?, ?)
`);
const selectSession = db.prepare("SELECT * FROM sessions WHERE id = ?");
const selectAllSessions = db.prepare("SELECT * FROM sessions ORDER BY created_at DESC");
const selectEventsForSession = db.prepare(
  "SELECT type, at, length, meta FROM events WHERE session_id = ? ORDER BY id ASC",
);
const setEndedAt = db.prepare("UPDATE sessions SET ended_at = ? WHERE id = ?");

// A small error type so route handlers can signal a specific HTTP status.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// POST /api/sessions — create a session, return its id.
sessionsRouter.post("/", (req, res) => {
  const { documentId, documentTitle, source, scenario, startedAt } = req.body ?? {};

  const id = randomUUID();
  const now = new Date().toISOString();
  insertSession.run(
    id,
    documentId ?? null,
    documentTitle ?? null,
    source ?? null,
    scenario ?? null,
    startedAt ?? now,
    now,
  );

  res.status(201).json({ id });
});

// POST /api/sessions/:id/events — append a batch of events.
sessionsRouter.post("/:id/events", (req, res) => {
  const session = selectSession.get(req.params.id);
  if (!session) {
    throw new HttpError(404, "Session not found");
  }

  const events = req.body?.events;
  if (!Array.isArray(events)) {
    throw new HttpError(400, "Body must contain an 'events' array");
  }

  let inserted = 0;
  for (const event of events) {
    if (!VALID_EVENT_TYPES.has(event?.type)) {
      throw new HttpError(400, `Invalid event type: ${event?.type}`);
    }
    insertEvent.run(
      session.id,
      event.type,
      event.at ?? null,
      Number.isFinite(event.length) ? event.length : 0,
      event.meta != null ? JSON.stringify(event.meta) : null,
    );
    inserted += 1;
  }

  res.status(201).json({ inserted });
});

// PATCH /api/sessions/:id — mark the session as ended.
sessionsRouter.patch("/:id", (req, res) => {
  const session = selectSession.get(req.params.id);
  if (!session) {
    throw new HttpError(404, "Session not found");
  }

  const endedAt = req.body?.endedAt ?? new Date().toISOString();
  setEndedAt.run(endedAt, session.id);
  res.json({ id: session.id, endedAt });
});

// GET /api/sessions — list all sessions with computed metrics.
sessionsRouter.get("/", (_req, res) => {
  const sessions = selectAllSessions.all().map((session) => ({
    ...session,
    metrics: computeMetrics(session, selectEventsForSession.all(session.id)),
  }));
  res.json({ sessions });
});

// GET /api/sessions/:id — one session with its events and metrics.
sessionsRouter.get("/:id", (req, res) => {
  const session = selectSession.get(req.params.id);
  if (!session) {
    throw new HttpError(404, "Session not found");
  }

  const events = selectEventsForSession.all(session.id);
  res.json({
    ...session,
    events,
    metrics: computeMetrics(session, events),
  });
});
