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
import { PolicyContext, FileInfo, PullRequestInfo, CommitInfo, RepoInfo } from '../engine/types'

interface GitHubPushPayload {
  ref: string
  before?: string
  after?: string
  head_commit?: {
    id: string
    message: string
    author?: { name: string; email?: string }
    timestamp?: string
  }
  commits?: Array<{
    id: string
    message: string
    added?: string[]
    modified?: string[]
    removed?: string[]
  }>
  repository?: {
    id?: number
    name: string
    full_name: string
    default_branch?: string
    owner?: { login: string }
    license?: { spdx_id: string } | null
  }
}

interface GitHubPullRequestPayload {
  action: string
  number: number
  pull_request: {
    number: number
    title: string
    state: string
    merged: boolean
    draft: boolean
    head: { ref: string }
    base: { ref: string }
    requested_reviewers?: Array<{ login: string }>
    user?: { login: string }
  }
  repository?: {
    id?: number
    name: string
    full_name: string
    default_branch?: string
    owner?: { login: string }
    license?: { spdx_id: string } | null
  }
  // Reviews são buscados separadamente via API, mas podem vir em eventos de review
  review?: {
    state: string
    user: { login: string }
  }
}

interface GitHubPullRequestReviewPayload {
  action: string
  review: {
    state: string
    user: { login: string }
  }
  pull_request: GitHubPullRequestPayload['pull_request']
  repository?: GitHubPullRequestPayload['repository']
}

export class ContextBuilder {
  static fromGitHub(event: string, payload: unknown): PolicyContext {
    switch (event) {
      case 'push':
        return this.fromGitHubPush(event, payload as GitHubPushPayload)
      case 'pull_request':
        return this.fromGitHubPullRequest(event, payload as GitHubPullRequestPayload)
      case 'pull_request_review':
        return this.fromGitHubPullRequestReview(event, payload as GitHubPullRequestReviewPayload)
      default:
        return this.baseContext(event, payload)
    }
  }

  private static fromGitHubPush(event: string, payload: GitHubPushPayload): PolicyContext {
    const branch = payload.ref?.replace('refs/heads/', '') ?? 'unknown'

    const files: FileInfo[] = []
    if (payload.commits) {
      for (const commit of payload.commits) {
        for (const path of commit.added ?? []) {
          files.push({ path, status: 'added' })
        }
        for (const path of commit.modified ?? []) {
          files.push({ path, status: 'modified' })
        }
        for (const path of commit.removed ?? []) {
          files.push({ path, status: 'removed' })
        }
      }
    }

    const commit: CommitInfo | undefined = payload.head_commit ? {
      sha: payload.head_commit.id,
      message: payload.head_commit.message,
      author: payload.head_commit.author?.name ?? 'unknown',
      timestamp: payload.head_commit.timestamp
    } : undefined

    const repo: RepoInfo = {
      branch,
      name: payload.repository?.name,
      owner: payload.repository?.owner?.login,
      defaultBranch: payload.repository?.default_branch,
      license: payload.repository?.license?.spdx_id ?? null,
      id: payload.repository?.id?.toString()
    }

    return {
      event,
      repo,
      commit,
      files,
      payload
    }
  }

  private static fromGitHubPullRequest(event: string, payload: GitHubPullRequestPayload): PolicyContext {
    const pr = payload.pull_request
    const repo: RepoInfo = {
      branch: pr.head.ref,
      name: payload.repository?.name,
      owner: payload.repository?.owner?.login,
      defaultBranch: payload.repository?.default_branch ?? pr.base.ref,
      license: payload.repository?.license?.spdx_id ?? null,
      id: payload.repository?.id?.toString()
    }

    const pullRequest: PullRequestInfo = {
      number: pr.number,
      title: pr.title,
      state: pr.state as 'open' | 'closed' | 'merged',
      merged: pr.merged,
      draft: pr.draft,
      reviewers: [],
      approvals: 0,
      requestedReviewers: pr.requested_reviewers?.map(r => r.login) ?? []
    }

    return {
      event,
      repo,
      pullRequest,
      payload
    }
  }

  private static fromGitHubPullRequestReview(event: string, payload: GitHubPullRequestReviewPayload): PolicyContext {
    const ctx = this.fromGitHubPullRequest('pull_request', payload as unknown as GitHubPullRequestPayload)

    // Adicionar informação do review
    if (ctx.pullRequest && payload.review) {
      ctx.pullRequest.reviewers.push(payload.review.user.login)
      if (payload.review.state === 'approved') {
        ctx.pullRequest.approvals++
      }
    }

    return {
      ...ctx,
      event
    }
  }

  private static baseContext(event: string, payload?: unknown): PolicyContext {
    return {
      event,
      repo: {
        branch: 'unknown'
      },
      payload
    }
  }
}
