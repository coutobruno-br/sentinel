// src/sentinel/webhook/github.ts
import express, { Request, Response } from 'express'
import { PolicyEngine } from '../engine/engine'
import { ContextBuilder } from '../context/ContextBuilder'
import { allMvpRules } from '../rules'

const app = express()
app.use(express.json())

// Engine inicializado com todas as regras MVP
const engine = new PolicyEngine(allMvpRules)

app.post('/webhook/github', async (req: Request, res: Response) => {
  const payload = req.body
  const event = req.headers['x-github-event'] as string ?? 'push'

  // Construir contexto normalizado a partir do payload
  const ctx = ContextBuilder.fromGitHub(event, payload)

  // Executar regras
  const results = engine.run(ctx)

  // Calcular resumo
  const passed = results.filter(r => r.passed).length
  const failed = results.length - passed

  res.status(200).json({
    event,
    repo: ctx.repo,
    summary: {
      total: results.length,
      passed,
      failed
    },
    results
  })
})

export default app
