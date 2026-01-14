// src/sentinel/policies/PolicyRule.ts
export interface PolicyContext {
  event?: string
  repo?: {
    owner?: string
    name?: string
    branch?: string
  }
  canonicalPayload: unknown
  metadata?: Record<string, any>
  source?: string
}

export interface PolicyResult {
  passed: boolean
  message?: string
}

export interface PolicyRule {
  id: string
  severity: 'low' | 'medium' | 'high'
  supports(ctx: PolicyContext): boolean
  execute(ctx: PolicyContext): PolicyResult
}
