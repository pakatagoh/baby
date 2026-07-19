import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_PATH || "/data/baby.db"
    : process.env.DATABASE_PATH || "baby.db";

const dir = path.dirname(DB_PATH);
if (dir && dir !== ".") {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    payload TEXT NOT NULL,
    result TEXT,
    error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, created_at);
`);

export interface JobRow {
  id: string;
  status: "pending" | "processing" | "done" | "failed";
  payload: string;
  result?: string;
  error?: string;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export interface JobPayload {
  storedPath: string;
  fileName: string;
  mimeType: string;
  base64: string;
}

// Startup: recover stale jobs and kick worker (dynamic import avoids circular dep)
setTimeout(async () => {
  const { initWorker } = await import("./init");
  initWorker();
}, 1000);
