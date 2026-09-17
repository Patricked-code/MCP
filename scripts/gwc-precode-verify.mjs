#!/usr/bin/env node
// Vérifie la fermeture d'architecture GWC avant tout code runtime.
// Lecture seule : aucun état runtime, Task Queue, serveur ou registre n'est muté.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PLAN = path.join(ROOT, 'docs', 'gwc', 'PRECODE_EXECUTION_PLAN.txt');
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

const [plan, gate, contracts, blueprints, design] = await Promise.all([
  readFile(PLAN, 'utf8'), json(GATE), json(CONTRACTS), json(BLUEPRINTS), json(DESIGN)
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
  const id = `GW-${String(i).padStart(2, '0')} `;
  // Le plan peut citer un GW dans d'autres sections; on exige au moins la ligne de procédure canonique.
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

if (errors.length > 0) {
  console.error('GWC PRE-CODE VERIFY: FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('GWC PRE-CODE VERIFY: PASS | phases=14 | contractDesigns=73 | contractProcedures=73 | evolutionDesigns=18 | blueprintProcedures=18 | registries=13 | audits=4 | e2e=21 | runtime=NOT_STARTED');
