// src/sentinel/evidence/EvidenceStore.ts
import crypto from 'crypto'
import { EvidenceAdapter } from './EvidenceAdapter'

export interface EvidenceRecord {
  hash: string
  payload: unknown
  metadata?: Record<string, unknown>
  source?: string
  createdAt: number
}

/**
 * In-memory adapter (fallback para testes)
 */
class InMemoryEvidenceAdapter implements EvidenceAdapter {
  private readonly store = new Map<string, EvidenceRecord>()

  saveEvidence(record: EvidenceRecord): void {
    this.store.set(record.hash, record)
  }

  getEvidence(hash: string): EvidenceRecord | undefined {
    return this.store.get(hash)
  }

  listEvidences(): EvidenceRecord[] {
    return Array.from(this.store.values())
  }

  deleteEvidence(hash: string): void {
    this.store.delete(hash)
  }
}

/**
 * EvidenceStore - Armazena evidências imutáveis com hash SHA256
 *
 * Suporta injeção de adapter para persistência (SQLite, PostgreSQL, etc)
 * Por padrão usa in-memory (para testes ou quando não há DB configurado)
 */
export class EvidenceStore {
  private readonly adapter: EvidenceAdapter

  constructor(adapter?: EvidenceAdapter) {
    this.adapter = adapter ?? new InMemoryEvidenceAdapter()
  }

  /**
   * Salva payload como evidência imutável
   * Retorna registro existente se hash já existe (idempotente)
   */
  save(payload: unknown, metadata?: Record<string, unknown>, source?: string): EvidenceRecord {
    const canonical = JSON.stringify(payload)
    const hash = crypto.createHash('sha256').update(canonical).digest('hex')

    // Verificar se já existe (idempotente)
    const existing = this.adapter.getEvidence(hash)
    if (existing) {
      return existing
    }

    const record: EvidenceRecord = {
      hash,
      payload,
      metadata,
      source,
      createdAt: Date.now()
    }

    this.adapter.saveEvidence(record)
    return record
  }

  /**
   * Busca evidência por hash
   */
  getByHash(hash: string): EvidenceRecord | undefined {
    return this.adapter.getEvidence(hash)
  }

  /**
   * Lista todas as evidências
   */
  list(): EvidenceRecord[] {
    return this.adapter.listEvidences()
  }

  /**
   * Remove evidência (usado por retention policy)
   */
  delete(hash: string): boolean {
    const exists = this.adapter.getEvidence(hash) !== undefined
    if (exists) {
      this.adapter.deleteEvidence(hash)
    }
    return exists
  }

  /**
   * Verifica integridade de uma evidência
   */
  verify(hash: string): boolean {
    const record = this.adapter.getEvidence(hash)
    if (!record) return false

    const canonical = JSON.stringify(record.payload)
    const computedHash = crypto.createHash('sha256').update(canonical).digest('hex')
    return computedHash === hash
  }

  /**
   * Conta total de evidências
   */
  count(): number {
    return this.adapter.listEvidences().length
  }
}
