import assert from 'node:assert/strict';
import test from 'node:test';

import { createGovernedContractSubstrate } from '../src/governedWorkflow/contractSubstrate.js';
import { resolveGw08Runtime, resolveRuntime } from '../src/governedWorkflow/resolvers/runtime.js';

const NOW = '2026-09-19T06:10:00Z';
const REVISION = 'a'.repeat(40);

function serverResolution(serverId = 's2') {
  return {
    status: 'RESOLVED',
    observedAt: NOW,
    projectId: 'project-example',
    selectedServer: {
      serverId,
      rawServerIds: [serverId],
      environment: 'production',
      bindings: []
    },
    candidates: [],
    candidateCount: 1,
    freshness: 'CURRENT',
    provenance: ['test'],
    reasonCodes: [],
    registryDigest: null,
    candidateDigest: null,
    projectMappingId: 'mapping-example',
    canonicalServerIds: ['s1', 's2'],
    authorizationInferred: false,
    mutationPerformed: false,
    sshMutationPerformed: false
  } as any;
}

function components() {
  return [
    {
      componentId: 'frontend',
      repositoryId: 'ExampleOrg/frontend',
      componentRole: 'frontend'
    },
    {
      componentId: 'api',
      repositoryId: 'ExampleOrg/api',
      componentRole: 'api'
    }
  ];
}

function observation(overrides: Record<string, unknown> = {}) {
  return {
    status: 'CURRENT',
    observedAt: NOW,
    freshness: 'CURRENT',
    serverId: 's2',
    componentId: 'frontend',
    repositoryId: 'ExampleOrg/frontend',
    componentRole: 'frontend',
    runtimeKind: 'DOCKER_COMPOSE',
    runtimeId: 'docker-compose:frontend',
    revision: REVISION,
    evidenceRef: 'runtime-observation:frontend',
    ...overrides
  } as any;
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    server: serverResolution(),
    components: components(),
    observations: [observation()],
    declarations: [],
    runtimeHint: null,
    observedAt: NOW,
    ...overrides
  } as any;
}

test('GWC-7 RED: resolves a current Docker Compose runtime from bounded observed evidence', () => {
  const result = resolveRuntime(input());
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.cardinality, 'SINGLE_RUNTIME');
  assert.equal(result.bindings.length, 1);
  assert.equal(result.bindings[0]?.runtimeKind, 'DOCKER_COMPOSE');
  assert.equal(result.bindings[0]?.runtimeId, 'docker-compose:frontend');
  assert.equal(result.bindings[0]?.revision, REVISION);
  assert.equal(result.runtimeMutationPerformed, false);
  assert.equal(result.authorizationInferred, false);
});

test('GWC-7 represents Passenger without MCP, S1 or container-specific branching', () => {
  const result = resolveRuntime(input({
    observations: [observation({
      runtimeKind: 'PASSENGER',
      runtimeId: 'passenger:frontend',
      revision: null,
      evidenceRef: 'runtime-observation:passenger'
    })]
  }));
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.bindings[0]?.runtimeKind, 'PASSENGER');
  assert.equal(result.bindings[0]?.runtimeId, 'passenger:frontend');
});

test('GWC-7 represents checkout-only as observed runtime evidence without turning serverPath into identity', () => {
  const result = resolveRuntime(input({
    observations: [observation({
      runtimeKind: 'CHECKOUT_ONLY',
      runtimeId: null,
      revision: REVISION,
      evidenceRef: 'runtime-observation:checkout'
    })]
  }));
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.cardinality, 'SINGLE_RUNTIME');
  assert.equal(result.bindings[0]?.runtimeKind, 'CHECKOUT_ONLY');
  assert.equal(result.bindings[0]?.runtimeId, null);
  assert.equal(JSON.stringify(result).includes('/var/www'), false);
});

test('GWC-7 treats explicit observed NO_RUNTIME as a valid resolved state', () => {
  const result = resolveRuntime(input({
    observations: [observation({
      runtimeKind: 'NO_RUNTIME',
      runtimeId: null,
      revision: null,
      evidenceRef: 'runtime-observation:none'
    })]
  }));
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.cardinality, 'NO_RUNTIME');
  assert.equal(result.bindings.length, 1);
  assert.equal(result.bindings[0]?.runtimeKind, 'NO_RUNTIME');
});

