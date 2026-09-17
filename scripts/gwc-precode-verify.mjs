#!/usr/bin/env node
// Vérifie la fermeture d'architecture GWC avant tout code runtime.
// Lecture seule : aucun état runtime, Task Queue, serveur ou registre n'est muté.

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT = process.cwd();
const PLAN = path.join(ROOT, 'docs', 'gwc', 'PRECODE_EXECUTION_PLAN.txt');
const ACTION_FLOW = path.join(ROOT, 'docs', 'gwc', 'PRECODE_ACTION_TASK_FLOW.txt');
const ACTION_FLOW_PROJECTION = path.join(ROOT, '.mcp', 'gwc-precode-action-flow.json');
const GATE = path.join(ROOT, '.mcp', 'gwc-precode-gate.json');
const CONTRACTS = path.join(ROOT, '.mcp', 'gwc-contracts.json');
const BLUEPRINTS = path.join(ROOT, '.mcp', 'gwc-blueprints.json');
const DESIGN = path.join(ROOT, '.mcp', 'gwc-evolution-design.json');

function fail(errors, condition, message) {
  if (!condition) errors.push(message);
}

function occurrences(text, token) {
  return text.split(token).length - 1;
}

async function json(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

const [plan, actionFlow, actionProjection, gate, contracts, blueprints, design] = await Promise.all([
  readFile(PLAN, 'utf8'),
  readFile(ACTION_FLOW, 'utf8'),
  json(ACTION_FLOW_PROJECTION),
  json(GATE),
  json(CONTRACTS),
  json(BLUEPRINTS),
  json(DESIGN)
]);

const errors = [];
fail(errors, gate.schemaVersion === 1, 'precode gate schemaVersion doit valoir 1');
fail(errors, gate.revision === 'R3-PRECODE', 'precode gate revision doit valoir R3-PRECODE');
fail(errors, gate.source === 'docs/gwc/PRECODE_EXECUTION_PLAN.txt', 'source du precode gate inattendue');
fail(errors, gate.runtimeImplementation === 'NOT_STARTED', 'runtimeImplementation doit rester NOT_STARTED');
fail(errors, gate.taskQueueMaterialization === 'NOT_STARTED_REQUIRES_LIVE_RECONCILIATION',
  'Task Queue : la réconciliation live doit rester obligatoire');
fail(errors, gate.mainCanonicalization === 'PENDING_PR95_GOVERNED_MERGE',
  'la canonicalisation main ne doit pas être pré-déclarée');
fail(errors, gate.blueprintMaterializationRule.includes('ONLY_NEW_TASK'),
  'la règle Blueprint != Task / NEW_TASK manque');

for (const [field, required] of [
  ['architecturePhases', 14], ['contractDesignSheets', 73], ['contractExecutionProcedures', 73],
  ['evolutionDesigns', 18], ['blueprintExecutionProcedures', 18], ['transverseRegistries', 13],
  ['globalAudits', 4], ['e2eScenarios', 21]
]) {
  fail(errors, gate?.[field]?.required === required, `${field}.required doit valoir ${required}`);
  fail(errors, gate?.[field]?.satisfied === required, `${field}.satisfied doit valoir ${required}`);
}

fail(errors, Array.isArray(contracts.contracts) && contracts.contracts.length === 73,
  'registre contrats : 73 attendus');
fail(errors, Array.isArray(blueprints.blueprints) && blueprints.blueprints.length === 18,
  'registre blueprints : 18 attendus');
fail(errors, Array.isArray(design.entries) && design.entries.length === 18,
  'Detailed Evolution Designs : 18 attendus');
fail(errors, (design.transverseRegistries ?? []).length === 13,
  'registres transverses : 13 attendus');
fail(errors, (design.globalAudits ?? []).length === 4,
  'audits globaux : 4 attendus');

// Les marqueurs de section empêchent qu'un simple compteur JSON prétende que le plan existe.
fail(errors, plan.includes('14 ARCHITECTURE PHASES — CLOSURE MATRIX'), 'section 14 phases absente');
fail(errors, plan.includes('18 BLUEPRINT EXECUTION PROCEDURES'), 'section 18 blueprints absente');
fail(errors, plan.includes('73 CONTRACT EXECUTION PROCEDURES'), 'section 73 contrats absente');
fail(errors, plan.includes('21 E2E SCENARIOS'), 'section E2E absente');
fail(errors, plan.includes('PRE-CODE GATE'), 'section PRE-CODE GATE absente');

for (let i = 1; i <= 14; i += 1) {
  const id = `PHASE ${String(i).padStart(2, '0')} —`;
  fail(errors, occurrences(plan, id) === 1, `${id} doit apparaître exactement une fois`);
}

for (let i = 1; i <= 73; i += 1) {
  const line = new RegExp(`^GW-${String(i).padStart(2, '0')} [A-Z0-9_]+ \\|`, 'm');
  fail(errors, line.test(plan), `procédure contrat manquante : GW-${String(i).padStart(2, '0')}`);
}

for (let i = 0; i <= 17; i += 1) {
  const line = new RegExp(`^GWC-${i} [^\\n]+ \\| deps `, 'm');
  fail(errors, line.test(plan), `procédure blueprint manquante : GWC-${i}`);
}

for (let i = 1; i <= 21; i += 1) {
  const line = new RegExp(`^E2E-${String(i).padStart(2, '0')} `, 'm');
  fail(errors, line.test(plan), `scénario E2E manquant : E2E-${String(i).padStart(2, '0')}`);
}

for (const invariant of [
  'INTENT != AUTHORIZATION', 'CALLABLE != AUTHORIZED != SAFE_NOW', 'UNKNOWN never permits mutation',
  'Blueprint != GovernedTaskRecord', 'Only NEW_TASK after live Task Queue reconciliation may create a runtime Task',
  'Exact head before merge', 'Exact SHA before runtime truth', 'No false DONE'
]) {
  fail(errors, plan.includes(invariant), `invariant pre-code absent : ${invariant}`);
}

for (const blocker of ['AF-19', 'AF-22/AF-30', 'PR-STACK']) {
  fail(errors, gate.safetyPrerequisites.includes(blocker), `prérequis safety absent : ${blocker}`);
}

// Le flux d'actions détaillé est un compagnon d'exécution, jamais une Task Queue.
fail(errors, gate?.actionFlow?.source === 'docs/gwc/PRECODE_ACTION_TASK_FLOW.txt',
  'source du flux d actions pre-code absente du gate');
fail(errors, gate?.actionFlow?.projection === '.mcp/gwc-precode-action-flow.json',
  'projection du flux d actions pre-code absente du gate');
fail(errors, gate?.actionFlow?.mustBeRevalidatedBeforeRuntimeCode === true,
  'le flux d actions doit être revalidé avant code runtime');

fail(errors, actionProjection.schemaVersion === 1, 'action-flow schemaVersion doit valoir 1');
fail(errors, actionProjection.revision === 'R3-PRECODE-ACTION-FLOW',
  'revision action-flow inattendue');
fail(errors, actionProjection.projectionOnly === true && actionProjection.runtimeAuthority === false,
  'action-flow doit rester une projection non autoritative');
fail(errors, actionProjection.governedTaskQueueAuthority === false,
  'action-flow ne doit jamais devenir la Governed Task Queue');
fail(errors, actionProjection.runtimeTasksCreated === 0,
  'action-flow ne doit créer aucune Task runtime');
fail(errors, actionProjection.absoluteRule === 'NO_GWC_RUNTIME_CODE_BEFORE_GWC_PRE_GATE_01_PASS_WITH_EVIDENCE',
  'règle absolue du flux d actions absente');

const actionDigest = createHash('sha256').update(actionFlow).digest('hex');
fail(errors, actionProjection.actionFlowDigestSha256 === actionDigest,
  'digest de la projection action-flow ne correspond pas au document');
fail(errors, gate?.actionFlow?.digestSha256 === actionDigest,
  'digest action-flow du precode gate ne correspond pas au document');

for (const marker of [
  'GWC-PRE-000 — Observe current authorities',
  'EXISTING_SYSTEM_INVENTORY_COMPLETE',
  '73_CONTRACTS_EXISTING_MAPPING_COMPLETE',
  '73_CONTRACT_DESIGNS_COMPLETE',
  '18_DETAILED_EVOLUTION_DESIGNS_COMPLETE',
  'WORKFLOW_GRAPH_VERIFIED',
  'AUTHORITY_AND_DATA_MODEL_VERIFIED',
  'EVIDENCE_ATTESTATION_MODEL_VERIFIED',
  'CONCURRENCY_REPLAY_MODEL_VERIFIED',
  'FAILURE_RECOVERY_SECURITY_VERIFIED',
  'BACKWARD_COMPATIBILITY_VERIFIED',
  'GW73_ACCEPTANCE_DESIGN_COMPLETE',
  'IMPLEMENTATION_SEQUENCE_FROZEN',
  'GWC_ARCHITECTURE_CROSS_AUDIT_PASS',
  'GWC_ARCHITECTURE_CANONICAL',
  'GWC-PRE-GATE-01 — Architecture gate',
  'PHASE B — LIVE TASK RECONCILIATION',
  'PHASE C — SAFETY PREREQUISITES',
  'PHASE D — GOVERNED IMPLEMENTATION CYCLE',
  'PHASE E — BLUEPRINT MATERIALIZATION ORDER',
  'PHASE F — UNIVERSAL ACCEPTANCE',
  'UNIVERSAL_GOVERNED_WORKFLOW_ACCEPTED'
]) {
  fail(errors, actionFlow.includes(marker), `marqueur action-flow absent : ${marker}`);
}

for (let i = 1; i <= 73; i += 1) {
  const contract = `GW-${String(i).padStart(2, '0')}`;
  fail(errors, actionFlow.includes(`GWC-PRE-A2-${contract} —`),
    `work item mapping absent : ${contract}`);
  fail(errors, actionFlow.includes(`GWC-PRE-A3-${contract} —`),
    `work item design absent : ${contract}`);
  fail(errors, actionProjection.contractMappingWorkItems.includes(`GWC-PRE-A2-${contract}`),
    `projection mapping absente : ${contract}`);
  fail(errors, actionProjection.contractDesignWorkItems.includes(`GWC-PRE-A3-${contract}`),
    `projection design absente : ${contract}`);
}

for (let i = 0; i <= 17; i += 1) {
  fail(errors, actionFlow.includes(`GWC-PRE-A4-GWC-${i} —`),
    `work item evolution design absent : GWC-${i}`);
  fail(errors, actionProjection.blueprintDesignWorkItems.includes(`GWC-PRE-A4-GWC-${i}`),
    `projection evolution design absente : GWC-${i}`);
}

fail(errors, actionFlow.includes('Only NEW_TASK') || actionFlow.includes('only NEW_TASK'),
  'le flux d actions doit conserver la règle NEW_TASK');
fail(errors, actionFlow.includes('Never assume 1 blueprint = 1 task'),
  'le flux d actions doit conserver Blueprint != Task');
fail(errors, actionFlow.includes('NO GWC RUNTIME CODE MAY START'),
  'le gate absolu avant code runtime manque dans le flux d actions');

if (errors.length > 0) {
  console.error('GWC PRE-CODE VERIFY: FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('GWC PRE-CODE VERIFY: PASS | phases=14 | contractDesigns=73 | contractProcedures=73 | actionMappings=73 | actionContractClosures=73 | actionBlueprintClosures=18 | evolutionDesigns=18 | blueprintProcedures=18 | registries=13 | audits=4 | e2e=21 | runtime=NOT_STARTED');
