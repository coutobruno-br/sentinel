// src/sentinel/evidence/evidenceEngine.ts
import crypto from 'crypto'
import { executePolicies, ExecutionSummary } from '../engine/policyExecutor'
import { saveExecution } from '../persistence/executionRepository'
import { ContextBuilder } from '../context/ContextBuilder'

/**
 * Gera hash SHA256 de um payload para evidência imutável
 */
export function generateEvidenceHash(payload: unknown): string {
  const normalized = JSON.stringify(payload)
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

export interface EvidenceEngineResult {
  executionId: string
  event: string
  asset: string
  timestamp: string
  evidenceHash: string
  summary: ExecutionSummary
}

/**
 * Executa o pipeline de evidências completo
 */
export async function runEvidenceEngine(
  event: string,
  payload: unknown
): Promise<EvidenceEngineResult> {
  // 1. Construir contexto normalizado
  const ctx = ContextBuilder.fromGitHub(event, payload)

  // 2. Executar políticas
  const summary = executePolicies(ctx)

  // 3. Gerar hash de evidência
  const evidenceHash = generateEvidenceHash({
    event,
    payload,
    results: summary.results,
    timestamp: Date.now()
  })

  // 4. Identificar asset
  const asset = ctx.repo.owner && ctx.repo.name
    ? `${ctx.repo.owner}/${ctx.repo.name}`
    : 'unknown'

  // 5. Gerar ID único
  const executionId = crypto.randomUUID()
  const timestamp = new Date().toISOString()

  // 6. Persistir execução
  saveExecution({
    id: executionId,
    event,
    asset,
    timestamp,
    violations: summary.results.filter(r => !r.passed),
    evidenceHash
  })

  return {
    executionId,
    event,
    asset,
    timestamp,
    evidenceHash,
    summary
  }
}