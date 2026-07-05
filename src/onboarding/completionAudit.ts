import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type CompletionRequirement = {
  id: string;
  title: string;
  status: string;
  acceptanceCriteria: string[];
  evidence: Array<{
    path: string;
    exists: boolean;
    sha256: string | null;
    note: string;
  }>;
  blockedBy: string[];
  nextActions: string[];
};

export type CompletionAudit = {
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
    requirementCount: number;
    completeRequirementCount: number;
    blockedRequirementCount: number;
    partialRequirementCount: number;
    incompleteRequirementIds: string[];
    blockedRequirementIds: string[];
    partialRequirementIds: string[];
    missingEvidence: Array<{
      requirementId: string;
      path: string;
    }>;
    unresolvedBlockerIds: string[];
    fullObjectiveAchieved: boolean;
  };
  completionDecision: {
    fullObjectiveAchieved: boolean;
    status: string;
    reason: string;
  };
  requirements: CompletionRequirement[];
};

export type CompletionAuditSummary = {
  generatedAt: string;
  requirementCount: number;
  completeRequirementCount: number;
  blockedRequirementCount: number;
  partialRequirementCount: number;
  missingEvidenceCount: number;
  unresolvedBlockerIds: string[];
  incompleteRequirementIds: string[];
  fullObjectiveAchieved: boolean;
  decisionStatus: string;
  rawSourceTextStored: boolean;
  rawPdfTextStored: boolean;
  rawArchiveTextStored: boolean;
  rawServerInventoryStored: boolean;
  rawSecretsStored: boolean;
  productionActionExecuted: boolean;
};

const DEFAULT_COMPLETION_AUDIT_PATH = join(process.cwd(), 'Migration', 'index', 'COMPLETION_AUDIT.json');

function assertCompletionAudit(value: unknown): asserts value is CompletionAudit {
  if (!value || typeof value !== 'object') {
    throw new Error('Completion audit is not an object.');
  }

  const candidate = value as Partial<CompletionAudit>;
  if (!Array.isArray(candidate.requirements)) {
    throw new Error('Completion audit requirements are missing.');
  }
  if (!candidate.summary || typeof candidate.summary !== 'object') {
    throw new Error('Completion audit summary is missing.');
  }
  if (!candidate.completionDecision || typeof candidate.completionDecision !== 'object') {
    throw new Error('Completion audit decision is missing.');
  }
  if (!candidate.safety || typeof candidate.safety !== 'object') {
    throw new Error('Completion audit safety block is missing.');
  }
}

export async function loadCompletionAudit(
  auditPath = DEFAULT_COMPLETION_AUDIT_PATH
): Promise<CompletionAudit> {
  const raw = await readFile(auditPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertCompletionAudit(parsed);
  return parsed;
}

export function summarizeCompletionAudit(audit: CompletionAudit): CompletionAuditSummary {
  return {
    generatedAt: audit.generatedAt,
    requirementCount: audit.requirements.length,
    completeRequirementCount: audit.summary.completeRequirementCount,
    blockedRequirementCount: audit.summary.blockedRequirementCount,
    partialRequirementCount: audit.summary.partialRequirementCount,
    missingEvidenceCount: audit.summary.missingEvidence.length,
    unresolvedBlockerIds: audit.summary.unresolvedBlockerIds,
    incompleteRequirementIds: audit.summary.incompleteRequirementIds,
    fullObjectiveAchieved: audit.completionDecision.fullObjectiveAchieved,
    decisionStatus: audit.completionDecision.status,
    rawSourceTextStored: audit.safety.rawSourceTextStored,
    rawPdfTextStored: audit.safety.rawPdfTextStored,
    rawArchiveTextStored: audit.safety.rawArchiveTextStored,
    rawServerInventoryStored: audit.safety.rawServerInventoryStored,
    rawSecretsStored: audit.safety.rawSecretsStored,
    productionActionExecuted: audit.safety.productionActionExecuted
  };
}
