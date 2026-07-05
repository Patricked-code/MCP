import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type ObjectiveStatus =
  | 'partial_external_connector_authorization_required'
  | 'inventory_and_pdf_text_audit_complete_semantic_extraction_in_progress'
  | 'implemented_as_policy_and_tests_more_runtime_gates_needed'
  | 'implemented_for_current_pr_flow'
  | 'implemented_for_governance_profiles'
  | 'partial_sensitive_server_paths_not_published'
  | 'documented_not_executed_on_production'
  | 'implemented_for_current_mcp_and_ingestion_flows'
  | 'in_progress_objective_matrix_added_this_turn';

export type ObjectiveTraceabilityEvidence = {
  path: string;
  exists: boolean;
  sha256: string | null;
};

export type ObjectiveTraceabilityEntry = {
  id: string;
  title: string;
  understanding: string;
  status: ObjectiveStatus;
  sourceSignals: {
    sourceHitCount: number;
    totalPatternHits: number;
    textUnitsScanned: number;
    secretSignalSourceCount: number;
  };
  topEvidenceSources: Array<{
    source: string;
    sourceKind: string;
    hits: number;
    evidenceType: string;
  }>;
  currentEvidence: ObjectiveTraceabilityEvidence[];
  missingCurrentEvidence: string[];
  blockers: string[];
  nextActions: string[];
};

export type ObjectiveTraceabilityIndex = {
  version: number;
  generatedAt: string;
  generator: string;
  purpose: string;
  safety: {
    rawSourceTextStored: boolean;
    rawPdfTextStored: boolean;
    rawSecretsStored: boolean;
    publicationMode: string;
  };
  inputs: Record<string, unknown>;
  summary: {
    objectiveCount: number;
    statusCounts: Record<string, number>;
    blockedObjectiveCount: number;
    objectivesWithMissingCurrentEvidence: string[];
  };
  objectives: ObjectiveTraceabilityEntry[];
  globalBlockers: Array<{
    id: string;
    description: string;
    blocks: string[];
  }>;
  nextExecutionOrder: string[];
};

export type ObjectiveTraceabilitySummary = {
  generatedAt: string;
  objectiveCount: number;
  blockedObjectiveCount: number;
  globalBlockerCount: number;
  objectivesWithMissingCurrentEvidence: string[];
  statusCounts: Record<string, number>;
  partialOrBlockedObjectiveIds: string[];
  totalSourceSignals: number;
  totalPatternHits: number;
  secretSignalSourceCount: number;
  rawSourceTextStored: boolean;
  rawPdfTextStored: boolean;
  rawSecretsStored: boolean;
};

const DEFAULT_OBJECTIVE_INDEX_PATH = join(process.cwd(), 'Migration', 'index', 'OBJECTIVE_TRACEABILITY_MATRIX.json');

function assertObjectiveIndex(value: unknown): asserts value is ObjectiveTraceabilityIndex {
  if (!value || typeof value !== 'object') {
    throw new Error('Objective traceability index is not an object.');
  }

  const candidate = value as Partial<ObjectiveTraceabilityIndex>;
  if (!Array.isArray(candidate.objectives)) {
    throw new Error('Objective traceability objectives are missing.');
  }
  if (!Array.isArray(candidate.globalBlockers)) {
    throw new Error('Objective traceability blockers are missing.');
  }
  if (!candidate.safety || typeof candidate.safety !== 'object') {
    throw new Error('Objective traceability safety block is missing.');
  }
}

export async function loadObjectiveTraceabilityIndex(
  indexPath = DEFAULT_OBJECTIVE_INDEX_PATH
): Promise<ObjectiveTraceabilityIndex> {
  const raw = await readFile(indexPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertObjectiveIndex(parsed);
  return parsed;
}

function isPartialOrBlocked(status: string): boolean {
  return status.includes('partial') || status.includes('blocked') || status.includes('in_progress');
}

export function summarizeObjectiveTraceabilityIndex(
  index: ObjectiveTraceabilityIndex
): ObjectiveTraceabilitySummary {
  let totalSourceSignals = 0;
  let totalPatternHits = 0;
  let secretSignalSourceCount = 0;

  for (const objective of index.objectives) {
    totalSourceSignals += objective.sourceSignals.sourceHitCount;
    totalPatternHits += objective.sourceSignals.totalPatternHits;
    secretSignalSourceCount += objective.sourceSignals.secretSignalSourceCount;
  }

  return {
    generatedAt: index.generatedAt,
    objectiveCount: index.objectives.length,
    blockedObjectiveCount: index.summary.blockedObjectiveCount,
    globalBlockerCount: index.globalBlockers.length,
    objectivesWithMissingCurrentEvidence: index.summary.objectivesWithMissingCurrentEvidence,
    statusCounts: index.summary.statusCounts,
    partialOrBlockedObjectiveIds: index.objectives
      .filter((objective) => isPartialOrBlocked(objective.status))
      .map((objective) => objective.id),
    totalSourceSignals,
    totalPatternHits,
    secretSignalSourceCount,
    rawSourceTextStored: index.safety.rawSourceTextStored,
    rawPdfTextStored: index.safety.rawPdfTextStored,
    rawSecretsStored: index.safety.rawSecretsStored
  };
}
