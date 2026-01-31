// src/sentinel/billing/BillingGuard.ts
import { Request, Response, NextFunction } from 'express'
import {
  getOrCreateSubscription,
  checkExecutionAllowed,
  Subscription,
  SubscriptionCheck
} from './subscription'
import { incrementUsage } from './metering'
import { getPlan } from './plans'

/**
 * BillingGuard - Middleware de verificação de billing
 *
 * Verifica se a execução é permitida com base em:
 * - Status da subscription (trial, active, suspended, cancelled)
 * - Limites do plano (execuções por mês, repositórios)
 * - Trial expirado
 */

export interface BillingContext {
  subscription: Subscription
  check: SubscriptionCheck
  assetId: string
  assetName: string
}

// Estender Request para incluir contexto de billing
declare global {
  namespace Express {
    interface Request {
      billing?: BillingContext
    }
  }
}

/**
 * Extrai informações do asset do payload do webhook
 */
function extractAssetInfo(payload: unknown): {
  assetId: string
  assetName: string
  assetType: 'repository' | 'organization'
  accountId: string
  accountLogin: string
  accountType: 'User' | 'Organization'
} | null {
  const p = payload as {
    repository?: {
      id: number
      full_name: string
      owner: {
        id: number
        login: string
        type: string
      }
    }
    organization?: {
      id: number
      login: string
    }
    installation?: {
      id: number
      account: {
        id: number
        login: string
        type: string
      }
    }
  }

  // Priorizar informação da instalação
  if (p.installation) {
    const account = p.installation.account
    return {
      assetId: p.repository ? `repo:${p.repository.id}` : `org:${account.id}`,
      assetName: p.repository?.full_name ?? account.login,
      assetType: p.repository ? 'repository' : 'organization',
      accountId: String(account.id),
      accountLogin: account.login,
      accountType: account.type as 'User' | 'Organization'
    }
  }

  // Fallback para repositório
  if (p.repository) {
    const owner = p.repository.owner
    return {
      assetId: `repo:${p.repository.id}`,
      assetName: p.repository.full_name,
      assetType: 'repository',
      accountId: String(owner.id),
      accountLogin: owner.login,
      accountType: owner.type as 'User' | 'Organization'
    }
  }

  return null
}

/**
 * Middleware de verificação de billing
 */
export function billingGuard(req: Request, res: Response, next: NextFunction): void {
  const payload = req.body

  // Extrair informações do asset
  const assetInfo = extractAssetInfo(payload)

  if (!assetInfo) {
    // Sem informação de asset, permitir (pode ser ping ou outro evento)
    return next()
  }

  // Obter ou criar subscription
  const subscription = getOrCreateSubscription(
    assetInfo.accountId,
    assetInfo.accountLogin,
    assetInfo.accountType
  )

  // Verificar se execução é permitida
  const check = checkExecutionAllowed(assetInfo.accountId, assetInfo.assetId)

  if (!check.allowed) {
    res.status(402).json({
      error: 'billing_limit_exceeded',
      message: check.reason,
      subscription: {
        accountId: subscription.accountId,
        planId: subscription.planId,
        status: subscription.status
      },
      usage: check.usage,
      upgrade_url: `https://github.com/marketplace/sentinel-engine`
    })
    return
  }

  // Adicionar contexto ao request
  req.billing = {
    subscription,
    check,
    assetId: assetInfo.assetId,
    assetName: assetInfo.assetName
  }

  next()
}

/**
 * Registra uso após execução bem-sucedida
 */
export function recordUsage(req: Request, executionId: string): void {
  if (!req.billing) return

  const { assetId, assetName, subscription } = req.billing

  // Incrementar uso
  incrementUsage(
    assetId,
    subscription.accountType === 'Organization' ? 'organization' : 'repository',
    assetName,
    executionId
  )
}

/**
 * Middleware opcional para verificar limite de repositórios
 */
export function repositoryLimitGuard(req: Request, _res: Response, next: NextFunction): void {
  if (!req.billing) return next()

  const { subscription } = req.billing
  const planLimits = getPlan(subscription.planId).limits

  // Se não há limite, permitir
  if (planLimits.maxRepositories === 0) {
    return next()
  }

  // TODO: Implementar contagem de repositórios por conta
  // Por enquanto, apenas passar
  next()
}

/**
 * Retorna headers de billing para resposta
 */
export function getBillingHeaders(req: Request): Record<string, string> {
  if (!req.billing) return {}

  const { check, subscription } = req.billing

  return {
    'X-Sentinel-Plan': subscription.planId,
    'X-Sentinel-Status': subscription.status,
    'X-Sentinel-Usage-Current': String(check.usage.current),
    'X-Sentinel-Usage-Limit': String(check.usage.limit),
    'X-Sentinel-Usage-Remaining': String(check.usage.remaining)
  }
}

/**
 * Verifica se feature está disponível no plano
 */
export function checkFeature(
  subscription: Subscription,
  feature: 'pdfReports' | 'apiAccess' | 'prioritySupport' | 'customRules' | 'webhookNotifications'
): boolean {
  const plan = getPlan(subscription.planId)
  return plan.limits[feature]
}
