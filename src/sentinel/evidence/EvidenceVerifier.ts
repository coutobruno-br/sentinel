// src/sentinel/evidence/EvidenceVerifier.ts
import crypto from 'crypto'
import { SignedEvidence } from './EvidenceSigner'
import { EvidenceRecord } from './EvidenceStore'

export class EvidenceVerifier {
  private readonly publicKey: string
  private readonly algorithm = 'RSA-SHA256'

  constructor(publicKeyPem?: string) {
    if (!publicKeyPem) {
      throw new Error('EvidenceVerifier requires PUBLIC_VERIFYING_KEY')
    }
    this.publicKey = publicKeyPem
  }

  verify(evidence: EvidenceRecord, signed: SignedEvidence): boolean {
    if (evidence.hash !== signed.hash) {
      return false
    }

    const payloadToVerify = JSON.stringify({
      hash: evidence.hash,
      metadata: evidence.metadata ?? {},
      createdAt: evidence.createdAt
    })

    const verifier = crypto.createVerify(this.algorithm)
    verifier.update(payloadToVerify)
    verifier.end()

    return verifier.verify(this.publicKey, signed.signature, 'base64')
  }
}
