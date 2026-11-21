import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFederatedRegistryProjection, federatedIdentityKey,
  type FederatedIdentity
} from '../src/registryFederation/projection.js';
import { renderFederatedRegistryCockpit } from '../src/web/federatedRegistryCockpit.js';

const now = '2026-11-21T18:45:00Z';
const proof = (ref: string) => ({
  observedAt: now, sourceVersion: 'git:exact-sha', evidenceRef: ref,
  verification: 'VERIFIED' as const
});
const project: FederatedIdentity = {
  kind: 'PROJECT', authority: 'GIT_REGISTRY', authorityScope: 'MCP_GIT_REGISTRY', sourceId: 'P-1'
};
const repo: FederatedIdentity = {
  kind: 'REPOSITORY', authority: 'GIT_REGISTRY', authorityScope: 'MCP_GIT_REGISTRY',
  sourceId: 'github:Patricked-code/MCP'
};
const task: FederatedIdentity = {
  kind: 'TASK', authority: 'GOVERNED_TASK_QUEUE', authorityScope: 'Patricked-code/MCP',
  sourceId: 'TASK-20260913-001'
};
const graph = buildFederatedRegistryProjection({
  observedAt: now,
  entities: [
    {
      identity: project, evidence: proof('gitregistry:project:P-1'),
      label: '<script>alert("XSS")</script>',
      identifiers: [{ namespace: 'PROJECT_UID', value: 'WT-PROJECT-MCP-001',
        evidence: { ...proof('gitregistry:uid:WT-PROJECT-MCP-001'), verification: 'DECLARED' } }]
    },
    { identity: repo, evidence: { ...proof('gitregistry:repo'), verification: 'DECLARED' } },
    { identity: task, evidence: proof('queue:revision-244'), taskStatus: 'SUPERSEDED' },
    { identity: { ...task, authorityScope: 'AnotherOrg/Other', sourceId: 'TASK-20260913-002' },
      evidence: proof('other:queue'), taskStatus: 'READY' }
  ],
  links: [
    {
      fromKey: federatedIdentityKey(project), toKey: federatedIdentityKey(repo),
      authority: 'GIT_REGISTRY', relation: 'MAPS_TO',
      evidence: { ...proof('gitregistry:mapping'), verification: 'DECLARED' }
    },
    {
      fromKey: federatedIdentityKey(task), toKey: federatedIdentityKey(project),
      authority: 'GOVERNED_TASK_QUEUE', relation: 'BELONGS_TO',
      evidence: { ...proof('queue:scope'), verification: 'DECLARED' }
    }
  ]
});

test('global cockpit shows historical tasks, UID, evidence and partial coverage', () => {
  const html = renderFederatedRegistryCockpit(graph, { scope: 'global', id: '', queueAvailable: true });
  assert.match(html, /SUPERSEDED/);
  assert.match(html, /PROJECT_UID|WT-PROJECT-MCP-001/);
  assert.match(html, /Couverture partielle/);
  assert.match(html, /Registres fédérés/);
  assert.doesNotMatch(html, /<script>alert\("XSS"\)<\/script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<form method="get"/);
});

test('repository filtering does not leak unrelated task scope', () => {
  const html = renderFederatedRegistryCockpit(graph, {
    scope: 'repository', id: 'Patricked-code/MCP', queueAvailable: true
  });
  assert.match(html, /TASK-20260913-001/);
  assert.doesNotMatch(html, /TASK-20260913-002/);
});

test('project filters return linked repository and task, not unsupported claims', () => {
  const html = renderFederatedRegistryCockpit(graph, {
    scope: 'project', id: 'P-1', queueAvailable: false
  });
  assert.match(html, /P-1/);
  assert.match(html, /github:Patricked-code\/MCP/);
  assert.match(html, /TASK-20260913-001/);
  assert.match(html, /File de tâches MCP indisponible/);
});

