// tests/rules/noDirectMainRule.test.ts
import { describe, it, expect } from 'vitest'
import { noDirectMainRule } from '../../src/sentinel/rules/noDirectMainRule'
import { PolicyContext } from '../../src/sentinel/engine/types'

describe('noDirectMainRule', () => {
  it('should detect direct push to main branch', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: {
        branch: 'main',
        name: 'test-repo',
        owner: 'test-owner'
      }
    }

    const result = noDirectMainRule.execute(ctx)

    expect(result.passed).toBe(false)
    expect(result.severity).toBe('high')
    expect(result.message).toContain('main')
  })

  it('should detect direct push to master branch', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: {
        branch: 'master',
        name: 'test-repo',
        owner: 'test-owner'
      }
    }

    const result = noDirectMainRule.execute(ctx)

    expect(result.passed).toBe(false)
    expect(result.severity).toBe('high')
  })

  it('should allow push to feature branches', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: {
        branch: 'feature/new-feature',
        name: 'test-repo',
        owner: 'test-owner'
      }
    }

    const result = noDirectMainRule.execute(ctx)

    expect(result.passed).toBe(true)
  })

  it('should allow push to develop branch', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: {
        branch: 'develop',
        name: 'test-repo',
        owner: 'test-owner'
      }
    }

    const result = noDirectMainRule.execute(ctx)

    expect(result.passed).toBe(true)
  })

  it('should support only push events', () => {
    const pushCtx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' }
    }

    const prCtx: PolicyContext = {
      event: 'pull_request',
      repo: { branch: 'main' }
    }

    expect(noDirectMainRule.supports(pushCtx)).toBe(true)
    expect(noDirectMainRule.supports(prCtx)).toBe(false)
  })
})
