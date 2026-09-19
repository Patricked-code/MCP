import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  AutoResumeCompatibleSessionInput,
  AutoResumeCompatibleSessionResult
} from '../src/operationalMemory/sessionService.js';
import type { GovernedOperationalContext } from '../src/governedContext/types.js';
import type {
  BootstrapReceipt,
  GovernedSessionPublicRecord
} from '../src/operationalMemory/types.js';
import { createGovernedContractSubstrate } from '../src/governedWorkflow/contractSubstrate.js';

type Assert<T extends true> = T;
type AcceptsSecondTarget<T> = 'ExampleOrg/api' extends T ? true : false;
type _AutoResumeRepositoryIsGeneralized =
  Assert<AcceptsSecondTarget<AutoResumeCompatibleSessionInput['repository']>>;
type _GovernedContextRepositoryIsGeneralized =
  Assert<AcceptsSecondTarget<GovernedOperationalContext['repository']>>;

const NOW = '2026-09-19T03:00:00Z';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const CONTEXT_ID = '22222222-2222-4222-8222-222222222222';
const RECEIPT_ID = '33333333-3333-4333-8333-333333333333';

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

async function adapters() {
  return import('../src/governedWorkflow/adapters/session.js');
}

function session(): GovernedSessionPublicRecord {
  return {
    schemaVersion: 1,
    governedSessionId: SESSION_ID,
    repository: 'Patricked-code/MCP',
    taskScope: 'TASK-GWC4-PARITY',
    workBranch: 'claude/ecstatic-edison-v1dyt1',
    agentIdentity: 'chatgpt',
    ownerPrincipalId: 'oauth:example',
    identityAssurance: 'oauth_subject',
    status: 'ACTIVE',
    createdAt: NOW,
    resumedAt: NOW,
    lastHeartbeatAt: NOW,
    pausedAt: null,
    expiredAt: null,
    closedAt: null,
    currentTransport: null,
    lastAcknowledgedStateVersion: 17,
    bootstrapReceipt: receipt(),
    connectionContext: {
      schemaVersion: 1,
      connectionContextId: CONTEXT_ID,
      governedSessionId: SESSION_ID,
      repository: 'Patricked-code/MCP',
      principalId: 'oauth:example',
      observedClientId: 'chatgpt-client',
      identityAssurance: 'oauth_subject',
      clientClassification: 'UNRESOLVED',
      evidenceSource: 'oauth_auth_info',
      createdAt: NOW
    },
    sessionRevision: 4,
    lastCheckpoint: null,
    blockers: [],
    nextAction: 'continue',
    lockIds: [],
    resumePolicy: 'stable_principal_or_resume_secret'
  };
}

function receipt(): BootstrapReceipt {
  return {
    schemaVersion: 1,
    bootstrapReceiptId: RECEIPT_ID,
    governedSessionId: SESSION_ID,
    agentIdentity: 'chatgpt',
    repository: 'Patricked-code/MCP',
    governedBranch: 'claude/ecstatic-edison-v1dyt1',
    stateVersion: 17,
    githubHead: 'a'.repeat(40),
    runtimeRevision: null,
    catalogueDigest: 'b'.repeat(64),
    governanceDigest: 'c'.repeat(64),
    taskRegistryDigest: 'd'.repeat(64),
    createdAt: NOW,
    expiresAt: '2026-09-19T04:00:00Z',
    status: 'ACKNOWLEDGED',
    limitations: []
  };
}

test('GWC-4 keeps persisted Session/Receipt/ConnectionContext schemas on the current target until GWC-10', async () => {
  const source = await readFile('src/operationalMemory/types.ts', 'utf8');
  const connection = await readFile('src/operationalMemory/connectionContext.ts', 'utf8');
  assert.match(source, /BootstrapReceiptSchema[\s\S]*repository:\s*z\.literal\('Patricked-code\/MCP'\)/);
  assert.match(source, /GovernedSessionRecordSchema[\s\S]*repository:\s*z\.literal\('Patricked-code\/MCP'\)/);
  assert.match(connection, /ConnectionContextSchema[\s\S]*repository:\s*z\.literal\('Patricked-code\/MCP'\)/);
});

test('GW-02 bootstrap wrapper preserves MISSING/CURRENT/STALE/EXPIRED without upgrading freshness', async () => {
  const { wrapGw02ConnectionBootstrap } = await adapters();
  const contracts = await substrate();
  const statuses = [
    ['MISSING', 'UNKNOWN'],
    ['CURRENT', 'CURRENT'],
    ['STALE', 'STALE'],
    ['EXPIRED', 'EXPIRED']
  ] as const;
  for (const [status, freshness] of statuses) {
    const payload = {
      required: true as const,
      status,
      receipt: status === 'MISSING' ? null : receipt(),
      limitations: status === 'CURRENT' ? [] : ['BOOTSTRAP_NOT_CURRENT']
    };
    const before = JSON.stringify(payload);
    const wrapped = wrapGw02ConnectionBootstrap(payload, contracts);
    assert.deepEqual(wrapped.payload, payload);
    assert.equal(JSON.stringify(payload), before);
    assert.deepEqual(wrapped.contract.stepId, 'GW-02');
    assert.equal(wrapped.freshness, freshness);
    assert.equal(wrapped.authorizationInferred, false);
    assert.equal(wrapped.mutationPerformed, false);
  }
});

