// src/sentinel/billing/subscription.ts
import { getDatabase } from '../persistence/db/db'
import { PlanId, getPlan } from './plans'
import { getCurrentUsage } from './metering'

/**
 * Subscription - Gerenciamento de assinaturas
 *
 * Cada instalação (conta GitHub) tem uma assinatura que define:
 * - Plano ativo
 * - Status (ativo, trial, suspenso, cancelado)
 * - Limites de uso
 */

export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled'

export interface Subscription {
  /** ID da instalação GitHub (account) */
  accountId: string
  accountLogin: string
  accountType: 'User' | 'Organization'
  planId: PlanId
  status: SubscriptionStatus
  /** Início do trial */
  trialStartedAt: number | null
  /** Fim do trial (null = sem trial) */
  trialEndsAt: number | null
  /** Data de início da assinatura paga */
  subscribedAt: number | null
  /** Data de suspensão */
  suspendedAt: number | null
  /** Motivo da suspensão */
  suspendedReason: string | null
  /** Data de cancelamento */
  cancelledAt: number | null
  createdAt: number
  updatedAt: number
}

export interface SubscriptionCheck {
  allowed: boolean
  reason?: string
  subscription: Subscription
  usage: {
    current: number
    limit: number
    remaining: number
    percentUsed: number
  }
}

// Duração do trial em dias
const TRIAL_DURATION_DAYS = 14

/**
 * Inicializa tabelas de subscription
 */
export function initSubscriptionTables(): void {
  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      accountId TEXT PRIMARY KEY,
      accountLogin TEXT NOT NULL,
      accountType TEXT NOT NULL,
      planId TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'trial',
      trialStartedAt INTEGER,
      trialEndsAt INTEGER,
      subscribedAt INTEGER,
      suspendedAt INTEGER,
      suspendedReason TEXT,
      cancelledAt INTEGER,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_status
      ON subscriptions(status);

    CREATE INDEX IF NOT EXISTS idx_subscriptions_plan
      ON subscriptions(planId);
  `)
}

// Inicializar tabelas
initSubscriptionTables()

/**
 * Cria ou obtém subscription para uma conta
 */
export function getOrCreateSubscription(
  accountId: string,
  accountLogin: string,
  accountType: 'User' | 'Organization'
): Subscription {
  const existing = getSubscription(accountId)
  if (existing) return existing

  return createSubscription(accountId, accountLogin, accountType)
}

/**
 * Cria nova subscription (trial)
 */
export function createSubscription(
  accountId: string,
  accountLogin: string,
  accountType: 'User' | 'Organization'
): Subscription {
  const db = getDatabase()
  const now = Date.now()
  const trialEnds = now + (TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000)

  const subscription: Subscription = {
    accountId,
    accountLogin,
    accountType,
    planId: 'free',
    status: 'trial',
    trialStartedAt: now,
    trialEndsAt: trialEnds,
    subscribedAt: null,
    suspendedAt: null,
    suspendedReason: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now
  }

  db.prepare(`
    INSERT INTO subscriptions
    (accountId, accountLogin, accountType, planId, status, trialStartedAt, trialEndsAt, subscribedAt, suspendedAt, suspendedReason, cancelledAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    subscription.accountId,
    subscription.accountLogin,
    subscription.accountType,
    subscription.planId,
    subscription.status,
    subscription.trialStartedAt,
    subscription.trialEndsAt,
    subscription.subscribedAt,
    subscription.suspendedAt,
    subscription.suspendedReason,
    subscription.cancelledAt,
    subscription.createdAt,
    subscription.updatedAt
  )

  return subscription
}

/**
 * Obtém subscription por accountId
 */
