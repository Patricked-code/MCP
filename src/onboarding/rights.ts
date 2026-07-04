import type { GitHubConnectionStatus } from '../github/connection.js';
import type { GitRegistry } from '../github/registry.js';
import type { ActorIdentity, RightsReport } from './types.js';

export function evaluateRights(status: GitHubConnectionStatus, registry: GitRegistry, actor: ActorIdentity): RightsReport {
  const warnings = [...status.warnings];
  const errors = status.error ? [status.error] : [];
  const canReadAccount = status.connected && Boolean(status.login);
  const canReadOrgs = status.orgAccessible;
  const canReadRepos = status.canReadReposHint && status.connected;
  const hasRepoMappings = registry.repoMappings.length > 0;
  const canWriteHint = status.connected && status.canWriteReposHint;
  const requiresHumanApproval = actor.requiresHumanApproval || !status.connected || !canWriteHint;

  if (!status.connected) {
    warnings.push('GitHub is not connected in the MCP runtime. Onboarding can prepare artifacts only.');
  }
  if (!status.orgAccessible) {
    warnings.push('Target organization is not accessible yet. Install or authorize the GitHub app before direct organization writes.');
  }
  if (!hasRepoMappings) {
    warnings.push('No repo-to-server mapping is registered yet.');
  }

  return {
    canReadAccount,
    canReadOrgs,
    canReadRepos,
    canReadBranches: canReadRepos,
    canReadFiles: canReadRepos,
    canCreateBranch: canWriteHint && !requiresHumanApproval,
    canWriteBranch: canWriteHint && !requiresHumanApproval,
    canOpenPullRequest: canWriteHint,
    canReadActions: false,
    canReadSecretsMetadata: false,
    isRepoAdmin: status.canWriteReposHint && status.connected,
    isOrgAdmin: status.canAdminOrgHint && status.orgAccessible,
    isWriteSafe: canWriteHint && status.connected,
    requiresHumanApproval,
    warnings,
    errors
  };
}
