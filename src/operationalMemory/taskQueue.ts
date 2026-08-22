import { createHash } from 'node:crypto';

import type { AtomicJsonStore } from './atomicStore.js';
import {
  GovernedTaskSeedDocumentSchema,
  MAX_GOVERNED_TASK_RECORDS,
  type GovernedTaskRecord,
  type GovernedTaskSeedDocument,
  type GovernedTaskStatus,
  type GovernedTaskStoreDocument
} from './types.js';

const REPOSITORY = 'Patricked-code/MCP' as const;
const TERMINAL = new Set<GovernedTaskStatus>(['DONE', 'CANCELLED', 'SUPERSEDED']);
const TRANSITIONS: Record<GovernedTaskStatus, GovernedTaskStatus[]> = {
  DISCOVERED: ['READY', 'BLOCKED', 'CONFLICT', 'CANCELLED', 'SUPERSEDED'],
  READY: ['CLAIMED', 'BLOCKED', 'CONFLICT', 'CANCELLED', 'SUPERSEDED'],
  CLAIMED: ['IN_PROGRESS', 'READY', 'BLOCKED', 'CONFLICT', 'CANCELLED', 'SUPERSEDED'],
  IN_PROGRESS: ['REVIEW', 'BLOCKED', 'CONFLICT', 'CANCELLED', 'SUPERSEDED'],
  REVIEW: ['IN_PROGRESS', 'MERGE_READY', 'BLOCKED', 'CANCELLED', 'SUPERSEDED'],
  MERGE_READY: ['DEPLOYING', 'REVIEW', 'BLOCKED', 'CANCELLED', 'SUPERSEDED'],
  DEPLOYING: ['VERIFYING', 'BLOCKED'],
  VERIFYING: ['DONE', 'DEPLOYING', 'BLOCKED'],
  DONE: [],
  BLOCKED: ['READY', 'IN_PROGRESS', 'CANCELLED', 'SUPERSEDED'],
  CONFLICT: ['READY', 'BLOCKED', 'CANCELLED', 'SUPERSEDED'],
  CANCELLED: [],
  SUPERSEDED: []
};

export type IntentClassification =
  | 'CONTINUATION'
  | 'NEW_TASK'
  | 'DUPLICATE'
  | 'CONFLICT'
  | 'BLOCKED'
  | 'OUT_OF_SCOPE';

export type ReconcileTaskIntentInput = {
  repository: string;
  taskId?: string;
  intentKey: string;
  title: string;
  summary: string;
  priority: number;
  dependencies: string[];
  resourceScopes: string[];
  requestDigest: string;
};

export type GovernedTaskQueueAuditEvent = {
  type: 'intent.reconciled' | 'task.discovered' | 'task.claimed' | 'task.transitioned';
  taskId: string;
  classification?: IntentClassification;
  status: GovernedTaskStatus;
  taskRevision: number;
  requestDigest?: string;
};

export type GovernedTaskQueueServiceDependencies = {
  store: AtomicJsonStore<GovernedTaskStoreDocument>;
  seed: GovernedTaskSeedDocument;
  now?: () => Date;
  isScopeLocked?: (scope: string) => Promise<boolean>;
  audit?: (event: GovernedTaskQueueAuditEvent) => Promise<void>;
};

export type GovernedTaskQueueService = ReturnType<typeof createGovernedTaskQueueService>;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sortQueue(tasks: GovernedTaskRecord[]): GovernedTaskRecord[] {
  return [...tasks].sort((left, right) => (
    left.priority - right.priority
    || left.sequence - right.sequence
    || left.taskId.localeCompare(right.taskId)
  ));
}

