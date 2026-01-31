// tests/rules/prReviewRequiredRule.test.ts
import { describe, it, expect } from 'vitest'
import { prReviewRequiredRule } from '../../src/sentinel/rules/prReviewRequiredRule'
import { PolicyContext } from '../../src/sentinel/engine/types'

describe('prReviewRequiredRule', () => {
  it('should fail when PR is merged without approvals', () => {
    const ctx: PolicyContext = {
      event: 'pull_request',
      repo: {
        branch: 'feature/test',
        name: 'test-repo',
        owner: 'test-owner'
      },
      pullRequest: {
        number: 123,
        title: 'Test PR',
        state: 'closed',
        merged: true,
        draft: false,
        reviewers: [],
        approvals: 0,
        requestedReviewers: []
      },
      payload: { action: 'closed' }
    }

    const result = prReviewRequiredRule.execute(ctx)

    expect(result.passed).toBe(false)
    expect(result.severity).toBe('high')
    expect(result.message).toContain('without required review')
  })

  it('should pass when PR has at least one approval', () => {
    const ctx: PolicyContext = {
      event: 'pull_request',
      repo: {
        branch: 'feature/test',
        name: 'test-repo',
        owner: 'test-owner'
      },
      pullRequest: {
        number: 123,
        title: 'Test PR',
        state: 'closed',
        merged: true,
        draft: false,
        reviewers: ['reviewer1'],
        approvals: 1,
        requestedReviewers: []
      },
      payload: { action: 'closed' }
    }

    const result = prReviewRequiredRule.execute(ctx)

    expect(result.passed).toBe(true)
  })

  it('should only support closed/merged PR events', () => {
    const mergedCtx: PolicyContext = {
      event: 'pull_request',
      repo: { branch: 'main' },
      pullRequest: {
        number: 1,
        title: 'Test',
        state: 'closed',
        merged: true,
        draft: false,
        reviewers: [],
        approvals: 0,
        requestedReviewers: []
      },
      payload: { action: 'closed' }
    }

    const openCtx: PolicyContext = {
      event: 'pull_request',
      repo: { branch: 'main' },
      pullRequest: {
        number: 1,
        title: 'Test',
        state: 'open',
        merged: false,
        draft: false,
        reviewers: [],
        approvals: 0,
        requestedReviewers: []
      },
      payload: { action: 'opened' }
    }

    expect(prReviewRequiredRule.supports(mergedCtx)).toBe(true)
    expect(prReviewRequiredRule.supports(openCtx)).toBe(false)
  })

  it('should warn about draft PRs being merged', () => {
    const ctx: PolicyContext = {
      event: 'pull_request',
      repo: { branch: 'main' },
      pullRequest: {
        number: 123,
        title: 'Draft PR',
        state: 'closed',
        merged: true,
        draft: true,
        reviewers: ['reviewer'],
        approvals: 1,
        requestedReviewers: []
      },
      payload: { action: 'closed' }
    }

    const result = prReviewRequiredRule.execute(ctx)

    expect(result.passed).toBe(false)
    expect(result.message).toContain('draft')
  })
})
