// src/sentinel/github/GitHubAppHandler.ts
import { getDatabase } from '../persistence/db/db'

/**
 * GitHub App Installation Handler
 *
 * Gerencia instalações do GitHub App:
 * - Registra novas instalações
 * - Atualiza permissões
 * - Remove instalações canceladas
 * - Rastreia repositórios monitorados
 */

export interface Installation {
  id: number
  accountLogin: string
  accountType: 'User' | 'Organization'
  repositorySelection: 'all' | 'selected'
  permissions: Record<string, string>
  events: string[]
  createdAt: number
  updatedAt: number
  suspendedAt?: number
}

export interface InstalledRepository {
  installationId: number
  repositoryId: number
  fullName: string
  private: boolean
  addedAt: number
}

/**
 * Inicializa tabelas de instalação
 */
export function initInstallationTables(): void {
  const db = getDatabase()

  db.exec(`
    -- Tabela de instalações do GitHub App
    CREATE TABLE IF NOT EXISTS github_installations (
      id INTEGER PRIMARY KEY,
      accountLogin TEXT NOT NULL,
      accountType TEXT NOT NULL,
      repositorySelection TEXT NOT NULL,
      permissions TEXT NOT NULL,
      events TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      suspendedAt INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_installations_account
      ON github_installations(accountLogin);

    -- Tabela de repositórios instalados
    CREATE TABLE IF NOT EXISTS github_repositories (
      installationId INTEGER NOT NULL,
      repositoryId INTEGER NOT NULL,
      fullName TEXT NOT NULL,
      private INTEGER NOT NULL DEFAULT 0,
      addedAt INTEGER NOT NULL,
      PRIMARY KEY (installationId, repositoryId),
      FOREIGN KEY (installationId) REFERENCES github_installations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_repos_fullname
      ON github_repositories(fullName);
  `)
}

// Inicializar tabelas ao importar módulo
initInstallationTables()

/**
 * Registra nova instalação
 */
export function saveInstallation(installation: Installation): void {
  const db = getDatabase()

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO github_installations
    (id, accountLogin, accountType, repositorySelection, permissions, events, createdAt, updatedAt, suspendedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    installation.id,
    installation.accountLogin,
    installation.accountType,
    installation.repositorySelection,
    JSON.stringify(installation.permissions),
    JSON.stringify(installation.events),
    installation.createdAt,
    installation.updatedAt,
    installation.suspendedAt ?? null
  )
}

/**
 * Remove instalação
 */
export function deleteInstallation(installationId: number): void {
  const db = getDatabase()

  // Remover repositórios primeiro
  db.prepare('DELETE FROM github_repositories WHERE installationId = ?').run(installationId)
  db.prepare('DELETE FROM github_installations WHERE id = ?').run(installationId)
}

/**
 * Busca instalação por ID
 */
export function getInstallation(installationId: number): Installation | undefined {
  const db = getDatabase()

  const row = db.prepare('SELECT * FROM github_installations WHERE id = ?').get(installationId) as {
    id: number
    accountLogin: string
    accountType: string
    repositorySelection: string
    permissions: string
    events: string
    createdAt: number
    updatedAt: number
    suspendedAt: number | null
  } | undefined

  if (!row) return undefined

  return {
    id: row.id,
    accountLogin: row.accountLogin,
    accountType: row.accountType as 'User' | 'Organization',
    repositorySelection: row.repositorySelection as 'all' | 'selected',
    permissions: JSON.parse(row.permissions),
    events: JSON.parse(row.events),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    suspendedAt: row.suspendedAt ?? undefined
  }
}

/**
 * Lista todas as instalações
 */
export function listInstallations(): Installation[] {
  const db = getDatabase()

  const rows = db.prepare('SELECT * FROM github_installations ORDER BY createdAt DESC').all() as Array<{
    id: number
    accountLogin: string
    accountType: string
    repositorySelection: string
    permissions: string
    events: string
    createdAt: number
    updatedAt: number
    suspendedAt: number | null
  }>

  return rows.map(row => ({
    id: row.id,
    accountLogin: row.accountLogin,
    accountType: row.accountType as 'User' | 'Organization',
    repositorySelection: row.repositorySelection as 'all' | 'selected',
    permissions: JSON.parse(row.permissions),
    events: JSON.parse(row.events),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    suspendedAt: row.suspendedAt ?? undefined
  }))
}

/**
 * Suspende instalação
 */
