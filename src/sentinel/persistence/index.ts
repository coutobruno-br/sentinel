// src/sentinel/persistence/index.ts
/**
 * Módulo de persistência do Sentinel
 *
 * Exporta stores configurados com SQLite como backend padrão
 */

import { SQLiteAdapter } from './SQLiteAdapter'
import { EvidenceStore } from '../evidence/EvidenceStore'
import { ExecutionIndex } from '../execution/ExecutionIndex'
import { getDatabase, closeDatabase, resetDatabase } from './db/db'

// Singleton do adapter SQLite
let _sqliteAdapter: SQLiteAdapter | null = null

/**
 * Obtém instância do SQLiteAdapter (singleton)
 */
export function getSQLiteAdapter(): SQLiteAdapter {
  if (!_sqliteAdapter) {
    _sqliteAdapter = new SQLiteAdapter(getDatabase())
  }
  return _sqliteAdapter
}

// Singleton do EvidenceStore
let _evidenceStore: EvidenceStore | null = null

/**
 * Obtém instância do EvidenceStore com SQLite (singleton)
 */
export function getEvidenceStore(): EvidenceStore {
  if (!_evidenceStore) {
    _evidenceStore = new EvidenceStore(getSQLiteAdapter())
  }
  return _evidenceStore
}

// Singleton do ExecutionIndex
let _executionIndex: ExecutionIndex | null = null

/**
 * Obtém instância do ExecutionIndex com SQLite (singleton)
 */
export function getExecutionIndex(): ExecutionIndex {
  if (!_executionIndex) {
    _executionIndex = new ExecutionIndex(getSQLiteAdapter())
  }
  return _executionIndex
}

/**
 * Reseta todos os singletons (para testes)
 */
export function resetPersistence(): void {
  _sqliteAdapter = null
  _evidenceStore = null
  _executionIndex = null
  resetDatabase()
}

/**
 * Fecha conexões (para shutdown graceful)
 */
export function closePersistence(): void {
  _sqliteAdapter = null
  _evidenceStore = null
  _executionIndex = null
  closeDatabase()
}

// Instância default (compatibilidade)
export const db = getSQLiteAdapter()

// Re-exports
export { SQLiteAdapter } from './SQLiteAdapter'
export { getDatabase, closeDatabase, resetDatabase } from './db/db'
export type { EvidenceRecord } from '../evidence/EvidenceStore'
export type { ExecutionIndexRecord } from '../execution/ExecutionIndex'
