import { createHash, randomUUID } from 'node:crypto';

import { z } from 'zod';

import type { AtomicJsonStore } from './atomicStore.js';
import { NOOP_OPERATIONAL_AUDIT, type OperationalAudit } from './operationalAudit.js';
import {
  GovernedTaskRecordSchema,
  type GovernedTaskRecord,
  type GovernedTaskStatus,
  type TaskStoreDocument
} from './types.js';

const TERMINAL = new Set<GovernedTaskStatus>(['DONE', 'CANCELLED', 'SUPERSEDED']);
const ACTIVE = new Set<GovernedTaskStatus>([
  'READY', 'CLAIMED', 'IN_PROGRESS', 'REVIEW', 'MERGE_READY', 'DEPLOYING', 'VERIFYING', 'BLOCKED'
]);
const ALLOWED_TRANSITIONS: Readonly<Record<GovernedTaskStatus, ReadonlySet<GovernedTaskStatus>>> = {
  DISCOVERED: new Set(['READY', 'BLOCKED', 'CONFLICT', 'CANCELLED', 'SUPERSEDED']),
  READY: new Set(['CLAIMED', 'BLOCKED', 'CONFLICT', 'CANCELLED', 'SUPERSEDED']),
  CLAIMED: new Set(['IN_PROGRESS', 'READY', 'BLOCKED', 'CANCELLED', 'SUPERSEDED']),
  IN_PROGRESS: new Set(['REVIEW', 'BLOCKED', 'CANCELLED', 'SUPERSEDED']),
  REVIEW: new Set(['IN_PROGRESS', 'MERGE_READY', 'BLOCKED', 'CANCELLED', 'SUPERSEDED']),
  MERGE_READY: new Set(['DEPLOYING', 'BLOCKED', 'CANCELLED', 'SUPERSEDED']),
  DEPLOYING: new Set(['VERIFYING', 'BLOCKED', 'CANCELLED']),
  VERIFYING: new Set(['DONE', 'BLOCKED', 'IN_PROGRESS']),
  DONE: new Set(),
  BLOCKED: new Set(['READY', 'IN_PROGRESS', 'CANCELLED', 'SUPERSEDED']),
  CONFLICT: new Set(['READY', 'CANCELLED', 'SUPERSEDED']),
  CANCELLED: new Set(),
  SUPERSEDED: new Set()
};

const SeedTaskSchema = GovernedTaskRecordSchema.pick({
  taskId: true, repository: true, intentKey: true, title: true, summary: true,
  priority: true, sequence: true, status: true, dependencies: true,
  resourceScopes: true, blockers: true, nextAction: true
}).extend({
  requestDigest: z.string().regex(/^[0-9a-f]{64}$/)
}).strict();

export const TaskRegistrySeedSchema = z.object({
  schemaVersion: z.literal(1),
  registryVersion: z.number().int().positive(),
  generatedAt: z.string().datetime({ offset: true }),
  registryDigest: z.string().regex(/^[0-9a-f]{64}$/),
  tasks: z.array(SeedTaskSchema).max(5_000)
}).strict();
export type TaskRegistrySeed = z.infer<typeof TaskRegistrySeedSchema>;

export type IntentClassification = 'CONTINUATION' | 'NEW_TASK' | 'DUPLICATE' | 'CONFLICT' | 'BLOCKED' | 'OUT_OF_SCOPE';

export type ReconcileIntentInput = {
  repository: string;
  taskId?: string;
  intentKey: string;
  title: string;
  summary: string;
  priority: number;
  dependencies: string[];
  resourceScopes: string[];
};

export type TransitionTaskInput = {
  taskId: string;
  expectedTaskRevision: number;
  governedSessionId: string;
  status: GovernedTaskStatus;
  blockers?: string[];
  nextAction?: string | null;
  workBranch?: string | null;
  pullRequestNumber?: number | null;
  observedHeadSha?: string | null;
  runtimeRevision?: string | null;
};

