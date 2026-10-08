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
  collectServedDomainInventories,
  unavailableServedDomainInventory,
  liveStateDomainObservation,
  declaredProjectDomains,
  scopeDomainObservation
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

test('F-04 observe-binding: the inventory reads the per-domain Plesk level, read-only, without a pipe', () => {
  assert.doesNotThrow(() => assertReadOnlyCommand(SERVED_DOMAINS_COMMAND));
  // Nested subscription domains each have their own system/<domain> directory.
  assert.match(SERVED_DOMAINS_COMMAND, /\/var\/www\/vhosts\/system /);
  // A pipe would hide a failing find behind the exit status of its last stage.
  assert.doesNotMatch(SERVED_DOMAINS_COMMAND, /\||2>/);
});

test('F-04 observe-binding: parsing normalizes domains; any other entry makes the inventory unavailable', () => {
  const inventory = parseServedDomainInventory('Example.COM\napi.sadiaaf.example.com\nexample.com\n', OBSERVED_AT);
  assert.equal(inventory.status, 'CURRENT');
  assert.deepEqual(inventory.domains, ['api.sadiaaf.example.com', 'example.com']);
  assert.equal(parseServedDomainInventory('example.com\nbad_name\n', OBSERVED_AT).status, 'UNAVAILABLE');
  assert.equal(parseServedDomainInventory('example.com\n...[sortie plafonnée par le MCP]', OBSERVED_AT).status, 'UNAVAILABLE');
  // The raw name is checked before any normalization: padding or an empty name is not a domain.
  assert.equal(parseServedDomainInventory(' example.com\n', OBSERVED_AT).status, 'UNAVAILABLE');
  assert.equal(parseServedDomainInventory('example.com\n \n', OBSERVED_AT).status, 'UNAVAILABLE');
  assert.equal(parseServedDomainInventory('example.com\n\nother.example.com\n', OBSERVED_AT).status, 'UNAVAILABLE');
  assert.deepEqual(parseServedDomainInventory('', OBSERVED_AT), { status: 'CURRENT', observedAt: OBSERVED_AT, domains: [] });
  // A Plesk wildcard vhost directory is excluded, not corruption.
  assert.deepEqual(parseServedDomainInventory('_example.com\nexample.com\n', OBSERVED_AT).domains, ['example.com']);
  assert.equal(parseServedDomainInventory('_bad_\n', OBSERVED_AT).status, 'UNAVAILABLE');
});

test('F-04 observe-binding: an inventory over the bound is unavailable, never a partial absence', () => {
  const lines = Array.from({ length: SERVED_DOMAINS_MAX + 1 }, (_, index) => `d${index}.example.com`).join('\n');
  const inventory = parseServedDomainInventory(lines, OBSERVED_AT);
  assert.equal(inventory.status, 'UNAVAILABLE');
  assert.deepEqual(inventory.domains, []);
});

test('F-04 observe-binding: a failed or throwing read stays unavailable, per server', async () => {
  const failed = await collectServedDomains({ runReadOnly: async () => ({ code: 1, stdout: '' }), now: () => new Date(OBSERVED_AT) });
  assert.equal(failed.status, 'UNAVAILABLE');
  const thrown = await collectServedDomains({ runReadOnly: async () => { throw new Error('ssh'); }, now: () => new Date(OBSERVED_AT) });
  assert.equal(thrown.status, 'UNAVAILABLE');
  const calls: string[] = [];
  const inventories = await collectServedDomainInventories({
    runReadOnly: async (serverId, command) => {
      calls.push(`${serverId}:${command}`);
      return serverId === 's1' ? { code: 0, stdout: 'example.com\n' } : { code: 1, stdout: '' };
    },
    now: () => new Date(OBSERVED_AT)
  });
  assert.deepEqual(calls.sort(), [`s1:${SERVED_DOMAINS_COMMAND}`, `s2:${SERVED_DOMAINS_COMMAND}`]);
  assert.deepEqual(inventories.s1?.domains, ['example.com']);
  assert.equal(inventories.s2?.status, 'UNAVAILABLE');
});

