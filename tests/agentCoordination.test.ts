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
  task: { taskId: 'TASK-1', status: 'IN_PROGRESS' },
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
    'Governed Lock Service',
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


test('UAC-04 projects the authoritative governed task record without creating task authority', async () => {
  const { projectGovernedTaskForCoordination } = await import(
    '../src/governedWorkflow/adapters/task.js'
  );
  const statuses = [
    'DISCOVERED', 'READY', 'CLAIMED', 'IN_PROGRESS', 'REVIEW', 'MERGE_READY',
    'DEPLOYING', 'VERIFYING', 'DONE', 'BLOCKED', 'CONFLICT', 'CANCELLED', 'SUPERSEDED'
  ] as const;
  const task = {
    schemaVersion: 1 as const,
    taskId: 'TASK-20260923-154',
    repository: 'Patricked-code/MCP',
    intentKey: 'coordination.universal',
    title: 'Universal coordination',
    summary: 'Generalize existing coordination observability',
    priority: 90,
    sequence: 154,
    status: 'IN_PROGRESS' as const,
    dependencies: [],
    resourceScopes: ['coordination.universal'],
    ownerGovernedSessionId: '11111111-1111-4111-8111-111111111111',
    workBranch: 'mcp/universal-agent-coordination-20260923',
    pullRequestNumber: 154,
    observedHeadSha: 'a'.repeat(40),
    runtimeRevision: null,
    blockers: [],
    nextAction: 'continue UAC-04',
    source: { kind: 'agent' as const, requestDigest: 'b'.repeat(64) },
    createdAt: '2026-09-23T00:00:00Z',
    updatedAt: '2026-09-23T00:10:00Z',
    taskRevision: 9
  };
  const before = JSON.stringify(task);
  for (const status of statuses) {
    const projection = projectGovernedTaskForCoordination({ ...task, status });
    assert.equal(projection.authority, 'Governed Task Queue');
    assert.equal(projection.taskId, task.taskId);
    assert.equal(projection.status, status);
    assert.equal(projection.currentPhase, status);
    assert.equal(projection.ownerGovernedSessionId, task.ownerGovernedSessionId);
    assert.deepEqual(projection.resourceScopes, task.resourceScopes);
    assert.equal(projection.workBranch, task.workBranch);
    assert.equal(projection.pullRequestNumber, 154);
    assert.equal(projection.observedHeadSha, task.observedHeadSha);
    assert.equal(projection.taskRevision, task.taskRevision);
    assert.equal(projection.authorizationInferred, false);
    assert.equal(projection.mutationPerformed, false);
    assert.equal(projection.claimTransferAllowed, false);
  }
  assert.equal(JSON.stringify(task), before);
});


