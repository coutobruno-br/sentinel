// src/sentinel/rules/index.ts
/**
 * Sentinel MVP Rules
 *
 * Este módulo exporta todas as regras MVP do Sentinel:
 * - PB-10: prReviewRequiredRule - PR sem review aprovado
 * - PB-11: noDirectMainRule - Push direto em main/master
 * - PB-12: secretsScanRule - Secrets hardcoded no código
 * - PB-13: testRequiredRule - Código sem testes correspondentes
 * - PB-14: licenseCheckRule - Repositório sem licença válida
 */

export { noDirectMainRule } from './noDirectMainRule'
export { prReviewRequiredRule } from './prReviewRequiredRule'
export { secretsScanRule } from './secretsScanRule'
export { testRequiredRule } from './testRequiredRule'
export { licenseCheckRule } from './licenseCheckRule'

import { noDirectMainRule } from './noDirectMainRule'
import { prReviewRequiredRule } from './prReviewRequiredRule'
import { secretsScanRule } from './secretsScanRule'
import { testRequiredRule } from './testRequiredRule'
import { licenseCheckRule } from './licenseCheckRule'
import { PolicyRule } from '../engine/types'

/**
 * Array com todas as regras MVP habilitadas por padrão
 * Ordenadas por severidade (critical > high > medium > low)
 */
export const allMvpRules: PolicyRule[] = [
  secretsScanRule,      // critical
  noDirectMainRule,     // high
  prReviewRequiredRule, // high
  testRequiredRule,     // medium
  licenseCheckRule      // low
]

/**
 * Mapa de regras por ID para lookup rápido
 */
export const rulesById: Record<string, PolicyRule> = {
  [noDirectMainRule.id]: noDirectMainRule,
  [prReviewRequiredRule.id]: prReviewRequiredRule,
  [secretsScanRule.id]: secretsScanRule,
  [testRequiredRule.id]: testRequiredRule,
  [licenseCheckRule.id]: licenseCheckRule
}

/**
 * Retorna regras filtradas por severidade mínima
 */
export function getRulesBySeverity(minSeverity: 'low' | 'medium' | 'high' | 'critical'): PolicyRule[] {
  const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 }
  const minLevel = severityOrder[minSeverity]

  return allMvpRules.filter(rule => severityOrder[rule.severity] >= minLevel)
}

/**
 * Retorna regras que suportam um determinado evento
 */
export function getRulesForEvent(event: string, ctx: { event: string; repo: { branch: string } }): PolicyRule[] {
  return allMvpRules.filter(rule => rule.supports({ ...ctx, event }))
}
