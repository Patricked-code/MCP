import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { liveStateEngine } from '../liveState/engine.js';
import { createAtomicJsonStore } from '../operationalMemory/atomicStore.js';
import { operationalMemoryConfig } from '../operationalMemory/config.js';
import {
  createGovernedTaskQueue,
  TaskRegistrySeedSchema,
  type GovernedTaskQueue
} from '../operationalMemory/taskQueue.js';
import {
  TaskStoreDocumentSchema,
  createEmptyTaskStoreDocument
} from '../operationalMemory/types.js';
import type { GovernedSessionService } from '../operationalMemory/sessionService.js';
import {
  getGovernedSessionToolDependencies,
  sessionRequestFromToolExtra,
  type GovernedSessionToolExtra
} from './governedSessions.js';

const SessionIdSchema = z.string().uuid();
const ReceiptIdSchema = z.string().uuid();
const TaskIdSchema = z.string().regex(/^TASK-[0-9]{8}-[0-9]{3,}$/);
const ExpectedRevisionSchema = z.number().int().nonnegative();

export type GovernedTaskToolDependencies = {
  queue: GovernedTaskQueue;
  sessions: Pick<GovernedSessionService, 'getVisibleSession'>;
  liveState: Pick<typeof liveStateEngine, 'getCurrent'>;
  ready: () => Promise<unknown>;
  now?: () => Date;
};

let sharedDependencies: GovernedTaskToolDependencies | null = null;

export function getGovernedTaskToolDependencies(): GovernedTaskToolDependencies {
  if (sharedDependencies) return sharedDependencies;
  const store = createAtomicJsonStore({
    filePath: operationalMemoryConfig.taskStorePath,
    schema: TaskStoreDocumentSchema,
    empty: createEmptyTaskStoreDocument
  });
  const operational = getGovernedSessionToolDependencies();
  const queue = createGovernedTaskQueue(
    store,
    undefined,
    operational.audit,
    () => operational.locks.listActiveLocks()
  );
  let initialization: Promise<void> | null = null;
  const ready = () => {
    initialization ??= readFile(path.join(process.cwd(), '.mcp', 'task-registry.json'), 'utf8')
      .then((content) => queue.initializeSeed(TaskRegistrySeedSchema.parse(JSON.parse(content))))
      .then(() => undefined);
    return initialization;
  };
  sharedDependencies = {
    queue,
    sessions: operational.sessions,
    liveState: liveStateEngine,
    ready
  };
  return sharedDependencies;
}

function boundedErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return /^[A-Z][A-Z0-9_]{2,79}$/.test(message) ? message : 'GOVERNED_TASK_OPERATION_FAILED';
}

function response(result: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, result }) }] };
}

async function handled(work: () => Promise<unknown>) {
  try {
    return response(await work());
  } catch (error) {
    return {
      isError: true,
      content: [{ type: 'text' as const, text: JSON.stringify({ ok: false, error: { code: boundedErrorCode(error) } }) }]
    };
  }
}

async function assertBootstrap(
  input: {
    governedSessionId: string;
    expectedSessionRevision: number;
    expectedBootstrapReceiptId: string;
    expectedStateVersion: number;
  },
  extra: GovernedSessionToolExtra,
  dependencies: GovernedTaskToolDependencies
) {
  await dependencies.ready();
  const request = sessionRequestFromToolExtra(extra);
  const session = await dependencies.sessions.getVisibleSession(input.governedSessionId, request);
  if (!session) throw new Error('SESSION_NOT_BOUND');
  if (session.sessionRevision !== input.expectedSessionRevision) throw new Error('SESSION_REVISION_MISMATCH');
  const receipt = session.bootstrapReceipt;
  if (!receipt) throw new Error('BOOTSTRAP_RECEIPT_REQUIRED');
  if (receipt.bootstrapReceiptId !== input.expectedBootstrapReceiptId) throw new Error('BOOTSTRAP_RECEIPT_MISMATCH');
  const liveState = await dependencies.liveState.getCurrent();
  if (!liveState || liveState.stateVersion !== input.expectedStateVersion || receipt.stateVersion !== input.expectedStateVersion) {
    throw new Error('BOOTSTRAP_RECEIPT_STALE');
  }
  const now = dependencies.now?.() ?? new Date();
  if (Date.parse(receipt.expiresAt) <= now.getTime()) throw new Error('BOOTSTRAP_RECEIPT_EXPIRED');
  return session;
}

