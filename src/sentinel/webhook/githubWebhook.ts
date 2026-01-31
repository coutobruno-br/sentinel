// src/sentinel/webhook/githubWebhook.ts
/*
Características técnicas:
– validação determinística via x-hub-signature-256
– uso de timingSafeEqual contra ataques de timing
– rejeição imediata sem side effects
– integração com SentinelEngine para execução de políticas
– persistência automática de evidências e execuções

Fluxo:
1. Receber webhook
2. Validar assinatura HMAC
3. Executar políticas via SentinelEngine
4. Persistir evidência e resultado
5. Retornar resultado
*/
import { Router, Request, Response } from 'express'
import crypto from 'crypto'

import { SentinelEngine } from '../engine/SentinelEngine'
import { EvidenceSigner } from '../evidence/EvidenceSigner'
import { RetentionPolicy } from '../evidence/RetentionPolicy'
import { allMvpRules } from '../rules'
import {
  getEvidenceStore,
  getExecutionIndex
} from '../persistence'
import {
  billingGuard,
  recordUsage,
  getBillingHeaders
} from '../billing'

const router = Router()

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || ''

// Inicializar engine com dependências
const evidenceStore = getEvidenceStore()
const executionIndex = getExecutionIndex()
const evidenceSigner = new EvidenceSigner()
const retentionPolicy = new RetentionPolicy(evidenceStore)

const engine = new SentinelEngine(
  evidenceStore,
  executionIndex,
  evidenceSigner,
  allMvpRules,
  retentionPolicy,
  'free' // tier padrão
)

function verifySignature(req: Request, payload: string): boolean {
  const signature = req.headers['x-hub-signature-256'] as string | undefined

  // Em desenvolvimento, permitir sem secret
  if (!WEBHOOK_SECRET) {
    console.warn('[Sentinel] WARNING: GITHUB_WEBHOOK_SECRET not set, skipping signature verification')
    return true
  }

  if (!signature) return false

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
  const digest = `sha256=${hmac.update(payload).digest('hex')}`

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
  } catch {
    return false
  }
}

router.post('/', billingGuard, async (req: Request, res: Response) => {
  const rawBody = JSON.stringify(req.body)

  // 1. Validar assinatura
  if (!verifySignature(req, rawBody)) {
    console.log('[Sentinel] Invalid webhook signature')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const event = req.headers['x-github-event'] as string
  const deliveryId = req.headers['x-github-delivery'] as string

  console.log(`[Sentinel] Webhook received: ${event} (${deliveryId})`)

  // 2. Ignorar eventos ping
  if (event === 'ping') {
    return res.status(200).json({ status: 'pong' })
  }

  try {
    // 3. Executar engine
    const result = await engine.execute(event, req.body)

    // 4. Registrar uso para billing
    recordUsage(req, result.executionId)

    console.log(`[Sentinel] Execution ${result.executionId}: ${result.summary.passed}/${result.summary.total} passed`)

    // 5. Adicionar headers de billing
    const billingHeaders = getBillingHeaders(req)
    for (const [key, value] of Object.entries(billingHeaders)) {
      res.setHeader(key, value)
    }

    // 6. Retornar resultado
    res.status(202).json({
      status: 'processed',
      executionId: result.executionId,
      evidenceHash: result.evidenceHash,
      event,
      repo: result.repo,
      summary: result.summary,
      billing: req.billing ? {
        plan: req.billing.subscription.planId,
        usage: req.billing.check.usage
      } : undefined
    })
  } catch (error) {
    console.error('[Sentinel] Execution error:', error)

    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Endpoint para dry-run (teste sem persistir)
router.post('/dry-run', async (req: Request, res: Response) => {
  const event = req.headers['x-github-event'] as string ?? 'push'

  try {
    const results = engine.dryRun(event, req.body)

    res.status(200).json({
      status: 'dry-run',
      event,
      results
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
