import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateGitRegistryToV2 } from '../src/github/registryV2.js';
import { readFederatedGitRegistrySource } from '../src/github/registry.js';
import { projectExistingMcpAuthorities } from '../src/registryFederation/fromAuthorities.js';

const observedAt = '2026-11-21T19:20:00Z';
const legacy = {
  version: 1 as const, updatedAt: observedAt,
  accounts: [], auditEvents: [],
  repoMappings: [{
    id: 'mapping-1', githubOwner: 'Patricked-code', githubRepo: 'MCP',
    projectKey: 'mcp_bridge', projectId: 'P-1',
    serverId: 'S1', serverPath: '/opt/apps/mcp',
    officialBranch: 'main', allowedAccess: 'read' as const, deployEnabled: false
  }]
};

async function withRegistry<T>(source: unknown, run: () => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'federation-registry-'));
  const previous = process.env.MCP_GIT_REGISTRY_FILE;
  const path = join(dir, 'registry.json');
  await writeFile(path, JSON.stringify(source), { mode: 0o600 });
  process.env.MCP_GIT_REGISTRY_FILE = path;
  try { return await run(); } finally {
    if (previous === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
    else process.env.MCP_GIT_REGISTRY_FILE = previous;
    await rm(dir, { recursive: true, force: true });
  }
}

test('source reader retains raw valid V2 repositories and mappings rather than coercing them into V1', async () => {
  const v2 = migrateGitRegistryToV2(legacy);
  assert.ok(v2.repositories.length >= 1);
  assert.ok(v2.mappings.length >= 1);
  await withRegistry(v2, async () => {
    const result = await readFederatedGitRegistrySource();
    assert.equal(result.registry.schemaVersion, 2);
    const graph = projectExistingMcpAuthorities({
      observedAt, registry: result.registry, queue: null
    });
    assert.equal(graph.entities.filter(e => e.identity.kind === 'REPOSITORY').length,
      v2.repositories.length);
    assert.equal(graph.links.filter(e => e.relation === 'MAPS_TO').length,
      v2.mappings.length);
  });
});

test('source reader keeps V1 project mappings as declarations without pretending V2 activation', async () => {
  await withRegistry(legacy, async () => {
    const result = await readFederatedGitRegistrySource();
    assert.equal(result.registry.version, 1);
    assert.equal(result.omittedMappings, 0);
    const graph = projectExistingMcpAuthorities({
      observedAt, registry: result.registry, queue: null
    });
    assert.equal(graph.links.length, 1);
    assert.equal(graph.links[0]?.verification, 'DECLARED');
  });
});

test('malformed V2 fails closed instead of displaying a misleading empty registry', async () => {
  await withRegistry({ schemaVersion: 2, updatedAt: observedAt, repositories: [], mappings: [] }, async () => {
    await assert.rejects(() => readFederatedGitRegistrySource());
  });
});

test('V1 null/malformed mappings are omitted before legacy normalization while valid mappings survive', async () => {
  const malformed = {
    ...legacy,
    repoMappings: [null, legacy.repoMappings[0], { owner: 'broken' }]
  };
  await withRegistry(malformed, async () => {
    const source = await readFederatedGitRegistrySource();
    assert.equal(source.registry.version, 1);
    assert.equal(source.omittedMappings, 2);
    const graph = projectExistingMcpAuthorities({
      observedAt, registry: source.registry, queue: null
    });
    assert.equal(graph.links.length, 1);
    assert.equal(graph.links[0]?.verification, 'DECLARED');
  });
});
