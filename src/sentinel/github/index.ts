// src/sentinel/github/index.ts
/**
 * Módulo GitHub App do Sentinel
 *
 * Exporta autenticação, handlers e routers para integração com GitHub
 */

export {
  generateAppJWT,
  getInstallationToken,
  getCachedInstallationToken,
  verifyWebhookSignature,
  getAppInfo,
  listInstallations as listRemoteInstallations,
  type GitHubAppConfig,
  type InstallationToken
} from './GitHubAuth'

export {
  saveInstallation,
  deleteInstallation,
  getInstallation,
  listInstallations,
  suspendInstallation,
  unsuspendInstallation,
  addRepositories,
  removeRepositories,
  getRepositories,
  getInstallationByRepo,
  countMonitoredRepositories,
  getInstallationStats,
  type Installation,
  type InstalledRepository
} from './GitHubAppHandler'

export { default as appWebhookRouter } from './appWebhook'
