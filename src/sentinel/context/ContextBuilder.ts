// src/sentinel/context/ContextBuilder.ts
/*
O que esse arquivo resolve estruturalmente:
– elimina acoplamento direto das rules ao payload do GitHub
– cria um contrato único (PolicyContext) para o engine
– prepara o Sentinel para múltiplos providers
– reduz refatoração futura a zero

Estado do fluxo agora:
Webhook → ContextBuilder → PolicyContext → Engine → Rules
*/
import { PolicyContext } from '../engine/types'

interface GitHubPushPayload {
  ref: string
  repository?: {
    name: string
    full_name: string
    owner?: { login: string }
  }
}

export class ContextBuilder {
  static fromGitHub(event: string, payload: any): PolicyContext {
    switch (event) {
      case 'push':
        return this.fromGitHubPush(event, payload as GitHubPushPayload)
      default:
        return this.baseContext(event)
    }
     
  }
 


  private static fromGitHubPush(event: string, payload: GitHubPushPayload): PolicyContext {
    const branch = payload.ref?.replace('refs/heads/', '') ?? 'unknown'

    return {
      event,
      repo: {
        branch,
        name: payload.repository?.name,
        owner: payload.repository?.owner?.login
      }
    }
  }

  private static baseContext(event: string): PolicyContext {
    return {
      event,
      repo: {
        branch: 'unknown'
      }
    }
  }
  

}
