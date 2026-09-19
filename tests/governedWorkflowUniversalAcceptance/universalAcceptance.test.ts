import assert from 'node:assert/strict';
import test from 'node:test';

async function harness() {
  return import('./harness.js');
}

test('GW-73 RED: universal acceptance returns one terminal report with no skipped scenario', async () => {
  const { runUniversalAcceptance } = await harness();
  const report = await runUniversalAcceptance();
  assert.equal(report.stepId, 'GW-73');
  assert.equal(report.status, 'ACCEPTED');
  assert.equal(report.mutationPerformed, false);
  assert.equal(report.authorizationInferred, false);
  assert.ok(report.scenarios.length >= 6);
  assert.equal(report.scenarios.some((scenario: any) => scenario.status === 'SKIPPED'), false);
  assert.equal(report.scenarios.every((scenario: any) => scenario.status === 'PASS'), true);
});

test('GW-73 RED: historical MCP remains a configured legacy single-repository target', async () => {
  const { runUniversalAcceptance } = await harness();
  const report = await runUniversalAcceptance();
  const scenario = report.scenarios.find((entry: any) => entry.scenarioId === 'mcp-historical-single-repository');
  assert.ok(scenario);
  assert.equal(scenario.status, 'PASS');
  assert.equal(scenario.evidence.targetMode, 'LEGACY_SINGLE_REPOSITORY');
  assert.equal(scenario.evidence.repository, 'Patricked-code/MCP');
  assert.equal(scenario.evidence.workflowBranchingOnMcpLiteral, false);
});

test('GW-73 RED: Stablecoin fixture proves a second real project with S2 Passenger and no invented backend repository', async () => {
  const { runUniversalAcceptance } = await harness();
  const report = await runUniversalAcceptance();
  const scenario = report.scenarios.find((entry: any) => entry.scenarioId === 'stablecoin-real-candidate');
  assert.ok(scenario);
  assert.equal(scenario.status, 'PASS');
  assert.equal(scenario.evidence.projectUid, 'CS-STABLECOIN-001');
  assert.equal(scenario.evidence.runtimeKind, 'PASSENGER');
  assert.equal(scenario.evidence.serverId, 'S2');
  assert.equal(scenario.evidence.backendRepository, null);
  assert.equal(scenario.evidence.backendState, 'LIVE_DISCOVERY_REQUIRED');
  assert.equal(scenario.evidence.mcpSpecificBranchUsed, false);
});

test('GW-73 RED: multi-component target keeps independent SHAs and independent component locks', async () => {
  const { runUniversalAcceptance } = await harness();
  const report = await runUniversalAcceptance();
  const scenario = report.scenarios.find((entry: any) => entry.scenarioId === 'synthetic-multi-component');
  assert.ok(scenario);
  assert.equal(scenario.status, 'PASS');
  assert.equal(scenario.evidence.projectShaPresent, false);
  assert.equal(scenario.evidence.independentShas, true);
  assert.equal(scenario.evidence.independentLocks, true);
  assert.notEqual(scenario.evidence.frontendLock, scenario.evidence.apiLock);
});

test('GW-73 RED: an unresolved component remains local and does not poison its resolved sibling', async () => {
  const { runUniversalAcceptance } = await harness();
  const report = await runUniversalAcceptance();
  const scenario = report.scenarios.find((entry: any) => entry.scenarioId === 'partial-component-isolation');
  assert.ok(scenario);
  assert.equal(scenario.status, 'PASS');
  assert.equal(scenario.evidence.targetStatus, 'PARTIAL');
  assert.equal(scenario.evidence.resolvedSiblingFreshness, 'CURRENT');
  assert.equal(scenario.evidence.unresolvedComponentFreshness, 'UNVERIFIED');
});

test('GW-73 RED: recovery acceptance covers liveness, supervisor, runner ack, dedupe, restart-storm and claim safety', async () => {
  const { runUniversalAcceptance } = await harness();
  const report = await runUniversalAcceptance();
  const scenario = report.scenarios.find((entry: any) => entry.scenarioId === 'candidate-recovery-intake003');
  assert.ok(scenario);
  assert.equal(scenario.status, 'PASS');
  assert.equal(scenario.evidence.staleTransfersClaim, false);
  assert.equal(scenario.evidence.missingHeartbeatAllowsWrite, false);
  assert.equal(scenario.evidence.runnerIsAuthority, false);
  assert.equal(scenario.evidence.runnerAcknowledged, true);
  assert.equal(scenario.evidence.intakeDuplicateCount, 2);
  assert.equal(scenario.evidence.restartPlanDeterministic, true);
  assert.equal(scenario.evidence.staleEnvelopeAccepted, false);
  assert.equal(scenario.evidence.rawTranscriptPersisted, false);
  assert.equal(scenario.evidence.secretPersisted, false);
  assert.deepEqual(scenario.evidence.crashWindows, [
    'CLAIM_BEFORE_LOCK',
    'LOCK_BEFORE_MUTATION',
    'DEPLOYMENT_BEFORE_ATTESTATION'
  ]);
});

test('GW-73 RED: governed workflow source contains no target-specific repository/server/domain hardcodes', async () => {
  const { runUniversalAcceptance } = await harness();
  const report = await runUniversalAcceptance();
  const scenario = report.scenarios.find((entry: any) => entry.scenarioId === 'anti-hardcode-governed-paths');
  assert.ok(scenario);
  assert.equal(scenario.status, 'PASS');
  assert.deepEqual(scenario.evidence.violations, []);
  assert.equal(scenario.evidence.scannedFileCount >= 10, true);
});

test('GW-73 RED: acceptance is test-only, fail-closed and never imported by runtime source', async () => {
  const {
    runUniversalAcceptance,
    verifyAcceptanceHarnessIsolation
  } = await harness();

  const isolation = await verifyAcceptanceHarnessIsolation();
  assert.equal(isolation.runtimeImportsAcceptanceHarness, false);
  assert.equal(isolation.harnessPath.startsWith('tests/governedWorkflowUniversalAcceptance/'), true);

  const failed = await runUniversalAcceptance({
    forceScenarioFailure: 'stablecoin-real-candidate'
  });
  assert.equal(failed.status, 'FAILED');
  assert.equal(failed.scenarios.find((entry: any) => entry.scenarioId === 'stablecoin-real-candidate')?.status, 'FAIL');
  assert.equal(failed.scenarios.some((scenario: any) => scenario.status === 'SKIPPED'), false);
});
