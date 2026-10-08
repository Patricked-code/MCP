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

/** Plesk rows: one `<name>\t<subscription>` line each; a bare name gets subscription 1. */
function rows(...names: string[]): string {
  return names.map((name) => (name.includes('\t') ? name : `${name}\t1`)).join('\n') + '\n';
}

function snapshot(servedDomains: unknown, reconciledAt = OBSERVED_AT) {
  return {
    repository: 'Patricked-code/MCP', stateVersion: 4, lastReconciledAt: reconciledAt, generatedAt: reconciledAt,
    maxAgeSeconds: 60, freshness: 'CURRENT', ageSeconds: 0, servedDomains
  } as any;
}

test('F-04 observe-binding: the inventory reads Plesk records of active served names, read-only', () => {
  assert.doesNotThrow(() => assertReadOnlyCommand(SERVED_DOMAINS_COMMAND));
  // A suspended or disabled site keeps its directory: only Plesk's status says it is served.
  assert.match(SERVED_DOMAINS_COMMAND, /FROM domains d WHERE d\.status = 0 AND d\.webspace_status = 0 AND d\.htype <> 'none'/);
  // An alias has no directory of its own; active web aliases are served names too.
  // An alias is served only while its domain and subscription are active.
  assert.match(SERVED_DOMAINS_COMMAND, /FROM domain_aliases a JOIN domains d ON d\.id = a\.dom_id WHERE a\.status = 0 AND a\.web = 'true' AND d\.status = 0 AND d\.webspace_status = 0/);
  // No pipe: a failing read keeps its own exit status.
  assert.doesNotMatch(SERVED_DOMAINS_COMMAND, /\||2>/);
});

test('F-04 observe-binding: parsing normalizes domains; any other entry makes the inventory unavailable', () => {
  const inventory = parseServedDomainInventory(rows('Example.COM', 'api.sadiaaf.example.com'), OBSERVED_AT);
  assert.equal(inventory.status, 'CURRENT');
  assert.deepEqual(inventory.domains, ['api.sadiaaf.example.com', 'example.com']);
  assert.deepEqual(inventory.subscriptions, { 'api.sadiaaf.example.com': '1', 'example.com': '1' });
  assert.equal(parseServedDomainInventory(rows('example.com', 'bad_name'), OBSERVED_AT).status, 'UNAVAILABLE');
  // Every row carries exactly one subscription id, and a name belongs to one subscription.
  assert.equal(parseServedDomainInventory('example.com\n', OBSERVED_AT).status, 'UNAVAILABLE');
  assert.equal(parseServedDomainInventory('example.com\t0\n', OBSERVED_AT).status, 'UNAVAILABLE');
  assert.equal(parseServedDomainInventory('example.com\t1\t2\n', OBSERVED_AT).status, 'UNAVAILABLE');
  assert.equal(parseServedDomainInventory(rows('example.com\t1', 'example.com\t2'), OBSERVED_AT).status, 'UNAVAILABLE');
  assert.equal(parseServedDomainInventory('example.com\t1\n...[sortie plafonnée par le MCP]', OBSERVED_AT).status, 'UNAVAILABLE');
  // The raw name is checked before any normalization: padding or an empty name is not a domain.
  assert.equal(parseServedDomainInventory(rows(' example.com'), OBSERVED_AT).status, 'UNAVAILABLE');
  assert.equal(parseServedDomainInventory('example.com\t1\n \n', OBSERVED_AT).status, 'UNAVAILABLE');
  assert.equal(parseServedDomainInventory('example.com\t1\n\nother.example.com\t1\n', OBSERVED_AT).status, 'UNAVAILABLE');
  assert.deepEqual(parseServedDomainInventory('', OBSERVED_AT), { status: 'CURRENT', observedAt: OBSERVED_AT, domains: [], subscriptions: {} });
  // A wildcard subdomain is excluded, not corruption.
  assert.deepEqual(parseServedDomainInventory(rows('*.example.com', 'example.com'), OBSERVED_AT).domains, ['example.com']);
  assert.equal(parseServedDomainInventory(rows('*.bad_'), OBSERVED_AT).status, 'UNAVAILABLE');
  // Internationalized names are kept in Punycode, a Punycode TLD included.
  assert.deepEqual(parseServedDomainInventory(rows('example.xn--p1ai', 'xn--80ak6aa92e.com'), OBSERVED_AT).domains, ['example.xn--p1ai', 'xn--80ak6aa92e.com']);
  // A label that only looks like Punycode is not a domain.
  assert.equal(parseServedDomainInventory(rows('example.xn--a'), OBSERVED_AT).status, 'UNAVAILABLE');
  assert.equal(parseServedDomainInventory(rows('example.xn--foo-'), OBSERVED_AT).status, 'UNAVAILABLE');
});

