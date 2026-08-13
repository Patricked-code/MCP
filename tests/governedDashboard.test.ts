import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  loadGovernedDashboardContext,
  renderGovernedContextDashboardDisabledSection,
  renderGovernedContextDashboardSection
} from '../src/governedContext/dashboard.js';
import type { GovernedOperationalContext } from '../src/governedContext/types.js';
import { createOperationalEventJournal } from '../src/operationalMemory/eventJournal.js';
import { startOperationalMemoryMaintenance } from '../src/operationalMemory/maintenance.js';

const NOW = '2026-08-13T08:00:00.000Z';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const LOCK_ID = '22222222-2222-4222-8222-222222222222';
const SERVER_FILE = new URL('../src/server.ts', import.meta.url);
const MAINTENANCE_FILE = new URL('../src/operationalMemory/maintenance.ts', import.meta.url);
const SESSION_TOOLS_FILE = new URL('../src/tools/governedSessions.ts', import.meta.url);
const CONTEXT_TOOLS_FILE = new URL('../src/tools/governedContext.ts', import.meta.url);

function governedContext(): GovernedOperationalContext {
  return {
    schemaVersion: 1,
    generatedAt: NOW,
    freshness: 'CURRENT',
    repository: 'Patricked-code/MCP',
    governedBranch: 'main',
    liveState: {
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
        status: 'CURRENT', activeTask: 'TASK-20260813-012',
        declaredGithubSha: 'a'.repeat(40), declaredS1Sha: 'a'.repeat(40), drift: false, error: null
      },
      alignment: {
        githubVsS1: 'ALIGNED', runtime: 'ALIGNED', documentation: 'ALIGNED',
        global: 'FULLY_ALIGNED'
      },
      contradictions: [],
      nextAction: null
    },
    github: {
      status: 'CURRENT',
      observedAt: NOW,
      mainHead: 'a'.repeat(40),
      workBranch: 'mcp/session-continuity-v1-20260813',
      pullRequest: {
        number: 44, state: 'open', draft: true, merged: false, base: 'main',
        head: 'mcp/session-continuity-v1-20260813', headSha: 'b'.repeat(40), updatedAt: NOW
      },
      checks: { status: 'completed', conclusion: 'success', total: 3, failed: 0 },
      reviews: { approvals: 2, changesRequested: 0, unresolvedThreads: 1 },
      ruleset: {
        name: 'main-protection', enforcement: 'active', requiresPullRequest: true,
        requiredStatusChecks: ['validate'], requiresConversationResolution: true
      },
      error: null
    },
    session: {
      schemaVersion: 1,
      governedSessionId: SESSION_ID,
      repository: 'Patricked-code/MCP',
      taskScope: 'TASK-20260813-012',
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
      lastCheckpoint: null,
      blockers: [],
      nextAction: 'prepare-review',
      lockIds: [LOCK_ID],
      resumePolicy: 'stable_principal_or_resume_secret'
    },
    activeLocks: [{
      schemaVersion: 1,
      lockId: LOCK_ID,
      scope: 'task:TASK-20260813-012',
      governedSessionId: SESSION_ID,
      acquiredAt: NOW,
      expiresAt: '2026-08-13T08:05:00.000Z',
      renewedAt: NOW,
      reason: 'TDD Task 12',
      status: 'ACTIVE',
      lockRevision: 1
    }],
    lastCheckpoint: null,
    blockers: ['review pending'],
    nextAction: 'prepare-review',
    gate: { mode: 'shadow', existingWriteToolsEnabled: true, decision: 'shadow_observed' },
    proof: { identityAssurance: 'oauth_subject', runtimeRealtimeAvailable: true, limitations: [] }
  };
}

