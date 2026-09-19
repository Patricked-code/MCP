import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import { createGovernedContractSubstrate } from '../src/governedWorkflow/contractSubstrate.js';

const NOW = '2026-09-19T09:15:00.000Z';
const HEAD = 'a'.repeat(40);
const NEXT_HEAD = 'b'.repeat(40);

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

async function development() {
  return import('../src/governedWorkflow/development/index.js');
}

async function packageJson() {
  return JSON.parse(await readFile('package.json', 'utf8'));
}

function profileRaw() {
  return {
    schemaVersion: 1,
    profileId: 'mcp-ci-v1',
    projectId: 'mcp',
    repository: 'Patricked-code/MCP',
    ci: { workflow: 'MCP CI', job: 'validate' },
    validationScripts: [
      { id: 'typecheck', script: 'typecheck' },
      { id: 'build', script: 'build' },
      { id: 'docs-check', script: 'docs:check' },
      { id: 'governance-tests', script: 'test:governance' },
      { id: 'gwc-verify', script: 'gwc:verify' },
      { id: 'secret-scan', script: 'lint:secrets' },
      { id: 'read-only-safety', script: 'test:readonly-safety' }
    ],
    workflowNativeChecks: ['whitespace-diff'],
    testDiscovery: {
      root: 'tests',
      suffix: '.test.ts',
      runnerScript: 'test:readonly-safety',
      dedicated: [
        { path: 'tests/docGovernance.test.ts', script: 'test:governance' }
      ]
    }
  };
}

async function canonicalProfile() {
  const { parseProjectValidationProfile } = await development();
  return parseProjectValidationProfile(profileRaw());
}

async function ciObservation(overrides: Record<string, unknown> = {}) {
  const { validationProfileDigest } = await development();
  const profile = await canonicalProfile();
  return {
    runId: 9001,
    observedAt: NOW,
    workflow: 'MCP CI',
    job: 'validate',
    profileId: profile.profileId,
    profileDigest: validationProfileDigest(profile),
    headSha: HEAD,
    status: 'completed',
    conclusion: 'failure',
    failedSteps: ['Read-only safety tests'],
    failureSignals: [
      { reasonCode: 'ERR_MODULE_NOT_FOUND', testName: 'GWC-13 intended RED' }
    ],
    ...overrides
  };
}

function expectedFailure() {
  return {
    signatureId: 'gwc13-red-module',
    failedSteps: ['Read-only safety tests'],
    requiredReasonCodes: ['ERR_MODULE_NOT_FOUND'],
    requiredTestNames: ['GWC-13 intended RED']
  };
}

function declaration(summary = 'bounded declared change') {
  return {
    declaredAt: NOW,
    summary,
    changeDigest: 'c'.repeat(64)
  };
}

test('GWC-13 RED AF-31: package validation profile is project-scoped and test execution is discovery-based', async () => {
  const pkg = await packageJson();
  assert.equal(pkg.scripts['test:readonly-safety'], 'node scripts/run-validation-tests.mjs');
  assert.deepEqual(pkg.mcpValidationProfile, profileRaw());

  const names = (await readdir('tests'))
    .filter((name) => name.endsWith('.test.ts'))
    .map((name) => `tests/${name}`)
    .sort();

  const { parseProjectValidationProfile, classifyValidationTestCoverage } = await development();
  const profile = parseProjectValidationProfile(pkg.mcpValidationProfile);
  const coverage = classifyValidationTestCoverage(profile, names);

  assert.deepEqual(coverage.uncoveredTests, []);
  assert.equal(coverage.runnerTests.includes('tests/githubRegistryEvidence.test.ts'), true);
  assert.equal(coverage.dedicatedTests.includes('tests/docGovernance.test.ts'), true);
  assert.equal(coverage.runnerTests.includes('tests/docGovernance.test.ts'), false);
});

