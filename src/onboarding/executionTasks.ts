import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type ExecutionTaskStatus =
  | 'ready_for_operator_review'
  | 'blocked_external_authorization'
  | 'blocked_by_connector_visibility'
  | 'ready_to_prepare_templates'
  | 'blocked_private_inventory_and_approval'
  | 'ready_recurring_gate'
  | 'pending_operator_review';

export type ExecutionTask = {
  id: string;
  title: string;
  objectiveIds: string[];
  status: ExecutionTaskStatus;
  kind: string;
  dependsOn: string[];
  blockedBy: string[];
  entryCriteria: string[];
  actions: string[];
  expectedEvidence: string[];
  verificationCommands: string[];
  objectiveEvidence: Array<{
    id: string;
    status: string;
    sourceHitCount: number;
    missingCurrentEvidence: string[];
    blockerCount: number;
  }>;
  missingObjectiveIds: string[];
  noRegressionGateRequired: boolean;
};

export type ExecutionTaskIndex = {
  version: number;
  generatedAt: string;
  generator: string;
  purpose: string;
  safety: {
    rawSourceTextStored: boolean;
    rawPdfTextStored: boolean;
    rawSecretsStored: boolean;
    productionActionExecuted: boolean;
    publicationMode: string;
  };
  inputs: Record<string, unknown>;
  summary: {
    taskCount: number;
    readyTaskCount: number;
    blockedTaskCount: number;
    statusCounts: Record<string, number>;
    kindCounts: Record<string, number>;
    readyTaskIds: string[];
    blockedTaskIds: string[];
    globalBlockerIds: string[];
  };
  tasks: ExecutionTask[];
  globalBlockers: Array<{
    id: string;
    description: string;
    blocks: string[];
  }>;
  noRegressionGate: {
    requiredFor: string;
    commands: string[];
  };
  nextRecommendedTaskIds: string[];
};

export type ExecutionTaskSummary = {
  generatedAt: string;
  taskCount: number;
  readyTaskCount: number;
  blockedTaskCount: number;
  pendingTaskCount: number;
  globalBlockerCount: number;
  readyTaskIds: string[];
  blockedTaskIds: string[];
  nextRecommendedTaskIds: string[];
  statusCounts: Record<string, number>;
  noRegressionCommandCount: number;
  rawSourceTextStored: boolean;
  rawPdfTextStored: boolean;
  rawSecretsStored: boolean;
  productionActionExecuted: boolean;
};

const DEFAULT_EXECUTION_TASKS_PATH = join(process.cwd(), 'Migration', 'index', 'MCP_EXECUTION_TASKS.json');

function assertExecutionTaskIndex(value: unknown): asserts value is ExecutionTaskIndex {
  if (!value || typeof value !== 'object') {
    throw new Error('Execution task index is not an object.');
  }

  const candidate = value as Partial<ExecutionTaskIndex>;
  if (!Array.isArray(candidate.tasks)) {
    throw new Error('Execution task list is missing.');
  }
  if (!candidate.safety || typeof candidate.safety !== 'object') {
    throw new Error('Execution task safety block is missing.');
  }
}

export async function loadExecutionTaskIndex(
  indexPath = DEFAULT_EXECUTION_TASKS_PATH
): Promise<ExecutionTaskIndex> {
  const raw = await readFile(indexPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertExecutionTaskIndex(parsed);
  return parsed;
}

export function summarizeExecutionTaskIndex(index: ExecutionTaskIndex): ExecutionTaskSummary {
  const pendingTaskCount = index.tasks.filter((task) => task.status.startsWith('pending')).length;

  return {
    generatedAt: index.generatedAt,
    taskCount: index.tasks.length,
    readyTaskCount: index.summary.readyTaskCount,
    blockedTaskCount: index.summary.blockedTaskCount,
    pendingTaskCount,
    globalBlockerCount: index.globalBlockers.length,
    readyTaskIds: index.summary.readyTaskIds,
    blockedTaskIds: index.summary.blockedTaskIds,
    nextRecommendedTaskIds: index.nextRecommendedTaskIds,
    statusCounts: index.summary.statusCounts,
    noRegressionCommandCount: index.noRegressionGate.commands.length,
    rawSourceTextStored: index.safety.rawSourceTextStored,
    rawPdfTextStored: index.safety.rawPdfTextStored,
    rawSecretsStored: index.safety.rawSecretsStored,
    productionActionExecuted: index.safety.productionActionExecuted
  };
}
