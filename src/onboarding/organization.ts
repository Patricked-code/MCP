import type { GitHubConnectionStatus } from '../github/connection.js';
import type { OrganizationBootstrapPackage } from './types.js';

export const TARGET_ORGANIZATION = 'chainsolutions-wealthtech';

export const TARGET_ORGANIZATION_SHORT_DESCRIPTION =
  'Centre de gouvernance GitHub/MCP pour l ecosysteme ChainSolutions WealthTech: migration, documentation, agents IA, mappings repo-serveur et audit securise.';

export const TARGET_ORGANIZATION_LONG_DESCRIPTION =
  [
    'chainsolutions-wealthtech centralise, versionne, documente et gouverne l ecosysteme ChainSolutions / WealthTech.',
    'L organisation rassemble progressivement les repositories, documents, conversations utiles, prompts, consignes, profils d agents, mappings repo-serveur, historiques de decisions, audits et fichiers de suivi.',
    'Le MCP WealthTech est le superviseur central entre GitHub, les serveurs, les agents IA et la memoire projet. Il relie la source versionnee GitHub a la source d execution serveur, sans exposer de secrets ni donner d acces SSH libre aux agents.'
  ].join(' ');

export function buildOrganizationBootstrapPackage(status: GitHubConnectionStatus): OrganizationBootstrapPackage {
  const configuredOrg = status.org ?? null;
  const targetOrgAccessible = configuredOrg === TARGET_ORGANIZATION && status.orgAccessible;
  const repositoriesVisible = targetOrgAccessible && status.reposVisible !== null && status.canReadReposHint;
  const canWriteControlledBranches = repositoriesVisible && status.canWriteReposHint;
  const canAdminOrganization = targetOrgAccessible && status.canAdminOrgHint;

  return {
    organization: TARGET_ORGANIZATION,
    url: `https://github.com/${TARGET_ORGANIZATION}`,
    shortDescription: TARGET_ORGANIZATION_SHORT_DESCRIPTION,
    longDescription: TARGET_ORGANIZATION_LONG_DESCRIPTION,
    profileRepository: `${TARGET_ORGANIZATION}/.github`,
    profileReadmePath: 'Migration/github/chainsolutions-wealthtech/.github/profile/README.md',
    activationRunbookPath: 'Migration/github/chainsolutions-wealthtech/ORG_ACTIVATION_RUNBOOK.md',
    firstIntegrationIndexPath: 'Migration/index/CHAINSOLUTIONS_WEALTHTECH_FIRST_INTEGRATION.md',
    bootstrapPackagePath: 'Migration/github/chainsolutions-wealthtech/ORG_BOOTSTRAP_PACKAGE.json',
    directIntegrationBranch: 'mcp/org-profile-bootstrap',
    directIntegrationMode: targetOrgAccessible ? 'branch_pr_required' : 'blocked_until_org_access',
    accessSignals: {
      configuredOrg,
      connectedLogin: status.login,
      targetOrgAccessible,
      repositoriesVisible,
      canWriteControlledBranches,
      canAdminOrganization
    },
    requiredSignals: [
      'GitHub App or explicit organization-scoped token is authorized on chainsolutions-wealthtech.',
      'The MCP connector can see chainsolutions-wealthtech as an organization account.',
      'The MCP connector can list or create chainsolutions-wealthtech/.github.',
      'Writes are limited to mcp/org-profile-bootstrap and reviewed through a pull request.'
    ],
    nextSteps: targetOrgAccessible ? [
      'Create or open chainsolutions-wealthtech/.github.',
      'Create branch mcp/org-profile-bootstrap.',
      'Add profile/README.md from the prepared migration artifact.',
      'Open a pull request to the default branch with no direct main write.'
    ] : [
      'Install or authorize the GitHub App on chainsolutions-wealthtech.',
      'Re-run MCP onboarding until targetOrgAccessible is true.',
      'Keep the prepared organization profile and runbook in Patricked-code/MCP until direct access exists.'
    ],
    safetyRules: [
      'No raw token in Git, logs, audit events, or generated MCP files.',
      'No direct write to main or master.',
      'No SuperAdmin action without master MCP token validation.',
      'No server secret or raw private path in the public organization profile.'
    ]
  };
}
