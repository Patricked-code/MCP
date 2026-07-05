import type { GitHubConnectionStatus } from '../github/connection.js';
import type { OrganizationBootstrapPackage, OrganizationProfileBootstrapPlan } from './types.js';

export const TARGET_ORGANIZATION = 'chainsolutions-wealthtech';

export const TARGET_ORGANIZATION_SHORT_DESCRIPTION =
  'Centre de gouvernance GitHub/MCP pour l ecosysteme ChainSolutions WealthTech: migration, documentation, agents IA, mappings repo-serveur et audit securise.';

export const TARGET_ORGANIZATION_LONG_DESCRIPTION =
  [
    'chainsolutions-wealthtech centralise, versionne, documente et gouverne l ecosysteme ChainSolutions / WealthTech.',
    'L organisation rassemble progressivement les repositories, documents, conversations utiles, prompts, consignes, profils d agents, mappings repo-serveur, historiques de decisions, audits et fichiers de suivi.',
    'Le MCP WealthTech est le superviseur central entre GitHub, les serveurs, les agents IA et la memoire projet. Il relie la source versionnee GitHub a la source d execution serveur, sans exposer de secrets ni donner d acces SSH libre aux agents.'
  ].join(' ');

export const TARGET_ORGANIZATION_PROFILE_README = `# ChainSolutions WealthTech

\`chainsolutions-wealthtech\` est l'organisation GitHub de gouvernance pour l'ecosysteme ChainSolutions / WealthTech.

Elle centralise progressivement:

- les repositories applicatifs et MCP;
- les archives de migration;
- les documents de gouvernance projet;
- les prompts, consignes et profils d'agents IA;
- les mappings entre repositories GitHub, serveurs, domaines et environnements;
- les historiques de decisions, audits et points de reprise;
- les fichiers de suivi necessaires au Loop Engineering.

## Role du MCP

Le MCP WealthTech est le superviseur central entre GitHub, les serveurs et les agents IA. Il doit:

- identifier les acteurs connectes;
- verifier les droits MCP et GitHub;
- lister les repositories visibles;
- detecter les fichiers \`.mcp\` manquants;
- lier les repositories aux dossiers serveur autorises;
- creer des profils d'agents ChatGPT, Claude, Codex, audit, serveur et deploiement;
- ecrire uniquement sur branches controlees;
- ouvrir des pull requests;
- auditer les connexions et actions sensibles;
- empecher toute action dangereuse, destructive ou non validee.

## Regles de securite

- Aucun token brut dans Git.
- Aucun secret dans les fichiers \`.mcp\`.
- Aucune ecriture directe sur \`main\` pour les changements MCP sensibles.
- Toute action d'ecriture passe par une branche dediee et une pull request.
- Les inventaires serveur bruts et les exports sensibles restent prives.
- Les agents IA ne recoivent pas d'acces SSH libre.

## Objectif

Faire de GitHub la source versionnee officielle, du serveur la source d'execution reelle, et du MCP le lien de gouvernance entre les deux.
`;

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
    securitySettings: {
      twoFactorRequirement: {
        desiredState: 'disabled',
        currentState: targetOrgAccessible ? 'requires_owner_verification' : 'unknown_until_org_owner_access',
        changeMode: 'manual_owner_settings_required',
        ownerActionRequired: true,
        settingsUrl: `https://github.com/organizations/${TARGET_ORGANIZATION}/settings/security`,
        rationale: 'Owner request: do not enforce organization-level two-factor authentication for direct users during the first integration.',
        caveats: [
          'This does not override GitHub.com account-level mandatory 2FA enrollment for users selected by GitHub.',
          'This lowers organization access security and should be compensated with least-privilege roles, scoped tokens, pull requests, and audit logs.',
          'The MCP connector cannot verify or change this setting until it has organization-owner access.'
        ],
        verificationSteps: [
          'Open the organization settings as an owner.',
          'Go to Authentication security.',
          'Confirm that Require two-factor authentication for everyone in your organization is not enabled.',
          'Record the verification in the MCP audit log without storing screenshots, tokens, or personal recovery codes.'
        ]
      }
    },
    requiredSignals: [
      'GitHub App or explicit organization-scoped token is authorized on chainsolutions-wealthtech.',
      'The MCP connector can see chainsolutions-wealthtech as an organization account.',
      'The MCP connector can list or create chainsolutions-wealthtech/.github.',
      'Writes are limited to mcp/org-profile-bootstrap and reviewed through a pull request.',
      'An organization owner has manually confirmed that organization-level required 2FA is disabled if this policy is still desired.'
    ],
    nextSteps: targetOrgAccessible ? [
      'Create or open chainsolutions-wealthtech/.github.',
      'Have an organization owner verify Authentication security and leave organization-level required 2FA disabled if this policy is still desired.',
      'Create branch mcp/org-profile-bootstrap.',
      'Add profile/README.md from the prepared migration artifact.',
      'Open a pull request to the default branch with no direct main write.'
    ] : [
      'Install or authorize the GitHub App on chainsolutions-wealthtech.',
      'Have an organization owner verify Authentication security and leave organization-level required 2FA disabled if this policy is still desired.',
      'Re-run MCP onboarding until targetOrgAccessible is true.',
      'Keep the prepared organization profile and runbook in Patricked-code/MCP until direct access exists.'
    ],
    safetyRules: [
      'No raw token in Git, logs, audit events, or generated MCP files.',
      'No direct write to main or master.',
      'No SuperAdmin action without master MCP token validation.',
      'No server secret or raw private path in the public organization profile.',
      'Organization-level required 2FA must not be changed by automation without explicit owner validation and audit.'
    ]
  };
}

export function prepareOrganizationProfileBootstrap(status: GitHubConnectionStatus): OrganizationProfileBootstrapPlan {
  const organization = buildOrganizationBootstrapPackage(status);
  const blocked = organization.directIntegrationMode === 'blocked_until_org_access';

  return {
    organization,
    repository: organization.profileRepository,
    branch: organization.directIntegrationBranch,
    mode: organization.directIntegrationMode,
    files: [
      {
        path: 'profile/README.md',
        content: TARGET_ORGANIZATION_PROFILE_README
      }
    ],
    pullRequest: {
      title: 'Bootstrap ChainSolutions WealthTech organization profile',
      body: [
        '## Summary',
        '',
        '- Add the public organization profile for chainsolutions-wealthtech.',
        '- Document the MCP governance role and security constraints.',
        '- Keep the change isolated on mcp/org-profile-bootstrap.',
        '',
        '## Verification',
        '',
        '- Confirm no raw token, server secret, private key, or raw server inventory is included.',
        '- Confirm the branch is not main or master.',
        '- Confirm the profile content matches the MCP activation runbook.'
      ].join('\n')
    },
    blockedReason: blocked
      ? 'The MCP connector cannot access chainsolutions-wealthtech yet; install or authorize the GitHub App on the organization before direct creation.'
      : null,
    warnings: [
      'Do not write directly to main.',
      'Use mcp/org-profile-bootstrap and open a pull request.',
      'Keep the organization profile public-safe and secret-free.',
      ...(blocked ? ['Direct organization write remains blocked until targetOrgAccessible is true.'] : [])
    ]
  };
}
