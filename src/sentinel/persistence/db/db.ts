// src/sentinel/persistence/db.ts
import Database from 'better-sqlite3'

const db: Database.Database = new Database('sentinel.db')
export default db

db.exec(`
CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  asset TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  violations TEXT NOT NULL,
  evidence_hash TEXT NOT NULL
);
`)


