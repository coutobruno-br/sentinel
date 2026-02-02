// src/sentinel/billing/BillingGuard.ts
import { Request, Response, NextFunction } from 'express'
import {
  getOrCreateSubscription,
  getSubscription,
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
  feature: FeatureFlag
): boolean {
  const plan = getPlan(subscription.planId)
  return plan.limits[feature]
}

/**
 * Tipos de features disponíveis
 */
export type FeatureFlag = 'pdfReports' | 'apiAccess' | 'prioritySupport' | 'customRules' | 'webhookNotifications'

/**
 * Mensagens de erro por feature
 */
const FEATURE_MESSAGES: Record<FeatureFlag, string> = {
  pdfReports: 'PDF reports are available on Pro and Enterprise plans',
  apiAccess: 'API access is not available on your current plan',
  prioritySupport: 'Priority support is available on Enterprise plan only',
  customRules: 'Custom rules are available on Pro and Enterprise plans',
  webhookNotifications: 'Webhook notifications are available on Pro and Enterprise plans'
}

/**
 * Middleware factory para verificar feature flags
 *
 * Uso:
 * app.get('/reports/pdf', requireFeature('pdfReports'), handler)
 */
export function requireFeature(feature: FeatureFlag) {
  return function featureGuard(req: Request, res: Response, next: NextFunction): void {
    // Se não há contexto de billing, verificar via accountId no header ou query
    let subscription: Subscription | null = null

    if (req.billing) {
      subscription = req.billing.subscription
    } else {
      // Tentar obter subscription via header ou query param
      const accountId = req.headers['x-sentinel-account-id'] as string
        || req.query.accountId as string

      if (accountId) {
        subscription = getSubscription(accountId) ?? null
      }
    }

    // Se não encontrou subscription, permitir apenas features básicas
    if (!subscription) {
      // Para rotas que requerem identificação, bloquear
      if (feature !== 'apiAccess') {
        res.status(401).json({
          error: 'authentication_required',
          message: 'Please provide account identification to access this feature',
          feature
        })
        return
      }
      return next()
    }

    // Verificar se feature está disponível no plano
    const hasFeature = checkFeature(subscription, feature)

    if (!hasFeature) {
      res.status(403).json({
        error: 'feature_not_available',
        message: FEATURE_MESSAGES[feature],
        feature,
        currentPlan: subscription.planId,
        requiredPlans: getPlansWithFeature(feature),
        upgradeUrl: 'https://sentinel-engine.com/#pricing'
      })
      return
    }

    next()
  }
}

/**
 * Retorna lista de planos que possuem uma feature
 */
function getPlansWithFeature(feature: FeatureFlag): string[] {
  const plans: string[] = []
  const allPlans = ['free', 'pro', 'enterprise'] as const

  for (const planId of allPlans) {
    const plan = getPlan(planId)
    if (plan.limits[feature]) {
      plans.push(planId)
    }
  }

  return plans
}

/**
 * Middleware para verificar múltiplas features (todas devem estar disponíveis)
 */
export function requireAllFeatures(...features: FeatureFlag[]) {
  return function allFeaturesGuard(req: Request, res: Response, next: NextFunction): void {
    let subscription: Subscription | null = null

    if (req.billing) {
      subscription = req.billing.subscription
    } else {
      const accountId = req.headers['x-sentinel-account-id'] as string
        || req.query.accountId as string

      if (accountId) {
        subscription = getSubscription(accountId) ?? null
      }
    }

    if (!subscription) {
      res.status(401).json({
        error: 'authentication_required',
        message: 'Please provide account identification to access this feature'
      })
      return
    }

    const missingFeatures = features.filter(f => !checkFeature(subscription!, f))

    if (missingFeatures.length > 0) {
      res.status(403).json({
        error: 'features_not_available',
        message: `The following features are not available on your plan: ${missingFeatures.join(', ')}`,
        missingFeatures,
        currentPlan: subscription.planId,
        upgradeUrl: 'https://sentinel-engine.com/#pricing'
      })
      return
    }

    next()
  }
}

/**
 * Middleware para verificar pelo menos uma feature (qualquer uma)
 */
export function requireAnyFeature(...features: FeatureFlag[]) {
  return function anyFeatureGuard(req: Request, res: Response, next: NextFunction): void {
    let subscription: Subscription | null = null

    if (req.billing) {
      subscription = req.billing.subscription
    } else {
      const accountId = req.headers['x-sentinel-account-id'] as string
        || req.query.accountId as string

      if (accountId) {
        subscription = getSubscription(accountId) ?? null
      }
    }

    if (!subscription) {
      res.status(401).json({
        error: 'authentication_required',
        message: 'Please provide account identification to access this feature'
      })
      return
    }

    const hasAnyFeature = features.some(f => checkFeature(subscription!, f))

    if (!hasAnyFeature) {
      res.status(403).json({
        error: 'feature_not_available',
        message: `This endpoint requires one of the following features: ${features.join(', ')}`,
        requiredFeatures: features,
        currentPlan: subscription.planId,
        upgradeUrl: 'https://sentinel-engine.com/#pricing'
      })
      return
    }

    next()
  }
}