test('GWC-13 declared profile reproduces the existing MCP CI validation order', async () => {
  const profile = await canonicalProfile();
  const workflow = await readFile('.github/workflows/mcp-ci.yml', 'utf8');
  const expectedScripts = profile.validationScripts.map((entry: any) => entry.script);
  assert.deepEqual(expectedScripts, [
    'typecheck',
    'build',
    'docs:check',
    'test:governance',
    'gwc:verify',
    'lint:secrets',
    'test:readonly-safety'
  ]);

  let previous = -1;
  for (const script of expectedScripts) {
    const at = workflow.indexOf(`npm run ${script}`);
    assert.ok(at > previous, `workflow order missing or stale for ${script}`);
    previous = at;
  }
  assert.ok(workflow.indexOf('Whitespace diff check') > previous);
});

test('GW-24 plans governed branch creation without mutating or inferring authorization', async () => {
  const { planGw24BranchCreation } = await development();
  const result = planGw24BranchCreation({
    repository: 'Patricked-code/MCP',
    branch: 'mcp/gwc13-example',
    baseSha: HEAD,
    branchPolicyAllowed: true,
    declaration: declaration('create governed development branch')
  }, await substrate());

  assert.equal(result.contract.stepId, 'GW-24');
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'github_create_branch');
  assert.equal(result.effectPlan?.expectedHeadSha, HEAD);
  assert.equal(result.authorizationInferred, false);
  assert.equal(result.mutationPerformed, false);
});

test('GW-25/GW-26 bind expected RED signature to exact-head CI evidence', async () => {
  const {
    planGw25RedAuthoring,
    observeGw26TddRed
  } = await development();
  const canonical = await substrate();
  const profile = await canonicalProfile();

  const authored = planGw25RedAuthoring({
    repository: 'Patricked-code/MCP',
    branch: 'mcp/gwc13-example',
    expectedHeadSha: HEAD,
    branchReady: true,
    expectedFailure: expectedFailure(),
    declaration: declaration('author intended red test')
  }, canonical);
  assert.equal(authored.contract.stepId, 'GW-25');
  assert.equal(authored.status, 'READY');
  assert.equal(authored.effectPlan?.toolName, 'github_create_commit');

  const valid = observeGw26TddRed({
    expectedHeadSha: HEAD,
    profile,
    expectedFailure: expectedFailure(),
    ci: await ciObservation()
  }, canonical);
  assert.equal(valid.contract.stepId, 'GW-26');
  assert.equal(valid.status, 'SUCCESS');
  assert.equal(valid.payload.matchedFailureSignature, true);
  assert.equal(valid.payload.headSha, HEAD);

  const unrelated = observeGw26TddRed({
    expectedHeadSha: HEAD,
    profile,
    expectedFailure: expectedFailure(),
    ci: await ciObservation({
      failedSteps: ['Build'],
      failureSignals: [{ reasonCode: 'LOCKFILE_DRIFT', testName: null }]
    })
  }, canonical);
  assert.equal(unrelated.status, 'UNVERIFIED');
  assert.ok(unrelated.reasonCodes.includes('RED_FAILURE_SIGNATURE_MISMATCH'));
});

test('GW-27/GW-28 require valid RED then exact-head GREEN CI', async () => {
  const {
    observeGw26TddRed,
    planGw27GreenImplementation,
    observeGw28GreenCi
  } = await development();
  const canonical = await substrate();
  const profile = await canonicalProfile();
  const red = observeGw26TddRed({
    expectedHeadSha: HEAD,
    profile,
    expectedFailure: expectedFailure(),
    ci: await ciObservation()
  }, canonical);

  const greenPlan = planGw27GreenImplementation({
    repository: 'Patricked-code/MCP',
    branch: 'mcp/gwc13-example',
    expectedHeadSha: HEAD,
    redProof: red,
    declaration: declaration('minimal green implementation')
  }, canonical);
  assert.equal(greenPlan.contract.stepId, 'GW-27');
  assert.equal(greenPlan.status, 'READY');

  const green = observeGw28GreenCi({
    expectedHeadSha: NEXT_HEAD,
    profile,
    ci: await ciObservation({
      headSha: NEXT_HEAD,
      conclusion: 'success',
      failedSteps: [],
      failureSignals: []
    })
  }, canonical);
  assert.equal(green.contract.stepId, 'GW-28');
  assert.equal(green.status, 'SUCCESS');

  const stale = observeGw28GreenCi({
    expectedHeadSha: HEAD,
    profile,
    ci: await ciObservation({
      headSha: NEXT_HEAD,
      conclusion: 'success',
      failedSteps: [],
      failureSignals: []
    })
  }, canonical);
  assert.equal(stale.status, 'CONFLICT');
  assert.deepEqual(stale.reasonCodes, ['CI_HEAD_MISMATCH']);
});

