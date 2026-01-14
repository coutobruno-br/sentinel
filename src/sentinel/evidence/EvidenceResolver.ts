// src/sentinel/evidence/EvidenceResolver.ts
import { Request, Response } from 'express'
import { EvidenceAdapter } from './EvidenceAdapter'

export class EvidenceResolver {
  constructor(private readonly store: EvidenceAdapter) {}

  /**
   * Read-only resolver.
   * Payload nunca exposto por padrão.
   * ?includePayload=true apenas para uso interno controlado.
   */
  resolve = (req: Request, res: Response) => {
    const { hash } = req.params
    const includePayload = req.query.includePayload === 'true'

    const evidence = this.store.getEvidence(hash)

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' })
    }

    const response: Record<string, unknown> = {
      hash: evidence.hash,
      createdAt: evidence.createdAt,
      source: evidence.source,
      metadata: evidence.metadata
    }

    if (includePayload) {
      response.payload = evidence.payload
    }

    return res.json(response)
  }
}
