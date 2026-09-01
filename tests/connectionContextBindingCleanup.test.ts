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

const OPEN_INPUT = {
  repository: 'Patricked-code/MCP' as const,
  taskScope: 'TASK-20260901-001',
  workBranch: 'mcp/project-context-resolution-20260901',
  agentIdentity: 'codex-review-regression',
  blockers: [],
  nextAction: null
};

const VALID_OAUTH_IDENTITY: RequestIdentity = {
  principalId: 'oauth:user:123',
  clientId: 'chatgpt-client',
  assurance: 'oauth_subject'
};

const INVALID_OAUTH_IDENTITY: RequestIdentity = {
  principalId: 'oauth:user:123',
  clientId: 'x'.repeat(257),
  assurance: 'oauth_subject'
};

test('openSession releases the transport binding when ConnectionContext validation fails', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-connection-context-binding-'));
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
    now: () => new Date('2026-09-01T06:15:00.000Z')
  });

  try {
    await assert.rejects(service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-context-validation',
      identity: INVALID_OAUTH_IDENTITY
    }));

    assert.equal(bindings.lookup('transport-context-validation'), null);

    const opened = await service.openSession(OPEN_INPUT, {
      transportSessionId: 'transport-context-validation',
      identity: VALID_OAUTH_IDENTITY
    });

    assert.equal(
      bindings.lookup('transport-context-validation'),
      opened.session.governedSessionId
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
