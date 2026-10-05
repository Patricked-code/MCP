import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20261005-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { readGitRegistryProjectEvidence } = await import('../src/github/registry.js');
const { resolveGithubProject } = await import('../src/github/projectResolution.js');
const { resolveProjectServer } = await import('../src/github/serverResolution.js');
const { resolveProjectRuntime } = await import('../src/github/runtimeResolution.js');
const { resolveProjectDomain } = await import('../src/github/domainResolution.js');
const { deriveProjectReality } = await import('../src/github/projectReality.js');
const { parseBranchGovernancePolicy } = await import('../src/governance/branchGovernance.js');
const { deriveProjectGovernanceInheritance } = await import('../src/governedWorkflow/governance/projectInheritance.js');
const { deriveBootstrapProjectReferences } = await import('../src/governedContext/receiptReferences.js');
const { createAtomicJsonStore } = await import('../src/operationalMemory/atomicStore.js');
const { createGovernedSessionService } = await import('../src/operationalMemory/sessionService.js');
const { createTransportBindings } = await import('../src/operationalMemory/transportBindings.js');
const {
  BootstrapReceiptSchema,
  SessionStoreDocumentSchema,
  createEmptySessionStoreDocument
} = await import('../src/operationalMemory/types.js');

const NOW = '2026-10-05T09:30:00.000Z';
const MCP_REPOSITORY = 'github:Patricked-code/MCP';
const API_REPOSITORY = 'github:Wealthtechinnovations/api_opcv';
const MANAGED = ['s1', 's2'];
const OAUTH_IDENTITY = { principalId: 'oauth:user:d3-principal', clientId: 'd3-client-id', assurance: 'oauth_subject' as const };
const SHARED_IDENTITY = { principalId: null, clientId: 'shared-mcp-client', assurance: 'shared_credential' as const };
const OPEN_INPUT = {
  repository: 'Patricked-code/MCP' as const,
  taskScope: 'TASK-20261005-D3',
  workBranch: 'claude/d3-receipt-references',
  agentIdentity: 'claude-d3',
  blockers: [],
  nextAction: 'acknowledge'
};

