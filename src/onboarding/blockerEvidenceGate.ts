import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type BlockerEvidenceGateItem = {
  blockerId: string;
  title: string;
  ownerRoleRequired: string;
  issueNumber: number | null;
  issueUrl: string | null;
  issueState: string;
  issueClosed: boolean;
  publicEvidenceRecordPath: string;
  publicEvidenceRecordPresent: boolean;
  publicEvidenceStatus: string;
  acceptanceCriteriaCount: number;
  criteriaEvidenceCount: number;
  criteriaEvidenceComplete: boolean;
  noSecretsPublished: boolean;
  privateMaterialStoredOutsideGit: boolean;
  productionActionExecuted: boolean;
  resolutionReadyForCompletionAudit: boolean;
  status: string;
  missingReasons: string[];
  acceptanceCriteria: string[];
  verificationCommands: string[];
  blockedTasks: string[];
  blockedObjectives: string[];
  blockedServerCards: string[];
};

export type BlockerEvidenceGate = {
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
    blockerCount: number;
    resolutionReadyCount: number;
    unresolvedBlockerCount: number;
    openIssueBlockerCount: number;
    missingEvidenceRecordCount: number;
    incompleteAcceptanceEvidenceCount: number;
    allBlockersEvidenceReady: boolean;
    resolutionReadyBlockerIds: string[];
    unresolvedBlockerIds: string[];
    openIssueBlockerIds: string[];
    missingEvidenceRecordBlockerIds: string[];
  };
  blockers: BlockerEvidenceGateItem[];
  publicEvidenceSchema: Record<string, unknown>;
};

export type BlockerEvidenceGateSummary = {
  generatedAt: string;
  blockerCount: number;
  resolutionReadyCount: number;
  unresolvedBlockerCount: number;
  openIssueBlockerCount: number;
  missingEvidenceRecordCount: number;
  incompleteAcceptanceEvidenceCount: number;
  allBlockersEvidenceReady: boolean;
  resolutionReadyBlockerIds: string[];
  unresolvedBlockerIds: string[];
  openIssueBlockerIds: string[];
  missingEvidenceRecordBlockerIds: string[];
  rawSourceTextStored: boolean;
  rawPdfTextStored: boolean;
  rawArchiveTextStored: boolean;
  rawServerInventoryStored: boolean;
  rawSecretsStored: boolean;
  productionActionExecuted: boolean;
};

const DEFAULT_BLOCKER_EVIDENCE_GATE_PATH = join(process.cwd(), 'Migration', 'index', 'BLOCKER_EVIDENCE_GATE.json');

function assertBlockerEvidenceGate(value: unknown): asserts value is BlockerEvidenceGate {
  if (!value || typeof value !== 'object') {
    throw new Error('Blocker evidence gate is not an object.');
  }

  const candidate = value as Partial<BlockerEvidenceGate>;
  if (!candidate.summary || typeof candidate.summary !== 'object') {
    throw new Error('Blocker evidence gate summary is missing.');
  }
  if (!Array.isArray(candidate.blockers)) {
    throw new Error('Blocker evidence gate blockers are missing.');
  }
  if (!candidate.safety || typeof candidate.safety !== 'object') {
    throw new Error('Blocker evidence gate safety block is missing.');
  }
}

export async function loadBlockerEvidenceGate(
  gatePath = DEFAULT_BLOCKER_EVIDENCE_GATE_PATH
): Promise<BlockerEvidenceGate> {
  const raw = await readFile(gatePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertBlockerEvidenceGate(parsed);
  return parsed;
}

export function summarizeBlockerEvidenceGate(gate: BlockerEvidenceGate): BlockerEvidenceGateSummary {
  return {
    generatedAt: gate.generatedAt,
    blockerCount: gate.summary.blockerCount,
    resolutionReadyCount: gate.summary.resolutionReadyCount,
    unresolvedBlockerCount: gate.summary.unresolvedBlockerCount,
    openIssueBlockerCount: gate.summary.openIssueBlockerCount,
    missingEvidenceRecordCount: gate.summary.missingEvidenceRecordCount,
    incompleteAcceptanceEvidenceCount: gate.summary.incompleteAcceptanceEvidenceCount,
    allBlockersEvidenceReady: gate.summary.allBlockersEvidenceReady,
    resolutionReadyBlockerIds: gate.summary.resolutionReadyBlockerIds,
    unresolvedBlockerIds: gate.summary.unresolvedBlockerIds,
    openIssueBlockerIds: gate.summary.openIssueBlockerIds,
    missingEvidenceRecordBlockerIds: gate.summary.missingEvidenceRecordBlockerIds,
    rawSourceTextStored: gate.safety.rawSourceTextStored,
    rawPdfTextStored: gate.safety.rawPdfTextStored,
    rawArchiveTextStored: gate.safety.rawArchiveTextStored,
    rawServerInventoryStored: gate.safety.rawServerInventoryStored,
    rawSecretsStored: gate.safety.rawSecretsStored,
    productionActionExecuted: gate.safety.productionActionExecuted
  };
}
