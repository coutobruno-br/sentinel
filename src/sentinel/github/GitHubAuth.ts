// src/sentinel/github/GitHubAuth.ts
import crypto from 'crypto'

/**
 * GitHub App Authentication
 *
 * Implementa autenticação JWT para GitHub Apps e
 * obtenção de Installation Access Tokens
 */

export interface GitHubAppConfig {
  appId: string
  privateKey: string
  webhookSecret?: string
}

export interface InstallationToken {
  token: string
  expiresAt: Date
  permissions: Record<string, string>
  repositorySelection: 'all' | 'selected'
}

/**
 * Gera JWT para autenticação como GitHub App
 */
export function generateAppJWT(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000)

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }

  const payload = {
    iat: now - 60, // Issued 60 seconds ago (clock drift)
    exp: now + 600, // Expires in 10 minutes (max allowed)
    iss: appId
  }

  const headerB64 = base64UrlEncode(JSON.stringify(header))
  const payloadB64 = base64UrlEncode(JSON.stringify(payload))

  const signatureInput = `${headerB64}.${payloadB64}`

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signatureInput)
  sign.end()

  const signature = sign.sign(privateKey)
  const signatureB64 = base64UrlEncode(signature)

  return `${headerB64}.${payloadB64}.${signatureB64}`
}

/**
 * Obtém Installation Access Token para uma instalação específica
 */
export async function getInstallationToken(
  installationId: number,
  appId: string,
  privateKey: string
): Promise<InstallationToken> {
  const jwt = generateAppJWT(appId, privateKey)

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${jwt}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get installation token: ${response.status} ${error}`)
  }

  const data = await response.json() as {
    token: string
    expires_at: string
    permissions: Record<string, string>
    repository_selection: 'all' | 'selected'
  }

  return {
    token: data.token,
    expiresAt: new Date(data.expires_at),
    permissions: data.permissions,
    repositorySelection: data.repository_selection
  }
}

/**
 * Cache de tokens de instalação
 */
const tokenCache = new Map<number, { token: InstallationToken; fetchedAt: number }>()
const TOKEN_CACHE_TTL = 55 * 60 * 1000 // 55 minutos (tokens expiram em 1h)

/**
 * Obtém token de instalação com cache
 */
export async function getCachedInstallationToken(
  installationId: number,
  appId: string,
  privateKey: string
): Promise<string> {
  const cached = tokenCache.get(installationId)
  const now = Date.now()

  // Usar cache se válido
  if (cached && (now - cached.fetchedAt) < TOKEN_CACHE_TTL) {
    return cached.token.token
  }

  // Buscar novo token
  const token = await getInstallationToken(installationId, appId, privateKey)
  tokenCache.set(installationId, { token, fetchedAt: now })

  return token.token
}

/**
 * Valida webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false

  const hmac = crypto.createHmac('sha256', secret)
  const digest = `sha256=${hmac.update(payload).digest('hex')}`

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
  } catch {
    return false
  }
}

/**
 * Obtém informações do App
 */
export async function getAppInfo(appId: string, privateKey: string): Promise<{
  id: number
  slug: string
  name: string
  owner: { login: string }
  permissions: Record<string, string>
  events: string[]
}> {
  const jwt = generateAppJWT(appId, privateKey)

  const response = await fetch('https://api.github.com/app', {
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${jwt}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to get app info: ${response.status}`)
  }

  return response.json() as Promise<{
    id: number
    slug: string
    name: string
    owner: { login: string }
    permissions: Record<string, string>
    events: string[]
  }>
}

/**
 * Lista instalações do App
 */
export async function listInstallations(appId: string, privateKey: string): Promise<Array<{
  id: number
  account: { login: string; type: string }
  repository_selection: 'all' | 'selected'
  created_at: string
}>> {
  const jwt = generateAppJWT(appId, privateKey)

  const response = await fetch('https://api.github.com/app/installations', {
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${jwt}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to list installations: ${response.status}`)
  }

  return response.json() as Promise<Array<{
    id: number
    account: { login: string; type: string }
    repository_selection: 'all' | 'selected'
    created_at: string
  }>>
}

// Helpers
function base64UrlEncode(data: string | Buffer): string {
  const base64 = Buffer.isBuffer(data)
    ? data.toString('base64')
    : Buffer.from(data).toString('base64')

  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}
