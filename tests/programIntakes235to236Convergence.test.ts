import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  deriveProgramReadiness,
  extractRoadmapProgramHeadings,
  validateProgramBacklogConvergence
} from '../scripts/program-backlog-convergence-lib.mjs';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const INVENTORY_PATH = 'docs/governance/super-admin-cockpit-convergence-20261004.json';
const FINAL_ID = 'TB-W4-MCP-FINAL-ACCEPTANCE';
const K_IDS = Array.from({ length: 12 }, (_, index) => `TB-W4-K-${String(index + 1).padStart(2, '0')}`);

// Intake #235 §21: what an agent must leave durably when it stops globally.
const STOP_REPORT_FIELDS = [
  'CURRENT_HEAD',
  'CURRENT_PROGRAM_STATE',
  'WORK_COMPLETED_THIS_RUN',
  'READY_CANDIDATES',
  'BLOCKED_CANDIDATES',
  'OWNED_WORK',
  'OBSERVED_SESSIONS',
  'OBSERVED_CLAIMS',
  'OBSERVED_LOCKS',
  'COLLISION_DOMAINS',
  'CI_STATE',
  'DEPLOY_STATE',
  'EXACT_BLOCKER',
  'BLOCKER_AUTHORITY',
  'WHY_NO_OTHER_COMPATIBLE_WORK_EXISTS',
  'HUMAN_ACTION_REQUIRED',
  'NEXT_ACTION'
];

// Intake #236 §44: the first durable output after consuming the cockpit intake.
const COCKPIT_CONVERGENCE_FIELDS = [
  'CURRENT_HEAD',
  'CURRENT_PROGRAM_STATE',
  'EXISTING_FRONTEND_SURFACE',
  'EXISTING_UI_STACK',
  'EXISTING_API_PROJECTIONS',
  'EXISTING_I1_I2_I3_COMPONENTS',
  'REUSABLE_COMPONENTS',
  'MISSING_COCKPIT_CAPABILITIES',
  'BACKEND_DEPENDENCIES',
  'FRONTEND_INDEPENDENT_WORK',
  'PROPOSED_INTEGRATION_SLOTS',
  'COLLISION_DOMAINS',
  'PROGRAM_BLUEPRINTS_ADDED_OR_UPDATED',
  'READINESS',
  'TEST_STRATEGY',
  'DEPLOYMENT_TARGET_IF_KNOWN',
  'NEXT_EXECUTABLE_ACTION'
];

async function loadProgram() {
  return JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
}

async function validate(projection: any) {
  return validateProgramBacklogConvergence({
    projection,
    todo: await readFile('TODO.md', 'utf8'),
    roadmap: await readFile('ROADMAP.md', 'utf8'),
    gwc: JSON.parse(await readFile('.mcp/gwc-evolution-design.json', 'utf8')),
    taskRegistry: JSON.parse(await readFile('.mcp/task-registry.json', 'utf8'))
  });
}

function intake(program: any, issue: number) {
  return (program.programIntakes ?? []).find((entry: any) => entry.issue === issue);
}

function isGuarded(blueprint: any): boolean {
  return blueprint.readiness?.state !== 'DONE' && (
    ['CONDITIONAL', 'DEFERRED'].includes(blueprint.readiness?.state)
    || blueprint.readiness?.autoPromotable === false
  );
}

function ancestors(program: any, id: string): Set<string> {
  const byId = new Map(program.taskBlueprints.map((entry: any) => [entry.id, entry]));
  const seen = new Set<string>();
  const pending = [...((byId.get(id) as any)?.dependsOn ?? [])];
  while (pending.length > 0) {
    const next = pending.pop() as string;
    if (seen.has(next)) continue;
    seen.add(next);
    pending.push(...((byId.get(next) as any)?.dependsOn ?? []));
  }
  return seen;
}

