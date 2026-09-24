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
      || /^CHANTIER (?:F|H)\s+—/.test(title)
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
