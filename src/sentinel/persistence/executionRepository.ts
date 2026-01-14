// src/sentinel/persistence/executionRepository.ts
import db from './db/db'

export function saveExecution(execution: {
  id: string
  event: string
  asset: string
  timestamp: string
  violations: unknown
  evidenceHash: string
}) {
  const stmt = db.prepare(`
    INSERT INTO executions (id, event, asset, timestamp, violations, evidence_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    execution.id,
    execution.event,
    execution.asset,
    execution.timestamp,
    JSON.stringify(execution.violations),
    execution.evidenceHash
  )
}
