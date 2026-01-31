// src/sentinel/persistence/db/db.ts
import Database from 'better-sqlite3'
import type { Database as DatabaseType } from 'better-sqlite3'

/**
 * Configuração do banco de dados
 */
export interface DatabaseConfig {
  path?: string
  readonly?: boolean
  verbose?: boolean
}

/**
 * Inicializa conexão com banco de dados SQLite
 */
function createDatabase(config: DatabaseConfig = {}): Database.Database {
  const dbPath = config.path ?? process.env.DATABASE_PATH ?? 'sentinel.db'

  const db = new Database(dbPath, {
    readonly: config.readonly ?? false,
    verbose: config.verbose ? console.log : undefined
  })

  // Otimizações de performance
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')

  return db
}

/**
 * Inicializa schema do banco de dados
 */
function initializeSchema(db: Database.Database): void {
  db.exec(`
    -- Tabela de evidências (imutáveis)
    CREATE TABLE IF NOT EXISTS evidences (
      hash TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      metadata TEXT,
      source TEXT,
      createdAt INTEGER NOT NULL
    );

    -- Índice para busca por data
    CREATE INDEX IF NOT EXISTS idx_evidences_createdAt ON evidences(createdAt);

    -- Tabela de execuções
    CREATE TABLE IF NOT EXISTS executions (
      executionId TEXT PRIMARY KEY,
      evidenceHash TEXT NOT NULL,
      policyIds TEXT NOT NULL,
      executedAt INTEGER NOT NULL,
      FOREIGN KEY (evidenceHash) REFERENCES evidences(hash)
    );

    -- Índices para buscas comuns
    CREATE INDEX IF NOT EXISTS idx_executions_evidenceHash ON executions(evidenceHash);
    CREATE INDEX IF NOT EXISTS idx_executions_executedAt ON executions(executedAt);

    -- Tabela de execuções legada (para compatibilidade)
    CREATE TABLE IF NOT EXISTS executions_legacy (
      id TEXT PRIMARY KEY,
      event TEXT NOT NULL,
      asset TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      violations TEXT NOT NULL,
      evidence_hash TEXT NOT NULL
    );

    -- Tabela de billing/metering (futura)
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      plan TEXT DEFAULT 'free',
      executionCount INTEGER DEFAULT 0,
      trialStartedAt INTEGER,
      suspendedAt INTEGER,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner);
  `)
}

// Singleton do banco de dados
let _db: Database.Database | null = null

/**
 * Obtém instância do banco de dados (singleton)
 */
export function getDatabase(config?: DatabaseConfig): Database.Database {
  if (!_db) {
    _db = createDatabase(config)
    initializeSchema(_db)
  }
  return _db
}

/**
 * Fecha conexão com banco de dados
 */
export function closeDatabase(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}

/**
 * Reseta banco de dados (para testes)
 */
export function resetDatabase(): void {
  if (_db) {
    _db.exec(`
      DELETE FROM executions;
      DELETE FROM evidences;
      DELETE FROM assets;
    `)
  }
}

// Export default para compatibilidade
const db: DatabaseType = getDatabase()
export default db


