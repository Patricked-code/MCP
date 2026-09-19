import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  deriveCapabilityReality,
  deriveGovernanceDecision
} from '../src/governance/operationalDecision.js';
import { createGovernedContractSubstrate } from '../src/governedWorkflow/contractSubstrate.js';

const NOW = '2026-09-19T07:15:00Z';
const TOOL = 'mcp_transition_governed_task';

async function governanceModule() {
  return import('../src/governedWorkflow/governance/effectiveCapabilities.js');
}

async function substrate() {
  const [contractsText, graphText] = await Promise.all([
    readFile('.mcp/gwc-contracts.json', 'utf8'),
    readFile('.mcp/gwc-workflow-graph.json', 'utf8')
  ]);
  const contracts = JSON.parse(contractsText);
  const graph = JSON.parse(graphText);
  return createGovernedContractSubstrate({
    contractsProjection: contracts,
    graphProjection: graph,
    expectedSchemaVersion: 1,
    expectedContractRegistryDigest: contracts.registryDigest,
    expectedGraphRegistryDigest: graph.registryDigest
  });
}

function safeCapability(source: 'SERVER' | 'TRANSPORT' | 'CLIENT_ATTESTATION' = 'SERVER') {
  return deriveCapabilityReality({
    toolName: TOOL,
    registered: true,
    callability: { status: 'CALLABLE', source },
    authorized: { status: 'TRUE' },
    governanceSafe: true,
    observedAt: NOW,
    provenance: ['authoritative-capability-reality']
  });
}

function decisionFor(
  capabilityReality = safeCapability(),
  overrides: Record<string, unknown> = {}
) {
  return deriveGovernanceDecision({
    operation: TOOL,
    capabilityReality,
    sessionPresent: true,
    bootstrapCurrent: true,
    lockConflicts: 0,
    githubWorkStateAvailable: true,
    requiresGithubWorkState: false,
    ownerMatches: true,
    dependenciesSatisfied: true,
    runtimeAligned: true,
    requiresRuntimeAlignment: false,
    requiredEvidence: [],
    observedAt: NOW,
    ...overrides
  } as any);
}

function input(overrides: Record<string, unknown> = {}) {
  const capabilityReality = safeCapability();
  return {
    target: {
      targetId: 'project:example',
      repositoryId: 'ExampleOrg/example',
      componentId: 'backend'
    },
    capabilityReality,
    governanceDecision: decisionFor(capabilityReality),
    observedAt: NOW,
    ...overrides
  } as any;
}

test('GWC-9 RED AF-32: operational-write governed task mutations traverse the existing shadow gate', async () => {
  const serverSource = await readFile('src/server.ts', 'utf8');
  assert.match(
    serverSource,
    /registerGovernedTaskMutationTools\(\s*decorateScopedWriteServer\(\s*decorateRegistrationCatalogServer\(server,\s*'operational-write'\),\s*getDefaultScopedWriteGateDependencies\(\)\s*\),\s*taskDependencies\s*\)/s
  );
});

test('GW-10 composes existing CapabilityReality and GovernanceDecision without creating a second authority', async () => {
  const { composeGovernanceInheritance } = await governanceModule();
  const value = input();
  const result = composeGovernanceInheritance(value);

  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.operation, TOOL);
  assert.equal(result.mayExecute, true);
  assert.deepEqual(result.capabilityReality, value.capabilityReality);
  assert.deepEqual(result.governanceDecision, value.governanceDecision);
  assert.deepEqual(result.provenance, ['capability_reality', 'governance_decision']);
  assert.equal(result.authorizationInferred, false);
  assert.equal(result.mutationPerformed, false);
});

test('GWC-9 UNKNOWN capability evidence never composes to permission', async () => {
  const { composeGovernanceInheritance } = await governanceModule();
  const capabilityReality = deriveCapabilityReality({
    toolName: TOOL,
    registered: true,
    governanceSafe: true,
    observedAt: NOW,
    provenance: ['runtime_catalogue']
  });
  const governanceDecision = decisionFor(capabilityReality);
  const result = composeGovernanceInheritance(input({ capabilityReality, governanceDecision }));

  assert.equal(capabilityReality.callability.status, 'UNKNOWN');
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.mayExecute, false);
  assert.ok(result.reasonCodes.includes('CALLABILITY_UNATTESTED'));
  assert.ok(result.reasonCodes.includes('AUTHORIZATION_UNATTESTED'));
});

