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
  assert.equal(scenario.evidence.terminalContractRegistryBound, true);
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

test('GWC-17 self-review RED: anti-hardcode detector rejects a deliberately reintroduced target literal', async () => {
  const { detectTargetHardcodesInSource } = await harness();
  const violations = detectTargetHardcodesInSource(
    "const target = 'Patricked-code/MCP'; const server = 's2';"
  );
  assert.deepEqual(
    violations.map((entry: any) => entry.literal).sort(),
    ["'s2'", 'Patricked-code/MCP'].sort()
  );
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
  const failedScenario = failed.scenarios.find((entry: any) => entry.scenarioId === 'stablecoin-real-candidate');
  assert.equal(failedScenario?.status, 'FAIL');
  assert.equal(failedScenario?.reasonCode, 'FORCED_ACCEPTANCE_FAILURE');
  assert.ok(failed.failedContracts.includes('GW-08'));
  assert.equal(failed.scenarios.some((scenario: any) => scenario.status === 'SKIPPED'), false);
});

test('Phase F-02 RED: one coherent happy path reaches DONE with a single binding and no live mutation', async () => {
  const { runFullCandidateHappyPath } = await harness();
  const report = await runFullCandidateHappyPath();

  assert.equal(report.status, 'PASS');
  assert.deepEqual(report.orderedStages, [
    'Intent',
    'Identity',
    'Repository',
    'Project',
    'Server',
    'Runtime',
    'Domain',
    'Governance',
    'Capability',
    'Task',
    'Session',
    'Locks',
    'Development',
    'CI',
    'Review',
    'Merge',
    'Deploy',
    'Verify',
    'DONE'
  ]);
  assert.equal(report.stages.every((stage: any) => stage.status === 'PASS'), true);
  assert.equal(report.stages.some((stage: any) => stage.status === 'SKIPPED'), false);
  assert.equal(report.bindingConsistent, true);
  assert.equal(report.finalTaskStatus, 'DONE');
  assert.equal(report.executionMode, 'TEST_SHADOW_ISOLATED');
  assert.equal(report.mutationPerformed, false);
  assert.equal(report.liveMutationDispatched, false);
  assert.equal(report.effectPlansOnly, true);
});

test('Phase F-03 RED: every canonical negative class fails closed or follows an explicit recovery edge', async () => {
  const { runFullCandidateNegativeMatrix } = await harness();
  const report = await runFullCandidateNegativeMatrix();

  assert.equal(report.status, 'PASS');
  assert.deepEqual(report.requiredClasses, [
    'UNKNOWN',
    'AMBIGUOUS',
    'STALE',
    'CONFLICT',
    'DUPLICATE',
    'DENIED',
    'CI_FAILURE',
    'HEAD_DRIFT',
    'REVIEW_REJECTION',
    'DEPLOY_FAILURE',
    'RUNTIME_DRIFT',
    'DOCS_DRIFT',
    'STALE_RECEIPT',
    'RECONNECT',
    'CONCURRENT_AGENTS'
  ]);
  assert.equal(report.cases.length, report.requiredClasses.length);
  assert.equal(report.cases.some((entry: any) => entry.status === 'SKIPPED'), false);
  assert.equal(report.cases.every((entry: any) => (
    entry.status === 'FAIL_CLOSED' || entry.status === 'RECOVERY_EDGE'
  )), true);
  assert.equal(report.cases.every((entry: any) => entry.safe === true), true);
  assert.equal(report.mutationPerformed, false);
  assert.equal(report.liveMutationDispatched, false);
});


test('Phase F-04 RED: governed candidate stays parameter-driven across alternate target contexts', async () => {
  const { runCrossContextUniversalityAudit } = await harness();
  const report = await runCrossContextUniversalityAudit();

  assert.equal(report.status, 'PASS');
  assert.deepEqual(report.forbiddenHardDependencies, [
    'Patricked-code/MCP',
    'Stablecoin',
    'AfricaFunds',
    'FIXED_SERVER',
    'FIXED_BRANCH',
    'FIXED_DOMAIN'
  ]);
  assert.deepEqual(report.violations, []);
  assert.equal(report.contexts.length, 2);
  assert.equal(report.contexts.every((entry: any) => entry.status === 'PASS'), true);
  assert.equal(report.contexts.every((entry: any) => entry.repositoryParameterPreserved === true), true);
  assert.equal(report.contexts.every((entry: any) => entry.projectParameterPreserved === true), true);
  assert.equal(report.contexts.every((entry: any) => entry.serverParameterPreserved === true), true);
  assert.equal(report.contexts.every((entry: any) => entry.branchParameterPreserved === true), true);
  assert.equal(report.contexts.every((entry: any) => entry.domainParameterPreserved === true), true);
  assert.notEqual(report.contexts[0]?.repository, report.contexts[1]?.repository);
  assert.notEqual(report.contexts[0]?.projectUid, report.contexts[1]?.projectUid);
  assert.notEqual(report.contexts[0]?.serverId, report.contexts[1]?.serverId);
  assert.notEqual(report.contexts[0]?.branch, report.contexts[1]?.branch);
  assert.notEqual(report.contexts[0]?.domain, report.contexts[1]?.domain);
  assert.equal(report.mutationPerformed, false);
  assert.equal(report.liveMutationDispatched, false);
});
