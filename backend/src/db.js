// SQLite storage for writing-session metadata.
//
// We use `better-sqlite3`: it works on any modern Node (no version flags) and
// ships prebuilt binaries for Windows/macOS/Linux, so `npm install` needs no
// compiler. The database is a single file on disk (see DB_PATH), which makes it
// easy to inspect and to reset between the controlled evaluation scenarios.
import Database from "better-sqlite3";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = resolve(backendRoot, process.env.DB_PATH || "data/app.db");

// Make sure the folder for the database file exists before opening it.
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

// Enforce foreign keys so events cannot reference a missing session.
db.pragma("foreign_keys = ON");

// Schema. Privacy-by-design: we store event TYPE, LENGTH (a character count)
// and TIMESTAMP only — never the characters the writer actually typed.
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id             TEXT PRIMARY KEY,
    document_id    TEXT,
    document_title TEXT,
    source         TEXT,
    started_at     TEXT,
    ended_at       TEXT,
    created_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    at         TEXT,
    length     INTEGER NOT NULL DEFAULT 0,
    meta       TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
`);
