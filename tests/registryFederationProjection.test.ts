import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFederatedRegistryProjection, federatedIdentityKey,
  type FederatedEntityInput, type FederatedIdentity
} from '../src/registryFederation/projection.js';

const observedAt = '2026-11-21T18:30:00Z';
const proof = (ref: string) => ({
  observedAt, verification: 'VERIFIED' as const, evidenceRef: ref, sourceVersion: 'sha:a0c7052'
});
const identity = (kind: FederatedIdentity['kind'], authority: string, scope: string, sourceId: string) =>
  ({ kind, authority, authorityScope: scope, sourceId });
const repo = identity('REPOSITORY', 'GITHUB', 'Patricked-code', '1285534440');
const project = identity('PROJECT', 'GIT_REGISTRY', 'Patricked-code/MCP', 'WT-PROJECT-MCP-001');
const task = identity('TASK', 'GOVERNED_TASK_QUEUE', 'Patricked-code/MCP', 'TASK-20260913-001');
const entity = (value: FederatedIdentity, ref: string): FederatedEntityInput =>
  ({ identity: value, evidence: proof(ref) });

test('only an explicitly evidenced relation can join a project to a repository', () => {
  const result = buildFederatedRegistryProjection({
    observedAt, entities: [entity(project, 'gitregistry:project-1'), entity(repo, 'github:repository-1285534440')],
    links: [{
      fromKey: federatedIdentityKey(project), toKey: federatedIdentityKey(repo),
      relation: 'MAPS_TO', authority: 'GIT_REGISTRY', evidence: proof('gitregistry:mapping-1')
    }]
  });
  assert.equal(result.entities.length, 2);
  assert.equal(result.links.length, 1);
  assert.equal(result.links[0]?.verification, 'VERIFIED');
  assert.equal(result.authorizationInferred, false);
  assert.equal(result.mutationPerformed, false);
  assert.equal(result.completeness, 'PARTIAL');
});

test('historical SUPERSEDED tasks retain original identity and terminal status', () => {
  const result = buildFederatedRegistryProjection({
    observedAt,
    entities: [
      { ...entity(task, 'queue:revision-244'), taskStatus: 'SUPERSEDED' },
      { ...entity(identity('TASK', 'GOVERNED_TASK_QUEUE', 'AnotherOrg/another-repo', task.sourceId),
        'otherqueue:revision-1'), taskStatus: 'READY' }
    ],
    links: []
  });
  assert.equal(result.entities.length, 2);
  assert.equal(result.entities.find((e) => e.identity.authorityScope === 'Patricked-code/MCP')?.taskStatus, 'SUPERSEDED');
  assert.notEqual(result.entities[0]?.key, result.entities[1]?.key);
});

test('same event replay is idempotent and never creates duplicate relations', () => {
  const event = {
    fromKey: federatedIdentityKey(project), toKey: federatedIdentityKey(repo),
    relation: 'MAPS_TO' as const, authority: 'GIT_REGISTRY', evidence: proof('gitregistry:mapping-1')
  };
  const source = entity(project, 'gitregistry:project-1');
  const r = buildFederatedRegistryProjection({
    observedAt, entities: [source, source, entity(repo, 'github:repository-1285534440')],
    links: [event, event]
  });
  assert.equal(r.entities.length, 2);
  assert.equal(r.links.length, 1);
});

test('missing endpoints and missing proof never yield a verified relationship', () => {
  const missing = identity('PROJECT', 'GIT_REGISTRY', 'unknown', 'P-UNKNOWN');
  const r = buildFederatedRegistryProjection({
    observedAt,
    entities: [{ identity: repo, evidence: { ...proof('github:repository-1285534440'),
      evidenceRef: null } }],
    links: [{
      fromKey: federatedIdentityKey(missing), toKey: federatedIdentityKey(repo),
      relation: 'MAPS_TO', authority: 'CUG_RECEIPTS', evidence: proof('cug:receipt-1')
    }]
  });
  assert.equal(r.entities[0]?.evidence.verification, 'UNVERIFIED');
  assert.deepEqual(r.entities[0]?.reasons, ['FEDERATION_PROOF_MISSING']);
  assert.equal(r.links[0]?.verification, 'UNVERIFIED');
  assert.ok(r.links[0]?.reasons.includes('FEDERATION_ENDPOINT_UNRESOLVED'));
});

test('same source ID with divergent state is reported as conflict, not overwritten', () => {
  const a: FederatedEntityInput = { ...entity(task, 'queue:revision-244'), taskStatus: 'SUPERSEDED' };
  const b: FederatedEntityInput = { ...entity(task, 'queue:revision-244'), taskStatus: 'READY' };
  const r = buildFederatedRegistryProjection({ observedAt, entities: [a, b], links: [] });
  assert.equal(r.entities.length, 1);
  assert.equal(r.entities[0]?.evidence.verification, 'CONFLICT');
  assert.deepEqual(r.entities[0]?.reasons, ['FEDERATION_SOURCE_CONFLICT']);
});

