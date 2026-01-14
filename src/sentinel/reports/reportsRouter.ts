// src/sentinel/reports/reportsRouter.ts
import { Router, Request, Response } from 'express'
import { ApiKeyGuard } from '../security/ApiKeyGuard'
import {
  listExecutions,
  getExecutionById
} from '../persistence/reportsRepository'

const router = Router()

router.use(ApiKeyGuard)

// GET /reports
router.get('/', (_req: Request, res: Response) => {
  const reports = listExecutions(50)

  res.json({
    count: reports.length,
    data: reports
  })
})

// GET /reports/:id
router.get('/:id', (req: Request, res: Response) => {
  const report = getExecutionById(req.params.id)

  if (!report) {
    res.status(404).json({ error: 'Report not found' })
    return
  }

  res.json(report)
})

export default router
