import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  deriveProgramReadiness,
  evaluateHumanGateAdmissibility,
  selectProgramCandidates,
  validateProgramBacklogConvergence
} from '../scripts/program-backlog-convergence-lib.mjs';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const SELF_PROJECTION = 'docs/governance/program-backlog-convergence.json';

async function loadProgram() {
  return JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
}

function intake(program: any, issue: number) {
  return (program.programIntakes ?? []).find((entry: any) => entry.issue === issue);
}

test('intake #220 records the owner B3.2 decision and releases TB-W3-B3-02 to derived readiness', async () => {
  const program = await loadProgram();
  const entry = intake(program, 220);
  const gate = program.w3B3TargetSelectionGate;
  const blueprint = program.taskBlueprints.find((item: any) => item.id === 'TB-W3-B3-02');

  assert.equal(entry?.integrationVerdict, 'ACCEPT');
  assert.deepEqual(entry?.targetBlueprintIds, ['TB-W3-B3-02']);
  assert.equal(entry?.createsParallelProgram, false);
  assert.equal(entry?.createsRuntimeTasks, false);
  assert.equal(entry?.authorizesRuntimeMutation, false);

  assert.equal(gate?.status, 'OWNER_DECISION_RECORDED');
  assert.equal(gate?.decision?.option, 'OPERATOR_CONFIGURED_SERVER_TARGET');
  assert.equal(gate?.decision?.source, 'issue:220');
  assert.equal(gate?.decision?.scope, 'FIRST_ADDITIVE_MINIMAL_REVERSIBLE_BACKWARD_COMPATIBLE_V1');
  assert.equal(gate?.decision?.freezesSingleProjectPerServer, false);
  assert.equal(gate?.decision?.extensionPath, 'MULTI_PROJECT_LIVE_STATE');
  assert.equal(gate?.decision?.absentTargetProjectKeepsHistoricalBehavior, true);
  for (const invariant of [
    'TARGET_SCOPE_IS_IDENTITY_AND_OWNERSHIP_ONLY',
    'TARGET_SCOPE_NEVER_GRANTS_WRITE_DEPLOY_OR_SHA_AUTHORITY',
    'ABSENT_TARGET_SCOPE_KEEPS_HISTORICAL_SINGLE_REPOSITORY_MEANING',
    'GITREGISTRY_V2_REMAINS_PROJECT_COMPONENT_AUTHORITY',
    'NO_AGENT_SUPPLIED_UNREGISTERED_SCOPE',
    'NO_ACTIVATION_FROM_MISSING_EVIDENCE'
  ]) {
    assert.ok(gate.invariantsWhateverTheChoice.includes(invariant), invariant);
  }

  assert.ok(['READY', 'DONE'].includes(blueprint?.readiness?.state));
  assert.notEqual(blueprint?.readiness?.autoPromotable, false);
  assert.ok((blueprint?.readiness?.requiredExplicitGates ?? []).length === 0);
  assert.equal(blueprint?.materialization?.createsRuntimeTask, false);
  assert.equal(
    program.executionModel.currentReadyBlueprintIds.includes('TB-W3-B3-02'),
    blueprint.readiness.state === 'READY'
  );
  assert.ok(
    blueprint.greenAcceptance.some((line: string) => /MULTI_PROJECT_LIVE_STATE/.test(line)),
    'B3.2 acceptance must keep the multi-project extension path open'
  );
  assert.ok(
    blueprint.greenAcceptance.some((line: string) => /historical single-repository behaviour/.test(line)),
    'B3.2 acceptance must prove backward compatibility'
  );
});

