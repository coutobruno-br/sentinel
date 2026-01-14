// src/sentinel/webhook/github.ts
import express, { Request, Response } from 'express'
import { PolicyEngine } from '../engine/engine'
import { ExecutionContext, PolicyResult } from '../engine/types'

const app = express()
app.use(express.json())

const engine = new PolicyEngine([
  {
    id: 'medium',
    severity: 'medium',

    execute: undefined,

    supports: function (_event: string): boolean {
      return false
    },

    evaluate: function (_ctx: ExecutionContext): PolicyResult {
      return {
        passed: true,
        message: 'Policy not implemented',
        evidenceHash: _ctx.repo.id + '-evidence'
      }
    }
  }
])

app.post('/webhook/github', async (req: Request, res: Response) => {
  const payload = req.body

  const ctx: ExecutionContext = {
    repo: {
      id: payload.repository.full_name,
      name: payload.repository.name,
      branch: payload.ref?.replace('refs/heads/', '')
    },
    commit: {
      sha: payload.after,
      author: payload.pusher?.name || 'unknown'
    },
    files: [],
    config: {
      policies: []
    }
  }

  const results = engine.run(ctx)

  res.status(200).json({ results })
})

export default app
