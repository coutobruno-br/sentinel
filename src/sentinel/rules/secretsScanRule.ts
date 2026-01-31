// src/sentinel/rules/secretsScanRule.ts
import { PolicyRule, PolicyContext, PolicyResult } from '../engine/types'

/**
 * PB-12: Detecta secrets hardcoded no código
 *
 * Violação: Patterns de secrets encontrados em arquivos
 * Severidade: CRITICAL - Exposição de credenciais é crítica
 */

interface SecretPattern {
  name: string
  pattern: RegExp
  severity: 'high' | 'critical'
}

const SECRET_PATTERNS: SecretPattern[] = [
  // AWS
  {
    name: 'AWS Access Key ID',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical'
  },
  {
    name: 'AWS Secret Access Key',
    pattern: /[0-9a-zA-Z/+]{40}/g,
    severity: 'critical'
  },

  // API Keys genéricas
  {
    name: 'Generic API Key',
    pattern: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi,
    severity: 'high'
  },
  {
    name: 'Generic Secret',
    pattern: /secret[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi,
    severity: 'critical'
  },

  // Tokens
  {
    name: 'GitHub Token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
    severity: 'critical'
  },
  {
    name: 'GitHub Personal Access Token (Classic)',
    pattern: /ghp_[A-Za-z0-9]{36}/g,
    severity: 'critical'
  },
  {
    name: 'Slack Token',
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g,
    severity: 'critical'
  },

  // Private Keys
  {
    name: 'RSA Private Key',
    pattern: /-----BEGIN RSA PRIVATE KEY-----/g,
    severity: 'critical'
  },
  {
    name: 'SSH Private Key',
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g,
    severity: 'critical'
  },
  {
    name: 'PGP Private Key',
    pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
    severity: 'critical'
  },

  // Database
  {
    name: 'Database Connection String',
    pattern: /(mysql|postgres|mongodb|redis):\/\/[^:]+:[^@]+@[^\s'"]+/gi,
    severity: 'critical'
  },

  // JWT
  {
    name: 'JWT Token',
    pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/]*/g,
    severity: 'high'
  },

  // Passwords in config
  {
    name: 'Password Assignment',
    pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    severity: 'high'
  },

  // Bearer tokens
  {
    name: 'Bearer Token',
    pattern: /bearer\s+[a-zA-Z0-9_\-\.]+/gi,
    severity: 'high'
  },

  // Stripe
  {
    name: 'Stripe API Key',
    pattern: /sk_live_[0-9a-zA-Z]{24,}/g,
    severity: 'critical'
  },
  {
    name: 'Stripe Restricted Key',
    pattern: /rk_live_[0-9a-zA-Z]{24,}/g,
    severity: 'critical'
  },

  // Google
  {
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z\-_]{35}/g,
    severity: 'high'
  },

  // Twilio
  {
    name: 'Twilio API Key',
    pattern: /SK[0-9a-fA-F]{32}/g,
    severity: 'high'
  },

  // SendGrid
  {
    name: 'SendGrid API Key',
    pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
    severity: 'high'
  },

  // npm
  {
    name: 'npm Token',
    pattern: /npm_[A-Za-z0-9]{36}/g,
    severity: 'critical'
  }
]

// Arquivos a ignorar (binários, gerados, etc)
const IGNORED_EXTENSIONS = [
  '.lock', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.tar',
  '.gz', '.min.js', '.min.css', '.map', '.snap'
]

const IGNORED_PATHS = [
  'node_modules/', 'vendor/', 'dist/', 'build/', '.git/',
  'coverage/', '__pycache__/', '.next/', '.nuxt/'
]

interface SecretFinding {
  file: string
  pattern: string
  severity: 'high' | 'critical'
  match: string
}

export const secretsScanRule: PolicyRule = {
  id: 'secrets-scan',
  severity: 'critical',

  supports(ctx: PolicyContext): boolean {
    // Suporta push com arquivos
    return ctx.event === 'push' && Array.isArray(ctx.files) && ctx.files.length > 0
  },

  execute(ctx: PolicyContext): PolicyResult {
    const files = ctx.files ?? []
    const findings: SecretFinding[] = []

    for (const file of files) {
      // Pular arquivos removidos
      if (file.status === 'removed') continue

      // Pular arquivos sem conteúdo
      if (!file.content) continue

      // Pular arquivos ignorados
      if (shouldIgnoreFile(file.path)) continue

      // Escanear conteúdo
      for (const secretPattern of SECRET_PATTERNS) {
        const matches = file.content.match(secretPattern.pattern)
        if (matches) {
          for (const match of matches) {
            // Mascarar o secret encontrado
            const masked = maskSecret(match)
            findings.push({
              file: file.path,
              pattern: secretPattern.name,
              severity: secretPattern.severity,
              match: masked
            })
          }
        }
      }
    }

    if (findings.length > 0) {
      const criticalCount = findings.filter(f => f.severity === 'critical').length
      const highCount = findings.filter(f => f.severity === 'high').length

      return {
        passed: false,
        ruleId: this.id,
        severity: criticalCount > 0 ? 'critical' : 'high',
        message: `Found ${findings.length} potential secrets (${criticalCount} critical, ${highCount} high severity).`,
        details: {
          totalFindings: findings.length,
          criticalCount,
          highCount,
          findings: findings.slice(0, 10), // Limitar para não expor demais
          truncated: findings.length > 10
        }
      }
    }

    return {
      passed: true,
      ruleId: this.id,
      severity: this.severity,
      message: 'No secrets detected in changed files.',
      details: {
        filesScanned: files.filter(f => f.status !== 'removed' && f.content).length
      }
    }
  }
}

function shouldIgnoreFile(path: string): boolean {
  const lowerPath = path.toLowerCase()

  // Verificar extensões ignoradas
  for (const ext of IGNORED_EXTENSIONS) {
    if (lowerPath.endsWith(ext)) return true
  }

  // Verificar paths ignorados
  for (const ignoredPath of IGNORED_PATHS) {
    if (lowerPath.includes(ignoredPath)) return true
  }

  // Ignorar arquivos de exemplo/template
  if (lowerPath.includes('.example') || lowerPath.includes('.template')) {
    return true
  }

  return false
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return '*'.repeat(secret.length)
  }
  const visibleChars = 4
  return secret.substring(0, visibleChars) + '*'.repeat(secret.length - visibleChars * 2) + secret.substring(secret.length - visibleChars)
}
