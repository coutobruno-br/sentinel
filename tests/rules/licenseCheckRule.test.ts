// tests/rules/licenseCheckRule.test.ts
import { describe, it, expect } from 'vitest'
import { licenseCheckRule } from '../../src/sentinel/rules/licenseCheckRule'
import { PolicyContext } from '../../src/sentinel/engine/types'

describe('licenseCheckRule', () => {
  it('should pass when repository has valid license', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: {
        branch: 'main',
        license: 'MIT'
      }
    }

    const result = licenseCheckRule.execute(ctx)

    expect(result.passed).toBe(true)
    expect(result.details?.license).toBe('MIT')
  })

  it('should accept various OSI-approved licenses', () => {
    const licenses = ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC']

    for (const license of licenses) {
      const ctx: PolicyContext = {
        event: 'push',
        repo: { branch: 'main', license }
      }

      const result = licenseCheckRule.execute(ctx)
      expect(result.passed).toBe(true)
    }
  })

  it('should fail when repository has no license', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: {
        branch: 'main',
        license: null,
        hasLicenseFile: false
      }
    }

    const result = licenseCheckRule.execute(ctx)

    expect(result.passed).toBe(false)
    expect(result.message).toContain('does not have a license')
  })

  it('should pass when LICENSE file is present', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        { path: 'LICENSE', status: 'added' }
      ]
    }

    const result = licenseCheckRule.execute(ctx)

    expect(result.passed).toBe(true)
  })

  it('should accept different license file names', () => {
    const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING']

    for (const file of licenseFiles) {
      const ctx: PolicyContext = {
        event: 'push',
        repo: { branch: 'main' },
        files: [{ path: file, status: 'added' }]
      }

      const result = licenseCheckRule.execute(ctx)
      expect(result.passed).toBe(true)
    }
  })

  it('should warn when license file is removed', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        { path: 'LICENSE', status: 'removed' }
      ]
    }

    const result = licenseCheckRule.execute(ctx)

    expect(result.passed).toBe(false)
    expect(result.message).toContain('removed')
  })

  it('should warn about unrecognized licenses', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: {
        branch: 'main',
        license: 'PROPRIETARY-1.0'
      }
    }

    const result = licenseCheckRule.execute(ctx)

    expect(result.passed).toBe(false)
    expect(result.message).toContain('unrecognized')
  })

  it('should support both push and pull_request events', () => {
    const pushCtx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' }
    }

    const prCtx: PolicyContext = {
      event: 'pull_request',
      repo: { branch: 'main' }
    }

    expect(licenseCheckRule.supports(pushCtx)).toBe(true)
    expect(licenseCheckRule.supports(prCtx)).toBe(true)
  })
})