test('missing workstream and unexpected filter values are fail-closed', () => {
  const html = renderFederatedRegistryCockpit(graph, {
    scope: 'workstream', id: 'CH-UNKNOWN', queueAvailable: true
  });
  assert.match(html, /Aucune entité/);
  assert.doesNotMatch(html, /TASK-20260913-001/);
  assert.throws(() => renderFederatedRegistryCockpit(graph, {
    scope: 'global', id: 'x'.repeat(241), queueAvailable: true
  }), /FEDERATION_COCKPIT_FILTER_INVALID/);
});

test('repository filter does not expand into another repository via shared project', () => {
  const other = graph.entities.find(x => x.identity.kind === 'TASK'
    && x.identity.authorityScope === 'AnotherOrg/Other')!;
  const expanded = buildFederatedRegistryProjection({
    observedAt: now,
    entities: graph.entities,
    links: [...graph.links, {
      fromKey: other.key, toKey: federatedIdentityKey(project),
      relation: 'BELONGS_TO', authority: 'GOVERNED_TASK_QUEUE',
      evidence: { ...proof('queue:shared-project'), verification: 'DECLARED' }
    }]
  });
  const repositoryPage = renderFederatedRegistryCockpit(expanded, {
    scope: 'repository', id: 'Patricked-code/MCP', queueAvailable: true
  });
  assert.match(repositoryPage, /TASK-20260913-001/);
  assert.doesNotMatch(repositoryPage, /TASK-20260913-002/);
  const projectPage = renderFederatedRegistryCockpit(expanded, {
    scope: 'project', id: 'P-1', queueAvailable: true
  });
  assert.match(projectPage, /TASK-20260913-001/);
  assert.match(projectPage, /TASK-20260913-002/);
});

test('cockpit exposes both conflicting historical task states and their authority evidence', () => {
  const taskEntity = graph.entities.find(x => x.identity.kind === 'TASK'
    && x.identity.authorityScope === 'Patricked-code/MCP')!;
  const conflict = buildFederatedRegistryProjection({
    observedAt: now,
    entities: [
      { identity: taskEntity.identity, evidence: proof('queue:revision-244'),
        taskStatus: 'READY' },
      { identity: taskEntity.identity, evidence: proof('queue:revision-244'),
        taskStatus: 'SUPERSEDED' }
    ], links: []
  });
  const html = renderFederatedRegistryCockpit(conflict, {
    scope: 'global', id: '', queueAvailable: true
  });
  assert.match(html, /SUPERSEDED/);
  assert.match(html, /READY, SUPERSEDED/);
  assert.match(html, /queue:revision-244/);
  assert.match(html, /CONFLICT/);
});

test('HTML does not leak raw evidence references into markup or attribute context', () => {
  const safe = buildFederatedRegistryProjection({
    observedAt: now,
    entities: [{ identity: project, evidence: {
      ...proof('proof:<img src=x onerror=alert(1)>'),
      verification: 'DECLARED'
    }}],
    links: []
  });
  const html = renderFederatedRegistryCockpit(safe, {
    scope: 'global', id: '', queueAvailable: true
  });
  assert.doesNotMatch(html, /<img src=x onerror/);
  assert.match(html, /&lt;img src=x onerror/);
});

test('repository filter accepts canonical github prefix and shows same tasks', () => {
  for (const filter of ['github:Patricked-code/MCP', 'Patricked-code/MCP']) {
    const html = renderFederatedRegistryCockpit(graph, {
      scope: 'repository', id: filter, queueAvailable: true
    });
    assert.match(html, /TASK-20260913-001/);
    assert.doesNotMatch(html, /TASK-20260913-002/);
  }
});

test('project cockpit exposes incompatible task relationship and counts link conflict', () => {
  const conflicting = buildFederatedRegistryProjection({
    observedAt: now,
    entities: graph.entities,
    links: graph.links.map(x => x.relation === 'BELONGS_TO'
      ? { ...x, evidence: { ...x.evidence, verification: 'CONFLICT' as const } } : x)
  });
  const html = renderFederatedRegistryCockpit(conflicting, {
    scope: 'project', id: 'P-1', queueAvailable: true
  });
  assert.match(html, /rattachements conflictuels/);
  assert.match(html, /liens : 1/);
  assert.match(html, /BELONGS_TO/);
  assert.match(html, /CONFLICT/);
});
