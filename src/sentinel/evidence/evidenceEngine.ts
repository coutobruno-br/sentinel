// src/sentinel/evidence/evidenceEngine.ts


export function generateEvidenceHash(payload: unknown): string {
  const normalized = JSON.stringify(payload)
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

// src/sentinel/engine/SentinelEngine.ts (updated)
import { executePolicies } from '../engine/policyExecutor'
import { saveExecution } from '../persistence/executionRepository'
import crypto from 'crypto'

export async function SentinelEngine(event: string, payload: any) {
  const violations = await executePolicies({ event, payload })

  const evidenceHash = generateEvidenceHash({ event, payload, violations })

  saveExecution({
    id: crypto.randomUUID(),
    event,
    asset: payload.repository?.full_name ?? 'unknown',
    timestamp: new Date().toISOString(),
    violations,
    evidenceHash
  })
}