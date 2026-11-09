import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  CLIENT_OBSERVATION_THROTTLE_MS,
  classifyClientObservation,
  createClientObservationRecorder
} from '../src/operationalMemory/clientPresence.js';
import { createOperationalEventJournal } from '../src/operationalMemory/eventJournal.js';

const OAUTH_AUTH = {
  clientId: 'https://client.example/oauth-client',
  extra: { governedPrincipalId: 'oauth:operator-1', identityAssurance: 'oauth_subject' }
};
const SHARED_AUTH = {
  clientId: 'wealthtech-shared-mcp',
  extra: { governedPrincipalId: null, identityAssurance: 'shared_credential' }
};

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function fakeJournal() {
  const events: Array<{ type: string; governedSessionId: string | null; metadata: Record<string, unknown> }> = [];
  return {
    events,
    journal: {
      async append(input: { type: string; governedSessionId: string | null; metadata: Record<string, unknown> }) {
        events.push(input);
        return { schemaVersion: 1, eventId: 'e', processSequence: events.length, occurredAt: '', ...input } as never;
      }
    }
  };
}

test('only OAuth-authenticated MCP requests count as real client observations', () => {
  assert.deepEqual(classifyClientObservation(OAUTH_AUTH), {
    kind: 'REAL_CLIENT_OBSERVATION',
    principalId: 'oauth:operator-1'
  });
  assert.deepEqual(classifyClientObservation(SHARED_AUTH), {
    kind: 'NOT_CLIENT_PRESENCE',
    reasonCode: 'SHARED_CREDENTIAL_IS_NOT_CLIENT_PRESENCE'
  });
  assert.deepEqual(classifyClientObservation(undefined), {
    kind: 'NOT_CLIENT_PRESENCE',
    reasonCode: 'UNAUTHENTICATED'
  });
  assert.deepEqual(classifyClientObservation({
    clientId: 'x',
    extra: { governedPrincipalId: 'not-oauth', identityAssurance: 'oauth_subject' }
  }), {
    kind: 'NOT_CLIENT_PRESENCE',
    reasonCode: 'PRINCIPAL_NOT_OAUTH_SUBJECT'
  });
});

test('a real client observation is journaled with a principal digest and throttled', async () => {
  let now = Date.parse('2026-10-01T19:00:00.000Z');
  const { events, journal } = fakeJournal();
  const recorder = createClientObservationRecorder({ journal, now: () => new Date(now) });

  assert.equal((await recorder.observe(OAUTH_AUTH)).status, 'RECORDED');
  assert.deepEqual(events, [{
    type: 'client.observed',
    governedSessionId: null,
    metadata: {
      source: 'oauth_authenticated_mcp_request',
      identityAssurance: 'oauth_subject',
      principalDigest: digest('oauth:operator-1'),
      throttleWindowSeconds: CLIENT_OBSERVATION_THROTTLE_MS / 1000
    }
  }]);
  assert.equal(JSON.stringify(events).includes('operator-1"'), false);
  assert.equal(JSON.stringify(events).includes('client.example'), false);
  assert.equal(recorder.lastClientObservedAt('oauth:operator-1'), '2026-10-01T19:00:00.000Z');

  now += 5_000;
  assert.equal((await recorder.observe(OAUTH_AUTH)).status, 'THROTTLED');
  assert.equal(events.length, 1);
  assert.equal(recorder.lastClientObservedAt('oauth:operator-1'), '2026-10-01T19:00:05.000Z');

  now += CLIENT_OBSERVATION_THROTTLE_MS;
  assert.equal((await recorder.observe(OAUTH_AUTH)).status, 'RECORDED');
  assert.equal(events.length, 2);
});

test('shared-credential and unauthenticated traffic never produce client presence', async () => {
  const { events, journal } = fakeJournal();
  const recorder = createClientObservationRecorder({ journal });

  assert.equal((await recorder.observe(SHARED_AUTH)).status, 'IGNORED');
  assert.equal((await recorder.observe(undefined)).status, 'IGNORED');
  assert.equal(events.length, 0);
  assert.equal(recorder.lastClientObservedAt('oauth:operator-1'), null);
});

test('journal failures never break the MCP request path', async () => {
  const recorder = createClientObservationRecorder({
    journal: { async append() { throw new Error('disk full'); } }
  });
  assert.equal((await recorder.observe(OAUTH_AUTH)).status, 'JOURNAL_FAILED');
});

test('tracked principals are bounded', async () => {
  const { journal } = fakeJournal();
  const recorder = createClientObservationRecorder({ journal, maxTrackedPrincipals: 2 });
  for (const principal of ['oauth:a', 'oauth:b', 'oauth:c']) {
    await recorder.observe({ clientId: 'c', extra: { governedPrincipalId: principal, identityAssurance: 'oauth_subject' } });
  }
  assert.equal(recorder.lastClientObservedAt('oauth:a'), null);
  assert.ok(recorder.lastClientObservedAt('oauth:c'));
});

test('the operational journal accepts client.observed only with bounded metadata', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'client-presence-'));
  try {
    const filePath = path.join(dir, 'events.jsonl');
    const journal = createOperationalEventJournal({ filePath, maxBytes: 1_000_000, archives: 1 });
    await journal.append({
      type: 'client.observed',
      governedSessionId: null,
      metadata: {
        source: 'oauth_authenticated_mcp_request',
        identityAssurance: 'oauth_subject',
        principalDigest: digest('oauth:operator-1'),
        throttleWindowSeconds: 60
      }
    });
    await assert.rejects(journal.append({
      type: 'client.observed',
      governedSessionId: null,
      metadata: { principalId: 'oauth:operator-1' }
    }), /OPERATIONAL_EVENT_METADATA_FORBIDDEN/);
    assert.match(await readFile(filePath, 'utf8'), /"type":"client.observed"/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('client presence stays separate from agent heartbeat and synthetic health', async () => {
  const source = await readFile('src/operationalMemory/clientPresence.ts', 'utf8');
  assert.doesNotMatch(source, /sessionService|lastHeartbeatAt|heartbeat\(/);
  const server = await readFile('src/server.ts', 'utf8');
  assert.match(server, /clientObservationRecorder\.observe\(/);
  const healthRoute = server.slice(server.indexOf("app.get('/health'"), server.indexOf("app.get('/health'") + 400);
  assert.doesNotMatch(healthRoute, /clientObservationRecorder/);
});