test('intake #235 reinforces PROGRAM_AUTO_CONTINUE without a second loop and wires a terminal acceptance', async () => {
  const program = await loadProgram();
  const entry = intake(program, 235);

  assert.equal(entry?.id, 'INTAKE-235');
  assert.equal(entry?.integrationVerdict, 'ACCEPT_WITH_ADAPTATION');
  assert.equal(entry?.createsParallelProgram, false);
  assert.equal(entry?.createsSecondOrchestrationLoop, false);
  assert.equal(entry?.createsRuntimeTasks, false);
  assert.equal(entry?.authorizesRuntimeMutation, false);
  assert.match(entry?.observedMainSha ?? '', /^[0-9a-f]{40}$/);
  assert.deepEqual(entry?.targetBlueprintIds, [FINAL_ID]);

  // Every directive section maps onto an existing authority or one bounded complement.
  const sections = entry?.sectionMapping ?? [];
  assert.equal(sections.length, 22);
  for (const section of sections) {
    assert.ok(['DUPLICATE', 'COMPLEMENT'].includes(section.classification), JSON.stringify(section));
    assert.ok(typeof section.authority === 'string' && section.authority.length > 0, JSON.stringify(section));
  }
  const complements = sections
    .filter((section: any) => section.classification === 'COMPLEMENT')
    .map((section: any) => section.section);
  assert.deepEqual(complements, ['§16', '§21', '§22']);

  const workItem = program.workItems.find((item: any) => item.id === 'PB-MCP-TERMINAL');
  assert.equal(workItem?.integrationSlot, 'program.global-terminal-acceptance');
  assert.equal(workItem?.implementationMode, 'COMPOSE');
  assert.ok(program.sourceCoverage.programIntakes.some(
    (source: any) => source.sourceKey === 'issue:235' && source.coveredBy === 'PB-MCP-TERMINAL'
  ));
});

test('the global terminal acceptance is anchored to every mandatory blueprint and to no guarded one', async () => {
  const program = await loadProgram();
  const final = program.taskBlueprints.find((item: any) => item.id === FINAL_ID);
  const terminal = program.executionModel?.terminalCondition;

  assert.equal(final?.workItemId, 'PB-MCP-TERMINAL');
  assert.equal(final?.waveId, 'W4');
  assert.ok(['BLOCKED', 'READY', 'DONE'].includes(final?.readiness?.state));
  assert.equal(isGuarded(final), false);
  assert.ok((final.readiness.requiredExplicitGates ?? []).length === 0);
  assert.equal(final.materialization.createsRuntimeTask, false);
  assert.deepEqual(final.writeAuthorities, []);

  assert.equal(terminal?.declaration, 'GLOBAL_MCP_COMPLETE');
  assert.equal(terminal?.globalAcceptanceBlueprintId, FINAL_ID);
  assert.equal(terminal?.declaredAutomatically, false);
  assert.equal(terminal?.guardedBlueprintsBlockCompletion, false);
  assert.deepEqual(
    terminal?.dimensions?.map((dimension: any) => dimension.id),
    ['BACKEND_CONTROL_PLANE_ACCEPTANCE', 'CLIENT_CERTIFICATIONS', 'COCKPIT_ACCEPTANCE', 'GLOBAL_MCP_ACCEPTANCE']
  );
  const byDimension = new Map(terminal.dimensions.map((dimension: any) => [dimension.id, dimension.provenBy]));
  assert.deepEqual(byDimension.get('CLIENT_CERTIFICATIONS'), ['TB-W4-J1-01', 'TB-W4-J2-01']);
  assert.deepEqual(byDimension.get('COCKPIT_ACCEPTANCE'), ['TB-W4-K-12']);
  assert.deepEqual(byDimension.get('GLOBAL_MCP_ACCEPTANCE'), [FINAL_ID]);
  for (const id of ['TB-W3-F-05', 'TB-W4-GGCC-E2E', 'TB-W4-I3-01', 'TB-W3-OAUTH-WRITE-SCOPE-01']) {
    assert.ok((byDimension.get('BACKEND_CONTROL_PLANE_ACCEPTANCE') as string[]).includes(id), id);
  }
  for (const dimension of terminal.dimensions.slice(0, 3)) {
    for (const id of dimension.provenBy) assert.ok(final.dependsOn.includes(id), `${dimension.id}: ${id}`);
  }
  assert.equal(terminal.successCriteria.length, 13);

  // Independent recomputation of the machine check below.
  const anchored = ancestors(program, FINAL_ID);
  for (const blueprint of program.taskBlueprints) {
    if (blueprint.id === FINAL_ID || blueprint.readiness.state === 'DONE') continue;
    if (isGuarded(blueprint)) {
      assert.equal(anchored.has(blueprint.id), false, `${blueprint.id} is guarded and must not gate completion`);
    } else {
      assert.ok(anchored.has(blueprint.id), `${blueprint.id} must be an ancestor of ${FINAL_ID}`);
    }
  }

  const validation = await validate(program);
  assert.deepEqual(validation.terminalAcceptanceGaps, []);
  assert.equal(validation.ok, true, JSON.stringify(validation, null, 2));
});

