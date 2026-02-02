// src/sentinel/billing/paddle/paddleWebhook.ts
/**
 * Paddle Webhook Handler
 *
 * Recebe e processa eventos do Paddle:
 * - subscription.created
 * - subscription.updated
 * - subscription.canceled
 * - subscription.paused
 * - subscription.resumed
 * - transaction.completed
 */

import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import {
  updatePlan,
  suspendSubscription,
  reactivateSubscription,
  cancelSubscription,
  getSubscription
} from '../subscription'
import { getPlanFromPriceId } from './PaddleService'
import { getDatabase } from '../../persistence/db/db'

const router = Router()

// Tipos de eventos do Paddle
interface PaddleWebhookEvent {
  event_id: string
  event_type: string
  occurred_at: string
  data: {
    id: string
    status?: string
    customer_id?: string
    items?: Array<{
      price: {
        id: string
      }
    }>
    custom_data?: {
      accountId?: string
      accountLogin?: string
      planId?: string
    }
  }
}

/**
 * Verifica assinatura do webhook Paddle
 */
function verifyPaddleSignature(
  rawBody: string,
  signature: string | undefined
): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET

  if (!secret || !signature) {
    console.warn('[Paddle] Missing webhook secret or signature')
    return false
  }

  try {
    // Paddle usa ts;h1=signature format
    const parts = signature.split(';')
    const tsMatch = parts.find(p => p.startsWith('ts='))
    const h1Match = parts.find(p => p.startsWith('h1='))

    if (!tsMatch || !h1Match) {
      return false
    }

    const timestamp = tsMatch.replace('ts=', '')
    const providedSignature = h1Match.replace('h1=', '')

    // Construir payload para verificação
    const payload = `${timestamp}:${rawBody}`

    // Calcular HMAC
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('[Paddle] Signature verification error:', error)
    return false
  }
}

/**
 * Atualiza campos Paddle na subscription
 */
function updatePaddleFields(
  accountId: string,
  paddleCustomerId: string,
  paddleSubscriptionId: string
): void {
  const db = getDatabase()

  // Garantir que as colunas existem
  try {
    db.exec(`
      ALTER TABLE subscriptions ADD COLUMN paddleCustomerId TEXT;
    `)
  } catch {
    // Coluna já existe
  }

  try {
    db.exec(`
      ALTER TABLE subscriptions ADD COLUMN paddleSubscriptionId TEXT;
    `)
  } catch {
    // Coluna já existe
  }

  db.prepare(`
    UPDATE subscriptions
    SET paddleCustomerId = ?, paddleSubscriptionId = ?, updatedAt = ?
    WHERE accountId = ?
  `).run(paddleCustomerId, paddleSubscriptionId, Date.now(), accountId)
}

/**
 * Obtém accountId pelo paddleSubscriptionId
 */
function getAccountByPaddleSubscription(paddleSubscriptionId: string): string | null {
  const db = getDatabase()

  const row = db.prepare(`
    SELECT accountId FROM subscriptions WHERE paddleSubscriptionId = ?
  `).get(paddleSubscriptionId) as { accountId: string } | undefined

  return row?.accountId ?? null
}

/**
 * Handler principal de webhooks
 */