function nextTaskId(tasks: GovernedTaskRecord[], now: Date): string {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '');
  const prefix = `TASK-${date}-`;
  const next = tasks.reduce((maximum, task) => {
    if (!task.taskId.startsWith(prefix)) return maximum;
    const value = Number.parseInt(task.taskId.slice(prefix.length), 10);
    return Number.isFinite(value) ? Math.max(maximum, value) : maximum;
  }, 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function seedRecord(
  task: GovernedTaskSeedDocument['tasks'][number],
  registryVersion: number,
  at: string
): GovernedTaskRecord {
  return {
    ...task,
    schemaVersion: 1,
    governedSessionId: null,
    workBranch: null,
    pullRequestNumber: null,
    ciHeadSha: null,
    mergeSha: null,
    runtimeRevision: null,
    blockers: [],
    requestDigest: sha256(`versioned_seed:${registryVersion}:${task.taskId}`),
    provenance: 'versioned_seed',
    createdAt: at,
    updatedAt: at,
    taskRevision: 0
  };
}

function dependenciesBlocked(taskIds: string[], tasks: GovernedTaskRecord[]): boolean {
  return taskIds.some((taskId) => tasks.find((task) => task.taskId === taskId)?.status !== 'DONE');
}

function scopesOverlap(left: string[], right: string[]): boolean {
  const scopes = new Set(left);
  return right.some((scope) => scopes.has(scope));
}

function activeScopeConflict(scopes: string[], tasks: GovernedTaskRecord[]): boolean {
  return tasks.some((task) => !TERMINAL.has(task.status) && scopesOverlap(scopes, task.resourceScopes));
}

async function anyScopeLocked(
  scopes: string[],
  isScopeLocked: (scope: string) => Promise<boolean>
): Promise<boolean> {
  for (const scope of scopes) {
    if (await isScopeLocked(scope)) return true;
  }
  return false;
}

function publicError(code: string): Error {
  return new Error(code);
}

export function createGovernedTaskQueueService(
  dependencies: GovernedTaskQueueServiceDependencies
) {
  const seed = GovernedTaskSeedDocumentSchema.parse(dependencies.seed);
  const now = dependencies.now ?? (() => new Date());
  const isScopeLocked = dependencies.isScopeLocked ?? (async () => false);
  const audit = dependencies.audit ?? (async () => undefined);
  let initialization: Promise<GovernedTaskStoreDocument> | null = null;

  function initialize(): Promise<GovernedTaskStoreDocument> {
    if (initialization) return initialization;
    initialization = (async () => {
      const current = await dependencies.store.read();
      const missing = seed.tasks.filter((task) => (
        !current.tasks.some((existing) => existing.taskId === task.taskId)
      ));
      if (missing.length === 0 && current.seededRegistryVersion >= seed.registryVersion) {
        return current;
      }
      return dependencies.store.update((latest) => {
        const at = now().toISOString();
        const additions = seed.tasks
          .filter((task) => !latest.tasks.some((existing) => existing.taskId === task.taskId))
          .map((task) => seedRecord(task, seed.registryVersion, at));
        if (latest.tasks.length + additions.length > MAX_GOVERNED_TASK_RECORDS) {
          throw publicError('TASK_STORE_CAPACITY_EXCEEDED');
        }
        return {
          ...latest,
          storeRevision: latest.storeRevision + 1,
          seededRegistryVersion: Math.max(latest.seededRegistryVersion, seed.registryVersion),
          tasks: [...latest.tasks, ...additions]
        };
      });
    })().catch((error) => {
      initialization = null;
      throw error;
    });
    return initialization;
  }

  async function reconcileIntent(input: ReconcileTaskIntentInput) {
    if (input.repository !== REPOSITORY) {
      throw publicError('TASK_INTENT_OUT_OF_SCOPE');
    }
    await initialize();
    const current = await dependencies.store.read();
    const equivalent = current.tasks.find((task) => (
      (input.taskId && task.taskId === input.taskId) || task.intentKey === input.intentKey
    ));
    if (equivalent) {
      const classification: IntentClassification = TERMINAL.has(equivalent.status)
        ? 'DUPLICATE'
        : 'CONTINUATION';
      await audit({
        type: 'intent.reconciled', taskId: equivalent.taskId, classification,
        status: equivalent.status, taskRevision: equivalent.taskRevision,
        requestDigest: input.requestDigest
      });
      return { classification, task: equivalent, storeRevision: current.storeRevision };
    }

    const blocked = dependenciesBlocked(input.dependencies, current.tasks);
    const conflict = !blocked && (
      activeScopeConflict(input.resourceScopes, current.tasks)
      || await anyScopeLocked(input.resourceScopes, isScopeLocked)
    );
    const classification: IntentClassification = blocked
      ? 'BLOCKED'
      : conflict ? 'CONFLICT' : 'NEW_TASK';
    let created!: GovernedTaskRecord;
    const updated = await dependencies.store.update((latest) => {
      const raced = latest.tasks.find((task) => (
        (input.taskId && task.taskId === input.taskId) || task.intentKey === input.intentKey
      ));
      if (raced) throw publicError('TASK_INTENT_ALREADY_RECONCILED');
      if (latest.tasks.length >= MAX_GOVERNED_TASK_RECORDS) {
        throw publicError('TASK_STORE_CAPACITY_EXCEEDED');
      }
      const at = now().toISOString();
      created = {
        schemaVersion: 1,
        taskId: input.taskId ?? nextTaskId(latest.tasks, now()),
        intentKey: input.intentKey,
        title: input.title,
        summary: input.summary,
        priority: input.priority,
        sequence: latest.tasks.reduce((maximum, task) => Math.max(maximum, task.sequence), 0) + 1,
        status: blocked ? 'BLOCKED' : conflict ? 'CONFLICT' : 'READY',
        dependencies: [...new Set(input.dependencies)].sort(),
        resourceScopes: [...new Set(input.resourceScopes)].sort(),
        governedSessionId: null,
        workBranch: null,
        pullRequestNumber: null,
        ciHeadSha: null,
        mergeSha: null,
        runtimeRevision: null,
        blockers: blocked ? ['dependency_not_done'] : conflict ? ['resource_conflict'] : [],
        nextAction: blocked ? 'resolve_task_dependencies' : conflict ? 'resolve_resource_conflict' : 'claim_task',
        requestDigest: input.requestDigest,
        provenance: 'runtime_intent',
        createdAt: at,
        updatedAt: at,
        taskRevision: 0
      };
      return {
        ...latest,
        storeRevision: latest.storeRevision + 1,
        tasks: [...latest.tasks, created]
      };
    });
    await audit({
      type: 'task.discovered', taskId: created.taskId, classification,
      status: created.status, taskRevision: created.taskRevision,
      requestDigest: created.requestDigest
    });
    return { classification, task: created, storeRevision: updated.storeRevision };
  }

  async function claimNextTask(input: {
    governedSessionId: string;
    expectedStoreRevision: number;
  }) {
    await initialize();
    let claimed!: GovernedTaskRecord;
    const updated = await dependencies.store.update(async (current) => {
      if (current.storeRevision !== input.expectedStoreRevision) {
        throw publicError('TASK_STORE_REVISION_MISMATCH');
      }
      const candidates = sortQueue(current.tasks).filter((task) => (
        task.status === 'READY' && !dependenciesBlocked(task.dependencies, current.tasks)
      ));
      let selected: GovernedTaskRecord | undefined;
      for (const candidate of candidates) {
        if (!await anyScopeLocked(candidate.resourceScopes, isScopeLocked)) {
          selected = candidate;
          break;
        }
      }
      if (!selected) throw publicError('NO_EXECUTABLE_TASK');
      const at = now().toISOString();
      claimed = {
        ...selected,
        status: 'CLAIMED',
        governedSessionId: input.governedSessionId,
        blockers: [],
        nextAction: 'start_task',
        updatedAt: at,
        taskRevision: selected.taskRevision + 1
      };
      return {
        ...current,
        storeRevision: current.storeRevision + 1,
        tasks: current.tasks.map((task) => task.taskId === selected.taskId ? claimed : task)
      };
    });
    await audit({
      type: 'task.claimed', taskId: claimed.taskId, status: claimed.status,
      taskRevision: claimed.taskRevision
    });
    return { task: claimed, storeRevision: updated.storeRevision };
  }

  async function transitionTask(input: {
    taskId: string;
    governedSessionId: string;
    expectedTaskRevision: number;
    status: GovernedTaskStatus;
    nextAction: string | null;
  }) {
    await initialize();
    let transitioned!: GovernedTaskRecord;
    const updated = await dependencies.store.update((current) => {
      const task = current.tasks.find((candidate) => candidate.taskId === input.taskId);
      if (!task) throw publicError('TASK_NOT_FOUND');
      if (task.taskRevision !== input.expectedTaskRevision) {
        throw publicError('TASK_REVISION_MISMATCH');
      }
      if (task.governedSessionId !== input.governedSessionId) {
        throw publicError('TASK_SESSION_MISMATCH');
      }
      if (!TRANSITIONS[task.status].includes(input.status)) {
        throw publicError('TASK_TRANSITION_NOT_ALLOWED');
      }
      transitioned = {
        ...task,
        status: input.status,
        nextAction: input.nextAction,
        updatedAt: now().toISOString(),
        taskRevision: task.taskRevision + 1
      };
      return {
        ...current,
        storeRevision: current.storeRevision + 1,
        tasks: current.tasks.map((candidate) => (
          candidate.taskId === task.taskId ? transitioned : candidate
        ))
      };
    });
    await audit({
      type: 'task.transitioned', taskId: transitioned.taskId,
      status: transitioned.status, taskRevision: transitioned.taskRevision
    });
    return { task: transitioned, storeRevision: updated.storeRevision };
  }

  async function listTasks() {
    await initialize();
    const current = await dependencies.store.read();
    return { storeRevision: current.storeRevision, tasks: sortQueue(current.tasks) };
  }

  async function getTask(taskId: string): Promise<GovernedTaskRecord> {
    await initialize();
    const task = (await dependencies.store.read()).tasks.find((candidate) => candidate.taskId === taskId);
    if (!task) throw publicError('TASK_NOT_FOUND');
    return task;
  }

  return { initialize, reconcileIntent, claimNextTask, transitionTask, listTasks, getTask };
}
