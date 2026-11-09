import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const GATE = 'OWNER_DECISION_B3_TARGET_PROJECT_SELECTION';

test('the recorded owner decision (#220) releases B3.2 to derived readiness', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-B3-02');

  assert.ok(['READY', 'DONE'].includes(blueprint?.readiness?.state));
  assert.ok((blueprint?.readiness?.requiredExplicitGates ?? []).length === 0);
  assert.equal(blueprint?.decisionSource, 'issue:220');
  assert.equal(blueprint?.materialization?.createsRuntimeTask, false);
});

test('the gate record cites the canonical open question, the options and the blocked dependents', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const gate = program.w3B3TargetSelectionGate;

  assert.equal(gate?.status, 'OWNER_DECISION_RECORDED');
  assert.equal(gate?.decision?.option, gate?.recommendedOption);
  assert.equal(gate?.gateId, GATE);
  assert.equal(gate?.blueprintId, 'TB-W3-B3-02');
  assert.equal(gate?.canonicalOpenQuestion?.path, 'docs/gwc/ARCHITECTURE_73_CONTRACTS.md');
  assert.match(gate?.canonicalOpenQuestion?.text ?? '', /B3 TargetScope migration/);

  const optionIds = (gate?.options ?? []).map((option: any) => option.id);
  assert.deepEqual(optionIds, [
    'OPERATOR_CONFIGURED_SERVER_TARGET',
    'MULTI_PROJECT_LIVE_STATE',
    'PER_SESSION_REGISTRY_RESOLUTION',
    'KEEP_SINGLE_REPOSITORY_TOOL_SURFACE'
  ]);
  for (const option of gate.options) {
    assert.ok(option.summary.length > 20, option.id);
    assert.ok(option.tradeOff.length > 20, option.id);
  }
  assert.ok(optionIds.includes(gate?.recommendedOption));

  for (const dependent of ['TB-W3-C3-01', 'TB-W3-GGCC-GIT-READ']) {
    assert.ok(gate.blockedDirectDependents.includes(dependent), dependent);
  }
  assert.ok(gate.invariantsWhateverTheChoice.includes('TARGET_SCOPE_IS_IDENTITY_AND_OWNERSHIP_ONLY'));
  assert.ok(gate.invariantsWhateverTheChoice.includes('ABSENT_TARGET_SCOPE_KEEPS_HISTORICAL_SINGLE_REPOSITORY_MEANING'));
  assert.equal(gate.runtimeTasksCreated, 0);
  assert.equal(gate.runtimeLocksCreated, 0);
});
