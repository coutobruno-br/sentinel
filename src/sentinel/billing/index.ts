// src/sentinel/billing/index.ts
/**
 * Módulo de Billing do Sentinel
 *
 * Sistema completo de billing incluindo:
 * - Planos e limites
 * - Metering de uso
 * - Subscriptions
 * - Guards de verificação
 */

// Planos
export {
  PLANS,
  getPlan,
  listAvailablePlans,
  formatPrice,
  getAnnualDiscount,
  hasExecutionLimit,
  hasRepositoryLimit,
  type PlanId,
  type Plan,
  type PlanLimits
} from './plans'

// Metering
export {
  incrementUsage,
  getCurrentUsage,
  getUsageRecord,
  getUsageSummary,
  listCurrentUsage,
  getUsageHistory,
  resetUsage,
  getGlobalUsageStats,
  getCurrentPeriod,
  type UsageRecord,
  type UsageSummary
} from './metering'

// Subscriptions
export {
  createSubscription,
  getSubscription,
  getOrCreateSubscription,
  updatePlan,
  suspendSubscription,
  reactivateSubscription,
  cancelSubscription,
  checkExecutionAllowed,
  listSubscriptions,
  getSubscriptionStats,
  type Subscription,
  type SubscriptionStatus,
  type SubscriptionCheck
} from './subscription'

// Guards
export {
  billingGuard,
  recordUsage,
  repositoryLimitGuard,
  getBillingHeaders,
  checkFeature,
  requireFeature,
  requireAllFeatures,
  requireAnyFeature,
  type BillingContext,
  type FeatureFlag
} from './BillingGuard'

// Paddle Integration
export {
  createCheckout,
  getOrCreatePaddleCustomer,
  getPaddleSubscription,
  cancelPaddleSubscription,
  pausePaddleSubscription,
  resumePaddleSubscription,
  updatePaddleSubscription,
  getPlanFromPriceId,
  getPriceIdFromPlan,
  isPaddleConfigured,
  getPaddleConfig,
  paddleWebhookRouter,
  type CheckoutOptions,
  type CheckoutResult
} from './paddle'
