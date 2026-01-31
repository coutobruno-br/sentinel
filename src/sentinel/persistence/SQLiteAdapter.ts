// src/sentinel/persistence/SQLiteAdapter.ts
import Database from 'better-sqlite3'
import { EvidenceRecord } from '../evidence/EvidenceStore'
import { ExecutionIndexRecord } from '../execution/ExecutionIndex'
import { ExecutionIndexAdapter } from '../execution/ExecutionIndexAdapter'
import { EvidenceAdapter } from '../evidence/EvidenceAdapter'
import { getDatabase } from './db/db'

interface EvidenceRow {
  hash: string
  payload: string
  metadata: string | null
  source: string | null
  createdAt: number
}

interface ExecutionRow {
  executionId: string
  evidenceHash: string
  policyIds: string
  executedAt: number
}

/**
 * SQLiteAdapter - Implementação persistente para Evidence e ExecutionIndex
 *
 * Usa banco SQLite via better-sqlite3 (síncrono, performático)
 */
export class SQLiteAdapter implements EvidenceAdapter, ExecutionIndexAdapter {
  private db: Database.Database

  constructor(db?: Database.Database) {
    this.db = db ?? getDatabase()
  }

  /* ==================== EvidenceAdapter ==================== */

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
    const row = this.db.prepare(
      `SELECT * FROM evidences WHERE hash = ?`
    ).get(hash) as EvidenceRow | undefined

    if (!row) return undefined

    return this.parseEvidenceRow(row)
  }

  listEvidences(): EvidenceRecord[] {
    const rows = this.db.prepare(
      `SELECT * FROM evidences ORDER BY createdAt DESC`
    ).all() as EvidenceRow[]

    return rows.map(row => this.parseEvidenceRow(row))
  }

  deleteEvidence(hash: string): void {
    // Primeiro deletar execuções associadas (foreign key)
    this.db.prepare(`DELETE FROM executions WHERE evidenceHash = ?`).run(hash)
    this.db.prepare(`DELETE FROM evidences WHERE hash = ?`).run(hash)
  }

  /**
   * Lista evidências com paginação
   */
  listEvidencesPaginated(limit: number, offset: number): EvidenceRecord[] {
    const rows = this.db.prepare(
      `SELECT * FROM evidences ORDER BY createdAt DESC LIMIT ? OFFSET ?`
    ).all(limit, offset) as EvidenceRow[]

    return rows.map(row => this.parseEvidenceRow(row))
  }

  /**
   * Conta total de evidências
   */
  countEvidences(): number {
    const result = this.db.prepare(
      `SELECT COUNT(*) as count FROM evidences`
    ).get() as { count: number }

    return result.count
  }

  /**
   * Deleta evidências mais antigas que um timestamp
   */
  deleteEvidencesBefore(timestamp: number): number {
    // Primeiro deletar execuções associadas
    this.db.prepare(
      `DELETE FROM executions WHERE evidenceHash IN (
        SELECT hash FROM evidences WHERE createdAt < ?
      )`
    ).run(timestamp)

    const result = this.db.prepare(
      `DELETE FROM evidences WHERE createdAt < ?`
    ).run(timestamp)

    return result.changes
  }

  /* ==================== ExecutionIndexAdapter ==================== */

  saveExecution(record: ExecutionIndexRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO executions (executionId, evidenceHash, policyIds, executedAt)
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
    const row = this.db.prepare(
      `SELECT * FROM executions WHERE executionId = ?`
    ).get(executionId) as ExecutionRow | undefined

    if (!row) return undefined

    return this.parseExecutionRow(row)
  }

  listExecutions(): ExecutionIndexRecord[] {
    const rows = this.db.prepare(
      `SELECT * FROM executions ORDER BY executedAt DESC`
    ).all() as ExecutionRow[]

    return rows.map(row => this.parseExecutionRow(row))
  }

  /**
   * Lista execuções com paginação
   */
  listExecutionsPaginated(limit: number, offset: number): ExecutionIndexRecord[] {
    const rows = this.db.prepare(
      `SELECT * FROM executions ORDER BY executedAt DESC LIMIT ? OFFSET ?`
    ).all(limit, offset) as ExecutionRow[]

    return rows.map(row => this.parseExecutionRow(row))
  }

  /**
   * Conta total de execuções
   */
  countExecutions(): number {
    const result = this.db.prepare(
      `SELECT COUNT(*) as count FROM executions`
    ).get() as { count: number }

    return result.count
  }

  /**
   * Busca execuções por evidenceHash
   */
  getExecutionsByEvidenceHash(evidenceHash: string): ExecutionIndexRecord[] {
    const rows = this.db.prepare(
      `SELECT * FROM executions WHERE evidenceHash = ? ORDER BY executedAt DESC`
    ).all(evidenceHash) as ExecutionRow[]

    return rows.map(row => this.parseExecutionRow(row))
  }

  /**
   * Busca execuções em um período
   */
  getExecutionsByDateRange(startTime: number, endTime: number): ExecutionIndexRecord[] {
    const rows = this.db.prepare(
      `SELECT * FROM executions WHERE executedAt >= ? AND executedAt <= ? ORDER BY executedAt DESC`
    ).all(startTime, endTime) as ExecutionRow[]

    return rows.map(row => this.parseExecutionRow(row))
  }

  /* ==================== Helpers ==================== */

  private parseEvidenceRow(row: EvidenceRow): EvidenceRecord {
    return {
      hash: row.hash,
      payload: JSON.parse(row.payload),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      source: row.source ?? undefined,
      createdAt: row.createdAt
    }
  }

  private parseExecutionRow(row: ExecutionRow): ExecutionIndexRecord {
    return {
      executionId: row.executionId,
      evidenceHash: row.evidenceHash,
      policyIds: JSON.parse(row.policyIds),
      executedAt: row.executedAt
    }
  }

  /**
   * Executa query customizada (para relatórios avançados)
   */
  query<T>(sql: string, params: unknown[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[]
  }

  /**
   * Executa statement customizado
   */
  run(sql: string, params: unknown[] = []): Database.RunResult {
    return this.db.prepare(sql).run(...params)
  }
}