test('the program lib fails closed when mandatory work escapes or a guarded lot gates the terminal acceptance', async () => {
  const program = await loadProgram();

  const orphan = structuredClone(program);
  const template = structuredClone(orphan.taskBlueprints.find((item: any) => item.id === 'TB-W3-C4-01'));
  orphan.taskBlueprints.push({
    ...template,
    id: 'TB-TEST-ORPHAN-MANDATORY',
    dependsOn: [],
    collisionDomains: ['test:orphan'],
    readiness: { state: 'READY', reason: 'test' }
  });
  assert.deepEqual((await validate(orphan)).terminalAcceptanceGaps, [
    { id: 'TB-TEST-ORPHAN-MANDATORY', reasonCode: 'NOT_ANCESTOR_OF_TERMINAL_ACCEPTANCE' }
  ]);

  const guarded = structuredClone(orphan);
  guarded.taskBlueprints.find((item: any) => item.id === 'TB-TEST-ORPHAN-MANDATORY').readiness = {
    state: 'CONDITIONAL',
    autoPromotable: false,
    requiredExplicitGates: ['EXPLICIT_GO_WRITE_GATE_ENFORCE'],
    reason: 'test'
  };
  assert.deepEqual((await validate(guarded)).terminalAcceptanceGaps, []);

  const gating = structuredClone(guarded);
  gating.taskBlueprints.find((item: any) => item.id === FINAL_ID).dependsOn.push('TB-TEST-ORPHAN-MANDATORY');
  assert.deepEqual((await validate(gating)).terminalAcceptanceGaps, [
    { id: 'TB-TEST-ORPHAN-MANDATORY', reasonCode: 'GUARDED_BLUEPRINT_BLOCKS_TERMINAL_ACCEPTANCE' }
  ]);

  const missing = structuredClone(program);
  missing.taskBlueprints = missing.taskBlueprints.filter((item: any) => item.id !== FINAL_ID);
  assert.deepEqual((await validate(missing)).terminalAcceptanceGaps, [
    { id: FINAL_ID, reasonCode: 'TERMINAL_ACCEPTANCE_BLUEPRINT_MISSING' }
  ]);
});

test('the global stop report carries every #235 field and refines the existing stop policy', async () => {
  const program = await loadProgram();
  const report = program.agentHandoffContract?.globalStopReport;

  assert.deepEqual(report?.requiredFields, STOP_REPORT_FIELDS);
  assert.equal(report?.source, 'issue:235');
  assert.equal(report?.refines, 'executionModel.humanGatePolicy.globalStopOnlyWhen');
  assert.equal(report?.humanActionRequiredOnlyIfTrulyRequired, true);
  assert.equal(report?.bareBlockedStatusIsInsufficient, true);
  assert.equal(report?.allowedStopConditions?.length, 7);
  assert.ok(report.durableLocations.includes('SUIVI.md'));
  assert.deepEqual(
    program.executionModel.humanGatePolicy.globalStopOnlyWhen,
    ['NO_COMPATIBLE_WORK_ITEM', 'GLOBAL_AUTHORITY_REQUIRES_STOP']
  );
});

