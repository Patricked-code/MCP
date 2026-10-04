import type { TargetScope } from '../operationalMemory/targetScope.js';
import {
  TERMINAL_TASK_STATUSES,
  activeScopeConflict,
  executableTaskCandidates,
  foreignLockConflict,
  ownedResumableTask,
  taskClaimConflict,
  taskEligibleForSession,
  type ActiveLockProjection,
  type ReconcileIntentInput
} from '../operationalMemory/taskQueue.js';
import type { GovernedTaskRecord } from '../operationalMemory/types.js';
import {
  PROGRAM_REPOSITORY,
  buildProgramBlueprintIntent,
  type ProgramProjectionSnapshot,
  type ReadinessLibrary
} from './programBlueprintMaterialization.js';

/**
 * DISPATCH-03 (intake #222): the deterministic next work of a connected,
 * bootstrapped session, recomputed on every read from the existing
 * authorities (Governed Task Queue, Governed Session, Governed Lock Service
 * and the Program Backlog projection deployed with this revision).
 *
 * Order: resume the session's own active work, else the first compatible
 * executable task, else the first READY blueprint whose collision domains are
 * free. A locally blocked candidate is skipped, never a global stop. The
 * projection is a suggestion only: it never claims, never creates a task and
 * the suggested tool re-checks everything under its own guards.
 */
const MAX_SKIPPED = 20;
const MAX_SCOPES = 64;
const CLAIM_TOOL = 'mcp_claim_next_governed_task';
const MATERIALIZE_TOOL = 'mcp_materialize_program_blueprint';

export type ProgramNextWorkSource = ProgramProjectionSnapshot & { library: ReadinessLibrary };

export type NextWorkMode = 'RESUME_OWNED' | 'CLAIM_EXISTING' | 'MATERIALIZE_BLUEPRINT' | 'NONE';

export type NextWorkSkip =
  | { taskId: string; reasonCode: string }
  | { blueprintId: string; reasonCode: string };

export type NextWorkProjection = {
  schemaVersion: 1;
  projectionKind: 'READ_ONLY_CONNECTED_AGENT_NEXT_WORK';
  selectionMode: 'RESUME_OWNED_THEN_CLAIM_THEN_FIRST_COLLISION_FREE_BLUEPRINT';
  authoritative: false;
  claimsAutomatically: false;
  createsRuntimeTask: false;
  /** Session the projection was computed for; null when unbound. */
  governedSessionId: string | null;
  mode: NextWorkMode;
  tool: typeof CLAIM_TOOL | typeof MATERIALIZE_TOOL | null;
  taskId: string | null;
  blueprintId: string | null;
  title: string | null;
  intentKey: string | null;
  resourceScopes: string[];
  programProjectionDigest: string | null;
  githubOnlyPossible: boolean | null;
  skipped: NextWorkSkip[];
  skippedTruncated: boolean;
  reasonCodes: string[];
};

export type NextWorkInput = {
  sessionId: string | null;
  /** Repository of the bound session; absent means the MCP repository. */
  sessionRepository?: string | null;
  sessionTargetScope: TargetScope | null;
  tasks: readonly GovernedTaskRecord[];
  activeLocks: readonly ActiveLockProjection[];
  program: ProgramNextWorkSource | null;
};

type Selection = Partial<Omit<
  NextWorkProjection,
  'governedSessionId' | 'mode' | 'reasonCodes' | 'skipped' | 'skippedTruncated'
>>;

function project(
  governedSessionId: string | null,
  mode: NextWorkMode,
  reasonCodes: string[],
  skipped: NextWorkSkip[],
  selection: Selection = {}
): NextWorkProjection {
  return {
    schemaVersion: 1,
    projectionKind: 'READ_ONLY_CONNECTED_AGENT_NEXT_WORK',
    selectionMode: 'RESUME_OWNED_THEN_CLAIM_THEN_FIRST_COLLISION_FREE_BLUEPRINT',
    authoritative: false,
    claimsAutomatically: false,
    createsRuntimeTask: false,
    governedSessionId,
    mode,
    tool: null,
    taskId: null,
    blueprintId: null,
    title: null,
    intentKey: null,
    resourceScopes: [],
    programProjectionDigest: null,
    githubOnlyPossible: null,
    ...selection,
    skipped: skipped.slice(0, MAX_SKIPPED),
    skippedTruncated: skipped.length > MAX_SKIPPED,
    reasonCodes
  };
}

function taskSelection(task: GovernedTaskRecord): Selection {
  return {
    tool: CLAIM_TOOL,
    taskId: task.taskId,
    title: task.title,
    intentKey: task.intentKey,
    resourceScopes: [...task.resourceScopes].sort().slice(0, MAX_SCOPES)
  };
}

function boundedCode(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  return /^[A-Z][A-Z0-9_]{2,79}$/.test(message) ? message : fallback;
}

function withSkipped(reasonCode: string, skipped: NextWorkSkip[]): string[] {
  return skipped.length > 0 ? [reasonCode, 'LOCAL_BLOCKER_SKIPPED'] : [reasonCode];
}

