// src/sentinel/reports/reportsRepository.ts
import db from './db/db'

/**
 * Tipo exposto pela aplicação
 */
export interface ExecutionReport {
  id: string
  event: string
  asset: string
  timestamp: string
  violations: unknown
  evidenceHash: string
}

/**
 * Tipo interno representando a linha vinda do banco
 * (violations é string JSON no banco)
 */
interface ExecutionRow {
  id: string
  event: string
  asset: string
  timestamp: string
  violations: string
  evidenceHash: string
}

export function listExecutions(limit = 50): ExecutionReport[] {
  const stmt = db.prepare(`
    SELECT
      id,
      event,
      asset,
      timestamp,
      violations,
      evidence_hash AS evidenceHash
    FROM executions
    ORDER BY timestamp DESC
    LIMIT ?
  `)

  return stmt.all(limit).map((row) => {
    const r = row as ExecutionRow & { evidenceHash: string };
    return {
      id: r.id,
      event: r.event,
      asset: r.asset,
      timestamp: r.timestamp,
      evidenceHash: r.evidenceHash,
      violations: JSON.parse(r.violations)
    };
  });
}

export function getExecutionById(id: string): ExecutionReport | null {
  const stmt = db.prepare(`
    SELECT
      id,
      event,
      asset,
      timestamp,
      violations,
      evidence_hash AS evidenceHash
    FROM executions
    WHERE id = ?
  `);

  const row = stmt.get(id);
  if (!row) return null;

  const r = row as ExecutionRow & { evidenceHash: string };
  return {
    id: r.id,
    event: r.event,
    asset: r.asset,
    timestamp: r.timestamp,
    evidenceHash: r.evidenceHash,
    violations: JSON.parse(r.violations)
  };
}
