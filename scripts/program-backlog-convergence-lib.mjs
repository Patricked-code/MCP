const ALLOWED_DISPOSITIONS = new Set([
  'DONE',
  'ACTIVE',
  'READY',
  'PARTIALLY_IMPLEMENTED',
  'DESIGNED_NOT_IMPLEMENTED',
  'KNOWN_NOT_ANALYZED',
  'NEEDS_RECONCILIATION',
  'DEFERRED',
  'CONDITIONAL',
  'SUPERSEDED',
  'DUPLICATE',
  'COMPOSABLE',
  'NEEDS_DECISION'
]);

function duplicates(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function extractUncheckedTodo(markdown) {
  let section = 'ROOT';
  const items = [];
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^#{2,4}\s+(.+?)\s*$/);
    if (heading) section = heading[1].trim();
    const checkbox = line.match(/^\s*-\s*\[ \]\s+(.+?)\s*$/);
    if (checkbox) {
      items.push({
        section,
        text: checkbox[1].trim()
      });
    }
  }
  return items;
}

export function extractRoadmapProgramHeadings(markdown) {
  const headings = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^(#{2,4})\s+(.+?)\s*$/);
    if (!match) continue;
    const title = match[2].trim();
    if (
      /^(?:A1|A2\.[12]|A3|B[1-3]|C[0-5]|D[1-3]|E[1-3]|G[1-3]|I[1-3]|J[1-4])\s+—/.test(title)
      || /^CHANTIER (?:F|H|K)\s+—/.test(title)
      || /^GitHub-first Operational Continuity V1\s+—/.test(title)
      || /^Programme post-intégration\s+—/.test(title)
    ) {
      headings.push(title);
    }
  }
  return headings;
}

function sourceKey(record) {
  return record.sourceKey;
}

const ALLOWED_BLUEPRINT_READINESS = new Set(['DONE', 'READY', 'BLOCKED', 'DEFERRED', 'CONDITIONAL']);

const GUARDED_BLUEPRINT_READINESS = new Set(['DEFERRED', 'CONDITIONAL']);

const NON_HUMAN_GATE_KINDS = new Set(['EVIDENCE', 'CONCRETE_NEED', 'POLICY_CONDITION']);

// Human gate conditions that stay human even when a technically compliant solution is deducible.
const HUMAN_RESERVED_GATE_CONDITIONS = new Set([
  'PREEXISTING_AUTHORITY_RESERVES_DECISION',
  'DESTRUCTIVE_OR_IRREVERSIBLE_NOT_AUTHORIZED',
  'EXTERNAL_HUMAN_PERMISSION_OR_CONSENT_REQUIRED',
  'REQUIRED_SECRET_UNOBTAINABLE',
  'SECURITY_OR_COMPLIANCE_GATE_REQUIRES_HUMAN'
]);

function isSelfReference(source, selfReferences) {
  return selfReferences.some((reference) => (
    source === reference
    || source.startsWith(`${reference}#`)
    || source.startsWith(`${reference}:`)
  ));
}

/**
 * Intake #221: a gate may stop autonomy as a human gate only when it cites an
 * admissible condition and a pre-existing authority outside the program
 * projection itself. A deducible technical choice is decided, not escalated.
 * Pure evaluation: no task, claim, lock or permission is ever produced.
 */
