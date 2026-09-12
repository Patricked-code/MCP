import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const {
  readGitRegistry,
  writeGitRegistry
} = await import('../src/github/registry.js');
const {
  dryRunGitRegistryV2,
  migrateGitRegistryToV2,
  validateGitRegistryV2
} = await import('../src/github/registryV2.js');

const at = '2026-09-12T00:00:00.000Z';

const legacyMapping = {
  id: 'mapping-api',
  githubOwner: 'Wealthtechinnovations',
  githubRepo: 'api_opcv',
  projectKey: 'chainsolutions.africafunds',
  projectId: 'chainsolutions.africafunds',
  projectUid: 'CS-AFRICAFUNDS-001',
  componentRole: 'API',
  serverId: 'S2',
  serverPath: '/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/api',
  officialBranch: 'claude/code-review-improvements-ikvuj',
  allowedAccess: 'read',
  deployEnabled: false,
  createdAt: at,
  updatedAt: at
} as const;

const project = {
  projectId: 'chainsolutions.africafunds',
  projectUid: 'CS-AFRICAFUNDS-001',
  name: 'AfricaFunds',
  kind: 'MULTI_REPOSITORY_APPLICATION',
  productionServerId: 'S2',
  canonicalBranch: 'claude/code-review-improvements-ikvuj',
  repositoryComponents: [{
    repositoryId: 'github:Wealthtechinnovations/api_opcv',
    mappingId: 'mapping-api',
    role: 'API'
  }],
  globalCheckpointRepositoryId: 'github:Wealthtechinnovations/api_opcv',
  centralGovernanceRepositoryId: 'github:Wealthtechinnovations/api_opcv',
  stateModel: 'FUND_STATE',
  stateFields: ['API_SHA', 'SUIVI_CHECKPOINT', 'PRODUCTION_ATTESTATION'],
  publicDomain: 'africafunds.chainsolutions.fr',
  publicApi: 'https://africafunds.chainsolutions.fr/api',
  historicalVhosts: [{
    historicalVhostId: 'legacy-api-vhost',
    classification: 'HISTORICAL_VHOST',
    serverId: 'S2',
    serverPath: '/var/www/vhosts/chainsolutions.fr/api.funds.chainsolutions.fr',
    domain: 'api.funds.chainsolutions.fr',
    repositoryId: null,
    current: false,
    deploymentSource: false
  }]
} as const;

function legacyRegistry(includeProjects: boolean) {
  return {
    version: 1 as const,
    updatedAt: at,
    accounts: [],
    repoMappings: [structuredClone(legacyMapping)],
    auditEvents: [],
    ...(includeProjects ? { projects: [structuredClone(project)] } : {})
  };
}

async function withRegistryFile(
  value: unknown,
  action: (file: string) => Promise<void>
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-git-registry-projects-'));
  const file = join(directory, 'registry.json');
  const previous = process.env.MCP_GIT_REGISTRY_FILE;
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  process.env.MCP_GIT_REGISTRY_FILE = file;
  try {
    await action(file);
  } finally {
    if (previous === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
    else process.env.MCP_GIT_REGISTRY_FILE = previous;
    await rm(directory, { recursive: true, force: true });
  }
}

test('le lecteur et writer V1 gardent l absence historique de projects', async () => {
  await withRegistryFile(legacyRegistry(false), async (file) => {
    const registry = await readGitRegistry();
    assert.equal(Object.hasOwn(registry, 'projects'), false);

    await writeGitRegistry(registry);
    const persisted = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>;
    assert.equal(Object.hasOwn(persisted, 'projects'), false);
  });
});

test('le lecteur et writer V1 préservent projects et les corrélations optionnelles', async () => {
  await withRegistryFile(legacyRegistry(true), async (file) => {
    const registry = await readGitRegistry();
    assert.deepEqual(registry.projects, [project]);
    assert.equal(registry.repoMappings[0].projectId, project.projectId);
    assert.equal(registry.repoMappings[0].projectUid, project.projectUid);
    assert.equal(registry.repoMappings[0].componentRole, 'API');

    await writeGitRegistry(registry);
    const persisted = JSON.parse(await readFile(file, 'utf8')) as {
      projects?: unknown;
      repoMappings: Array<Record<string, unknown>>;
    };
    assert.deepEqual(persisted.projects, [project]);
    assert.equal(persisted.repoMappings[0].projectId, project.projectId);
    assert.equal(persisted.repoMappings[0].projectUid, project.projectUid);
    assert.equal(persisted.repoMappings[0].componentRole, 'API');
  });
});

test('la migration V1 vers V2 préserve projects et leurs références', () => {
  const { candidate, report } = dryRunGitRegistryV2(legacyRegistry(true));

  assert.deepEqual(candidate.projects, [project]);
  assert.equal(candidate.mappings[0].projectId, project.projectId);
  assert.equal(candidate.mappings[0].projectUid, project.projectUid);
  assert.equal(candidate.mappings[0].componentRole, 'API');
  assert.equal(report.counts.projects, 1);
});

test('le validateur V2 refuse deux projectId identiques', () => {
  const candidate = migrateGitRegistryToV2(legacyRegistry(true));
  const invalid = structuredClone(candidate) as any;
  invalid.projects.push({ ...structuredClone(invalid.projects[0]), projectUid: 'CS-OTHER-001' });

  assert.throws(() => validateGitRegistryV2(invalid), /dupliqué.*projects\.projectId/i);
});

test('le validateur V2 refuse une référence de composant absente', () => {
  const candidate = migrateGitRegistryToV2(legacyRegistry(true));
  const invalid = structuredClone(candidate) as any;
  invalid.projects[0].repositoryComponents[0].mappingId = 'mapping-absent';

  assert.throws(() => validateGitRegistryV2(invalid), /mapping.*absent/i);
});

test('le validateur V2 garde les vhosts historiques non Git et inactifs', () => {
  const candidate = migrateGitRegistryToV2(legacyRegistry(true));
  const invalid = structuredClone(candidate) as any;
  invalid.projects[0].historicalVhosts[0].current = true;

  assert.throws(() => validateGitRegistryV2(invalid));
});
