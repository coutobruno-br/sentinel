// src/sentinel/rules/noDirectMainRule.ts
import { PolicyRule, PolicyContext, PolicyResult } from '../engine/types'

/**
 * PB-11: Detecta push direto em branches protegidas (main/master)
 *
 * Violação: Push direto em main/master sem passar por PR
 * Severidade: HIGH - Viola práticas de code review e CI/CD
 */
export const noDirectMainRule: PolicyRule = {
  id: 'no-direct-main',
  severity: 'high',

  supports(ctx: PolicyContext): boolean {
    return ctx.event === 'push'
  },

  execute(ctx: PolicyContext): PolicyResult {
    const branch = ctx.repo.branch
    const defaultBranch = ctx.repo.defaultBranch ?? 'main'
    const protectedBranches = ['main', 'master', defaultBranch]

    const isProtected = protectedBranches.includes(branch)

    if (isProtected) {
      return {
        passed: false,
        ruleId: this.id,
        severity: this.severity,
        message: `Direct push to protected branch '${branch}' detected. Use pull requests instead.`,
        details: {
          branch,
          defaultBranch,
          commitSha: ctx.commit?.sha,
          author: ctx.commit?.author
        }
      }
    }

    return {
      passed: true,
      ruleId: this.id,
      severity: this.severity,
      message: `Push to branch '${branch}' is allowed.`
    }
  }
}