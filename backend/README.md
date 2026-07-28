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
  "typedCharCount": 120,
  "pastedCharCount": 300,
  "pasteToTypeRatio": 2.5,
  "editEventCount": 1,
  "longPauseCount": 1,     // pauses longer than 2000 ms
  "startedAt": "...",
  "endedAt": "..."
}
```

## How the extension sends events

The extension sends a session automatically at the end of `analyzeDocument`
(`src/sidepanel/App.jsx`) via `saveSession()` in
`extension/src/api/writingEvents.js`. That helper:

1. maps the changelog `operations` to backend events — `insert → INSERT`,
   `delete → DELETE` — using each operation's character `length` and
   `timestamp`, keeping `author` / `revision` / `position` in `meta` (never the
   text);
2. calls `createSession` → `sendEvents` → `endSession`.

The transport client (`createSession` / `sendEvents` / `endSession`) lives in
`extension/src/api/backend.js` and is not edited per session.

`PASTE` and `PAUSE` are accepted by the API but not produced yet — the current
changelog only yields inserts and deletes. They can be added later (e.g. pauses
derived from timestamp gaps) with no backend change.

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
