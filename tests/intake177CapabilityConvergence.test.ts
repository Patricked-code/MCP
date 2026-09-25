import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const INVENTORY_PATH = 'docs/governance/git-github-capability-convergence-20260925.json';

test('intake #177 is converged current-first into the existing Program Backlog V2', async () => {
  const [inventoryRaw, programRaw] = await Promise.all([
    readFile(INVENTORY_PATH, 'utf8'),
    readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  ]);
  const inventory = JSON.parse(inventoryRaw);
  const program = JSON.parse(programRaw);

  assert.equal(inventory.schemaVersion, 1);
  assert.equal(inventory.sourceIssue, 177);
  assert.equal(inventory.observedMainSha, 'c104e24259232dced2a24a7397640747c052d140');
  assert.equal(inventory.authority?.kind, 'DERIVED_NON_EXECUTABLE_INTAKE_CONVERGENCE');
  assert.equal(inventory.authority?.createsRuntimeTasks, false);
  assert.equal(inventory.authority?.createsParallelBacklog, false);

  assert.equal(inventory.capabilities.length, 164);
  assert.equal(inventory.capabilities.filter((entry: any) => entry.domain === 'git').length, 81);
  assert.equal(inventory.capabilities.filter((entry: any) => entry.domain === 'github').length, 83);
  assert.equal(new Set(inventory.capabilities.map((entry: any) => entry.canonicalName)).size, 164);

  const intake = (program.programIntakes ?? []).find((entry: any) => entry.issue === 177);
  assert.ok(intake);
  assert.equal(intake.status, 'CONVERGED_CURRENT_MAIN');
  assert.equal(intake.inventoryPath, INVENTORY_PATH);
  assert.equal(intake.createsParallelProgram, false);
  assert.equal(intake.createsRuntimeTasks, false);

  const workItem = program.workItems.find((entry: any) => entry.id === 'PB-GGCC');
  assert.ok(workItem);
  assert.equal(workItem.disposition, 'PARTIALLY_IMPLEMENTED');
  assert.equal(workItem.integrationSlot, 'control-plane.git-github-capability-completion');
});

test('every intake #177 capability has an explicit current-first disposition and program destination', async () => {
  const inventory = JSON.parse(await readFile(INVENTORY_PATH, 'utf8'));
  const allowedStatuses = new Set([
    'EXISTING',
    'EXISTING_PARTIAL',
    'EXISTING_NEEDS_GENERALIZATION',
    'EXISTING_NEEDS_WRAPPER',
    'MISSING',
    'DUPLICATE',
    'OBSOLETE',
    'NOT_REQUIRED',
    'DANGEROUS',
    'FORBIDDEN',
    'DEFERRED'
  ]);

  const requiredFields = [
    'capabilityId','canonicalName','domain','layer','operationClass','currentImplementation',
    'integrationSlot','existingAuthorities','requiredAuthorities','permissions','taskRequired',
    'sessionRequired','claimRequired','lockRequired','exactHeadRequired','stateVersionRequired',
    'humanGateRequired','productionEffect','securitySensitivity','idempotency','preconditions',
    'postconditions','evidenceProduced','rollbackStrategy','failureMode','compatibilityRequirements',
    'testsRequired','dependencies','status','recommendedDisposition','targetBlueprints'
  ];

  for (const capability of inventory.capabilities) {
    for (const field of requiredFields) {
      assert.notEqual(capability[field], undefined, `${capability.canonicalName} missing ${field}`);
    }
    assert.ok(allowedStatuses.has(capability.status), `${capability.canonicalName} invalid status ${capability.status}`);
    assert.ok(Array.isArray(capability.existingAuthorities));
    assert.ok(Array.isArray(capability.requiredAuthorities));
    assert.ok(Array.isArray(capability.preconditions));
    assert.ok(Array.isArray(capability.postconditions));
    assert.ok(Array.isArray(capability.testsRequired));
    assert.ok(Array.isArray(capability.dependencies));
    assert.ok(Array.isArray(capability.targetBlueprints));
    assert.ok(capability.targetBlueprints.length > 0, `${capability.canonicalName} must route into the current program`);
  }
});

test('known current GitHub capabilities are absorbed while historical provenance is never treated as current implementation', async () => {
  const inventory = JSON.parse(await readFile(INVENTORY_PATH, 'utf8'));
  const byName = new Map(inventory.capabilities.map((entry: any) => [entry.canonicalName, entry]));

  for (const name of ['github_get_commits','github_get_tree','github_get_required_checks']) {
    assert.equal(byName.get(name)?.status, 'EXISTING');
    assert.match(byName.get(name)?.currentImplementation, /src\/tools\/githubControlPlaneRead\.ts/);
    assert.ok(byName.get(name)?.targetBlueprints.includes('TB-W2-01')
      || byName.get(name)?.targetBlueprints.includes('TB-W2-02')
      || byName.get(name)?.targetBlueprints.includes('TB-W2-03'));
  }

  assert.equal(byName.get('github_create_branch')?.status, 'EXISTING');
  assert.equal(byName.get('github_merge_pull_request')?.status, 'EXISTING');

  assert.equal(byName.get('github_create_repository')?.status, 'MISSING');
  assert.equal(byName.get('github_create_repository')?.provenance?.historicalPullRequest, 88);
  assert.equal(byName.get('github_create_repository')?.targetBlueprints.includes('TB-W3-ADMIN-01'), true);
});