test('UAC-05 derives ownership and collision domains from the governed task without inventing claim release', async () => {
  const { projectGovernedTaskClaimForCoordination } = await import(
    '../src/governedWorkflow/adapters/task.js'
  );
  const task = {
    schemaVersion: 1 as const,
    taskId: 'TASK-20260923-155',
    repository: 'Patricked-code/MCP',
    intentKey: 'coordination.universal.claim',
    title: 'Claim projection',
    summary: 'Project existing task ownership only',
    priority: 90,
    sequence: 155,
    status: 'IN_PROGRESS' as const,
    dependencies: [],
    resourceScopes: ['coordination.universal', 'repo:Patricked-code/MCP', 'coordination.universal'],
    ownerGovernedSessionId: '11111111-1111-4111-8111-111111111111',
    workBranch: 'mcp/universal-agent-coordination-20260923',
    pullRequestNumber: 154,
    observedHeadSha: 'a'.repeat(40),
    runtimeRevision: null,
    blockers: [],
    nextAction: 'continue',
    source: { kind: 'agent' as const, requestDigest: 'c'.repeat(64) },
    createdAt: '2026-09-23T00:00:00Z',
    updatedAt: '2026-09-23T00:10:00Z',
    taskRevision: 10
  };

  const owned = projectGovernedTaskClaimForCoordination(task);
  assert.equal(owned.authority, 'Governed Task Queue');
  assert.equal(owned.taskId, task.taskId);
  assert.equal(owned.taskStatus, 'IN_PROGRESS');
  assert.equal(owned.ownershipState, 'OWNED');
  assert.equal(owned.ownerGovernedSessionId, task.ownerGovernedSessionId);
  assert.deepEqual(owned.collisionDomains, ['coordination.universal', 'repo:Patricked-code/MCP']);
  assert.equal(owned.claimId, null);
  assert.equal(owned.releaseInferred, false);
  assert.equal(owned.transferAllowed, false);
  assert.equal(owned.takeoverAllowed, false);
  assert.equal(owned.mutationPerformed, false);

  const terminalStillOwned = projectGovernedTaskClaimForCoordination({ ...task, status: 'DONE' });
  assert.equal(terminalStillOwned.ownershipState, 'OWNED');
  assert.equal(terminalStillOwned.taskStatus, 'DONE');
  assert.equal(terminalStillOwned.releaseInferred, false);

  const unowned = projectGovernedTaskClaimForCoordination({
    ...task,
    status: 'READY',
    ownerGovernedSessionId: null
  });
  assert.equal(unowned.ownershipState, 'UNOWNED');
  assert.equal(unowned.ownerGovernedSessionId, null);
  assert.equal(unowned.takeoverAllowed, false);
});


test('UAC-06 derives liveness from governed session heartbeat evidence only', async () => {
  const { projectGovernedSessionLivenessForCoordination } = await import(
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
    sessionRevision: 11,
    lastCheckpoint: null,
    blockers: [],
    nextAction: 'continue',
    lockIds: [],
    resumePolicy: 'stable_principal_or_resume_secret' as const
  };

  const fresh = projectGovernedSessionLivenessForCoordination(
    session, '2026-09-23T00:01:00Z', 120
  );
  assert.equal(fresh.authority, 'Governed Session');
  assert.equal(fresh.liveness, 'FRESH');
  assert.equal(fresh.heartbeatLastSeenAt, session.lastHeartbeatAt);

  const stale = projectGovernedSessionLivenessForCoordination(
    session, '2026-09-23T00:10:00Z', 120
  );
  assert.equal(stale.liveness, 'STALE');

  const unknown = projectGovernedSessionLivenessForCoordination(
    null, '2026-09-23T00:10:00Z', 120
  );
  assert.equal(unknown.liveness, 'UNKNOWN');
  assert.equal(unknown.heartbeatLastSeenAt, null);

  const future = projectGovernedSessionLivenessForCoordination(
    { ...session, lastHeartbeatAt: '2026-09-23T00:11:00Z' },
    '2026-09-23T00:10:00Z',
    120
  );
  assert.equal(future.liveness, 'UNKNOWN');

  for (const projection of [fresh, stale, unknown, future]) {
    assert.equal(projection.releaseAllowedByLiveness, false);
    assert.equal(projection.transferAllowedByLiveness, false);
    assert.equal(projection.authorizationInferred, false);
    assert.equal(projection.mutationPerformed, false);
  }
});