export function evaluateHumanGateAdmissibility(gate, policy) {
  const base = {
    gateId: gate?.id ?? null,
    createsRuntimeTask: false,
    grantsPermission: false
  };
  const kind = gate?.kind;
  if (NON_HUMAN_GATE_KINDS.has(kind)) {
    return { ...base, verdict: 'EVIDENCE_GATE', reasonCode: `${kind}_GATE` };
  }
  if (kind !== 'HUMAN_DECISION') {
    return { ...base, verdict: 'INADMISSIBLE', reasonCode: 'UNKNOWN_GATE_KIND' };
  }

  const admissibleConditions = new Set(policy?.admissibleHumanGateConditions ?? []);
  const condition = gate.admissibleCondition;
  if (typeof condition !== 'string' || !admissibleConditions.has(condition)) {
    return { ...base, verdict: 'INADMISSIBLE', reasonCode: 'NO_ADMISSIBLE_HUMAN_GATE_CONDITION' };
  }

  const selfReferences = (policy?.selfReferencesAreNotAuthority ?? [])
    .filter((value) => typeof value === 'string' && value.length > 0);
  const sources = (Array.isArray(gate.authoritySources) ? gate.authoritySources : [])
    .filter((value) => typeof value === 'string' && value.trim().length > 0);
  const preexisting = sources.filter((source) => !isSelfReference(source, selfReferences));
  if (preexisting.length === 0) {
    return {
      ...base,
      verdict: 'INADMISSIBLE',
      reasonCode: sources.length === 0 ? 'NO_PREEXISTING_AUTHORITY_SOURCE' : 'SELF_CREATED_HUMAN_GATE'
    };
  }

  if (gate.deducibleCompliantSolution === true && !HUMAN_RESERVED_GATE_CONDITIONS.has(condition)) {
    return { ...base, verdict: 'AUTO_DECIDE', reasonCode: 'DEDUCIBLE_TECHNICAL_DECISION' };
  }
  if (condition === 'UNRESOLVABLE_SAME_RANK_AUTHORITY_CONTRADICTION') {
    return { ...base, verdict: 'FAIL_CLOSED_HUMAN_GATE', reasonCode: condition };
  }
  return { ...base, verdict: 'HUMAN_GATE', reasonCode: condition };
}

const ADMISSIBLE_GATE_VERDICTS = new Set(['HUMAN_GATE', 'FAIL_CLOSED_HUMAN_GATE', 'EVIDENCE_GATE']);

function validateExplicitGates(projection, blueprints) {
  const policy = projection?.executionModel?.humanGatePolicy;
  const catalog = policy?.gateCatalog && typeof policy.gateCatalog === 'object' ? policy.gateCatalog : {};
  const uncataloguedGates = [];
  const inadmissibleHumanGates = [];

  for (const entry of blueprints) {
    const gates = Array.isArray(entry?.readiness?.requiredExplicitGates)
      ? entry.readiness.requiredExplicitGates
      : [];
    for (const gateId of gates) {
      const gate = Object.prototype.hasOwnProperty.call(catalog, gateId) ? catalog[gateId] : null;
      if (!gate) {
        uncataloguedGates.push({ id: entry.id ?? null, gateId });
        continue;
      }
      const evaluation = evaluateHumanGateAdmissibility({ id: gateId, ...gate }, policy);
      if (!ADMISSIBLE_GATE_VERDICTS.has(evaluation.verdict)) {
        inadmissibleHumanGates.push({
          id: entry.id ?? null,
          gateId,
          verdict: evaluation.verdict,
          reasonCode: evaluation.reasonCode
        });
      }
    }
  }

  return { uncataloguedGates, inadmissibleHumanGates };
}

function programWaveOrder(projection) {
  return new Map(
    (projection?.executionModel?.waves ?? []).map((wave, index) => [wave.id, index])
  );
}

