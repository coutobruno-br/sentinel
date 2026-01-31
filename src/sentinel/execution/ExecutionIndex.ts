// src/sentinel/execution/ExecutionIndex.ts
import { ExecutionIndexAdapter } from './ExecutionIndexAdapter'

export interface ExecutionIndexRecord {
  executionId: string
  evidenceHash: string
  policyIds: string[]
  executedAt: number
}

/**
 * In-memory adapter (fallback para testes)
 */
class InMemoryExecutionIndexAdapter implements ExecutionIndexAdapter {
  private readonly store = new Map<string, ExecutionIndexRecord>()

  saveExecution(record: ExecutionIndexRecord): void {
    this.store.set(record.executionId, record)
  }

  getExecutionById(id: string): ExecutionIndexRecord | undefined {
    return this.store.get(id)
  }

  listExecutions(): ExecutionIndexRecord[] {
    return Array.from(this.store.values())
  }
}

/**
 * ExecutionIndex
 * – mantém relação execution ↔ evidence ↔ policies
 * – otimizado para leitura agregada (reports)
 * – suporta injeção de adapter para persistência
 */
export class ExecutionIndex {
  private readonly adapter: ExecutionIndexAdapter

  constructor(adapter?: ExecutionIndexAdapter) {
    this.adapter = adapter ?? new InMemoryExecutionIndexAdapter()
  }

  /**
   * Indexa uma nova execução
   */
  index(record: ExecutionIndexRecord): void {
    this.adapter.saveExecution(record)
  }

  /**
   * Busca execução por ID
   */
  getByExecutionId(executionId: string): ExecutionIndexRecord | undefined {
    return this.adapter.getExecutionById(executionId)
  }

  /**
   * Busca execuções por hash de evidência
   */
  getByEvidenceHash(evidenceHash: string): ExecutionIndexRecord[] {
    return this.adapter.listExecutions()
      .filter(record => record.evidenceHash === evidenceHash)
  }

  /**
   * Lista todas as execuções
   */
  list(): ExecutionIndexRecord[] {
    return this.adapter.listExecutions()
  }

  /**
   * Lista execuções ordenadas por data (mais recentes primeiro)
   */
  listRecent(limit: number = 100): ExecutionIndexRecord[] {
    return this.adapter.listExecutions()
      .sort((a, b) => b.executedAt - a.executedAt)
      .slice(0, limit)
  }

  /**
   * Busca execuções por período
   */
  getByDateRange(startTime: number, endTime: number): ExecutionIndexRecord[] {
    return this.adapter.listExecutions()
      .filter(record => record.executedAt >= startTime && record.executedAt <= endTime)
  }

  /**
   * Busca execuções que aplicaram uma política específica
   */
  getByPolicyId(policyId: string): ExecutionIndexRecord[] {
    return this.adapter.listExecutions()
      .filter(record => record.policyIds.includes(policyId))
  }

  /**
   * Conta total de execuções
   */
  count(): number {
    return this.adapter.listExecutions().length
  }

  /**
   * Estatísticas de execuções
   */
  getStats(): {
    total: number
    today: number
    thisWeek: number
    thisMonth: number
  } {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const weekMs = 7 * dayMs
    const monthMs = 30 * dayMs

    const all = this.adapter.listExecutions()

    return {
      total: all.length,
      today: all.filter(r => r.executedAt >= now - dayMs).length,
      thisWeek: all.filter(r => r.executedAt >= now - weekMs).length,
      thisMonth: all.filter(r => r.executedAt >= now - monthMs).length
    }
  }
}
