// src/sentinel/evidence/RetentionPolicy.ts
import { EvidenceStore } from './EvidenceStore'

export type Tier = 'free' | 'pro' | 'enterprise'

const TTL_BY_TIER: Record<Tier, number> = {
  free: 7 * 24 * 60 * 60 * 1000,        // 7 days
  pro: 30 * 24 * 60 * 60 * 1000,        // 30 days
  enterprise: 365 * 24 * 60 * 60 * 1000 // 1 year
}

export class RetentionPolicy {
  constructor(private readonly store: EvidenceStore) {}

  purgeExpired(tier: Tier, now: number = Date.now()): number {
    const ttl = TTL_BY_TIER[tier]
    const cutoff = now - ttl

    const evidences = this.store.list()
    let purged = 0

    for (const ev of evidences) {
      if (ev.createdAt < cutoff) {
        this.store.delete(ev.hash)
        purged++
      }
    }

    return purged
  }
}
