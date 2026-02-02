// src/sentinel/config/index.ts
/**
 * Centralized Configuration Module
 *
 * Loads environment-specific configuration and provides
 * type-safe access to all settings.
 */

import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'path'

// Determine environment
const NODE_ENV = process.env.NODE_ENV || 'development'
const isDev = NODE_ENV === 'development'
const isProd = NODE_ENV === 'production'
const isTest = NODE_ENV === 'test'

// Load environment-specific .env file
const envFile = `.env.${NODE_ENV}`
dotenvConfig({ path: resolve(process.cwd(), envFile) })

// Fallback to .env if specific file doesn't exist
dotenvConfig({ path: resolve(process.cwd(), '.env') })

/**
 * Application Configuration
 */
export const config = {
  // Environment
  env: NODE_ENV,
  isDev,
  isProd,
  isTest,

  // Server
  port: Number(process.env.PORT) || 3000,

  // URLs
  apiUrl: process.env.API_URL || (isDev ? 'http://localhost:3000' : ''),
  landingUrl: process.env.LANDING_URL || (isDev ? 'http://localhost:8080' : ''),

  // Database
  database: {
    path: process.env.DATABASE_PATH || (isDev ? 'sentinel.dev.db' : 'sentinel.db'),
  },

  // GitHub App
  github: {
    appId: process.env.GITHUB_APP_ID || '',
    privateKey: process.env.GITHUB_PRIVATE_KEY || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    isConfigured(): boolean {
      return Boolean(this.appId && this.privateKey && this.webhookSecret)
    },
  },

  // Paddle
  paddle: {
    environment: (process.env.PADDLE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
    apiKey: process.env.PADDLE_API_KEY || '',
    clientToken: process.env.PADDLE_CLIENT_TOKEN || '',
    webhookSecret: process.env.PADDLE_WEBHOOK_SECRET || '',
    prices: {
      pro: process.env.PADDLE_PRICE_ID_PRO || '',
      enterprise: process.env.PADDLE_PRICE_ID_ENTERPRISE || '',
    },
    isConfigured(): boolean {
      return Boolean(this.apiKey && this.clientToken && this.webhookSecret)
    },
  },

  // API Security
  security: {
    apiKeys: (process.env.SENTINEL_API_KEYS || '').split(',').filter(Boolean),
  },

  // Evidence
  evidence: {
    privateKey: process.env.PRIVATE_SIGNING_KEY || '',
    directory: process.env.EVIDENCE_DIR || 'evidence',
  },

  // Billing
  billing: {
    trialDays: 14,
    trialExecutionLimit: Number(process.env.TRIAL_EXECUTION_LIMIT) || 50,
  },
} as const

/**
 * Validate required configuration for production
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (isProd) {
    if (!config.github.isConfigured()) {
      errors.push('GitHub App not configured (GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET)')
    }
    if (!config.paddle.isConfigured()) {
      errors.push('Paddle not configured (PADDLE_API_KEY, PADDLE_CLIENT_TOKEN, PADDLE_WEBHOOK_SECRET)')
    }
    if (config.security.apiKeys.length === 0) {
      errors.push('No API keys configured (SENTINEL_API_KEYS)')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Print configuration summary (safe for logging)
 */
export function printConfigSummary(): void {
  console.log(`[Config] Environment: ${config.env}`)
  console.log(`[Config] API URL: ${config.apiUrl}`)
  console.log(`[Config] Database: ${config.database.path}`)
  console.log(`[Config] GitHub App: ${config.github.isConfigured() ? 'Configured' : 'Not configured'}`)
  console.log(`[Config] Paddle: ${config.paddle.isConfigured() ? 'Configured' : 'Not configured'} (${config.paddle.environment})`)
  console.log(`[Config] API Keys: ${config.security.apiKeys.length} configured`)
}

export default config
