// tests/rules/testRequiredRule.test.ts
import { describe, it, expect } from 'vitest'
import { testRequiredRule } from '../../src/sentinel/rules/testRequiredRule'
import { PolicyContext } from '../../src/sentinel/engine/types'

describe('testRequiredRule', () => {
  it('should pass when test files are included with source files', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        { path: 'src/utils.ts', status: 'modified' },
        { path: 'src/utils.test.ts', status: 'modified' }
      ]
    }

    const result = testRequiredRule.execute(ctx)

    expect(result.passed).toBe(true)
  })

  it('should fail when source files have no tests', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        { path: 'src/newFeature.ts', status: 'added' },
        { path: 'src/anotherFeature.ts', status: 'added' }
      ]
    }

    const result = testRequiredRule.execute(ctx)

    expect(result.passed).toBe(false)
    expect(result.severity).toBe('medium')
  })

  it('should recognize various test file patterns', () => {
    const testFiles = [
      'component.test.ts',
      'component.spec.ts',
      '__tests__/component.ts',
      'tests/component.ts',
      'test_component.py',
      'component_test.go'
    ]

    for (const testFile of testFiles) {
      const ctx: PolicyContext = {
        event: 'push',
        repo: { branch: 'main' },
        files: [
          { path: 'src/component.ts', status: 'modified' },
          { path: testFile, status: 'modified' }
        ]
      }

      const result = testRequiredRule.execute(ctx)
      expect(result.passed).toBe(true)
    }
  })

  it('should ignore config files', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        { path: 'tsconfig.json', status: 'modified' },
        { path: 'package.json', status: 'modified' },
        { path: '.eslintrc.js', status: 'modified' }
      ]
    }

    const result = testRequiredRule.execute(ctx)

    expect(result.passed).toBe(true)
  })

  it('should ignore type definition files', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        { path: 'src/types.ts', status: 'modified' },
        { path: 'src/interfaces.d.ts', status: 'added' }
      ]
    }

    const result = testRequiredRule.execute(ctx)

    expect(result.passed).toBe(true)
  })

  it('should ignore files in node_modules', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        { path: 'node_modules/package/index.js', status: 'modified' }
      ]
    }

    const result = testRequiredRule.execute(ctx)

    expect(result.passed).toBe(true)
  })

  it('should pass for only test files', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        { path: 'tests/utils.test.ts', status: 'added' },
        { path: 'tests/helpers.spec.ts', status: 'added' }
      ]
    }

    const result = testRequiredRule.execute(ctx)

    expect(result.passed).toBe(true)
  })

  it('should accept good test-to-source ratio', () => {
    const ctx: PolicyContext = {
      event: 'push',
      repo: { branch: 'main' },
      files: [
        { path: 'src/feature1.ts', status: 'added' },
        { path: 'src/feature2.ts', status: 'added' },
        { path: 'tests/feature1.test.ts', status: 'added' }
      ]
    }

    const result = testRequiredRule.execute(ctx)

    // 50% ratio should be acceptable
    expect(result.passed).toBe(true)
  })
})
