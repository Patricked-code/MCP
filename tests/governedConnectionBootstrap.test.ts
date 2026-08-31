import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
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
  principalId: 'oauth:user:bootstrap',
  clientId: 'chatgpt-client',
  assurance: 'oauth_subject'
};

const OPEN_INPUT = {
  repository: 'Patricked-code/MCP' as const,
  taskScope: 'TASK-BOOTSTRAP-EXISTING',
  workBranch: 'mcp/existing-work',
  agentIdentity: 'chatgpt',
  blockers: [],
  nextAction: 'continue existing governed work'
};

test('un nouveau transport OAuth attache automatiquement l unique governed session active compatible', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-auto-bootstrap-'));
  try {
    const store = createAtomicJsonStore({
      filePath: join(directory, 'sessions.json'),
      schema: SessionStoreDocumentSchema,
      empty: createEmptySessionStoreDocument
    });
    const bindings = createTransportBindings();
    const service = createGovernedSessionService({
      store,
      bindings,
      idleTtlSeconds: 86_400,
      resumeGraceSeconds: 604_800,
      now: () => new Date('2026-08-29T14:00:00.000Z')
    });
    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-existing-raw',
      identity: OAUTH_IDENTITY
    });
    service.unbindTransport('transport-existing-raw');

    const result = await service.autoResumeCompatibleSession(
      { repository: 'Patricked-code/MCP' },
      {
        transportSessionId: 'transport-new-raw',
        identity: OAUTH_IDENTITY
      }
    );

    assert.equal(result.status, 'ATTACHED');
    if (result.status !== 'ATTACHED') assert.fail('expected ATTACHED');
    assert.equal(result.session.governedSessionId, opened.session.governedSessionId);
    assert.equal(result.session.sessionRevision, opened.session.sessionRevision);
    assert.equal(bindings.lookup('transport-new-raw'), opened.session.governedSessionId);
    assert.equal(
      result.session.currentTransport?.fingerprint,
      opened.session.currentTransport?.fingerprint
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});


