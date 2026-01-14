// src/sentinel/evidence/EvidenceAdapter.ts
import { EvidenceRecord } from './EvidenceStore'

export interface EvidenceAdapter {
  saveEvidence(record: EvidenceRecord): void
  getEvidence(hash: string): EvidenceRecord | undefined
  listEvidences(): EvidenceRecord[]
  deleteEvidence(hash: string): void
}
