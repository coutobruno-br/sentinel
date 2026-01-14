// src/sentinel/evidence/EvidenceStore.ts
import crypto from 'crypto'

export interface EvidenceRecord {
  hash: string
  payload: unknown
  metadata?: Record<string, any>
  source?: string
  createdAt: number
}

export class EvidenceStore {
  private readonly store = new Map<string, EvidenceRecord>()

  save(payload: unknown, metadata?: Record<string, any>, source?: string): EvidenceRecord {
    const canonical = JSON.stringify(payload)
    const hash = crypto.createHash('sha256').update(canonical).digest('hex')

    if (this.store.has(hash)) {
      return this.store.get(hash)!
    }

    const record: EvidenceRecord = {
      hash,
      payload,
      metadata,
      source,
      createdAt: Date.now()
    }

    this.store.set(hash, record)
    return record
  }

  getByHash(hash: string): EvidenceRecord | undefined {
    return this.store.get(hash)
  }

  list(): EvidenceRecord[] {
    return Array.from(this.store.values())
  }

  delete(hash: string): boolean {
    return this.store.delete(hash)
  }
}