test('GWC-7 missing observation remains UNVERIFIED and never becomes NO_RUNTIME', () => {
  const result = resolveRuntime(input({ observations: [] }));
  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(result.cardinality, 'UNKNOWN');
  assert.deepEqual(result.reasonCodes, ['RUNTIME_OBSERVATION_MISSING']);
});

test('GWC-7 stale observation remains fail-closed even when a runtime is declared', () => {
  const result = resolveRuntime(input({
    observations: [observation({ freshness: 'STALE' })],
    declarations: [{
      serverId: 's2',
      componentId: 'frontend',
      repositoryId: 'ExampleOrg/frontend',
      runtimeKind: 'DOCKER_COMPOSE',
      runtimeId: 'docker-compose:frontend'
    }]
  }));
  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(result.freshness, 'STALE');
  assert.deepEqual(result.reasonCodes, ['RUNTIME_EVIDENCE_STALE']);
});

test('GWC-7 supports a current multi-runtime target without assuming one runtime per project', () => {
  const result = resolveRuntime(input({
    observations: [
      observation(),
      observation({
        componentId: 'api',
        repositoryId: 'ExampleOrg/api',
        componentRole: 'api',
        runtimeKind: 'PROCESS_MANAGER',
        runtimeId: 'pm2:api',
        evidenceRef: 'runtime-observation:api'
      })
    ]
  }));
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.cardinality, 'MULTI_RUNTIME');
  assert.deepEqual(result.bindings.map((entry: any) => entry.runtimeId), [
    'pm2:api',
    'docker-compose:frontend'
  ]);
});

test('GWC-7 rejects runtime evidence bound to another server or unknown component', () => {
  const otherServer = resolveRuntime(input({
    observations: [observation({ serverId: 's1' })]
  }));
  assert.equal(otherServer.status, 'UNVERIFIED');
  assert.deepEqual(otherServer.reasonCodes, ['RUNTIME_SERVER_MISMATCH']);

  const unknownComponent = resolveRuntime(input({
    observations: [observation({
      componentId: 'worker',
      repositoryId: 'ExampleOrg/worker',
      componentRole: 'worker'
    })]
  }));
  assert.equal(unknownComponent.status, 'UNVERIFIED');
  assert.deepEqual(unknownComponent.reasonCodes, ['RUNTIME_COMPONENT_UNVERIFIED']);
});

test('GWC-7 declaration never overrides current observed runtime truth', () => {
  const result = resolveRuntime(input({
    declarations: [{
      serverId: 's2',
      componentId: 'frontend',
      repositoryId: 'ExampleOrg/frontend',
      runtimeKind: 'PASSENGER',
      runtimeId: 'passenger:frontend'
    }],
    observations: [observation({
      runtimeKind: 'DOCKER_COMPOSE',
      runtimeId: 'docker-compose:frontend'
    })]
  }));
  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['RUNTIME_DECLARATION_CONFLICT']);
});

test('GWC-7 explicit NO_RUNTIME cannot coexist with another current runtime', () => {
  const result = resolveRuntime(input({
    observations: [
      observation({ runtimeKind: 'NO_RUNTIME', runtimeId: null, revision: null }),
      observation({
        componentId: 'api',
        repositoryId: 'ExampleOrg/api',
        componentRole: 'api',
        runtimeKind: 'PROCESS_MANAGER',
        runtimeId: 'pm2:api'
      })
    ]
  }));
  assert.equal(result.status, 'AMBIGUOUS');
  assert.deepEqual(result.reasonCodes, ['RUNTIME_NONE_CONFLICT']);
});

test('GW-08 wrapper binds the canonical contract and adds no restart, mutation or authorization semantics', () => {
  const substrate = createGovernedContractSubstrate();
  const result = resolveGw08Runtime(input(), substrate);
  assert.equal(result.contract.stepId, 'GW-08');
  assert.equal(result.contract.contractVersion, 1);
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.replayModel, 'READ_ONLY');
  assert.equal(result.runtimeMutationPerformed, false);
  assert.equal(result.authorizationInferred, false);
});

test('GWC-7 is deterministic for identical normalized evidence', () => {
  const first = resolveRuntime(input());
  const second = resolveRuntime(input());
  assert.deepEqual(second, first);
});
