import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { lstat, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { collectCugPilotInventory, persistCugPilotInventory } from '../src/cug/pilotInventory.js';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const owner = 'chainsolutions-wealthtech';
const name = 'universal-agent-engineering-system';
const fullName = owner + '/' + name;
const repo = { id: 1429189311, full_name: fullName, name, html_url: 'https://github.com/' + fullName,
  owner: { id: 299685687, login: owner }, default_branch: 'main', visibility: 'public', fork: false, archived: false,
  ignored: 'never-persisted' };
const now = new Date('2026-11-14T08:00:00Z');
const digest = 'a'.repeat(64);

function deps(membership: unknown = { total_count: 1, repositories: [repo] }, repository: unknown = repo) {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (target, options) => {
    assert.equal(options?.redirect, 'error');
    const url = new URL(String(target));
    assert.equal(url.origin, 'https://api.github.com');
    calls.push(url.pathname);
    if (options?.method === 'POST') {
      assert.equal(url.pathname, '/app/installations/42/access_tokens');
      assert.deepEqual(JSON.parse(String(options.body)), { repositories: [name], permissions: { contents: 'read' } });
      return Response.json({ token: 'test-token-only', expires_at: '2026-11-14T09:00:00Z' }, { status: 201 });
    }
    assert.equal(options?.method, 'GET');
    assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer test-token-only');
    if (url.pathname === '/installation/repositories') return Response.json(membership);
    assert.equal(url.pathname, '/repos/' + fullName);
    return Response.json(repository);
  };
  return {
    calls, fetchImpl, readPrivateKey: async () => privateKey, now: () => now,
    readRegistryEvidence: async () => ({ available: true, schemaVersion: 1 as const, digest,
      mappings: [{ githubOwner: owner, githubRepo: name }] })
  };
}

test('collects only verified pilot identity and records partial app coverage without granting provisioning', async () => {
  const fixture = deps();
  const inventory = await collectCugPilotInventory(42, fixture);
  assert.equal(fixture.calls.length, 3);
  assert.equal(inventory.repository.githubRepositoryId, repo.id);
  assert.equal(inventory.repository.htmlUrl, repo.html_url);
  assert.deepEqual(inventory.apps, { coverage: 'PARTIAL', confirmed: [{ name: 'CUG', appId: 5417646, installationId: 42 }],
    otherApps: 'UNVERIFIED' });
  assert.deepEqual(inventory.registryCandidate, { status: 'NAME_MATCH_REQUIRES_BINDING_PROOF',
    observedRegistryDigest: digest, matchCount: 1, serverBinding: 'NOT_VERIFIED', provisioningAuthorized: false });
  assert(!JSON.stringify(inventory).includes('never-persisted'));
  assert(!JSON.stringify(inventory).includes('test-token-only'));
});

test('refuses a public repo without exact installation coverage or with owner or repository drift', async () => {
  for (const membership of [{ total_count: 0, repositories: [] },
    { total_count: 2, repositories: [repo, repo] }, { total_count: 1, repositories: [{ ...repo, id: 8 }] }]) {
    const fixture = deps(membership);
    await assert.rejects(collectCugPilotInventory(42, fixture), /CUG_PILOT_INSTALLATION_NOT_ATTESTED/);
    assert.equal(fixture.calls.length, 2);
  }
  await assert.rejects(collectCugPilotInventory(42, deps(undefined, { ...repo, id: 8 })));
  await assert.rejects(collectCugPilotInventory(42, deps(undefined, { ...repo, owner: { id: 8, login: owner } })));
  await assert.rejects(collectCugPilotInventory(42, deps(undefined, { ...repo, html_url: 'https://example.org/' })));
});

test('distinguishes an unavailable canonical register from no match or multiple names', async () => {
  const fixture = deps();
  for (const [available, count, status] of [
    [false, 0, 'GIT_REGISTRY_UNAVAILABLE'], [true, 0, 'NO_NAME_MATCH'], [true, 2, 'MULTIPLE_NAME_MATCHES_REQUIRES_RECONCILIATION']
  ] as const) {
    const item = await collectCugPilotInventory(42, { ...fixture, readRegistryEvidence: async () => ({
      available, schemaVersion: 1, digest: available ? digest : null,
      mappings: Array.from({ length: count }, () => ({ githubOwner: owner, githubRepo: name }))
    }) });
    assert.equal(item.registryCandidate.status, status);
    assert.equal(item.registryCandidate.provisioningAuthorized, false);
  }
});

test('stores one private immutable file for identical snapshots', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'cug-inventory-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = join(root, 'inventory');
  const inventory = await collectCugPilotInventory(42, deps());
  const [first, retry] = await Promise.all([persistCugPilotInventory(directory, inventory), persistCugPilotInventory(directory, inventory)]);
  assert.equal(first, retry);
  const filename = first + '.json';
  assert.deepEqual(await readdir(directory), [filename]);
  assert.equal((await lstat(directory)).mode & 0o777, 0o700);
  assert.equal((await lstat(join(directory, filename))).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(await readFile(join(directory, filename), 'utf8')), inventory);
});