router.post('/', (req: Request, res: Response) => {
  const signature = req.headers['paddle-signature'] as string | undefined

  // Verificar assinatura (em produção)
  if (process.env.NODE_ENV === 'production') {
    const rawBody = JSON.stringify(req.body)
    if (!verifyPaddleSignature(rawBody, signature)) {
      console.error('[Paddle] Invalid webhook signature')
      return res.status(401).json({ error: 'Invalid signature' })
    }
  }

  const event = req.body as PaddleWebhookEvent

  console.log(`[Paddle] Received webhook: ${event.event_type}`)

  try {
    switch (event.event_type) {
      case 'subscription.created':
        handleSubscriptionCreated(event)
        break

      case 'subscription.updated':
        handleSubscriptionUpdated(event)
        break

      case 'subscription.canceled':
        handleSubscriptionCanceled(event)
        break

      case 'subscription.paused':
        handleSubscriptionPaused(event)
        break

      case 'subscription.resumed':
        handleSubscriptionResumed(event)
        break

      case 'transaction.completed':
        handleTransactionCompleted(event)
        break

      default:
        console.log(`[Paddle] Unhandled event type: ${event.event_type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('[Paddle] Webhook processing error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

/**
 * subscription.created - Nova assinatura criada
 */
function handleSubscriptionCreated(event: PaddleWebhookEvent): void {
  const { id: subscriptionId, customer_id, items, custom_data } = event.data

  if (!custom_data?.accountId) {
    console.warn('[Paddle] subscription.created without accountId')
    return
  }

  const accountId = custom_data.accountId
  const priceId = items?.[0]?.price?.id

  if (!priceId) {
    console.warn('[Paddle] subscription.created without price')
    return
  }

  const planId = getPlanFromPriceId(priceId)

  if (!planId) {
    console.warn(`[Paddle] Unknown price ID: ${priceId}`)
    return
  }

  // Atualizar subscription interna
  updatePlan(accountId, planId)

  // Salvar IDs do Paddle
  if (customer_id) {
    updatePaddleFields(accountId, customer_id, subscriptionId)
  }

  console.log(`[Paddle] Subscription created: ${accountId} -> ${planId}`)
}

/**
 * subscription.updated - Assinatura atualizada (upgrade/downgrade)
 */
function handleSubscriptionUpdated(event: PaddleWebhookEvent): void {
  const { id: subscriptionId, items, status } = event.data

  const accountId = getAccountByPaddleSubscription(subscriptionId)

  if (!accountId) {
    console.warn(`[Paddle] subscription.updated for unknown subscription: ${subscriptionId}`)
    return
  }

  // Verificar mudança de plano
  const priceId = items?.[0]?.price?.id

  if (priceId) {
    const planId = getPlanFromPriceId(priceId)
    if (planId) {
      updatePlan(accountId, planId)
      console.log(`[Paddle] Subscription updated: ${accountId} -> ${planId}`)
    }
  }

  // Verificar status
  if (status === 'active') {
    const subscription = getSubscription(accountId)
    if (subscription?.status === 'suspended') {
      reactivateSubscription(accountId)
      console.log(`[Paddle] Subscription reactivated: ${accountId}`)
    }
  }
}

/**
 * subscription.canceled - Assinatura cancelada
 */
function handleSubscriptionCanceled(event: PaddleWebhookEvent): void {
  const { id: subscriptionId } = event.data

  const accountId = getAccountByPaddleSubscription(subscriptionId)

  if (!accountId) {
    console.warn(`[Paddle] subscription.canceled for unknown subscription: ${subscriptionId}`)
    return
  }

  cancelSubscription(accountId)
  console.log(`[Paddle] Subscription canceled: ${accountId}`)
}

/**
 * subscription.paused - Assinatura pausada
 */
function handleSubscriptionPaused(event: PaddleWebhookEvent): void {
  const { id: subscriptionId } = event.data

  const accountId = getAccountByPaddleSubscription(subscriptionId)

  if (!accountId) {
    console.warn(`[Paddle] subscription.paused for unknown subscription: ${subscriptionId}`)
    return
  }

  suspendSubscription(accountId, 'Subscription paused')
  console.log(`[Paddle] Subscription paused: ${accountId}`)
}

/**
 * subscription.resumed - Assinatura resumida
 */
function handleSubscriptionResumed(event: PaddleWebhookEvent): void {
  const { id: subscriptionId } = event.data

  const accountId = getAccountByPaddleSubscription(subscriptionId)

  if (!accountId) {
    console.warn(`[Paddle] subscription.resumed for unknown subscription: ${subscriptionId}`)
    return
  }

  reactivateSubscription(accountId)
  console.log(`[Paddle] Subscription resumed: ${accountId}`)
}

/**
 * transaction.completed - Pagamento concluído
 */
function handleTransactionCompleted(event: PaddleWebhookEvent): void {
  const { custom_data } = event.data

  if (!custom_data?.accountId) {
    // Transação não relacionada a subscription (pode ser one-time)
    return
  }

  console.log(`[Paddle] Transaction completed for: ${custom_data.accountId}`)

  // Reativar se estava suspenso por pagamento
  const subscription = getSubscription(custom_data.accountId)
  if (subscription?.status === 'suspended' &&
      subscription.suspendedReason?.includes('payment')) {
    reactivateSubscription(custom_data.accountId)
    console.log(`[Paddle] Reactivated after payment: ${custom_data.accountId}`)
  }
}

export default router