function selectBlueprint(
  program: ProgramNextWorkSource,
  tasks: readonly GovernedTaskRecord[],
  locks: readonly ActiveLockProjection[],
  sessionId: string,
  skipped: NextWorkSkip[]
): NextWorkProjection | 'PROGRAM_PROJECTION_UNAVAILABLE' | null {
  let readyIds: string[];
  let records: Array<{ id?: unknown; githubOnlyPossible?: unknown }>;
  let library: ReadinessLibrary;
  try {
    const derived = program.library.deriveProgramReadiness(program.projection);
    if (!Array.isArray(derived?.readyBlueprintIds)) return 'PROGRAM_PROJECTION_UNAVAILABLE';
    readyIds = derived.readyBlueprintIds.filter((id): id is string => typeof id === 'string');
    const blueprints = (program.projection as { taskBlueprints?: unknown } | null)?.taskBlueprints;
    records = Array.isArray(blueprints) ? blueprints : [];
    // The materialization guard re-derives readiness: reuse this derivation.
    library = { deriveProgramReadiness: () => derived };
  } catch {
    return 'PROGRAM_PROJECTION_UNAVAILABLE';
  }

  for (const blueprintId of readyIds) {
    let intent: ReconcileIntentInput;
    try {
      ({ intent } = buildProgramBlueprintIntent(program, blueprintId, library));
    } catch (error) {
      skipped.push({ blueprintId, reasonCode: boundedCode(error, 'PROGRAM_BLUEPRINT_INVALID') });
      continue;
    }
    // Same order as intent reconciliation: same intent, foreign lock, active scope.
    const sameIntent = tasks.find((task) => task.intentKey === intent.intentKey && task.targetScope === undefined);
    const reasonCode = sameIntent
      ? (TERMINAL_TASK_STATUSES.has(sameIntent.status) ? 'PROGRAM_BLUEPRINT_TASK_TERMINAL' : 'EQUIVALENT_OR_COLLIDING_TASK_ACTIVE')
      : foreignLockConflict(locks, intent.resourceScopes, sessionId)
        ? 'TASK_LOCK_CONFLICT'
        : activeScopeConflict(tasks, intent.resourceScopes)
          ? 'EQUIVALENT_OR_COLLIDING_TASK_ACTIVE'
          : null;
    if (reasonCode) {
      skipped.push({ blueprintId, reasonCode });
      continue;
    }
    const record = records.find((entry) => entry?.id === blueprintId);
    return project(sessionId, 'MATERIALIZE_BLUEPRINT', withSkipped('PROGRAM_BLUEPRINT_READY', skipped), skipped, {
      tool: MATERIALIZE_TOOL,
      blueprintId,
      title: intent.title,
      intentKey: intent.intentKey,
      resourceScopes: intent.resourceScopes,
      programProjectionDigest: program.digest,
      githubOnlyPossible: typeof record?.githubOnlyPossible === 'boolean' ? record.githubOnlyPossible : null
    });
  }
  return null;
}

/** NONE projection for a caller that could not compute the next work. */
export function nextWorkUnavailable(governedSessionId: string | null, reasonCode: string): NextWorkProjection {
  return project(governedSessionId, 'NONE', [reasonCode], []);
}

export function deriveNextWork(input: NextWorkInput): NextWorkProjection {
  const skipped: NextWorkSkip[] = [];
  const sessionId = input.sessionId;
  if (!sessionId) return project(null, 'NONE', ['SESSION_UNBOUND'], skipped);

  const owned = ownedResumableTask(input.tasks, sessionId);
  if (owned) return project(sessionId, 'RESUME_OWNED', ['OWNED_TASK_RESUMABLE'], skipped, taskSelection(owned));

  const sessionTargetScope = input.sessionTargetScope ?? null;
  const candidates = executableTaskCandidates(
    input.tasks,
    (task) => taskEligibleForSession(task, { sessionTargetScope })
  );
  for (const candidate of candidates) {
    const conflict = taskClaimConflict(input.tasks, candidate, input.activeLocks, sessionId);
    if (conflict) {
      skipped.push({ taskId: candidate.taskId, reasonCode: conflict });
      continue;
    }
    return project(sessionId, 'CLAIM_EXISTING', withSkipped('EXECUTABLE_TASK_AVAILABLE', skipped), skipped, taskSelection(candidate));
  }

  const reasonCodes = ['NO_COMPATIBLE_WORK'];
  const programSession = sessionTargetScope === null
    && (input.sessionRepository ?? PROGRAM_REPOSITORY) === PROGRAM_REPOSITORY;
  if (!input.program) {
    reasonCodes.push('PROGRAM_PROJECTION_UNAVAILABLE');
  } else if (!programSession) {
    reasonCodes.push('PROGRAM_BLUEPRINT_REQUIRES_MCP_SESSION');
  } else {
    const selected = selectBlueprint(input.program, input.tasks, input.activeLocks, sessionId, skipped);
    if (selected === 'PROGRAM_PROJECTION_UNAVAILABLE') reasonCodes.push(selected);
    else if (selected) return selected;
  }
  return project(sessionId, 'NONE', reasonCodes, skipped);
}
