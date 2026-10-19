import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const AUTO_ID = 'MCP-AGENT-AUTO-INTAKE-BUS-001';
const AUDIT_ID = 'MCP-AGENT-AUDIT-SUPERVISOR-001';

test('AUTO-INTAKE/BUS resolves to exactly one documentary identity with its original checkpoints', async () => {
  const manifest = JSON.parse(await readFile('.mcp/agents.json','utf8'));
  assert.equal(manifest.schemaVersion, 1);
  const matches = manifest.agents.filter((a: { agentId?: string; name?: string; aliases?: string[] }) =>
    a.agentId === AUTO_ID || a.name === 'AUTO-INTAKE/BUS' || a.aliases?.includes('AUTO/BUS'));
  assert.equal(matches.length, 1, 'never fork or duplicate AUTO/BUS identity');
  const agent = matches[0];
  assert.equal(agent.agentId, AUTO_ID);
  assert.deepEqual(agent.aliases, ['AUTO/BUS']);
  assert.equal(agent.role, 'auto_intake_bus_integrator');
  assert.equal(agent.type, 'ai_agent');
  assert.equal(agent.clientBinding, 'UNATTESTED_RESOLVE_PER_REQUEST');
  assert.equal(agent.identityScope, 'VERSIONED_DOCUMENTARY_PROFILE_ONLY');
  assert.equal(agent.permissionAuthority, 'GITHUB_AND_EXISTING_GOVERNED_RUNTIME_AUTHORITIES');
  assert.equal(agent.continuity.repository, 'Patricked-code/MCP');
  assert.equal(agent.continuity.anchorIssueUrl, 'https://github.com/Patricked-code/MCP/issues/313');
  assert.equal(agent.continuity.canonicalCheckpointUrl,
    'https://github.com/Patricked-code/MCP/issues/313#issuecomment-6275857601');
  assert.equal(agent.continuity.historicalOriginUrl,
    'https://github.com/Patricked-code/MCP/issues/235#issuecomment-6219204801');
  assert.equal(agent.continuity.firstAutoIntakeCheckpointUrl,
    'https://github.com/Patricked-code/MCP/issues/313#issuecomment-6222985252');
  assert.equal(agent.continuity.baselineAuto02ReceiptUrl,
    'https://github.com/Patricked-code/MCP/issues/313#issuecomment-6223115593');
  assert.equal(agent.continuity.baselineAuto02DeploymentUrl,
    'https://github.com/Patricked-code/MCP/issues/313#issuecomment-6223160268');
  assert.equal(agent.continuity.latestCheckpointResolution,
    'REOBSERVE_ISSUE_313_APPEND_ONLY_COMMENT_CHAIN');
  assert.equal(agent.continuity.governedSessionBinding, 'RESOLVE_AND_AUTHORIZE_AT_RUNTIME');
  assert.equal(agent.continuity.busCanonicalRootBinding, 'NOT_YET_IMPLEMENTED');
  assert.equal(agent.continuity.privateConversationArchive, 'NOT_AUTOMATICALLY_CAPTURED');
  assert.equal(agent.continuity.authorityClaimed, false);
});

test('AUTO/BUS retains other agent identities and grants no new runtime, GitHub or deploy rights', async () => {
  const manifest = JSON.parse(await readFile('.mcp/agents.json', 'utf8'));
  const existing = manifest.agents.filter((a: { name: string }) => a.name !== 'AUTO-INTAKE/BUS');
  assert.equal(existing.length, 4, 'the three original profiles and existing AUDIT_SUPERVISOR must survive');
  const audit = existing.find((a: { agentId?: string }) => a.agentId === AUDIT_ID);
  assert.ok(audit);
  assert.equal(audit.role, 'audit_supervisor');
  const agent = manifest.agents.find((a: { agentId?: string }) => a.agentId === AUTO_ID);
  assert.equal(agent.canReadRepos, true);
  assert.equal(agent.canWriteBranches, false);
  assert.equal(agent.canOpenPullRequests, false);
  assert.equal(agent.canDeploy, false);
  assert.equal(agent.requiresHumanApproval, true);
  assert.ok(agent.responsibilities.some((s: string) => s.includes('AUTO-01..AUTO-06')));
  assert.ok(agent.responsibilities.some((s: string) => s.includes('BUS-00..BUS-04')));
});