test('intake #221 forbids self-created human gates and is machine-checked by the existing program lib', async () => {
  const program = await loadProgram();
  const entry = intake(program, 221);
  const policy = program.executionModel?.humanGatePolicy;

  assert.equal(entry?.integrationVerdict, 'ACCEPT');
  assert.equal(entry?.createsParallelProgram, false);
  assert.equal(entry?.createsRuntimeTasks, false);
  assert.equal(policy?.invariant, 'NO_SELF_CREATED_HUMAN_GATE_FOR_DEDUCIBLE_TECHNICAL_DECISIONS');
  assert.equal(policy?.principle, 'HUMAN_GATE_EXISTING != AGENT_MAY_CREATE_HUMAN_GATE');
  assert.equal(policy?.humanGateRequiresPreexistingAuthoritySource, true);
  assert.equal(policy?.localBlockerNotGlobalStop, true);
  assert.equal(policy?.createsRuntimeTask, false);
  assert.equal(policy?.grantsPermission, false);
  assert.equal(policy?.parallelDecisionEngine, false);
  assert.deepEqual(policy?.selfReferencesAreNotAuthority, [SELF_PROJECTION]);

  const guardedGateIds = new Set<string>();
  for (const blueprint of program.taskBlueprints) {
    for (const gateId of blueprint.readiness?.requiredExplicitGates ?? []) guardedGateIds.add(gateId);
  }
  for (const gateId of guardedGateIds) {
    const gate = policy.gateCatalog?.[gateId];
    assert.ok(gate, `gate ${gateId} must be catalogued`);
    const verdict = evaluateHumanGateAdmissibility({ id: gateId, ...gate }, policy);
    assert.ok(
      ['HUMAN_GATE', 'FAIL_CLOSED_HUMAN_GATE', 'EVIDENCE_GATE'].includes(verdict.verdict),
      `${gateId}: ${verdict.verdict}/${verdict.reasonCode}`
    );
  }

  const validation = validateProgramBacklogConvergence({
    projection: program,
    todo: await readFile('TODO.md', 'utf8'),
    roadmap: await readFile('ROADMAP.md', 'utf8'),
    gwc: JSON.parse(await readFile('.mcp/gwc-blueprints.json', 'utf8')),
    taskRegistry: JSON.parse(await readFile('.mcp/task-registry.json', 'utf8'))
  });
  assert.deepEqual(validation.uncataloguedGates, []);
  assert.deepEqual(validation.inadmissibleHumanGates, []);
});

test('a deducible technical choice never becomes a human gate; real human gates stay blocking', async () => {
  const program = await loadProgram();
  const policy = program.executionModel.humanGatePolicy;

  const deducible = evaluateHumanGateAdmissibility({
    id: 'OWNER_DECISION_TECHNICAL_OPTION',
    kind: 'HUMAN_DECISION',
    admissibleCondition: 'EQUIVALENT_SOLUTIONS_CHANGE_UNDEFINED_OWNER_POLICY',
    authoritySources: ['DECISIONS_LOG.md'],
    deducibleCompliantSolution: true
  }, policy);
  assert.equal(deducible.verdict, 'AUTO_DECIDE');
  assert.equal(deducible.reasonCode, 'DEDUCIBLE_TECHNICAL_DECISION');

  const selfCreated = evaluateHumanGateAdmissibility({
    id: 'OWNER_DECISION_REQUIRED',
    kind: 'HUMAN_DECISION',
    admissibleCondition: 'PREEXISTING_AUTHORITY_RESERVES_DECISION',
    authoritySources: [SELF_PROJECTION]
  }, policy);
  assert.equal(selfCreated.verdict, 'INADMISSIBLE');
  assert.equal(selfCreated.reasonCode, 'SELF_CREATED_HUMAN_GATE');

  const unsourced = evaluateHumanGateAdmissibility({
    id: 'OWNER_DECISION_REQUIRED',
    kind: 'HUMAN_DECISION'
  }, policy);
  assert.equal(unsourced.verdict, 'INADMISSIBLE');

  const reserved = evaluateHumanGateAdmissibility({
    id: 'EXPLICIT_GO_WRITE_GATE_ENFORCE',
    ...policy.gateCatalog.EXPLICIT_GO_WRITE_GATE_ENFORCE
  }, policy);
  assert.equal(reserved.verdict, 'HUMAN_GATE');

  const destructive = evaluateHumanGateAdmissibility({
    id: 'EXPLICIT_HUMAN_GATE',
    ...policy.gateCatalog.EXPLICIT_HUMAN_GATE,
    deducibleCompliantSolution: true
  }, policy);
  assert.equal(destructive.verdict, 'HUMAN_GATE', 'destructive/irreversible gates are never auto-decided');

  const contradiction = evaluateHumanGateAdmissibility({
    id: 'CONTRADICTORY_AUTHORITIES',
    kind: 'HUMAN_DECISION',
    admissibleCondition: 'UNRESOLVABLE_SAME_RANK_AUTHORITY_CONTRADICTION',
    authoritySources: ['DECISIONS_LOG.md', 'ARCHITECTURE.md']
  }, policy);
  assert.equal(contradiction.verdict, 'FAIL_CLOSED_HUMAN_GATE');

  for (const verdict of [deducible, selfCreated, reserved, contradiction]) {
    assert.equal(verdict.createsRuntimeTask, false);
    assert.equal(verdict.grantsPermission, false);
  }
});

