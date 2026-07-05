import { randomUUID } from 'node:crypto';
import type { GitHubConnectionStatus } from '../github/connection.js';
import {
  writeGitRegistry,
  type GitRegistry,
  type RegistryAgentProfileEntry,
  type RegistryOnboardingSession
} from '../github/registry.js';
import { getDefaultAgentProfiles, createAgentProfile } from './agents.js';
import { createAuditTrace, auditTraceToRegistryEvent, listOnboardingAudit } from './audit.js';
import { identifyActor } from './identity.js';
import { buildOnboardingQuestions, validateQuestionAnswer } from './questions.js';
import { buildOrganizationBootstrapPackage, prepareOrganizationProfileBootstrap } from './organization.js';
import { buildRegistryRepoFootprints, inspectLocalRepoFootprint } from './repoFootprint.js';
import { evaluateRights } from './rights.js';
import { createServerMappingTemplate, renderServerMapJson } from './serverMapping.js';
export {
  loadBlockerResolutionRunbook,
  summarizeBlockerResolutionRunbook
} from './blockerResolution.js';
export {
  loadExecutionTaskIndex,
  summarizeExecutionTaskIndex
} from './executionTasks.js';
export {
  loadServerInventoryCardIndex,
  summarizeServerInventoryCardIndex
} from './serverInventoryCards.js';
export {
  loadObjectiveTraceabilityIndex,
  summarizeObjectiveTraceabilityIndex
} from './objectiveIndex.js';
export {
  buildSourceIngestionSnapshot,
  loadPdfTextAudit,
  loadSourceRegistry,
  summarizePdfTextAudit,
  summarizeSourceRegistry
} from './sourceRegistry.js';
import type {
  AgentProfile,
  AgentType,
  BootstrapFile,
  BootstrapPlan,
  OnboardingSnapshot,
  OrganizationSecurityPolicyVerification,
  RepoFootprint
} from './types.js';

export { prepareOrganizationProfileBootstrap };

