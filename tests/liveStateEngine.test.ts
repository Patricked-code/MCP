import assert from 'node:assert/strict';
import test from 'node:test';

import { createLiveStateEngine } from '../src/liveState/engine.js';
import type { LiveStateObservations, LiveStateSnapshot } from '../src/liveState/types.js';

const SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function observations(): LiveStateObservations {
  return {
    repository: 'Patricked-code/MCP',
    github: { status: 'CURRENT', branch: 'main', head: SHA },
    s1: {
      status: 'CURRENT',
      path: '/opt/apps/wealthtech-mcp-ssh-bridge',
      branch: 'main',
      head: SHA,
      originMain: SHA,
      workingTreeClean: true,
      diffEmpty: true,
      fetchRemote: 'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
      pushRemote: 'disabled://mcp-s1-read-only'
    },
    runtime: {
      status: 'CURRENT',
      container: 'wealthtech_mcp_ssh_bridge',
      containerStatus: 'running',
      health: 'healthy',
      imageId: 'sha256:image',
      revision: SHA
    },
    documentation: {
      status: 'CURRENT',
      activeTask: 'TASK-20260809-002',
      declaredGithubSha: SHA,
      declaredS1Sha: SHA,
      drift: false
    }
  };
}

test('reconcileNow collecte, réconcilie et persiste un snapshot', async () => {
  const written: LiveStateSnapshot[] = [];
  const engine = createLiveStateEngine({
    collect: async () => observations(),
    read: async () => null,
    write: async (snapshot) => { written.push(snapshot); },
    now: () => new Date('2026-08-09T12:00:00.000Z')
  });

  const snapshot = await engine.reconcileNow();
  assert.equal(snapshot.alignment.global, 'FULLY_ALIGNED');
  assert.equal(snapshot.stateVersion, 1);
  assert.equal(written.length, 1);
  assert.deepEqual(written[0], snapshot);
});

test('deux reconciliations simultanées partagent le même travail en cours', async () => {
  let collectCount = 0;
  let release!: (value: LiveStateObservations) => void;
  const deferred = new Promise<LiveStateObservations>((resolve) => { release = resolve; });
  const engine = createLiveStateEngine({
    collect: async () => { collectCount += 1; return deferred; },
    read: async () => null,
    write: async () => undefined
  });

  const first = engine.reconcileNow();
  const second = engine.reconcileNow();
  release(observations());

  const [a, b] = await Promise.all([first, second]);
  assert.equal(collectCount, 1);
  assert.deepEqual(a, b);
});

test('une exception globale de collecte produit et persiste DEGRADED au lieu de tomber', async () => {
  const written: LiveStateSnapshot[] = [];
  const engine = createLiveStateEngine({
    collect: async () => { throw new Error('unexpected collector failure'); },
    read: async () => null,
    write: async (snapshot) => { written.push(snapshot); },
    now: () => new Date('2026-08-09T12:00:00.000Z')
  });

  const snapshot = await engine.reconcileNow();
  assert.equal(snapshot.alignment.global, 'DEGRADED');
  assert.equal(snapshot.github.status, 'UNAVAILABLE');
  assert.equal(snapshot.s1.status, 'UNAVAILABLE');
  assert.equal(snapshot.runtime.status, 'UNAVAILABLE');
  assert.equal(snapshot.documentation.status, 'UNAVAILABLE');
  assert.equal(snapshot.capabilities?.status, 'UNAVAILABLE');
  assert.equal(snapshot.governance?.status, 'UNAVAILABLE');
  assert.equal(snapshot.auditBaseline?.status, 'UNAVAILABLE');
  assert.equal(snapshot.inventory?.status, 'UNAVAILABLE');
  assert.equal(written.length, 1);
  assert.equal(JSON.stringify(snapshot).includes('unexpected collector failure'), false);
});

test('getCurrent retourne le dernier état avec fraîcheur recalculée', async () => {
  let currentTime = new Date('2026-08-09T12:00:00.000Z');
  const engine = createLiveStateEngine({
    collect: async () => observations(),
    read: async () => null,
    write: async () => undefined,
    now: () => currentTime
  });

  await engine.reconcileNow();
  currentTime = new Date('2026-08-09T12:01:01.000Z');
  const stale = await engine.getCurrent();
  assert.equal(stale?.freshness, 'STALE');
  assert.equal(stale?.ageSeconds, 61);
});

test('start lance une réconciliation initiale et un intervalle de 60 secondes', async () => {
  let scheduledMs = 0;
  let scheduled: (() => void) | null = null;
  let collectCount = 0;
  const engine = createLiveStateEngine({
    collect: async () => { collectCount += 1; return observations(); },
    read: async () => null,
    write: async () => undefined,
    schedule: (callback, milliseconds) => {
      scheduledMs = milliseconds;
      scheduled = callback;
      return { unref() {} } as unknown as NodeJS.Timeout;
    }
  });

  engine.start();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(scheduledMs, 60_000);
  assert.equal(collectCount, 1);

  scheduled?.();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(collectCount, 2);
});
