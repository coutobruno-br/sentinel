// src/sentinel/billing/plans.ts
/**
 * Definição de planos do Sentinel
 *
 * Pricing strategy:
 * - Free: Trial limitado para avaliação
 * - Pro: Para times pequenos/médios
 * - Enterprise: Para grandes organizações
 */

export type PlanId = 'free' | 'pro' | 'enterprise'

export interface PlanLimits {
  /** Máximo de execuções por mês (0 = ilimitado) */
  executionsPerMonth: number
  /** Máximo de repositórios monitorados (0 = ilimitado) */
  maxRepositories: number
  /** Retenção de evidências em dias */
  retentionDays: number
  /** Acesso a relatórios PDF */
  pdfReports: boolean
  /** Acesso a API */
  apiAccess: boolean
  /** Suporte prioritário */
  prioritySupport: boolean
  /** Regras customizadas */
  customRules: boolean
  /** Webhooks de notificação */
  webhookNotifications: boolean
}

export interface Plan {
  id: PlanId
  name: string
  description: string
  /** Preço mensal em centavos USD (0 = grátis) */
  priceMonthly: number
  /** Preço anual em centavos USD (desconto ~17%) */
  priceYearly: number
  limits: PlanLimits
  /** Destaque na UI */
  featured: boolean
  /** Disponível para novos usuários */
  available: boolean
}

/**
 * Catálogo de planos
 */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Para experimentar o Sentinel',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      executionsPerMonth: 50,
      maxRepositories: 3,
      retentionDays: 7,
      pdfReports: false,
      apiAccess: true,
      prioritySupport: false,
      customRules: false,
      webhookNotifications: false
    },
    featured: false,
    available: true
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para times que levam compliance a sério',
    priceMonthly: 2900, // $29/mês
    priceYearly: 29000, // $290/ano (~$24/mês)
    limits: {
      executionsPerMonth: 1000,
      maxRepositories: 25,
      retentionDays: 30,
      pdfReports: true,
      apiAccess: true,
      prioritySupport: false,
      customRules: true,
      webhookNotifications: true
    },
    featured: true,
    available: true
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Para organizações com necessidades avançadas',
    priceMonthly: 9900, // $99/mês
    priceYearly: 99000, // $990/ano
    limits: {
      executionsPerMonth: 0, // Ilimitado
      maxRepositories: 0, // Ilimitado
      retentionDays: 365,
      pdfReports: true,
      apiAccess: true,
      prioritySupport: true,
      customRules: true,
      webhookNotifications: true
    },
    featured: false,
    available: true
  }
}

/**
 * Obtém plano por ID
 */
export function getPlan(planId: PlanId): Plan {
  return PLANS[planId]
}

/**
 * Lista planos disponíveis
 */
export function listAvailablePlans(): Plan[] {
  return Object.values(PLANS).filter(p => p.available)
}

/**
 * Calcula preço com desconto anual
 */
export function getAnnualDiscount(plan: Plan): number {
  if (plan.priceMonthly === 0) return 0
  const monthlyTotal = plan.priceMonthly * 12
  return monthlyTotal - plan.priceYearly
}

/**
 * Formata preço para exibição
 */
export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Verifica se um plano tem limite de execuções
 */
export function hasExecutionLimit(planId: PlanId): boolean {
  return PLANS[planId].limits.executionsPerMonth > 0
}

/**
 * Verifica se um plano tem limite de repositórios
 */
export function hasRepositoryLimit(planId: PlanId): boolean {
  return PLANS[planId].limits.maxRepositories > 0
}
