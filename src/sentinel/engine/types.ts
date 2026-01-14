// src/engine/types.ts
export type Severity = 'low' | 'medium' | 'high' | 'critical'


export interface PolicyResult {
passed: boolean
message?: string
evidenceHash?: string
}


export interface PolicyRule {
execute: any
supports(event: string): unknown
id: string
severity: Severity
evaluate(ctx: ExecutionContext): PolicyResult
}


export interface ExecutionContext {
repo: {
id: string
name: string
branch: string
}
commit: {
sha: string
author: string
}
files: {
path: string
content: string
}[]
config: PolicyConfig
}


export interface PolicyConfig {
policies: {
id: string
enabled: boolean
}[]
}


export interface PolicyContext {
  event: string
  repo: {
    branch: string
    name?: string
    owner?: string
  }
}