export function getSubscription(accountId: string): Subscription | undefined {
  const db = getDatabase()

  const row = db.prepare(`
    SELECT * FROM subscriptions WHERE accountId = ?
  `).get(accountId) as {
    accountId: string
    accountLogin: string
    accountType: string
    planId: string
    status: string
    trialStartedAt: number | null
    trialEndsAt: number | null
    subscribedAt: number | null
    suspendedAt: number | null
    suspendedReason: string | null
    cancelledAt: number | null
    createdAt: number
    updatedAt: number
  } | undefined

  if (!row) return undefined

  return {
    accountId: row.accountId,
    accountLogin: row.accountLogin,
    accountType: row.accountType as 'User' | 'Organization',
    planId: row.planId as PlanId,
    status: row.status as SubscriptionStatus,
    trialStartedAt: row.trialStartedAt,
    trialEndsAt: row.trialEndsAt,
    subscribedAt: row.subscribedAt,
    suspendedAt: row.suspendedAt,
    suspendedReason: row.suspendedReason,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

/**
 * Atualiza plano de uma subscription
 */
export function updatePlan(accountId: string, planId: PlanId): Subscription {
  const db = getDatabase()
  const now = Date.now()

  db.prepare(`
    UPDATE subscriptions
    SET planId = ?, status = 'active', subscribedAt = ?, suspendedAt = NULL, suspendedReason = NULL, updatedAt = ?
    WHERE accountId = ?
  `).run(planId, now, now, accountId)

  return getSubscription(accountId)!
}

/**
 * Suspende subscription
 */
export function suspendSubscription(accountId: string, reason: string): Subscription {
  const db = getDatabase()
  const now = Date.now()

  db.prepare(`
    UPDATE subscriptions
    SET status = 'suspended', suspendedAt = ?, suspendedReason = ?, updatedAt = ?
    WHERE accountId = ?
  `).run(now, reason, now, accountId)

  return getSubscription(accountId)!
}

/**
 * Reativa subscription suspensa
 */
export function reactivateSubscription(accountId: string): Subscription {
  const db = getDatabase()
  const now = Date.now()

  db.prepare(`
    UPDATE subscriptions
    SET status = 'active', suspendedAt = NULL, suspendedReason = NULL, updatedAt = ?
    WHERE accountId = ?
  `).run(now, accountId)

  return getSubscription(accountId)!
}

/**
 * Cancela subscription
 */
export function cancelSubscription(accountId: string): Subscription {
  const db = getDatabase()
  const now = Date.now()

  db.prepare(`
    UPDATE subscriptions
    SET status = 'cancelled', cancelledAt = ?, updatedAt = ?
    WHERE accountId = ?
  `).run(now, now, accountId)

  return getSubscription(accountId)!
}

/**
 * Verifica se uma execução é permitida para um asset
 */
export function checkExecutionAllowed(
  accountId: string,
  assetId: string
): SubscriptionCheck {
  const subscription = getSubscription(accountId)

  if (!subscription) {
    return {
      allowed: false,
      reason: 'No subscription found',
      subscription: null as unknown as Subscription,
      usage: { current: 0, limit: 0, remaining: 0, percentUsed: 0 }
    }
  }

  const plan = getPlan(subscription.planId)
  const currentUsage = getCurrentUsage(assetId)
  const limit = plan.limits.executionsPerMonth

  const usage = {
    current: currentUsage,
    limit,
    remaining: limit === 0 ? Infinity : Math.max(0, limit - currentUsage),
    percentUsed: limit === 0 ? 0 : Math.min(100, (currentUsage / limit) * 100)
  }

  // Verificar status
  if (subscription.status === 'cancelled') {
    return {
      allowed: false,
      reason: 'Subscription cancelled',
      subscription,
      usage
    }
  }

  if (subscription.status === 'suspended') {
    return {
      allowed: false,
      reason: subscription.suspendedReason ?? 'Subscription suspended',
      subscription,
      usage
    }
  }

  // Verificar trial expirado
  if (subscription.status === 'trial' && subscription.trialEndsAt) {
    if (Date.now() > subscription.trialEndsAt) {
      // Auto-suspender trial expirado
      suspendSubscription(accountId, 'Trial expired')
      return {
        allowed: false,
        reason: 'Trial expired. Please upgrade to continue.',
        subscription: getSubscription(accountId)!,
        usage
      }
    }
  }

  // Verificar limite de execuções (0 = ilimitado)
  if (limit > 0 && currentUsage >= limit) {
    // Auto-suspender por limite excedido
    suspendSubscription(accountId, 'Monthly execution limit exceeded')
    return {
      allowed: false,
      reason: `Monthly execution limit (${limit}) exceeded. Please upgrade to continue.`,
      subscription: getSubscription(accountId)!,
      usage
    }
  }

  return {
    allowed: true,
    subscription,
    usage
  }
}

/**
 * Lista todas as subscriptions
 */
export function listSubscriptions(status?: SubscriptionStatus): Subscription[] {
  const db = getDatabase()

  let query = 'SELECT * FROM subscriptions'
  const params: string[] = []

  if (status) {
    query += ' WHERE status = ?'
    params.push(status)
  }

  query += ' ORDER BY createdAt DESC'

  const rows = db.prepare(query).all(...params) as Array<{
    accountId: string
    accountLogin: string
    accountType: string
    planId: string
    status: string
    trialStartedAt: number | null
    trialEndsAt: number | null
    subscribedAt: number | null
    suspendedAt: number | null
    suspendedReason: string | null
    cancelledAt: number | null
    createdAt: number
    updatedAt: number
  }>

  return rows.map(row => ({
    accountId: row.accountId,
    accountLogin: row.accountLogin,
    accountType: row.accountType as 'User' | 'Organization',
    planId: row.planId as PlanId,
    status: row.status as SubscriptionStatus,
    trialStartedAt: row.trialStartedAt,
    trialEndsAt: row.trialEndsAt,
    subscribedAt: row.subscribedAt,
    suspendedAt: row.suspendedAt,
    suspendedReason: row.suspendedReason,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }))
}

/**
 * Estatísticas de subscriptions
 */
export function getSubscriptionStats(): {
  total: number
  byStatus: Record<SubscriptionStatus, number>
  byPlan: Record<PlanId, number>
  trialExpiringSoon: number
} {
  const db = getDatabase()

  const total = db.prepare('SELECT COUNT(*) as count FROM subscriptions').get() as { count: number }

  const byStatus = {
    trial: 0,
    active: 0,
    suspended: 0,
    cancelled: 0
  }

  const statusRows = db.prepare(`
    SELECT status, COUNT(*) as count FROM subscriptions GROUP BY status
  `).all() as Array<{ status: string; count: number }>

  for (const row of statusRows) {
    byStatus[row.status as SubscriptionStatus] = row.count
  }

  const byPlan: Record<PlanId, number> = {
    free: 0,
    pro: 0,
    enterprise: 0
  }

  const planRows = db.prepare(`
    SELECT planId, COUNT(*) as count FROM subscriptions GROUP BY planId
  `).all() as Array<{ planId: string; count: number }>

  for (const row of planRows) {
    byPlan[row.planId as PlanId] = row.count
  }

  // Trials expirando em 3 dias
  const threeDaysFromNow = Date.now() + (3 * 24 * 60 * 60 * 1000)
  const expiring = db.prepare(`
    SELECT COUNT(*) as count FROM subscriptions
    WHERE status = 'trial' AND trialEndsAt <= ?
  `).get(threeDaysFromNow) as { count: number }

  return {
    total: total.count,
    byStatus,
    byPlan,
    trialExpiringSoon: expiring.count
  }
}
