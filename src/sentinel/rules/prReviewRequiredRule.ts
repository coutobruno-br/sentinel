// src/sentinel/rules/prReviewRequiredRule.ts
import { PolicyRule, PolicyContext, PolicyResult } from '../engine/types'

/**
 * PB-10: Detecta PRs merged sem review aprovado
 *
 * Violação: PR foi merged sem pelo menos 1 approval
 * Severidade: HIGH - Code review é essencial para qualidade
 */
export const prReviewRequiredRule: PolicyRule = {
  id: 'pr-review-required',
  severity: 'high',

  supports(ctx: PolicyContext): boolean {
    // Suporta eventos de PR e review
    if (ctx.event === 'pull_request') {
      // Verifica apenas quando PR é closed/merged
      const payload = ctx.payload as { action?: string }
      return payload?.action === 'closed' && ctx.pullRequest?.merged === true
    }
    return false
  },

  execute(ctx: PolicyContext): PolicyResult {
    const pr = ctx.pullRequest

    if (!pr) {
      return {
        passed: true,
        ruleId: this.id,
        severity: this.severity,
        message: 'No pull request context available.'
      }
    }

    // PR foi merged
    if (pr.merged) {
      // Verificar se teve aprovações
      if (pr.approvals < 1) {
        return {
          passed: false,
          ruleId: this.id,
          severity: this.severity,
          message: `PR #${pr.number} was merged without required review approval.`,
          details: {
            prNumber: pr.number,
            prTitle: pr.title,
            approvals: pr.approvals,
            reviewers: pr.reviewers,
            requiredApprovals: 1
          }
        }
      }

      // Verificar se era draft (não deveria ser merged como draft)
      if (pr.draft) {
        return {
          passed: false,
          ruleId: this.id,
          severity: 'medium',
          message: `PR #${pr.number} was merged while still in draft state.`,
          details: {
            prNumber: pr.number,
            prTitle: pr.title,
            draft: pr.draft
          }
        }
      }
    }

    return {
      passed: true,
      ruleId: this.id,
      severity: this.severity,
      message: `PR #${pr.number} has required approvals (${pr.approvals}).`,
      details: {
        prNumber: pr.number,
        approvals: pr.approvals,
        reviewers: pr.reviewers
      }
    }
  }
}
