// src/sentinel/rules/testRequiredRule.ts
import { PolicyRule, PolicyContext, PolicyResult } from '../engine/types'
import type { FileInfo } from '../engine/types'

/**
 * PB-13: Detecta falta de testes em código novo/modificado
 *
 * Violação: Código de implementação sem testes correspondentes
 * Severidade: MEDIUM - Testes são importantes mas não bloqueantes
 */

// Mapeamento de arquivos de implementação para padrões de teste
interface TestPattern {
  // Extensões de arquivos de código
  sourceExtensions: string[]
  // Padrões de arquivos de teste
  testPatterns: RegExp[]
  // Diretórios de teste comuns
  testDirs: string[]
}

const TEST_PATTERNS: Record<string, TestPattern> = {
  javascript: {
    sourceExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
    testPatterns: [
      /\.test\.[jt]sx?$/,
      /\.spec\.[jt]sx?$/,
      /_test\.[jt]sx?$/,
      /__tests__\/.+\.[jt]sx?$/
    ],
    testDirs: ['__tests__', 'tests', 'test', 'spec']
  },
  python: {
    sourceExtensions: ['.py'],
    testPatterns: [
      /test_.+\.py$/,
      /_test\.py$/,
      /tests\/.+\.py$/
    ],
    testDirs: ['tests', 'test']
  },
  go: {
    sourceExtensions: ['.go'],
    testPatterns: [
      /_test\.go$/
    ],
    testDirs: []
  },
  rust: {
    sourceExtensions: ['.rs'],
    testPatterns: [
      /tests\/.+\.rs$/,
      /_test\.rs$/
    ],
    testDirs: ['tests']
  },
  java: {
    sourceExtensions: ['.java', '.kt'],
    testPatterns: [
      /Test\.java$/,
      /Tests\.java$/,
      /Test\.kt$/,
      /src\/test\/.+\.java$/
    ],
    testDirs: ['src/test', 'test']
  },
  ruby: {
    sourceExtensions: ['.rb'],
    testPatterns: [
      /_test\.rb$/,
      /_spec\.rb$/,
      /spec\/.+_spec\.rb$/,
      /test\/.+_test\.rb$/
    ],
    testDirs: ['spec', 'test']
  },
  php: {
    sourceExtensions: ['.php'],
    testPatterns: [
      /Test\.php$/,
      /tests\/.+\.php$/
    ],
    testDirs: ['tests', 'test']
  },
  csharp: {
    sourceExtensions: ['.cs'],
    testPatterns: [
      /Tests?\.cs$/,
      /\.Tests?\/.+\.cs$/
    ],
    testDirs: ['Tests', 'Test']
  }
}

// Diretórios a ignorar (não precisam de testes)
const IGNORED_DIRS = [
  'node_modules', 'vendor', 'dist', 'build', '.git',
  'coverage', '__pycache__', '.next', '.nuxt', 'public',
  'static', 'assets', 'docs', 'documentation', 'examples',
  'scripts', 'config', 'configs', '.github', '.vscode'
]

// Arquivos que não precisam de testes
const IGNORED_FILES = [
  /^index\.[jt]sx?$/, // index files (re-exports)
  /^types?\.[jt]sx?$/, // type definitions
  /\.d\.ts$/, // TypeScript declarations
  /^constants?\.[jt]sx?$/, // constants
  /^config\.[jt]sx?$/, // config files
  /\.config\.[jt]sx?$/, // config files
  /^setupTests?\.[jt]sx?$/, // test setup
  /^jest\./, // jest config
  /^vitest\./, // vitest config
  /^\.eslint/, // eslint config
  /^\.prettier/, // prettier config
  /^package\.json$/, // package files
  /^tsconfig\.json$/, // tsconfig
  /^README/i, // readme files
  /^LICENSE/i, // license files
  /^CHANGELOG/i, // changelog
  /^Makefile$/, // makefiles
  /^Dockerfile/, // docker files
  /^docker-compose/, // docker compose
  /\.ya?ml$/, // yaml config
  /\.json$/, // json config (most of them)
  /\.md$/, // markdown
  /\.txt$/, // text files
  /\.env/, // env files
]

