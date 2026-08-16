import Database from "better-sqlite3";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = resolve(backendRoot, process.env.DB_PATH || "data/app.db");

mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

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