export function deriveProgramReadiness(projection) {
  const blueprints = Array.isArray(projection?.taskBlueprints) ? projection.taskBlueprints : [];
  const byId = new Map(blueprints.map((entry) => [entry.id, entry]));
  const waveOrder = programWaveOrder(projection);

  const derivedBlueprints = blueprints.map((entry, programOrder) => {
    const currentState = entry?.readiness?.state ?? 'BLOCKED';
    const guarded = GUARDED_BLUEPRINT_READINESS.has(currentState)
      || entry?.readiness?.autoPromotable === false;
    const dependencies = Array.isArray(entry.dependsOn) ? entry.dependsOn : [];
    const missingDependencies = dependencies.filter((dependency) => !byId.has(dependency));
    const incompleteDependencies = dependencies.filter(
      (dependency) => byId.get(dependency)?.readiness?.state !== 'DONE'
    );

    let derivedState = currentState;
    if (currentState === 'DONE') {
      derivedState = 'DONE';
    } else if (guarded) {
      derivedState = currentState;
    } else if (missingDependencies.length > 0 || incompleteDependencies.length > 0) {
      derivedState = 'BLOCKED';
    } else {
      derivedState = 'READY';
    }

    return {
      id: entry.id,
      waveId: entry.waveId,
      lotId: entry.lotId,
      title: entry.title,
      integrationSlot: entry.integrationSlot,
      resourceScopes: entry.resourceScopes ?? [],
      collisionDomains: entry.collisionDomains ?? [],
      currentState,
      derivedState,
      programOrder,
      waveOrder: waveOrder.get(entry.waveId) ?? Number.MAX_SAFE_INTEGER,
      dependencies,
      missingDependencies,
      incompleteDependencies,
      guarded,
      requiredExplicitGates: entry?.readiness?.requiredExplicitGates ?? []
    };
  });

  const readyBlueprints = derivedBlueprints
    .filter((entry) => entry.derivedState === 'READY')
    .sort((left, right) => (
      left.waveOrder - right.waveOrder
      || left.programOrder - right.programOrder
      || left.id.localeCompare(right.id)
    ));

  const drift = derivedBlueprints
    .filter((entry) => entry.currentState !== entry.derivedState)
    .map((entry) => ({
      id: entry.id,
      currentState: entry.currentState,
      derivedState: entry.derivedState,
      incompleteDependencies: entry.incompleteDependencies,
      missingDependencies: entry.missingDependencies
    }));

  const storedReady = Array.isArray(projection?.executionModel?.currentReadyBlueprintIds)
    ? projection.executionModel.currentReadyBlueprintIds
    : null;
  const derivedReady = readyBlueprints.map((entry) => entry.id);
  const storedReadyDrift = storedReady === null
    ? []
    : (
      storedReady.length === derivedReady.length
      && storedReady.every((id, index) => id === derivedReady[index])
        ? []
        : [{ storedReadyBlueprintIds: storedReady, derivedReadyBlueprintIds: derivedReady }]
    );

  return {
    authority: 'PROGRAM_BACKLOG_DERIVED_READINESS',
    runtimeSideEffects: false,
    createsRuntimeTasks: false,
    blueprints: derivedBlueprints,
    readyBlueprintIds: derivedReady,
    drift,
    storedReadyDrift
  };
}

export function selectProgramCandidates(projection) {
  const derived = deriveProgramReadiness(projection);
  const byId = new Map((projection?.taskBlueprints ?? []).map((entry) => [entry.id, entry]));

  return {
    selectionMode: 'FIRST_COLLISION_FREE_IN_PROGRAM_ORDER',
    runtimeAuthorityConsulted: false,
    canClaim: false,
    canMutate: false,
    requiresLiveCollisionCheck: true,
    requiresRuntimeAuthorityReobservation: true,
    candidates: derived.readyBlueprintIds.map((id) => {
      const entry = byId.get(id);
      return {
        id,
        waveId: entry?.waveId ?? null,
        lotId: entry?.lotId ?? null,
        title: entry?.title ?? null,
        integrationSlot: entry?.integrationSlot ?? null,
        resourceScopes: entry?.resourceScopes ?? [],
        collisionDomains: entry?.collisionDomains ?? []
      };
    })
  };
}

export function applyDerivedProgramReadiness(projection) {
  const next = structuredClone(projection);
  const derived = deriveProgramReadiness(next);
  const byId = new Map(derived.blueprints.map((entry) => [entry.id, entry]));

  for (const blueprint of next.taskBlueprints ?? []) {
    const state = byId.get(blueprint.id);
    if (!state) continue;
    if (blueprint.readiness.state === 'DONE') continue;
    if (GUARDED_BLUEPRINT_READINESS.has(blueprint.readiness.state)) continue;
    if (blueprint.readiness.autoPromotable === false) continue;
    blueprint.readiness.state = state.derivedState;
  }

  const refreshed = deriveProgramReadiness(next);
  next.executionModel.currentReadyBlueprintIds = refreshed.readyBlueprintIds;
  const firstReady = refreshed.blueprints.find(
    (entry) => entry.id === refreshed.readyBlueprintIds[0]
  );
  if (firstReady) next.executionModel.currentWave = firstReady.waveId;

  return {
    projection: next,
    derived: refreshed
  };
}

function detectBlueprintCycles(blueprints) {
  const byId = new Map(blueprints.map((entry) => [entry.id, entry]));
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycles = new Set();

  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const index = stack.indexOf(id);
      cycles.add([...stack.slice(index), id].join(' -> '));
      return;
    }
    const entry = byId.get(id);
    if (!entry) return;
    visiting.add(id);
    stack.push(id);
    for (const dependency of entry.dependsOn ?? []) visit(dependency);
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }

  for (const entry of blueprints) visit(entry.id);
  return [...cycles].sort();
}

function isGuardedBlueprint(entry) {
  return entry?.readiness?.state !== 'DONE' && (
    GUARDED_BLUEPRINT_READINESS.has(entry?.readiness?.state)
    || entry?.readiness?.autoPromotable === false
  );
}