test('UAC-07 projects governed lock records and only current ACTIVE scopes as collision domains', async () => {
  const { projectGovernedLocksForCoordination } = await import(
    '../src/governedWorkflow/adapters/task.js'
  );
  const locks = [
    {
      schemaVersion: 1 as const,
      lockId: '11111111-1111-4111-8111-111111111112',
      scope: 'resource:coordination.universal',
      governedSessionId: '11111111-1111-4111-8111-111111111111',
      acquiredAt: '2026-09-23T00:00:00Z',
      expiresAt: '2026-09-23T00:20:00Z',
      renewedAt: '2026-09-23T00:10:00Z',
      reason: 'active UAC exclusion',
      status: 'ACTIVE' as const,
      lockRevision: 3
    },
    {
      schemaVersion: 1 as const,
      lockId: '22222222-2222-4222-8222-222222222222',
      scope: 'task:TASK-20260923-155',
      governedSessionId: '11111111-1111-4111-8111-111111111111',
      acquiredAt: '2026-09-23T00:00:00Z',
      expiresAt: '2026-09-23T00:30:00Z',
      renewedAt: '2026-09-23T00:05:00Z',
      reason: 'released task lock',
      status: 'RELEASED' as const,
      lockRevision: 4
    },
    {
      schemaVersion: 1 as const,
      lockId: '33333333-3333-4333-8333-333333333333',
      scope: 'resource:legacy.expired',
      governedSessionId: '11111111-1111-4111-8111-111111111111',
      acquiredAt: '2026-09-22T23:00:00Z',
      expiresAt: '2026-09-23T00:01:00Z',
      renewedAt: '2026-09-22T23:55:00Z',
      reason: 'expired lock',
      status: 'EXPIRED' as const,
      lockRevision: 2
    },
    {
      schemaVersion: 1 as const,
      lockId: '44444444-4444-4444-8444-444444444444',
      scope: 'resource:time.expired.not.reconciled',
      governedSessionId: '11111111-1111-4111-8111-111111111111',
      acquiredAt: '2026-09-23T00:00:00Z',
      expiresAt: '2026-09-23T00:05:00Z',
      renewedAt: '2026-09-23T00:00:00Z',
      reason: 'active status but expired by clock',
      status: 'ACTIVE' as const,
      lockRevision: 1
    }
  ];

  const projection = projectGovernedLocksForCoordination(
    locks,
    '2026-09-23T00:10:00Z'
  );
  assert.equal(projection.authority, 'Governed Lock Service');
  assert.deepEqual(projection.activeLockIds, [
    '11111111-1111-4111-8111-111111111112'
  ]);
  assert.deepEqual(projection.collisionDomains, [
    'resource:coordination.universal'
  ]);
  assert.equal(projection.locks[0]?.activeAtObservation, true);
  assert.equal(projection.locks[1]?.status, 'RELEASED');
  assert.equal(projection.locks[2]?.status, 'EXPIRED');
  assert.equal(projection.locks[3]?.activeAtObservation, false);
  assert.equal(projection.claimReleaseInferred, false);
  assert.equal(projection.authorizationInferred, false);
  assert.equal(projection.mutationPerformed, false);
});

test('UAC-07 universal snapshot names only canonical coordination authorities', () => {
  const snapshot = buildAgentCoordinationSnapshot(base);
  assert.deepEqual(snapshot.authorities, [
    'Governed Session',
    'Governed Task Queue',
    'Governed Lock Service',
    'GitHub'
  ]);
  assert.equal(snapshot.authorities.includes('Claim'), false);
  assert.equal(snapshot.authorities.includes('Lock Service'), false);
});


