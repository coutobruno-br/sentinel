// src/server.ts
/*
Bootstrap cumpre:
– inicialização mínima e determinística
– endpoint /health para liveness/readiness
– binding explícito do webhook GitHub
– exposição read-only de evidências via /reports
– nenhuma lógica de domínio acoplada ao server
– graceful shutdown com fechamento de conexões
*/

import express from 'express'
import cors from 'cors'
import { config, printConfigSummary, validateConfig } from './config'

import githubWebhook from './webhook/githubWebhook'
import reportsRouter from './reports/reportsRouter'
import { appWebhookRouter, getInstallationStats } from './github'
import {
  getSubscriptionStats,
  getGlobalUsageStats,
  listAvailablePlans,
  getSubscription,
  getUsageSummary,
  createCheckout,
  isPaddleConfigured,
  paddleWebhookRouter
} from './billing'

import { ApiKeyGuard } from './security/ApiKeyGuard'

import { EvidenceResolver } from './evidence/EvidenceResolver'
import {
  getSQLiteAdapter,
  getEvidenceStore,
  getExecutionIndex,
  closePersistence
} from './persistence'

const app = express()
app.use(express.json())

// CORS - permitir requisições da landing page
app.use(cors({
  origin: config.isDev
    ? ['http://localhost:8080', 'http://127.0.0.1:8080']
    : [config.landingUrl],
  credentials: true
}))

// Inicializar persistência (SQLite)
const sqliteAdapter = getSQLiteAdapter()
const evidenceStore = getEvidenceStore()
const executionIndex = getExecutionIndex()

// Healthcheck com stats
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'sentinel',
    version: process.env.npm_package_version ?? '0.1.0',
    timestamp: new Date().toISOString(),
    stats: {
      evidences: evidenceStore.count(),
      executions: executionIndex.count()
    }
  })
})

// Stats endpoint
app.get('/stats', ApiKeyGuard, (_req, res) => {
  const executionStats = executionIndex.getStats()
  const installationStats = getInstallationStats()
  const subscriptionStats = getSubscriptionStats()
  const usageStats = getGlobalUsageStats()

  res.status(200).json({
    evidences: {
      total: evidenceStore.count()
    },
    executions: executionStats,
    installations: installationStats,
    subscriptions: subscriptionStats,
    usage: usageStats
  })
})

// Billing endpoints
app.get('/billing/plans', (_req, res) => {
  const plans = listAvailablePlans()
  res.status(200).json({ plans })
})

app.get('/billing/subscription/:accountId', ApiKeyGuard, (req, res) => {
  const { accountId } = req.params
  const subscription = getSubscription(accountId)

  if (!subscription) {
    return res.status(404).json({ error: 'Subscription not found' })
  }

  const usage = getUsageSummary(`org:${accountId}`)

  res.status(200).json({
    subscription,
    usage
  })
})

// Paddle configuration endpoint (public - for client)
app.get('/billing/paddle/config', (_req, res) => {
  res.status(200).json({
    configured: config.paddle.isConfigured(),
    clientToken: config.paddle.clientToken || null,
    environment: config.paddle.environment
  })
})

// Client configuration endpoint (for landing page)
app.get('/config', (_req, res) => {
  res.status(200).json({
    env: config.env,
    apiUrl: config.apiUrl,
    landingUrl: config.landingUrl,
    paddle: {
      configured: config.paddle.isConfigured(),
      environment: config.paddle.environment,
      clientToken: config.paddle.clientToken || null,
    },
  })
})

// Checkout endpoint - creates Paddle checkout session
app.post('/billing/checkout', async (req, res) => {
  try {
    const { accountId, accountLogin, email, planId } = req.body

    if (!accountId || !email || !planId) {
      return res.status(400).json({
        error: 'Missing required fields: accountId, email, planId'
      })
    }

    if (!isPaddleConfigured()) {
      return res.status(503).json({
        error: 'Payment system not configured'
      })
    }

    const result = await createCheckout({
      accountId,
      accountLogin: accountLogin ?? accountId,
      email,
      planId,
      successUrl: `${req.headers.origin}/billing/success`,
      cancelUrl: `${req.headers.origin}/billing/cancel`
    })

    res.status(200).json(result)
  } catch (error) {
    console.error('[Billing] Checkout error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Checkout failed'
    })
  }
})

// Paddle webhooks
app.use('/webhook/paddle', paddleWebhookRouter)

// Webhooks (ingestão)
app.use('/webhook/github', githubWebhook)

// GitHub App webhooks (instalação/desinstalação)
app.use('/webhook/github-app', appWebhookRouter)

// Evidence / Reports (read-only, protegido)
const evidenceResolver = new EvidenceResolver(sqliteAdapter)

app.get(
  '/reports/:hash',
  ApiKeyGuard,
  evidenceResolver.resolve
)

// Router de reports legado
app.use('/reports', ApiKeyGuard, reportsRouter)

// Validate configuration on startup
const configValidation = validateConfig()
if (!configValidation.valid && config.isProd) {
  console.warn('[Sentinel] Configuration warnings:')
  configValidation.errors.forEach(err => console.warn(`  - ${err}`))
}

const server = app.listen(config.port, () => {
  console.log('')
  printConfigSummary()
  console.log('')
  console.log(`[Sentinel] Server running on port ${config.port}`)
  console.log(`[Sentinel] Database: SQLite (persistent)`)
  console.log(`[Sentinel] Evidences: ${evidenceStore.count()}`)
  console.log(`[Sentinel] Executions: ${executionIndex.count()}`)
})

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n[Sentinel] Received ${signal}, shutting down gracefully...`)

  server.close(() => {
    console.log('[Sentinel] HTTP server closed')
    closePersistence()
    console.log('[Sentinel] Database connections closed')
    process.exit(0)
  })

  // Forçar shutdown após 10s
  setTimeout(() => {
    console.error('[Sentinel] Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

export default app
