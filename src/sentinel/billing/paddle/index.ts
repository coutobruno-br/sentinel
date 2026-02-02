// src/sentinel/billing/paddle/index.ts
/**
 * Paddle Integration Module
 */

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
  type CheckoutOptions,
  type CheckoutResult
} from './PaddleService'

export { default as paddleWebhookRouter } from './paddleWebhook'