test('UAC-08 binds the existing GitHub operational context without upgrading exact-head evidence', async () => {
  const { projectGithubExecutionForCoordination } = await import(
    '../src/governedContext/githubFirstOperationalContinuity.js'
  );
  const head = 'd'.repeat(40);
  const github = {
    status: 'CURRENT' as const,
    observedAt: '2026-09-23T00:30:00Z',
    mainHead: 'a'.repeat(40),
    workBranch: 'mcp/universal-agent-coordination-20260923',
    workBranchHead: head,
    pullRequest: {
      number: 154,
      state: 'open' as const,
      draft: true,
      merged: false,
      base: 'main',
      head: 'mcp/universal-agent-coordination-20260923',
      headSha: head,
      author: 'Wealthtechinnovations',
      updatedAt: '2026-09-23T00:29:00Z'
    },
    checks: {
      status: 'completed' as const,
      conclusion: 'success',
      total: 1,
      failed: 0,
      headSha: head,
      exactHead: true,
      required: [{ context: 'MCP CI', status: 'completed', conclusion: 'success' }],
      requiredSatisfied: true
    },
    reviews: {
      approvals: 0,
      changesRequested: 0,
      unresolvedThreads: 0,
      headSha: head,
      exactHead: true
    },
    ruleset: {
      name: null,
      enforcement: null,
      requiresPullRequest: true,
      requiredStatusChecks: ['MCP CI'],
      requiresConversationResolution: true,
      requiredApprovingReviewCount: 0
    },
    ownership: { pullRequestAuthor: 'Wealthtechinnovations' },
    activity: { lastActivityAt: '2026-09-23T00:29:00Z' },
    cache: {
      status: 'REFRESHED' as const,
      observedAt: '2026-09-23T00:30:00Z',
      provenance: 'github_api' as const
    },
    evidence: {
      main: { freshness: 'CURRENT' as const, observedAt: '2026-09-23T00:30:00Z', provenance: 'github_api' as const },
      pullRequest: { freshness: 'CURRENT' as const, observedAt: '2026-09-23T00:30:00Z', provenance: 'github_api' as const },
      checks: { freshness: 'CURRENT' as const, observedAt: '2026-09-23T00:30:00Z', provenance: 'github_api' as const },
      reviews: { freshness: 'CURRENT' as const, observedAt: '2026-09-23T00:30:00Z', provenance: 'github_api' as const },
      ruleset: { freshness: 'CURRENT' as const, observedAt: '2026-09-23T00:30:00Z', provenance: 'github_api' as const }
    },
    reasonCodes: [],
    uncertainties: [],
    error: null
  };

  const projection = projectGithubExecutionForCoordination('Patricked-code/MCP', github);
  assert.equal(projection.authority, 'GitHub');
  assert.equal(projection.repository, 'Patricked-code/MCP');
  assert.equal(projection.workBranch, github.workBranch);
  assert.equal(projection.workBranchHead, head);
  assert.equal(projection.pullRequest?.number, 154);
  assert.equal(projection.pullRequest?.headSha, head);
  assert.equal(projection.checks.headSha, head);
  assert.equal(projection.checks.exactHead, true);
  assert.equal(projection.checks.requiredSatisfied, true);
  assert.equal(projection.reviews.exactHead, true);
  assert.deepEqual(projection.reasonCodes, []);
  assert.equal(projection.authorizationInferred, false);
  assert.equal(projection.mutationPerformed, false);

  const mismatch = projectGithubExecutionForCoordination('Patricked-code/MCP', {
    ...github,
    status: 'DEGRADED' as const,
    checks: { ...github.checks, exactHead: false, requiredSatisfied: false },
    reviews: { ...github.reviews, exactHead: false },
    reasonCodes: ['GITHUB_HEAD_MISMATCH' as const]
  });
  assert.equal(mismatch.status, 'DEGRADED');
  assert.equal(mismatch.checks.exactHead, false);
  assert.equal(mismatch.reviews.exactHead, false);
  assert.deepEqual(mismatch.reasonCodes, ['GITHUB_HEAD_MISMATCH']);
  assert.equal(mismatch.authorizationInferred, false);
});


