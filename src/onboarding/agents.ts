import type { McpAgentProfile, OnboardingActorType, OnboardingRole } from './types.js';

function nowIso(): string {
  return new Date().toISOString();
}

function agent(
  agentId: string,
  agentName: string,
  agentType: OnboardingActorType,
  role: OnboardingRole,
  overrides: Partial<McpAgentProfile>
): McpAgentProfile {
  return {
    agentId,
    agentName,
    agentType,
    role,
    mcpRights: [],
    githubRightsAllowed: [],
    allowedRepos: [],
    allowedServers: [],
    allowedActions: [],
    requiresHumanApproval: true,
    canReadRepos: true,
    canWriteRepos: false,
    canCreatePlans: true,
    canCreateBranches: false,
    canOpenPullRequests: false,
    canDeploy: false,
    createdAt: nowIso(),
    expiresAt: null,
    history: [],
    ...overrides
  };
}

export function getDefaultAgentProfiles(): McpAgentProfile[] {
  return [
    agent('mcp_superadmin', 'SuperAdmin MCP', 'human_owner', 'superadmin', {
      mcpRights: ['mcp.read', 'mcp.audit', 'mcp.configure', 'mcp.agent.create', 'mcp.repo.bootstrap', 'mcp.server.map', 'mcp.superadmin'],
      githubRightsAllowed: ['read', 'write_branch', 'open_pull_request', 'admin_after_validation'],
      allowedActions: ['read', 'audit', 'configure', 'create_agent', 'bootstrap_repo', 'map_server'],
      canWriteRepos: true,
      canCreateBranches: true,
      canOpenPullRequests: true
    }),
    agent('mcp_admin_human', 'Admin humain', 'human_admin', 'project_manager_controlled_write', {
      mcpRights: ['mcp.read', 'mcp.audit', 'mcp.configure', 'mcp.repo.bootstrap', 'mcp.server.map'],
      githubRightsAllowed: ['read', 'write_branch', 'open_pull_request'],
      allowedActions: ['read', 'audit', 'configure', 'bootstrap_repo', 'map_server'],
      canWriteRepos: true,
      canCreateBranches: true,
      canOpenPullRequests: true
    }),
    agent('mcp_agent_chatgpt', 'ChatGPT', 'chatgpt', 'architect_supervisor', {
      mcpRights: ['mcp.read', 'mcp.audit', 'mcp.configure'],
      githubRightsAllowed: ['read', 'branch_write_with_approval'],
      allowedActions: ['read', 'plan', 'document', 'propose'],
      canWriteRepos: false,
      canCreateBranches: false,
      canOpenPullRequests: false,
      canDeploy: false
    }),
    agent('mcp_agent_configcloud', 'ConfigCloud', 'configcloud', 'repo_connector', {
      mcpRights: ['mcp.read', 'mcp.audit', 'mcp.configure', 'mcp.server.map'],
      githubRightsAllowed: ['read', 'branch_write_with_approval'],
      allowedActions: ['detect_remote', 'map_repo', 'inventory', 'propose_bootstrap'],
      canWriteRepos: false,
      canCreateBranches: false,
      canOpenPullRequests: false
    }),
    agent('mcp_agent_claude', 'Claude', 'claude', 'documentation_agent', {
      mcpRights: ['mcp.read', 'mcp.audit', 'mcp.configure'],
      githubRightsAllowed: ['read', 'branch_write_with_approval'],
      allowedActions: ['read', 'document', 'summarize', 'propose'],
      canWriteRepos: false
    }),
    agent('mcp_agent_codex', 'Codex', 'codex', 'technical_executor', {
      mcpRights: ['mcp.read', 'mcp.audit', 'mcp.configure', 'mcp.repo.bootstrap'],
      githubRightsAllowed: ['read', 'write_branch', 'open_pull_request'],
      allowedActions: ['read', 'code', 'test', 'fix', 'open_pull_request'],
      canWriteRepos: true,
      canCreateBranches: true,
      canOpenPullRequests: true
    }),
    agent('mcp_agent_server', 'Agent serveur', 'server_agent', 'technical_executor', {
      mcpRights: ['mcp.read', 'mcp.audit', 'mcp.server.map'],
      githubRightsAllowed: ['read'],
      allowedActions: ['read_server_path', 'map_server', 'report'],
      canCreatePlans: false
    }),
    agent('mcp_agent_readonly', 'Agent lecture seule', 'readonly_agent', 'readonly', {
      mcpRights: ['mcp.read', 'mcp.audit'],
      githubRightsAllowed: ['read'],
      allowedActions: ['read', 'audit'],
      canCreatePlans: false
    }),
    agent('mcp_agent_deploy', 'Agent déploiement', 'deployment_agent', 'technical_executor', {
      mcpRights: ['mcp.read', 'mcp.audit', 'mcp.deploy.prepare'],
      githubRightsAllowed: ['read'],
      allowedActions: ['prepare_deploy'],
      canDeploy: false
    }),
    agent('mcp_agent_audit', 'Agent audit', 'audit_agent', 'audit', {
      mcpRights: ['mcp.read', 'mcp.audit'],
      githubRightsAllowed: ['read'],
      allowedActions: ['audit', 'report'],
      canCreatePlans: false
    })
  ];
}
