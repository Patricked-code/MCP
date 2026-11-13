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
  principalId: 'oauth:wealthtech-mcp-admin',
  clientId: 'chatgpt-client',
  assurance: 'oauth_subject'
};

test('OAuth initialize leaves the new transport unbound: no implicit work-session selection', async () => {
  const server = await readFile(new URL('../src/server.ts', import.meta.url), 'utf8');
  const initialized = server.match(
    /onsessioninitialized:\s*\(newSessionId: string\)\s*=>\s*\{([\s\S]*?)\n\s{10}\}/
  )?.[1];

  assert.ok(initialized, 'MCP transport initialize callback must be present');
  assert.match(initialized, /transports\[newSessionId\]\s*=\s*transport/);
  assert.doesNotMatch(initialized, /autoResume|resumeSession|bindTransport|governedSessionId/);
  assert.doesNotMatch(server, /autoResumeGovernedSessionForTransport\s*\(/);
  assert.doesNotMatch(server, /transportBootstraps\[/);
  assert.match(server, /sessions\.unbindTransport\(transport\.sessionId\)/);
});

test('one OAuth principal can explicitly open an independent governed session without modifying Regulatory', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-auth-unbound-'));
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
      now: () => new Date('2026-11-13T00:00:00.000Z')
    });
    const originalTransport = 'transport-regulatory';
    const newTransport = 'transport-new4';
    const originalRequest = { transportSessionId: originalTransport, identity: OAUTH_IDENTITY };
    const newRequest = { transportSessionId: newTransport, identity: OAUTH_IDENTITY };
    const regulatory = await service.openSession({
      repository: 'Patricked-code/MCP',
      taskScope: 'TASK-REGULATORY-EXISTING',
      workBranch: 'mcp/regulatory-existing',
      agentIdentity: 'chatgpt',
      blockers: [],
      nextAction: 'preserve regulatory'
    }, originalRequest);

    // OAuth and a new HTTP transport are not themselves a governed-session decision.
    assert.equal(bindings.lookup(newTransport), null);
    assert.equal(bindings.lookup(originalTransport), regulatory.session.governedSessionId);

    const independent = await service.openSession({
      repository: 'Patricked-code/MCP',
      taskScope: 'TASK-AUTH-INDEPENDENT',
      workBranch: 'mcp/independent-auth',
      agentIdentity: 'chatgpt',
      blockers: [],
      nextAction: 'proceed independently'
    }, newRequest);

    assert.notEqual(independent.session.governedSessionId, regulatory.session.governedSessionId);
    assert.equal(bindings.lookup(newTransport), independent.session.governedSessionId);
    assert.equal(bindings.lookup(originalTransport), regulatory.session.governedSessionId);
    const originalAfter = await service.getVisibleSession(regulatory.session.governedSessionId, originalRequest);
    assert.equal(originalAfter?.sessionRevision, regulatory.session.sessionRevision);
    assert.equal(originalAfter?.status, regulatory.session.status);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
