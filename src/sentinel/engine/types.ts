// src/engine/types.ts
export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface PolicyResult {
  passed: boolean
  ruleId: string
  severity: Severity
  message?: string
  evidenceHash?: string
  details?: Record<string, unknown>
}

export interface PolicyRule {
  id: string
  severity: Severity
  supports(ctx: PolicyContext): boolean
  execute(ctx: PolicyContext): PolicyResult
}

export interface FileInfo {
  path: string
  content?: string
  status?: 'added' | 'modified' | 'removed'
}

export interface PullRequestInfo {
  number: number
  title: string
  state: 'open' | 'closed' | 'merged'
  merged: boolean
  reviewers: string[]
  approvals: number
  requestedReviewers: string[]
  draft: boolean
}

export interface CommitInfo {
  sha: string
  message: string
  author: string
  timestamp?: string
}

export interface RepoInfo {
  id?: string
  name?: string
  owner?: string
  branch: string
  defaultBranch?: string
  license?: string | null
  hasLicenseFile?: boolean
}

export interface PolicyContext {
  event: string
  repo: RepoInfo
  commit?: CommitInfo
  pullRequest?: PullRequestInfo
  files?: FileInfo[]
  payload?: unknown
}

export interface ExecutionContext extends PolicyContext {
  canonicalPayload: unknown
  metadata?: Record<string, unknown>
  source?: string
}

export interface PolicyConfig {
  policies: {
    id: string
    enabled: boolean
  }[]
}
