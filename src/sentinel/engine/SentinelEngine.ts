// src/sentinel/engine/SentinelEngine.ts
import { EvidenceStore, EvidenceRecord } from '../evidence/EvidenceStore'
import { ExecutionIndex } from '../execution/ExecutionIndex'
import { EvidenceSigner, SignedEvidence } from '../evidence/EvidenceSigner'
import { RetentionPolicy, Tier } from '../evidence/RetentionPolicy'
import { PolicyRule, PolicyResult, PolicyContext } from './types'
import { ContextBuilder } from '../context/ContextBuilder'
import { v4 as uuidv4 } from 'uuid'

export interface PolicyExecutionResult {
  ruleId: string
  passed: boolean
  severity: PolicyResult['severity']
  message?: string
  details?: Record<string, unknown>
}

export interface ExecutionResult {
  executionId: string
  evidenceHash: string
  signedEvidence: SignedEvidence
  event: string
  timestamp: number
  repo: {
    owner?: string
    name?: string
    branch: string
  }
  policyResults: PolicyExecutionResult[]
  summary: {
    total: number
    passed: number
    failed: number
    bySeverity: {
      critical: number
      high: number
      medium: number
      low: number
    }
  }
}

export class SentinelEngine {
  constructor(
    private readonly evidenceStore: EvidenceStore,
    private readonly executionIndex: ExecutionIndex,
    private readonly evidenceSigner: EvidenceSigner,
    private readonly policies: PolicyRule[],
    private readonly retentionPolicy?: RetentionPolicy,
    private readonly tier: Tier = 'free'
  ) {}

  /**
   * Executa o pipeline completo do Sentinel para um evento
   * @param event Tipo de evento GitHub (push, pull_request, etc)
   * @param rawPayload Payload bruto do webhook
   */
  async execute(event: string, rawPayload: unknown): Promise<ExecutionResult> {
    const timestamp = Date.now()

    // 1. Build canonical context
    const ctx = this.buildContext(event, rawPayload)

    // 2. Persist canonical evidence
    const evidence: EvidenceRecord = this.evidenceStore.save(
      rawPayload,
      { event, timestamp },
      'github'
    )

    // 3. Execute policies
    const executionId = uuidv4()
    const policyResults: PolicyExecutionResult[] = []

    for (const policy of this.policies) {
      if (!policy.supports(ctx)) continue

      try {
        const result = policy.execute(ctx)
        policyResults.push({
          ruleId: result.ruleId,
          passed: result.passed,
          severity: result.severity,
          message: result.message,
          details: result.details
        })
      } catch (error) {
        // Log error but don't fail entire execution
        policyResults.push({
          ruleId: policy.id,
          passed: false,
          severity: 'high',
          message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { error: true }
        })
      }
    }

    // 4. Calculate summary
    const summary = this.calculateSummary(policyResults)

    // 5. Index execution
    this.executionIndex.index({
      executionId,
      evidenceHash: evidence.hash,
      policyIds: policyResults.map(r => r.ruleId),
      executedAt: timestamp
    })

    // 6. Sign evidence (non-repudiation)
    const signedEvidence = this.evidenceSigner.sign(evidence)

    // 7. Retention purge (determinístico, opcional)
    if (this.retentionPolicy) {
      this.retentionPolicy.purgeExpired(this.tier)
    }

    return {
      executionId,
      evidenceHash: evidence.hash,
      signedEvidence,
      event,
      timestamp,
      repo: {
        owner: ctx.repo.owner,
        name: ctx.repo.name,
        branch: ctx.repo.branch
      },
      policyResults,
      summary
    }
  }

  /**
   * Executa apenas as regras sem persistir evidências (dry-run)
   */
  dryRun(event: string, rawPayload: unknown): PolicyExecutionResult[] {
    const ctx = this.buildContext(event, rawPayload)
    const results: PolicyExecutionResult[] = []

    for (const policy of this.policies) {
      if (!policy.supports(ctx)) continue

      try {
        const result = policy.execute(ctx)
        results.push({
          ruleId: result.ruleId,
          passed: result.passed,
          severity: result.severity,
          message: result.message,
          details: result.details
        })
      } catch (error) {
        results.push({
          ruleId: policy.id,
          passed: false,
          severity: 'high',
          message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { error: true }
        })
      }
    }

    return results
  }

  private buildContext(event: string, rawPayload: unknown): PolicyContext {
    return ContextBuilder.fromGitHub(event, rawPayload)
  }

  private calculateSummary(results: PolicyExecutionResult[]): ExecutionResult['summary'] {
    const passed = results.filter(r => r.passed).length
    const failed = results.length - passed

    const bySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }

    for (const result of results) {
      if (!result.passed) {
        bySeverity[result.severity]++
      }
    }

    return {
      total: results.length,
      passed,
      failed,
      bySeverity
    }
  }

  /**
   * Retorna as regras carregadas
   */
  getRules(): PolicyRule[] {
    return [...this.policies]
  }

  /**
   * Retorna regras que suportam um determinado evento
   */
  getRulesForEvent(event: string): PolicyRule[] {
    const ctx: PolicyContext = { event, repo: { branch: 'unknown' } }
    return this.policies.filter(p => p.supports(ctx))
  }
}