function nowIso(): string {
  return new Date().toISOString();
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function registryAgentToProfile(entry: RegistryAgentProfileEntry): AgentProfile {
  return {
    agentId: entry.agentId,
    agentName: entry.agentName,
    agentType: entry.agentType as AgentType,
    role: entry.role,
    mcpRights: ['read'],
    githubRightsAllowed: ['read'],
    allowedRepos: ['visible-approved'],
    allowedServers: [],
    allowedActions: entry.allowedActions,
    requiresHumanApproval: entry.requiresHumanApproval,
    canReadRepos: true,
    canWriteRepos: false,
    canCreatePlans: true,
    canCreateBranches: false,
    canOpenPullRequests: false,
    canDeploy: false,
    createdAt: entry.createdAt,
    expiresAt: null,
    history: [{ at: entry.createdAt, action: 'created', actor: 'mcp-onboarding' }]
  };
}

async function recordOnboardingAudit(input: {
  status: GitHubConnectionStatus;
  registry: GitRegistry;
  source: string;
  userAgent?: string;
  action: string;
  result: 'ok' | 'warning' | 'blocked' | 'error';
  metadata?: Record<string, unknown>;
  at?: string;
}): Promise<GitRegistry> {
  const actor = identifyActor({
    source: input.source,
    mcpTokenId: 'mcp-web-session',
    userAgent: input.userAgent
  }, input.registry);
  const rights = evaluateRights(input.status, input.registry, actor);
  const trace = createAuditTrace({
    actor,
    rights,
    status: input.status,
    action: input.action,
    result: input.result,
    serverLinked: input.registry.repoMappings.length > 0,
    metadata: input.metadata
  }, input.at);

  const nextRegistry: GitRegistry = {
    ...input.registry,
    auditEvents: [...input.registry.auditEvents, auditTraceToRegistryEvent(trace)]
  };
  await writeGitRegistry(nextRegistry);
  return nextRegistry;
}

function nextActions(snapshot: Omit<OnboardingSnapshot, 'nextActions'>, status: GitHubConnectionStatus): string[] {
  const actions: string[] = [];
  if (snapshot.organization.directIntegrationMode === 'blocked_until_org_access') {
    actions.push('Install or authorize the GitHub app on chainsolutions-wealthtech before direct organization configuration.');
  }
  if (snapshot.organization.directIntegrationMode === 'branch_pr_required') {
    actions.push('Prepare chainsolutions-wealthtech/.github on branch mcp/org-profile-bootstrap, then open a pull request.');
  }
  if (snapshot.repos.some((repo) => repo.status !== 'ready')) {
    actions.push('Prepare mcp/onboarding-setup branches for repos missing MCP governance files.');
  }
  if (snapshot.rights.requiresHumanApproval) {
    actions.push('Request human approval before any write, admin, deploy, or official-branch action.');
  }
  actions.push('Keep all generated files secret-free and propose them through pull requests.');
  return actions;
}

export async function buildOnboardingSnapshot(input: {
  status: GitHubConnectionStatus;
  registry: GitRegistry;
  source?: string;
  actorName?: string;
  userAgent?: string;
}): Promise<OnboardingSnapshot> {
  const actor = identifyActor({
    actorName: input.actorName,
    source: input.source ?? 'mcp-web:/git/onboarding',
    mcpTokenId: 'mcp-web-session',
    userAgent: input.userAgent
  }, input.registry);
  const rights = evaluateRights(input.status, input.registry, actor);
  const questions = buildOnboardingQuestions(actor, rights);
  const organization = buildOrganizationBootstrapPackage(input.status);
  const localRepo = await inspectLocalRepoFootprint();
  const repos = buildRegistryRepoFootprints(input.status, input.registry, localRepo);
  const agents = [...getDefaultAgentProfiles(), ...input.registry.agentProfiles.map(registryAgentToProfile)];
  const audit = listOnboardingAudit(input.registry);
  const partial = { organization, actor, rights, questions, repos, agents, audit };
  return { ...partial, nextActions: nextActions(partial, input.status) };
}

export async function createOnboardingSession(input: {
  status: GitHubConnectionStatus;
  registry: GitRegistry;
  source: string;
  userAgent?: string;
}): Promise<{ session: RegistryOnboardingSession; snapshot: OnboardingSnapshot; registry: GitRegistry }> {
  const snapshot = await buildOnboardingSnapshot(input);
  const at = nowIso();
  const session: RegistryOnboardingSession = {
    id: randomUUID(),
    actorId: snapshot.actor.actorId,
    source: input.source,
    startedAt: at,
    updatedAt: at,
    status: 'started',
    answers: []
  };
  const trace = createAuditTrace({
    actor: snapshot.actor,
    rights: snapshot.rights,
    status: input.status,
    action: 'session_started',
    result: snapshot.rights.errors.length > 0 ? 'warning' : 'ok',
    serverLinked: input.registry.repoMappings.length > 0
  }, at);

  const nextRegistry: GitRegistry = {
    ...input.registry,
    onboardingSessions: [session, ...input.registry.onboardingSessions],
    auditEvents: [...input.registry.auditEvents, auditTraceToRegistryEvent(trace)]
  };
  await writeGitRegistry(nextRegistry);
  return { session, snapshot, registry: nextRegistry };
}

export async function recordOnboardingAnswer(input: {
  status: GitHubConnectionStatus;
  registry: GitRegistry;
  sessionId: string;
  questionId: string;
  choiceId: string;
  source: string;
}): Promise<{ accepted: boolean; reason?: string; session?: RegistryOnboardingSession; snapshot: OnboardingSnapshot; registry: GitRegistry }> {
  const snapshot = await buildOnboardingSnapshot(input);
  const validation = validateQuestionAnswer(snapshot.questions, input.questionId, input.choiceId);
  const at = nowIso();
  const sessions = input.registry.onboardingSessions.map((session) => {
    if (session.id !== input.sessionId) return session;
    return {
      ...session,
      updatedAt: at,
      status: validation.accepted ? 'in_progress' as const : 'blocked' as const,
      answers: [...session.answers, {
        questionId: input.questionId,
        choiceId: validation.normalizedChoiceId ?? input.choiceId,
        answeredAt: at,
        actorId: snapshot.actor.actorId,
        accepted: validation.accepted,
        reason: validation.reason
      }]
    };
  });
  const session = sessions.find((candidate) => candidate.id === input.sessionId);

  const trace = createAuditTrace({
    actor: snapshot.actor,
    rights: snapshot.rights,
    status: input.status,
    action: 'answer_recorded',
    result: validation.accepted ? 'ok' : 'blocked',
    serverLinked: input.registry.repoMappings.length > 0,
    metadata: {
      sessionId: input.sessionId,
      questionId: input.questionId,
      choiceId: input.choiceId,
      reason: validation.reason
    }
  }, at);

  const nextRegistry: GitRegistry = {
    ...input.registry,
    onboardingSessions: sessions,
    auditEvents: [...input.registry.auditEvents, auditTraceToRegistryEvent(trace)]
  };
  await writeGitRegistry(nextRegistry);
  return { accepted: validation.accepted, reason: validation.reason, session, snapshot, registry: nextRegistry };
}

export function getAccountDetail(registry: GitRegistry, account: string) {
  const normalized = account.trim().toLowerCase();
  return registry.accounts.find((entry) =>
    entry.login.toLowerCase() === normalized ||
    entry.id.toLowerCase() === normalized ||
    (entry.org ?? '').toLowerCase() === normalized
  ) ?? null;
}

export function getRepoDetail(repos: RepoFootprint[], owner: string, repo: string): RepoFootprint | null {
  return repos.find((entry) => entry.owner.toLowerCase() === owner.toLowerCase() && entry.name.toLowerCase() === repo.toLowerCase()) ?? null;
}

function markdown(title: string, body: string): string {
  return `# ${title}\n\n${body.trim()}\n`;
}

export function prepareRepoBootstrap(repo: RepoFootprint): BootstrapPlan {
  const branch = 'mcp/onboarding-setup';
  const mapping = createServerMappingTemplate({
    projectName: repo.name,
    owner: repo.owner,
    repo: repo.name,
    defaultBranch: repo.defaultBranch
  });
  const baseFiles: BootstrapFile[] = [
    {
      path: '.mcp/manifest.json',
      content: `${JSON.stringify({
        version: 1,
        projectName: repo.name,
        owner: repo.owner,
        repo: repo.name,
        defaultBranch: repo.defaultBranch,
        mcpStatus: 'partial',
        createdAt: nowIso(),
        modules: ['identity', 'rights', 'questions', 'repoFootprint', 'agents', 'serverMapping', 'audit']
      }, null, 2)}\n`
    },
    {
      path: '.mcp/permissions.json',
      content: `${JSON.stringify({
        version: 1,
        allowedBranches: [branch],
        forbiddenBranches: ['main', 'master', repo.defaultBranch],
        humanApprovalRequired: true,
        directMainWrites: false,
        agents: ['chatgpt-architect', 'claude-docs', 'codex-technical', 'audit-agent']
      }, null, 2)}\n`
    },
    {
      path: '.mcp/agents.json',
      content: `${JSON.stringify({ version: 1, agents: getDefaultAgentProfiles().map((agent) => ({
        agentId: agent.agentId,
        agentName: agent.agentName,
        role: agent.role,
        requiresHumanApproval: agent.requiresHumanApproval,
        canDeploy: agent.canDeploy
      })) }, null, 2)}\n`
    },
    { path: '.mcp/server-map.json', content: renderServerMapJson(mapping) },
    {
      path: '.mcp/onboarding.json',
      content: `${JSON.stringify({
        version: 1,
        status: 'prepared',
        actor: 'mcp-onboarding-engine',
        decisions: [],
        nextStep: 'Review generated files, then open a pull request from mcp/onboarding-setup.',
        updatedAt: nowIso()
      }, null, 2)}\n`
    },
    {
      path: 'MCP_PROJECT.md',
      content: markdown('MCP Project - ' + repo.name, 'This repository participates in the ChainSolutions WealthTech MCP governance perimeter. Agents must work through controlled branches and pull requests.')
    },
    {
      path: 'MCP_AGENT_RULES.md',
      content: markdown('MCP Agent Rules', 'Agents may read approved context, propose plans, create controlled branches, and open pull requests. Deployment, secrets access, direct main writes, and destructive operations require explicit human validation.')
    },
    {
      path: 'MCP_REPO_INVENTORY.md',
      content: markdown('MCP Repo Inventory', 'Inventory is pending. Record critical folders, scripts, routes, dependencies, and risk points before enabling write automation.')
    },
    {
      path: 'MCP_SERVER_MAPPING.md',
      content: markdown('MCP Server Mapping', 'Server mapping is pending review. Do not publish raw secrets, private keys, dumps, or sensitive operational paths.')
    }
  ];

  return {
    owner: repo.owner,
    repo: repo.name,
    branch,
    canWrite: repo.canCreateOnboardingBranch,
    mode: repo.canCreateOnboardingBranch ? 'branch_pr_required' : 'ready_to_copy',
    files: baseFiles.filter((file) => repo.missingFiles.includes(file.path)),
    warnings: [
      'Never write these files directly to main.',
      'Review generated placeholders before opening a pull request.',
      'Keep raw server inventories and secrets out of public repositories.'
    ]
  };
}

export async function prepareAndRecordRepoBootstrap(input: {
  status: GitHubConnectionStatus;
  registry: GitRegistry;
  repo: RepoFootprint;
  source: string;
  userAgent?: string;
}): Promise<{ bootstrap: BootstrapPlan; registry: GitRegistry }> {
  const bootstrap = prepareRepoBootstrap(input.repo);
  const nextRegistry = await recordOnboardingAudit({
    status: input.status,
    registry: input.registry,
    source: input.source,
    userAgent: input.userAgent,
    action: 'repo_bootstrap_prepared',
    result: bootstrap.canWrite ? 'ok' : 'warning',
    metadata: {
      repository: `${input.repo.owner}/${input.repo.name}`,
      owner: input.repo.owner,
      repo: input.repo.name,
      branch: bootstrap.branch,
      mode: bootstrap.mode,
      canWrite: bootstrap.canWrite,
      files: bootstrap.files.map((file) => file.path),
      fileCount: bootstrap.files.length,
      missingFileCount: input.repo.missingFiles.length,
      warnings: bootstrap.warnings
    }
  });

  return { bootstrap, registry: nextRegistry };
}

export async function prepareAndRecordOrganizationProfileBootstrap(input: {
  status: GitHubConnectionStatus;
  registry: GitRegistry;
  source: string;
  userAgent?: string;
}): Promise<{ bootstrap: ReturnType<typeof prepareOrganizationProfileBootstrap>; registry: GitRegistry }> {
  const bootstrap = prepareOrganizationProfileBootstrap(input.status);
  const nextRegistry = await recordOnboardingAudit({
    status: input.status,
    registry: input.registry,
    source: input.source,
    userAgent: input.userAgent,
    action: 'organization_bootstrap_prepared',
    result: bootstrap.blockedReason ? 'blocked' : 'ok',
    metadata: {
      organization: bootstrap.organization.organization,
      repository: bootstrap.repository,
      branch: bootstrap.branch,
      mode: bootstrap.mode,
      files: bootstrap.files.map((file) => file.path),
      fileCount: bootstrap.files.length,
      targetOrgAccessible: bootstrap.organization.accessSignals.targetOrgAccessible,
      twoFactorRequirement: bootstrap.organization.securitySettings.twoFactorRequirement.desiredState,
      twoFactorRequirementCurrentState: bootstrap.organization.securitySettings.twoFactorRequirement.currentState,
      twoFactorRequirementChangeMode: bootstrap.organization.securitySettings.twoFactorRequirement.changeMode,
      blockedReason: bootstrap.blockedReason,
      warnings: bootstrap.warnings
    }
  });

  return { bootstrap, registry: nextRegistry };
}

export async function recordOrganizationSecurityPolicyVerification(input: {
  status: GitHubConnectionStatus;
  registry: GitRegistry;
  ownerConfirmed: boolean;
  twoFactorRequirementEnabled: boolean;
  source: string;
  userAgent?: string;
}): Promise<{ policy: OrganizationSecurityPolicyVerification; registry: GitRegistry }> {
  const organization = buildOrganizationBootstrapPackage(input.status);
  const twoFactorRequirement = organization.securitySettings.twoFactorRequirement;
  const compliant = input.ownerConfirmed && input.twoFactorRequirementEnabled === false;
  const verifiedAt = nowIso();
  const policy: OrganizationSecurityPolicyVerification = {
    organization: organization.organization,
    targetOrgAccessible: organization.accessSignals.targetOrgAccessible,
    desiredState: twoFactorRequirement.desiredState,
    reportedState: input.twoFactorRequirementEnabled ? 'enabled_by_owner_report' : 'disabled_by_owner_report',
    ownerConfirmed: input.ownerConfirmed,
    compliant,
    changeMode: twoFactorRequirement.changeMode,
    ownerActionRequired: twoFactorRequirement.ownerActionRequired,
    settingsUrl: twoFactorRequirement.settingsUrl,
    verifiedAt,
    caveats: twoFactorRequirement.caveats
  };

  const nextRegistry = await recordOnboardingAudit({
    status: input.status,
    registry: input.registry,
    source: input.source,
    userAgent: input.userAgent,
    action: 'organization_security_policy_verified',
    result: compliant ? 'ok' : 'blocked',
    metadata: {
      organization: organization.organization,
      policy: 'organization_required_2fa',
      desiredState: twoFactorRequirement.desiredState,
      reportedState: policy.reportedState,
      ownerConfirmed: input.ownerConfirmed,
      compliant,
      targetOrgAccessible: organization.accessSignals.targetOrgAccessible,
      changeMode: twoFactorRequirement.changeMode,
      settingsUrl: twoFactorRequirement.settingsUrl,
      caveats: twoFactorRequirement.caveats
    },
    at: verifiedAt
  });

  return { policy, registry: nextRegistry };
}

export async function createAndRecordAgent(input: {
  registry: GitRegistry;
  agentName: string;
  agentType: AgentType;
  role: string;
  actor: string;
}): Promise<{ agent: AgentProfile; registry: GitRegistry }> {
  const agent = createAgentProfile(input);
  const entry: RegistryAgentProfileEntry = {
    agentId: agent.agentId,
    agentName: agent.agentName,
    agentType: agent.agentType,
    role: agent.role,
    createdAt: agent.createdAt,
    requiresHumanApproval: agent.requiresHumanApproval,
    allowedActions: agent.allowedActions
  };
  const nextRegistry: GitRegistry = {
    ...input.registry,
    agentProfiles: [entry, ...input.registry.agentProfiles]
  };
  await writeGitRegistry(nextRegistry);
  return { agent, registry: nextRegistry };
}

export function filterAuditEvents(registry: GitRegistry, filters: { actor?: string; type?: string; limit?: number }) {
  const limit = filters.limit ?? 100;
  return registry.auditEvents
    .filter((event) => !filters.actor || event.actor.toLowerCase().includes(filters.actor.toLowerCase()))
    .filter((event) => !filters.type || event.type.toLowerCase().includes(filters.type.toLowerCase()))
    .slice(-limit)
    .reverse();
}

export function renderOnboardingSnapshotHtml(snapshot: OnboardingSnapshot): string {
  const repoRows = snapshot.repos.map((repo) => `<tr>
    <td>${escapeHtml(`${repo.owner}/${repo.name}`)}</td>
    <td>${escapeHtml(repo.status)}</td>
    <td>${escapeHtml(repo.presentFiles.length)}</td>
    <td>${escapeHtml(repo.missingFiles.length)}</td>
    <td>${repo.canCreateOnboardingBranch ? 'yes' : 'no'}</td>
  </tr>`).join('');
  const questionItems = snapshot.questions.map((question) => `<li><strong>${escapeHtml(question.title)}</strong> - default ${escapeHtml(question.defaultChoiceId)}</li>`).join('');
  const actionItems = snapshot.nextActions.map((action) => `<li>${escapeHtml(action)}</li>`).join('');
  const orgSignals = snapshot.organization.accessSignals;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>MCP WealthTech - Onboarding</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; margin: 32px; color: #111827; line-height: 1.45; }
    a { color: #1d4ed8; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap: 16px; max-width: 1280px; }
    .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; background: #fff; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f9fafb; }
    code { background: #f3f4f6; padding: 2px 5px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>MCP WealthTech - Onboarding</h1>
  <p><a href="/dashboard">Dashboard</a> · <a href="/git">Git</a> · <a href="/git/status">Registre JSON</a> · <a href="/git/agents">Agents JSON</a> · <a href="/git/audit">Audit JSON</a></p>
  <div class="grid">
    <section class="card">
      <h2>Acteur</h2>
      <p><strong>${escapeHtml(snapshot.actor.actorName)}</strong></p>
      <p>Type: <code>${escapeHtml(snapshot.actor.actorType)}</code></p>
      <p>Approbation humaine: <strong>${snapshot.actor.requiresHumanApproval ? 'required' : 'not required'}</strong></p>
    </section>
    <section class="card">
      <h2>Droits</h2>
      <p>Lecture repos: <strong>${snapshot.rights.canReadRepos ? 'yes' : 'no'}</strong></p>
      <p>Ecriture branche: <strong>${snapshot.rights.canWriteBranch ? 'yes' : 'no'}</strong></p>
      <p>PR: <strong>${snapshot.rights.canOpenPullRequest ? 'yes' : 'no'}</strong></p>
      <p>Admin org: <strong>${snapshot.rights.isOrgAdmin ? 'yes' : 'no'}</strong></p>
    </section>
    <section class="card">
      <h2>Organisation cible</h2>
      <p><strong>${escapeHtml(snapshot.organization.organization)}</strong></p>
      <p>Mode direct: <code>${escapeHtml(snapshot.organization.directIntegrationMode)}</code></p>
      <p>Org accessible: <strong>${orgSignals.targetOrgAccessible ? 'yes' : 'no'}</strong></p>
      <p>Branche prevue: <code>${escapeHtml(snapshot.organization.directIntegrationBranch)}</code></p>
    </section>
  </div>
  <section class="card">
    <h2>Questions</h2>
    <ol>${questionItems}</ol>
  </section>
  <section class="card">
    <h2>Repositories</h2>
    <table>
      <thead><tr><th>Repo</th><th>Statut</th><th>Fichiers presents</th><th>Fichiers manquants</th><th>Branche onboarding</th></tr></thead>
      <tbody>${repoRows}</tbody>
    </table>
  </section>
  <section class="card">
    <h2>Prochaines actions</h2>
    <ul>${actionItems}</ul>
  </section>
</body>
</html>`;
}
