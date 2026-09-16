#!/usr/bin/env node
// Vérificateur déterministe des artefacts GWC versionnés (révision R3).
//
// Contrôle la cohérence de la matérialisation documentaire :
//   .mcp/gwc-contracts.json       registre des 73 contrats
//   .mcp/gwc-workflow-graph.json  graphe d'exécution canonique
//   .mcp/gwc-blueprints.json      registre des 18 blueprints d'implémentation
//
// Aucune mutation : le script lit, recalcule les empreintes et échoue si un
// artefact diverge. `--write` réécrit uniquement les empreintes dérivées.
//
// Ces fichiers sont des projections machine de la baseline canonique
// `docs/gwc/ARCHITECTURE_73_CONTRACTS.md`. Ils ne constituent aucune autorité
// métier et ne sont chargés par aucun code runtime.

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const CONTRACTS_PATH = path.join(ROOT, '.mcp', 'gwc-contracts.json');
const GRAPH_PATH = path.join(ROOT, '.mcp', 'gwc-workflow-graph.json');
const BLUEPRINTS_PATH = path.join(ROOT, '.mcp', 'gwc-blueprints.json');
const TASK_REGISTRY_PATH = path.join(ROOT, '.mcp', 'task-registry.json');

const STEP_ID = /^GW-(0[1-9]|[1-6][0-9]|7[0-3])$/;
const BLUEPRINT_ID = /^GWC-(0|[1-9]|1[0-7])$/;
const DIGEST = /^[0-9a-f]{64}$/;
const FAMILIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const EDGE_KINDS = ['FORWARD', 'BACKWARD', 'SKIP'];
const ARCHITECTURE_STATUSES = ['CONCEPTUALLY_APPROVED', 'READY_FOR_GOVERNED_IMPLEMENTATION'];
const EXECUTION_SEMANTICS = [
  'EVALUATE_ONLY', 'EVALUATE_ONLY / COMPOSED', 'OBSERVE_AND_EVALUATE',
  'EVALUATE_THEN_MUTATE', 'MUTATE_THEN_VERIFY', 'COMPOSED_SUBCONTRACT'
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

export function registryDigest(document) {
  return createHash('sha256').update(canonical({ ...document, registryDigest: undefined })).digest('hex');
}

function check(errors, condition, message) {
  if (!condition) errors.push(message);
}

export function verifyContracts(document) {
  const errors = [];
  check(errors, document?.schemaVersion === 1, 'contracts.schemaVersion doit valoir 1');
  check(errors, ARCHITECTURE_STATUSES.includes(document?.architectureStatus),
    `contracts.architectureStatus doit appartenir à ${ARCHITECTURE_STATUSES.join(' | ')}`);
  check(errors, typeof document?.canonicalDetail === 'string' && document.canonicalDetail.endsWith('.md'),
    'contracts.canonicalDetail doit pointer la baseline canonique Markdown');
  check(errors, Array.isArray(document?.contracts), 'contracts.contracts doit être un tableau');
  if (!Array.isArray(document?.contracts)) return errors;

  check(errors, document.contracts.length === 73,
    `73 contrats attendus, ${document.contracts.length} trouvés`);

  const seen = new Set();
  for (const contract of document.contracts) {
    const id = contract?.stepId;
    check(errors, STEP_ID.test(String(id)), `stepId invalide : ${id}`);
    check(errors, !seen.has(id), `stepId dupliqué : ${id}`);
    seen.add(id);
    check(errors, FAMILIES.includes(contract?.family), `${id} : famille inconnue ${contract?.family}`);
    check(errors, typeof contract?.canonicalName === 'string' && contract.canonicalName.length > 0,
      `${id} : canonicalName manquant`);
    check(errors, Number.isInteger(contract?.contractVersion) && contract.contractVersion >= 1,
      `${id} : contractVersion invalide`);
    check(errors, Array.isArray(contract?.profiles) && contract.profiles.length > 0,
      `${id} : profiles manquant`);
    check(errors, EXECUTION_SEMANTICS.includes(contract?.executionSemantics),
      `${id} : executionSemantics inconnue ${contract?.executionSemantics}`);
    check(errors, typeof contract?.integrationClassification === 'string'
      && contract.integrationClassification.length > 0, `${id} : integrationClassification manquante`);
    check(errors, typeof contract?.canonicalSheetRef === 'string'
      && contract.canonicalSheetRef.startsWith(document.canonicalDetail),
      `${id} : canonicalSheetRef ne référence pas la baseline canonique`);
    check(errors, contract?.blueprintRef === null || BLUEPRINT_ID.test(String(contract?.blueprintRef)),
      `${id} : blueprintRef invalide ${contract?.blueprintRef}`);
    check(errors, ['explicit', 'derived'].includes(contract?.blueprintRefSource),
      `${id} : blueprintRefSource doit valoir explicit ou derived`);
    check(errors, Array.isArray(contract?.findings), `${id} : findings doit être un tableau`);
  }

  for (let index = 1; index <= 73; index += 1) {
    const id = `GW-${String(index).padStart(2, '0')}`;
    check(errors, seen.has(id), `contrat manquant : ${id}`);
  }

  const expected = registryDigest(document);
  check(errors, document.registryDigest === expected,
    `contracts.registryDigest divergent (attendu ${expected})`);

  return errors;
}

export function verifyGraph(document, contracts) {
  const errors = [];
  const known = new Set((contracts?.contracts ?? []).map((contract) => contract.stepId));

  check(errors, document?.schemaVersion === 1, 'graph.schemaVersion doit valoir 1');
  check(errors, document?.entry === 'GW-01', 'graph.entry doit être GW-01');
  check(errors, document?.terminal === 'GW-73', 'graph.terminal doit être GW-73');
  check(errors, Array.isArray(document?.edges), 'graph.edges doit être un tableau');
  if (!Array.isArray(document?.edges)) return errors;

  // Les identifiants sont un espace de noms, pas une séquence : toute règle
  // imposant to > from est interdite, et le graphe doit le prouver.
  check(errors, document?.rules?.numericOrderEnforced === false,
    'graph.rules.numericOrderEnforced doit valoir false : aucune règle to > from');

  const seen = new Set();
  let backward = 0;
  for (const edge of document.edges) {
    const key = `${edge?.from}>${edge?.to}`;
    check(errors, !seen.has(key), `arête dupliquée : ${key}`);
    seen.add(key);
    check(errors, known.has(edge?.from), `arête depuis un contrat inconnu : ${edge?.from}`);
    check(errors, known.has(edge?.to), `arête vers un contrat inconnu : ${edge?.to}`);
    check(errors, EDGE_KINDS.includes(edge?.kind), `${key} : kind inconnu ${edge?.kind}`);
    check(errors, edge?.from !== edge?.to, `${key} : boucle sur soi non déclarée`);
    if (edge?.kind === 'BACKWARD') backward += 1;
  }

  check(errors, backward > 0,
    'le graphe doit contenir au moins une arête BACKWARD, preuve que l’ordre numérique n’est pas imposé');

  // Une arête arbitraire à rebours doit être acceptable par le validateur.
  const probe = validateEdgeShape({ from: 'GW-17', to: 'GW-12', kind: 'BACKWARD' }, known);
  check(errors, probe.length === 0,
    `une arête à rebours telle que GW-17 → GW-12 doit rester autorisable (${probe.join(', ')})`);

  check(errors, document.edges.some((edge) => edge.from === document.entry),
    'aucune arête ne part du point d’entrée');
  check(errors, !document.edges.some((edge) => edge.from === document.terminal),
    'le contrat terminal ne doit avoir aucun successeur');

  const expected = registryDigest(document);
  check(errors, document.registryDigest === expected,
    `graph.registryDigest divergent (attendu ${expected})`);

  return errors;
}

function validateEdgeShape(edge, known) {
  const errors = [];
  check(errors, known.has(edge.from), `arête depuis un contrat inconnu : ${edge.from}`);
  check(errors, known.has(edge.to), `arête vers un contrat inconnu : ${edge.to}`);
  check(errors, EDGE_KINDS.includes(edge.kind), `kind inconnu : ${edge.kind}`);
  return errors;
}

export function verifyBlueprints(document, contracts, taskRegistry) {
  const errors = [];
  const known = new Set((contracts?.contracts ?? []).map((contract) => contract.stepId));

  check(errors, document?.schemaVersion === 1, 'blueprints.schemaVersion doit valoir 1');
  check(errors, ARCHITECTURE_STATUSES.includes(document?.architectureStatus),
    'blueprints.architectureStatus incohérent');
  check(errors, document?.promotedToTaskQueue === false,
    'blueprints.promotedToTaskQueue doit valoir false : aucune promotion automatique');
  check(errors, document?.runtimeTasksCreated === 0,
    'blueprints.runtimeTasksCreated doit valoir 0');
  check(errors, Array.isArray(document?.blueprints), 'blueprints.blueprints doit être un tableau');
  if (!Array.isArray(document?.blueprints)) return errors;

  check(errors, document.blueprints.length === 18,
    `18 blueprints attendus, ${document.blueprints.length} trouvés`);

  const ids = new Set();
  for (const blueprint of document.blueprints) {
    const id = blueprint?.blueprintId;
    check(errors, BLUEPRINT_ID.test(String(id)), `blueprintId invalide : ${id}`);
    check(errors, !ids.has(id), `blueprintId dupliqué : ${id}`);
    ids.add(id);
    check(errors, typeof blueprint?.title === 'string' && blueprint.title.length > 0,
      `${id} : title manquant`);
    check(errors, Array.isArray(blueprint?.dependencies), `${id} : dependencies invalide`);
    check(errors, Array.isArray(blueprint?.resourceScopes) && blueprint.resourceScopes.length > 0,
      `${id} : resourceScopes manquant`);
    check(errors, blueprint?.materialization === 'BLUEPRINT_ONLY',
      `${id} : materialization doit valoir BLUEPRINT_ONLY`);
    check(errors, Array.isArray(blueprint?.contractRefs), `${id} : contractRefs invalide`);
    for (const ref of blueprint?.contractRefs ?? []) {
      check(errors, known.has(ref), `${id} : contractRef inconnu ${ref}`);
    }
    // Aucun blueprint ne prend une portée globale sans justification explicite.
    for (const scope of blueprint?.resourceScopes ?? []) {
      check(errors, !/^repository:/.test(scope) || typeof blueprint?.globalScopeJustification === 'string',
        `${id} : portée globale ${scope} sans globalScopeJustification`);
    }
  }

  for (let index = 0; index <= 17; index += 1) {
    check(errors, ids.has(`GWC-${index}`), `blueprint manquant : GWC-${index}`);
  }

  for (const blueprint of document.blueprints) {
    for (const dependency of blueprint?.dependencies ?? []) {
      check(errors, ids.has(dependency), `${blueprint.blueprintId} : dépendance inconnue ${dependency}`);
      check(errors, dependency !== blueprint.blueprintId,
        `${blueprint.blueprintId} : dépendance circulaire directe`);
    }
  }

  // Couverture : chaque contrat est rattaché à exactement un blueprint.
  const covered = new Map();
  for (const blueprint of document.blueprints) {
    for (const ref of blueprint?.contractRefs ?? []) {
      check(errors, !covered.has(ref),
        `${ref} rattaché à deux blueprints : ${covered.get(ref)} et ${blueprint.blueprintId}`);
      covered.set(ref, blueprint.blueprintId);
    }
  }
  for (const id of known) {
    check(errors, covered.has(id), `contrat sans blueprint : ${id}`);
  }

  // Aucune promotion silencieuse dans la Governed Task Queue.
  const blueprintIds = new Set(document.blueprints.map((blueprint) => blueprint.blueprintId));
  for (const task of taskRegistry?.tasks ?? []) {
    check(errors, !blueprintIds.has(task?.intentKey),
      `promotion détectée : la Task Queue contient le blueprint ${task?.intentKey}`);
    check(errors, !String(task?.intentKey ?? '').startsWith('gwc:'),
      `promotion détectée : la Task Queue contient un intentKey GWC (${task?.intentKey})`);
  }

  const expected = registryDigest(document);
  check(errors, document.registryDigest === expected,
    `blueprints.registryDigest divergent (attendu ${expected})`);

  return errors;
}

export function verifyCrossReferences(contracts, blueprints) {
  const errors = [];
  const byBlueprint = new Map((blueprints?.blueprints ?? [])
    .map((blueprint) => [blueprint.blueprintId, blueprint]));

  for (const contract of contracts?.contracts ?? []) {
    if (!contract.blueprintRef) continue;
    const blueprint = byBlueprint.get(contract.blueprintRef);
    check(errors, Boolean(blueprint),
      `${contract.stepId} : blueprintRef ${contract.blueprintRef} absent du registre`);
    if (!blueprint) continue;
    check(errors, blueprint.contractRefs.includes(contract.stepId),
      `${contract.stepId} : rattachement non réciproque avec ${contract.blueprintRef}`);
  }

  // Les findings de sécurité gardent un propriétaire architectural stable.
  const owner = (finding) => (blueprints?.blueprints ?? [])
    .find((blueprint) => (blueprint.findings ?? []).includes(finding))?.blueprintId ?? null;
  check(errors, owner('AF-19') === 'GWC-15', 'AF-19 doit être porté par GWC-15');
  check(errors, owner('AF-22') === 'GWC-14', 'AF-22 doit être porté par GWC-14');
  check(errors, owner('AF-30') === 'GWC-14', 'AF-30 doit être porté par GWC-14');

  return errors;
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (fallback !== null && error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function main() {
  const write = process.argv.includes('--write');
  const contracts = await readJson(CONTRACTS_PATH);
  const graph = await readJson(GRAPH_PATH);
  const blueprints = await readJson(BLUEPRINTS_PATH);
  const taskRegistry = await readJson(TASK_REGISTRY_PATH, { tasks: [] });

  if (write) {
    contracts.registryDigest = registryDigest(contracts);
    graph.registryDigest = registryDigest(graph);
    blueprints.registryDigest = registryDigest(blueprints);
    await writeFile(CONTRACTS_PATH, `${JSON.stringify(contracts, null, 2)}\n`, 'utf8');
    await writeFile(GRAPH_PATH, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
    await writeFile(BLUEPRINTS_PATH, `${JSON.stringify(blueprints, null, 2)}\n`, 'utf8');
    console.log('Empreintes GWC recalculées.');
  }

  const errors = [
    ...verifyContracts(contracts),
    ...verifyGraph(graph, contracts),
    ...verifyBlueprints(blueprints, contracts, taskRegistry),
    ...verifyCrossReferences(contracts, blueprints)
  ];

  if (errors.length > 0) {
    console.error('Vérification GWC en échec :');
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log([
    `Vérification GWC réussie : ${contracts.contracts.length} contrats`,
    `${graph.edges.length} arêtes (${graph.edges.filter((edge) => edge.kind === 'BACKWARD').length} à rebours)`,
    `${blueprints.blueprints.length} blueprints`,
    `${blueprints.runtimeTasksCreated} tâche runtime`
  ].join(', ') + '.');
}

if (process.argv[1] && process.argv[1].endsWith('gwc-verify.mjs')) {
  await main();
}
