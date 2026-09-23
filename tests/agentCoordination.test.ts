import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAgentCoordinationSnapshot,
  type AgentCoordinationObservation
} from '../src/governedContext/agentCoordination.js';

const base: AgentCoordinationObservation = {
  agentIdentity: 'claude',
  provider: 'claude',
  session: {
    sessionId: 'session-1',
    status: 'ACTIVE',
    lastSeenAt: '2026-09-23T00:00:00Z'
  },
  task: { taskId: 'TASK-1', status: 'IMPLEMENTING' },
  claim: {
    claimId: 'claim-1',
    status: 'ACTIVE',
    collisionDomains: ['repo:Patricked-code/MCP']
  },
  heartbeat: {
    lastSeenAt: '2026-09-23T00:00:30Z',
    freshnessWindowSeconds: 120
  },
  git: {
    repository: 'Patricked-code/MCP',
    branch: 'mcp/example',
    headSha: 'a'.repeat(40)
  },
  checkpoint: {
    currentStep: 'IMPLEMENT',
    nextAction: 'Run exact-head CI',
    blockers: []
  },
  locks: [],
  observedAt: '2026-09-23T00:01:00Z'
};

test('universal coordination projects a fresh active agent without becoming an authority', () => {
  const snapshot = buildAgentCoordinationSnapshot(base);
  assert.equal(snapshot.liveness, 'FRESH');
  assert.equal(snapshot.claimStatus, 'ACTIVE');
  assert.equal(snapshot.sessionStatus, 'ACTIVE');
  assert.equal(snapshot.authoritative, false);
  assert.deepEqual(snapshot.authorities, [
    'Governed Session',
    'Governed Task Queue',
    'Claim',
    'Lock Service',
    'GitHub'
  ]);
});

test('stale heartbeat never releases or transfers an active claim', () => {
  const snapshot = buildAgentCoordinationSnapshot({
    ...base,
    heartbeat: { ...base.heartbeat, lastSeenAt: '2026-09-22T23:00:00Z' }
  });
  assert.equal(snapshot.liveness, 'STALE');
  assert.equal(snapshot.claimStatus, 'ACTIVE');
  assert.equal(snapshot.releaseAllowedByLiveness, false);
  assert.equal(snapshot.transferAllowedByLiveness, false);
});

test('missing heartbeat is UNKNOWN and fail-closed for ownership transfer', () => {
  const snapshot = buildAgentCoordinationSnapshot({ ...base, heartbeat: null });
  assert.equal(snapshot.liveness, 'UNKNOWN');
  assert.equal(snapshot.claimStatus, 'ACTIVE');
  assert.equal(snapshot.transferAllowedByLiveness, false);
});

test('closed session with released claim is terminal without inventing liveness', () => {
  const snapshot = buildAgentCoordinationSnapshot({
    ...base,
    session: { ...base.session, status: 'CLOSED' },
    claim: { ...base.claim, status: 'RELEASED' },
    heartbeat: null
  });
  assert.equal(snapshot.sessionStatus, 'CLOSED');
  assert.equal(snapshot.claimStatus, 'RELEASED');
  assert.equal(snapshot.liveness, 'UNKNOWN');
});


test('UAC-03 preserves every governed session lifecycle status without inferring ownership', async () => {
  const { projectGovernedSessionForCoordination } = await import(
    '../src/governedWorkflow/adapters/session.js'
  );
  const session = {
    schemaVersion: 1 as const,
    governedSessionId: '11111111-1111-4111-8111-111111111111',
    repository: 'Patricked-code/MCP',
    taskScope: 'coordination.universal',
    workBranch: 'mcp/universal-agent-coordination-20260923',
    agentIdentity: 'chatgpt',
    ownerPrincipalId: null,
    identityAssurance: 'declared_only' as const,
    status: 'ACTIVE' as const,
    createdAt: '2026-09-23T00:00:00Z',
    resumedAt: null,
    lastHeartbeatAt: '2026-09-23T00:00:30Z',
    pausedAt: null,
    expiredAt: null,
    closedAt: null,
    currentTransport: null,
    lastAcknowledgedStateVersion: null,
    bootstrapReceipt: null,
    connectionContext: null,
    sessionRevision: 7,
    lastCheckpoint: null,
    blockers: [],
    nextAction: 'continue UAC',
    lockIds: [],
    resumePolicy: 'stable_principal_or_resume_secret' as const
  };
  const before = JSON.stringify(session);

  for (const status of ['OPEN', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CLOSED'] as const) {
    const projection = projectGovernedSessionForCoordination({ ...session, status });
    assert.equal(projection.authority, 'Governed Session');
    assert.equal(projection.governedSessionId, session.governedSessionId);
    assert.equal(projection.agentIdentity, session.agentIdentity);
    assert.equal(projection.repository, session.repository);
    assert.equal(projection.workBranch, session.workBranch);
    assert.equal(projection.status, status);
    assert.equal(projection.lastHeartbeatAt, session.lastHeartbeatAt);
    assert.equal(projection.sessionRevision, session.sessionRevision);
    assert.equal(projection.authorizationInferred, false);
    assert.equal(projection.mutationPerformed, false);
    assert.equal(projection.claimOwnershipInferred, false);
  }
  assert.equal(JSON.stringify(session), before);
});

test('UAC-03 universal snapshot accepts OPEN and PAUSED without rewriting lifecycle state', () => {
  for (const status of ['OPEN', 'PAUSED'] as const) {
    const snapshot = buildAgentCoordinationSnapshot({
      ...base,
      session: { ...base.session, status }
    } as unknown as AgentCoordinationObservation);
    assert.equal(snapshot.sessionStatus, status);
  }
});
