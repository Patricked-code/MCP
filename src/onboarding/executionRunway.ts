import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type ExecutionRunwayPhase = {
  id: string;
  title: string;
  status: string;
  requirementIds: string[];
  taskIds: string[];
  blockedBy: string[];
  linkedIssues: Array<{
    issueNumber?: number;
    issueUrl?: string;
    issueState?: string;
    actionId?: string;
  }>;
  entryCriteria: string[];
  actions: string[];
  exitEvidence: string[];
  verificationCommands: string[];
  safeToExecuteNow: boolean;
  productionActionAllowed: boolean;
  noRegressionRequiredBeforePromotion: boolean;
};

export type ExecutionRunway = {
  version: number;
  generatedAt: string;
  generator: string;
  purpose: string;
  safety: {
    rawSourceTextStored: boolean;
    rawPdfTextStored: boolean;
    rawArchiveTextStored: boolean;
    rawServerInventoryStored: boolean;
    rawSecretsStored: boolean;
    productionActionExecuted: boolean;
    publicationMode: string;
  };
  inputs: Record<string, unknown>;
  summary: {
    phaseCount: number;
    readyPhaseCount: number;
    blockedPhaseCount: number;
    safeNowPhaseCount: number;
    productionActionAllowed: boolean;
    resumeAllowed: boolean;
    openIssueCount: number;
    unresolvedBlockerCount: number;
    incompleteRequirementCount: number;
    blockedTaskCount: number;
    readyTaskIds: string[];
    blockedTaskIds: string[];
    currentRecommendedPhaseIds: string[];
  };
  phases: ExecutionRunwayPhase[];
  noRegressionGate: {
    requiredBeforeEveryPromotion: boolean;
    commands: string[];
  };
};

export type ExecutionRunwaySummary = {
  generatedAt: string;
  phaseCount: number;
  readyPhaseCount: number;
  blockedPhaseCount: number;
  safeNowPhaseCount: number;
  productionActionAllowed: boolean;
  resumeAllowed: boolean;
  openIssueCount: number;
  unresolvedBlockerCount: number;
  incompleteRequirementCount: number;
  blockedTaskCount: number;
  currentRecommendedPhaseIds: string[];
  readyTaskIds: string[];
  blockedTaskIds: string[];
  noRegressionCommandCount: number;
  rawSourceTextStored: boolean;
  rawPdfTextStored: boolean;
  rawArchiveTextStored: boolean;
  rawServerInventoryStored: boolean;
  rawSecretsStored: boolean;
  productionActionExecuted: boolean;
};

const DEFAULT_EXECUTION_RUNWAY_PATH = join(process.cwd(), 'Migration', 'index', 'EXECUTION_RUNWAY.json');

function assertExecutionRunway(value: unknown): asserts value is ExecutionRunway {
  if (!value || typeof value !== 'object') {
    throw new Error('Execution runway is not an object.');
  }

  const candidate = value as Partial<ExecutionRunway>;
  if (!candidate.summary || typeof candidate.summary !== 'object') {
    throw new Error('Execution runway summary is missing.');
  }
  if (!Array.isArray(candidate.phases)) {
    throw new Error('Execution runway phases are missing.');
  }
  if (!candidate.safety || typeof candidate.safety !== 'object') {
    throw new Error('Execution runway safety block is missing.');
  }
}

export async function loadExecutionRunway(
  runwayPath = DEFAULT_EXECUTION_RUNWAY_PATH
): Promise<ExecutionRunway> {
  const raw = await readFile(runwayPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertExecutionRunway(parsed);
  return parsed;
}

export function summarizeExecutionRunway(runway: ExecutionRunway): ExecutionRunwaySummary {
  return {
    generatedAt: runway.generatedAt,
    phaseCount: runway.summary.phaseCount,
    readyPhaseCount: runway.summary.readyPhaseCount,
    blockedPhaseCount: runway.summary.blockedPhaseCount,
    safeNowPhaseCount: runway.summary.safeNowPhaseCount,
    productionActionAllowed: runway.summary.productionActionAllowed,
    resumeAllowed: runway.summary.resumeAllowed,
    openIssueCount: runway.summary.openIssueCount,
    unresolvedBlockerCount: runway.summary.unresolvedBlockerCount,
    incompleteRequirementCount: runway.summary.incompleteRequirementCount,
    blockedTaskCount: runway.summary.blockedTaskCount,
    currentRecommendedPhaseIds: runway.summary.currentRecommendedPhaseIds,
    readyTaskIds: runway.summary.readyTaskIds,
    blockedTaskIds: runway.summary.blockedTaskIds,
    noRegressionCommandCount: runway.noRegressionGate.commands.length,
    rawSourceTextStored: runway.safety.rawSourceTextStored,
    rawPdfTextStored: runway.safety.rawPdfTextStored,
    rawArchiveTextStored: runway.safety.rawArchiveTextStored,
    rawServerInventoryStored: runway.safety.rawServerInventoryStored,
    rawSecretsStored: runway.safety.rawSecretsStored,
    productionActionExecuted: runway.safety.productionActionExecuted
  };
}
