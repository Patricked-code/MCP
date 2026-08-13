import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createAtomicJsonStore } from '../src/operationalMemory/atomicStore.js';
import { startOperationalMemoryMaintenance } from '../src/operationalMemory/maintenance.js';
import {
  createGovernedSessionService,
  type RequestIdentity
} from '../src/operationalMemory/sessionService.js';
import { createTransportBindings } from '../src/operationalMemory/transportBindings.js';
import {
  SessionStoreDocumentSchema,
  createEmptySessionStoreDocument
} from '../src/operationalMemory/types.js';

const OAUTH_IDENTITY: RequestIdentity = {
  principalId: 'oauth:user:123',
  clientId: 'chatgpt-client',
  assurance: 'oauth_subject'
};
const SHARED_IDENTITY: RequestIdentity = {
  principalId: null,
  clientId: 'shared-mcp-client',
  assurance: 'shared_credential'
};

async function fixture(options: {
  now?: () => Date;
  stateVersion?: () => number;
  idleTtlSeconds?: number;
  audit?: { record(input: { type: string }): Promise<void> };
} = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-governed-session-'));
  const file = join(directory, 'sessions.json');
  const store = createAtomicJsonStore({
    filePath: file,
    schema: SessionStoreDocumentSchema,
    empty: createEmptySessionStoreDocument
  });
  const bindings = createTransportBindings();
  const service = createGovernedSessionService({
    store,
    bindings,
    idleTtlSeconds: options.idleTtlSeconds ?? 86_400,
    resumeGraceSeconds: 604_800,
    now: options.now ?? (() => new Date('2026-08-13T07:00:00.000Z')),
    getLiveState: async () => ({ stateVersion: options.stateVersion?.() ?? 9 }),
    audit: options.audit
  });
  return { directory, file, store, bindings, service };
}

const OPEN_INPUT = {
  repository: 'Patricked-code/MCP' as const,
  taskScope: 'TASK-20260813-004',
  workBranch: 'mcp/session-continuity-v1-20260813',
  agentIdentity: 'codex-work-mode',
  blockers: [],
  nextAction: 'run Task 5 RED'
};

