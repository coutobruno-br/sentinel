// src/sentinel/billing/paddle/PaddleService.ts
/**
 * PaddleService - Integração com Paddle Billing
 *
 * Responsável por:
 * - Criar/gerenciar clientes no Paddle
 * - Gerar links de checkout
 * - Sincronizar subscriptions
 */

import { Paddle, Environment } from '@paddle/paddle-node-sdk'
import { PlanId } from '../plans'

// Configuração do Paddle
const paddleEnv = process.env.PADDLE_ENVIRONMENT === 'production'
  ? Environment.production
  : Environment.sandbox

const paddleApiKey = process.env.PADDLE_API_KEY

// Cliente Paddle (inicializado lazy)
let paddleClient: Paddle | null = null

function getPaddleClient(): Paddle {
  if (!paddleClient) {
    if (!paddleApiKey) {
      throw new Error('PADDLE_API_KEY is required')
    }
    paddleClient = new Paddle(paddleApiKey, { environment: paddleEnv })
  }
  return paddleClient
}

/**
 * Mapeamento de Price IDs do Paddle para planos internos
 */
export function getPlanFromPriceId(priceId: string): PlanId | null {
  const proPriceId = process.env.PADDLE_PRICE_ID_PRO
  const enterprisePriceId = process.env.PADDLE_PRICE_ID_ENTERPRISE

  if (priceId === proPriceId) return 'pro'
  if (priceId === enterprisePriceId) return 'enterprise'
  return null
}

/**
 * Mapeamento de planos internos para Price IDs do Paddle
 */
export function getPriceIdFromPlan(planId: PlanId): string | null {
  switch (planId) {
    case 'pro':
      return process.env.PADDLE_PRICE_ID_PRO ?? null
    case 'enterprise':
      return process.env.PADDLE_PRICE_ID_ENTERPRISE ?? null
    default:
      return null
  }
}

/**
 * Cria ou obtém customer no Paddle
 */
export async function getOrCreatePaddleCustomer(
  email: string,
  name?: string
): Promise<string> {
  const paddle = getPaddleClient()

  // Buscar customer existente por email
  const customersCollection = await paddle.customers.list({ email: [email] })

  // Iterate through the collection to find existing customer
  for await (const customer of customersCollection) {
    return customer.id
  }

  // Criar novo customer
  const customer = await paddle.customers.create({
    email,
    name: name ?? undefined
  })

  return customer.id
}

/**
 * Gera link de checkout para upgrade
 */
export interface CheckoutOptions {
  accountId: string
  accountLogin: string
  email: string
  planId: PlanId
  successUrl?: string
  cancelUrl?: string
}

export interface CheckoutResult {
  checkoutUrl: string | null
  transactionId: string
  customerId: string
}

export async function createCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
  const paddle = getPaddleClient()

  const priceId = getPriceIdFromPlan(options.planId)
  if (!priceId) {
    throw new Error(`No Paddle price configured for plan: ${options.planId}`)
  }

  // Obter ou criar customer
  const customerId = await getOrCreatePaddleCustomer(options.email, options.accountLogin)

  // Criar transaction (checkout)
  const transaction = await paddle.transactions.create({
    customerId,
    items: [
      {
        priceId,
        quantity: 1
      }
    ],
    customData: {
      accountId: options.accountId,
      accountLogin: options.accountLogin,
      planId: options.planId
    }
  })

  return {
    checkoutUrl: transaction.checkout?.url ?? null,
    transactionId: transaction.id,
    customerId
  }
}

/**
 * Obtém detalhes de uma subscription no Paddle
 */
export async function getPaddleSubscription(subscriptionId: string) {
  const paddle = getPaddleClient()
  return paddle.subscriptions.get(subscriptionId)
}

/**
 * Cancela subscription no Paddle
 */
export async function cancelPaddleSubscription(
  subscriptionId: string,
  effectiveFrom: 'immediately' | 'next_billing_period' = 'next_billing_period'
): Promise<void> {
  const paddle = getPaddleClient()
  await paddle.subscriptions.cancel(subscriptionId, { effectiveFrom })
}

/**
 * Pausa subscription no Paddle
 */
export async function pausePaddleSubscription(subscriptionId: string): Promise<void> {
  const paddle = getPaddleClient()
  await paddle.subscriptions.pause(subscriptionId, {})
}

/**
 * Resume subscription no Paddle
 */
export async function resumePaddleSubscription(subscriptionId: string): Promise<void> {
  const paddle = getPaddleClient()
  await paddle.subscriptions.resume(subscriptionId, { effectiveFrom: 'immediately' })
}

/**
 * Atualiza subscription para novo plano
 */
export async function updatePaddleSubscription(
  subscriptionId: string,
  newPlanId: PlanId
): Promise<void> {
  const paddle = getPaddleClient()

  const newPriceId = getPriceIdFromPlan(newPlanId)
  if (!newPriceId) {
    throw new Error(`No Paddle price configured for plan: ${newPlanId}`)
  }

  // Atualizar com novo price
  await paddle.subscriptions.update(subscriptionId, {
    items: [
      {
        priceId: newPriceId,
        quantity: 1
      }
    ],
    prorationBillingMode: 'prorated_immediately'
  })
}

/**
 * Verifica se o Paddle está configurado
 */
export function isPaddleConfigured(): boolean {
  return Boolean(
    process.env.PADDLE_API_KEY &&
    process.env.PADDLE_WEBHOOK_SECRET
  )
}

/**
 * Retorna informações de configuração (para debug)
 */
export function getPaddleConfig() {
  return {
    configured: isPaddleConfigured(),
    environment: process.env.PADDLE_ENVIRONMENT ?? 'sandbox',
    hasApiKey: Boolean(process.env.PADDLE_API_KEY),
    hasWebhookSecret: Boolean(process.env.PADDLE_WEBHOOK_SECRET),
    hasClientToken: Boolean(process.env.PADDLE_CLIENT_TOKEN),
    proPriceId: process.env.PADDLE_PRICE_ID_PRO ?? null,
    enterprisePriceId: process.env.PADDLE_PRICE_ID_ENTERPRISE ?? null
  }
}