test('a name does not authorize aliasing; an unverified entity cannot validate a relationship', () => {
  const declared: FederatedEntityInput = {
    identity: project, label: 'MCP',
    evidence: { observedAt, verification: 'DECLARED', evidenceRef: 'pr:389', sourceVersion: 'candidate' }
  };
  const r = buildFederatedRegistryProjection({
    observedAt, entities: [declared, entity(repo, 'github:repository-1285534440')],
    links: [{
      fromKey: federatedIdentityKey(project), toKey: federatedIdentityKey(repo),
      relation: 'MAPS_TO', authority: 'GIT_REGISTRY', evidence: proof('gitregistry:mapping-candidate')
    }]
  });
  assert.equal(r.links[0]?.verification, 'UNVERIFIED');
  assert.ok(r.links[0]?.reasons.includes('FEDERATION_ENDPOINT_UNVERIFIED'));
  assert.equal(r.entities.find((x) => x.identity.kind === 'PROJECT')?.evidence.verification, 'DECLARED');
});

test('reject timestamps later than the projection or invalid task statuses and mutation-sized inputs', () => {
  assert.throws(() => buildFederatedRegistryProjection({
    observedAt, entities: [{ ...entity(task, 'queue:revision-244'),
      evidence: { ...proof('queue:revision-244'), observedAt: '2026-11-22T18:30:00Z' } }], links: []
  }), /FEDERATION_INVALID_OBSERVED_AT/);
  assert.throws(() => buildFederatedRegistryProjection({
    observedAt, entities: [{ ...entity(repo, 'github:repository-1285534440'), taskStatus: 'DONE' }], links: []
  }), /FEDERATION_INVALID_TASK_STATUS/);
  assert.throws(() => buildFederatedRegistryProjection({
    observedAt, entities: Array(5001).fill(entity(repo, 'github:repository-1285534440')), links: []
  }), /FEDERATION_LIMIT_EXCEEDED/);
});

test('conflicting READY and SUPERSEDED always expose terminal history in either order', () => {
  const ready: FederatedEntityInput = { ...entity(task, 'queue:revision-244'), taskStatus: 'READY' };
  const superseded: FederatedEntityInput = { ...entity(task, 'queue:revision-244'), taskStatus: 'SUPERSEDED' };
  for (const sources of [[ready, superseded], [superseded, ready]]) {
    const r = buildFederatedRegistryProjection({ observedAt, entities: sources, links: [] });
    assert.equal(r.entities.length, 1);
    const item = r.entities[0]!;
    assert.equal(item.taskStatus, 'SUPERSEDED');
    assert.deepEqual(item.taskStatusClaims, ['READY', 'SUPERSEDED']);
    assert.equal(item.evidence.verification, 'CONFLICT');
  }
});

test('compatible multi-component mappings retain both proof references', () => {
  const a = {
    fromKey: federatedIdentityKey(project), toKey: federatedIdentityKey(repo),
    relation: 'MAPS_TO' as const, authority: 'GIT_REGISTRY',
    evidence: { ...proof('gitregistry:mapping-api'), verification: 'DECLARED' as const }
  };
  const b = { ...a, evidence: { ...a.evidence, evidenceRef: 'gitregistry:mapping-worker' } };
  const graph = buildFederatedRegistryProjection({
    observedAt,
    entities: [entity(project, 'gitregistry:project-1'), entity(repo, 'github:repository-1285534440')],
    links: [a, b, a]
  });
  assert.equal(graph.links.length, 2);
  assert.deepEqual(graph.links.map(x => x.evidence.evidenceRef).sort(),
    ['gitregistry:mapping-api', 'gitregistry:mapping-worker']);
  assert.ok(graph.links.every(x => x.verification === 'DECLARED'));
  assert.ok(graph.links.every(x => !x.reasons.includes('FEDERATION_LINK_CONFLICT')));
});

test('valid task titles with tabs/newlines are normalized for display without dropping task', () => {
  const source = { ...entity(task, 'queue:revision-244'),
    label: 'Update API\nand\tworker', taskStatus: 'READY' as const };
  const graph = buildFederatedRegistryProjection({
    observedAt, entities: [source, entity(repo, 'github:repository-1285534440')], links: []
  });
  assert.equal(graph.entities.length, 2);
  const value = graph.entities.find(x => x.identity.kind === 'TASK');
  assert.equal(value?.label, 'Update API and worker');
  assert.equal(value?.identity.sourceId, task.sourceId);
});
