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

import githubWebhook from './webhook/githubWebhook'
import reportsRouter from './reports/reportsRouter'
import { appWebhookRouter, getInstallationStats } from './github'
import {
  getSubscriptionStats,
  getGlobalUsageStats,
  listAvailablePlans,
  getSubscription,
  getUsageSummary
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

const port = Number(process.env.PORT) || 3000

const server = app.listen(port, () => {
  console.log(`[Sentinel] Server running on port ${port}`)
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
