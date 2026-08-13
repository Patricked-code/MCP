import assert from 'node:assert/strict';
import test from 'node:test';

import type { LiveStateSnapshot } from '../src/liveState/types.js';
import type { GovernedLockRecord, GovernedSessionPublicRecord } from '../src/operationalMemory/types.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { createGovernedOperationalContextService } = await import(
  '../src/governedContext/service.js'
);

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const FOREIGN_SESSION_ID = '22222222-2222-4222-8222-222222222222';
const NOW = '2026-08-13T08:00:00.000Z';

const LIVE_STATE: LiveStateSnapshot = {
  schemaVersion: 1,
  stateVersion: 9,
  generatedAt: NOW,
  lastReconciledAt: NOW,
  maxAgeSeconds: 60,
  freshness: 'CURRENT',
  ageSeconds: 0,
  repository: 'Patricked-code/MCP',
  github: { status: 'CURRENT', branch: 'main', head: 'a'.repeat(40), error: null },
  s1: {
    status: 'CURRENT', path: '/opt/apps/wealthtech-mcp-ssh-bridge', branch: 'main',
    head: 'a'.repeat(40), originMain: 'a'.repeat(40), workingTreeClean: true,
    diffEmpty: true, fetchRemote: 'https://github.com/Patricked-code/MCP.git',
    pushRemote: 'disabled://mcp-s1-read-only', error: null
  },
  runtime: {
    status: 'CURRENT', container: 'wealthtech_mcp_ssh_bridge', containerStatus: 'running',
    health: 'healthy', imageId: 'sha256:image', revision: 'a'.repeat(40), error: null
  },
  documentation: {
    status: 'CURRENT', activeTask: 'TASK-20260813-008', declaredGithubSha: 'a'.repeat(40),
    declaredS1Sha: 'a'.repeat(40), drift: false, error: null
  },
  alignment: {
    githubVsS1: 'ALIGNED', runtime: 'ALIGNED', documentation: 'ALIGNED', global: 'FULLY_ALIGNED'
  },
  contradictions: [],
  nextAction: null
};

const SESSION: GovernedSessionPublicRecord = {
  schemaVersion: 1,
  governedSessionId: SESSION_ID,
  repository: 'Patricked-code/MCP',
  taskScope: 'TASK-20260813-008',
  workBranch: 'mcp/session-continuity-v1-20260813',
  agentIdentity: 'codex-work-mode',
  ownerPrincipalId: 'oauth:wealthtech-mcp-admin',
  identityAssurance: 'oauth_subject',
  status: 'ACTIVE',
  createdAt: NOW,
  resumedAt: null,
  lastHeartbeatAt: NOW,
  pausedAt: null,
  expiredAt: null,
  closedAt: null,
  currentTransport: null,
  lastAcknowledgedStateVersion: 9,
  sessionRevision: 3,
  lastCheckpoint: {
    checkpointId: '33333333-3333-4333-8333-333333333333',
    governedSessionId: SESSION_ID,
    createdAt: NOW,
    taskScope: 'TASK-20260813-008',
    workBranch: 'mcp/session-continuity-v1-20260813',
    pullRequestNumber: 44,
    observedHeadSha: 'a'.repeat(40),
    acknowledgedStateVersion: 9,
    completedAction: 'Task 8 GREEN',
    resultCode: 'PASS',
    blockers: [],
    nextAction: 'continue-checkpoint',
    eventIds: [],
    sessionRevision: 3
  },
  blockers: [],
  nextAction: null,
  lockIds: [],
  resumePolicy: 'stable_principal_or_resume_secret'
};

const GITHUB = {
  status: 'CURRENT' as const,
  observedAt: NOW,
  mainHead: 'a'.repeat(40),
  workBranch: 'mcp/session-continuity-v1-20260813',
  pullRequest: null,
  checks: { status: 'completed' as const, conclusion: 'success', total: 1, failed: 0 },
  reviews: { approvals: 1, changesRequested: 0, unresolvedThreads: 0 },
  ruleset: {
    name: 'main-protection', enforcement: 'active', requiresPullRequest: true,
    requiredStatusChecks: ['validate'], requiresConversationResolution: true
  },
  error: null
};

const REQUEST = {
  transportSessionId: 'transport-raw-A',
  identity: {
    principalId: 'oauth:wealthtech-mcp-admin',
    clientId: 'chatgpt-client',
    assurance: 'oauth_subject' as const
  }
};

function foreignLock(): GovernedLockRecord {
  return {
    schemaVersion: 1,
    lockId: '44444444-4444-4444-8444-444444444444',
    scope: 'repository:Patricked-code/MCP',
    governedSessionId: FOREIGN_SESSION_ID,
    acquiredAt: NOW,
    expiresAt: '2026-08-13T08:05:00.000Z',
    renewedAt: NOW,
    reason: 'other work',
    status: 'ACTIVE',
    lockRevision: 1
  };
}

