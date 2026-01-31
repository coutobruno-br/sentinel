// src/sentinel/engine/engine.ts
import { PolicyRule, PolicyContext, PolicyResult } from './types'

export interface PolicyEngineConfig {
  enabledPolicies?: string[]
  disabledPolicies?: string[]
}

export interface PolicyEngineResult {
  ruleId: string
  severity: PolicyResult['severity']
  passed: boolean
  message?: string
  details?: Record<string, unknown>
}

export class PolicyEngine {
  constructor(
    private rules: PolicyRule[],
    private config: PolicyEngineConfig = {}
  ) {}

  run(ctx: PolicyContext): PolicyEngineResult[] {
    return this.rules
      .filter(rule => this.isEnabled(rule.id))
      .filter(rule => rule.supports(ctx))
      .map(rule => {
        const result = rule.execute(ctx)
        return {
          ruleId: rule.id,
          severity: result.severity,
          passed: result.passed,
          message: result.message,
          details: result.details
        }
      })
  }

  private isEnabled(ruleId: string): boolean {
    // Se há lista de habilitados, verificar se está nela
    if (this.config.enabledPolicies?.length) {
      return this.config.enabledPolicies.includes(ruleId)
    }
    // Se há lista de desabilitados, verificar se não está nela
    if (this.config.disabledPolicies?.length) {
      return !this.config.disabledPolicies.includes(ruleId)
    }
    // Por padrão, todas estão habilitadas
    return true
  }

  getRules(): PolicyRule[] {
    return [...this.rules]
  }
}