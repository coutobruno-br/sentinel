// src/sentinel/engine/SentinelEngine.ts
import { EvidenceStore, EvidenceRecord } from '../evidence/EvidenceStore'
import { ExecutionIndex } from '../execution/ExecutionIndex'
import { EvidenceSigner, SignedEvidence } from '../evidence/EvidenceSigner'
import { RetentionPolicy, Tier } from '../evidence/RetentionPolicy'
import { PolicyRule } from '../policies/PolicyRule'
import { ContextBuilder } from '../context/ContextBuilder'
import { v4 as uuidv4 } from 'uuid'
import { ExecutionContext } from '../context/ExecutionContext'

export interface ExecutionResult {
  executionId: string
  evidenceHash: string
  signedEvidence: SignedEvidence
  policyIds: string[]
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


  async execute(rawPayload: unknown): Promise<ExecutionResult> {
    // 1. Build canonical context
    const ctx = ContextBuilder.fromGitHub('push', rawPayload) as ExecutionContext
    // 2. Persist canonical evidence
    const evidence: EvidenceRecord = this.evidenceStore.save(
      ctx.canonicalPayload,
      ctx.metadata,
      ctx.source
    )

    // 3. Execute policies
    const executionId = uuidv4()
    const appliedPolicies: string[] = []

    for (const policy of this.policies) {
      if (!policy.supports(ctx)) continue

      const result = policy.execute(ctx)
      appliedPolicies.push(policy.id)

      if (!result.passed) {
        // enforcement hook (intencionalmente vazio)
      }
    }

    // 4. Index execution
    this.executionIndex.index({
      executionId,
      evidenceHash: evidence.hash,
      policyIds: appliedPolicies,
      executedAt: Date.now()
    })

    // 5. Sign evidence (non-repudiation)
    const signedEvidence = this.evidenceSigner.sign(evidence)

    // 6. Retention purge (determinístico, opcional)
    if (this.retentionPolicy) {
      this.retentionPolicy.purgeExpired(this.tier)
    }

    return {
      executionId,
      evidenceHash: evidence.hash,
      signedEvidence,
      policyIds: appliedPolicies
    }
  }
}
