import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createClientObservationRecorder,
  createSyntheticProbeClock,
  deriveClientPresenceState
} from '../src/operationalMemory/clientPresence.js';

const PRINCIPAL = 'oauth:operator-1';
const oauthAuth = (expiresAtSeconds?: number) => ({
  clientId: 'https://client.example/oauth-client',
  ...(expiresAtSeconds === undefined ? {} : { expiresAt: expiresAtSeconds }),
  extra: { governedPrincipalId: PRINCIPAL, identityAssurance: 'oauth_subject' }
});
const SHARED_AUTH = {
  clientId: 'wealthtech-shared-mcp',
  extra: { governedPrincipalId: null, identityAssurance: 'shared_credential' }
};
const journal = { async append() { return {} as never; } };

test('presence states are derived from the real-client clock only', () => {
  const now = Date.parse('2026-10-01T20:00:00.000Z');
  const at = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

  assert.equal(deriveClientPresenceState({ lastClientObservedAt: null, authExpiresAt: null, now }).state, 'UNKNOWN');
  assert.equal(deriveClientPresenceState({ lastClientObservedAt: at(1), authExpiresAt: null, now }).state, 'ACTIVE_OBSERVED');
  assert.equal(deriveClientPresenceState({ lastClientObservedAt: at(30), authExpiresAt: null, now }).state, 'RECENTLY_OBSERVED');
  const stale = deriveClientPresenceState({ lastClientObservedAt: at(180), authExpiresAt: null, now });
  assert.equal(stale.state, 'STALE');
  assert.ok(stale.reasonCodes.includes('STALE_IS_NOT_DISCONNECTED'));
  assert.equal(deriveClientPresenceState({
    lastClientObservedAt: at(30),
    authExpiresAt: at(10),
    now
  }).state, 'AUTH_EXPIRED');
});

test('the two clocks stay separate: synthetic probes never create client presence', async () => {
  let now = Date.parse('2026-10-01T20:00:00.000Z');
  const syntheticClock = createSyntheticProbeClock({ now: () => new Date(now) });
  const recorder = createClientObservationRecorder({ journal, now: () => new Date(now), syntheticClock });

  syntheticClock.record('health_probe');
  await recorder.observe(SHARED_AUTH);
  let presence = recorder.presenceFor(PRINCIPAL);
  assert.equal(presence.state, 'UNKNOWN');
  assert.equal(presence.lastClientObservedAt, null);
  assert.equal(presence.lastSyntheticProbeAt, '2026-10-01T20:00:00.000Z');
  assert.equal(presence.lastSyntheticProbeKind, 'shared_credential_mcp_request');
  assert.equal(presence.syntheticProbeProvesClientPresence, false);
  assert.equal(presence.authoritative, false);

  now += 60_000;
  await recorder.observe(oauthAuth(Math.floor(now / 1000) + 3600));
  presence = recorder.presenceFor(PRINCIPAL);
  assert.equal(presence.state, 'ACTIVE_OBSERVED');
  assert.equal(presence.lastClientObservedAt, '2026-10-01T20:01:00.000Z');
  assert.equal(presence.lastSyntheticProbeAt, '2026-10-01T20:00:00.000Z');

  now += 2 * 3600_000;
  syntheticClock.record('health_probe');
  presence = recorder.presenceFor(PRINCIPAL);
  assert.equal(presence.state, 'AUTH_EXPIRED');
  assert.equal(presence.lastSyntheticProbeKind, 'health_probe');
});

test('presence for an absent principal is UNKNOWN and never inferred', () => {
  const recorder = createClientObservationRecorder({ journal });
  const presence = recorder.presenceFor(null);
  assert.equal(presence.state, 'UNKNOWN');
  assert.ok(presence.reasonCodes.includes('NO_OAUTH_PRINCIPAL'));
  assert.equal(JSON.stringify(presence).includes('oauth:'), false);
});

test('REVOKED is never produced without revocation evidence', () => {
  const now = Date.parse('2026-10-01T20:00:00.000Z');
  const presence = deriveClientPresenceState({ lastClientObservedAt: null, authExpiresAt: null, now });
  assert.ok(presence.reasonCodes.includes('REVOCATION_EVIDENCE_UNAVAILABLE'));
});

test('governed context projects client presence read-only and health feeds only the synthetic clock', async () => {
  const service = await readFile('src/governedContext/service.ts', 'utf8');
  assert.match(service, /clientPresence: options\.clientPresence\.presenceFor\(session\?\.ownerPrincipalId \?\? null\)/);
  const types = await readFile('src/governedContext/types.ts', 'utf8');
  assert.match(types, /clientPresence\?: ClientPresence;/);
  const server = await readFile('src/server.ts', 'utf8');
  const healthRoute = server.slice(server.indexOf("app.get('/health'"), server.indexOf("app.get('/health'") + 400);
  assert.match(healthRoute, /syntheticProbeClock\.record\('health_probe'\)/);
  assert.doesNotMatch(healthRoute, /\.observe\(/);
});
