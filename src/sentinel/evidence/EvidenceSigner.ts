// src/sentinel/evidence/EvidenceSigner.ts
import crypto from 'crypto'
import { EvidenceRecord } from './EvidenceStore'

export interface SignedEvidence {
  hash: string
  signature: string
  algorithm: string
  signedAt: number
  verified: boolean
}

/**
 * EvidenceSigner - Assina evidências para não-repúdio
 *
 * Em produção: usa RSA-SHA256 com chave privada
 * Em desenvolvimento: usa HMAC-SHA256 com chave derivada
 */
export class EvidenceSigner {
  private readonly privateKey: string | null
  private readonly algorithm: string
  private readonly isDevelopment: boolean

  constructor(privateKeyPem?: string) {
    this.privateKey = privateKeyPem ?? process.env.PRIVATE_SIGNING_KEY ?? null
    this.isDevelopment = !this.privateKey

    if (this.isDevelopment) {
      console.warn('[EvidenceSigner] No private key configured, using development mode (HMAC)')
      this.algorithm = 'HMAC-SHA256'
    } else {
      this.algorithm = 'RSA-SHA256'
    }
  }

  sign(evidence: EvidenceRecord): SignedEvidence {
    const payloadToSign = JSON.stringify({
      hash: evidence.hash,
      metadata: evidence.metadata ?? {},
      createdAt: evidence.createdAt
    })

    let signature: string

    if (this.isDevelopment) {
      // Modo desenvolvimento: HMAC com chave derivada do hash
      const hmac = crypto.createHmac('sha256', `dev-key-${evidence.hash.slice(0, 16)}`)
      hmac.update(payloadToSign)
      signature = hmac.digest('base64')
    } else {
      // Modo produção: RSA-SHA256
      const signer = crypto.createSign('RSA-SHA256')
      signer.update(payloadToSign)
      signer.end()
      signature = signer.sign(this.privateKey!, 'base64')
    }

    return {
      hash: evidence.hash,
      signature,
      algorithm: this.algorithm,
      signedAt: Date.now(),
      verified: !this.isDevelopment // Em dev, não é verificável externamente
    }
  }

  /**
   * Verifica assinatura (requer chave pública em produção)
   */
  verify(evidence: EvidenceRecord, signed: SignedEvidence, publicKeyPem?: string): boolean {
    const payloadToVerify = JSON.stringify({
      hash: evidence.hash,
      metadata: evidence.metadata ?? {},
      createdAt: evidence.createdAt
    })

    if (this.isDevelopment || signed.algorithm === 'HMAC-SHA256') {
      // Modo desenvolvimento: verificar HMAC
      const hmac = crypto.createHmac('sha256', `dev-key-${evidence.hash.slice(0, 16)}`)
      hmac.update(payloadToVerify)
      const expectedSignature = hmac.digest('base64')
      return signed.signature === expectedSignature
    }

    // Modo produção: verificar RSA
    if (!publicKeyPem) {
      throw new Error('Public key required for RSA verification')
    }

    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(payloadToVerify)
    verifier.end()

    return verifier.verify(publicKeyPem, signed.signature, 'base64')
  }

  /**
   * Retorna se está em modo desenvolvimento
   */
  isDevMode(): boolean {
    return this.isDevelopment
  }
}
