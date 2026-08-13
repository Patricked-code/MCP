import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createAtomicJsonStore } from '../src/operationalMemory/atomicStore.js';
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

async function fixture() {
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
    idleTtlSeconds: 86_400,
    resumeGraceSeconds: 604_800,
    now: () => new Date('2026-08-13T07:00:00.000Z')
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
    assert.equal(bindings.lookup('transport-B-raw'), opened.session.governedSessionId);
    assert.notEqual(
      resumed.currentTransport?.fingerprint,
      opened.session.currentTransport?.fingerprint
    );
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