export function suspendInstallation(installationId: number): void {
  const db = getDatabase()

  db.prepare(`
    UPDATE github_installations
    SET suspendedAt = ?, updatedAt = ?
    WHERE id = ?
  `).run(Date.now(), Date.now(), installationId)
}

/**
 * Reativa instalação suspensa
 */
export function unsuspendInstallation(installationId: number): void {
  const db = getDatabase()

  db.prepare(`
    UPDATE github_installations
    SET suspendedAt = NULL, updatedAt = ?
    WHERE id = ?
  `).run(Date.now(), installationId)
}

/**
 * Adiciona repositórios à instalação
 */
export function addRepositories(installationId: number, repositories: Array<{
  id: number
  full_name: string
  private: boolean
}>): void {
  const db = getDatabase()

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO github_repositories
    (installationId, repositoryId, fullName, private, addedAt)
    VALUES (?, ?, ?, ?, ?)
  `)

  const now = Date.now()

  for (const repo of repositories) {
    stmt.run(installationId, repo.id, repo.full_name, repo.private ? 1 : 0, now)
  }
}

/**
 * Remove repositórios da instalação
 */
export function removeRepositories(installationId: number, repositoryIds: number[]): void {
  const db = getDatabase()

  const stmt = db.prepare(`
    DELETE FROM github_repositories
    WHERE installationId = ? AND repositoryId = ?
  `)

  for (const repoId of repositoryIds) {
    stmt.run(installationId, repoId)
  }
}

/**
 * Lista repositórios de uma instalação
 */
export function getRepositories(installationId: number): InstalledRepository[] {
  const db = getDatabase()

  const rows = db.prepare(`
    SELECT * FROM github_repositories WHERE installationId = ?
  `).all(installationId) as Array<{
    installationId: number
    repositoryId: number
    fullName: string
    private: number
    addedAt: number
  }>

  return rows.map(row => ({
    installationId: row.installationId,
    repositoryId: row.repositoryId,
    fullName: row.fullName,
    private: row.private === 1,
    addedAt: row.addedAt
  }))
}

/**
 * Busca instalação por nome de repositório
 */
export function getInstallationByRepo(repoFullName: string): Installation | undefined {
  const db = getDatabase()

  const row = db.prepare(`
    SELECT i.* FROM github_installations i
    JOIN github_repositories r ON r.installationId = i.id
    WHERE r.fullName = ?
  `).get(repoFullName) as {
    id: number
    accountLogin: string
    accountType: string
    repositorySelection: string
    permissions: string
    events: string
    createdAt: number
    updatedAt: number
    suspendedAt: number | null
  } | undefined

  if (!row) return undefined

  return {
    id: row.id,
    accountLogin: row.accountLogin,
    accountType: row.accountType as 'User' | 'Organization',
    repositorySelection: row.repositorySelection as 'all' | 'selected',
    permissions: JSON.parse(row.permissions),
    events: JSON.parse(row.events),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    suspendedAt: row.suspendedAt ?? undefined
  }
}

/**
 * Conta total de repositórios monitorados
 */
export function countMonitoredRepositories(): number {
  const db = getDatabase()

  const result = db.prepare('SELECT COUNT(*) as count FROM github_repositories').get() as { count: number }
  return result.count
}

/**
 * Estatísticas de instalação
 */
export function getInstallationStats(): {
  totalInstallations: number
  activeInstallations: number
  suspendedInstallations: number
  totalRepositories: number
  byAccountType: { users: number; organizations: number }
} {
  const db = getDatabase()

  const total = db.prepare('SELECT COUNT(*) as count FROM github_installations').get() as { count: number }
  const active = db.prepare('SELECT COUNT(*) as count FROM github_installations WHERE suspendedAt IS NULL').get() as { count: number }
  const repos = db.prepare('SELECT COUNT(*) as count FROM github_repositories').get() as { count: number }
  const users = db.prepare("SELECT COUNT(*) as count FROM github_installations WHERE accountType = 'User'").get() as { count: number }
  const orgs = db.prepare("SELECT COUNT(*) as count FROM github_installations WHERE accountType = 'Organization'").get() as { count: number }

  return {
    totalInstallations: total.count,
    activeInstallations: active.count,
    suspendedInstallations: total.count - active.count,
    totalRepositories: repos.count,
    byAccountType: {
      users: users.count,
      organizations: orgs.count
    }
  }
}