test('intake #236 converges into PB-K without a parallel backlog, authority or frontend stack', async () => {
  const program = await loadProgram();
  const entry = intake(program, 236);
  const workItem = program.workItems.find((item: any) => item.id === 'PB-K');
  const byId = new Map(program.taskBlueprints.map((item: any) => [item.id, item]));

  assert.equal(entry?.id, 'INTAKE-236');
  assert.equal(entry?.integrationVerdict, 'ACCEPT_WITH_ADAPTATION');
  assert.equal(entry?.createsParallelProgram, false);
  assert.equal(entry?.createsRuntimeTasks, false);
  assert.equal(entry?.authorizesRuntimeMutation, false);
  assert.equal(entry?.inventoryPath, INVENTORY_PATH);
  assert.deepEqual(entry?.targetBlueprintIds, K_IDS);
  assert.ok(entry?.readyBlueprintIdsAtConvergence?.includes('TB-W4-K-01'));
  assert.ok(program.sourceCoverage.programIntakes.some(
    (source: any) => source.sourceKey === 'issue:236' && source.coveredBy === 'PB-K'
  ));

  assert.equal(workItem?.integrationSlot, 'cockpit.super-admin');
  assert.equal(workItem?.implementationMode, 'EXTEND');
  for (const invariant of [
    'UI_VISIBILITY != CALLABLE != AUTHORIZED != SAFE_NOW',
    'SUPER_ADMIN_UI_NEVER_BYPASSES_GOVERNANCE',
    'NO_PARALLEL_AUTHORITY_OR_STORE',
    'SECRETS_WRITE_ONLY_NEVER_RENDERED',
    'UNKNOWN_NEVER_RENDERED_AS_OFFLINE_OR_INACTIVE'
  ]) {
    assert.ok(workItem.nonRegression.includes(invariant), invariant);
  }

  const kBlueprints = K_IDS.map((id) => byId.get(id) as any);
  const domains = new Set<string>();
  for (const blueprint of kBlueprints) {
    assert.ok(blueprint, 'missing cockpit blueprint');
    assert.equal(blueprint.workItemId, 'PB-K');
    assert.equal(blueprint.waveId, 'W4');
    assert.equal(blueprint.integrationSlot, 'cockpit.super-admin');
    assert.equal(blueprint.materialization.createsRuntimeTask, false);
    assert.deepEqual(blueprint.writeAuthorities, []);
    assert.equal(isGuarded(blueprint), false, blueprint.id);
    assert.ok(['BLOCKED', 'READY', 'DONE'].includes(blueprint.readiness.state), blueprint.id);
    assert.equal(blueprint.collisionDomains.length, 1);
    assert.match(blueprint.collisionDomains[0], /^cockpit:[a-z-]+$/);
    domains.add(blueprint.collisionDomains[0]);
  }
  assert.equal(domains.size, K_IDS.length, 'one collision domain per cockpit lot');

  // Shell, design system and read-only Command Center start on already DONE authorities.
  const k01 = byId.get('TB-W4-K-01') as any;
  for (const dependency of k01.dependsOn) assert.equal((byId.get(dependency) as any).readiness.state, 'DONE');
  assert.ok(['READY', 'DONE'].includes(k01.readiness.state));
  assert.ok(k01.greenAcceptance.some((line: string) => /UI_VISIBILITY != CALLABLE != AUTHORIZED != SAFE_NOW/.test(line)));
  const waveIds = program.executionModel.waves.map((wave: any) => wave.id);
  assert.ok(waveIds.indexOf('W4') > waveIds.indexOf('W3'), 'cockpit work never preempts W3 candidates');

  // Dependencies follow #236 §3: read-only views after their projections, WRITE after D2.
  const expectations: Array<[string, string[]]> = [
    ['TB-W4-K-05', ['TB-W3-C345-02', 'TB-W3-GGCC-GIT-READ']],
    ['TB-W4-K-06', ['TB-W3-C4-01']],
    ['TB-W4-K-07', ['TB-W3-D2-01', 'TB-W3-A3-02', 'TB-W3-OAUTH-WRITE-SCOPE-01']],
    ['TB-W4-K-08', ['TB-W4-K-07', 'TB-W3-D2-01', 'TB-W3-PRW-01', 'TB-W3-PRW-02']],
    ['TB-W4-K-09', ['TB-W4-K-08', 'TB-W4-GGCC-E2E']],
    ['TB-W4-K-10', ['TB-W4-K-08', 'TB-W3-E3-01', 'TB-W3-F-05']],
    ['TB-W4-K-11', ['TB-W4-H-03', 'TB-W4-I3-01', 'TB-W4-GGCC-AUDIT']]
  ];
  for (const [id, required] of expectations) {
    const set = ancestors(program, id);
    for (const dependency of required) assert.ok(set.has(dependency), `${id} must follow ${dependency}`);
  }
  for (const id of ['TB-W4-K-02', 'TB-W4-K-03', 'TB-W4-K-04', 'TB-W4-K-05', 'TB-W4-K-06', 'TB-W4-K-07', 'TB-W4-K-11']) {
    assert.equal(ancestors(program, id).has('TB-W4-K-08'), false, `${id} stays read-only`);
  }
  const k12 = byId.get('TB-W4-K-12') as any;
  assert.deepEqual([...k12.dependsOn].sort(), K_IDS.slice(1, 11));
  for (const journey of ['READ_ONLY', 'GOVERNED_WRITE', 'CONCURRENCY', 'HEAD_DRIFT', 'STALE_EVIDENCE', 'NEGATIVE_SECURITY', 'PROVISIONING']) {
    assert.ok(k12.greenAcceptance.some((line: string) => line.includes(journey)), journey);
  }
});

