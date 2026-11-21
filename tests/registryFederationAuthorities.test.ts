import test from 'node:test';
import assert from 'node:assert/strict';
import type { GitRegistryV1, GitRegistryV2 } from '../src/github/registryV2.js';
import { projectExistingMcpAuthorities } from '../src/registryFederation/fromAuthorities.js';

const observedAt = '2026-11-21T18:45:00Z';
const legacy = (projectId?: string): GitRegistryV1 => ({
  version: 1, updatedAt: '2026-11-20T00:00:00Z', accounts: [], auditEvents: [],
  repoMappings: [{
    id: 'mcp-repo-mapping', githubOwner: 'Patricked-code', githubRepo: 'MCP',
    projectKey: 'mcp_bridge', ...(projectId ? { projectId } : {}),
    serverId: 'S1', serverPath: '/opt/apps/wealthtech-mcp-ssh-bridge',
    officialBranch: 'main', allowedAccess: 'read', deployEnabled: false
  }]
});

test('V1 projectKey alone does not become a verified Project ID', () => {
  const graph = projectExistingMcpAuthorities({ observedAt, registry: legacy(), queue: null });
  assert.equal(graph.entities.filter(x => x.identity.kind === 'PROJECT').length, 0);
  assert.equal(graph.entities.filter(x => x.identity.kind === 'REPOSITORY').length, 1);
  assert.equal(graph.links.length, 0);
  assert.equal(graph.authorizationInferred, false);
});

test('V1 explicit projectId is preserved as DECLARED with non-promoted mapping', () => {
  const graph = projectExistingMcpAuthorities({
    observedAt, registry: legacy('WT-PROJECT-MCP-001'), queue: null
  });
  const project = graph.entities.find(x => x.identity.kind === 'PROJECT');
  assert.equal(project?.identity.sourceId, 'WT-PROJECT-MCP-001');
  assert.equal(project?.evidence.verification, 'DECLARED');
  assert.equal(graph.links[0]?.relation, 'MAPS_TO');
  assert.equal(graph.links[0]?.verification, 'DECLARED');
});

test('queue tasks remain scoped and historical SUPERSEDED is visible', () => {
  const graph = projectExistingMcpAuthorities({
    observedAt, registry: legacy(), queue: {
      storeRevision: 244,
      tasks: [
        {
          taskId: 'TASK-20260913-001', repository: 'Patricked-code/MCP',
          title: 'Historical reconciliation', status: 'SUPERSEDED',
          updatedAt: '2026-11-19T10:00:00Z', dependencies: []
        },
        {
          taskId: 'TASK-20260913-001', repository: 'AnotherOrg/Other',
          title: 'Distinct task same ID', status: 'READY',
          updatedAt: '2026-11-20T10:00:00Z', dependencies: []
        }
      ]
    }
  });
  assert.equal(graph.entities.filter(x => x.identity.kind === 'TASK').length, 2);
  assert.equal(graph.entities.find(x => x.identity.authorityScope === 'Patricked-code/MCP'
    && x.identity.kind === 'TASK')?.taskStatus, 'SUPERSEDED');
  assert.notEqual(graph.entities.filter(x => x.identity.kind === 'TASK')[0]?.key,
    graph.entities.filter(x => x.identity.kind === 'TASK')[1]?.key);
});

test('dependency and scoped ownership are projections, never grants', () => {
  const graph = projectExistingMcpAuthorities({
    observedAt, registry: legacy('P-1'),
    queue: { storeRevision: 244, tasks: [{
      taskId: 'TASK-20261120-001',
      repository: 'Patricked-code/MCP', title: 'Task',
      status: 'READY', updatedAt: observedAt,
      targetScope: {
        schemaVersion: 1, targetId: 'S1', projectId: 'P-1', projectUid: null,
        components: [{ mappingId: 'mcp-repo-mapping', repositoryId: 'github:Patricked-code/MCP', role: 'app' }]
      },
      dependencies: ['TASK-20261119-001']
    }] }
  });
  assert.equal(graph.links.length, 3);
  const own = graph.links.find(x => x.relation === 'BELONGS_TO');
  assert.equal(own?.verification, 'DECLARED');
  const dependency = graph.links.find(x => x.relation === 'DEPENDS_ON');
  assert.equal(dependency?.verification, 'DECLARED');
  assert.deepEqual(dependency?.reasons, ['FEDERATION_ENDPOINT_UNRESOLVED']);
  assert.equal(graph.authorizationInferred, false);
});

test('V2 mapping with missing repository fails closed; no invented repo', () => {
  // The repository and mapping fields below are the subset used by the adapter;
  // source schema validation is performed by the existing GitRegistry authority.
  const registry = {
    schemaVersion: 2, updatedAt: observedAt, projects: [],
    repositories: [], mappings: [{
      mappingId: 'm-42', projectId: 'P-42', repositoryId: 'github:MissingOrg/Repo'
    }]
  } as unknown as GitRegistryV2;
  const graph = projectExistingMcpAuthorities({ observedAt, registry, queue: null });
  assert.equal(graph.entities.filter(x => x.identity.kind === 'REPOSITORY').length, 0);
  assert.equal(graph.entities.find(x => x.identity.kind === 'PROJECT')?.identity.sourceId, 'P-42');
  assert.deepEqual(graph.links[0]?.reasons, ['FEDERATION_ENDPOINT_UNRESOLVED']);
  assert.equal(graph.links[0]?.verification, 'DECLARED');
});

