// src/sentinel/persistence/SQLiteAdapter.ts
import Database from 'better-sqlite3'
import { EvidenceRecord } from '../evidence/EvidenceStore'
import { ExecutionIndexRecord } from '../execution/ExecutionIndex'
import { ExecutionIndexAdapter } from '../execution/ExecutionIndexAdapter'
import { EvidenceAdapter } from '../evidence/EvidenceAdapter'

export class SQLiteAdapter
  implements EvidenceAdapter, ExecutionIndexAdapter {
  private db: Database.Database

  constructor(dbPath: string = 'sentinel.db') {
    this.db = new Database(dbPath)
    this.init()
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS evidences (
        hash TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        metadata TEXT,
        source TEXT,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS executions (
        executionId TEXT PRIMARY KEY,
        evidenceHash TEXT NOT NULL,
        policyIds TEXT NOT NULL,
        executedAt INTEGER NOT NULL,
        FOREIGN KEY (evidenceHash) REFERENCES evidences(hash)
      );
    `)
  }

  /* EvidenceStore contract */
  saveEvidence(record: EvidenceRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO evidences (hash, payload, metadata, source, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(
      record.hash,
      JSON.stringify(record.payload),
      JSON.stringify(record.metadata ?? null),
      record.source ?? null,
      record.createdAt
    )
  }

  getEvidence(hash: string): EvidenceRecord | undefined {
    const row = this.db.prepare(`SELECT * FROM evidences WHERE hash = ?`).get(hash) as {
      hash: string;
      payload: string;
      metadata: string | null;
      source: string | null;
      createdAt: number;
    } | undefined;
    if (!row) return undefined;

    return {
      hash: row.hash,
      payload: JSON.parse(row.payload),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      source: row.source ?? undefined,
      createdAt: row.createdAt
    };
  }

  listEvidences(): EvidenceRecord[] {
    return this.db.prepare(`SELECT * FROM evidences`).all().map((row) => {
      const r = row as {
        hash: string;
        payload: string;
        metadata: string | null;
        source: string | null;
        createdAt: number;
      };
      return {
        hash: r.hash,
        payload: JSON.parse(r.payload),
        metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
        source: r.source ?? undefined,
        createdAt: r.createdAt
      };
    });
  }

  deleteEvidence(hash: string): void {
    this.db.prepare(`DELETE FROM evidences WHERE hash = ?`).run(hash)
  }

  /* ExecutionIndex contract */
  saveExecution(record: ExecutionIndexRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO executions (executionId, evidenceHash, policyIds, executedAt)
      VALUES (?, ?, ?, ?)
    `)

    stmt.run(
      record.executionId,
      record.evidenceHash,
      JSON.stringify(record.policyIds),
      record.executedAt
    )
  }

  getExecutionById(executionId: string): ExecutionIndexRecord | undefined {
    const row = this.db.prepare(`SELECT * FROM executions WHERE executionId = ?`).get(executionId) as {
      executionId: string;
      evidenceHash: string;
      policyIds: string;
      executedAt: number;
    } | undefined;
    if (!row) return undefined;

    return {
      executionId: row.executionId,
      evidenceHash: row.evidenceHash,
      policyIds: JSON.parse(row.policyIds),
      executedAt: row.executedAt
    };
  }

  listExecutions(): ExecutionIndexRecord[] {
    return this.db.prepare(`SELECT * FROM executions`).all().map((row) => {
      const r = row as {
        executionId: string;
        evidenceHash: string;
        policyIds: string;
        executedAt: number;
      };
      return {
        executionId: r.executionId,
        evidenceHash: r.evidenceHash,
        policyIds: JSON.parse(r.policyIds),
        executedAt: r.executedAt
      };
    });
  }
}
