// src/sentinel/security/ApiKeyGuard.ts
import { Request, Response, NextFunction } from 'express'

const API_KEY_HEADER = 'x-sentinel-key'
const VALID_KEYS = (process.env.SENTINEL_API_KEYS || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean)

export function ApiKeyGuard(req: Request, res: Response, next: NextFunction) {
  if (VALID_KEYS.length === 0) {
    return res.status(500).json({ error: 'API keys not configured' })
  }

  const key = req.headers[API_KEY_HEADER] as string | undefined

  if (!key || !VALID_KEYS.includes(key)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}