test('le dashboard rend la vue opérationnelle bornée demandée', () => {
  const html = renderGovernedContextDashboardSection(governedContext());

  assert.match(html, /MCP Governed Session Continuity/);
  assert.match(html, /stateVersion[^<]*<[^>]+>9</);
  assert.match(html, /CURRENT/);
  assert.match(html, /FULLY_ALIGNED/);
  assert.match(html, /TASK-20260813-012/);
  assert.match(html, /prepare-review/);
  assert.match(html, /Sessions actives globales[^0-9]*1/);
  assert.match(html, /task:TASK-20260813-012/);
  assert.match(html, /2026-08-13T08:05:00.000Z/);
  assert.match(html, /PR #44/);
  assert.match(html, /completed/);
  assert.match(html, /success/);
  assert.match(html, /Approbations[^0-9]*2/);
  assert.match(html, /shadow/);
  assert.match(html, /review pending/);
});

test('le dashboard affiche le compteur global injecté même sans session web liée', () => {
  const context = governedContext();
  context.session = null;
  const html = renderGovernedContextDashboardSection(context, 3);

  assert.match(html, /Sessions actives globales[^0-9]*3/);
  assert.doesNotMatch(html, /Sessions actives compatibles/);
});

test('le dashboard échappe toutes les chaînes et ignore les secrets hors contrat', () => {
  const context = governedContext();
  context.session = {
    ...context.session!,
    taskScope: '<script>alert("task")</script>',
    nextAction: '<img src=x onerror=alert(1)>'
  };
  context.nextAction = '<img src=x onerror=alert(1)>';
  context.blockers = ['<script>alert("blocker")</script>'];
  const hostile = Object.assign(context, {
    resumeSecretHash: 'resume-secret-hash-raw',
    authInfo: { token: 'Bearer raw-token' },
    transportSessionId: 'transport-raw-secret'
  }) as GovernedOperationalContext;

  const html = renderGovernedContextDashboardSection(hostile);

  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('<img'), false);
  assert.match(html, /&lt;script&gt;alert\(&quot;task&quot;\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.equal(html.includes('resume-secret-hash-raw'), false);
  assert.equal(html.includes('Bearer raw-token'), false);
  assert.equal(html.includes('transport-raw-secret'), false);
});

test('le mode disabled ne charge aucun store et affiche une projection explicite', async () => {
  let loads = 0;
  const context = await loadGovernedDashboardContext(false, async () => {
    loads += 1;
    throw new Error('disabled mode must not load governed dependencies');
  });

  assert.equal(context, null);
  assert.equal(loads, 0);
  assert.match(renderGovernedContextDashboardDisabledSection(), /désactivée/i);
  assert.doesNotMatch(renderGovernedContextDashboardDisabledSection(), /governed-context\/current/);
});

test('la maintenance utilise un timer unique unref et journalise seulement des compteurs', async () => {
  let callback: (() => void) | undefined;
  let scheduled = 0;
  let unrefCalled = 0;
  let sessionExpirations = 0;
  let lockExpirations = 0;
  let lockIdReconciliations = 0;
  let resolveCycle!: () => void;
  const cycleRecorded = new Promise<void>((resolve) => { resolveCycle = resolve; });
  const timer = { unref: () => { unrefCalled += 1; } };

  const maintenance = startOperationalMemoryMaintenance({
    expireSessions: async () => { sessionExpirations += 1; return 2; },
    expireLocks: async () => { lockExpirations += 1; return 1; },
    reconcileSessionLockIds: async () => { lockIdReconciliations += 1; return 0; },
    intervalMs: 60_000,
    setInterval: (scheduledCallback, intervalMs) => {
      scheduled += 1;
      callback = scheduledCallback;
      assert.equal(intervalMs, 60_000);
      return timer;
    },
    clearInterval: () => undefined,
    onCycle: async (summary) => {
      assert.deepEqual(summary, { expiredSessionCount: 2, expiredLockCount: 1 });
      resolveCycle();
    }
  });

  assert.equal(scheduled, 1);
  assert.equal(unrefCalled, 1);
  callback?.();
  await cycleRecorded;
  assert.equal(sessionExpirations, 1);
  assert.equal(lockExpirations, 1);
  assert.equal(lockIdReconciliations, 1);
  maintenance.stop();
});

test('la maintenance ignore un tick concurrent puis reprend au tick suivant', async () => {
  let callback: (() => void) | undefined;
  let cycles = 0;
  let expirationCalls = 0;
  let releaseFirst!: () => void;
  const firstHeld = new Promise<void>((resolve) => { releaseFirst = resolve; });
  let resolveFirstCycle!: () => void;
  const firstCycle = new Promise<void>((resolve) => { resolveFirstCycle = resolve; });
  const maintenance = startOperationalMemoryMaintenance({
    expireSessions: async () => {
      expirationCalls += 1;
      if (expirationCalls === 1) await firstHeld;
      return 0;
    },
    setInterval: (scheduledCallback) => {
      callback = scheduledCallback;
      return { unref() {} };
    },
    clearInterval: () => undefined,
    onCycle: () => {
      cycles += 1;
      if (cycles === 1) resolveFirstCycle();
    }
  });

  callback?.();
  callback?.();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(expirationCalls, 1);
  releaseFirst();
  await firstCycle;
  await new Promise<void>((resolve) => setImmediate(resolve));
  callback?.();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(expirationCalls, 2);
  maintenance.stop();
});

test('le journal de maintenance refuse toute métadonnée brute hors compteurs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-governed-maintenance-'));
  const filePath = join(directory, 'events.jsonl');
  try {
    const journal = createOperationalEventJournal({ filePath, maxBytes: 16_384, archives: 2 });
    await journal.append({
      type: 'maintenance.completed',
      governedSessionId: null,
      metadata: { expiredSessionCount: 2, expiredLockCount: 1 }
    });
    await assert.rejects(journal.append({
      type: 'maintenance.completed',
      governedSessionId: null,
      metadata: { transportSessionId: 'transport-raw' }
    }), /OPERATIONAL_EVENT_METADATA_FORBIDDEN/);
    const raw = await readFile(filePath, 'utf8');
    assert.match(raw, /"expiredSessionCount":2/);
    assert.equal(raw.includes('transport-raw'), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('le serveur démarre une seule maintenance et le dashboard reste cache/store-only', async () => {
  const [serverSource, maintenanceSource, sessionToolsSource, contextToolsSource] = await Promise.all([
    readFile(SERVER_FILE, 'utf8'),
    readFile(MAINTENANCE_FILE, 'utf8'),
    readFile(SESSION_TOOLS_FILE, 'utf8'),
    readFile(CONTEXT_TOOLS_FILE, 'utf8')
  ]);

  assert.equal((serverSource.match(/startGovernedOperationalMemoryMaintenance\(\);/g) ?? []).length, 1);
  assert.equal((serverSource.match(/startOperationalMemoryMaintenance\(\{/g) ?? []).length, 1);
  assert.match(serverSource, /context\.getCurrent\(\{/);
  assert.doesNotMatch(serverSource, /context\.reconcileExplicit\(/);
  assert.match(serverSource, /transport\.onclose[\s\S]*sessions\.unbindTransport\(transport\.sessionId\)/);
  assert.doesNotMatch(maintenanceSource, /liveState|github|ssh/i);
  assert.doesNotMatch(sessionToolsSource, /dependencies:\s*GovernedSessionToolDependencies\s*=\s*getGovernedSessionToolDependencies/);
  assert.doesNotMatch(contextToolsSource, /dependencies:\s*GovernedContextToolDependencies\s*=\s*getGovernedContextToolDependencies/);
});