test('an agent annotation cannot promote a self-created owner gate into a valid guarded blueprint', async () => {
  const program = await loadProgram();
  const copy = structuredClone(program);
  const target = copy.taskBlueprints.find((item: any) => item.id === 'TB-W3-C3-01');
  target.readiness = {
    state: 'CONDITIONAL',
    autoPromotable: false,
    requiredExplicitGates: ['OWNER_DECISION_AGENT_INVENTED'],
    reason: 'agent annotation'
  };
  copy.executionModel.humanGatePolicy.gateCatalog.OWNER_DECISION_AGENT_INVENTED = {
    kind: 'HUMAN_DECISION',
    admissibleCondition: 'PREEXISTING_AUTHORITY_RESERVES_DECISION',
    authoritySources: [SELF_PROJECTION]
  };

  const validation = validateProgramBacklogConvergence({
    projection: copy,
    todo: await readFile('TODO.md', 'utf8'),
    roadmap: await readFile('ROADMAP.md', 'utf8'),
    gwc: JSON.parse(await readFile('.mcp/gwc-blueprints.json', 'utf8')),
    taskRegistry: JSON.parse(await readFile('.mcp/task-registry.json', 'utf8'))
  });
  assert.equal(validation.ok, false);
  assert.deepEqual(validation.inadmissibleHumanGates, [{
    id: 'TB-W3-C3-01',
    gateId: 'OWNER_DECISION_AGENT_INVENTED',
    verdict: 'INADMISSIBLE',
    reasonCode: 'SELF_CREATED_HUMAN_GATE'
  }]);

  delete copy.executionModel.humanGatePolicy.gateCatalog.OWNER_DECISION_AGENT_INVENTED;
  const uncatalogued = validateProgramBacklogConvergence({
    projection: copy,
    todo: await readFile('TODO.md', 'utf8'),
    roadmap: await readFile('ROADMAP.md', 'utf8'),
    gwc: JSON.parse(await readFile('.mcp/gwc-blueprints.json', 'utf8')),
    taskRegistry: JSON.parse(await readFile('.mcp/task-registry.json', 'utf8'))
  });
  assert.deepEqual(uncatalogued.uncataloguedGates, [
    { id: 'TB-W3-C3-01', gateId: 'OWNER_DECISION_AGENT_INVENTED' }
  ]);
});

test('a local blocker never stops the program while another collision-free candidate exists', async () => {
  const program = await loadProgram();
  const copy = structuredClone(program);
  const blocked = structuredClone(copy.taskBlueprints.find((item: any) => item.id === 'TB-W3-B3-02'));
  blocked.id = 'TB-TEST-LOCALLY-BLOCKED';
  blocked.dependsOn = [];
  blocked.readiness = {
    state: 'CONDITIONAL',
    autoPromotable: false,
    requiredExplicitGates: ['EXPLICIT_GO_WRITE_GATE_ENFORCE'],
    reason: 'local blocker simulation'
  };
  const compatible = structuredClone(blocked);
  compatible.id = 'TB-TEST-COMPATIBLE';
  compatible.collisionDomains = ['test:compatible'];
  compatible.readiness = { state: 'BLOCKED', reason: 'derived' };
  copy.taskBlueprints.push(blocked, compatible);
  const selection = selectProgramCandidates(copy);
  const derived = deriveProgramReadiness(copy);

  assert.equal(selection.candidates.some((entry: any) => entry.id === 'TB-TEST-LOCALLY-BLOCKED'), false);
  assert.ok(
    selection.candidates.some((entry: any) => entry.id === 'TB-TEST-COMPATIBLE'),
    'another compatible candidate must remain selectable'
  );
  assert.equal(selection.canClaim, false);
  assert.equal(selection.canMutate, false);
  assert.equal(derived.createsRuntimeTasks, false);
  assert.equal(derived.runtimeSideEffects, false);
});

