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
const EVOLUTION_DESIGN_PATH = path.join(ROOT, '.mcp', 'gwc-evolution-design.json');
const TASK_REGISTRY_PATH = path.join(ROOT, '.mcp', 'task-registry.json');
const CANONICAL_MEMORY_DIR = path.join(ROOT, 'docs', 'gwc', 'canonical-memory');
const CANONICAL_POINTER_PATH = path.join(CANONICAL_MEMORY_DIR, 'current.json');

const STEP_ID = /^GW-(0[1-9]|[1-6][0-9]|7[0-3])$/;
const BLUEPRINT_ID = /^GWC-(0|[1-9]|1[0-7])$/;
const DIGEST = /^[0-9a-f]{64}$/;
const FAMILIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const EDGE_KINDS = ['FORWARD', 'BACKWARD', 'SKIP'];
const EDGE_TRIGGERS = ['POSTCONDITION_PASS', 'POSTCONDITION_FAIL', 'SKIP_CONDITION', 'REOBSERVE_REQUIRED'];
const ARCHITECTURE_STATUSES = ['CONCEPTUALLY_APPROVED', 'READY_FOR_GOVERNED_IMPLEMENTATION'];
const FINDING_ID = /^AF-(0[1-9]|[1-2][0-9]|3[0-9])$/;
const DESIGN_VERDICTS = [
  'DETAILED_EVOLUTION_DESIGN_READY_FOR_TASK_RECONCILIATION',
  'DETAILED_EVOLUTION_DESIGN_PARTIALLY_READY'
];
const DESIGN_STATUSES = [
  'DETAILED_DESIGN_COMPLETE',
  'DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS'
];
const DESIGN_CLASSIFICATIONS = [
  'REUSE',
  'REUSE/WRAP',
  'REUSE/EXTEND',
  'REUSE/GENERALIZE',
  'GENERALIZE',
  'GENERALIZE/EXTEND',
  'DISPOSITION',
  'NEW_ORCHESTRATION_ONLY',
  'NEW'
];
const DEFINITION_SOURCES = ['CURRENT_MAIN_EVIDENCE', 'ARCHIVE_R2_NON_CANONICAL'];
const DECISION_STATES = ['OPEN', 'NARROWED', 'OPEN_NARROWED', 'RESOLVED'];
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
  check(errors, STEP_ID.test(String(document?.runtimeTerminal)),
    `graph.runtimeTerminal invalide : ${document?.runtimeTerminal}`);
  check(errors, document?.terminal === undefined,
    'graph.terminal est ambigu : utiliser runtimeTerminal et outOfRuntimeGraph');
  check(errors, Array.isArray(document?.outOfRuntimeGraph),
    'graph.outOfRuntimeGraph doit être un tableau, même vide');
  check(errors, Array.isArray(document?.edges), 'graph.edges doit être un tableau');
  if (!Array.isArray(document?.edges) || !Array.isArray(document?.outOfRuntimeGraph)) return errors;

  // Les identifiants sont un espace de noms, pas une séquence : toute règle
  // imposant to > from est interdite, et le graphe doit le prouver.
  check(errors, document?.rules?.numericOrderEnforced === false,
    'graph.rules.numericOrderEnforced doit valoir false : aucune règle to > from');

  // Tout contrat exclu du graphe runtime doit l'être explicitement et motivé.
  const outOfRuntime = new Set();
  for (const entry of document.outOfRuntimeGraph) {
    check(errors, known.has(entry?.stepId),
      `outOfRuntimeGraph référence un contrat inconnu : ${entry?.stepId}`);
    check(errors, typeof entry?.reason === 'string' && entry.reason.length > 20,
      `${entry?.stepId} : exclusion du graphe runtime sans motif explicite`);
    check(errors, typeof entry?.predecessorAnchor === 'string' && entry.predecessorAnchor.length > 0,
      `${entry?.stepId} : predecessorAnchor hors graphe manquant`);
    check(errors, typeof entry?.successorAnchor === 'string' && entry.successorAnchor.length > 0,
      `${entry?.stepId} : successorAnchor hors graphe manquant`);
    outOfRuntime.add(entry?.stepId);
  }
  check(errors, !outOfRuntime.has(document.entry), 'graph.entry ne peut pas être hors graphe runtime');
  check(errors, !outOfRuntime.has(document.runtimeTerminal),
    'graph.runtimeTerminal ne peut pas être hors graphe runtime');

  const outgoing = new Map();
  const incoming = new Map();
  for (const step of known) { outgoing.set(step, []); incoming.set(step, []); }

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
    check(errors, !outOfRuntime.has(edge?.from) && !outOfRuntime.has(edge?.to),
      `${key} : arête vers ou depuis un contrat déclaré hors graphe runtime`);
    check(errors, Array.isArray(edge?.declaredBy) && edge.declaredBy.length > 0,
      `${key} : declaredBy manquant, impossible de tracer l’origine de l’arête`);

    // Aucune transition implicite : toute arête déclare son déclencheur et sa précondition.
    for (const message of validateEdgeShape(edge ?? {}, known)) {
      if (!errors.includes(message)) errors.push(message);
    }

    if (edge?.kind === 'BACKWARD') backward += 1;
    outgoing.get(edge?.from)?.push(edge?.to);
    incoming.get(edge?.to)?.push(edge?.from);
  }

  check(errors, backward > 0,
    'le graphe doit contenir au moins une arête BACKWARD, preuve que l’ordre numérique n’est pas imposé');

  // Une arête arbitraire à rebours doit rester acceptable par le validateur.
  const probe = validateEdgeShape({
    from: 'GW-17',
    to: 'GW-12',
    kind: 'BACKWARD',
    trigger: 'REOBSERVE_REQUIRED',
    precondition: 'sonde de validation : une arête à rebours motivée reste autorisable.'
  }, known);
  check(errors, probe.length === 0,
    `une arête à rebours telle que GW-17 → GW-12 doit rester autorisable (${probe.join(', ')})`);

  const runtimeSteps = [...known].filter((step) => !outOfRuntime.has(step));

  // Atteignabilité réelle depuis l'entrée : c'est le contrôle qui manquait.
  const reached = new Set([document.entry]);
  const queue = [document.entry];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of outgoing.get(current) ?? []) {
      if (!reached.has(next)) { reached.add(next); queue.push(next); }
    }
  }
  const unreachable = runtimeSteps.filter((step) => !reached.has(step)).sort();
  check(errors, unreachable.length === 0,
    `contrats runtime inatteignables depuis ${document.entry} : ${unreachable.join(', ')}`);

  // Aucun orphelin : tout contrat runtime hors entrée a au moins une arête entrante.
  const orphans = runtimeSteps
    .filter((step) => step !== document.entry && (incoming.get(step) ?? []).length === 0).sort();
  check(errors, orphans.length === 0,
    `contrats runtime sans arête entrante : ${orphans.join(', ')}`);

  // Tout contrat runtime non terminal a au moins une arête sortante.
  const deadEnds = runtimeSteps
    .filter((step) => step !== document.runtimeTerminal && (outgoing.get(step) ?? []).length === 0).sort();
  check(errors, deadEnds.length === 0,
    `contrats runtime non terminaux sans arête sortante : ${deadEnds.join(', ')}`);

  // Le terminal déclaré est le seul sans successeur.
  check(errors, (outgoing.get(document.runtimeTerminal) ?? []).length === 0,
    `${document.runtimeTerminal} est déclaré terminal mais porte des successeurs`);
  check(errors, (outgoing.get(document.entry) ?? []).length > 0,
    'aucune arête ne part du point d’entrée');

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

  // Aucune transition implicite : toute arête déclare son déclencheur et sa précondition.
  check(errors, EDGE_TRIGGERS.includes(edge.trigger),
    `${edge.from} -> ${edge.to} : trigger inconnu ou absent (${edge.trigger})`);
  check(errors, typeof edge.precondition === 'string' && edge.precondition.trim().length > 0,
    `${edge.from} -> ${edge.to} : precondition manquante`);
  check(errors, edge.kind !== 'SKIP' || edge.trigger === 'SKIP_CONDITION',
    `${edge.from} -> ${edge.to} : une arête SKIP doit déclarer SKIP_CONDITION`);
  check(errors, edge.kind !== 'FORWARD' || edge.trigger === 'POSTCONDITION_PASS',
    `${edge.from} -> ${edge.to} : une arête FORWARD doit déclarer POSTCONDITION_PASS`);

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

