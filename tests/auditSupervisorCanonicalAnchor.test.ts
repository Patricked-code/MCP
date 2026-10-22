import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('AUDIT_SUPERVISOR has one stable documentary identity and an existing provenance anchor', async () => {
  const manifest = JSON.parse(await readFile('.mcp/agents.json', 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  const matches = manifest.agents.filter((agent: { agentId?: string; name?: string }) =>
    agent.agentId === 'MCP-AGENT-AUDIT-SUPERVISOR-001' || agent.name === 'AUDIT_SUPERVISOR'
  );
  assert.equal(matches.length, 1, 'no duplicate identity or parallel agent registration');
  const agent = matches[0];
  assert.equal(agent.agentId, 'MCP-AGENT-AUDIT-SUPERVISOR-001');
  assert.equal(agent.name, 'AUDIT_SUPERVISOR');
  assert.equal(agent.role, 'audit_supervisor');
  assert.equal(agent.type, 'ai_agent');
  assert.equal(agent.provider, 'chatgpt');
  assert.equal(agent.identityScope, 'VERSIONED_DOCUMENTARY_PROFILE_ONLY');
  assert.equal(agent.permissionAuthority, 'GITHUB_AND_EXISTING_GOVERNED_RUNTIME_AUTHORITIES');
  assert.equal(agent.canReadRepos, true);
  assert.equal(agent.canWriteBranches, false);
  assert.equal(agent.canOpenPullRequests, false);
  assert.equal(agent.canDeploy, false);
  assert.equal(agent.requiresHumanApproval, true);
  assert.equal(agent.continuity.repository, 'Patricked-code/MCP');
  assert.equal(agent.continuity.anchorIssueUrl, 'https://github.com/Patricked-code/MCP/issues/235');
  assert.equal(agent.continuity.canonicalCheckpointUrl,
    'https://github.com/Patricked-code/MCP/issues/235#issuecomment-6273965804');
  assert.equal(agent.continuity.coordinationIssueUrl, 'https://github.com/Patricked-code/MCP/issues/313');
  assert.equal(agent.continuity.historicalProvenanceIndex,
    'docs/governance/agent-historical-continuity-breadcrumbs-20261016.md');
  assert.equal(agent.continuity.programMap,
    'docs/governance/mcp-priority-convergence-map-20261015.json');
  assert.equal(agent.continuity.governedSessionBinding, 'RESOLVE_AND_AUTHORIZE_AT_RUNTIME');
  assert.equal(agent.continuity.checkpointPolicy,
    'PUBLISH_VERIFIED_GITHUB_CHECKPOINT_PER_SIGNIFICANT_INTERVENTION');
  assert.equal(agent.continuity.privateConversationArchive, 'NOT_AUTOMATICALLY_CAPTURED');
  assert.equal(agent.continuity.authorityClaimed, false);
});

test('other established agent profiles remain unchanged and unprivileged audit role cannot escalate rights', async () => {
  const manifest = JSON.parse(await readFile('.mcp/agents.json', 'utf8'));
  assert.deepEqual(manifest.agents.filter((agent: { name: string }) => ['ChatGPT', 'Claude', 'Codex'].includes(agent.name)), [
    { name: 'ChatGPT', type: 'ai_agent', role: 'architect_supervisor',
      canReadRepos: true, canWriteBranches: true, canOpenPullRequests: true,
      canDeploy: false, requiresHumanApproval: true },
    { name: 'Claude', type: 'ai_agent', role: 'developer',
      canReadRepos: true, canWriteBranches: true, canOpenPullRequests: true,
      canDeploy: false, requiresHumanApproval: true },
    { name: 'Codex', type: 'ai_agent', role: 'technical_editor',
      canReadRepos: true, canWriteBranches: true, canOpenPullRequests: true,
      canDeploy: false, requiresHumanApproval: true }
  ]);
});