test('UAC-09 projects checkpoint blockers and next actions from existing Session and Task authorities', async () => {
  const { projectCoordinationCheckpoint } = await import(
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
    lastHeartbeatAt: '2026-09-23T00:30:00Z',
    pausedAt: null,
    expiredAt: null,
    closedAt: null,
    currentTransport: null,
    lastAcknowledgedStateVersion: 21,
    bootstrapReceipt: null,
    connectionContext: null,
    sessionRevision: 12,
    lastCheckpoint: {
      checkpointId: '55555555-5555-4555-8555-555555555555',
      governedSessionId: '11111111-1111-4111-8111-111111111111',
      createdAt: '2026-09-23T00:31:00Z',
      taskScope: 'coordination.universal',
      workBranch: 'mcp/universal-agent-coordination-20260923',
      pullRequestNumber: 154,
      observedHeadSha: 'd'.repeat(40),
      acknowledgedStateVersion: 21,
      completedAction: 'UAC-08 GitHub execution binding',
      resultCode: 'PASS',
      blockers: ['checkpoint blocker'],
      nextAction: 'Open UAC-09',
      eventIds: ['66666666-6666-4666-8666-666666666666'],
      sessionRevision: 12
    },
    blockers: ['session blocker'],
    nextAction: 'Continue coordination program',
    lockIds: [],
    resumePolicy: 'stable_principal_or_resume_secret' as const
  };
  const task = {
    schemaVersion: 1 as const,
    taskId: 'TASK-20260923-159',
    repository: 'Patricked-code/MCP',
    intentKey: 'coordination.universal',
    title: 'Universal coordination',
    summary: 'Continue UAC',
    priority: 90,
    sequence: 159,
    status: 'REVIEW' as const,
    dependencies: [],
    resourceScopes: ['coordination.universal'],
    ownerGovernedSessionId: session.governedSessionId,
    workBranch: session.workBranch,
    pullRequestNumber: 154,
    observedHeadSha: 'd'.repeat(40),
    runtimeRevision: null,
    blockers: ['task blocker'],
    nextAction: 'Run exact-head CI',
    source: { kind: 'agent' as const, requestDigest: 'e'.repeat(64) },
    createdAt: '2026-09-23T00:00:00Z',
    updatedAt: '2026-09-23T00:31:00Z',
    taskRevision: 14
  };
  const beforeSession = JSON.stringify(session);
  const beforeTask = JSON.stringify(task);

  const projection = projectCoordinationCheckpoint(session, task);
  assert.deepEqual(projection.authorities, ['Governed Session', 'Governed Task Queue']);
  assert.equal(projection.currentTaskId, task.taskId);
  assert.equal(projection.currentStep, 'REVIEW');
  assert.equal(projection.checkpoint?.checkpointId, session.lastCheckpoint.checkpointId);
  assert.equal(projection.checkpoint?.completedAction, 'UAC-08 GitHub execution binding');
  assert.deepEqual(projection.blockers.session, ['session blocker']);
  assert.deepEqual(projection.blockers.task, ['task blocker']);
  assert.deepEqual(projection.blockers.checkpoint, ['checkpoint blocker']);
  assert.equal(projection.nextActions.session, 'Continue coordination program');
  assert.equal(projection.nextActions.task, 'Run exact-head CI');
  assert.equal(projection.nextActions.checkpoint, 'Open UAC-09');
  assert.equal(projection.authorizationInferred, false);
  assert.equal(projection.mutationPerformed, false);
  assert.equal(JSON.stringify(session), beforeSession);
  assert.equal(JSON.stringify(task), beforeTask);
});