test('GW-29 self-review preserves AF-15 evidence and AF-16 conditional route', async () => {
  const {
    observeGw28GreenCi,
    evaluateGw29SelfReview
  } = await development();
  const canonical = await substrate();
  const profile = await canonicalProfile();
  const green = observeGw28GreenCi({
    expectedHeadSha: HEAD,
    profile,
    ci: await ciObservation({
      conclusion: 'success',
      failedSteps: [],
      failureSignals: []
    })
  }, canonical);

  const clear = evaluateGw29SelfReview({
    headSha: HEAD,
    greenProof: green,
    declaredAt: NOW,
    findings: []
  }, canonical);
  assert.equal(clear.contract.stepId, 'GW-29');
  assert.equal(clear.status, 'SUCCESS');
  assert.equal(clear.payload.nextStepId, 'GW-32');
  assert.equal(clear.payload.skipReason, 'SKIPPABLE_IF_FINDINGS_EMPTY');
  assert.deepEqual(clear.payload.evidenceModel, ['AGENT_DECLARED', 'CI_OBSERVED']);

  const finding = evaluateGw29SelfReview({
    headSha: HEAD,
    greenProof: green,
    declaredAt: NOW,
    findings: [{
      findingId: 'SELF-REVIEW-1',
      category: 'CODE',
      summary: 'Fail-closed guard missing'
    }]
  }, canonical);
  assert.equal(finding.payload.nextStepId, 'GW-30');
  assert.equal(finding.payload.skipReason, null);
});

test('GW-30 reuses expected-failure qualification and skips explicitly when no finding exists', async () => {
  const {
    observeGw28GreenCi,
    evaluateGw29SelfReview,
    observeGw30RegressionRed
  } = await development();
  const canonical = await substrate();
  const profile = await canonicalProfile();
  const green = observeGw28GreenCi({
    expectedHeadSha: HEAD,
    profile,
    ci: await ciObservation({ conclusion: 'success', failedSteps: [], failureSignals: [] })
  }, canonical);
  const clear = evaluateGw29SelfReview({
    headSha: HEAD, greenProof: green, declaredAt: NOW, findings: []
  }, canonical);

  const skipped = observeGw30RegressionRed({
    selfReview: clear,
    expectedHeadSha: HEAD,
    profile,
    expectedFailure: expectedFailure(),
    ci: await ciObservation()
  }, canonical);
  assert.equal(skipped.contract.stepId, 'GW-30');
  assert.equal(skipped.status, 'NONE');
  assert.deepEqual(skipped.reasonCodes, ['SKIPPABLE_IF_FINDINGS_EMPTY']);
  assert.equal(skipped.payload.nextStepId, 'GW-32');

  const withFinding = evaluateGw29SelfReview({
    headSha: HEAD,
    greenProof: green,
    declaredAt: NOW,
    findings: [{ findingId: 'R1', category: 'TEST', summary: 'Regression required' }]
  }, canonical);
  const proven = observeGw30RegressionRed({
    selfReview: withFinding,
    expectedHeadSha: HEAD,
    profile,
    expectedFailure: expectedFailure(),
    ci: await ciObservation()
  }, canonical);
  assert.equal(proven.status, 'SUCCESS');
  assert.equal(proven.payload.nextStepId, 'GW-31');
});