test('une governed session OAuth expirée est réellement reprise et incrémente sa révision', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-auto-bootstrap-expired-'));
  let currentTime = new Date('2026-08-29T14:00:00.000Z');
  try {
    const store = createAtomicJsonStore({
      filePath: join(directory, 'sessions.json'),
      schema: SessionStoreDocumentSchema,
      empty: createEmptySessionStoreDocument
    });
    const bindings = createTransportBindings();
    const service = createGovernedSessionService({
      store,
      bindings,
      idleTtlSeconds: 1,
      resumeGraceSeconds: 604_800,
      now: () => currentTime
    });
    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-expired-existing-raw',
      identity: OAUTH_IDENTITY
    });
    service.unbindTransport('transport-expired-existing-raw');
    currentTime = new Date('2026-08-29T14:00:02.000Z');
    assert.equal(await service.expireIdleSessions(), 1);

    const result = await service.autoResumeCompatibleSession(
      { repository: 'Patricked-code/MCP' },
      {
        transportSessionId: 'transport-expired-new-raw',
        identity: OAUTH_IDENTITY
      }
    );

    assert.equal(result.status, 'RESUMED');
    if (result.status !== 'RESUMED') assert.fail('expected RESUMED');
    assert.equal(result.session.governedSessionId, opened.session.governedSessionId);
    assert.equal(result.session.status, 'ACTIVE');
    assert.equal(result.session.sessionRevision, opened.session.sessionRevision + 2);
    assert.equal(
      bindings.lookup('transport-expired-new-raw'),
      opened.session.governedSessionId
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('plusieurs governed sessions OAuth compatibles échouent fermé sans liaison arbitraire', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-auto-bootstrap-ambiguous-'));
  try {
    const store = createAtomicJsonStore({
      filePath: join(directory, 'sessions.json'),
      schema: SessionStoreDocumentSchema,
      empty: createEmptySessionStoreDocument
    });
    const bindings = createTransportBindings();
    const service = createGovernedSessionService({
      store,
      bindings,
      idleTtlSeconds: 86_400,
      resumeGraceSeconds: 604_800,
      now: () => new Date('2026-08-29T14:00:00.000Z')
    });

    const first = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-first-raw',
      identity: OAUTH_IDENTITY
    });
    const second = await service.openSession({
      ...OPEN_INPUT,
      taskScope: 'TASK-BOOTSTRAP-SECOND',
      workBranch: 'mcp/second-work'
    }, {
      transportSessionId: 'transport-second-raw',
      identity: OAUTH_IDENTITY
    });
    service.unbindTransport('transport-first-raw');
    service.unbindTransport('transport-second-raw');

    const result = await service.autoResumeCompatibleSession(
      { repository: 'Patricked-code/MCP' },
      {
        transportSessionId: 'transport-new-ambiguous-raw',
        identity: OAUTH_IDENTITY
      }
    );

    assert.equal(result.status, 'AMBIGUOUS');
    assert.equal(bindings.lookup('transport-new-ambiguous-raw'), null);
    const firstAfter = await service.getVisibleSession(first.session.governedSessionId, {
      transportSessionId: 'transport-new-ambiguous-raw',
      identity: OAUTH_IDENTITY
    });
    const secondAfter = await service.getVisibleSession(second.session.governedSessionId, {
      transportSessionId: 'transport-new-ambiguous-raw',
      identity: OAUTH_IDENTITY
    });
    assert.equal(firstAfter?.sessionRevision, first.session.sessionRevision);
    assert.equal(secondAfter?.sessionRevision, second.session.sessionRevision);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('un credential partagé ne reprend jamais automatiquement une governed session non liée', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-auto-bootstrap-shared-'));
  try {
    const store = createAtomicJsonStore({
      filePath: join(directory, 'sessions.json'),
      schema: SessionStoreDocumentSchema,
      empty: createEmptySessionStoreDocument
    });
    const bindings = createTransportBindings();
    const service = createGovernedSessionService({
      store,
      bindings,
      idleTtlSeconds: 86_400,
      resumeGraceSeconds: 604_800,
      now: () => new Date('2026-08-29T14:00:00.000Z')
    });
    const sharedIdentity: RequestIdentity = {
      principalId: 'shared:legacy',
      clientId: 'wealthtech-shared-mcp',
      assurance: 'shared_credential'
    };
    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-shared-existing-raw',
      identity: sharedIdentity
    });
    service.unbindTransport('transport-shared-existing-raw');

    const result = await service.autoResumeCompatibleSession(
      { repository: 'Patricked-code/MCP' },
      {
        transportSessionId: 'transport-shared-new-raw',
        identity: sharedIdentity
      }
    );

    assert.equal(result.status, 'NONE');
    assert.equal(bindings.lookup('transport-shared-new-raw'), null);
    const after = await service.getVisibleSession(opened.session.governedSessionId, {
      transportSessionId: 'transport-shared-new-raw',
      identity: sharedIdentity
    });
    assert.equal(after, null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('des transports OAuth successifs s attachent sans invalider la révision optimiste', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-auto-bootstrap-transport-churn-'));
  try {
    const store = createAtomicJsonStore({
      filePath: join(directory, 'sessions.json'),
      schema: SessionStoreDocumentSchema,
      empty: createEmptySessionStoreDocument
    });
    const bindings = createTransportBindings();
    const service = createGovernedSessionService({
      store,
      bindings,
      idleTtlSeconds: 86_400,
      resumeGraceSeconds: 604_800,
      now: () => new Date('2026-08-31T21:21:25.000Z'),
      getLiveState: async () => ({ stateVersion: 59 })
    });
    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-churn-first-raw',
      identity: OAUTH_IDENTITY
    });
    service.unbindTransport('transport-churn-first-raw');

    const first = await service.autoResumeCompatibleSession(
      { repository: 'Patricked-code/MCP' },
      {
        transportSessionId: 'transport-churn-second-raw',
        identity: OAUTH_IDENTITY
      }
    );
    const firstWithSession = first as {
      status: string;
      session?: { governedSessionId: string; sessionRevision: number };
    };

    assert.equal(firstWithSession.status, 'ATTACHED');
    assert.equal(firstWithSession.session?.sessionRevision, opened.session.sessionRevision);
    assert.equal(
      bindings.lookup('transport-churn-second-raw'),
      opened.session.governedSessionId
    );

    service.unbindTransport('transport-churn-second-raw');
    const observedBeforeNextTransport = await service.getVisibleSession(
      opened.session.governedSessionId,
      {
        transportSessionId: 'transport-churn-second-raw',
        identity: OAUTH_IDENTITY
      }
    );
    assert.equal(observedBeforeNextTransport?.sessionRevision, opened.session.sessionRevision);

    const second = await service.autoResumeCompatibleSession(
      { repository: 'Patricked-code/MCP' },
      {
        transportSessionId: 'transport-churn-third-raw',
        identity: OAUTH_IDENTITY
      }
    );
    const secondWithSession = second as {
      status: string;
      session?: { governedSessionId: string; sessionRevision: number };
    };

    assert.equal(secondWithSession.status, 'ATTACHED');
    assert.equal(
      secondWithSession.session?.sessionRevision,
      observedBeforeNextTransport?.sessionRevision
    );

    const acknowledged = await service.acknowledgeContext({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: observedBeforeNextTransport?.sessionRevision ?? -1,
      expectedStateVersion: 59
    }, {
      transportSessionId: 'transport-churn-third-raw',
      identity: OAUTH_IDENTITY
    });
    assert.equal(
      acknowledged.sessionRevision,
      (observedBeforeNextTransport?.sessionRevision ?? 0) + 1
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