test('UAC-11 exposes PRECODE candidate state as historical provenance only', async () => {
  const { projectHistoricalCandidateCoordination } = await import(
    '../src/governedContext/candidateContinuity.js'
  );
  const session = {
    candidateSessionId: 'candidate-session-historical-001',
    agentIdentity: 'claude',
    provider: 'claude' as const,
    providerConversationRef: 'conversation-historical-001',
    providerConversationRefProvenance: 'PROVIDED_BY_CLIENT' as const,
    githubActor: 'historical-agent',
    githubConnectionRef: 'github-connection-historical',
    connectionInstanceRef: 'connection-instance-historical',
    repository: 'Patricked-code/MCP' as const,
    branch: 'claude/ecstatic-edison-v1dyt1' as const,
    startingHeadSha: 'a'.repeat(40),
    lastObservedHeadSha: 'b'.repeat(40),
    createdAt: '2026-09-19T00:00:00Z',
    lastSeenAt: '2026-09-19T00:10:00Z',
    status: 'ACTIVE' as const
  };
  const claim = {
    candidateSessionId: session.candidateSessionId,
    agentIdentity: session.agentIdentity,
    workItemId: 'PRECODE-WORK-001',
    collisionDomains: ['coordination.universal', 'repo:Patricked-code/MCP'],
    status: 'ACTIVE' as const
  };
  const workItem = {
    workItemId: 'PRECODE-WORK-001',
    intentKeys: ['coordination.universal'],
    title: 'Historical PRECODE work',
    status: 'IN_PROGRESS' as const,
    priority: 100,
    sequence: 1,
    dependencies: [],
    collisionDomains: ['coordination.universal', 'repo:Patricked-code/MCP']
  };
  const beforeSession = JSON.stringify(session);
  const beforeClaim = JSON.stringify(claim);
  const beforeWork = JSON.stringify(workItem);

  const projection = projectHistoricalCandidateCoordination(session, claim, workItem);
  assert.equal(projection.authority, 'Historical PRECODE Compatibility');
  assert.equal(projection.historical, true);
  assert.equal(projection.session.candidateSessionId, session.candidateSessionId);
  assert.equal(projection.session.status, 'ACTIVE');
  assert.equal(projection.claim?.status, 'ACTIVE');
  assert.equal(projection.workItem?.status, 'IN_PROGRESS');
  assert.deepEqual(projection.claim?.collisionDomains, claim.collisionDomains);
  assert.equal(projection.sessionReactivationAllowed, false);
  assert.equal(projection.claimReactivationAllowed, false);
  assert.equal(projection.takeoverAllowed, false);
  assert.equal(projection.currentOwnershipAuthority, false);
  assert.equal(projection.authorizationGranted, false);
  assert.equal(projection.mayWrite, false);
  assert.equal(projection.mutationPerformed, false);
  assert.equal(JSON.stringify(session), beforeSession);
  assert.equal(JSON.stringify(claim), beforeClaim);
  assert.equal(JSON.stringify(workItem), beforeWork);

  const closed = projectHistoricalCandidateCoordination(
    { ...session, status: 'CLOSED' },
    { ...claim, status: 'RELEASED' },
    { ...workItem, status: 'DONE' }
  );
  assert.equal(closed.session.status, 'CLOSED');
  assert.equal(closed.claim?.status, 'RELEASED');
  assert.equal(closed.workItem?.status, 'DONE');
  assert.equal(closed.currentOwnershipAuthority, false);
  assert.equal(closed.takeoverAllowed, false);
});


test('UAC-13 stale heartbeat E2E keeps authoritative Task ownership intact', async () => {
  const { projectGovernedSessionLivenessForCoordination } = await import(
    '../src/governedWorkflow/adapters/session.js'
  );
  const { projectGovernedTaskClaimForCoordination } = await import(
    '../src/governedWorkflow/adapters/task.js'
  );

  const governedSessionId = '55555555-5555-4555-8555-555555555555';
  const session = {
    schemaVersion: 1 as const,
    governedSessionId,
    repository: 'Patricked-code/MCP',
    taskScope: 'coordination.universal',
    workBranch: 'mcp/universal-agent-coordination-20260923',
    agentIdentity: 'chatgpt',
    ownerPrincipalId: null,
    identityAssurance: 'declared_only' as const,
    status: 'ACTIVE' as const,
    createdAt: '2026-09-24T15:00:00Z',
    resumedAt: null,
    lastHeartbeatAt: '2026-09-24T15:00:00Z',
    pausedAt: null,
    expiredAt: null,
    closedAt: null,
    currentTransport: null,
    lastAcknowledgedStateVersion: null,
    bootstrapReceipt: null,
    connectionContext: null,
    sessionRevision: 21,
    lastCheckpoint: null,
    blockers: [],
    nextAction: 'continue UAC',
    lockIds: [],
    resumePolicy: 'stable_principal_or_resume_secret' as const
  };
  const task = {
    schemaVersion: 1 as const,
    taskId: 'TASK-20260924-154',
    repository: 'Patricked-code/MCP',
    intentKey: 'coordination.universal',
    title: 'Universal coordination',
    summary: 'Owned task remains authoritative while liveness is stale',
    priority: 100,
    sequence: 154,
    status: 'IN_PROGRESS' as const,
    dependencies: [],
    resourceScopes: ['coordination.universal'],
    ownerGovernedSessionId: governedSessionId,
    workBranch: 'mcp/universal-agent-coordination-20260923',
    pullRequestNumber: 154,
    observedHeadSha: 'd'.repeat(40),
    runtimeRevision: null,
    blockers: [],
    nextAction: 'continue UAC',
    source: { kind: 'agent' as const, requestDigest: 'e'.repeat(64) },
    createdAt: '2026-09-24T15:00:00Z',
    updatedAt: '2026-09-24T15:05:00Z',
    taskRevision: 22
  };
  const beforeSession = JSON.stringify(session);
  const beforeTask = JSON.stringify(task);

  const ownedBefore = projectGovernedTaskClaimForCoordination(task);
  const liveness = projectGovernedSessionLivenessForCoordination(
    session,
    '2026-09-24T15:10:00Z',
    120
  );
  const ownedAfter = projectGovernedTaskClaimForCoordination(task);

  assert.equal(liveness.liveness, 'STALE');
  assert.equal(liveness.releaseAllowedByLiveness, false);
  assert.equal(liveness.transferAllowedByLiveness, false);
  assert.equal(ownedBefore.ownershipState, 'OWNED');
  assert.equal(ownedAfter.ownershipState, 'OWNED');
  assert.equal(ownedAfter.ownerGovernedSessionId, governedSessionId);
  assert.equal(ownedAfter.releaseInferred, false);
  assert.equal(ownedAfter.transferAllowed, false);
  assert.equal(ownedAfter.takeoverAllowed, false);
  assert.equal(JSON.stringify(session), beforeSession);
  assert.equal(JSON.stringify(task), beforeTask);
});