test('open crée une identité durable distincte du transport et ne persiste pas le secret brut', async () => {
  const { directory, file, bindings, service } = await fixture();
  try {
    const result = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-A-raw',
      identity: OAUTH_IDENTITY
    });
    const raw = await readFile(file, 'utf8');

    assert.match(result.session.governedSessionId, /^[0-9a-f-]{36}$/);
    assert.notEqual(result.session.governedSessionId, 'transport-A-raw');
    assert.equal(bindings.lookup('transport-A-raw'), result.session.governedSessionId);
    assert.equal(raw.includes(result.resumeSecret), false);
    assert.equal(raw.includes('transport-A-raw'), false);
    assert.match(raw, /"fingerprint": "[0-9a-f]{64}"/);
    assert.equal('resumeSecretHash' in result.session, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('resume sur un nouveau transport conserve governedSessionId et incrémente la révision', async () => {
  const { directory, bindings, service } = await fixture();
  try {
    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-A-raw',
      identity: SHARED_IDENTITY
    });
    const resumed = await service.resumeSession({
      governedSessionId: opened.session.governedSessionId,
      resumeSecret: opened.resumeSecret,
      repository: 'Patricked-code/MCP',
      taskScope: OPEN_INPUT.taskScope,
      expectedSessionRevision: opened.session.sessionRevision
    }, {
      transportSessionId: 'transport-B-raw',
      identity: SHARED_IDENTITY
    });

    assert.equal(resumed.governedSessionId, opened.session.governedSessionId);
    assert.equal(resumed.sessionRevision, opened.session.sessionRevision + 1);
    assert.equal(bindings.lookup('transport-A-raw'), null);
    assert.equal(bindings.lookup('transport-B-raw'), opened.session.governedSessionId);
    assert.notEqual(
      resumed.currentTransport?.fingerprint,
      opened.session.currentTransport?.fingerprint
    );
    await assert.rejects(service.heartbeat({
      governedSessionId: resumed.governedSessionId,
      expectedSessionRevision: resumed.sessionRevision
    }, {
      transportSessionId: 'transport-A-raw',
      identity: SHARED_IDENTITY
    }), /SESSION_NOT_BOUND/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('la fermeture du transport courant supprime sa liaison sans fermer la governed session', async () => {
  const { directory, bindings, service } = await fixture();
  try {
    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-A-raw',
      identity: SHARED_IDENTITY
    });

    assert.equal(
      service.unbindTransport('transport-A-raw'),
      opened.session.governedSessionId
    );
    assert.equal(bindings.lookup('transport-A-raw'), null);
    await assert.rejects(service.heartbeat({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision
    }, {
      transportSessionId: 'transport-A-raw',
      identity: SHARED_IDENTITY
    }), /SESSION_NOT_BOUND/);

    const persisted = await service.getVisibleSession(opened.session.governedSessionId, {
      transportSessionId: 'transport-A-raw',
      identity: SHARED_IDENTITY
    });
    assert.equal(persisted, null);
    assert.equal((await service.resumeSession({
      governedSessionId: opened.session.governedSessionId,
      resumeSecret: opened.resumeSecret,
      repository: 'Patricked-code/MCP',
      taskScope: OPEN_INPUT.taskScope,
      expectedSessionRevision: opened.session.sessionRevision
    }, {
      transportSessionId: 'transport-B-raw',
      identity: SHARED_IDENTITY
    })).governedSessionId, opened.session.governedSessionId);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('le cycle session/transport/contexte/checkpoint émet les événements machine minimaux', async () => {
  const eventTypes: string[] = [];
  const { directory, service } = await fixture({
    audit: {
      async record(input) { eventTypes.push(input.type); }
    }
  });
  try {
    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-A-raw',
      identity: SHARED_IDENTITY
    });
    const resumed = await service.resumeSession({
      governedSessionId: opened.session.governedSessionId,
      resumeSecret: opened.resumeSecret,
      repository: 'Patricked-code/MCP',
      taskScope: OPEN_INPUT.taskScope,
      expectedSessionRevision: opened.session.sessionRevision
    }, {
      transportSessionId: 'transport-B-raw',
      identity: SHARED_IDENTITY
    });
    const heartbeat = await service.heartbeat({
      governedSessionId: resumed.governedSessionId,
      expectedSessionRevision: resumed.sessionRevision
    }, {
      transportSessionId: 'transport-B-raw',
      identity: SHARED_IDENTITY
    });
    const acknowledged = await service.acknowledgeContext({
      governedSessionId: heartbeat.governedSessionId,
      expectedSessionRevision: heartbeat.sessionRevision,
      expectedStateVersion: 9
    }, {
      transportSessionId: 'transport-B-raw',
      identity: SHARED_IDENTITY
    });
    await service.createCheckpoint({
      governedSessionId: acknowledged.governedSessionId,
      expectedSessionRevision: acknowledged.sessionRevision,
      expectedStateVersion: 9,
      completedAction: 'audit session lifecycle',
      resultCode: 'PASS',
      pullRequestNumber: null,
      observedHeadSha: null,
      blockers: [],
      nextAction: null
    }, {
      transportSessionId: 'transport-B-raw',
      identity: SHARED_IDENTITY
    });
    const current = await service.getVisibleSession(opened.session.governedSessionId, {
      transportSessionId: 'transport-B-raw',
      identity: SHARED_IDENTITY
    });
    const paused = await service.pauseSession({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: current?.sessionRevision ?? -1
    }, {
      transportSessionId: 'transport-B-raw',
      identity: SHARED_IDENTITY
    });
    await service.closeSession({
      governedSessionId: paused.governedSessionId,
      expectedSessionRevision: paused.sessionRevision
    }, {
      transportSessionId: 'transport-B-raw',
      identity: SHARED_IDENTITY
    });

    assert.deepEqual(eventTypes, [
      'session.opened',
      'transport.bound',
      'transport.unbound',
      'session.resumed',
      'transport.bound',
      'session.heartbeat',
      'context.acknowledged',
      'checkpoint.created',
      'session.paused',
      'session.closed',
      'transport.unbound'
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('un principal OAuth propriétaire peut reprendre sans secret', async () => {
  const { directory, service } = await fixture();
  try {
    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-A-raw',
      identity: OAUTH_IDENTITY
    });
    const resumed = await service.resumeSession({
      governedSessionId: opened.session.governedSessionId,
      repository: 'Patricked-code/MCP',
      taskScope: OPEN_INPUT.taskScope,
      expectedSessionRevision: opened.session.sessionRevision
    }, {
      transportSessionId: 'transport-B-raw',
      identity: OAUTH_IDENTITY
    });

    assert.equal(resumed.governedSessionId, opened.session.governedSessionId);
    assert.equal(resumed.identityAssurance, 'oauth_subject');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('preuve, scope, révision et credential partagé invalides échouent sans modifier le store', async () => {
  const { directory, file, service } = await fixture();
  try {
    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-A-raw',
      identity: SHARED_IDENTITY
    });

    const attempts = [
      {
        expected: 'SESSION_RESUME_PROOF_REQUIRED',
        input: { resumeSecret: 'wrong-secret' }
      },
      {
        expected: 'SESSION_SCOPE_MISMATCH',
        input: { resumeSecret: opened.resumeSecret, taskScope: 'TASK-OTHER' }
      },
      {
        expected: 'SESSION_REVISION_MISMATCH',
        input: { resumeSecret: opened.resumeSecret, expectedSessionRevision: 999 }
      },
      {
        expected: 'SESSION_RESUME_PROOF_REQUIRED',
        input: {}
      }
    ];

    for (const attempt of attempts) {
      const before = await readFile(file);
      await assert.rejects(service.resumeSession({
        governedSessionId: opened.session.governedSessionId,
        repository: 'Patricked-code/MCP',
        taskScope: OPEN_INPUT.taskScope,
        expectedSessionRevision: opened.session.sessionRevision,
        ...attempt.input
      }, {
        transportSessionId: `transport-${attempt.expected}`,
        identity: SHARED_IDENTITY
      }), new RegExp(attempt.expected));
      assert.deepEqual(await readFile(file), before);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('session fermée et collision de transport sont refusées sans écriture ambiguë', async () => {
  const { directory, file, store, service } = await fixture();
  try {
    const first = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-A-raw',
      identity: OAUTH_IDENTITY
    });
    const second = await service.openSession({ ...OPEN_INPUT, taskScope: 'TASK-SECOND' }, {
      transportSessionId: 'transport-B-raw',
      identity: OAUTH_IDENTITY
    });

    await store.update((document) => ({
      ...document,
      storeRevision: document.storeRevision + 1,
      sessions: document.sessions.map((session) => session.governedSessionId === first.session.governedSessionId
        ? { ...session, status: 'CLOSED' as const, closedAt: '2026-08-13T07:00:00.000Z' }
        : session)
    }));

    let before = await readFile(file);
    await assert.rejects(service.resumeSession({
      governedSessionId: first.session.governedSessionId,
      resumeSecret: first.resumeSecret,
      repository: 'Patricked-code/MCP',
      taskScope: OPEN_INPUT.taskScope,
      expectedSessionRevision: first.session.sessionRevision
    }, {
      transportSessionId: 'transport-C-raw',
      identity: SHARED_IDENTITY
    }), /SESSION_CLOSED/);
    assert.deepEqual(await readFile(file), before);

    before = await readFile(file);
    await assert.rejects(service.resumeSession({
      governedSessionId: first.session.governedSessionId,
      resumeSecret: first.resumeSecret,
      repository: 'Patricked-code/MCP',
      taskScope: OPEN_INPUT.taskScope,
      expectedSessionRevision: first.session.sessionRevision
    }, {
      transportSessionId: 'transport-B-raw',
      identity: SHARED_IDENTITY
    }), /TRANSPORT_BINDING_CONFLICT/);
    assert.equal(second.session.governedSessionId,
      service.lookupGovernedSessionId('transport-B-raw'));
    assert.deepEqual(await readFile(file), before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('une session expirée au-delà de la grace period ne peut pas être reprise', async () => {
  const { directory, file, store, service } = await fixture();
  try {
    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-A-raw',
      identity: SHARED_IDENTITY
    });
    await store.update((document) => ({
      ...document,
      storeRevision: document.storeRevision + 1,
      sessions: document.sessions.map((session) => session.governedSessionId === opened.session.governedSessionId
        ? {
            ...session,
            status: 'EXPIRED' as const,
            expiredAt: '2026-07-01T07:00:00.000Z'
          }
        : session)
    }));

    const before = await readFile(file);
    await assert.rejects(service.resumeSession({
      governedSessionId: opened.session.governedSessionId,
      resumeSecret: opened.resumeSecret,
      repository: 'Patricked-code/MCP',
      taskScope: OPEN_INPUT.taskScope,
      expectedSessionRevision: opened.session.sessionRevision
    }, {
      transportSessionId: 'transport-B-raw',
      identity: SHARED_IDENTITY
    }), /SESSION_EXPIRED/);
    assert.deepEqual(await readFile(file), before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('heartbeat et acquittement gardent sessionRevision et stateVersion distincts', async () => {
  let currentStateVersion = 9;
  const { directory, file, service } = await fixture({
    stateVersion: () => currentStateVersion
  });
  try {
    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-A-raw',
      identity: OAUTH_IDENTITY
    });
    const heartbeat = await service.heartbeat({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision
    }, {
      transportSessionId: 'transport-A-raw',
      identity: OAUTH_IDENTITY
    });
    assert.equal(heartbeat.sessionRevision, opened.session.sessionRevision + 1);
    assert.equal(heartbeat.lastAcknowledgedStateVersion, null);

    const before = await readFile(file);
    await assert.rejects(service.acknowledgeContext({
      governedSessionId: heartbeat.governedSessionId,
      expectedSessionRevision: heartbeat.sessionRevision,
      expectedStateVersion: 8
    }, {
      transportSessionId: 'transport-A-raw',
      identity: OAUTH_IDENTITY
    }), /LIVE_STATE_VERSION_MISMATCH/);
    assert.deepEqual(await readFile(file), before);

    const acknowledged = await service.acknowledgeContext({
      governedSessionId: heartbeat.governedSessionId,
      expectedSessionRevision: heartbeat.sessionRevision,
      expectedStateVersion: currentStateVersion
    }, {
      transportSessionId: 'transport-A-raw',
      identity: OAUTH_IDENTITY
    });
    assert.equal(acknowledged.lastAcknowledgedStateVersion, 9);
    assert.equal(acknowledged.sessionRevision, heartbeat.sessionRevision + 1);

    currentStateVersion = 10;
    await assert.rejects(service.createCheckpoint({
      governedSessionId: acknowledged.governedSessionId,
      expectedSessionRevision: acknowledged.sessionRevision,
      expectedStateVersion: 9,
      completedAction: 'Task 6 RED',
      resultCode: 'PASS',
      pullRequestNumber: null,
      observedHeadSha: null,
      blockers: [],
      nextAction: null
    }, {
      transportSessionId: 'transport-A-raw',
      identity: OAUTH_IDENTITY
    }), /LIVE_STATE_VERSION_MISMATCH/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('checkpoint exige un contexte acquitté et reste borné/sanitizé', async () => {
  const { directory, service } = await fixture();
  try {
    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-A-raw',
      identity: OAUTH_IDENTITY
    });
    const request = {
      transportSessionId: 'transport-A-raw',
      identity: OAUTH_IDENTITY
    };
    await assert.rejects(service.createCheckpoint({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      expectedStateVersion: 9,
      completedAction: 'Task 6 RED',
      resultCode: 'PASS',
      pullRequestNumber: null,
      observedHeadSha: null,
      blockers: [],
      nextAction: 'continue'
    }, request), /CONTEXT_NOT_ACKNOWLEDGED/);

    const acknowledged = await service.acknowledgeContext({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      expectedStateVersion: 9
    }, request);
    const checkpoint = await service.createCheckpoint({
      governedSessionId: acknowledged.governedSessionId,
      expectedSessionRevision: acknowledged.sessionRevision,
      expectedStateVersion: 9,
      completedAction: 'Task 6 RED',
      resultCode: 'PASS',
      pullRequestNumber: 44,
      observedHeadSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      blockers: ['none'],
      nextAction: 'Task 6 GREEN'
    }, request);

    assert.equal(checkpoint.governedSessionId, acknowledged.governedSessionId);
    assert.equal(checkpoint.acknowledgedStateVersion, 9);
    assert.equal(checkpoint.taskScope, OPEN_INPUT.taskScope);
    assert.equal(JSON.stringify(checkpoint).includes('resumeSecret'), false);
    assert.equal((await service.getVisibleSession(checkpoint.governedSessionId, request))
      ?.lastCheckpoint?.checkpointId, checkpoint.checkpointId);

    const current = await service.getVisibleSession(checkpoint.governedSessionId, request);
    await assert.rejects(service.createCheckpoint({
      governedSessionId: checkpoint.governedSessionId,
      expectedSessionRevision: current?.sessionRevision ?? -1,
      expectedStateVersion: 9,
      completedAction: 'x'.repeat(241),
      resultCode: 'PASS',
      pullRequestNumber: null,
      observedHeadSha: null,
      blockers: [],
      nextAction: null
    }, request), /OPERATIONAL_STORE_INVALID_UPDATE/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('pause et close sont gouvernés, close est idempotent et bloque heartbeat', async () => {
  const { directory, service } = await fixture();
  try {
    const request = { transportSessionId: 'transport-A-raw', identity: OAUTH_IDENTITY };
    const opened = await service.openSession(OPEN_INPUT, request);
    const paused = await service.pauseSession({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision
    }, request);
    assert.equal(paused.status, 'PAUSED');

    const closed = await service.closeSession({
      governedSessionId: paused.governedSessionId,
      expectedSessionRevision: paused.sessionRevision
    }, request);
    assert.equal(closed.status, 'CLOSED');
    assert.deepEqual(await service.closeSession({
      governedSessionId: closed.governedSessionId,
      expectedSessionRevision: paused.sessionRevision
    }, request), closed);
    await assert.rejects(service.heartbeat({
      governedSessionId: closed.governedSessionId,
      expectedSessionRevision: closed.sessionRevision
    }, request), /SESSION_CLOSED/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('expiration idle et maintenance utilisent un timer unique unref', async () => {
  let currentTime = new Date('2026-08-13T07:00:00.000Z');
  const { directory, service } = await fixture({
    now: () => currentTime,
    idleTtlSeconds: 300
  });
  try {
    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-A-raw',
      identity: OAUTH_IDENTITY
    });
    currentTime = new Date('2026-08-13T07:06:00.000Z');
    assert.equal(await service.expireIdleSessions(), 1);
    assert.equal((await service.getVisibleSession(opened.session.governedSessionId, {
      transportSessionId: 'transport-A-raw',
      identity: OAUTH_IDENTITY
    }))?.status, 'EXPIRED');

    let scheduled = 0;
    let unrefCalled = 0;
    let cleared = 0;
    const timer = { unref: () => { unrefCalled += 1; } };
    const maintenance = startOperationalMemoryMaintenance({
      expireSessions: () => service.expireIdleSessions(),
      intervalMs: 60_000,
      setInterval: (callback, intervalMs) => {
        scheduled += 1;
        assert.equal(typeof callback, 'function');
        assert.equal(intervalMs, 60_000);
        return timer;
      },
      clearInterval: (value) => {
        assert.equal(value, timer);
        cleared += 1;
      }
    });
    assert.equal(scheduled, 1);
    assert.equal(unrefCalled, 1);
    maintenance.stop();
    maintenance.stop();
    assert.equal(cleared, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
