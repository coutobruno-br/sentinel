// src/sentinel/rules/licenseCheckRule.ts
import { PolicyRule, PolicyContext, PolicyResult } from '../engine/types'

/**
 * PB-14: Verifica presença e validade de licença no repositório
 *
 * Violação: Repositório sem licença ou com licença inválida
 * Severidade: LOW - Licença é importante mas não crítica para operação
 */

// Licenças OSI-approved comuns
const VALID_LICENSES = [
  // Permissivas
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'Unlicense',
  '0BSD',
  'CC0-1.0',

  // Copyleft
  'GPL-2.0',
  'GPL-2.0-only',
  'GPL-2.0-or-later',
  'GPL-3.0',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'LGPL-2.1',
  'LGPL-2.1-only',
  'LGPL-2.1-or-later',
  'LGPL-3.0',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'AGPL-3.0',
  'AGPL-3.0-only',
  'AGPL-3.0-or-later',
  'MPL-2.0',
  'EPL-1.0',
  'EPL-2.0',

  // Creative Commons (para docs/assets)
  'CC-BY-4.0',
  'CC-BY-SA-4.0',

  // Outras
  'Artistic-2.0',
  'BSL-1.0',
  'Zlib',
  'WTFPL'
]

// Arquivos de licença comuns
const LICENSE_FILES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'COPYING',
  'COPYING.md',
  'COPYING.txt'
]

export const licenseCheckRule: PolicyRule = {
  id: 'license-check',
  severity: 'low',

  supports(ctx: PolicyContext): boolean {
    // Suporta push e pull_request
    return ctx.event === 'push' || ctx.event === 'pull_request'
  },

  execute(ctx: PolicyContext): PolicyResult {
    const repo = ctx.repo
    const files = ctx.files ?? []

    // 1. Verificar licença via API do GitHub (se disponível)
    if (repo.license) {
      const isValid = isValidLicense(repo.license)

      if (isValid) {
        return {
          passed: true,
          ruleId: this.id,
          severity: this.severity,
          message: `Repository has valid license: ${repo.license}`,
          details: {
            license: repo.license,
            source: 'github_api'
          }
        }
      } else {
        return {
          passed: false,
          ruleId: this.id,
          severity: this.severity,
          message: `Repository has unrecognized license: ${repo.license}. Consider using an OSI-approved license.`,
          details: {
            license: repo.license,
            validLicenses: VALID_LICENSES.slice(0, 10),
            source: 'github_api'
          }
        }
      }
    }

    // 2. Verificar se há arquivo de licença nos arquivos modificados/adicionados
    const licenseFile = files.find(f =>
      LICENSE_FILES.some(lf =>
        f.path.toUpperCase() === lf.toUpperCase() ||
        f.path.toUpperCase().endsWith('/' + lf.toUpperCase())
      )
    )

    if (licenseFile) {
      if (licenseFile.status === 'removed') {
        return {
          passed: false,
          ruleId: this.id,
          severity: 'medium', // Remover licença é mais grave
          message: `License file '${licenseFile.path}' was removed. Repository may become unlicensed.`,
          details: {
            removedFile: licenseFile.path
          }
        }
      }

      // Arquivo de licença existe/foi adicionado
      return {
        passed: true,
        ruleId: this.id,
        severity: this.severity,
        message: `License file present: ${licenseFile.path}`,
        details: {
          licenseFile: licenseFile.path,
          status: licenseFile.status
        }
      }
    }

    // 3. Verificar flag hasLicenseFile (se disponível via contexto estendido)
    if (repo.hasLicenseFile === true) {
      return {
        passed: true,
        ruleId: this.id,
        severity: this.severity,
        message: 'Repository has a license file.',
        details: {
          source: 'repo_metadata'
        }
      }
    }

    // 4. Não conseguiu determinar licença - warning
    if (repo.hasLicenseFile === false || repo.license === null) {
      return {
        passed: false,
        ruleId: this.id,
        severity: this.severity,
        message: 'Repository does not have a license. Consider adding a LICENSE file with an OSI-approved license.',
        details: {
          suggestion: 'Add a LICENSE file with MIT, Apache-2.0, or another OSI-approved license.',
          helpUrl: 'https://choosealicense.com/',
          commonLicenses: ['MIT', 'Apache-2.0', 'GPL-3.0']
        }
      }
    }

    // 5. Não temos informação suficiente - passa com warning
    return {
      passed: true,
      ruleId: this.id,
      severity: this.severity,
      message: 'Unable to determine license status. Ensure repository has a LICENSE file.',
      details: {
        warning: 'License status could not be verified from available context.',
        recommendation: 'Verify LICENSE file exists in repository root.'
      }
    }
  }
}

function isValidLicense(license: string): boolean {
  const normalized = license.toUpperCase().trim()
  return VALID_LICENSES.some(valid =>
    valid.toUpperCase() === normalized ||
    normalized.includes(valid.toUpperCase())
  )
}
