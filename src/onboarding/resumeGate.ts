import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type ResumeGateCheck = {
  blockerId: string;
  issueUrls: string[];
  issueStates: string[];
  acceptanceEvidenceStatus: string;
  resumeStatus: string;
  requiredBeforeResume: string[];
};

export type ResumeGate = {
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
    resumeAllowed: boolean;
    status: string;
    reasonCount: number;
    reasons: string[];
    openIssueCount: number;
    closedIssueCount: number;
    unresolvedBlockerCount: number;
    incompleteRequirementCount: number;
    blockedTaskCount: number;
    unresolvedBlockerIds: string[];
    incompleteRequirementIds: string[];
    blockedTaskIds: string[];
  };
  checks: ResumeGateCheck[];
  resumeCommandsWhenUnblocked: string[];
};

export type ResumeGateSummary = {
  generatedAt: string;
  resumeAllowed: boolean;
  status: string;
  reasonCount: number;
  openIssueCount: number;
  closedIssueCount: number;
  unresolvedBlockerCount: number;
  incompleteRequirementCount: number;
  blockedTaskCount: number;
  unresolvedBlockerIds: string[];
  resumeCommandCount: number;
  rawSourceTextStored: boolean;
  rawPdfTextStored: boolean;
  rawArchiveTextStored: boolean;
  rawServerInventoryStored: boolean;
  rawSecretsStored: boolean;
  productionActionExecuted: boolean;
};

const DEFAULT_RESUME_GATE_PATH = join(process.cwd(), 'Migration', 'index', 'RESUME_GATE.json');

function assertResumeGate(value: unknown): asserts value is ResumeGate {
  if (!value || typeof value !== 'object') {
    throw new Error('Resume gate is not an object.');
  }

  const candidate = value as Partial<ResumeGate>;
  if (!candidate.summary || typeof candidate.summary !== 'object') {
    throw new Error('Resume gate summary is missing.');
  }
  if (!Array.isArray(candidate.checks)) {
    throw new Error('Resume gate checks are missing.');
  }
  if (!candidate.safety || typeof candidate.safety !== 'object') {
    throw new Error('Resume gate safety block is missing.');
  }
}

export async function loadResumeGate(
  gatePath = DEFAULT_RESUME_GATE_PATH
): Promise<ResumeGate> {
  const raw = await readFile(gatePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertResumeGate(parsed);
  return parsed;
}

export function summarizeResumeGate(gate: ResumeGate): ResumeGateSummary {
  return {
    generatedAt: gate.generatedAt,
    resumeAllowed: gate.summary.resumeAllowed,
    status: gate.summary.status,
    reasonCount: gate.summary.reasonCount,
    openIssueCount: gate.summary.openIssueCount,
    closedIssueCount: gate.summary.closedIssueCount,
    unresolvedBlockerCount: gate.summary.unresolvedBlockerCount,
    incompleteRequirementCount: gate.summary.incompleteRequirementCount,
    blockedTaskCount: gate.summary.blockedTaskCount,
    unresolvedBlockerIds: gate.summary.unresolvedBlockerIds,
    resumeCommandCount: gate.resumeCommandsWhenUnblocked.length,
    rawSourceTextStored: gate.safety.rawSourceTextStored,
    rawPdfTextStored: gate.safety.rawPdfTextStored,
    rawArchiveTextStored: gate.safety.rawArchiveTextStored,
    rawServerInventoryStored: gate.safety.rawServerInventoryStored,
    rawSecretsStored: gate.safety.rawSecretsStored,
    productionActionExecuted: gate.safety.productionActionExecuted
  };
}
