import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  deriveProgramReadiness,
  selectProgramCandidates
} from '../scripts/program-backlog-convergence-lib.mjs';

async function loadProgram() {
  return JSON.parse(
    await readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  );
}

test('program readiness is a deterministic derived projection over dependency completion', async () => {
  const program = await loadProgram();
  const derived = deriveProgramReadiness(program);

  assert.equal(derived.runtimeSideEffects, false);
  assert.equal(derived.createsRuntimeTasks, false);
  assert.equal(derived.authority, 'PROGRAM_BACKLOG_DERIVED_READINESS');
  assert.deepEqual(derived.drift, []);

  assert.deepEqual(
    derived.readyBlueprintIds,
    program.executionModel.currentReadyBlueprintIds
  );
});

test('completing a blueprint promotes only dependents whose full dependency set is DONE', async () => {
  const program = await loadProgram();
  const copy = structuredClone(program);
  const byId = new Map(copy.taskBlueprints.map((entry: any) => [entry.id, entry]));

  byId.get('TB-W3-B3-01').readiness.state = 'DONE';

  const derived = deriveProgramReadiness(copy);
  const stateById = new Map(derived.blueprints.map((entry: any) => [entry.id, entry.derivedState]));

  assert.equal(stateById.get('TB-W3-B3-02'), 'READY');
  assert.equal(stateById.get('TB-W3-GGCC-GIT-READ'), 'BLOCKED');
  assert.equal(stateById.get('TB-W3-C3-01'), 'BLOCKED');
});

test('intake #177 residuals follow the pre-177 backbone instead of creating a parallel execution lane', async () => {
  const program = await loadProgram();
  const byId = new Map(program.taskBlueprints.map((entry: any) => [entry.id, entry]));

  assert.deepEqual(byId.get('TB-W3-GGCC-GIT-READ')?.dependsOn, [
    'TB-W3-B3-02',
    'TB-W3-C1-01'
  ]);
  assert.ok(byId.get('TB-W3-GGCC-GH-REPO-BRANCH')?.dependsOn.includes('TB-W3-D2-01'));
  assert.ok(byId.get('TB-W4-GGCC-AUDIT')?.dependsOn.includes('TB-W4-H-03'));
  assert.ok(byId.get('TB-W4-GGCC-E2E')?.dependsOn.includes('TB-W4-GGCC-AUDIT'));

  const intake = program.programIntakes.find((entry: any) => entry.issue === 177);
  assert.equal(intake.createsParallelProgram, false);
  assert.equal(intake.createsRuntimeTasks, false);
});

test('conditional and deferred blueprints are never auto-promoted even when dependencies are DONE', async () => {
  const program = await loadProgram();
  const copy = structuredClone(program);

  for (const blueprint of copy.taskBlueprints) {
    if (blueprint.id === 'TB-COND-GIT-HISTORY-REWRITE') {
      for (const dep of blueprint.dependsOn) {
        const target = copy.taskBlueprints.find((entry: any) => entry.id === dep);
        if (target) target.readiness.state = 'DONE';
      }
    }
    if (blueprint.id === 'TB-M-GGCC-GIT-MAINTENANCE') {
      for (const dep of blueprint.dependsOn) {
        const target = copy.taskBlueprints.find((entry: any) => entry.id === dep);
        if (target) target.readiness.state = 'DONE';
      }
    }
  }

  const derived = deriveProgramReadiness(copy);
  const byId = new Map(derived.blueprints.map((entry: any) => [entry.id, entry]));

  assert.equal(byId.get('TB-COND-GIT-HISTORY-REWRITE')?.derivedState, 'CONDITIONAL');
  assert.equal(byId.get('TB-M-GGCC-GIT-MAINTENANCE')?.derivedState, 'DEFERRED');
});

test('candidate selection is stable, chronological and planning-only', async () => {
  const program = await loadProgram();
  const selection = selectProgramCandidates(program);

  assert.equal(selection.runtimeAuthorityConsulted, false);
  assert.equal(selection.canClaim, false);
  assert.equal(selection.canMutate, false);
  assert.equal(selection.requiresLiveCollisionCheck, true);
  assert.deepEqual(
    selection.candidates.map((entry: any) => entry.id),
    program.executionModel.currentReadyBlueprintIds
  );
});

test('the program declares an autonomous continuation contract without weakening runtime authority', async () => {
  const program = await loadProgram();
  const continuation = program.executionModel?.automaticContinuation;

  assert.equal(continuation?.enabled, true);
  assert.equal(continuation?.readinessMode, 'DERIVED_FROM_DEPENDENCIES');
  assert.equal(continuation?.selectionMode, 'FIRST_COLLISION_FREE_IN_PROGRAM_ORDER');
  assert.equal(continuation?.marksDoneAutomatically, false);
  assert.equal(continuation?.claimsAutomatically, false);
  assert.equal(continuation?.bypassesHumanGates, false);
  assert.equal(continuation?.stopOnlyOnGovernedBlocker, true);

  assert.deepEqual(program.agentHandoffContract?.loopAfterCheckpoint, [
    'RECOMPUTE_PROGRAM_READINESS',
    'REOBSERVE_RUNTIME_STATE_IF_REQUIRED',
    'SELECT_FIRST_COLLISION_FREE_READY_BLUEPRINT',
    'CONTINUE_OR_STOP_ON_GOVERNED_BLOCKER'
  ]);
});

test('repository bootstrap requires automatic readiness recomputation and continuation', async () => {
  const [claude, packageRaw] = await Promise.all([
    readFile('CLAUDE.md', 'utf8'),
    readFile('package.json', 'utf8')
  ]);
  const pkg = JSON.parse(packageRaw);

  assert.match(claude, /PROGRAM_AUTO_CONTINUE/);
  assert.match(claude, /program:readiness/);
  assert.match(claude, /FIRST_COLLISION_FREE_IN_PROGRAM_ORDER/);
  assert.match(claude, /ne demande pas.*continuer/i);

  assert.equal(pkg.scripts['program:readiness'], 'node scripts/program-backlog-readiness.mjs --check');
  assert.equal(pkg.scripts['program:readiness:write'], 'node scripts/program-backlog-readiness.mjs --write');
  assert.equal(pkg.scripts['program:next'], 'node scripts/program-backlog-readiness.mjs --next');
  assert.match(pkg.scripts['docs:check'], /program:readiness/);
});
