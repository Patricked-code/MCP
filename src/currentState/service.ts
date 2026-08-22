import { getCurrentToolCatalog, type CurrentToolCatalog } from './toolCatalog.js';
import type { LiveStateEngine } from '../liveState/engine.js';
import type { LiveStateSnapshot } from '../liveState/types.js';
import type { GovernedSessionService, SessionRequest } from '../operationalMemory/sessionService.js';
import type { GovernedTaskQueue } from '../operationalMemory/taskQueue.js';
import type { GovernedSessionPublicRecord, GovernedTaskRecord, TaskStoreDocument } from '../operationalMemory/types.js';

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
  sessions: Pick<GovernedSessionService, 'listVisibleSessions'>;
  ready?: () => Promise<unknown>;
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
    .sort((left, right) => right.priority - left.priority || left.sequence - right.sequence)[0]
    ?? null;
}

export function createCurrentStateService(options: CurrentStateServiceOptions): CurrentStateService {
  const now = options.now ?? (() => new Date());
  const catalogue = options.catalogue ?? getCurrentToolCatalog;
  return {
    async getInventory(request) {
      await options.ready?.();
      const [liveState, workQueue, sessions] = await Promise.all([
        options.liveState.getCurrent(),
        options.tasks.listVisibleTasks(),
        options.sessions.listVisibleSessions(request)
      ]);
      const catalog = catalogue();
      const activeSessionIds = new Set(sessions
        .filter((session) => ['OPEN', 'ACTIVE', 'PAUSED'].includes(session.status))
        .map((session) => session.governedSessionId));
      const currentTask = workQueue.tasks
        .filter((task) => task.ownerGovernedSessionId && activeSessionIds.has(task.ownerGovernedSessionId))
        .sort((left, right) => left.sequence - right.sequence)[0] ?? null;
      const limitations = [
        ...(!liveState ? ['LIVE_STATE_UNAVAILABLE'] : []),
        ...(catalog.counts.tools === 0 ? ['RUNTIME_CATALOG_EMPTY'] : []),
        ...(liveState?.inventory?.status !== 'CURRENT' ? ['INVENTORY_NOT_CURRENT'] : [])
      ];
      const contradictions = [...new Set([
        ...(liveState?.contradictions ?? []),
        ...(liveState?.inventory?.contradictions.map((entry) => entry.code) ?? [])
      ])].slice(0, 100);
      return {
        schemaVersion: 1,
        generatedAt: now().toISOString(),
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