test('UAC-14 unknown heartbeat E2E is fail-closed and never changes Task ownership', async () => {
  const { projectGovernedSessionLivenessForCoordination } = await import(
    '../src/governedWorkflow/adapters/session.js'
  );
  const { projectGovernedTaskClaimForCoordination } = await import(
    '../src/governedWorkflow/adapters/task.js'
  );

  const governedSessionId = '77777777-7777-4777-8777-777777777777';
  const task = {
    schemaVersion: 1 as const,
    taskId: 'TASK-20260924-155',
    repository: 'Patricked-code/MCP',
    intentKey: 'coordination.universal',
    title: 'Universal coordination unknown liveness',
    summary: 'Task authority stays owned when heartbeat evidence is unavailable',
    priority: 100,
    sequence: 155,
    status: 'IN_PROGRESS' as const,
    dependencies: [],
    resourceScopes: ['coordination.universal'],
    ownerGovernedSessionId: governedSessionId,
    workBranch: 'mcp/universal-agent-coordination-20260923',
    pullRequestNumber: 154,
    observedHeadSha: 'f'.repeat(40),
    runtimeRevision: null,
    blockers: [],
    nextAction: 'reobserve governed session evidence',
    source: { kind: 'agent' as const, requestDigest: 'f'.repeat(64) },
    createdAt: '2026-09-24T15:00:00Z',
    updatedAt: '2026-09-24T15:10:00Z',
    taskRevision: 23
  };
  const beforeTask = JSON.stringify(task);

  const liveness = projectGovernedSessionLivenessForCoordination(
    null,
    '2026-09-24T15:11:00Z',
    120
  );
  const ownership = projectGovernedTaskClaimForCoordination(task);

  assert.equal(liveness.liveness, 'UNKNOWN');
  assert.equal(liveness.heartbeatLastSeenAt, null);
  assert.equal(liveness.releaseAllowedByLiveness, false);
  assert.equal(liveness.transferAllowedByLiveness, false);
  assert.equal(liveness.authorizationInferred, false);
  assert.equal(liveness.mutationPerformed, false);

  assert.equal(ownership.ownershipState, 'OWNED');
  assert.equal(ownership.ownerGovernedSessionId, governedSessionId);
  assert.equal(ownership.releaseInferred, false);
  assert.equal(ownership.transferAllowed, false);
  assert.equal(ownership.takeoverAllowed, false);
  assert.equal(ownership.authorizationInferred, false);
  assert.equal(ownership.mutationPerformed, false);
  assert.equal(JSON.stringify(task), beforeTask);
});
