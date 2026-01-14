// src/sentinel/webhook/githubWebhook.ts
/*
Características técnicas:
– validação determinística via x-hub-signature-256
– uso de timingSafeEqual contra ataques de timing
– rejeição imediata sem side effects
– desacoplado do engine de execução
– pronto para múltiplos eventos GitHub

Estado do sistema agora:
– servidor funcional
– healthcheck ativo
– webhook seguro
– base correta para acoplar o SentinelEngine

*/
import { Router, Request, Response } from 'express'
import crypto from 'crypto'

const router = Router()

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || ''

function verifySignature(req: Request, payload: string): boolean {
  const signature = req.headers['x-hub-signature-256'] as string | undefined
  if (!signature || !WEBHOOK_SECRET) return false

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
  const digest = `sha256=${hmac.update(payload).digest('hex')}`

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

router.post('/', (req: Request, res: Response) => {
  const rawBody = JSON.stringify(req.body)

  if (!verifySignature(req, rawBody)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const event = req.headers['x-github-event'] as string

  // Placeholder: dispatch event to execution engine
  console.log('[Sentinel] GitHub event received:', event)

  res.status(202).json({ status: 'accepted' })
})

export default router