test('GW-03 connection-context wrapper observes the existing context and never creates one', async () => {
  const { wrapGw03ConnectionContext } = await adapters();
  const current = session().connectionContext!;
  const wrapped = wrapGw03ConnectionContext(current, await substrate());
  assert.equal(wrapped.status, 'PRESENT');
  assert.equal(wrapped.freshness, 'CURRENT');
  assert.deepEqual(wrapped.payload, current);
  assert.equal(wrapped.evidenceRefs.length, 1);
  assert.equal(wrapped.evidenceRefs[0]?.reference, `connection-context:${CONTEXT_ID}`);
  assert.equal(wrapped.authorizationInferred, false);
  assert.equal(wrapped.mutationPerformed, false);

  const absent = wrapGw03ConnectionContext(null, await substrate());
  assert.equal(absent.status, 'ABSENT');
  assert.equal(absent.freshness, 'UNKNOWN');
  assert.deepEqual(absent.evidenceRefs, []);
});

test('GW-12 receipt wrapper carries exact contract/graph binding but does not persist it into the receipt', async () => {
  const { wrapGw12BootstrapReceipt } = await adapters();
  const current = receipt();
  const before = JSON.stringify(current);
  const wrapped = wrapGw12BootstrapReceipt({
    required: true,
    status: 'CURRENT',
    receipt: current,
    limitations: []
  }, await substrate());

  assert.deepEqual(wrapped.payload, current);
  assert.equal(JSON.stringify(current), before);
  assert.match(wrapped.contract.contractRegistryDigest, /^[0-9a-f]{64}$/);
  assert.match(wrapped.contract.graphRegistryDigest, /^[0-9a-f]{64}$/);
  assert.equal('contractRegistryDigest' in current, false);
  assert.equal('graphRegistryDigest' in current, false);
});

test('GW-16 wraps open/attach/resume observations without ever exposing a resume secret', async () => {
  const { wrapGw16SessionOpenOrResume } = await adapters();
  const contracts = await substrate();
  const publicSession = session();

  const opened = wrapGw16SessionOpenOrResume(
    { status: 'OPENED', session: publicSession },
    contracts
  );
  assert.equal(opened.status, 'OPENED');
  assert.deepEqual(opened.payload, { status: 'OPENED', session: publicSession });

  const auto: AutoResumeCompatibleSessionResult = {
    status: 'RESUMED',
    session: publicSession
  };
  const resumed = wrapGw16SessionOpenOrResume(auto, contracts);
  assert.deepEqual(resumed.payload, auto);

  for (const value of [opened, resumed]) {
    const serialized = JSON.stringify(value);
    assert.equal(serialized.includes('resumeSecret'), false);
    assert.equal(value.authorizationInferred, false);
    assert.equal(value.mutationPerformed, false);
  }
});

test('GW-16 preserves NONE and AMBIGUOUS instead of choosing a session silently', async () => {
  const { wrapGw16SessionOpenOrResume } = await adapters();
  const contracts = await substrate();
  for (const status of ['NONE', 'AMBIGUOUS'] as const) {
    const wrapped = wrapGw16SessionOpenOrResume({ status }, contracts);
    assert.equal(wrapped.status, status);
    assert.equal(wrapped.freshness, 'UNKNOWN');
    assert.deepEqual(wrapped.evidenceRefs, []);
  }
});

test('GW-17 acknowledgement wrapper fails closed unless session and receipt prove the same stateVersion', async () => {
  const { wrapGw17ContextAcknowledgement } = await adapters();
  const contracts = await substrate();
  const acknowledged = session();

  const pass = wrapGw17ContextAcknowledgement(acknowledged, 17, contracts);
  assert.equal(pass.status, 'ACKNOWLEDGED');
  assert.equal(pass.freshness, 'CURRENT');
  assert.equal(pass.payload, acknowledged);
  assert.equal(pass.authorizationInferred, false);
  assert.equal(pass.mutationPerformed, false);
  assert.match(pass.contract.contractRegistryDigest, /^[0-9a-f]{64}$/);
  assert.match(pass.contract.graphRegistryDigest, /^[0-9a-f]{64}$/);

  const mismatch = wrapGw17ContextAcknowledgement({
    ...acknowledged,
    bootstrapReceipt: { ...receipt(), stateVersion: 16 }
  }, 17, contracts);
  assert.equal(mismatch.status, 'UNVERIFIED');
  assert.equal(mismatch.freshness, 'UNKNOWN');
  assert.deepEqual(mismatch.reasonCodes, ['ACKNOWLEDGEMENT_STATE_VERSION_MISMATCH']);
});

test('GWC-4 wrapper metadata contains no transport raw id, resume secret, permission or deploy authority', async () => {
  const {
    wrapGw02ConnectionBootstrap,
    wrapGw03ConnectionContext,
    wrapGw12BootstrapReceipt,
    wrapGw16SessionOpenOrResume,
    wrapGw17ContextAcknowledgement
  } = await adapters();
  const contracts = await substrate();
  const s = session();
  const values = [
    wrapGw02ConnectionBootstrap({ required:true, status:'CURRENT', receipt:receipt(), limitations:[] }, contracts),
    wrapGw03ConnectionContext(s.connectionContext!, contracts),
    wrapGw12BootstrapReceipt({ required:true, status:'CURRENT', receipt:receipt(), limitations:[] }, contracts),
    wrapGw16SessionOpenOrResume({ status:'ATTACHED', session:s }, contracts),
    wrapGw17ContextAcknowledgement(s, 17, contracts)
  ];
  for (const value of values) {
    const metadata = JSON.stringify({ ...value, payload: undefined });
    for (const forbidden of [
      'transportSessionId',
      'resumeSecret',
      'permission',
      'mayWrite',
      'mayDeploy',
      'credentialRef'
    ]) {
      assert.equal(metadata.includes(forbidden), false, forbidden);
    }
  }
});
