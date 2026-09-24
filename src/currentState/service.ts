import { getCurrentToolCatalog, type CurrentToolCatalog } from './toolCatalog.js';
import type { LiveStateEngine } from '../liveState/engine.js';
import type { LiveStateSnapshot } from '../liveState/types.js';
import type { GovernedLockService } from '../operationalMemory/lockService.js';
import type { GovernedSessionService, SessionRequest } from '../operationalMemory/sessionService.js';
import type { GovernedTaskQueue } from '../operationalMemory/taskQueue.js';
import type { GovernedSessionPublicRecord, GovernedTaskRecord, TaskStoreDocument } from '../operationalMemory/types.js';
import {
  projectCoordinationCheckpoint,
  projectGovernedSessionForCoordination,
  projectGovernedSessionLivenessForCoordination
} from '../governedWorkflow/adapters/session.js';
import {
  projectGovernedLocksForCoordination,
  projectGovernedTaskClaimForCoordination,
  projectGovernedTaskForCoordination
} from '../governedWorkflow/adapters/task.js';

export type CurrentStateCoordinationView = Readonly<{
  schemaVersion: 1;
  authoritative: false;
  projectionKind: 'READ_ONLY_AGENT_COORDINATION_SUPERVISION';
  observedAt: string;
  session: ReturnType<typeof projectGovernedSessionForCoordination> | null;
  task: ReturnType<typeof projectGovernedTaskForCoordination> | null;
  ownership: ReturnType<typeof projectGovernedTaskClaimForCoordination> | null;
  liveness: ReturnType<typeof projectGovernedSessionLivenessForCoordination>;
  locks: ReturnType<typeof projectGovernedLocksForCoordination>;
  checkpoint: ReturnType<typeof projectCoordinationCheckpoint> | null;
  collisionDomains: readonly string[];
  authorizationInferred: false;
  mutationPerformed: false;
}>;

export type CurrentStateInventory = {
  schemaVersion: 1;
  generatedAt: string;
  repository: 'Patricked-code/MCP';
  source: {
    liveStateVersion: number | null;
    githubHead: string | null;
    runtimeRevision: string | null;
    inventoryDigest: string | null;
    catalogueDigest: string;
    taskStoreRevision: number;
  };
  liveState: LiveStateSnapshot | null;
  catalogue: CurrentToolCatalog;
  architecture: NonNullable<LiveStateSnapshot['inventory']> | null;
  governance: NonNullable<LiveStateSnapshot['governance']> | null;
  auditBaseline: NonNullable<LiveStateSnapshot['auditBaseline']> | null;
  sessions: GovernedSessionPublicRecord[];
  workQueue: TaskStoreDocument;
  currentTask: GovernedTaskRecord | null;
  firstExecutableTask: GovernedTaskRecord | null;
  coordination: CurrentStateCoordinationView;
  bootstrap: {
    required: true;
    order: string[];
    limitations: string[];
  };
  contradictions: string[];
};

type CurrentStateServiceOptions = {
  liveState: Pick<LiveStateEngine, 'getCurrent'>;
  tasks: Pick<GovernedTaskQueue, 'listVisibleTasks'>;
  sessions: Pick<GovernedSessionService, 'listVisibleSessions' | 'lookupGovernedSessionId'>;
  locks?: Pick<GovernedLockService, 'listActiveLocks'>;
  coordinationLivenessFreshnessSeconds?: number;
  catalogue?: () => CurrentToolCatalog;
  now?: () => Date;
};

export type CurrentStateService = {
  getInventory(request: SessionRequest): Promise<CurrentStateInventory>;
};

function firstExecutable(tasks: GovernedTaskRecord[]): GovernedTaskRecord | null {
  const byId = new Map(tasks.map((task) => [task.taskId, task]));
  return [...tasks]
    .filter((task) => task.status === 'READY')
    .filter((task) => task.dependencies.every((dependency) => byId.get(dependency)?.status === 'DONE'))
    .sort((left, right) => right.priority - left.priority || left.sequence - right.sequence || left.taskId.localeCompare(right.taskId))[0]
    ?? null;
}

function completeCoordinationSession(
  session: GovernedSessionPublicRecord | null
): GovernedSessionPublicRecord | null {
  if (!session) return null;
  return (
    typeof session.agentIdentity === 'string'
    && typeof session.repository === 'string'
    && typeof session.lastHeartbeatAt === 'string'
    && typeof session.sessionRevision === 'number'
    && Array.isArray(session.blockers)
    && Array.isArray(session.lockIds)
    && 'lastCheckpoint' in session
    && 'nextAction' in session
  ) ? session : null;
}

function completeCoordinationTask(
  task: GovernedTaskRecord | null
): GovernedTaskRecord | null {
  if (!task) return null;
  return (
    typeof task.repository === 'string'
    && typeof task.status === 'string'
    && typeof task.taskRevision === 'number'
    && Array.isArray(task.resourceScopes)
    && Array.isArray(task.blockers)
    && 'nextAction' in task
  ) ? task : null;
}

