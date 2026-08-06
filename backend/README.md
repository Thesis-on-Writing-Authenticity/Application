# Backend — Writing Authenticity

A small Node.js + Express API that receives **writing-session metadata** from the
Chrome extension and stores it in a local SQLite database. This is the middle
layer of the system pipeline:

```
Extension (captures writing behaviour) → Backend (this) → Analysis → Dashboard
```

The backend stores **metadata only** — event types, character counts and
timestamps — never the text the user actually wrote. This is the concrete
implementation of the project's data-minimisation / privacy-by-design goal.

> **What a "session" means.** A session corresponds to the full edit history of
> one document (the changelog is read from revision 1 to the latest), so its
> metrics span the document's whole lifetime and all authors. In the controlled
> evaluation each scenario uses a **fresh document written by one participant in
> one sitting**, so a session equals a single writing session. Interpret sessions
> from long-lived or multi-author documents with that in mind.

## Requirements

- **Node.js ≥ 18.** Storage uses `better-sqlite3`, which ships prebuilt binaries
  for Windows/macOS/Linux, so `npm install` needs no compiler and it works the
  same across the team regardless of Node version. Check with `node --version`.

## Setup & run

```bash
cd Application/backend
npm install
npm run dev        # auto-restarts on file changes; http://localhost:3000
# or: npm start    # run once without watching
```

Configuration is optional — copy `.env.example` to `.env` to change the port or
database path. Defaults: `PORT=3000`, `DB_PATH=data/app.db`.

## API

| Method | Path                       | Purpose                                    |
| ------ | -------------------------- | ------------------------------------------ |
| GET    | `/health`                  | Liveness check → `{ "ok": true }`          |
| POST   | `/api/sessions`            | Create a session → `{ "id": "..." }`       |
| POST   | `/api/sessions/:id/events` | Append a batch of events                   |
| PATCH  | `/api/sessions/:id`        | Mark the session ended (`endedAt`)         |
| GET    | `/api/sessions`            | List all sessions, each with metrics       |
| GET    | `/api/sessions/export`     | One row per event (JSON, or CSV via `?format=csv`) |
| GET    | `/api/sessions/:id`        | One session with its events and metrics    |

### Create a session

```jsonc
POST /api/sessions
{
  "documentId": "google-doc-id",
  "documentTitle": "My Essay",
  "source": "google-docs",
  "scenario": "human",        // optional: "human" | "ai-pasted" | "ai-retyped"
  "startedAt": "2026-07-20T10:00:00.000Z"  // optional; defaults to now
}
```

### Append events

```jsonc
POST /api/sessions/:id/events
{
  "events": [
    { "type": "INSERT", "at": "2026-07-20T10:00:05.000Z", "length": 120 },
    { "type": "PASTE",  "at": "2026-07-20T10:01:00.000Z", "length": 300 },
    { "type": "DELETE", "at": "2026-07-20T10:02:00.000Z", "length": 5 },
    { "type": "PAUSE",  "at": "2026-07-20T10:03:00.000Z", "length": 5000 }
  ]
}
```

- `type` — one of `INSERT`, `DELETE`, `PASTE`, `PAUSE`.
- `length` — a **character count** for INSERT/PASTE/DELETE, or a **pause
  duration in ms** for PAUSE. Never the text itself.

### Computed metrics

`GET /api/sessions` and `GET /api/sessions/:id` include a `metrics` object:

```jsonc
{
  "totalWritingTimeMs": 300000,
  "typedCharCount": 120,       // chars from INSERT events (typed)
  "pastedCharCount": 300,      // chars from PASTE events (large single inserts)
  "pasteToTypeRatio": 2.5,
  "deletedCharCount": 5,       // chars from DELETE events
  "editEventCount": 1,         // number of delete actions
  "longPauseCount": 1,         // pauses longer than 2000 ms
  "insertCount": 8,            // number of INSERT events
  "maxInsertLength": 30,       // largest single insert (paste signal)
  "meanInsertLength": 15,      // average insert size
  "pasteCount": 1,             // number of PASTE events
  "startedAt": "...",
  "endedAt": "..."
}
```

### Events export

`GET /api/sessions/export` returns one flattened row per event across all
sessions — the handoff to the offline analysis. JSON by default, or CSV with
`?format=csv`. Columns: `sessionId, documentId, scenario, sessionStartedAt,
sessionEndedAt, type, at, length, position, start, end, author, docSession,
index`.

```bash
curl "localhost:3000/api/sessions/export?format=csv" > sessions.csv
```

## How the extension sends events

The extension sends a session automatically at the end of `analyzeDocument`
(`src/sidepanel/App.jsx`) via `saveSession()` in
`extension/src/api/writingEvents.js`. That helper:

1. maps the changelog `operations` to backend events — `delete → DELETE`, and
   `insert → INSERT` unless the insert is large (≥ 15 chars in one operation),
   in which case it is treated as `PASTE` (real typing arrives in small bursts,
   so a large single insert is almost certainly a paste). Character `length`,
   `timestamp`, and `author`/`revision`/`position` in `meta` are kept — never
   the text;
2. derives `PAUSE` events from idle gaps (> 2 s) between operations;
3. calls `createSession` → `sendEvents` → `endSession`.

The transport client (`createSession` / `sendEvents` / `endSession`) lives in
`extension/src/api/backend.js` and is not edited per session.

The paste threshold is a heuristic (`PASTE_MIN_INSERT_CHARS` in
`writingEvents.js`) — tune it once real pasted samples are available.

## Inspecting the database

```bash
sqlite3 data/app.db ".tables"
sqlite3 data/app.db "SELECT * FROM sessions;"
```

To reset all data (e.g. between evaluation scenarios), just delete the file:

```bash
rm data/app.db
```

## Project layout

```
backend/
├── src/
│   ├── server.js          # Express app, middleware, error handler
│   ├── db.js              # SQLite connection + schema
│   ├── metrics.js         # session metrics from events
│   └── routes/sessions.js # session + event endpoints
└── data/                  # SQLite file lives here (gitignored)
```