/**
 * Intakes #235/#236: the global terminal acceptance must be reachable from
 * every mandatory (non-DONE, non-guarded) blueprint, and an untriggered
 * CONDITIONAL/DEFERRED lot must never gate it. Pure check: nothing is claimed.
 */
function validateTerminalAcceptance(projection, blueprints) {
  const terminalId = projection?.executionModel?.terminalCondition?.globalAcceptanceBlueprintId;
  if (terminalId === undefined) return [];
  const byId = new Map(blueprints.map((entry) => [entry.id, entry]));
  const terminal = typeof terminalId === 'string' ? byId.get(terminalId) : undefined;
  if (!terminal) return [{ id: terminalId ?? null, reasonCode: 'TERMINAL_ACCEPTANCE_BLUEPRINT_MISSING' }];
  if (isGuardedBlueprint(terminal)) return [{ id: terminalId, reasonCode: 'TERMINAL_ACCEPTANCE_BLUEPRINT_GUARDED' }];

  const dependencies = (entry) => (Array.isArray(entry?.dependsOn) ? entry.dependsOn : []);
  const ancestors = new Set();
  const pending = [...dependencies(terminal)];
  while (pending.length > 0) {
    const id = pending.pop();
    if (ancestors.has(id)) continue;
    ancestors.add(id);
    pending.push(...dependencies(byId.get(id)));
  }

  const gaps = [];
  for (const entry of blueprints) {
    if (entry.id === terminalId || entry?.readiness?.state === 'DONE') continue;
    if (isGuardedBlueprint(entry)) {
      if (ancestors.has(entry.id)) {
        gaps.push({ id: entry.id, reasonCode: 'GUARDED_BLUEPRINT_BLOCKS_TERMINAL_ACCEPTANCE' });
      }
    } else if (!ancestors.has(entry.id)) {
      gaps.push({ id: entry.id ?? null, reasonCode: 'NOT_ANCESTOR_OF_TERMINAL_ACCEPTANCE' });
    }
  }
  return gaps.sort((left, right) => String(left.id).localeCompare(String(right.id)));
}

