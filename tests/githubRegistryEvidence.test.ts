import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const { readGitRegistry, readGitRegistryEvidence } = await import(
  '../src/github/registry.js'
);

test('la vue d évidence V1 ne projette que owner/repo et un digest', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-b2-registry-'));
  const file = join(directory, 'registry.json');
  const previous = process.env.MCP_GIT_REGISTRY_FILE;
  process.env.MCP_GIT_REGISTRY_FILE = file;
  try {
    await writeFile(file, JSON.stringify({
      version: 1,
      updatedAt: '2026-09-11T17:45:00.000Z',
      accounts: [{ secret: 'must-not-project' }],
      repoMappings: [{
        githubOwner: 'Patricked-code',
        githubRepo: 'MCP',
        projectKey: 'mcp_bridge',
        serverId: 'S1',
        serverPath: '/secret/path',
        officialBranch: 'main',
        allowedAccess: 'admin',
        deployEnabled: true
      }],
      auditEvents: [{ raw: 'must-not-project' }]
    }), 'utf8');
    const evidence = await readGitRegistryEvidence();
    assert.equal(evidence.available, true);
    assert.equal(evidence.schemaVersion, 1);
    assert.deepEqual(evidence.mappings, [{
      githubOwner: 'Patricked-code', githubRepo: 'MCP'
    }]);
    assert.match(evidence.digest ?? '', /^[0-9a-f]{64}$/);
    const serialized = JSON.stringify(evidence);
    for (const forbidden of ['allowedAccess', 'deployEnabled', 'serverPath', 'must-not-project']) {
      assert.equal(serialized.includes(forbidden), false);
    }
  } finally {
    if (previous === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
    else process.env.MCP_GIT_REGISTRY_FILE = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test('un JSON V1 corrompu est indisponible pour B2 mais le lecteur historique reste compatible', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-b2-registry-'));
  const file = join(directory, 'registry.json');
  const previous = process.env.MCP_GIT_REGISTRY_FILE;
  process.env.MCP_GIT_REGISTRY_FILE = file;
  try {
    await writeFile(file, '{corrupt', 'utf8');
    assert.deepEqual(await readGitRegistryEvidence(), {
      available: false, schemaVersion: 1, mappings: [], digest: null
    });
    const historical = await readGitRegistry();
    assert.equal(historical.version, 1);
    assert.deepEqual(historical.repoMappings, []);
  } finally {
    if (previous === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
    else process.env.MCP_GIT_REGISTRY_FILE = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test('un registre structurellement invalide ne devient jamais un faux NONE', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-b2-registry-'));
  const file = join(directory, 'registry.json');
  const previous = process.env.MCP_GIT_REGISTRY_FILE;
  process.env.MCP_GIT_REGISTRY_FILE = file;
  try {
    await writeFile(file, JSON.stringify({
      version: 1,
      repoMappings: [{ githubOwner: 'Patricked-code' }]
    }), 'utf8');
    const evidence = await readGitRegistryEvidence();
    assert.equal(evidence.available, false);
    assert.equal(evidence.digest, null);
  } finally {
    if (previous === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
    else process.env.MCP_GIT_REGISTRY_FILE = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test('un registre dépassant la borne est indisponible plutôt que tronqué', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-b2-registry-'));
  const file = join(directory, 'registry.json');
  const previous = process.env.MCP_GIT_REGISTRY_FILE;
  process.env.MCP_GIT_REGISTRY_FILE = file;
  try {
    await writeFile(file, JSON.stringify({
      version: 1,
      repoMappings: Array.from({ length: 1001 }, (_, index) => ({
        githubOwner: 'Patricked-code', githubRepo: `Repo-${index}`
      }))
    }), 'utf8');
    assert.deepEqual(await readGitRegistryEvidence(), {
      available: false, schemaVersion: 1, mappings: [], digest: null
    });
  } finally {
    if (previous === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
    else process.env.MCP_GIT_REGISTRY_FILE = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
