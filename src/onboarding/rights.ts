import type { GitHubRightsSummary } from './types.js';

type MinimalGithubStatus = {
  connected?: boolean;
  orgAccessible?: boolean;
  canReadReposHint?: boolean;
  canWriteReposHint?: boolean;
  canAdminOrgHint?: boolean;
  warnings?: string[];
  error?: string | null;
};

export function summarizeGithubRights(status: MinimalGithubStatus): GitHubRightsSummary {
  const warnings = [...(status.warnings ?? [])];
  const errors: string[] = [];

  if (status.error) {
    errors.push(status.error);
  }

  const canReadAccount = Boolean(status.connected);
  const canReadOrgs = Boolean(status.orgAccessible || status.connected);
  const canReadRepos = Boolean(status.canReadReposHint);
  const canWriteBranch = Boolean(status.canWriteReposHint);
  const isOrgAdmin = Boolean(status.canAdminOrgHint);

  if (canWriteBranch) {
    warnings.push('Écriture détectée comme possible/probable : limiter aux branches MCP et exiger validation humaine.');
  }

  return {
    canReadAccount,
    canReadOrgs,
    canReadRepos,
    canReadBranches: canReadRepos,
    canReadFiles: canReadRepos,
    canCreateBranch: canWriteBranch,
    canWriteBranch,
    canOpenPullRequest: canWriteBranch,
    canReadActions: false,
    canReadSecretsMetadata: false,
    isRepoAdmin: false,
    isOrgAdmin,
    isWriteSafe: canWriteBranch,
    requiresHumanApproval: true,
    warnings,
    errors
  };
}