export function verifyGraphProjection(contracts, graph) {
  const errors = [];
  const outOfRuntime = new Set((graph?.outOfRuntimeGraph ?? []).map((entry) => entry.stepId));
  const outgoing = new Map();
  const incoming = new Map();
  for (const contract of contracts?.contracts ?? []) {
    outgoing.set(contract.stepId, []);
    incoming.set(contract.stepId, []);
  }
  for (const edge of graph?.edges ?? []) {
    outgoing.get(edge.from)?.push(edge.to);
    incoming.get(edge.to)?.push(edge.from);
  }

  const same = (left, right) => left.length === right.length
    && [...left].sort().every((value, index) => value === [...right].sort()[index]);

  for (const contract of contracts?.contracts ?? []) {
    const id = contract.stepId;
    check(errors, contract?.graph === undefined,
      `${id} : le champ graph ambigu doit être remplacé par graphProjection`);
    check(errors, typeof contract?.runtimeGraphMember === 'boolean',
      `${id} : runtimeGraphMember manquant`);
    check(errors, contract?.runtimeGraphMember === !outOfRuntime.has(id),
      `${id} : runtimeGraphMember contredit outOfRuntimeGraph`);

    const projection = contract?.graphProjection;
    check(errors, Boolean(projection), `${id} : graphProjection manquante`);
    if (!projection) continue;
    check(errors, projection.source === '.mcp/gwc-workflow-graph.json' && projection.exact === true,
      `${id} : graphProjection doit se déclarer projection exacte du WorkflowGraph`);
    check(errors, same(projection.incoming ?? [], incoming.get(id) ?? []),
      `${id} : graphProjection.incoming diverge du WorkflowGraph (${(incoming.get(id) ?? []).join(', ') || 'aucune'})`);
    check(errors, same(projection.outgoing ?? [], outgoing.get(id) ?? []),
      `${id} : graphProjection.outgoing diverge du WorkflowGraph (${(outgoing.get(id) ?? []).join(', ') || 'aucune'})`);
    check(errors, projection.entry === (id === graph?.entry),
      `${id} : graphProjection.entry incohérent`);
    check(errors, projection.runtimeTerminal === (id === graph?.runtimeTerminal),
      `${id} : graphProjection.runtimeTerminal incohérent`);

    // Le texte canonique reste de la prose tracée, jamais une source de graphe.
    check(errors, typeof contract?.canonicalRouting?.note === 'string',
      `${id} : canonicalRouting.note manquante, la sémantique du texte de fiche doit être explicite`);
  }

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

export function verifyEvolutionDesign(design, contracts, blueprints) {
  const errors = [];
  check(errors, design?.schemaVersion === 1, 'evolution-design.schemaVersion doit valoir 1');
  check(errors, design?.promotedToTaskQueue === false,
    'evolution-design.promotedToTaskQueue doit valoir false : aucune promotion automatique');
  check(errors, design?.runtimeTasksCreated === 0,
    'evolution-design.runtimeTasksCreated doit valoir 0');
  check(errors, DESIGN_VERDICTS.includes(design?.verdict),
    `evolution-design.verdict invalide : ${design?.verdict}`);
  check(errors, Array.isArray(design?.entries), 'evolution-design.entries doit être un tableau');
  if (!Array.isArray(design?.entries)) return errors;

  // Dix-huit fiches, une par blueprint, sans doublon ni manquant.
  check(errors, design.entries.length === 18,
    `18 fiches de conception attendues, ${design.entries.length} trouvées`);
  const seen = new Set();
  for (const entry of design.entries) {
    const id = entry?.blueprintId;
    check(errors, BLUEPRINT_ID.test(String(id)), `fiche : blueprintId invalide ${id}`);
    check(errors, !seen.has(id), `fiche : blueprintId dupliqué ${id}`);
    seen.add(id);
    check(errors, DESIGN_STATUSES.includes(entry?.status),
      `${id} : statut de conception inconnu ${entry?.status}`);
    check(errors, DESIGN_CLASSIFICATIONS.includes(entry?.integrationClassification),
      `${id} : classification d'intégration inconnue ${entry?.integrationClassification}`);
    check(errors, typeof entry?.designSection === 'string' && entry.designSection.length > 0,
      `${id} : designSection manquante`);

    // Aucun NEW inexpliqué : toute primitive nouvelle porte sa justification.
    const declaresNew = String(entry?.integrationClassification ?? '').includes('NEW');
    const primitives = Array.isArray(entry?.newPrimitives) ? entry.newPrimitives : [];
    check(errors, Array.isArray(entry?.newPrimitives), `${id} : newPrimitives doit être un tableau`);
    check(errors, !declaresNew || primitives.length > 0,
      `${id} : classification NEW sans primitive nouvelle déclarée`);
    for (const primitive of primitives) {
      check(errors, typeof primitive?.name === 'string' && primitive.name.length > 0,
        `${id} : primitive nouvelle sans nom`);
      check(errors, typeof primitive?.justification === 'string' && primitive.justification.length > 0,
        `${id} : primitive nouvelle ${primitive?.name} sans justification`);
    }
  }
  for (let index = 0; index <= 17; index += 1) {
    check(errors, seen.has(`GWC-${index}`), `fiche de conception manquante : GWC-${index}`);
  }

  // Aucune autorité dupliquée : deux blueprints ne déclarent pas la même primitive.
  const primitiveOwner = new Map();
  for (const entry of design.entries) {
    for (const primitive of entry?.newPrimitives ?? []) {
      const name = primitive?.name;
      check(errors, !primitiveOwner.has(name),
        `primitive nouvelle dupliquée : ${name} déclarée par ${primitiveOwner.get(name)} et ${entry.blueprintId}`);
      primitiveOwner.set(name, entry.blueprintId);
    }
  }

  // Couverture des contrats : chaque GW est porté par exactement une fiche.
  const known = new Set((contracts?.contracts ?? []).map((contract) => contract.stepId));
  const covered = new Map();
  for (const entry of design.entries) {
    for (const ref of entry?.contractsCovered ?? []) {
      check(errors, known.has(ref), `${entry.blueprintId} : contrat inconnu ${ref}`);
      check(errors, !covered.has(ref),
        `${ref} porté par deux fiches : ${covered.get(ref)} et ${entry.blueprintId}`);
      covered.set(ref, entry.blueprintId);
    }
  }
  for (const id of known) {
    check(errors, covered.has(id), `contrat sans fiche de conception : ${id}`);
  }

  // Réciprocité avec le registre des blueprints.
  const byBlueprint = new Map((blueprints?.blueprints ?? [])
    .map((blueprint) => [blueprint.blueprintId, blueprint]));
  for (const entry of design.entries) {
    const blueprint = byBlueprint.get(entry.blueprintId);
    check(errors, Boolean(blueprint),
      `${entry.blueprintId} : absent du registre des blueprints`);
    if (!blueprint) continue;
    const expected = [...(blueprint.contractRefs ?? [])].sort();
    const actual = [...(entry.contractsCovered ?? [])].sort();
    check(errors, expected.length === actual.length && expected.every((v, i) => v === actual[i]),
      `${entry.blueprintId} : contractsCovered diverge de contractRefs du registre`);
  }

  // Tout finding a un propriétaire connu, et ce propriétaire le déclare.
  check(errors, Array.isArray(design?.findings), 'evolution-design.findings doit être un tableau');
  const ownedByEntry = new Map();
  for (const entry of design.entries) {
    for (const finding of entry?.findingsOwned ?? []) ownedByEntry.set(finding, entry.blueprintId);
  }
  for (const record of design?.findings ?? []) {
    check(errors, FINDING_ID.test(String(record?.finding)),
      `finding invalide : ${record?.finding}`);
    check(errors, seen.has(record?.owner),
      `${record?.finding} : propriétaire inconnu ${record?.owner}`);
    check(errors, DEFINITION_SOURCES.includes(record?.definitionSource),
      `${record?.finding} : definitionSource inconnue ${record?.definitionSource}`);
    check(errors, ownedByEntry.get(record?.finding) === record?.owner,
      `${record?.finding} : propriété non réciproque avec ${record?.owner}`);
  }

  // Les findings de sûreté gardent leur propriétaire, comme dans le registre blueprints.
  const findingOwner = (finding) => (design?.findings ?? [])
    .find((record) => record.finding === finding)?.owner ?? null;
  check(errors, findingOwner('AF-19') === 'GWC-15', 'AF-19 doit être porté par GWC-15');
  check(errors, findingOwner('AF-22') === 'GWC-14', 'AF-22 doit être porté par GWC-14');
  check(errors, findingOwner('AF-30') === 'GWC-14', 'AF-30 doit être porté par GWC-14');

  // OD-01 à OD-12 toutes présentes, chacune avec un propriétaire et un état connus.
  check(errors, Array.isArray(design?.openDecisions),
    'evolution-design.openDecisions doit être un tableau');
  const decisions = new Set((design?.openDecisions ?? []).map((decision) => decision?.id));
  for (let index = 1; index <= 12; index += 1) {
    const id = `OD-${String(index).padStart(2, '0')}`;
    check(errors, decisions.has(id), `décision ouverte manquante : ${id}`);
  }
  for (const decision of design?.openDecisions ?? []) {
    check(errors, DECISION_STATES.includes(decision?.state),
      `${decision?.id} : état inconnu ${decision?.state}`);
    check(errors, seen.has(decision?.owner),
      `${decision?.id} : propriétaire inconnu ${decision?.owner}`);
  }

  // Les treize registres transverses et les quatre audits globaux sont déclarés.
  check(errors, (design?.transverseRegistries ?? []).length === 13,
    `13 registres transverses attendus, ${(design?.transverseRegistries ?? []).length} déclarés`);
  check(errors, (design?.globalAudits ?? []).length === 4,
    `4 audits globaux attendus, ${(design?.globalAudits ?? []).length} déclarés`);

  return errors;
}

// La mémoire canonique n'a de valeur de continuité que si son pointeur se
// résout réellement. Un pointeur pendant laisse un agent qui reprend sans
// checkpoint, ce que CLAUDE.md §9 vise précisément à empêcher — et il passait
// jusqu'ici une CI verte, faute de contrôle. Enregistré sous AF-36.
async function verifyCanonicalMemory() {
  const errors = [];
  const pointer = await readJson(CANONICAL_POINTER_PATH, false);

  if (pointer === false) {
    check(errors, false, `mémoire canonique : ${path.relative(ROOT, CANONICAL_POINTER_PATH)} absent`);
    return errors;
  }

  const currentPath = pointer.currentBundlePath;
  check(errors, typeof currentPath === 'string' && currentPath.length > 0,
    'mémoire canonique : currentBundlePath manquant');
  if (typeof currentPath !== 'string' || currentPath.length === 0) return errors;

  const bundlePath = path.join(ROOT, currentPath, 'bundle.json');
  const bundle = await readJson(bundlePath, false);
  check(errors, bundle !== false,
    `mémoire canonique : currentBundlePath "${currentPath}" ne se résout pas — bundle.json introuvable`);
  if (bundle === false) return errors;

  check(errors, bundle.bundle_id === pointer.currentBundleId,
    `mémoire canonique : currentBundleId "${pointer.currentBundleId}" ne correspond pas au bundle résolu "${bundle.bundle_id}"`);

  for (const source of bundle.sources ?? []) {
    const sourcePath = path.join(ROOT, currentPath, source.path);
    const raw = await readFile(sourcePath).catch(() => null);
    check(errors, raw !== null,
      `mémoire canonique : source "${source.path}" du bundle courant introuvable`);
    if (raw === null) continue;
    check(errors, raw.length === source.bytes,
      `mémoire canonique : source "${source.path}" fait ${raw.length} octets, ${source.bytes} déclarés`);
    check(errors, createHash('sha256').update(raw).digest('hex') === source.sha256,
      `mémoire canonique : source "${source.path}" a une empreinte sha256 divergente`);
  }

  for (const claim of bundle.claims ?? []) {
    check(errors, claim.approval_eligible === false,
      `mémoire canonique : claim "${claim.claim_id}" doit rester approval_eligible=false — la mémoire historique n'approuve jamais`);
  }

  // Le bundle courant ne peut pas être simultanément déclaré supersédé : un agent
  // qui reprend lirait un checkpoint à la fois actif et périmé. Lacune du premier
  // contrôle AF-36, comblée après l'avoir observée en conditions réelles.
  const previousNames = (pointer.previousBundles ?? []).map((entry) => entry.name);
  const previousPaths = (pointer.previousBundles ?? []).map((entry) => entry.path);
  check(errors, !previousNames.includes(pointer.currentBundle),
    `mémoire canonique : le bundle courant "${pointer.currentBundle}" est aussi listé dans previousBundles — il ne peut pas être à la fois courant et supersédé`);
  check(errors, !previousPaths.includes(currentPath),
    `mémoire canonique : le chemin courant "${currentPath}" est aussi listé dans previousBundles`);

  // Chaque bundle listé comme précédent doit exister : l'historique est immuable,
  // pas seulement déclaré.
  for (const previous of pointer.previousBundles ?? []) {
    const previousBundle = path.join(ROOT, previous.path, 'bundle.json');
    const exists = await readFile(previousBundle).then(() => true).catch(() => false);
    check(errors, exists,
      `mémoire canonique : bundle précédent "${previous.name}" déclaré mais introuvable à "${previous.path}"`);
  }

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
  const design = await readJson(EVOLUTION_DESIGN_PATH);
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
    ...verifyGraphProjection(contracts, graph),
    ...verifyBlueprints(blueprints, contracts, taskRegistry),
    ...verifyCrossReferences(contracts, blueprints),
    ...verifyEvolutionDesign(design, contracts, blueprints),
    ...(await verifyCanonicalMemory())
  ];

  if (errors.length > 0) {
    console.error('Vérification GWC en échec :');
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  const runtimeCount = contracts.contracts.filter((contract) => contract.runtimeGraphMember).length;
  console.log([
    `Vérification GWC réussie : ${contracts.contracts.length} contrats`,
    `${runtimeCount} dans le graphe runtime, tous atteignables depuis ${graph.entry}`,
    `terminal ${graph.runtimeTerminal}`,
    `${graph.outOfRuntimeGraph.length} hors graphe runtime (${graph.outOfRuntimeGraph.map((entry) => entry.stepId).join(', ') || 'aucun'})`,
    `${graph.edges.length} arêtes (${graph.edges.filter((edge) => edge.kind === 'BACKWARD').length} à rebours)`,
    `${blueprints.blueprints.length} blueprints`,
    `${design.entries.length} fiches de conception détaillée`,
    `${design.findings.length} findings tous rattachés`,
    `${design.openDecisions.length} décisions ouvertes`,
    `verdict ${design.verdict}`,
    `${blueprints.runtimeTasksCreated} tâche runtime`
  ].join(', ') + '.');
}

if (process.argv[1] && process.argv[1].endsWith('gwc-verify.mjs')) {
  await main();
}
