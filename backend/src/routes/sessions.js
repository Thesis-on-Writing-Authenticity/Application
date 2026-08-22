import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { computeMetrics } from "../metrics.js";
import { scoreAuthenticity } from "../authenticity.js";
import { explainAnalysis } from "../agent.js";

export const sessionsRouter = Router();

const VALID_EVENT_TYPES = new Set(["INSERT", "DELETE", "PASTE", "PAUSE"]);

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

const insertEventsBatch = db.transaction((sessionId, events) => {
  for (const event of events) {
    insertEvent.run(
      sessionId,
      event.type,
      event.at ?? null,
      Number.isFinite(event.length) ? event.length : 0,
      event.meta != null ? JSON.stringify(event.meta) : null,
    );
  }
});

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

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

sessionsRouter.post("/:id/events", (req, res) => {
  const session = selectSession.get(req.params.id);
  if (!session) {
    throw new HttpError(404, "Session not found");
  }

  const events = req.body?.events;
  if (!Array.isArray(events)) {
    throw new HttpError(400, "Body must contain an 'events' array");
  }

  for (const event of events) {
    if (!VALID_EVENT_TYPES.has(event?.type)) {
      throw new HttpError(400, `Invalid event type: ${event?.type}`);
    }
  }

  insertEventsBatch(session.id, events);

  res.status(201).json({ inserted: events.length });
});

sessionsRouter.patch("/:id", (req, res) => {
  const session = selectSession.get(req.params.id);
  if (!session) {
    throw new HttpError(404, "Session not found");
  }

  const endedAt = req.body?.endedAt ?? new Date().toISOString();
  setEndedAt.run(endedAt, session.id);
  res.json({ id: session.id, endedAt });
});

sessionsRouter.get("/", (_req, res) => {
  const sessions = selectAllSessions.all().map((session) => ({
    ...session,
    metrics: computeMetrics(session, selectEventsForSession.all(session.id)),
  }));
  res.json({ sessions });
});

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

sessionsRouter.get("/:id/analysis", (req, res) => {
  const session = selectSession.get(req.params.id);
  if (!session) {
    throw new HttpError(404, "Session not found");
  }

  const events = selectEventsForSession.all(session.id);
  const metrics = computeMetrics(session, events);
  const analysis = scoreAuthenticity(metrics);

  res.json({ id: session.id, metrics, analysis });
});

sessionsRouter.get("/:id/analysis/explain", async (req, res, next) => {
  const session = selectSession.get(req.params.id);
  if (!session) {
    throw new HttpError(404, "Session not found");
  }

  const events = selectEventsForSession.all(session.id);
  const metrics = computeMetrics(session, events);
  const analysis = scoreAuthenticity(metrics);

  try {
    const explanation = await explainAnalysis(analysis);
    res.json({ id: session.id, metrics, analysis, explanation });
  } catch (error) {
    next(new HttpError(502, `Explanation generation failed: ${error.message}`));
  }
});