const BootstrapInputShape = {
  governedSessionId: SessionIdSchema,
  expectedSessionRevision: ExpectedRevisionSchema,
  expectedBootstrapReceiptId: ReceiptIdSchema,
  expectedStateVersion: ExpectedRevisionSchema
};

export function registerGovernedTaskTools(
  server: McpServer,
  dependencies?: GovernedTaskToolDependencies
): void {
  if (!operationalMemoryConfig.enabled) return;
  const active = dependencies ?? getGovernedTaskToolDependencies();
  const readAnnotations = { readOnlyHint: true, destructiveHint: false } as const;
  const mutationAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false } as const;

  server.registerTool('mcp_get_work_queue', {
    description: 'Retourne la file de travail gouvernée visible, ordonnée et révisionnée.',
    inputSchema: {}, annotations: readAnnotations
  }, async () => handled(async () => { await active.ready(); return active.queue.listVisibleTasks(); }));

  server.registerTool('mcp_get_governed_task', {
    description: 'Retourne une tâche gouvernée visible par son Task ID.',
    inputSchema: { taskId: TaskIdSchema }, annotations: readAnnotations
  }, async ({ taskId }) => handled(async () => { await active.ready(); return active.queue.getVisibleTask(taskId); }));

  server.registerTool('mcp_reconcile_agent_intent', {
    description: 'Classe une projection bornée de la nouvelle instruction et ajoute uniquement une nouvelle tâche sûre.',
    inputSchema: {
      ...BootstrapInputShape,
      repository: z.literal('Patricked-code/MCP'),
      taskId: TaskIdSchema.optional(),
      intentKey: z.string().trim().min(3).max(160).regex(/^[a-z0-9][a-z0-9:._/-]+$/),
      title: z.string().trim().min(1).max(160),
      summary: z.string().trim().min(1).max(500),
      priority: z.number().int().min(0).max(100).default(50),
      dependencies: z.array(TaskIdSchema).max(64).default([]),
      resourceScopes: z.array(z.string().trim().min(3).max(256)).max(64).default([])
    },
    annotations: mutationAnnotations
  }, async (input, extra) => handled(async () => {
    await assertBootstrap(input, extra, active);
    const { governedSessionId, expectedSessionRevision: _revision, expectedBootstrapReceiptId: _receipt, expectedStateVersion: _state, ...intent } = input;
    return active.queue.reconcileIntent(intent, governedSessionId);
  }));

  server.registerTool('mcp_claim_next_governed_task', {
    description: 'Réclame atomiquement la première tâche exécutable selon priorité puis séquence.',
    inputSchema: { ...BootstrapInputShape, expectedStoreRevision: ExpectedRevisionSchema },
    annotations: mutationAnnotations
  }, async (input, extra) => handled(async () => {
    await assertBootstrap(input, extra, active);
    return active.queue.claimNextTask(input.governedSessionId, input.expectedStoreRevision);
  }));

  server.registerTool('mcp_transition_governed_task', {
    description: 'Applique une transition allowlistée avec révision optimiste et corrélations bornées.',
    inputSchema: {
      ...BootstrapInputShape,
      taskId: TaskIdSchema,
      expectedTaskRevision: ExpectedRevisionSchema,
      status: z.enum([
        'DISCOVERED', 'READY', 'CLAIMED', 'IN_PROGRESS', 'REVIEW', 'MERGE_READY',
        'DEPLOYING', 'VERIFYING', 'DONE', 'BLOCKED', 'CONFLICT', 'CANCELLED', 'SUPERSEDED'
      ]),
      blockers: z.array(z.string().trim().min(1).max(240)).max(20).optional(),
      nextAction: z.string().trim().min(1).max(500).nullable().optional(),
      workBranch: z.string().trim().min(1).max(255).nullable().optional(),
      pullRequestNumber: z.number().int().positive().nullable().optional(),
      observedHeadSha: z.string().regex(/^[0-9a-f]{40}$/).nullable().optional(),
      runtimeRevision: z.string().regex(/^[0-9a-f]{40}$/).nullable().optional()
    },
    annotations: mutationAnnotations
  }, async (input, extra) => handled(async () => {
    await assertBootstrap(input, extra, active);
    const { expectedSessionRevision: _sessionRevision, expectedBootstrapReceiptId: _receipt, expectedStateVersion: _state, ...transition } = input;
    return active.queue.transitionTask(transition);
  }));
}