function validateTaskBlueprints(projection, workItems) {
  const blueprints = Array.isArray(projection?.taskBlueprints) ? projection.taskBlueprints : [];
  const waves = Array.isArray(projection?.executionModel?.waves) ? projection.executionModel.waves : [];
  const workItemIds = new Set(workItems.map((entry) => entry.id));
  const waveIds = new Set(waves.map((entry) => entry.id));
  const blueprintIds = new Set(blueprints.map((entry) => entry.id));

  const duplicateTaskBlueprintIds = duplicates(
    blueprints.map((entry) => entry?.id).filter((value) => typeof value === 'string')
  );
  const unknownBlueprintWorkItems = blueprints
    .filter((entry) => typeof entry.workItemId !== 'string' || !workItemIds.has(entry.workItemId))
    .map((entry) => ({ id: entry.id ?? null, workItemId: entry.workItemId ?? null }));
  const unknownBlueprintWaves = blueprints
    .filter((entry) => typeof entry.waveId !== 'string' || !waveIds.has(entry.waveId))
    .map((entry) => ({ id: entry.id ?? null, waveId: entry.waveId ?? null }));
  const unknownBlueprintDependencies = blueprints.flatMap((entry) =>
    Array.isArray(entry.dependsOn)
      ? entry.dependsOn
          .filter((dependency) => !blueprintIds.has(dependency))
          .map((dependency) => ({ id: entry.id, dependency }))
      : [{ id: entry.id ?? null, dependency: null }]
  );
  const incompleteTaskBlueprints = blueprints
    .filter((entry) => (
      typeof entry.id !== 'string'
      || typeof entry.workItemId !== 'string'
      || typeof entry.waveId !== 'string'
      || typeof entry.lotId !== 'string'
      || typeof entry.title !== 'string'
      || typeof entry.objective !== 'string'
      || typeof entry.integrationSlot !== 'string'
      || typeof entry.integrationStrategy !== 'string'
      || !Array.isArray(entry.dependsOn)
      || !Array.isArray(entry.existingAuthorities)
      || !Array.isArray(entry.resourceScopes)
      || !Array.isArray(entry.collisionDomains)
      || !Array.isArray(entry.readAuthorities)
      || !Array.isArray(entry.writeAuthorities)
      || !Array.isArray(entry.redTests)
      || !Array.isArray(entry.greenAcceptance)
      || !Array.isArray(entry.regressionSuites)
      || !Array.isArray(entry.definitionOfDone)
      || typeof entry.readiness?.state !== 'string'
      || typeof entry.materialization?.mode !== 'string'
    ))
    .map((entry) => entry?.id ?? null);
  const invalidBlueprintReadiness = blueprints
    .filter((entry) => !ALLOWED_BLUEPRINT_READINESS.has(entry.readiness?.state))
    .map((entry) => ({ id: entry.id ?? null, state: entry.readiness?.state ?? null }));
  const invalidBlueprintMaterialization = blueprints
    .filter((entry) => (
      entry.materialization?.mode !== 'ON_DEMAND_AFTER_REOBSERVATION'
      || entry.materialization?.createsRuntimeTask !== false
      || entry.materialization?.runtimeAuthority !== 'Governed Task Queue'
      || entry.materialization?.requiresRuntimeAuthorityReobservation !== true
      || entry.materialization?.requiresCollisionCheck !== true
    ))
    .map((entry) => entry.id ?? null);
  const invalidGuardedBlueprints = blueprints
    .filter((entry) => (
      ['DEFERRED', 'CONDITIONAL'].includes(entry.readiness?.state)
      && (
        entry.readiness?.autoPromotable !== false
        || !Array.isArray(entry.readiness?.requiredExplicitGates)
        || entry.readiness.requiredExplicitGates.length === 0
      )
    ))
    .map((entry) => entry.id ?? null);
  const blueprintCycles = detectBlueprintCycles(blueprints);
  const { uncataloguedGates, inadmissibleHumanGates } = validateExplicitGates(projection, blueprints);
  const terminalAcceptanceGaps = validateTerminalAcceptance(projection, blueprints);

  const covered = new Set(blueprints.map((entry) => entry.workItemId));
  const missingFutureBlueprintCoverage = workItems
    .filter((entry) => entry.disposition !== 'DONE' && !covered.has(entry.id))
    .map((entry) => entry.id)
    .sort();

  return {
    duplicateTaskBlueprintIds,
    unknownBlueprintWorkItems,
    unknownBlueprintWaves,
    unknownBlueprintDependencies,
    incompleteTaskBlueprints,
    invalidBlueprintReadiness,
    invalidBlueprintMaterialization,
    invalidGuardedBlueprints,
    uncataloguedGates,
    inadmissibleHumanGates,
    terminalAcceptanceGaps,
    blueprintCycles,
    missingFutureBlueprintCoverage
  };
}

