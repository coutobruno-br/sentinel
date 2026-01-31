// tests/rules/secretsScanRule.test.ts
import { describe, it, expect } from 'vitest'
import { secretsScanRule } from '../../src/sentinel/rules/secretsScanRule'
import { PolicyContext } from '../../src/sentinel/engine/types'

describe('secretsScanRule', () => {
  it('should detect AWS Access Key ID', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        {
          path: 'config.js',
          content: 'const AWS_KEY = "AKIAIOSFODNN7EXAMPLE"',
          status: 'added'
        }
      ]
    }

    const result = secretsScanRule.execute(ctx)

    expect(result.passed).toBe(false)
    expect(result.severity).toBe('critical')
    expect(result.details?.findings).toBeDefined()
  })

  it('should detect GitHub tokens', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        {
          path: 'deploy.sh',
          content: 'GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          status: 'added'
        }
      ]
    }

    const result = secretsScanRule.execute(ctx)

    expect(result.passed).toBe(false)
  })

  it('should detect private keys', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        {
          path: 'key.pem',
          content: '-----BEGIN RSA PRIVATE KEY-----\nMIIE...',
          status: 'added'
        }
      ]
    }

    const result = secretsScanRule.execute(ctx)

    expect(result.passed).toBe(false)
    expect(result.severity).toBe('critical')
  })

  it('should detect database connection strings', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        {
          path: 'db.js',
          content: 'const uri = "mongodb://user:password123@localhost:27017/db"',
          status: 'added'
        }
      ]
    }

    const result = secretsScanRule.execute(ctx)

    expect(result.passed).toBe(false)
  })

  it('should pass when no secrets found', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        {
          path: 'index.js',
          content: 'console.log("Hello World")',
          status: 'added'
        }
      ]
    }

    const result = secretsScanRule.execute(ctx)

    expect(result.passed).toBe(true)
  })

  it('should ignore files in node_modules', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        {
          path: 'node_modules/package/config.js',
          content: 'const AWS_KEY = "AKIAIOSFODNN7EXAMPLE"',
          status: 'added'
        }
      ]
    }

    const result = secretsScanRule.execute(ctx)

    expect(result.passed).toBe(true)
  })

  it('should ignore .example files', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        {
          path: '.env.example',
          content: 'AWS_KEY=AKIAIOSFODNN7EXAMPLE',
          status: 'added'
        }
      ]
    }

    const result = secretsScanRule.execute(ctx)

    expect(result.passed).toBe(true)
  })

  it('should ignore removed files', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        {
          path: 'secrets.js',
          content: 'const AWS_KEY = "AKIAIOSFODNN7EXAMPLE"',
          status: 'removed'
        }
      ]
    }

    const result = secretsScanRule.execute(ctx)

    expect(result.passed).toBe(true)
  })

  it('should mask detected secrets in output', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        {
          path: 'config.js',
          content: 'const key = "AKIAIOSFODNN7EXAMPLE"',
          status: 'added'
        }
      ]
    }

    const result = secretsScanRule.execute(ctx)
    const findings = result.details?.findings as Array<{ match: string }>

    // O match deve estar mascarado
    expect(findings?.[0]?.match).toContain('*')
    expect(findings?.[0]?.match).not.toBe('AKIAIOSFODNN7EXAMPLE')
  })
})
