// src/sentinel/github/appWebhook.ts
import { Router, Request, Response } from 'express'
import { verifyWebhookSignature } from './GitHubAuth'
import {
  saveInstallation,
  deleteInstallation,
  suspendInstallation,
  unsuspendInstallation,
  addRepositories,
  removeRepositories,
  Installation
} from './GitHubAppHandler'

/**
 * GitHub App Webhook Router
 *
 * Processa eventos do GitHub App:
 * - installation: App instalado/desinstalado
 * - installation_repositories: Repos adicionados/removidos
 * - installation_target: Conta alterada
 */

const router = Router()

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || ''

// Middleware de verificação de assinatura
router.use((req: Request, res: Response, next) => {
  const rawBody = JSON.stringify(req.body)
  const signature = req.headers['x-hub-signature-256'] as string

  // Em desenvolvimento, permitir sem secret
  if (!WEBHOOK_SECRET) {
    console.warn('[GitHub App] WARNING: GITHUB_WEBHOOK_SECRET not set')
    return next()
  }

  if (!verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)) {
    console.log('[GitHub App] Invalid webhook signature')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  next()
})

/**
 * Handler principal de webhooks
 */
router.post('/', async (req: Request, res: Response) => {
  const event = req.headers['x-github-event'] as string
  const action = req.body.action as string
  const deliveryId = req.headers['x-github-delivery'] as string

  console.log(`[GitHub App] Event: ${event}.${action} (${deliveryId})`)

  try {
    switch (event) {
      case 'ping':
        return handlePing(req, res)

      case 'installation':
        return handleInstallation(req, res, action)

      case 'installation_repositories':
        return handleInstallationRepositories(req, res, action)

      case 'installation_target':
        return handleInstallationTarget(req, res)

      default:
        // Eventos não relacionados ao App são ignorados aqui
        // (push, pull_request, etc. vão para /webhook/github)
        console.log(`[GitHub App] Unhandled event: ${event}`)
        return res.status(200).json({ status: 'ignored', event })
    }
  } catch (error) {
    console.error('[GitHub App] Error handling webhook:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * Ping - Teste de conectividade
 */
function handlePing(req: Request, res: Response) {
  const { hook, zen } = req.body

  console.log(`[GitHub App] Ping received: ${zen}`)
  console.log(`[GitHub App] Hook ID: ${hook?.id}`)

  return res.status(200).json({
    status: 'pong',
    zen,
    hookId: hook?.id
  })
}

/**
 * Installation - App instalado/desinstalado
 */
function handleInstallation(req: Request, res: Response, action: string) {
  const { installation, repositories, sender } = req.body

  console.log(`[GitHub App] Installation ${action}: ${installation.account.login} (ID: ${installation.id})`)
  console.log(`[GitHub App] Triggered by: ${sender.login}`)

  switch (action) {
    case 'created': {
      // Nova instalação
      const inst: Installation = {
        id: installation.id,
        accountLogin: installation.account.login,
        accountType: installation.account.type,
        repositorySelection: installation.repository_selection,
        permissions: installation.permissions,
        events: installation.events,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      saveInstallation(inst)

      // Adicionar repositórios iniciais
      if (repositories && repositories.length > 0) {
        addRepositories(installation.id, repositories)
        console.log(`[GitHub App] Added ${repositories.length} repositories`)
      }

      return res.status(201).json({
        status: 'installation_created',
        installationId: installation.id,
        account: installation.account.login,
        repositories: repositories?.length ?? 0
      })
    }

    case 'deleted': {
      // Instalação removida
      deleteInstallation(installation.id)

      return res.status(200).json({
        status: 'installation_deleted',
        installationId: installation.id
      })
    }

    case 'suspend': {
      // Instalação suspensa (billing, etc)
      suspendInstallation(installation.id)

      return res.status(200).json({
        status: 'installation_suspended',
        installationId: installation.id
      })
    }

    case 'unsuspend': {
      // Instalação reativada
      unsuspendInstallation(installation.id)

      return res.status(200).json({
        status: 'installation_unsuspended',
        installationId: installation.id
      })
    }

    case 'new_permissions_accepted': {
      // Novas permissões aceitas
      const inst: Installation = {
        id: installation.id,
        accountLogin: installation.account.login,
        accountType: installation.account.type,
        repositorySelection: installation.repository_selection,
        permissions: installation.permissions,
        events: installation.events,
        createdAt: Date.now(), // Será ignorado pelo INSERT OR REPLACE
        updatedAt: Date.now()
      }

      saveInstallation(inst)

      return res.status(200).json({
        status: 'permissions_updated',
        installationId: installation.id
      })
    }

    default:
      console.log(`[GitHub App] Unknown installation action: ${action}`)
      return res.status(200).json({ status: 'ignored', action })
  }
}

/**
 * Installation Repositories - Repos adicionados/removidos
 */
function handleInstallationRepositories(req: Request, res: Response, action: string) {
  const { installation, repositories_added, repositories_removed } = req.body

  console.log(`[GitHub App] Repositories ${action} for installation ${installation.id}`)

  switch (action) {
    case 'added': {
      if (repositories_added && repositories_added.length > 0) {
        addRepositories(installation.id, repositories_added)
        console.log(`[GitHub App] Added ${repositories_added.length} repositories`)
      }

      return res.status(200).json({
        status: 'repositories_added',
        count: repositories_added?.length ?? 0
      })
    }

    case 'removed': {
      if (repositories_removed && repositories_removed.length > 0) {
        const repoIds = repositories_removed.map((r: { id: number }) => r.id)
        removeRepositories(installation.id, repoIds)
        console.log(`[GitHub App] Removed ${repositories_removed.length} repositories`)
      }

      return res.status(200).json({
        status: 'repositories_removed',
        count: repositories_removed?.length ?? 0
      })
    }

    default:
      return res.status(200).json({ status: 'ignored', action })
  }
}

/**
 * Installation Target - Conta de instalação alterada
 */
function handleInstallationTarget(req: Request, res: Response) {
  const { installation, changes } = req.body

  console.log(`[GitHub App] Installation target changed for ${installation.id}`)
  console.log(`[GitHub App] Changes:`, changes)

  // Atualizar conta da instalação
  const inst: Installation = {
    id: installation.id,
    accountLogin: installation.account.login,
    accountType: installation.account.type,
    repositorySelection: installation.repository_selection,
    permissions: installation.permissions,
    events: installation.events,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  saveInstallation(inst)

  return res.status(200).json({
    status: 'installation_target_updated',
    installationId: installation.id,
    newAccount: installation.account.login
  })
}

export default router
