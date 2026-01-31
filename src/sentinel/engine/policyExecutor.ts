// src/sentinel/engine/policyExecutor.ts
import { PolicyRule, PolicyContext, PolicyResult } from './types'
import { allMvpRules } from '../rules'

export interface ExecutionOptions {
  rules?: PolicyRule[]
  stopOnFirstFailure?: boolean
}

export interface ExecutionSummary {
  total: number
  passed: number
  failed: number
  results: PolicyResult[]
}

/**
 * Executa políticas contra um contexto
 */
export function executePolicies(
  ctx: PolicyContext,
  options: ExecutionOptions = {}
): ExecutionSummary {
  const rules = options.rules ?? allMvpRules
  const results: PolicyResult[] = []

  for (const rule of rules) {
    if (!rule.supports(ctx)) continue

    const result = rule.execute(ctx)
    results.push(result)

    if (options.stopOnFirstFailure && !result.passed) {
      break
    }
  }

  const passed = results.filter(r => r.passed).length

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results
  }
}

/**
 * Executa apenas as políticas que falharam (para re-check)
 */
export function executeFailedPolicies(
  ctx: PolicyContext,
  previousResults: PolicyResult[]
): ExecutionSummary {
  const failedRuleIds = previousResults
    .filter(r => !r.passed)
    .map(r => r.ruleId)

  const rulesToRun = allMvpRules.filter(r => failedRuleIds.includes(r.id))

  return executePolicies(ctx, { rules: rulesToRun })
}