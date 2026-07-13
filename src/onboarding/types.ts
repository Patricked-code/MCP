export type OnboardingActorType =
  | 'human_owner'
  | 'human_admin'
  | 'chatgpt'
  | 'configcloud'
  | 'claude'
  | 'codex'
  | 'server_agent'
  | 'readonly_agent'
  | 'deployment_agent'
  | 'audit_agent'
  | 'service'
  | 'unknown';

export type OnboardingRole =
  | 'readonly'
  | 'project_manager_controlled_write'
  | 'superadmin'
  | 'architect_supervisor'
  | 'repo_connector'
  | 'technical_executor'
  | 'documentation_agent'
  | 'audit';

export type OnboardingChoice = 'A' | 'B' | 'C';

export type OnboardingQuestion = {
  id: string;
  title: string;
  body: string;
  choices: Array<{
    key: OnboardingChoice;
    label: string;
    recommended?: boolean;
    blockedWithoutSuperAdmin?: boolean;
  }>;
  defaultChoice: OnboardingChoice;
};

export type OnboardingActor = {
  actorId: string;
  actorName: string;
  actorType: OnboardingActorType;
  role: OnboardingRole;
  source: 'web' | 'api' | 'configcloud' | 'cli' | 'unknown';
  mcpTokenId: string | null;
  isKnown: boolean;
  firstConnection: boolean;
  createdAt: string;
  lastSeenAt: string;
  requiresHumanApproval: boolean;
};

export type GitHubRightsSummary = {
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

export type McpAgentProfile = {
  agentId: string;
  agentName: string;
  agentType: OnboardingActorType;
  role: OnboardingRole;
  mcpRights: string[];
  githubRightsAllowed: string[];
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
  history: string[];
};

export type RepoFootprintStatus = 'not_configured' | 'partial' | 'ready' | 'needs_review';

export type RepoFootprintReport = {
  owner: string;
  repo: string;
  defaultBranch: string;
  visibility: 'public' | 'private' | 'internal' | 'unknown';
  permissions: {
    pull: boolean;
    push: boolean;
    admin: boolean;
  };
  presentFiles: string[];
  missingFiles: string[];
  mcpStatus: RepoFootprintStatus;
  recommendations: string[];
  canBootstrapOnBranch: boolean;
};

export type ServerMappingCandidate = {
  projectKey: string;
  githubOwner: string;
  githubRepo: string;
  officialBranch: string;
  serverId: string;
  serverName: string;
  serverPath: string;
  environment: string;
  publicDomain: string | null;
  runtime: string;
  serviceName: string | null;
  requiresHumanApprovalForDeploy: boolean;
  status: 'unknown' | 'candidate' | 'linked' | 'stale' | 'blocked';
  notes: string[];
};

export type OnboardingAuditEvent = {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorType: OnboardingActorType;
  githubLogin: string | null;
  githubOrg: string | null;
  repo: string | null;
  action: string;
  result: 'success' | 'warning' | 'blocked' | 'error';
  warnings: string[];
  errors: string[];
  metadata: Record<string, unknown>;
};

export type OnboardingSnapshot = {
  actor: OnboardingActor;
  rights: GitHubRightsSummary;
  questions: OnboardingQuestion[];
  agents: McpAgentProfile[];
  nextActions: string[];
};
