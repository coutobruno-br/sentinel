// src/sentinel/evidence/EvidenceSigner.ts
import crypto from 'crypto'
import { EvidenceRecord } from './EvidenceStore'

export interface SignedEvidence {
  hash: string
  signature: string
  algorithm: string
  signedAt: number
}

export class EvidenceSigner {
  private readonly privateKey: string
  private readonly algorithm = 'RSA-SHA256'

  constructor(privateKeyPem?: string) {
    if (!privateKeyPem) {
      throw new Error('EvidenceSigner requires PRIVATE_SIGNING_KEY')
    }
    this.privateKey = privateKeyPem
  }

  sign(evidence: EvidenceRecord): SignedEvidence {
    const payloadToSign = JSON.stringify({
      hash: evidence.hash,
      metadata: evidence.metadata ?? {},
      createdAt: evidence.createdAt
    })

    const signer = crypto.createSign(this.algorithm)
    signer.update(payloadToSign)
    signer.end()

    const signature = signer.sign(this.privateKey, 'base64')

    return {
      hash: evidence.hash,
      signature,
      algorithm: this.algorithm,
      signedAt: Date.now()
    }
  }
}
