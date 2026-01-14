// src/sentinel/execution/ExecutionIndexAdapter.ts
import { ExecutionIndexRecord } from './ExecutionIndex'

export interface ExecutionIndexAdapter {
  saveExecution(record: ExecutionIndexRecord): void
  getExecutionById(id: string): ExecutionIndexRecord | undefined
  listExecutions(): ExecutionIndexRecord[]
}
