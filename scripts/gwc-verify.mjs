#!/usr/bin/env node
// Vérificateur déterministe des artefacts GWC versionnés.
//
// Contrôle `.mcp/gwc-contracts.json` (registre des 73 contrats) et
// `.mcp/gwc-task-seed.json` (backlog candidat au format TaskRegistrySeed).
// Aucune mutation : le script lit, recalcule les empreintes et échoue si
// un artefact diverge. `--write` réécrit uniquement les empreintes dérivées.

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const CONTRACTS_PATH = path.join(ROOT, '.mcp', 'gwc-contracts.json');
const SEED_PATH = path.join(ROOT, '.mcp', 'gwc-task-seed.json');

const TASK_ID = /^TASK-[0-9]{8}-[0-9]{3,}$/;
const INTENT_KEY = /^[a-z0-9][a-z0-9:._/-]+$/;
const DIGEST = /^[0-9a-f]{64}$/;
const STEP_ID = /^GW-[0-7][0-9]$/;
const FAMILIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const STATUSES = [
  'DISCOVERED', 'READY', 'CLAIMED', 'IN_PROGRESS', 'REVIEW', 'MERGE_READY',
  'DEPLOYING', 'VERIFYING', 'DONE', 'BLOCKED', 'CONFLICT', 'CANCELLED', 'SUPERSEDED'
];

