import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type BlockerResolution = {
  id: string;
  title: string;
  ownerRoleRequired: string;
  resolutionStatus: string;
  resolutionSteps: string[];
  acceptanceCriteria: string[];
  verificationCommands: string[];
  blockedObjectives: string[];
  blockedTasks: string[];
  blockedServerCards: string[];
};

export type BlockerResolutionRunbook = {
  version: number;
  generatedAt: string;
  generator: string;
  purpose: string;
  safety: {
    rawSourceTextStored: boolean;
    rawPdfTextStored: boolean;
    rawServerInventoryStored: boolean;
    rawSecretsStored: boolean;
    productionActionExecuted: boolean;
    publicationMode: string;
  };
  inputs: Record<string, unknown>;
  summary: {
    blockerCount: number;
    externalActionBlockerCount: number;
    privateInventoryBlockerCount: number;
    blockedTaskCount: number;
    blockedObjectiveCount: number;
    blockedServerCardCount: number;
    blockerIds: string[];
  };
  blockers: BlockerResolution[];
  resumeCommandsAfterResolution: string[];
};

export type BlockerResolutionSummary = {
  generatedAt: string;
  blockerCount: number;
  externalActionBlockerCount: number;
  privateInventoryBlockerCount: number;
  blockedTaskCount: number;
  blockedObjectiveCount: number;
  blockedServerCardCount: number;
  blockerIds: string[];
  resumeCommandCount: number;
  rawSourceTextStored: boolean;
  rawPdfTextStored: boolean;
  rawServerInventoryStored: boolean;
  rawSecretsStored: boolean;
  productionActionExecuted: boolean;
};

const DEFAULT_BLOCKER_RUNBOOK_PATH = join(process.cwd(), 'Migration', 'index', 'BLOCKER_RESOLUTION_RUNBOOK.json');

function assertBlockerResolutionRunbook(value: unknown): asserts value is BlockerResolutionRunbook {
  if (!value || typeof value !== 'object') {
    throw new Error('Blocker resolution runbook is not an object.');
  }

  const candidate = value as Partial<BlockerResolutionRunbook>;
  if (!Array.isArray(candidate.blockers)) {
    throw new Error('Blocker resolution list is missing.');
  }
  if (!candidate.safety || typeof candidate.safety !== 'object') {
    throw new Error('Blocker resolution safety block is missing.');
  }
}

export async function loadBlockerResolutionRunbook(
  indexPath = DEFAULT_BLOCKER_RUNBOOK_PATH
): Promise<BlockerResolutionRunbook> {
  const raw = await readFile(indexPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertBlockerResolutionRunbook(parsed);
  return parsed;
}

export function summarizeBlockerResolutionRunbook(
  runbook: BlockerResolutionRunbook
): BlockerResolutionSummary {
  return {
    generatedAt: runbook.generatedAt,
    blockerCount: runbook.blockers.length,
    externalActionBlockerCount: runbook.summary.externalActionBlockerCount,
    privateInventoryBlockerCount: runbook.summary.privateInventoryBlockerCount,
    blockedTaskCount: runbook.summary.blockedTaskCount,
    blockedObjectiveCount: runbook.summary.blockedObjectiveCount,
    blockedServerCardCount: runbook.summary.blockedServerCardCount,
    blockerIds: runbook.summary.blockerIds,
    resumeCommandCount: runbook.resumeCommandsAfterResolution.length,
    rawSourceTextStored: runbook.safety.rawSourceTextStored,
    rawPdfTextStored: runbook.safety.rawPdfTextStored,
    rawServerInventoryStored: runbook.safety.rawServerInventoryStored,
    rawSecretsStored: runbook.safety.rawSecretsStored,
    productionActionExecuted: runbook.safety.productionActionExecuted
  };
}