export function validateProgramBacklogConvergence({ projection, todo, roadmap, gwc, taskRegistry }) {
  const workItems = Array.isArray(projection?.workItems) ? projection.workItems : [];
  const coverage = projection?.sourceCoverage ?? {};

  const todoActual = extractUncheckedTodo(todo)
    .map((entry) => `${entry.section}\u0000${entry.text}`);
  const todoProjected = Array.isArray(coverage.todoUnchecked)
    ? coverage.todoUnchecked.map((entry) => `${entry.section}\u0000${entry.text}`)
    : [];

  const roadmapActual = extractRoadmapProgramHeadings(roadmap);
  const roadmapProjected = Array.isArray(coverage.roadmap)
    ? coverage.roadmap.map((entry) => entry.heading)
    : [];

  const blueprintActual = (gwc?.entries ?? []).map((entry) => entry.blueprintId);
  const blueprintProjected = Array.isArray(coverage.gwcBlueprints)
    ? coverage.gwcBlueprints.map((entry) => entry.sourceId)
    : [];

  const findingActual = (gwc?.findings ?? []).map((entry) => entry.finding);
  const findingProjected = Array.isArray(coverage.findings)
    ? coverage.findings.map((entry) => entry.sourceId)
    : [];

  const decisionActual = (gwc?.openDecisions ?? []).map((entry) => entry.id);
  const decisionProjected = Array.isArray(coverage.decisions)
    ? coverage.decisions.map((entry) => entry.sourceId)
    : [];

  const taskActual = (taskRegistry?.tasks ?? []).map((entry) => entry.taskId);
  const taskProjected = Array.isArray(coverage.taskRegistry)
    ? coverage.taskRegistry.map((entry) => entry.sourceId)
    : [];

  const allCoverage = Object.values(coverage)
    .flatMap((value) => Array.isArray(value) ? value : [])
    .filter((entry) => entry && typeof entry === 'object');

  const duplicateSourceKeys = duplicates(
    allCoverage.map(sourceKey).filter((value) => typeof value === 'string')
  );
  const duplicateWorkItemIds = duplicates(
    workItems.map((entry) => entry?.id).filter((value) => typeof value === 'string')
  );

  const workItemIds = new Set(workItems.map((entry) => entry.id));
  const unknownCoveredBy = allCoverage
    .filter((entry) => typeof entry.coveredBy !== 'string' || !workItemIds.has(entry.coveredBy))
    .map((entry) => ({
      sourceKey: entry.sourceKey ?? null,
      coveredBy: entry.coveredBy ?? null
    }));

  const invalidDispositions = workItems
    .filter((entry) => !ALLOWED_DISPOSITIONS.has(entry.disposition))
    .map((entry) => ({ id: entry.id, disposition: entry.disposition }));

  const referencedWorkItems = new Set(
    allCoverage
      .map((entry) => entry.coveredBy)
      .filter((value) => typeof value === 'string')
  );
  const unreferencedWorkItems = workItems
    .filter((entry) => typeof entry.id === 'string' && !referencedWorkItems.has(entry.id))
    .map((entry) => entry.id)
    .sort();

  const unknownDependencies = workItems.flatMap((entry) =>
    Array.isArray(entry.dependsOn)
      ? entry.dependsOn
          .filter((dependency) => !workItemIds.has(dependency))
          .map((dependency) => ({ id: entry.id, dependency }))
      : []
  );

  const incompleteWorkItems = workItems
    .filter((entry) => (
      typeof entry.id !== 'string'
      || typeof entry.title !== 'string'
      || typeof entry.integrationSlot !== 'string'
      || typeof entry.implementationMode !== 'string'
      || typeof entry.nextAction !== 'string'
      || !Array.isArray(entry.dependsOn)
      || !Array.isArray(entry.existingAuthorities)
      || !Array.isArray(entry.nonRegression)
    ))
    .map((entry) => entry?.id ?? null);

  const slots = new Map();
  for (const entry of workItems) {
    if (typeof entry.integrationSlot !== 'string') continue;
    const list = slots.get(entry.integrationSlot) ?? [];
    list.push(entry.id);
    slots.set(entry.integrationSlot, list);
  }
  const integrationSlotCollisions = [...slots.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([integrationSlot, ids]) => ({ integrationSlot, ids: sorted(ids) }))
    .sort((a, b) => a.integrationSlot.localeCompare(b.integrationSlot));

  const taskBlueprintValidation = validateTaskBlueprints(projection, workItems);

  const result = {
    missingTodo: sorted(todoActual.filter((value) => !todoProjected.includes(value))),
    extraTodo: sorted(todoProjected.filter((value) => !todoActual.includes(value))),
    missingRoadmap: sorted(roadmapActual.filter((value) => !roadmapProjected.includes(value))),
    extraRoadmap: sorted(roadmapProjected.filter((value) => !roadmapActual.includes(value))),
    missingBlueprints: sorted(blueprintActual.filter((value) => !blueprintProjected.includes(value))),
    extraBlueprints: sorted(blueprintProjected.filter((value) => !blueprintActual.includes(value))),
    missingFindings: sorted(findingActual.filter((value) => !findingProjected.includes(value))),
    extraFindings: sorted(findingProjected.filter((value) => !findingActual.includes(value))),
    missingDecisions: sorted(decisionActual.filter((value) => !decisionProjected.includes(value))),
    extraDecisions: sorted(decisionProjected.filter((value) => !decisionActual.includes(value))),
    missingTasks: sorted(taskActual.filter((value) => !taskProjected.includes(value))),
    extraTasks: sorted(taskProjected.filter((value) => !taskActual.includes(value))),
    duplicateSourceKeys,
    duplicateWorkItemIds,
    unknownCoveredBy,
    invalidDispositions,
    unreferencedWorkItems,
    unknownDependencies,
    incompleteWorkItems,
    integrationSlotCollisions,
    ...taskBlueprintValidation
  };

  result.ok = Object.entries(result)
    .filter(([key]) => key !== 'ok')
    .every(([, value]) => Array.isArray(value) && value.length === 0);

  return result;
}