async function context(overrides: {
  liveState?: LiveStateSnapshot | null;
  session?: GovernedSessionPublicRecord | null;
  locks?: GovernedLockRecord[];
  github?: typeof GITHUB;
  audit?: { record(input: { type: string }): Promise<void> };
} = {}) {
  let liveReconciles = 0;
  let githubReconciles = 0;
  let githubCollections = 0;
  const liveState = overrides.liveState === undefined ? LIVE_STATE : overrides.liveState;
  const session = overrides.session === undefined ? SESSION : overrides.session;
  const github = overrides.github ?? GITHUB;
  const service = createGovernedOperationalContextService({
    liveState: {
      getCurrent: async () => liveState,
      reconcileNow: async () => { liveReconciles += 1; return liveState; }
    },
    github: {
      getCurrent: async () => github,
      collect: async () => { githubCollections += 1; return github; },
      reconcileExplicit: async () => { githubReconciles += 1; return github; }
    },
    sessions: {
      getVisibleSession: async () => session
    },
    locks: {
      listActiveLocks: async () => overrides.locks ?? []
    },
    gateMode: 'shadow',
    existingWriteToolsEnabled: true,
    now: () => new Date(NOW),
    audit: overrides.audit
  });
  const input = {
    governedSessionId: session?.governedSessionId ?? null,
    workBranch: 'mcp/session-continuity-v1-20260813',
    request: REQUEST
  };
  const result = await service.getCurrent(input);
  return {
    result,
    service,
    input,
    counts: () => ({ liveReconciles, githubReconciles, githubCollections })
  };
}

test('priorise Live State, acquittement, conflit, CI/review, checkpoint puis null', async () => {
  assert.equal((await context({
    liveState: { ...LIVE_STATE, nextAction: 'mcp_reconcile_live_state' }
  })).result.nextAction, 'mcp_reconcile_live_state');

  assert.equal((await context({
    session: { ...SESSION, lastAcknowledgedStateVersion: 8 }
  })).result.nextAction, 'mcp_acknowledge_governed_context');

  assert.equal((await context({ locks: [foreignLock()] })).result.nextAction,
    'wait_for_governed_lock');

  assert.equal((await context({
    github: {
      ...GITHUB,
      checks: { status: 'completed', conclusion: 'failure', total: 1, failed: 1 }
    }
  })).result.nextAction, 'resolve_github_checks');

  assert.equal((await context()).result.nextAction, 'continue-checkpoint');
  assert.equal((await context({
    session: { ...SESSION, lastCheckpoint: null }
  })).result.nextAction, null);
});

test('getCurrent reste cache/store-only et reconcileExplicit force seulement les sources prévues', async () => {
  const fixture = await context();
  assert.deepEqual(fixture.counts(), {
    liveReconciles: 0,
    githubReconciles: 0,
    githubCollections: 0
  });
  assert.equal(fixture.result.schemaVersion, 1);
  assert.equal(fixture.result.gate.mode, 'shadow');
  assert.equal(fixture.result.gate.existingWriteToolsEnabled, true);
  assert.equal(fixture.result.gate.decision, 'shadow_observed');
  assert.equal(fixture.result.proof.runtimeRealtimeAvailable, true);

  const refreshed = await fixture.service.reconcileExplicit(fixture.input);
  assert.equal(refreshed.repository, 'Patricked-code/MCP');
  assert.deepEqual(fixture.counts(), {
    liveReconciles: 1,
    githubReconciles: 1,
    githubCollections: 0
  });
});

test('lecture et réconciliation explicite émettent les événements machine dans l’ordre', async () => {
  const eventTypes: string[] = [];
  const fixture = await context({
    audit: {
      async record(input) { eventTypes.push(input.type); }
    }
  });

  await fixture.service.reconcileExplicit(fixture.input);

  assert.deepEqual(eventTypes, [
    'context.read',
    'reconcile.requested',
    'context.read',
    'reconcile.completed'
  ]);
});

test('une session absente et des lecteurs dégradés produisent une vue, jamais un throw', async () => {
  const fixture = await context({ liveState: null, session: null });
  assert.equal(fixture.result.freshness, 'DEGRADED');
  assert.equal(fixture.result.gate.decision, 'session_unbound');
  assert.equal(fixture.result.nextAction, 'mcp_open_governed_session');
  assert.equal(fixture.result.proof.identityAssurance, null);
  assert.equal(fixture.result.proof.limitations.includes('live_state_unavailable'), true);
});

test('des dépendances qui lèvent synchroniquement sont converties en vue dégradée', async () => {
  const throwing = () => { throw new Error('sensitive dependency failure'); };
  const service = createGovernedOperationalContextService({
    liveState: {
      getCurrent: throwing,
      reconcileNow: throwing
    },
    github: {
      getCurrent: throwing,
      reconcileExplicit: throwing
    },
    sessions: { getVisibleSession: throwing },
    locks: { listActiveLocks: throwing },
    gateMode: 'shadow',
    existingWriteToolsEnabled: false,
    now: () => new Date(NOW)
  } as never);

  const result = await service.getCurrent({
    governedSessionId: SESSION_ID,
    workBranch: 'mcp/session-continuity-v1-20260813',
    request: REQUEST
  });
  assert.equal(result.freshness, 'DEGRADED');
  assert.equal(result.github.error, 'github_context_unavailable');
  assert.equal(JSON.stringify(result).includes('sensitive dependency failure'), false);
});