test('local Git demand is routed through bounded generic capability lots instead of shell escape hatches', async () => {
  const inventory = JSON.parse(await readFile(INVENTORY_PATH, 'utf8'));
  const byName = new Map(inventory.capabilities.map((entry: any) => [entry.canonicalName, entry]));

  assert.equal(byName.get('git_status')?.status, 'EXISTING_PARTIAL');
  assert.equal(byName.get('git_diff')?.status, 'EXISTING_PARTIAL');
  assert.equal(byName.get('git_fetch')?.status, 'EXISTING_PARTIAL');
  assert.equal(byName.get('git_commit')?.status, 'MISSING');
  assert.equal(byName.get('git_merge')?.status, 'MISSING');
  assert.equal(byName.get('git_amend_commit')?.status, 'DANGEROUS');
  assert.equal(byName.get('git_rebase')?.status, 'DANGEROUS');

  for (const capability of inventory.capabilities.filter((entry: any) => entry.domain === 'git')) {
    assert.notEqual(capability.recommendedDisposition, 'FREE_SHELL');
    assert.notEqual(capability.integrationSlot, 'shell.arbitrary');
  }
});

test('intake #177 extends existing waves with residual blueprints and does not auto-promote implementation work', async () => {
  const program = JSON.parse(
    await readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  );
  const byId = new Map(program.taskBlueprints.map((entry: any) => [entry.id, entry]));

  const residualIds = [
    'TB-W3-GGCC-GIT-READ',
    'TB-W3-GGCC-GIT-SYNC',
    'TB-W3-GGCC-GIT-BRANCH-COMMIT',
    'TB-W3-GGCC-GIT-INTEGRATION-RECOVERY',
    'TB-W3-GGCC-GIT-REMOTE-WORKTREE',
    'TB-W3-GGCC-GH-REPO-BRANCH',
    'TB-W3-GGCC-GH-COMMIT-FILE',
    'TB-W3-GGCC-GH-PR-REVIEW',
    'TB-W3-GGCC-GH-ACTIONS',
    'TB-W3-GGCC-GH-RULESETS',
    'TB-W3-GGCC-GH-WEBHOOKS',
    'TB-W3-GGCC-GH-ENV-VARS-SECRETS',
    'TB-W3-GGCC-GH-RELEASES-DEPLOYMENTS',
    'TB-W3-GGCC-GH-ISSUES-PROJECTS',
    'TB-W3-GGCC-GH-ORG',
    'TB-W4-GGCC-AUDIT',
    'TB-W4-GGCC-E2E',
    'TB-M-GGCC-GIT-MAINTENANCE',
    'TB-COND-GIT-HISTORY-REWRITE'
  ];

  for (const id of residualIds) {
    assert.ok(byId.has(id), `missing residual blueprint ${id}`);
  }

  const readyW3 = program.taskBlueprints
    .filter((entry: any) => entry.waveId === 'W3' && entry.readiness?.state === 'READY')
    .map((entry: any) => entry.id)
    .sort();

  assert.deepEqual(readyW3, [
    'TB-W3-A22-01',
    'TB-W3-A3-01',
    'TB-W3-B3-01',
    'TB-W3-C1-01'
  ].sort());

  for (const id of residualIds) {
    const state = byId.get(id)?.readiness?.state;
    assert.ok(['BLOCKED','DEFERRED','CONDITIONAL'].includes(state), `${id} unexpectedly auto-promoted to ${state}`);
    assert.equal(byId.get(id)?.materialization?.createsRuntimeTask, false);
  }
});

test('forbidden generic escape hatches remain forbidden by the intake convergence', async () => {
  const inventory = JSON.parse(await readFile(INVENTORY_PATH, 'utf8'));
  assert.deepEqual(inventory.forbiddenEscapeHatches.sort(), [
    'exec(command)',
    'git_execute(command)',
    'github_api(method,url,body)',
    'run_git(args[])',
    'shell(command)'
  ].sort());
  assert.equal(inventory.invariants.noFreeShell, true);
  assert.equal(inventory.invariants.noRawGithubApi, true);
  assert.equal(inventory.invariants.noSecretRead, true);
  assert.equal(inventory.invariants.noParallelAuthority, true);
});
