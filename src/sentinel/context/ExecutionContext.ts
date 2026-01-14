// src/sentinel/context/ExecutionContext.ts
import { PolicyContext } from '../policies/PolicyRule'

export interface ExecutionContext extends PolicyContext {
  canonicalPayload: unknown
  metadata?: Record<string, any>
  source?: string
}