export const testRequiredRule: PolicyRule = {
  id: 'test-required',
  severity: 'medium',

  supports(ctx: PolicyContext): boolean {
    return ctx.event === 'push' && Array.isArray(ctx.files) && ctx.files.length > 0
  },

  execute(ctx: PolicyContext): PolicyResult {
    const files = ctx.files ?? []

    // Separar arquivos de teste e de implementação
    const sourceFiles: FileInfo[] = []
    const testFiles: FileInfo[] = []

    for (const file of files) {
      if (file.status === 'removed') continue

      const path = file.path.toLowerCase()

      // Ignorar diretórios especiais
      if (isInIgnoredDir(path)) continue

      // Verificar se é arquivo de teste
      if (isTestFile(path)) {
        testFiles.push(file)
        continue
      }

      // Verificar se é arquivo de código que precisa de teste
      if (isSourceFile(path) && !isIgnoredFile(path)) {
        sourceFiles.push(file)
      }
    }

    // Se não há arquivos de código, passou
    if (sourceFiles.length === 0) {
      return {
        passed: true,
        ruleId: this.id,
        severity: this.severity,
        message: 'No source files requiring tests were modified.',
        details: {
          testFilesModified: testFiles.length
        }
      }
    }

    // Se há arquivos de teste junto, considera ok (heurística simples)
    // Uma análise mais precisa exigiria mapear arquivo->teste
    if (testFiles.length > 0) {
      const ratio = testFiles.length / sourceFiles.length
      if (ratio >= 0.5) { // Pelo menos 50% de proporção
        return {
          passed: true,
          ruleId: this.id,
          severity: this.severity,
          message: `Changes include tests (${testFiles.length} test files for ${sourceFiles.length} source files).`,
          details: {
            sourceFiles: sourceFiles.map(f => f.path),
            testFiles: testFiles.map(f => f.path),
            ratio: ratio.toFixed(2)
          }
        }
      }
    }

    // Não há testes suficientes
    const missingTestsFor = sourceFiles
      .filter(f => !hasCorrespondingTest(f.path, testFiles))
      .map(f => f.path)

    if (missingTestsFor.length > 0) {
      return {
        passed: false,
        ruleId: this.id,
        severity: this.severity,
        message: `${missingTestsFor.length} source file(s) modified without corresponding tests.`,
        details: {
          sourceFilesWithoutTests: missingTestsFor.slice(0, 10),
          testFilesIncluded: testFiles.map(f => f.path),
          truncated: missingTestsFor.length > 10
        }
      }
    }

    return {
      passed: true,
      ruleId: this.id,
      severity: this.severity,
      message: 'All modified source files have corresponding tests.'
    }
  }
}

function isInIgnoredDir(path: string): boolean {
  const parts = path.split('/')
  return parts.some(part => IGNORED_DIRS.includes(part.toLowerCase()))
}

function isTestFile(path: string): boolean {
  for (const lang of Object.values(TEST_PATTERNS)) {
    for (const pattern of lang.testPatterns) {
      if (pattern.test(path)) return true
    }
    for (const dir of lang.testDirs) {
      if (path.includes(`/${dir}/`) || path.startsWith(`${dir}/`)) {
        // Verificar se tem extensão de código
        if (lang.sourceExtensions.some(ext => path.endsWith(ext))) {
          return true
        }
      }
    }
  }
  return false
}

function isSourceFile(path: string): boolean {
  for (const lang of Object.values(TEST_PATTERNS)) {
    if (lang.sourceExtensions.some(ext => path.endsWith(ext))) {
      return true
    }
  }
  return false
}

function isIgnoredFile(path: string): boolean {
  const filename = path.split('/').pop() ?? path
  return IGNORED_FILES.some(pattern => pattern.test(filename))
}

function hasCorrespondingTest(sourcePath: string, testFiles: FileInfo[]): boolean {
  // Extrair nome base do arquivo
  const parts = sourcePath.split('/')
  const filename = parts.pop() ?? ''
  const basename = filename.replace(/\.[^.]+$/, '') // Remove extensão

  // Verificar se algum arquivo de teste corresponde
  for (const testFile of testFiles) {
    const testFilename = testFile.path.split('/').pop() ?? ''

    // Padrões comuns: Component.test.ts, Component.spec.ts, test_component.py
    if (
      testFilename.includes(basename) ||
      testFilename.toLowerCase().includes(basename.toLowerCase())
    ) {
      return true
    }
  }

  return false
}
