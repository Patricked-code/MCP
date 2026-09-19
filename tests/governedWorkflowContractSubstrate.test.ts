import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  createGovernedContractSubstrate,
  GovernedContractSubstrateError
} = await import('../src/governedWorkflow/contractSubstrate.js');

async function canonicalInputs() {
  const [contractsText, graphText] = await Promise.all([
    readFile('.mcp/gwc-contracts.json', 'utf8'),
    readFile('.mcp/gwc-workflow-graph.json', 'utf8')
  ]);
  return {
    contracts: JSON.parse(contractsText),
    graph: JSON.parse(graphText)
  };
}

test('GWC-0 loads the canonical 73-contract substrate as immutable bounded projections', async () => {
  const { contracts, graph } = await canonicalInputs();
  const substrate = createGovernedContractSubstrate({
    contractsProjection: contracts,
    graphProjection: graph,
    expectedSchemaVersion: 1,
    expectedContractRegistryDigest: contracts.registryDigest,
    expectedGraphRegistryDigest: graph.registryDigest
  });

  assert.equal(substrate.contractCount, 73);
  assert.equal(substrate.entry, 'GW-01');
  assert.equal(substrate.runtimeTerminal, 'GW-72');
  assert.deepEqual(substrate.outOfRuntimeStepIds, ['GW-73']);
  assert.equal(substrate.contractRegistryDigest, contracts.registryDigest);
  assert.equal(substrate.graphRegistryDigest, graph.registryDigest);

  const gw01 = substrate.resolve('GW-01');
  assert.ok(gw01);
  assert.equal(gw01.stepId, 'GW-01');
  assert.equal(gw01.canonicalName, 'INTENT_CAPTURE');
  assert.equal(gw01.contractVersion, 1);
  assert.equal(gw01.runtimeGraphMember, true);
  assert.equal(Object.isFrozen(gw01), true);

  const pass = substrate.evaluate('GW-01');
  assert.deepEqual(pass, {
    status: 'PASS',
    reasonCode: null,
    stepId: 'GW-01',
    contractVersion: 1,
    contractRegistryDigest: contracts.registryDigest,
    graphRegistryDigest: graph.registryDigest
  });
});

test('GWC-0 fails closed for an unknown contract id without mutating authorities', async () => {
  const { contracts, graph } = await canonicalInputs();
  const substrate = createGovernedContractSubstrate({
    contractsProjection: contracts,
    graphProjection: graph,
    expectedSchemaVersion: 1,
    expectedContractRegistryDigest: contracts.registryDigest,
    expectedGraphRegistryDigest: graph.registryDigest
  });
  const before = JSON.stringify(contracts);
  assert.deepEqual(substrate.evaluate('GW-99'), {
    status: 'FAIL',
    reasonCode: 'UNKNOWN_STEP_ID',
    stepId: 'GW-99',
    contractVersion: null,
    contractRegistryDigest: contracts.registryDigest,
    graphRegistryDigest: graph.registryDigest
  });
  assert.equal(JSON.stringify(contracts), before);
});

test('GWC-0 rejects incompatible schema versions and digest drift', async () => {
  const { contracts, graph } = await canonicalInputs();

  assert.throws(
    () => createGovernedContractSubstrate({
      contractsProjection: { ...contracts, schemaVersion: 2 },
      graphProjection: graph,
      expectedSchemaVersion: 1,
      expectedContractRegistryDigest: contracts.registryDigest,
      expectedGraphRegistryDigest: graph.registryDigest
    }),
    (error: unknown) => error instanceof GovernedContractSubstrateError
      && error.reasonCode === 'UNSUPPORTED_CONTRACT_SCHEMA_VERSION'
  );

  assert.throws(
    () => createGovernedContractSubstrate({
      contractsProjection: contracts,
      graphProjection: graph,
      expectedSchemaVersion: 1,
      expectedContractRegistryDigest: '0'.repeat(64),
      expectedGraphRegistryDigest: graph.registryDigest
    }),
    (error: unknown) => error instanceof GovernedContractSubstrateError
      && error.reasonCode === 'CONTRACT_REGISTRY_DIGEST_MISMATCH'
  );

  assert.throws(
    () => createGovernedContractSubstrate({
      contractsProjection: contracts,
      graphProjection: graph,
      expectedSchemaVersion: 1,
      expectedContractRegistryDigest: contracts.registryDigest,
      expectedGraphRegistryDigest: '0'.repeat(64)
    }),
    (error: unknown) => error instanceof GovernedContractSubstrateError
      && error.reasonCode === 'GRAPH_REGISTRY_DIGEST_MISMATCH'
  );
});

test('GWC-0 rejects duplicate contract ids and graph edges to unknown ids', async () => {
  const { contracts, graph } = await canonicalInputs();

  const duplicate = {
    ...contracts,
    contracts: [...contracts.contracts.slice(0, -1), contracts.contracts[0]]
  };
  assert.throws(
    () => createGovernedContractSubstrate({
      contractsProjection: duplicate,
      graphProjection: graph,
      expectedSchemaVersion: 1,
      expectedContractRegistryDigest: contracts.registryDigest,
      expectedGraphRegistryDigest: graph.registryDigest
    }),
    (error: unknown) => error instanceof GovernedContractSubstrateError
      && error.reasonCode === 'CONTRACT_ID_SET_INVALID'
  );

  const badGraph = {
    ...graph,
    edges: [...graph.edges, {
      from: 'GW-01',
      to: 'GW-99',
      kind: 'FORWARD',
      declaredBy: ['successor'],
      trigger: 'POSTCONDITION_PASS',
      precondition: 'synthetic invalid edge'
    }]
  };
  assert.throws(
    () => createGovernedContractSubstrate({
      contractsProjection: contracts,
      graphProjection: badGraph,
      expectedSchemaVersion: 1,
      expectedContractRegistryDigest: contracts.registryDigest,
      expectedGraphRegistryDigest: graph.registryDigest
    }),
    (error: unknown) => error instanceof GovernedContractSubstrateError
      && error.reasonCode === 'GRAPH_REFERENCES_UNKNOWN_STEP'
  );
});
