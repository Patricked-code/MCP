import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20261004-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const {
  SERVED_DOMAINS_COMMAND,
  SERVED_DOMAINS_MAX,
  parseServedDomainInventory,
  collectServedDomains,
  unavailableServedDomainInventory,
  liveStateDomainObservation
} = await import('../src/liveState/servedDomains.js');
const { assertReadOnlyCommand } = await import('../src/ssh/safety.js');
const { DomainResolutionInputSchema } = await import('../src/governedWorkflow/resolvers/domain.js');

const OBSERVED_AT = '2026-10-08T10:00:00.000Z';

function snapshot(servedDomains: unknown, reconciledAt = OBSERVED_AT) {
  return {
    repository: 'Patricked-code/MCP', stateVersion: 4, lastReconciledAt: reconciledAt, generatedAt: reconciledAt,
    maxAgeSeconds: 60, freshness: 'CURRENT', ageSeconds: 0, servedDomains
  } as any;
}

test('F-04 observe-binding: the vhost inventory command is read-only and bounded', () => {
  assert.doesNotThrow(() => assertReadOnlyCommand(SERVED_DOMAINS_COMMAND));
  assert.match(SERVED_DOMAINS_COMMAND, /-maxdepth 1/);
  assert.match(SERVED_DOMAINS_COMMAND, new RegExp(`head -n ${SERVED_DOMAINS_MAX + 1}`));
});

test('F-04 observe-binding: parsing keeps valid domains, normalizes and skips Plesk system entries', () => {
  const inventory = parseServedDomainInventory(
    'Example.COM\nsystem\ndefault\nchroot\n.skel\nfs\napi.example.com\nbad_name\nexample.com\n',
    OBSERVED_AT
  );
  assert.equal(inventory.status, 'CURRENT');
  assert.deepEqual(inventory.domains, ['api.example.com', 'example.com']);
  assert.equal(inventory.observedAt, OBSERVED_AT);
});

test('F-04 observe-binding: an inventory over the bound is unavailable, never a partial absence', () => {
  const lines = Array.from({ length: SERVED_DOMAINS_MAX + 1 }, (_, index) => `d${index}.example.com`).join('\n');
  const inventory = parseServedDomainInventory(lines, OBSERVED_AT);
  assert.equal(inventory.status, 'UNAVAILABLE');
  assert.deepEqual(inventory.domains, []);
});

test('F-04 observe-binding: a failed or throwing read stays unavailable', async () => {
  const failed = await collectServedDomains({ runReadOnly: async () => ({ code: 2, stdout: 'x.example.com' }), now: () => new Date(OBSERVED_AT) });
  assert.equal(failed.status, 'UNAVAILABLE');
  const thrown = await collectServedDomains({ runReadOnly: async () => { throw new Error('ssh'); }, now: () => new Date(OBSERVED_AT) });
  assert.equal(thrown.status, 'UNAVAILABLE');
  const commands: string[] = [];
  const ok = await collectServedDomains({ runReadOnly: async (command) => { commands.push(command); return { code: 0, stdout: 'example.com\n' }; }, now: () => new Date(OBSERVED_AT) });
  assert.deepEqual(commands, [SERVED_DOMAINS_COMMAND]);
  assert.deepEqual(ok.domains, ['example.com']);
});

test('F-04 observe-binding: Live State projects a schema-valid C5 observation for its own server only', () => {
  const inventory = parseServedDomainInventory('example.com\n', OBSERVED_AT);
  const observation = liveStateDomainObservation(snapshot(inventory), 'S1', new Date(OBSERVED_AT)) as any;
  assert.ok(DomainResolutionInputSchema.shape.observation.safeParse(observation).success);
  assert.equal(observation.available, true);
  assert.equal(observation.freshness, 'CURRENT');
  assert.equal(observation.serverId, 's1');
  assert.deepEqual(observation.domains, [{ domain: 'example.com', verified: true, evidenceRef: 'live_state:state_version:4:vhost' }]);

  // Another server, no snapshot or no inventory: no observation authority answers.
  assert.equal(liveStateDomainObservation(snapshot(inventory), 's2', new Date(OBSERVED_AT)), null);
  assert.equal(liveStateDomainObservation(snapshot(inventory), null, new Date(OBSERVED_AT)), null);
  assert.equal(liveStateDomainObservation(null, 's1', new Date(OBSERVED_AT)), null);
  assert.equal(liveStateDomainObservation(snapshot(undefined), 's1', new Date(OBSERVED_AT)), null);

  // An unavailable inventory is unavailable; an old snapshot is stale.
  const unavailable = liveStateDomainObservation(snapshot(unavailableServedDomainInventory(OBSERVED_AT)), 's1', new Date(OBSERVED_AT)) as any;
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.freshness, 'UNKNOWN');
  const stale = liveStateDomainObservation(snapshot(inventory), 's1', new Date(Date.parse(OBSERVED_AT) + 3_600_000)) as any;
  assert.equal(stale.freshness, 'STALE');
});
