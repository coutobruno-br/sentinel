// src/sentinel/execution/ExecutionIndex.ts

export interface ExecutionIndexRecord {
  executionId: string
  evidenceHash: string
  policyIds: string[]
  executedAt: number
}

/**
 * ExecutionIndex
 * – mantém relação execution ↔ evidence ↔ policies
 * – otimizado para leitura agregada (reports)
 * – implementação in-memory, intercambiável por DB
 */
export class ExecutionIndex {
  private readonly byExecution = new Map<string, ExecutionIndexRecord>()
  private readonly byEvidence = new Map<string, string[]>()

  index(record: ExecutionIndexRecord): void {
    this.byExecution.set(record.executionId, record)

    const executions = this.byEvidence.get(record.evidenceHash) ?? []
    executions.push(record.executionId)
    this.byEvidence.set(record.evidenceHash, executions)
  }

  getByExecutionId(executionId: string): ExecutionIndexRecord | undefined {
    return this.byExecution.get(executionId)
  }

  getByEvidenceHash(evidenceHash: string): ExecutionIndexRecord[] {
    const executionIds = this.byEvidence.get(evidenceHash) ?? []
    return executionIds
      .map(id => this.byExecution.get(id))
      .filter(Boolean) as ExecutionIndexRecord[]
  }

  list(): ExecutionIndexRecord[] {
    return Array.from(this.byExecution.values())
  }
}