test('projectId and projectUid are kept separately with evidence', () => {
  const source = legacy('P-1');
  const registry: GitRegistryV1 = {
    ...source,
    repoMappings: source.repoMappings.map((mapping) => ({ ...mapping, projectUid: 'WT-PROJECT-MCP-001' }))
  };
  const graph = projectExistingMcpAuthorities({ observedAt, registry, queue: null });
  const project = graph.entities.find(x => x.identity.kind === 'PROJECT');
  assert.equal(project?.identity.sourceId, 'P-1');
  assert.deepEqual(project?.identifiers.map(x => [x.namespace, x.value]),
    [['PROJECT_UID', 'WT-PROJECT-MCP-001']]);
  assert.equal(project?.identifiers[0]?.evidence.verification, 'DECLARED');
});

test('two incompatible projectUid claims for the same projectId are CONFLICT', () => {
  const source = legacy('P-1');
  const original = source.repoMappings[0]!;
  const registry: GitRegistryV1 = {
    ...source,
    repoMappings: [
      { ...original, projectUid: 'UID-A' },
      { ...original, id: 'mapping-two', githubRepo: 'Another', projectUid: 'UID-B' }
    ]
  };
  const graph = projectExistingMcpAuthorities({ observedAt, registry, queue: null });
  const project = graph.entities.find(x => x.identity.kind === 'PROJECT');
  assert.equal(project?.evidence.verification, 'CONFLICT');
  assert.ok(project?.reasons.includes('FEDERATION_SOURCE_CONFLICT'));
});

test('UID-less mapping followed by different explicit UIDs is deterministic, not discarded', () => {
  const first = legacy('P-1').repoMappings[0]!;
  for (const order of [
    [{ ...first }, { ...first, id: 'm-a', githubRepo: 'OtherA', projectUid: 'UID-A' }, { ...first, id: 'm-b', githubRepo: 'OtherB', projectUid: 'UID-B' }],
    [{ ...first, id: 'm-b', githubRepo: 'OtherB', projectUid: 'UID-B' }, { ...first }, { ...first, id: 'm-a', githubRepo: 'OtherA', projectUid: 'UID-A' }]
  ]) {
    const registry: GitRegistryV1 = { ...legacy('P-1'), repoMappings: order };
    const graph = projectExistingMcpAuthorities({ observedAt, registry, queue: null });
    const project = graph.entities.find(e => e.identity.kind === 'PROJECT')!;
    assert.equal(project.evidence.verification, 'CONFLICT');
    assert.ok(project.reasons.includes('FEDERATION_SOURCE_CONFLICT'));
  }
  const registry: GitRegistryV1 = { ...legacy('P-1'), repoMappings: [
    { ...first }, { ...first, id: 'm-a', githubRepo: 'OtherA', projectUid: 'UID-A' }
  ] };
  const graph = projectExistingMcpAuthorities({ observedAt, registry, queue: null });
  const project = graph.entities.find(e => e.identity.kind === 'PROJECT')!;
  assert.equal(project.evidence.verification, 'DECLARED');
  assert.deepEqual(project.identifiers.map(x => x.value), ['UID-A']);
});

test('cross-repository dependency resolves the referenced task owner, never dependent owner', () => {
  const graph = projectExistingMcpAuthorities({
    observedAt, registry: legacy(), queue: { storeRevision: 244, tasks: [
      { taskId: 'TASK-20261119-001', repository: 'OtherOrg/Repo',
        title: 'Prerequisite', status: 'DONE', updatedAt: observedAt, dependencies: [] },
      { taskId: 'TASK-20261120-001', repository: 'Patricked-code/MCP',
        title: 'Dependent', status: 'READY', updatedAt: observedAt, dependencies: ['TASK-20261119-001'] }
    ] }
  });
  const dependency = graph.links.find(x => x.relation === 'DEPENDS_ON')!;
  assert.equal(dependency.verification, 'DECLARED');
  assert.deepEqual(dependency.reasons, ['FEDERATION_ENDPOINT_UNVERIFIED']);
  const owned = graph.entities.find(x => x.identity.kind === 'TASK'
    && x.identity.sourceId === 'TASK-20261119-001')!;
  assert.equal(dependency.toKey, owned.key);
});

test('ambiguous duplicate task IDs cannot create arbitrary cross-repository dependency', () => {
  const graph = projectExistingMcpAuthorities({
    observedAt, registry: legacy(), queue: { storeRevision: 244, tasks: [
      { taskId: 'TASK-20261119-001', repository: 'OtherOrg/Repo',
        title: 'One candidate', status: 'DONE', updatedAt: observedAt, dependencies: [] },
      { taskId: 'TASK-20261119-001', repository: 'SecondOrg/Repo',
        title: 'Second candidate', status: 'DONE', updatedAt: observedAt, dependencies: [] },
      { taskId: 'TASK-20261120-001', repository: 'Patricked-code/MCP',
        title: 'Dependent', status: 'READY', updatedAt: observedAt, dependencies: ['TASK-20261119-001'] }
    ] }
  });
  const dependency = graph.links.find(x => x.relation === 'DEPENDS_ON')!;
  assert.equal(dependency.verification, 'AMBIGUOUS');
  assert.deepEqual(dependency.reasons, ['FEDERATION_ENDPOINT_UNRESOLVED']);
});
