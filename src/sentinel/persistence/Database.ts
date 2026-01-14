// src/sentinel/persistence/Database.ts
export interface ExecutionRecord {
  id: string
  event: string
  asset: string
  timestamp: string
  violations: unknown
  evidenceHash: string
}

export interface DatabaseAdapter {
  saveExecution(record: ExecutionRecord): void
  listExecutions(limit: number): ExecutionRecord[]
  getExecutionById(id: string): ExecutionRecord | null
}