const previousRegistryFile = process.env.MCP_GIT_REGISTRY_FILE;
process.env.MCP_GIT_REGISTRY_FILE = 'data/mcp-git-registry.json';
const REAL_REGISTRY: any = await readGitRegistryProjectEvidence();
if (previousRegistryFile === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
else process.env.MCP_GIT_REGISTRY_FILE = previousRegistryFile;
const REAL_SERVER_MAP = JSON.parse(await readFile('.mcp/server-map.json', 'utf8'));
const REAL_POLICY = JSON.parse(await readFile('.mcp/branch-governance.json', 'utf8'));

function repositoryResolution(repositoryId: string): any {
  const fullName = repositoryId.replace(/^github:/, '');
  const [owner, name] = fullName.split('/');
  return {
    status: 'RESOLVED',
    observedAt: NOW,
    requestedRepositoryContext: fullName,
    selectionSource: 'connection_context',
    selectedAccountContext: { owner, type: 'organization' },
    selectedRepository: {
      repositoryId, githubRepositoryId: 1, owner, ownerType: 'organization', name, fullName,
      defaultBranch: 'main', visibility: 'private', archived: false, fork: false
    },
    candidates: [],
    candidateCount: 1,
    freshness: 'CURRENT',
    provenance: ['github_identity_resolution', 'github_repository_api'],
    reasonCodes: [],
    uncertainties: [],
    registryDigest: null
  };
}

/** The parts of a governed operational context the receipt references are drawn from. */
function context(repositoryId = MCP_REPOSITORY, sessionRepository = 'Patricked-code/MCP', transform: (chain: any) => any = (chain) => chain): any {
  const repository = repositoryResolution(repositoryId);
  const project = resolveGithubProject({ repository, registry: REAL_REGISTRY, observedAt: NOW });
  const server = resolveProjectServer({
    project, registry: REAL_REGISTRY, serverMap: REAL_SERVER_MAP, managedServerIds: MANAGED, observedAt: NOW
  });
  const runtime = resolveProjectRuntime({ server, project, registry: REAL_REGISTRY, observations: null, observedAt: NOW });
  const domain = resolveProjectDomain({ project, server, registry: REAL_REGISTRY, observation: null, observedAt: NOW });
  const chain = transform({
    project,
    projectReality: deriveProjectReality({ repository, project, server, runtime, domain, observedAt: NOW })
  });
  return {
    generatedAt: NOW,
    repository: sessionRepository,
    projectReality: chain.projectReality,
    governanceInheritance: deriveProjectGovernanceInheritance({
      projectReality: chain.projectReality,
      project: chain.project,
      ruleset: null,
      policy: parseBranchGovernancePolicy(REAL_POLICY),
      locks: [],
      governedSessionId: null,
      gate: { mode: 'shadow', existingWriteToolsEnabled: false },
      observedAt: NOW
    } as never)
  };
}

function withLayer(layerId: string, state: string) {
  return (chain: any) => ({
    ...chain,
    projectReality: {
      ...chain.projectReality,
      layers: chain.projectReality.layers.map((layer: any) => (layer.layer === layerId ? { ...layer, state } : layer))
    }
  });
}

async function sessionFixture(observeProjectReferences?: (governedSessionId: string, request: unknown) => Promise<unknown>) {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-d3-receipt-'));
  const file = join(directory, 'sessions.json');
  const store = createAtomicJsonStore({
    filePath: file,
    schema: SessionStoreDocumentSchema,
    empty: createEmptySessionStoreDocument
  });
  const service = createGovernedSessionService({
    store,
    bindings: createTransportBindings(),
    idleTtlSeconds: 86_400,
    resumeGraceSeconds: 604_800,
    now: () => new Date(NOW),
    getLiveState: async () => ({ stateVersion: 9 }),
    ...(observeProjectReferences ? { observeProjectReferences } : {})
  } as never);
  return { directory, file, service };
}

async function acknowledge(service: any, identity: any, transport: string) {
  const opened = await service.openSession(OPEN_INPUT, { transportSessionId: transport, identity });
  const acknowledged = await service.acknowledgeContext({
    governedSessionId: opened.session.governedSessionId,
    expectedSessionRevision: opened.session.sessionRevision,
    expectedStateVersion: 9
  }, { transportSessionId: transport, identity });
  return { opened, receipt: acknowledged.bootstrapReceipt };
}

test('D3 derives the receipt references from the proven project reality only', () => {
  const references = deriveBootstrapProjectReferences(context()) as any;
  assert.equal(references.observedAt, NOW);
  assert.equal(references.repository?.id, MCP_REPOSITORY);
  assert.equal(references.repository?.observedAt, NOW);
  assert.ok(references.repository?.provenance.includes('github_repository_api'));
  assert.equal(references.project?.id, 'mcp_bridge');
  assert.ok(references.project?.provenance.length > 0);
  assert.deepEqual(references.mapping, { mappingId: 'mcp-s1-production', componentRole: null });
  assert.deepEqual(references.reasonCodes, []);

  // Another project carries its own mapping, never the MCP one.
  const africa = deriveBootstrapProjectReferences(context(API_REPOSITORY, 'Wealthtechinnovations/api_opcv')) as any;
  assert.equal(africa.project?.id, 'chainsolutions.africafunds');
  assert.equal(africa.mapping?.mappingId, 'github:Wealthtechinnovations/api_opcv:s2:africafunds_api');
});

test('D3 never promotes an unverified binding into the receipt', () => {
  const noRepository = deriveBootstrapProjectReferences(context(MCP_REPOSITORY, 'Patricked-code/MCP', withLayer('REPOSITORY', 'UNVERIFIED'))) as any;
  assert.equal(noRepository.repository, null);
  assert.equal(noRepository.project, null);
  assert.equal(noRepository.mapping, null);
  assert.ok(noRepository.reasonCodes.includes('RECEIPT_REPOSITORY_UNVERIFIED'));

  const noProject = deriveBootstrapProjectReferences(context(MCP_REPOSITORY, 'Patricked-code/MCP', withLayer('PROJECT', 'AMBIGUOUS'))) as any;
  assert.equal(noProject.repository?.id, MCP_REPOSITORY);
  assert.equal(noProject.project, null);
  assert.equal(noProject.mapping, null);
  assert.ok(noProject.reasonCodes.includes('RECEIPT_PROJECT_UNVERIFIED'));

  // The project reality of another repository never speaks for the session repository.
  const foreign = deriveBootstrapProjectReferences(context(API_REPOSITORY, 'Patricked-code/MCP')) as any;
  assert.equal(foreign.repository, null);
  assert.equal(foreign.project, null);
  assert.ok(foreign.reasonCodes.includes('RECEIPT_REPOSITORY_BINDING_MISMATCH'));

  const noScope = deriveBootstrapProjectReferences({ ...context(), governanceInheritance: undefined }) as any;
  assert.equal(noScope.project?.id, 'mcp_bridge');
  assert.equal(noScope.mapping, null);
  assert.ok(noScope.reasonCodes.includes('RECEIPT_MAPPING_UNVERIFIED'));

  const historical = deriveBootstrapProjectReferences({ generatedAt: NOW, repository: 'Patricked-code/MCP' } as never) as any;
  assert.equal(historical.repository, null);
  assert.ok(historical.reasonCodes.includes('RECEIPT_PROJECT_REALITY_UNAVAILABLE'));
});

test('D3 acknowledgement enriches the existing receipt with proven references and no secret', async () => {
  const observed: string[] = [];
  const { directory, file, service } = await sessionFixture(async (governedSessionId) => {
    observed.push(governedSessionId);
    return deriveBootstrapProjectReferences(context());
  });
  try {
    const { opened, receipt } = await acknowledge(service, OAUTH_IDENTITY, 'transport-d3-oauth');
    assert.deepEqual(observed, [opened.session.governedSessionId]);
    const references = receipt?.references;
    assert.equal(references?.schemaVersion, 1);
    assert.equal(references?.observedAt, NOW);
    assert.deepEqual(references?.connection, {
      connectionContextId: opened.session.connectionContext?.connectionContextId,
      identityAssurance: 'oauth_subject',
      evidenceSource: 'oauth_auth_info',
      createdAt: opened.session.connectionContext?.createdAt
    });
    assert.equal(references?.repository?.id, MCP_REPOSITORY);
    assert.equal(references?.project?.id, 'mcp_bridge');
    assert.equal(references?.mapping?.mappingId, 'mcp-s1-production');
    assert.deepEqual(references?.reasonCodes, []);
    // The same receipt, not a second type: it still validates and keeps its historical fields.
    assert.equal(BootstrapReceiptSchema.safeParse(receipt).success, true);
    assert.equal(receipt?.stateVersion, 9);
    assert.equal(receipt?.status, 'ACKNOWLEDGED');
    // Never the principal, the OAuth client, the transport or the resume secret.
    const serialized = JSON.stringify(references);
    for (const forbidden of ['oauth:user:d3-principal', 'd3-client-id', 'transport-d3-oauth', opened.resumeSecret]) {
      assert.equal(serialized.includes(forbidden), false, forbidden);
    }
    const stored = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(stored.sessions[0].bootstrapReceipt.references.mapping.mappingId, 'mcp-s1-production');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('D3 keeps acknowledgement working when references are unobserved, unverified or foreign', async () => {
  const failing = await sessionFixture(async () => { throw new Error('github unavailable'); });
  try {
    const { receipt } = await acknowledge(failing.service, OAUTH_IDENTITY, 'transport-d3-failing');
    assert.equal(receipt?.status, 'ACKNOWLEDGED');
    assert.equal(receipt?.references?.repository, null);
    assert.equal(receipt?.references?.mapping, null);
    assert.ok(receipt?.references?.connection);
    assert.ok(receipt?.references?.reasonCodes.includes('RECEIPT_PROJECT_REFERENCES_UNOBSERVED'));
  } finally {
    await rm(failing.directory, { recursive: true, force: true });
  }

  const shared = await sessionFixture(async () => deriveBootstrapProjectReferences(context()));
  try {
    const { receipt } = await acknowledge(shared.service, SHARED_IDENTITY, 'transport-d3-shared');
    assert.equal(receipt?.references?.connection, null);
    assert.ok(receipt?.references?.reasonCodes.includes('RECEIPT_CONNECTION_UNVERIFIED'));
  } finally {
    await rm(shared.directory, { recursive: true, force: true });
  }

  // References observed for another repository are dropped, never attached to this session.
  const foreign = await sessionFixture(async () => deriveBootstrapProjectReferences(context(API_REPOSITORY, 'Wealthtechinnovations/api_opcv')));
  try {
    const { receipt } = await acknowledge(foreign.service, OAUTH_IDENTITY, 'transport-d3-foreign');
    assert.equal(receipt?.references?.repository, null);
    assert.equal(receipt?.references?.project, null);
    assert.equal(receipt?.references?.mapping, null);
    assert.ok(receipt?.references?.reasonCodes.includes('RECEIPT_REFERENCE_BINDING_MISMATCH'));
  } finally {
    await rm(foreign.directory, { recursive: true, force: true });
  }

  // Without an observer the receipt keeps its historical shape.
  const historical = await sessionFixture();
  try {
    const { receipt } = await acknowledge(historical.service, OAUTH_IDENTITY, 'transport-d3-historical');
    assert.equal(receipt?.references, undefined);
  } finally {
    await rm(historical.directory, { recursive: true, force: true });
  }
});

test('D3 receipts stay backward compatible and the runtime wires the observer lazily', async () => {
  const receipt = {
    schemaVersion: 1,
    bootstrapReceiptId: '44444444-4444-4444-8444-444444444444',
    governedSessionId: '55555555-5555-4555-8555-555555555555',
    agentIdentity: 'historical-agent',
    repository: 'Patricked-code/MCP',
    governedBranch: null,
    stateVersion: 3,
    githubHead: null,
    runtimeRevision: null,
    catalogueDigest: null,
    governanceDigest: null,
    taskRegistryDigest: null,
    createdAt: NOW,
    expiresAt: '2026-10-06T09:30:00.000Z',
    status: 'ACKNOWLEDGED',
    limitations: []
  };
  assert.equal(BootstrapReceiptSchema.safeParse(receipt).success, true);
  // Bounded and closed: an unknown reference field or a principal is rejected.
  assert.equal(BootstrapReceiptSchema.safeParse({
    ...receipt,
    references: {
      schemaVersion: 1, observedAt: NOW, connection: null, repository: null, project: null, mapping: null,
      reasonCodes: [], principalId: 'oauth:user:d3-principal'
    }
  }).success, false);

  const tools = await readFile('src/tools/governedSessions.ts', 'utf8');
  assert.match(tools, /observeProjectReferences/);
  assert.match(tools, /await import\('\.\/governedContext\.js'\)/);
});