test('the cockpit convergence inventory carries every #236 §44 field grounded in the observed head', async () => {
  const program = await loadProgram();
  const entry = intake(program, 236);
  assert.ok(existsSync(INVENTORY_PATH), INVENTORY_PATH);
  const inventory = JSON.parse(await readFile(INVENTORY_PATH, 'utf8'));
  const serverSource = await readFile('src/server.ts', 'utf8');

  assert.equal(inventory.sourceIssue, 236);
  assert.equal(inventory.authority?.kind, 'DERIVED_NON_EXECUTABLE_PROJECTION');
  assert.equal(inventory.authority?.createsRuntimeTasks, false);
  assert.equal(inventory.authority?.createsParallelBacklog, false);
  assert.equal(inventory.authority?.replacesProgramBacklog, false);
  assert.deepEqual(Object.keys(inventory.convergence ?? {}), COCKPIT_CONVERGENCE_FIELDS);

  const convergence = inventory.convergence;
  assert.equal(convergence.CURRENT_HEAD.sha, entry.observedMainSha);
  assert.equal(convergence.EXISTING_UI_STACK.frontendFramework, null);
  assert.equal(convergence.EXISTING_UI_STACK.newStackIntroduced, false);
  for (const route of convergence.EXISTING_FRONTEND_SURFACE.routes) {
    if (route.source !== 'src/server.ts') continue;
    assert.ok(serverSource.includes(`'${route.path}'`), `route ${route.path} must exist in src/server.ts`);
  }
  for (const component of convergence.REUSABLE_COMPONENTS) {
    assert.ok(existsSync(component.path), `${component.name}: ${component.path}`);
  }
  for (const helper of convergence.EXISTING_UI_STACK.escapeHelpers) {
    const source = await readFile(helper.path, 'utf8');
    assert.ok(source.includes(helper.symbol), `${helper.path} must define ${helper.symbol}`);
  }

  const added = convergence.PROGRAM_BLUEPRINTS_ADDED_OR_UPDATED.map((item: any) => item.id);
  assert.deepEqual(added, [...K_IDS, FINAL_ID]);
  assert.deepEqual(
    convergence.COLLISION_DOMAINS.map((item: any) => item.blueprintId),
    K_IDS
  );
  assert.ok(convergence.READINESS.readyAtConvergence.includes('TB-W4-K-01'));
  assert.deepEqual(convergence.READINESS.readyAtConvergence, entry.readyBlueprintIdsAtConvergence);
  const next = convergence.NEXT_EXECUTABLE_ACTION;
  assert.ok(program.taskBlueprints.some((item: any) => item.id === next.blueprintId));
  assert.ok(convergence.READINESS.readyAtConvergence.includes(next.blueprintId));
  assert.equal(next.createsRuntimeTask, false);
});

test('roadmap, CLAUDE.md and decisions record the cockpit chantier and the terminal condition', async () => {
  const [roadmap, claude, decisions] = await Promise.all([
    readFile('ROADMAP.md', 'utf8'),
    readFile('CLAUDE.md', 'utf8'),
    readFile('DECISIONS_LOG.md', 'utf8')
  ]);
  const program = await loadProgram();

  assert.ok(extractRoadmapProgramHeadings(roadmap).includes('CHANTIER K — Super Admin Cockpit'));
  assert.ok(program.sourceCoverage.roadmap.some(
    (source: any) => source.heading === 'CHANTIER K — Super Admin Cockpit' && source.coveredBy === 'PB-K'
  ));
  assert.equal(program.summary.roadmapLots, program.sourceCoverage.roadmap.length);
  assert.equal(program.summary.workItems, program.workItems.length);

  assert.match(claude, /UI_VISIBILITY != CALLABLE != AUTHORIZED != SAFE_NOW/);
  assert.match(claude, /SUPER ADMIN UI ≠ BYPASS GOVERNANCE/);
  assert.match(claude, /GLOBAL_MCP_COMPLETE/);
  assert.match(claude, /globalStopReport/);
  assert.match(decisions, /#235/);
  assert.match(decisions, /#236/);

  const derived = deriveProgramReadiness(program);
  assert.deepEqual(derived.drift, []);
  assert.deepEqual(derived.storedReadyDrift, []);
});