test('F-04 observe-binding: Live State projects a schema-valid C5 observation for each managed server', () => {
  const inventories = {
    s1: parseServedDomainInventory('example.com\n', OBSERVED_AT),
    s2: parseServedDomainInventory('africafunds.example.org\n', OBSERVED_AT)
  };
  const s1 = liveStateDomainObservation(snapshot(inventories), 'S1', new Date(OBSERVED_AT)) as any;
  assert.ok(DomainResolutionInputSchema.shape.observation.safeParse(s1).success);
  assert.equal(s1.available, true);
  assert.equal(s1.freshness, 'CURRENT');
  assert.equal(s1.serverId, 's1');
  assert.deepEqual(s1.domains, [{ domain: 'example.com', verified: true, evidenceRef: 'live_state:state_version:4:vhost' }]);
  const s2 = liveStateDomainObservation(snapshot(inventories), 's2', new Date(OBSERVED_AT)) as any;
  assert.deepEqual(s2.domains.map((entry: any) => entry.domain), ['africafunds.example.org']);

  // An unknown server, no snapshot or no inventory: no observation authority answers.
  assert.equal(liveStateDomainObservation(snapshot(inventories), 's3', new Date(OBSERVED_AT)), null);
  assert.equal(liveStateDomainObservation(snapshot(inventories), null, new Date(OBSERVED_AT)), null);
  assert.equal(liveStateDomainObservation(null, 's1', new Date(OBSERVED_AT)), null);
  assert.equal(liveStateDomainObservation(snapshot(undefined), 's1', new Date(OBSERVED_AT)), null);

  // An unavailable inventory is unavailable; an old snapshot is stale.
  const unavailable = liveStateDomainObservation(snapshot({ s1: unavailableServedDomainInventory(OBSERVED_AT) }), 's1', new Date(OBSERVED_AT)) as any;
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.freshness, 'UNKNOWN');
  const stale = liveStateDomainObservation(snapshot(inventories), 's1', new Date(Date.parse(OBSERVED_AT) + 3_600_000)) as any;
  assert.equal(stale.freshness, 'STALE');
});

test('F-04 observe-binding: the observation is scoped to the selected project on a shared server', () => {
  const registry = {
    projects: [
      { projectId: 'alpha', publicDomain: 'Alpha.example.com.', publicApi: 'https://api.alpha.example.com/v1', historicalVhosts: [] },
      { projectId: 'beta', publicDomain: 'beta.example.com', publicApi: null, historicalVhosts: [] }
    ],
    mappings: [
      { mappingId: 'm1', repositoryId: 'github:o/a', projectId: 'alpha', componentRole: null, serverId: 'S1', domain: 'admin.alpha.example.com', domainVerified: false },
      { mappingId: 'm2', repositoryId: 'github:o/a', projectId: 'alpha', componentRole: null, serverId: 's2', domain: 'other.alpha.example.com', domainVerified: false }
    ]
  } as any;
  const declared = declaredProjectDomains(registry, 'alpha', 's1');
  assert.deepEqual([...declared].sort(), ['admin.alpha.example.com', 'alpha.example.com', 'api.alpha.example.com']);
  const observation = liveStateDomainObservation(
    snapshot({ s1: parseServedDomainInventory('alpha.example.com\nbeta.example.com\nlegacy.example.net\n', OBSERVED_AT) }),
    's1',
    new Date(OBSERVED_AT)
  );
  const scoped = scopeDomainObservation(observation, declared) as any;
  assert.deepEqual(scoped.domains.map((entry: any) => entry.domain), ['alpha.example.com']);
  assert.equal(scoped.available, true);
  // No declared domain: the inventory carries no ownership, so no absence is claimed.
  const undeclared = scopeDomainObservation(observation, declaredProjectDomains(registry, 'gamma', 's1')) as any;
  assert.equal(undeclared.available, false);
  assert.equal(undeclared.freshness, 'UNKNOWN');
  assert.deepEqual(undeclared.domains, []);
  // Nothing to scope in an unavailable or absent observation.
  assert.equal(scopeDomainObservation(null, declared), null);
});