test('GW-31 plans regression green only after a proven regression RED', async () => {
  const {
    observeGw28GreenCi,
    evaluateGw29SelfReview,
    observeGw30RegressionRed,
    planGw31RegressionGreen
  } = await development();
  const canonical = await substrate();
  const profile = await canonicalProfile();
  const green = observeGw28GreenCi({
    expectedHeadSha: HEAD,
    profile,
    ci: await ciObservation({ conclusion: 'success', failedSteps: [], failureSignals: [] })
  }, canonical);
  const review = evaluateGw29SelfReview({
    headSha: HEAD,
    greenProof: green,
    declaredAt: NOW,
    findings: [{ findingId: 'R1', category: 'CODE', summary: 'Fix required' }]
  }, canonical);
  const regressionRed = observeGw30RegressionRed({
    selfReview: review,
    expectedHeadSha: HEAD,
    profile,
    expectedFailure: expectedFailure(),
    ci: await ciObservation()
  }, canonical);
  const plan = planGw31RegressionGreen({
    repository: 'Patricked-code/MCP',
    branch: 'mcp/gwc13-example',
    expectedHeadSha: HEAD,
    regressionRed,
    declaration: declaration('regression green fix')
  }, canonical);
  assert.equal(plan.contract.stepId, 'GW-31');
  assert.equal(plan.status, 'READY');
  assert.equal(plan.effectPlan?.toolName, 'github_create_commit');
});

test('GW-32 full regression requires the exact profile and exact head', async () => {
  const { observeGw32FullRegression } = await development();
  const canonical = await substrate();
  const profile = await canonicalProfile();

  const success = observeGw32FullRegression({
    expectedHeadSha: HEAD,
    profile,
    ci: await ciObservation({ conclusion: 'success', failedSteps: [], failureSignals: [] })
  }, canonical);
  assert.equal(success.contract.stepId, 'GW-32');
  assert.equal(success.status, 'SUCCESS');

  const wrongProfile = observeGw32FullRegression({
    expectedHeadSha: HEAD,
    profile,
    ci: await ciObservation({ profileId: 'other-profile', conclusion: 'success', failedSteps: [], failureSignals: [] })
  }, canonical);
  assert.equal(wrongProfile.status, 'CONFLICT');
  assert.deepEqual(wrongProfile.reasonCodes, ['CI_PROFILE_MISMATCH']);
});

test('GW-33 documentation stays non-terminal and never claims workflow completion', async () => {
  const {
    observeGw32FullRegression,
    planGw33Documentation
  } = await development();
  const canonical = await substrate();
  const profile = await canonicalProfile();
  const full = observeGw32FullRegression({
    expectedHeadSha: HEAD,
    profile,
    ci: await ciObservation({ conclusion: 'success', failedSteps: [], failureSignals: [] })
  }, canonical);

  const planned = planGw33Documentation({
    repository: 'Patricked-code/MCP',
    branch: 'mcp/gwc13-example',
    expectedHeadSha: HEAD,
    fullRegressionProof: full,
    documentationRequired: true,
    declaration: declaration('update non-terminal docs')
  }, canonical);
  assert.equal(planned.contract.stepId, 'GW-33');
  assert.equal(planned.status, 'READY');
  assert.equal(planned.payload.terminal, false);
  assert.equal(planned.effectPlan?.toolName, 'github_create_commit');

  const skipped = planGw33Documentation({
    repository: 'Patricked-code/MCP',
    branch: 'mcp/gwc13-example',
    expectedHeadSha: HEAD,
    fullRegressionProof: full,
    documentationRequired: false,
    declaration: declaration('no docs needed')
  }, canonical);
  assert.equal(skipped.status, 'NONE');
  assert.equal(skipped.payload.terminal, false);
});