// Reproduit exactement src/operationalMemory/taskQueue.ts:canonical().
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256Canonical(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

// Convention GWC : l'empreinte d'une tâche du seed couvre tous ses champs
// gouvernés, à l'exclusion de l'empreinte elle-même.
export function seedTaskDigest(task) {
  const { requestDigest: _ignored, ...fields } = task;
  return sha256Canonical(fields);
}

// Reproduit src/operationalMemory/taskQueue.ts:taskRegistryDigest().
export function registryDigest(seed) {
  const { registryDigest: _ignored, ...fields } = seed;
  return sha256Canonical(fields);
}

function check(errors, condition, message) {
  if (!condition) errors.push(message);
}

export function verifyContracts(contracts) {
  const errors = [];
  check(errors, contracts?.schemaVersion === 1, 'contracts.schemaVersion doit valoir 1');
  check(errors, Array.isArray(contracts?.contracts), 'contracts.contracts doit être un tableau');
  if (!Array.isArray(contracts?.contracts)) return errors;

  check(errors, contracts.contracts.length === 73, `73 contrats attendus, ${contracts.contracts.length} trouvés`);

  const seen = new Set();
  for (const contract of contracts.contracts) {
    const id = contract?.stepId;
    check(errors, STEP_ID.test(String(id)), `stepId invalide : ${id}`);
    check(errors, !seen.has(id), `stepId dupliqué : ${id}`);
    seen.add(id);
    check(errors, FAMILIES.includes(contract?.family), `${id} : famille inconnue ${contract?.family}`);
    check(errors, typeof contract?.name === 'string' && contract.name.length > 0, `${id} : nom manquant`);
    check(errors, typeof contract?.maturity === 'string', `${id} : maturity manquante`);
    check(errors, typeof contract?.integrationStrategy === 'string', `${id} : integrationStrategy manquante`);
  }

  for (let index = 1; index <= 73; index += 1) {
    const id = `GW-${String(index).padStart(2, '0')}`;
    check(errors, seen.has(id), `contrat manquant : ${id}`);
  }

  const expected = registryDigest(contracts);
  check(errors, contracts.registryDigest === expected,
    `contracts.registryDigest divergent (attendu ${expected})`);

  return errors;
}

export function verifySeed(seed) {
  const errors = [];
  check(errors, seed?.schemaVersion === 1, 'seed.schemaVersion doit valoir 1');
  check(errors, Number.isInteger(seed?.registryVersion) && seed.registryVersion > 0,
    'seed.registryVersion doit être un entier positif');
  check(errors, typeof seed?.generatedAt === 'string' && !Number.isNaN(Date.parse(seed.generatedAt)),
    'seed.generatedAt doit être une date ISO');
  check(errors, Array.isArray(seed?.tasks), 'seed.tasks doit être un tableau');
  if (!Array.isArray(seed?.tasks)) return errors;

  check(errors, seed.tasks.length <= 5000, 'seed.tasks dépasse 5000 entrées');

  const ids = new Set();
  for (const task of seed.tasks) {
    const id = task?.taskId;
    check(errors, TASK_ID.test(String(id)), `taskId invalide : ${id}`);
    check(errors, !ids.has(id), `taskId dupliqué : ${id}`);
    ids.add(id);
    check(errors, task?.repository === 'Patricked-code/MCP', `${id} : repository doit rester Patricked-code/MCP`);
    check(errors, INTENT_KEY.test(String(task?.intentKey)), `${id} : intentKey invalide`);
    check(errors, String(task?.intentKey).length >= 3 && String(task?.intentKey).length <= 160,
      `${id} : intentKey hors bornes`);
    check(errors, typeof task?.title === 'string' && task.title.length >= 1 && task.title.length <= 160,
      `${id} : title hors bornes`);
    check(errors, typeof task?.summary === 'string' && task.summary.length >= 1 && task.summary.length <= 500,
      `${id} : summary hors bornes`);
    check(errors, Number.isInteger(task?.priority) && task.priority >= 0 && task.priority <= 100,
      `${id} : priority hors bornes`);
    check(errors, Number.isInteger(task?.sequence) && task.sequence >= 0, `${id} : sequence invalide`);
    check(errors, STATUSES.includes(task?.status), `${id} : statut inconnu ${task?.status}`);
    check(errors, Array.isArray(task?.dependencies) && task.dependencies.length <= 64,
      `${id} : dependencies invalide`);
    check(errors, Array.isArray(task?.resourceScopes) && task.resourceScopes.length <= 64,
      `${id} : resourceScopes invalide`);
    check(errors, Array.isArray(task?.blockers) && task.blockers.length <= 20, `${id} : blockers invalide`);
    check(errors, task?.nextAction === null
      || (typeof task?.nextAction === 'string' && task.nextAction.length >= 1 && task.nextAction.length <= 500),
      `${id} : nextAction hors bornes`);
    check(errors, DIGEST.test(String(task?.requestDigest)), `${id} : requestDigest invalide`);

    const expected = seedTaskDigest(task);
    check(errors, task?.requestDigest === expected, `${id} : requestDigest divergent (attendu ${expected})`);
  }

  for (const task of seed.tasks) {
    for (const dependency of task?.dependencies ?? []) {
      check(errors, ids.has(dependency), `${task.taskId} : dépendance inconnue ${dependency}`);
      check(errors, dependency !== task.taskId, `${task.taskId} : dépendance circulaire directe`);
    }
  }

  const expected = registryDigest(seed);
  check(errors, seed.registryDigest === expected, `seed.registryDigest divergent (attendu ${expected})`);

  return errors;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function main() {
  const write = process.argv.includes('--write');
  const contracts = await readJson(CONTRACTS_PATH);
  const seed = await readJson(SEED_PATH);

  if (write) {
    for (const task of seed.tasks) task.requestDigest = seedTaskDigest(task);
    seed.registryDigest = registryDigest(seed);
    contracts.registryDigest = registryDigest(contracts);
    await writeFile(SEED_PATH, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
    await writeFile(CONTRACTS_PATH, `${JSON.stringify(contracts, null, 2)}\n`, 'utf8');
    console.log('Empreintes GWC recalculées.');
  }

  const errors = [...verifyContracts(contracts), ...verifySeed(seed)];
  if (errors.length > 0) {
    console.error('Vérification GWC en échec :');
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Vérification GWC réussie : ${contracts.contracts.length} contrats, ${seed.tasks.length} tâches candidates.`);
}

if (process.argv[1] && process.argv[1].endsWith('gwc-verify.mjs')) {
  await main();
}
