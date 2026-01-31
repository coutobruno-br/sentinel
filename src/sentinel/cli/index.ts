#!/usr/bin/env node
// src/sentinel/cli/index.ts
/**
 * Sentinel CLI - Verificação local de políticas antes do commit
 *
 * Uso:
 *   npx sentinel-check          # Verifica staged + modified
 *   npx sentinel-check --staged # Apenas arquivos staged
 *   npx sentinel-check --all    # Todos os arquivos do repo
 */

import { createLocalContext, ScanOptions } from './localScanner'
import { secretsScanRule } from '../rules/secretsScanRule'
import { licenseCheckRule } from '../rules/licenseCheckRule'
import { testRequiredRule } from '../rules/testRequiredRule'
import type { PolicyRule, PolicyResult, PolicyContext } from '../engine/types'

// Cores ANSI para terminal
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m'
}

// Regras disponíveis para execução local
const LOCAL_RULES: PolicyRule[] = [
  secretsScanRule,
  licenseCheckRule,
  testRequiredRule
]

interface CLIOptions extends ScanOptions {
  help?: boolean
  verbose?: boolean
  json?: boolean
  rules?: string[]
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true
        break
      case '-s':
      case '--staged':
        options.staged = true
        break
      case '-a':
      case '--all':
        options.all = true
        break
      case '-v':
      case '--verbose':
        options.verbose = true
        break
      case '--json':
        options.json = true
        break
      case '-r':
      case '--rules':
        if (args[i + 1]) {
          options.rules = args[++i].split(',')
        }
        break
      case '-p':
      case '--path':
        if (args[i + 1]) {
          options.path = args[++i]
        }
        break
    }
  }

  return options
}

function showHelp(): void {
  console.log(`
${colors.bold}${colors.cyan}Sentinel CLI${colors.reset} - Policy-as-Code local checker

${colors.bold}USAGE${colors.reset}
  sentinel-check [options]

${colors.bold}OPTIONS${colors.reset}
  -h, --help      Show this help message
  -s, --staged    Check only staged files (git add)
  -a, --all       Check all tracked files in repository
  -v, --verbose   Show detailed output
  -p, --path      Path to repository (default: current directory)
  -r, --rules     Comma-separated list of rules to run
      --json      Output results as JSON

${colors.bold}AVAILABLE RULES${colors.reset}
  ${colors.magenta}secrets-scan${colors.reset}     Detect hardcoded secrets (API keys, tokens, passwords)
  ${colors.magenta}license-check${colors.reset}    Verify repository has a valid license file
  ${colors.magenta}test-required${colors.reset}    Check if code changes include tests

${colors.bold}EXAMPLES${colors.reset}
  sentinel-check                    # Check staged + modified files
  sentinel-check --staged           # Check only staged files (pre-commit)
  sentinel-check --all              # Full repository scan
  sentinel-check -r secrets-scan    # Run only secrets scan

${colors.bold}PRE-COMMIT HOOK${colors.reset}
  Add to .git/hooks/pre-commit:
  ${colors.dim}#!/bin/sh
  npx sentinel-check --staged || exit 1${colors.reset}
`)
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return colors.bgRed + colors.white
    case 'high': return colors.red
    case 'medium': return colors.yellow
    case 'low': return colors.blue
    default: return colors.white
  }
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'critical': return '!!!'
    case 'high': return '!!'
    case 'medium': return '!'
    case 'low': return 'i'
    default: return '*'
  }
}

function printResult(result: PolicyResult, verbose: boolean): void {
  const icon = result.passed
    ? `${colors.green}[PASS]${colors.reset}`
    : `${colors.red}[FAIL]${colors.reset}`

  const severityColor = getSeverityColor(result.severity)
  const severityBadge = `${severityColor}${result.severity.toUpperCase()}${colors.reset}`

  console.log(`${icon} ${colors.bold}${result.ruleId}${colors.reset} ${severityBadge}`)

  if (result.message) {
    console.log(`     ${result.message}`)
  }

  if (verbose && result.details) {
    console.log(`${colors.dim}     Details:${colors.reset}`)
    for (const [key, value] of Object.entries(result.details)) {
      if (Array.isArray(value)) {
        console.log(`${colors.dim}       ${key}:${colors.reset}`)
        value.slice(0, 5).forEach(v => {
          if (typeof v === 'object') {
            console.log(`${colors.dim}         - ${JSON.stringify(v)}${colors.reset}`)
          } else {
            console.log(`${colors.dim}         - ${v}${colors.reset}`)
          }
        })
        if (value.length > 5) {
          console.log(`${colors.dim}         ... and ${value.length - 5} more${colors.reset}`)
        }
      } else {
        console.log(`${colors.dim}       ${key}: ${JSON.stringify(value)}${colors.reset}`)
      }
    }
  }
}

