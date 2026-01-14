// src/server.ts
/*
Bootstrap cumpre:
– inicialização mínima e determinística
– endpoint /health para liveness/readiness
– binding explícito do webhook GitHub
– exposição read-only de evidências via /reports
– nenhuma lógica de domínio acoplada ao server
*/

import express from 'express'

import githubWebhook from './webhook/githubWebhook'
import reportsRouter from './reports/reportsRouter'

import { ApiKeyGuard } from './security/ApiKeyGuard'

import { EvidenceResolver } from './evidence/EvidenceResolver'
import { SQLiteAdapter } from './persistence/SQLiteAdapter'

const app = express()
app.use(express.json())

// Healthcheck
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'sentinel',
    timestamp: new Date().toISOString()
  })
})

// Webhooks (ingestão)
app.use('/webhook/github', githubWebhook)

// Evidence / Reports (read-only, protegido)
const persistence = new SQLiteAdapter()
const evidenceResolver = new EvidenceResolver(persistence)

app.get(
  '/reports/:hash',
  ApiKeyGuard,
  evidenceResolver.resolve
)

// (opcional) manter router legado se existir leitura agregada
app.use('/reports', ApiKeyGuard, reportsRouter)

const port = Number(process.env.PORT) || 3000

app.listen(port, () => {
  console.log(`[Sentinel] server running on port ${port}`)
})

export default app