test('intake #222 maps the dispatch loop onto existing owners and sequences it after B3.2', async () => {
  const program = await loadProgram();
  const entry = intake(program, 222);
  const workItem = program.workItems.find((item: any) => item.id === 'PB-DISPATCH');
  const ids = program.taskBlueprints.map((item: any) => item.id);

  assert.equal(entry?.integrationVerdict, 'ACCEPT_WITH_ADAPTATION');
  assert.equal(entry?.createsParallelProgram, false);
  assert.equal(entry?.createsRuntimeTasks, false);
  assert.deepEqual(entry?.targetBlueprintIds, ['TB-W3-DISPATCH-01', 'TB-W3-DISPATCH-02', 'TB-W3-DISPATCH-03']);
  for (const section of ['existing', 'partial', 'gapsClosed', 'deferred']) {
    assert.ok(Array.isArray(entry?.architectureMapping?.[section]) && entry.architectureMapping[section].length > 0, section);
  }
  assert.ok(entry.architectureMapping.existing.some((item: any) => item.component === 'mcp_claim_next_governed_task'));
  assert.ok(entry.architectureMapping.partial.some((item: any) => item.component === 'mcp_reconcile_agent_intent'));

  assert.equal(workItem?.integrationSlot, 'orchestration.autonomous-dispatch-loop');
  assert.equal(workItem?.implementationMode, 'EXTEND');
  assert.ok(workItem.existingAuthorities.includes('Governed Task Queue'));

  const b32 = ids.indexOf('TB-W3-B3-02');
  assert.deepEqual(ids.slice(b32 + 1, b32 + 4), ['TB-W3-DISPATCH-01', 'TB-W3-DISPATCH-02', 'TB-W3-DISPATCH-03']);
  const byId = new Map(program.taskBlueprints.map((item: any) => [item.id, item]));
  const dispatch = ['TB-W3-DISPATCH-01', 'TB-W3-DISPATCH-02', 'TB-W3-DISPATCH-03'].map((id) => byId.get(id) as any);
  assert.deepEqual(dispatch[0].dependsOn, ['TB-W3-B3-02']);
  assert.deepEqual(dispatch[1].dependsOn, ['TB-W3-DISPATCH-01']);
  assert.deepEqual(dispatch[2].dependsOn, ['TB-W3-DISPATCH-02']);
  for (const blueprint of dispatch) {
    assert.equal(blueprint.workItemId, 'PB-DISPATCH');
    assert.ok(['BLOCKED', 'READY', 'DONE'].includes(blueprint.readiness.state));
    assert.ok((blueprint.readiness.requiredExplicitGates ?? []).length === 0);
    assert.deepEqual(blueprint.collisionDomains, ['orchestration:task-dispatch']);
    assert.equal(blueprint.materialization.createsRuntimeTask, false);
    assert.deepEqual(blueprint.writeAuthorities, []);
  }
  assert.ok(
    dispatch[0].greenAcceptance.some((line: string) => /never.*(BLOCKED|DEFERRED|CONDITIONAL)/.test(line)),
    'materialization must refuse guarded or blocked blueprints'
  );

  const copy = structuredClone(program);
  const copyById = new Map(copy.taskBlueprints.map((item: any) => [item.id, item]));
  (copyById.get('TB-W3-B3-02') as any).readiness.state = 'DONE';
  (copyById.get('TB-W3-C1-01') as any).readiness.state = 'DONE';
  (copyById.get('TB-W3-C3-01') as any).readiness = { state: 'BLOCKED', reason: 'reset for ordering check' };
  (copyById.get('TB-W3-DISPATCH-01') as any).readiness = { state: 'BLOCKED', reason: 'reset for ordering check' };
  const afterB32 = deriveProgramReadiness(copy).readyBlueprintIds;
  assert.ok(afterB32.indexOf('TB-W3-DISPATCH-01') >= 0);
  assert.ok(afterB32.indexOf('TB-W3-DISPATCH-01') < afterB32.indexOf('TB-W3-C3-01'));
});

test('the #219 supervision reobserve gap is classified and closed in the existing handoff contract', async () => {
  const program = await loadProgram();
  const supervision = (program.programIntakes ?? []).find((entry: any) => entry.id === 'SUPERVISION-219-20261002');
  const claude = await readFile('CLAUDE.md', 'utf8');

  assert.equal(supervision?.classification, 'ENROLMENT_WAKE_REOBSERVE_GAP');
  assert.equal(supervision?.createsRuntimeTasks, false);
  assert.ok(Array.isArray(supervision?.evidence) && supervision.evidence.length > 0);
  const steps = program.agentHandoffContract.steps;
  assert.equal(steps[steps.indexOf('REOBSERVE_MAIN') + 1], 'REOBSERVE_PROGRAM_INTAKES');
  assert.match(program.agentHandoffContract.programIntakeDiscovery ?? '', /\[PROGRAM INTAKE\]/);
  assert.match(claude, /\[PROGRAM INTAKE\]/);
  assert.match(claude, /NO_SELF_CREATED_HUMAN_GATE_FOR_DEDUCIBLE_TECHNICAL_DECISIONS/);
});

test('mcp:write enforcement is a deducible technical lot sequenced after A3.2, never an owner gate', async () => {
  const program = await loadProgram();
  const workItem = program.workItems.find((item: any) => item.id === 'PB-OAUTH-WRITE-SCOPE');
  const blueprint = program.taskBlueprints.find((item: any) => item.id === 'TB-W3-OAUTH-WRITE-SCOPE-01');

  assert.equal(workItem?.integrationSlot, 'connection.oauth-write-scope-enforcement');
  assert.deepEqual(blueprint?.dependsOn, ['TB-W3-A3-02']);
  assert.ok(['BLOCKED', 'READY', 'DONE'].includes(blueprint?.readiness?.state));
  assert.ok((blueprint?.readiness?.requiredExplicitGates ?? []).length === 0);
  assert.equal(blueprint?.materialization?.createsRuntimeTask, false);
  assert.ok(blueprint.redTests.some((line: string) => /inventory/i.test(line)));
});
