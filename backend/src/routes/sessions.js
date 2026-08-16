// Routes for writing sessions and their events.
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { computeMetrics } from "../metrics.js";

export const sessionsRouter = Router();

const VALID_EVENT_TYPES = new Set(["INSERT", "DELETE", "PASTE", "PAUSE"]);

// Prepared statements (compiled once, reused per request).
const insertSession = db.prepare(`
  INSERT INTO sessions (id, document_id, document_title, source, started_at, ended_at, created_at)
  VALUES (?, ?, ?, ?, ?, NULL, ?)
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
  const { documentId, documentTitle, source, startedAt } = req.body ?? {};

  const id = randomUUID();
  const now = new Date().toISOString();
  insertSession.run(
    id,
    documentId ?? null,
    documentTitle ?? null,
    source ?? null,
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

// Column order for the CSV export.
const EXPORT_COLUMNS = [
  "sessionId", "documentId", "documentTitle", "sessionStartedAt", "sessionEndedAt",
  "type", "at", "length", "position", "start", "end", "author", "docSession", "index",
];

function toCsv(rows) {
  const escape = (value) => {
    const s = value == null ? "" : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = EXPORT_COLUMNS.join(",");
  const lines = rows.map((row) => EXPORT_COLUMNS.map((c) => escape(row[c])).join(","));
  return [header, ...lines].join("\n");
}

// GET /api/sessions/export — one flattened row per event, for the offline
// (Python) analysis. JSON by default, or CSV with ?format=csv. Declared before
// "/:id" so "export" is not matched as a session id.
sessionsRouter.get("/export", (req, res) => {
  const rows = [];
  for (const session of selectAllSessions.all()) {
    for (const event of selectEventsForSession.all(session.id)) {
      const meta = event.meta ? JSON.parse(event.meta) : {};
      rows.push({
        sessionId: session.id,
        documentId: session.document_id,
        documentTitle: session.document_title,
        sessionStartedAt: session.started_at,
        sessionEndedAt: session.ended_at,
        type: event.type,
        at: event.at,
        length: event.length,
        position: meta.position,
        start: meta.start,
        end: meta.end,
        author: meta.author,
        docSession: meta.session,
        index: meta.index,
      });
    }
  }

  if (req.query.format === "csv") {
    res.type("text/csv").send(toCsv(rows));
    return;
  }
  res.json({ rows });
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