test('GWC-9 a permissive client attestation cannot outrank the server-backed capability used by GovernanceDecision', async () => {
  const { composeGovernanceInheritance } = await governanceModule();
  const serverReality = deriveCapabilityReality({
    toolName: TOOL,
    registered: true,
    callability: { status: 'NOT_CALLABLE', source: 'SERVER' },
    authorized: { status: 'TRUE' },
    governanceSafe: true,
    observedAt: NOW,
    provenance: ['server_observation']
  });
  const governanceDecision = decisionFor(serverReality);
  const clientReality = safeCapability('CLIENT_ATTESTATION');
  const result = composeGovernanceInheritance(input({
    capabilityReality: clientReality,
    governanceDecision
  }));

  assert.equal(result.status, 'CONFLICT');
  assert.equal(result.mayExecute, false);
  assert.deepEqual(result.reasonCodes, ['CAPABILITY_GOVERNANCE_MISMATCH']);
});

test('GWC-9 composition is monotonically restrictive when GovernanceDecision blocks', async () => {
  const { composeGovernanceInheritance } = await governanceModule();
  const capabilityReality = safeCapability();
  const governanceDecision = decisionFor(capabilityReality, { ownerMatches: false });
  const result = composeGovernanceInheritance(input({ capabilityReality, governanceDecision }));

  assert.equal(capabilityReality.safeNow, true);
  assert.equal(governanceDecision.mayMutate, false);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.mayExecute, false);
  assert.ok(result.reasonCodes.includes('WRONG_OWNER_OR_SESSION'));
});

test('GWC-9 rejects an operation mismatch instead of silently composing unrelated facts', async () => {
  const { composeGovernanceInheritance } = await governanceModule();
  const capabilityReality = safeCapability();
  const governanceDecision = deriveGovernanceDecision({
    operation: 'mcp_claim_next_governed_task',
    capabilityReality,
    sessionPresent: true,
    bootstrapCurrent: true,
    lockConflicts: 0,
    githubWorkStateAvailable: true,
    requiresGithubWorkState: false,
    ownerMatches: true,
    dependenciesSatisfied: true,
    requiredEvidence: [],
    observedAt: NOW
  });
  const result = composeGovernanceInheritance(input({ capabilityReality, governanceDecision }));

  assert.equal(result.status, 'CONFLICT');
  assert.equal(result.mayExecute, false);
  assert.deepEqual(result.reasonCodes, ['OPERATION_BINDING_MISMATCH']);
});

test('GW-11 effective capability set preserves the restrictive result and source semantics', async () => {
  const { composeGovernanceInheritance, deriveEffectiveCapabilitySet } = await governanceModule();
  const inherited = composeGovernanceInheritance(input());
  const effective = deriveEffectiveCapabilitySet(inherited);

  assert.equal(effective.status, 'SUCCESS');
  assert.equal(effective.mayExecute, true);
  assert.equal(effective.capabilities.length, 1);
  assert.deepEqual(effective.capabilities[0], {
    toolName: TOOL,
    callability: { status: 'CALLABLE', source: 'SERVER' },
    authorized: { status: 'TRUE' },
    safeNow: true,
    governanceMayMutate: true,
    effective: true,
    reasonCodes: []
  });
  assert.equal(effective.authorizationInferred, false);
  assert.equal(effective.mutationPerformed, false);
});

test('GW-10 and GW-11 wrappers bind canonical contracts and stay READ_ONLY', async () => {
  const {
    resolveGw10GovernanceInheritance,
    resolveGw11EffectiveCapabilities
  } = await governanceModule();
  const canonical = await substrate();

  const gw10 = resolveGw10GovernanceInheritance(input(), canonical);
  const gw11 = resolveGw11EffectiveCapabilities(input(), canonical);

  assert.deepEqual(gw10.contract, { stepId: 'GW-10', contractVersion: 1 });
  assert.deepEqual(gw11.contract, { stepId: 'GW-11', contractVersion: 1 });
  assert.equal(gw10.replayModel, 'READ_ONLY');
  assert.equal(gw11.replayModel, 'READ_ONLY');
  assert.equal(gw10.mutationPerformed, false);
  assert.equal(gw11.mutationPerformed, false);
  assert.equal(gw10.authorizationInferred, false);
  assert.equal(gw11.authorizationInferred, false);
});

test('GWC-9 is deterministic for the same target and authority snapshot', async () => {
  const { composeGovernanceInheritance } = await governanceModule();
  const value = input();
  const first = composeGovernanceInheritance(value);
  const second = composeGovernanceInheritance(value);
  assert.deepEqual(second, first);
});
