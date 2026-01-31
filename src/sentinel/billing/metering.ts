// src/sentinel/billing/metering.ts
import { getDatabase } from '../persistence/db/db'

/**
 * Metering - Sistema de contagem de uso
 *
 * Rastreia execuções por asset (repositório ou organização)
 * para enforçar limites de plano e billing.
 */

export interface UsageRecord {
  assetId: string
  assetType: 'repository' | 'organization'
  assetName: string
  period: string // YYYY-MM
  executionCount: number
  lastExecutionAt: number
}

export interface UsageSummary {
  currentPeriod: string
  executionsThisPeriod: number
  executionsTotal: number
  lastExecutionAt: number | null
}

/**
 * Inicializa tabelas de metering
 */
export function initMeteringTables(): void {
  const db = getDatabase()

  db.exec(`
    -- Tabela de uso por período
    CREATE TABLE IF NOT EXISTS usage_records (
      assetId TEXT NOT NULL,
      assetType TEXT NOT NULL,
      assetName TEXT NOT NULL,
      period TEXT NOT NULL,
      executionCount INTEGER NOT NULL DEFAULT 0,
      lastExecutionAt INTEGER,
      PRIMARY KEY (assetId, period)
    );

    CREATE INDEX IF NOT EXISTS idx_usage_period
      ON usage_records(period);

    CREATE INDEX IF NOT EXISTS idx_usage_asset
      ON usage_records(assetId);

    -- Tabela de eventos de uso (para auditoria)
    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId TEXT NOT NULL,
      executionId TEXT NOT NULL,
      event TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_usage_events_asset
      ON usage_events(assetId, timestamp);
  `)
}

// Inicializar tabelas
initMeteringTables()

/**
 * Obtém período atual (YYYY-MM)
 */
export function getCurrentPeriod(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Incrementa contador de execuções para um asset
 */
export function incrementUsage(
  assetId: string,
  assetType: 'repository' | 'organization',
  assetName: string,
  executionId: string
): UsageRecord {
  const db = getDatabase()
  const period = getCurrentPeriod()
  const now = Date.now()

  // Upsert do registro de uso
  db.prepare(`
    INSERT INTO usage_records (assetId, assetType, assetName, period, executionCount, lastExecutionAt)
    VALUES (?, ?, ?, ?, 1, ?)
    ON CONFLICT(assetId, period) DO UPDATE SET
      executionCount = executionCount + 1,
      lastExecutionAt = excluded.lastExecutionAt,
      assetName = excluded.assetName
  `).run(assetId, assetType, assetName, period, now)

  // Registrar evento para auditoria
  db.prepare(`
    INSERT INTO usage_events (assetId, executionId, event, timestamp, metadata)
    VALUES (?, ?, 'execution', ?, NULL)
  `).run(assetId, executionId, now)

  // Retornar registro atualizado
  return getUsageRecord(assetId, period)!
}

/**
 * Obtém registro de uso de um asset em um período
 */
export function getUsageRecord(assetId: string, period?: string): UsageRecord | undefined {
  const db = getDatabase()
  const targetPeriod = period ?? getCurrentPeriod()

  const row = db.prepare(`
    SELECT * FROM usage_records WHERE assetId = ? AND period = ?
  `).get(assetId, targetPeriod) as {
    assetId: string
    assetType: string
    assetName: string
    period: string
    executionCount: number
    lastExecutionAt: number | null
  } | undefined

  if (!row) return undefined

  return {
    assetId: row.assetId,
    assetType: row.assetType as 'repository' | 'organization',
    assetName: row.assetName,
    period: row.period,
    executionCount: row.executionCount,
    lastExecutionAt: row.lastExecutionAt ?? 0
  }
}

/**
 * Obtém uso atual de um asset
 */
export function getCurrentUsage(assetId: string): number {
  const record = getUsageRecord(assetId)
  return record?.executionCount ?? 0
}

/**
 * Obtém resumo de uso de um asset
 */
export function getUsageSummary(assetId: string): UsageSummary {
  const db = getDatabase()
  const currentPeriod = getCurrentPeriod()

  // Uso do período atual
  const current = getUsageRecord(assetId, currentPeriod)

  // Total histórico
  const totalRow = db.prepare(`
    SELECT
      SUM(executionCount) as total,
      MAX(lastExecutionAt) as lastExecution
    FROM usage_records
    WHERE assetId = ?
  `).get(assetId) as { total: number | null; lastExecution: number | null }

  return {
    currentPeriod,
    executionsThisPeriod: current?.executionCount ?? 0,
    executionsTotal: totalRow.total ?? 0,
    lastExecutionAt: totalRow.lastExecution
  }
}

/**
 * Lista uso de todos os assets no período atual
 */
export function listCurrentUsage(): UsageRecord[] {
  const db = getDatabase()
  const period = getCurrentPeriod()

  const rows = db.prepare(`
    SELECT * FROM usage_records
    WHERE period = ?
    ORDER BY executionCount DESC
  `).all(period) as Array<{
    assetId: string
    assetType: string
    assetName: string
    period: string
    executionCount: number
    lastExecutionAt: number | null
  }>

  return rows.map(row => ({
    assetId: row.assetId,
    assetType: row.assetType as 'repository' | 'organization',
    assetName: row.assetName,
    period: row.period,
    executionCount: row.executionCount,
    lastExecutionAt: row.lastExecutionAt ?? 0
  }))
}

/**
 * Obtém histórico de uso de um asset
 */
export function getUsageHistory(assetId: string, months: number = 12): UsageRecord[] {
  const db = getDatabase()

  const rows = db.prepare(`
    SELECT * FROM usage_records
    WHERE assetId = ?
    ORDER BY period DESC
    LIMIT ?
  `).all(assetId, months) as Array<{
    assetId: string
    assetType: string
    assetName: string
    period: string
    executionCount: number
    lastExecutionAt: number | null
  }>

  return rows.map(row => ({
    assetId: row.assetId,
    assetType: row.assetType as 'repository' | 'organization',
    assetName: row.assetName,
    period: row.period,
    executionCount: row.executionCount,
    lastExecutionAt: row.lastExecutionAt ?? 0
  }))
}

/**
 * Reseta uso de um asset (para testes)
 */
export function resetUsage(assetId: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM usage_records WHERE assetId = ?').run(assetId)
  db.prepare('DELETE FROM usage_events WHERE assetId = ?').run(assetId)
}

/**
 * Estatísticas globais de uso
 */
export function getGlobalUsageStats(): {
  totalExecutions: number
  activeAssets: number
  executionsThisPeriod: number
  topAssets: Array<{ assetId: string; assetName: string; count: number }>
} {
  const db = getDatabase()
  const period = getCurrentPeriod()

  const total = db.prepare(`
    SELECT SUM(executionCount) as total FROM usage_records
  `).get() as { total: number | null }

  const active = db.prepare(`
    SELECT COUNT(DISTINCT assetId) as count FROM usage_records WHERE period = ?
  `).get(period) as { count: number }

  const thisPeriod = db.prepare(`
    SELECT SUM(executionCount) as total FROM usage_records WHERE period = ?
  `).get(period) as { total: number | null }

  const top = db.prepare(`
    SELECT assetId, assetName, executionCount as count
    FROM usage_records
    WHERE period = ?
    ORDER BY executionCount DESC
    LIMIT 10
  `).all(period) as Array<{ assetId: string; assetName: string; count: number }>

  return {
    totalExecutions: total.total ?? 0,
    activeAssets: active.count,
    executionsThisPeriod: thisPeriod.total ?? 0,
    topAssets: top
  }
}