test('F-04 observe-binding: an inventory over the bound is unavailable, never a partial absence', () => {
  const lines = Array.from({ length: SERVED_DOMAINS_MAX + 1 }, (_, index) => `d${index}.example.com\t1`).join('\n');
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
      return serverId === 's1' ? { code: 0, stdout: rows('example.com') } : { code: 1, stdout: '' };
    },
    now: () => new Date(OBSERVED_AT)
  });
  assert.deepEqual(calls.sort(), [`s1:${SERVED_DOMAINS_COMMAND}`, `s2:${SERVED_DOMAINS_COMMAND}`]);
  assert.deepEqual(inventories.s1?.domains, ['example.com']);
  assert.equal(inventories.s2?.status, 'UNAVAILABLE');
});

test('F-04 observe-binding: Live State projects a schema-valid C5 observation for each managed server', () => {
  const inventories = {
    s1: parseServedDomainInventory(rows('example.com'), OBSERVED_AT),
    s2: parseServedDomainInventory(rows('africafunds.example.org'), OBSERVED_AT)
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
  // Each inventory ages from its own read: a later reconciliation does not refresh it.
  const late = new Date(Date.parse(OBSERVED_AT) + 90_000);
  const aged = liveStateDomainObservation(snapshot(inventories, late.toISOString()), 's1', late) as any;
  assert.equal(aged.freshness, 'STALE');
  assert.equal(aged.observedAt, OBSERVED_AT);
});

test('F-04 observe-binding: the observation is scoped to the subscriptions of the selected project', () => {
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
  // Subscription 7 serves alpha and an undeclared legacy name; subscription 9 serves another project.
  const inventory = parseServedDomainInventory(
    rows('alpha.example.com\t7', 'legacy.alpha.example.net\t7', 'beta.example.com\t9', 'other.example.org\t9'),
    OBSERVED_AT
  );
  const observation = liveStateDomainObservation(snapshot({ s1: inventory }), 's1', new Date(OBSERVED_AT));
  const scoped = scopeDomainObservation(observation, inventory, declared) as any;
  // Another subscription is left out; an undeclared name of the project's own subscription is kept.
  assert.deepEqual(scoped.domains.map((entry: any) => entry.domain), ['alpha.example.com', 'legacy.alpha.example.net']);
  assert.equal(scoped.available, true);
  assert.ok(DomainResolutionInputSchema.shape.observation.safeParse(scoped).success);

  // No declared name served: no subscription is owned, so nothing is observed for the project.
  const unserved = scopeDomainObservation(observation, inventory, new Set(['gamma.example.com'])) as any;
  assert.equal(unserved.available, true);
  assert.deepEqual(unserved.domains, []);

  // No declared domain: the inventory establishes no ownership, so no absence is claimed.
  const undeclared = scopeDomainObservation(observation, inventory, declaredProjectDomains(registry, 'gamma', 's1')) as any;
  assert.equal(undeclared.available, false);
  assert.equal(undeclared.freshness, 'UNKNOWN');
  assert.deepEqual(undeclared.domains, []);
  // Without the inventory's ownership evidence, nothing is scoped.
  assert.equal((scopeDomainObservation(observation, undefined, declared) as any).available, false);
  // Nothing to scope in an unavailable or absent observation.
  assert.equal(scopeDomainObservation(null, inventory, declared), null);
});