export function createCurrentStateService(options: CurrentStateServiceOptions): CurrentStateService {
  const now = options.now ?? (() => new Date());
  const catalogue = options.catalogue ?? getCurrentToolCatalog;
  return {
    async getInventory(request) {
      const observedAt = now().toISOString();
      const [liveState, workQueue, sessions, activeLocks] = await Promise.all([
        options.liveState.getCurrent(),
        options.tasks.listVisibleTasks(),
        options.sessions.listVisibleSessions(request),
        options.locks?.listActiveLocks() ?? Promise.resolve([])
      ]);
      const catalog = catalogue();
      const requestedSessionId = options.sessions.lookupGovernedSessionId(
        request.transportSessionId
      );
      const requestedSession = requestedSessionId === null
        ? null
        : sessions.find((session) => (
            session.governedSessionId === requestedSessionId
            && ['OPEN', 'ACTIVE', 'PAUSED'].includes(session.status)
          )) ?? null;
      const requestedSessionIsActive = requestedSession !== null;
      const currentTask = requestedSessionIsActive
        ? workQueue.tasks
          .filter((task) => (
            task.ownerGovernedSessionId === requestedSessionId
            && !['DONE', 'CANCELLED', 'SUPERSEDED'].includes(task.status)
          ))
          .sort((left, right) => left.sequence - right.sequence)[0] ?? null
        : null;
      const limitations = [
        ...(!liveState ? ['LIVE_STATE_UNAVAILABLE'] : []),
        ...(catalog.counts.tools === 0 ? ['RUNTIME_CATALOG_EMPTY'] : []),
        ...(liveState?.inventory?.status !== 'CURRENT' ? ['INVENTORY_NOT_CURRENT'] : [])
      ];
      const contradictions = [...new Set([
        ...(liveState?.contradictions ?? []),
        ...(liveState?.inventory?.contradictions.map((entry) => entry.code) ?? [])
      ])].slice(0, 100);

      const coordinationSessionRecord = completeCoordinationSession(requestedSession);
      const coordinationTaskRecord = completeCoordinationTask(currentTask);
      const coordinationSession = coordinationSessionRecord
        ? projectGovernedSessionForCoordination(coordinationSessionRecord)
        : null;
      const coordinationTask = coordinationTaskRecord
        ? projectGovernedTaskForCoordination(coordinationTaskRecord)
        : null;
      const coordinationOwnership = coordinationTaskRecord
        ? projectGovernedTaskClaimForCoordination(coordinationTaskRecord)
        : null;
      const freshnessWindowSeconds = (
        Number.isSafeInteger(options.coordinationLivenessFreshnessSeconds)
        && (options.coordinationLivenessFreshnessSeconds ?? 0) > 0
      ) ? options.coordinationLivenessFreshnessSeconds! : 120;
      const coordinationLiveness = projectGovernedSessionLivenessForCoordination(
        coordinationSessionRecord,
        observedAt,
        freshnessWindowSeconds
      );
      const coordinationLocks = projectGovernedLocksForCoordination(activeLocks, observedAt);
      const coordinationCheckpoint = coordinationSessionRecord
        ? projectCoordinationCheckpoint(coordinationSessionRecord, coordinationTaskRecord)
        : null;
      const collisionDomains = Object.freeze([...new Set([
        ...(coordinationOwnership?.collisionDomains ?? []),
        ...coordinationLocks.collisionDomains
      ])].sort());
      const coordination: CurrentStateCoordinationView = Object.freeze({
        schemaVersion: 1,
        authoritative: false,
        projectionKind: 'READ_ONLY_AGENT_COORDINATION_SUPERVISION',
        observedAt,
        session: coordinationSession,
        task: coordinationTask,
        ownership: coordinationOwnership,
        liveness: coordinationLiveness,
        locks: coordinationLocks,
        checkpoint: coordinationCheckpoint,
        collisionDomains,
        authorizationInferred: false,
        mutationPerformed: false
      });
      return {
        schemaVersion: 1,
        generatedAt: observedAt,
        repository: 'Patricked-code/MCP',
        source: {
          liveStateVersion: liveState?.stateVersion ?? null,
          githubHead: liveState?.github.head ?? null,
          runtimeRevision: liveState?.runtime.revision ?? null,
          inventoryDigest: liveState?.inventory?.sourceDigest ?? null,
          catalogueDigest: catalog.catalogDigest,
          taskStoreRevision: workQueue.storeRevision
        },
        liveState,
        catalogue: catalog,
        architecture: liveState?.inventory ?? null,
        governance: liveState?.governance ?? null,
        auditBaseline: liveState?.auditBaseline ?? null,
        sessions: sessions.slice(0, 100),
        workQueue: { ...workQueue, tasks: workQueue.tasks.slice(0, 1_000) },
        currentTask,
        firstExecutableTask: firstExecutable(workQueue.tasks),
        coordination,
        bootstrap: {
          required: true,
          order: [
            'ping', 'mcp_reconcile_governed_context', 'mcp_get_current_state_inventory',
            'mcp_resume_governed_session_or_open', 'mcp_acknowledge_governed_context',
            'mcp_reconcile_agent_intent', 'mcp_claim_next_governed_task'
          ],
          limitations: [...new Set(limitations)].slice(0, 20)
        },
        contradictions
      };
    }
  };
}
