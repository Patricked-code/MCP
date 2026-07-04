import type { AgentProfile, AgentType } from './types.js';

function history(at: string, actor = 'mcp-governance') {
  return [{ at, action: 'profile_template_created', actor }];
}

function profile(input: Omit<AgentProfile, 'createdAt' | 'expiresAt' | 'history'>, at: string): AgentProfile {
  return {
    ...input,
    createdAt: at,
    expiresAt: null,
    history: history(at)
  };
}

export function getDefaultAgentProfiles(at = new Date().toISOString()): AgentProfile[] {
  return [
    profile({
      agentId: 'mcp-superadmin',
      agentName: 'SuperAdmin MCP',
      agentType: 'superadmin_mcp',
      role: 'Master governance token owner',
      mcpRights: ['read', 'write', 'admin', 'org_admin'],
      githubRightsAllowed: ['read', 'write', 'admin', 'org_admin'],
      allowedRepos: ['*'],
      allowedServers: ['*'],
      allowedActions: ['governance_admin', 'approve_sensitive_action', 'create_branch', 'open_pull_request'],
      requiresHumanApproval: false,
      canReadRepos: true,
      canWriteRepos: true,
      canCreatePlans: true,
      canCreateBranches: true,
      canOpenPullRequests: true,
      canDeploy: true
    }, at),
    profile({
      agentId: 'human-admin',
      agentName: 'Admin humain',
      agentType: 'human_admin',
      role: 'Project administration with controlled writes',
      mcpRights: ['read', 'write', 'admin'],
      githubRightsAllowed: ['read', 'write', 'admin'],
      allowedRepos: ['*'],
      allowedServers: ['approved-only'],
      allowedActions: ['create_plan', 'create_branch', 'open_pull_request', 'approve_agent'],
      requiresHumanApproval: false,
      canReadRepos: true,
      canWriteRepos: true,
      canCreatePlans: true,
      canCreateBranches: true,
      canOpenPullRequests: true,
      canDeploy: false
    }, at),
    profile({
      agentId: 'chatgpt-architect',
      agentName: 'ChatGPT',
      agentType: 'chatgpt',
      role: 'Architecte superviseur',
      mcpRights: ['read'],
      githubRightsAllowed: ['read'],
      allowedRepos: ['visible-approved'],
      allowedServers: [],
      allowedActions: ['read_context', 'create_plan', 'propose_documentation'],
      requiresHumanApproval: true,
      canReadRepos: true,
      canWriteRepos: false,
      canCreatePlans: true,
      canCreateBranches: false,
      canOpenPullRequests: false,
      canDeploy: false
    }, at),
    profile({
      agentId: 'claude-docs',
      agentName: 'Claude',
      agentType: 'claude',
      role: 'Redaction longue, documentation, analyse projet',
      mcpRights: ['read', 'write'],
      githubRightsAllowed: ['read', 'write'],
      allowedRepos: ['visible-approved'],
      allowedServers: [],
      allowedActions: ['create_documentation', 'update_markdown_on_mcp_branch', 'propose_corrections'],
      requiresHumanApproval: true,
      canReadRepos: true,
      canWriteRepos: true,
      canCreatePlans: true,
      canCreateBranches: true,
      canOpenPullRequests: true,
      canDeploy: false
    }, at),
    profile({
      agentId: 'codex-technical',
      agentName: 'Codex',
      agentType: 'codex',
      role: 'Agent technique code/test',
      mcpRights: ['read', 'write'],
      githubRightsAllowed: ['read', 'write'],
      allowedRepos: ['visible-approved'],
      allowedServers: ['approved-only'],
      allowedActions: ['edit_code_on_mcp_branch', 'create_tests', 'run_checks', 'open_pull_request'],
      requiresHumanApproval: true,
      canReadRepos: true,
      canWriteRepos: true,
      canCreatePlans: true,
      canCreateBranches: true,
      canOpenPullRequests: true,
      canDeploy: false
    }, at),
    profile({
      agentId: 'server-sync',
      agentName: 'Agent serveur',
      agentType: 'server_agent',
      role: 'Synchronisation serveur et mapping',
      mcpRights: ['read'],
      githubRightsAllowed: ['read'],
      allowedRepos: ['mapped-approved'],
      allowedServers: ['approved-only'],
      allowedActions: ['read_server_inventory', 'produce_server_mapping'],
      requiresHumanApproval: true,
      canReadRepos: true,
      canWriteRepos: false,
      canCreatePlans: true,
      canCreateBranches: false,
      canOpenPullRequests: false,
      canDeploy: false
    }, at),
    profile({
      agentId: 'readonly-agent',
      agentName: 'Agent lecture seule',
      agentType: 'readonly_agent',
      role: 'Read-only inspection',
      mcpRights: ['read'],
      githubRightsAllowed: ['read'],
      allowedRepos: ['visible-approved'],
      allowedServers: ['approved-only'],
      allowedActions: ['read_context', 'read_status'],
      requiresHumanApproval: false,
      canReadRepos: true,
      canWriteRepos: false,
      canCreatePlans: false,
      canCreateBranches: false,
      canOpenPullRequests: false,
      canDeploy: false
    }, at),
    profile({
      agentId: 'deployment-agent',
      agentName: 'Agent deploiement',
      agentType: 'deployment_agent',
      role: 'Deployment proposal only until explicit approval',
      mcpRights: ['read'],
      githubRightsAllowed: ['read'],
      allowedRepos: ['deploy-approved'],
      allowedServers: ['deploy-approved'],
      allowedActions: ['prepare_deployment_plan', 'collect_health_checks'],
      requiresHumanApproval: true,
      canReadRepos: true,
      canWriteRepos: false,
      canCreatePlans: true,
      canCreateBranches: false,
      canOpenPullRequests: false,
      canDeploy: false
    }, at),
    profile({
      agentId: 'audit-agent',
      agentName: 'Agent audit',
      agentType: 'audit_agent',
      role: 'Verification, conformite, logs, inventaire',
      mcpRights: ['read', 'write'],
      githubRightsAllowed: ['read', 'write'],
      allowedRepos: ['visible-approved'],
      allowedServers: ['approved-only'],
      allowedActions: ['read_audit', 'write_audit_report_on_mcp_branch', 'inventory'],
      requiresHumanApproval: true,
      canReadRepos: true,
      canWriteRepos: true,
      canCreatePlans: true,
      canCreateBranches: true,
      canOpenPullRequests: true,
      canDeploy: false
    }, at)
  ];
}

export function createAgentProfile(input: {
  agentName: string;
  agentType: AgentType;
  role: string;
  actor: string;
}, at = new Date().toISOString()): AgentProfile {
  if (input.agentType === 'superadmin_mcp') {
    throw new Error('SuperAdmin MCP creation requires master MCP token validation.');
  }

  return profile({
    agentId: `${input.agentType}-${Date.now()}`,
    agentName: input.agentName,
    agentType: input.agentType,
    role: input.role,
    mcpRights: ['read'],
    githubRightsAllowed: ['read'],
    allowedRepos: ['visible-approved'],
    allowedServers: [],
    allowedActions: ['read_context', 'create_plan'],
    requiresHumanApproval: true,
    canReadRepos: true,
    canWriteRepos: false,
    canCreatePlans: true,
    canCreateBranches: false,
    canOpenPullRequests: false,
    canDeploy: false
  }, at);
}
