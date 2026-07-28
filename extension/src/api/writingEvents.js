// Bridges the writing-process pipeline to the backend.
//
// Ville's `parseChangeLog` produces `operations` from the Google Docs revision
// changelog. This module maps those operations into the backend's event shape
// and persists them as one session. It intentionally sends **metadata only** —
// the type, a character count, a timestamp, and small context in `meta` — and
// never the written text, matching the backend's data-minimisation rule.
import { createSession, sendEvents, endSession, getSession } from "./backend";

// Google Docs changelog timestamps are epoch milliseconds.
// NOTE: verify this against Ville's console-logged `operations` (op.timestamp);
// if they turn out to be seconds, multiply by 1000 here.
function toIso(timestamp) {
  const ms = Number(timestamp);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

// Map one pipeline operation to a backend event, or null if it isn't a writing
// action the backend tracks (e.g. style changes are skipped for now).
function operationToEvent(op) {
  if (op.type === "insert") {
    return {
      type: "INSERT",
      at: toIso(op.timestamp),
      length: op.length,
      meta: {
        position: op.position,
        author: op.author,
        revision: op.revision,
        session: op.session,
        index: op.index,
      },
    };
  }

  if (op.type === "delete") {
    return {
      type: "DELETE",
      at: toIso(op.timestamp),
      length: op.length,
      meta: {
        start: op.start,
        end: op.end,
        author: op.author,
        revision: op.revision,
        session: op.session,
        index: op.index,
      },
    };
  }

  return null;
}

// Insert a PAUSE event when the idle gap between consecutive operations exceeds
// this (milliseconds). Matches the backend's LONG_PAUSE_MS so every emitted
// pause also counts as a "long pause" in the metrics.
const PAUSE_THRESHOLD_MS = 2000;

export function operationsToEvents(operations) {
  const events = [];
  let previousTimestamp = null;

  for (const op of operations) {
    const timestamp = Number(op.timestamp);

    // A long gap since the previous operation is recorded as a PAUSE. Gaps are
    // measured across all operations (including ones we don't store) so the
    // pause reflects real idle time.
    if (
      previousTimestamp != null &&
      Number.isFinite(timestamp) &&
      timestamp - previousTimestamp > PAUSE_THRESHOLD_MS
    ) {
      events.push({
        type: "PAUSE",
        at: toIso(previousTimestamp),
        length: timestamp - previousTimestamp, // pause duration in ms
      });
    }

    if (Number.isFinite(timestamp)) {
      previousTimestamp = timestamp;
    }

    const event = operationToEvent(op);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

// Persist a writing session to the backend: create -> send events -> end, then
// fetch it back so the caller gets the stored session including its computed
// metrics. Returns the saved session object, or null if there was nothing to
// store.
export async function saveSession(doc, operations) {
  if (!operations || operations.length === 0) {
    return null;
  }

  const events = operationsToEvents(operations);
  const firstTimestamp = operations[0]?.timestamp;
  const lastTimestamp = operations[operations.length - 1]?.timestamp;

  const sessionId = await createSession({
    documentId: doc.id,
    documentTitle: doc.title,
    source: "google-docs",
    startedAt: toIso(firstTimestamp),
  });

  await sendEvents(sessionId, events);
  await endSession(sessionId, toIso(lastTimestamp));

  return getSession(sessionId);
}
