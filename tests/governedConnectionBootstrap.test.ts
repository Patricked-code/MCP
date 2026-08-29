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

test('un nouveau transport OAuth reprend automatiquement l unique governed session compatible', async () => {
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

    const result = await (service as typeof service & {
      autoResumeCompatibleSession(input: { repository: 'Patricked-code/MCP' }, request: {
        transportSessionId: string;
        identity: RequestIdentity;
      }): Promise<{ status: 'RESUMED'; session: typeof opened.session }>;
    }).autoResumeCompatibleSession({ repository: 'Patricked-code/MCP' }, {
      transportSessionId: 'transport-new-raw',
      identity: OAUTH_IDENTITY
    });

    assert.equal(result.status, 'RESUMED');
    assert.equal(result.session.governedSessionId, opened.session.governedSessionId);
    assert.equal(bindings.lookup('transport-new-raw'), opened.session.governedSessionId);
    assert.notEqual(result.session.currentTransport?.fingerprint, opened.session.currentTransport?.fingerprint);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
