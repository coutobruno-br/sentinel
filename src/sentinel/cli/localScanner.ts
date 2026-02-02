// src/sentinel/cli/localScanner.ts
import { execSync } from 'child_process'
import { readFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import type { FileInfo, PolicyContext, RepoInfo } from '../engine/types'

/**
 * Scanner local para arquivos do repositório
 */

const BINARY_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.lock', '.min.js', '.min.css', '.map'
]

const IGNORED_DIRS = [
  'node_modules', '.git', 'dist', 'build', 'coverage',
  '.next', '.nuxt', '__pycache__', 'vendor', '.cache'
]

export interface ScanOptions {
  staged?: boolean      // Apenas arquivos staged
  all?: boolean         // Todos os arquivos
  path?: string         // Diretório base
}

/**
 * Obtém arquivos staged no git
 */
export function getStagedFiles(cwd: string): FileInfo[] {
  try {
    const output = execSync('git diff --cached --name-status', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    })

    if (!output.trim()) return []

    return output
      .trim()
      .split('\n')
      .map(line => {
        const [status, ...pathParts] = line.split('\t')
        const filePath = pathParts.join('\t')

        const fileStatus = status === 'A' ? 'added'
          : status === 'D' ? 'removed'
          : 'modified'

        const info: FileInfo = {
          path: filePath,
          status: fileStatus as 'added' | 'modified' | 'removed'
        }

        // Ler conteúdo se não foi removido
        if (fileStatus !== 'removed') {
          const fullPath = join(cwd, filePath)
          if (existsSync(fullPath) && !isBinaryFile(filePath)) {
            try {
              info.content = readFileSync(fullPath, 'utf-8')
            } catch {
              // Ignorar arquivos que não podem ser lidos
            }
          }
        }

        return info
      })
      .filter(f => f.path)
  } catch {
    return []
  }
}

/**
 * Obtém arquivos modificados (não staged)
 */
export function getModifiedFiles(cwd: string): FileInfo[] {
  try {
    const output = execSync('git diff --name-status', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    })

    if (!output.trim()) return []

    return output
      .trim()
      .split('\n')
      .map(line => {
        const [status, ...pathParts] = line.split('\t')
        const filePath = pathParts.join('\t')

        const fileStatus = status === 'A' ? 'added'
          : status === 'D' ? 'removed'
          : 'modified'

        const info: FileInfo = {
          path: filePath,
          status: fileStatus as 'added' | 'modified' | 'removed'
        }

        if (fileStatus !== 'removed') {
          const fullPath = join(cwd, filePath)
          if (existsSync(fullPath) && !isBinaryFile(filePath)) {
            try {
              info.content = readFileSync(fullPath, 'utf-8')
            } catch {
              // Ignorar
            }
          }
        }

        return info
      })
      .filter(f => f.path)
  } catch {
    return []
  }
}

/**
 * Obtém todos os arquivos rastreados pelo git
 */
export function getAllTrackedFiles(cwd: string): FileInfo[] {
  try {
    const output = execSync('git ls-files', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    })

    if (!output.trim()) return []

    return output
      .trim()
      .split('\n')
      .filter(filePath => {
        // Filtrar diretórios ignorados
        const parts = filePath.split('/')
        return !parts.some(part => IGNORED_DIRS.includes(part))
      })
      .filter(filePath => !isBinaryFile(filePath))
      .slice(0, 500) // Limitar para performance
      .map(filePath => {
        const info: FileInfo = {
          path: filePath,
          status: 'modified'
        }

        const fullPath = join(cwd, filePath)
        if (existsSync(fullPath)) {
          try {
            const stat = statSync(fullPath)
            if (stat.size < 1024 * 1024) { // Max 1MB
              info.content = readFileSync(fullPath, 'utf-8')
            }
          } catch {
            // Ignorar
          }
        }

        return info
      })
  } catch {
    return []
  }
}

/**
 * Obtém informações do repositório
 */
export function getRepoInfo(cwd: string): RepoInfo {
  let branch = 'main'
  let name = 'local-repo'

  try {
    branch = execSync('git branch --show-current', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim() || 'main'
  } catch {
    // Usar default
  }

  try {
    const remote = execSync('git remote get-url origin', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()

    // Extrair nome do repo da URL
    const match = remote.match(/\/([^/]+?)(\.git)?$/)
    if (match) name = match[1]
  } catch {
    // Usar nome do diretório
    name = cwd.split(/[/\\]/).pop() || 'local-repo'
  }

  // Verificar se existe LICENSE
  const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'COPYING']
  const hasLicenseFile = licenseFiles.some(f => existsSync(join(cwd, f)))

  return {
    name,
    branch,
    defaultBranch: 'main',
    hasLicenseFile,
    license: hasLicenseFile ? 'detected' : null
  }
}

/**
 * Cria contexto para execução local das regras
 */
export function createLocalContext(cwd: string, options: ScanOptions = {}): PolicyContext {
  const repo = getRepoInfo(cwd)

  let files: FileInfo[] = []

  if (options.staged) {
    files = getStagedFiles(cwd)
  } else if (options.all) {
    files = getAllTrackedFiles(cwd)
  } else {
    // Padrão: staged + modified
    const staged = getStagedFiles(cwd)
    const modified = getModifiedFiles(cwd)

    // Merge sem duplicatas
    const seen = new Set(staged.map(f => f.path))
    files = [...staged, ...modified.filter(f => !seen.has(f.path))]
  }

  return {
    event: 'push',
    repo,
    files,
    commit: {
      sha: 'local',
      message: 'Local check',
      author: 'local'
    }
  }
}

function isBinaryFile(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  return BINARY_EXTENSIONS.some(ext => lower.endsWith(ext))
}
