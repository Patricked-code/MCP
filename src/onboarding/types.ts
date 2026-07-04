import type { GitHubAccessMode } from '../github/registry.js';

export type ActorType =
  | 'human_owner'
  | 'human_admin'
  | 'chatgpt'
  | 'claude'
  | 'codex'
  | 'server_agent'
  | 'readonly_agent'
  | 'audit_agent'
  | 'deployment_agent'
  | 'automation_service'
  | 'unknown';

export type ActorIdentity = {
  actorId: string;
  actorName: string;
  actorType: ActorType;
  source: string;
  mcpTokenId: string;
  isKnown: boolean;
  firstConnection: boolean;
  createdAt: string;
  lastSeenAt: string;
  requiresHumanApproval: boolean;
};

export type RightsReport = {
  canReadAccount: boolean;
  canReadOrgs: boolean;
  canReadRepos: boolean;
  canReadBranches: boolean;
  canReadFiles: boolean;
  canCreateBranch: boolean;
  canWriteBranch: boolean;
  canOpenPullRequest: boolean;
  canReadActions: boolean;
  canReadSecretsMetadata: boolean;
  isRepoAdmin: boolean;
  isOrgAdmin: boolean;
  isWriteSafe: boolean;
  requiresHumanApproval: boolean;
  warnings: string[];
  errors: string[];
};

export type OnboardingChoice = {
  id: 'A' | 'B' | 'C';
  label: string;
  value: string;
  isDefault: boolean;
  allowed: boolean;
  reason?: string;
};

export type OnboardingQuestion = {
  id: string;
  title: string;
  prompt: string;
  defaultChoiceId: 'A' | 'B' | 'C';
  choices: OnboardingChoice[];
};

export type RepoFootprintStatus = 'not_configured' | 'partial' | 'ready' | 'needs_review';

export type RepoFootprint = {
  owner: string;
  name: string;
  defaultBranch: string;
  visibility: 'public' | 'private' | 'internal' | 'unknown';
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canAdmin: boolean;
  };
  presentFiles: string[];
  missingFiles: string[];
  status: RepoFootprintStatus;
  recommendations: string[];
  canCreateOnboardingBranch: boolean;
};

export type AgentType =
  | 'superadmin_mcp'
  | 'human_admin'
  | 'chatgpt'
  | 'claude'
  | 'codex'
  | 'server_agent'
  | 'readonly_agent'
  | 'deployment_agent'
  | 'audit_agent';

export type AgentProfile = {
  agentId: string;
  agentName: string;
  agentType: AgentType;
  role: string;
  mcpRights: GitHubAccessMode[];
  githubRightsAllowed: GitHubAccessMode[];
  allowedRepos: string[];
  allowedServers: string[];
  allowedActions: string[];
  requiresHumanApproval: boolean;
  canReadRepos: boolean;
  canWriteRepos: boolean;
  canCreatePlans: boolean;
  canCreateBranches: boolean;
  canOpenPullRequests: boolean;
  canDeploy: boolean;
  createdAt: string;
  expiresAt: string | null;
  history: Array<{
    at: string;
    action: string;
    actor: string;
  }>;
};

export type ServerMapping = {
  projectName: string;
  repo: string;
  owner: string;
  defaultBranch: string;
  serverPath: string;
  environment: string;
  publicDomain: string | null;
  dockerService: string | null;
  deploymentFiles: string[];
  criticalScripts: string[];
  syncStatus: 'unknown' | 'linked' | 'needs_review' | 'blocked';
  lastCheckedAt: string;
  auditNotes: string[];
};

export type AuditTrace = {
  id: string;
  at: string;
  actor: string;
  actorType: ActorType;
  mcpTokenId: string;
  action: string;
  result: 'ok' | 'warning' | 'blocked' | 'error';
  githubLogin: string | null;
  githubOrg: string | null;
  rights: {
    read: boolean;
    write: boolean;
    admin: boolean;
    orgAdmin: boolean;
  };
  reposVisible: number | null;
  reposWritable: number | null;
  serverLinked: boolean;
  firstConnection: boolean;
  warnings: string[];
  errors: string[];
  metadata?: Record<string, unknown>;
};

export type BootstrapFile = {
  path: string;
  content: string;
};

export type BootstrapPlan = {
  owner: string;
  repo: string;
  branch: string;
  canWrite: boolean;
  mode: 'ready_to_copy' | 'branch_pr_required';
  files: BootstrapFile[];
  warnings: string[];
};

export type OnboardingSnapshot = {
  actor: ActorIdentity;
  rights: RightsReport;
  questions: OnboardingQuestion[];
  repos: RepoFootprint[];
  agents: AgentProfile[];
  audit: AuditTrace[];
  nextActions: string[];
};