export type GovernedTaskQueue = {
  initializeSeed(seed: TaskRegistrySeed): Promise<TaskStoreDocument>;
  reconcileIntent(input: ReconcileIntentInput, governedSessionId: string): Promise<{
    classification: IntentClassification;
    task: GovernedTaskRecord | null;
    firstExecutableTask: GovernedTaskRecord | null;
    storeRevision: number;
    reasonCode: string;
  }>;
  claimNextTask(governedSessionId: string, expectedStoreRevision: number): Promise<GovernedTaskRecord | null>;
  transitionTask(input: TransitionTaskInput): Promise<GovernedTaskRecord>;
  requeueTerminalSessionTasks(): Promise<number>;
  listVisibleTasks(): Promise<TaskStoreDocument>;
  getVisibleTask(taskId: string): Promise<GovernedTaskRecord | null>;
};

export type ActiveLockProjection = {
  scope: string;
  governedSessionId: string;
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function boundedIntentDigest(input: ReconcileIntentInput): string {
  return createHash('sha256').update(canonical(input)).digest('hex');
}

export function taskRegistryDigest(seed: Omit<TaskRegistrySeed, 'registryDigest'>): string {
  return createHash('sha256').update(canonical(seed)).digest('hex');
}

function fail(code: string): never {
  throw new Error(code);
}

function firstExecutable(tasks: GovernedTaskRecord[]): GovernedTaskRecord | null {
  const byId = new Map(tasks.map((task) => [task.taskId, task]));
  return [...tasks]
    .filter((task) => task.status === 'READY')
    .filter((task) => task.dependencies.every((dependency) => byId.get(dependency)?.status === 'DONE'))
    .sort((left, right) => right.priority - left.priority || left.sequence - right.sequence || left.taskId.localeCompare(right.taskId))[0]
    ?? null;
}

function activeScopeConflict(tasks: GovernedTaskRecord[], scopes: string[], taskId?: string): GovernedTaskRecord | null {
  const requested = new Set(scopes);
  return tasks.find((task) => task.taskId !== taskId
    && ACTIVE.has(task.status)
    && task.resourceScopes.some((scope) => requested.has(scope))) ?? null;
}

export function createGovernedTaskQueue(
  store: AtomicJsonStore<TaskStoreDocument>,
  now = () => new Date(),
  audit: OperationalAudit = NOOP_OPERATIONAL_AUDIT,
  listActiveLocks: () => Promise<ActiveLockProjection[]> = async () => [],
  listTerminalSessionIds: () => Promise<string[]> = async () => []
): GovernedTaskQueue {
  async function safeAudit(input: Parameters<OperationalAudit['record']>[0]): Promise<void> {
    try { await audit.record(input); } catch { /* audit must not alter task persistence */ }
  }
  return {
    async initializeSeed(rawSeed) {
      const seed = TaskRegistrySeedSchema.parse(rawSeed);
      const { registryDigest, ...unsigned } = seed;
      if (taskRegistryDigest(unsigned) !== registryDigest) fail('TASK_REGISTRY_DIGEST_MISMATCH');
      return store.update((document) => {
        if (document.seedRegistryVersion >= seed.registryVersion) return document;
        const byId = new Map(document.tasks.map((task) => [task.taskId, task]));
        const timestamp = now().toISOString();
        let nextSequence = document.nextSequence;
        for (const candidate of seed.tasks.sort((left, right) => left.sequence - right.sequence)) {
          if (byId.has(candidate.taskId)) continue;
          const sequence = Math.max(nextSequence, candidate.sequence);
          const { requestDigest, ...fields } = candidate;
          const record = GovernedTaskRecordSchema.parse({
            schemaVersion: 1,
            ...fields,
            sequence,
            ownerGovernedSessionId: null,
            workBranch: null,
            pullRequestNumber: null,
            observedHeadSha: null,
            runtimeRevision: null,
            source: { kind: 'seed', requestDigest },
            createdAt: timestamp,
            updatedAt: timestamp,
            taskRevision: 1
          });
          byId.set(record.taskId, record);
          nextSequence = sequence + 1;
        }
        return {
          ...document,
          storeRevision: document.storeRevision + 1,
          seedRegistryVersion: seed.registryVersion,
          nextSequence,
          tasks: [...byId.values()].sort((left, right) => left.sequence - right.sequence)
        };
      });
    },

    async reconcileIntent(rawInput, governedSessionId) {
      if (rawInput.repository !== 'Patricked-code/MCP') {
        const document = await store.read();
        return { classification: 'OUT_OF_SCOPE', task: null, firstExecutableTask: firstExecutable(document.tasks), storeRevision: document.storeRevision, reasonCode: 'repository_out_of_scope' };
      }
      const input = {
        ...rawInput,
        repository: 'Patricked-code/MCP' as const,
        dependencies: [...new Set(rawInput.dependencies)].sort(),
        resourceScopes: [...new Set(rawInput.resourceScopes)].sort()
      };
      const requestedScopes = new Set(input.resourceScopes);
      const externalLockConflict = (await listActiveLocks()).find((lock) => (
        lock.governedSessionId !== governedSessionId && requestedScopes.has(lock.scope)
      ));
      let result: Awaited<ReturnType<GovernedTaskQueue['reconcileIntent']>> | null = null;
      await store.update((document) => {
        const exact = input.taskId ? document.tasks.find((task) => task.taskId === input.taskId) : undefined;
        const sameIntent = exact ?? document.tasks.find((task) => task.intentKey === input.intentKey);
        if (sameIntent) {
          const classification: IntentClassification = TERMINAL.has(sameIntent.status)
            ? 'DUPLICATE'
            : externalLockConflict
              ? 'CONFLICT'
            : sameIntent.ownerGovernedSessionId && sameIntent.ownerGovernedSessionId !== governedSessionId
              ? 'CONFLICT'
              : 'CONTINUATION';
          result = {
            classification,
            task: sameIntent,
            firstExecutableTask: firstExecutable(document.tasks),
            storeRevision: document.storeRevision,
            reasonCode: externalLockConflict ? 'active_lock_scope_conflict' : `intent_${classification.toLowerCase()}`
          };
          return document;
        }
        const dependenciesReady = input.dependencies.every((dependency) => (
          document.tasks.find((task) => task.taskId === dependency)?.status === 'DONE'
        ));
        if (!dependenciesReady) {
          result = { classification: 'BLOCKED', task: null, firstExecutableTask: firstExecutable(document.tasks), storeRevision: document.storeRevision, reasonCode: 'dependency_not_done' };
          return document;
        }
        if (externalLockConflict) {
          result = { classification: 'CONFLICT', task: null, firstExecutableTask: firstExecutable(document.tasks), storeRevision: document.storeRevision, reasonCode: 'active_lock_scope_conflict' };
          return document;
        }
        const conflict = activeScopeConflict(document.tasks, input.resourceScopes);
        if (conflict) {
          result = { classification: 'CONFLICT', task: conflict, firstExecutableTask: firstExecutable(document.tasks), storeRevision: document.storeRevision, reasonCode: 'active_resource_scope_conflict' };
          return document;
        }
        if (document.tasks.length >= 5_000) fail('TASK_STORE_CAPACITY_EXCEEDED');
        const timestamp = now().toISOString();
        const day = timestamp.slice(0, 10).replaceAll('-', '');
        const ordinal = document.tasks.reduce((maximum, task) => {
          const match = task.taskId.match(new RegExp(`^TASK-${day}-([0-9]+)$`));
          return match ? Math.max(maximum, Number(match[1])) : maximum;
        }, 0) + 1;
        const taskId = input.taskId ?? `TASK-${day}-${String(ordinal).padStart(3, '0')}`;
        if (document.tasks.some((task) => task.taskId === taskId)) fail('TASK_ID_CONFLICT');
        const task = GovernedTaskRecordSchema.parse({
          schemaVersion: 1, taskId, repository: input.repository, intentKey: input.intentKey,
          title: input.title, summary: input.summary, priority: input.priority,
          sequence: document.nextSequence, status: 'READY', dependencies: input.dependencies,
          resourceScopes: input.resourceScopes, ownerGovernedSessionId: null,
          workBranch: null, pullRequestNumber: null, observedHeadSha: null, runtimeRevision: null,
          blockers: [], nextAction: 'claim_governed_task',
          source: { kind: 'agent', requestDigest: boundedIntentDigest(input) },
          createdAt: timestamp, updatedAt: timestamp, taskRevision: 1
        });
        const tasks = [...document.tasks, task];
        result = { classification: 'NEW_TASK', task, firstExecutableTask: firstExecutable(tasks), storeRevision: document.storeRevision + 1, reasonCode: 'new_task_enqueued' };
        return { ...document, storeRevision: document.storeRevision + 1, nextSequence: document.nextSequence + 1, tasks };
      });
      if (!result) fail('TASK_RECONCILE_FAILED');
      const reconciled = result as unknown as {
        classification: IntentClassification;
        task: GovernedTaskRecord | null;
        firstExecutableTask: GovernedTaskRecord | null;
        storeRevision: number;
        reasonCode: string;
      };
      await safeAudit({
        type: 'intent.reconciled', governedSessionId,
        taskId: reconciled.task?.taskId ?? null,
        classification: reconciled.classification,
        reasonCode: reconciled.reasonCode,
        storeRevision: reconciled.storeRevision
      });
      if (reconciled.classification === 'NEW_TASK' && reconciled.task) {
        await safeAudit({
          type: 'task.discovered', governedSessionId, task: reconciled.task,
          storeRevision: reconciled.storeRevision
        });
      }
      return reconciled;
    },

    async claimNextTask(governedSessionId, expectedStoreRevision) {
      let claimed: GovernedTaskRecord | null = null;
      await store.update(async (document) => {
        if (document.storeRevision !== expectedStoreRevision) fail('TASK_STORE_REVISION_MISMATCH');
        const candidate = firstExecutable(document.tasks);
        if (!candidate) return document;
        if (activeScopeConflict(document.tasks, candidate.resourceScopes, candidate.taskId)) fail('TASK_RESOURCE_CONFLICT');
        const candidateScopes = new Set(candidate.resourceScopes);
        const externalLockConflict = (await listActiveLocks()).some((lock) => (
          lock.governedSessionId !== governedSessionId && candidateScopes.has(lock.scope)
        ));
        if (externalLockConflict) fail('TASK_LOCK_CONFLICT');
        const timestamp = now().toISOString();
        claimed = { ...candidate, status: 'CLAIMED', ownerGovernedSessionId: governedSessionId, updatedAt: timestamp, nextAction: 'start_governed_task', taskRevision: candidate.taskRevision + 1 };
        return {
          ...document,
          storeRevision: document.storeRevision + 1,
          tasks: document.tasks.map((task) => task.taskId === candidate.taskId ? claimed as GovernedTaskRecord : task)
        };
      });
      if (claimed) {
        await safeAudit({
          type: 'task.claimed', governedSessionId, task: claimed,
          storeRevision: expectedStoreRevision + 1
        });
      }
      return claimed;
    },

    async transitionTask(input) {
      let transitioned: GovernedTaskRecord | null = null;
      let previousStatus: GovernedTaskStatus | null = null;
      let storeRevision = 0;
      await store.update((document) => {
        const current = document.tasks.find((task) => task.taskId === input.taskId);
        if (!current) fail('TASK_NOT_FOUND');
        if (current.taskRevision !== input.expectedTaskRevision) fail('TASK_REVISION_MISMATCH');
        if (current.ownerGovernedSessionId !== input.governedSessionId) fail('TASK_NOT_OWNED_BY_SESSION');
        if (!ALLOWED_TRANSITIONS[current.status].has(input.status)) fail('TASK_TRANSITION_FORBIDDEN');
        previousStatus = current.status;
        storeRevision = document.storeRevision + 1;
        transitioned = GovernedTaskRecordSchema.parse({
          ...current,
          status: input.status,
          blockers: input.blockers ?? current.blockers,
          nextAction: input.nextAction === undefined ? current.nextAction : input.nextAction,
          workBranch: input.workBranch === undefined ? current.workBranch : input.workBranch,
          pullRequestNumber: input.pullRequestNumber === undefined ? current.pullRequestNumber : input.pullRequestNumber,
          observedHeadSha: input.observedHeadSha === undefined ? current.observedHeadSha : input.observedHeadSha,
          runtimeRevision: input.runtimeRevision === undefined ? current.runtimeRevision : input.runtimeRevision,
          updatedAt: now().toISOString(),
          taskRevision: current.taskRevision + 1
        });
        return {
          ...document,
          storeRevision: document.storeRevision + 1,
          tasks: document.tasks.map((task) => task.taskId === input.taskId ? transitioned as GovernedTaskRecord : task)
        };
      });
      if (!transitioned) fail('TASK_TRANSITION_FAILED');
      const finalTransition = transitioned as unknown as GovernedTaskRecord;
      await safeAudit({
        type: 'task.transitioned', governedSessionId: input.governedSessionId,
        task: finalTransition, previousStatus: previousStatus ?? 'UNKNOWN', storeRevision
      });
      if (finalTransition.status === 'DONE') {
        await safeAudit({
          type: 'task.completed', governedSessionId: input.governedSessionId,
          task: finalTransition, storeRevision
        });
      } else if (finalTransition.status === 'BLOCKED') {
        await safeAudit({
          type: 'task.blocked', governedSessionId: input.governedSessionId,
          task: finalTransition, storeRevision, reasonCode: 'task_transitioned_blocked'
        });
      }
      return finalTransition;
    },

    async requeueTerminalSessionTasks() {
      const terminalSessionIds = new Set(await listTerminalSessionIds());
      if (terminalSessionIds.size === 0) return 0;
      const requeued: Array<{
        task: GovernedTaskRecord;
        previousStatus: GovernedTaskStatus;
        governedSessionId: string;
      }> = [];
      let storeRevision = 0;
      await store.update((document) => {
        const timestamp = now().toISOString();
        const tasks = document.tasks.map((task) => {
          const governedSessionId = task.ownerGovernedSessionId;
          if (
            !governedSessionId
            || TERMINAL.has(task.status)
            || !terminalSessionIds.has(governedSessionId)
          ) return task;
          const next = GovernedTaskRecordSchema.parse({
            ...task,
            status: 'READY',
            ownerGovernedSessionId: null,
            blockers: [],
            nextAction: 'claim_governed_task',
            updatedAt: timestamp,
            taskRevision: task.taskRevision + 1
          });
          requeued.push({
            task: next,
            previousStatus: task.status,
            governedSessionId
          });
          return next;
        });
        if (requeued.length === 0) return document;
        storeRevision = document.storeRevision + 1;
        return { ...document, storeRevision, tasks };
      });
      for (const entry of requeued) {
        await safeAudit({
          type: 'task.transitioned',
          governedSessionId: entry.governedSessionId,
          task: entry.task,
          previousStatus: entry.previousStatus,
          storeRevision
        });
      }
      return requeued.length;
    },

    listVisibleTasks() {
      return store.read();
    },

    async getVisibleTask(taskId) {
      return (await store.read()).tasks.find((task) => task.taskId === taskId) ?? null;
    }
  };
}