function printSummary(results: PolicyResult[]): void {
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  console.log('')
  console.log(`${colors.bold}─────────────────────────────────────${colors.reset}`)

  if (failed === 0) {
    console.log(`${colors.green}${colors.bold}All checks passed!${colors.reset} (${passed}/${results.length})`)
  } else {
    console.log(`${colors.red}${colors.bold}${failed} check(s) failed${colors.reset}, ${passed} passed`)

    const critical = results.filter(r => !r.passed && r.severity === 'critical').length
    const high = results.filter(r => !r.passed && r.severity === 'high').length
    const medium = results.filter(r => !r.passed && r.severity === 'medium').length

    if (critical > 0) console.log(`  ${colors.bgRed}${colors.white} CRITICAL ${colors.reset} ${critical}`)
    if (high > 0) console.log(`  ${colors.red} HIGH ${colors.reset} ${high}`)
    if (medium > 0) console.log(`  ${colors.yellow} MEDIUM ${colors.reset} ${medium}`)
  }

  console.log(`${colors.bold}─────────────────────────────────────${colors.reset}`)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  if (options.help) {
    showHelp()
    process.exit(0)
  }

  const cwd = options.path || process.cwd()

  // Header
  if (!options.json) {
    console.log('')
    console.log(`${colors.cyan}${colors.bold}Sentinel${colors.reset} ${colors.dim}Policy-as-Code Checker${colors.reset}`)
    console.log(`${colors.dim}Scanning: ${cwd}${colors.reset}`)
    console.log('')
  }

  // Criar contexto local
  const ctx = createLocalContext(cwd, options)

  if (!options.json) {
    const fileCount = ctx.files?.length || 0
    if (fileCount === 0) {
      console.log(`${colors.yellow}No files to check.${colors.reset}`)
      console.log(`${colors.dim}Use --all to scan all tracked files.${colors.reset}`)
      process.exit(0)
    }
    console.log(`${colors.dim}Found ${fileCount} file(s) to check${colors.reset}`)
    console.log('')
  }

  // Selecionar regras
  let rulesToRun = LOCAL_RULES
  if (options.rules && options.rules.length > 0) {
    rulesToRun = LOCAL_RULES.filter(r => options.rules!.includes(r.id))
    if (rulesToRun.length === 0) {
      console.error(`${colors.red}No valid rules specified.${colors.reset}`)
      console.error(`Available: ${LOCAL_RULES.map(r => r.id).join(', ')}`)
      process.exit(1)
    }
  }

  // Executar regras
  const results: PolicyResult[] = []

  for (const rule of rulesToRun) {
    // Verificar se a regra suporta o contexto
    // Para local, forçamos suporte se temos arquivos
    const canRun = rule.id === 'license-check' || (ctx.files && ctx.files.length > 0)

    if (canRun) {
      try {
        const result = rule.execute(ctx)
        results.push(result)
      } catch (err) {
        results.push({
          passed: false,
          ruleId: rule.id,
          severity: rule.severity,
          message: `Error executing rule: ${err instanceof Error ? err.message : 'Unknown error'}`
        })
      }
    }
  }

  // Output
  if (options.json) {
    console.log(JSON.stringify({
      path: cwd,
      filesChecked: ctx.files?.length || 0,
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length
      }
    }, null, 2))
  } else {
    for (const result of results) {
      printResult(result, options.verbose || false)
    }
    printSummary(results)
  }

  // Exit code
  const hasFailures = results.some(r => !r.passed)
  const hasCritical = results.some(r => !r.passed && r.severity === 'critical')

  if (hasCritical) {
    process.exit(2) // Critical failure
  } else if (hasFailures) {
    process.exit(1) // Normal failure
  }

  process.exit(0)
}

main().catch(err => {
  console.error(`${colors.red}Error:${colors.reset}`, err.message)
  process.exit(1)
})
