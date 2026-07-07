import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type OperatorAction = {
  id: string;
  title: string;
  actionType: 'external_github_owner_action' | 'private_operator_action';
  blockerId: string;
  ownerRoleRequired: string;
  status: string;
  issueTitle: string;
  labels: string[];
  blockedTasks: string[];
  blockedRequirements: string[];
  checklist: string[];
  acceptanceCriteria: string[];
  verificationCommands: string[];
  safetyRules: string[];
  issueNumber?: number | null;
  issueUrl?: string | null;
  issueState?: string | null;
  issueBodyMarkdown: string;
};

export type OperatorActionPack = {
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
    operatorActionCount: number;
    externalGithubActionCount: number;
    privateOperatorActionCount: number;
    issueReadyActionCount: number;
    publishedIssueCount: number;
    unresolvedBlockerCount: number;
    unresolvedBlockerIds: string[];
    actionIds: string[];
    issueUrls: string[];
  };
  actions: OperatorAction[];
};

export type OperatorActionPackSummary = {
  generatedAt: string;
  operatorActionCount: number;
  externalGithubActionCount: number;
  privateOperatorActionCount: number;
  issueReadyActionCount: number;
  publishedIssueCount: number;
  unresolvedBlockerCount: number;
  unresolvedBlockerIds: string[];
  actionIds: string[];
  issueUrls: string[];
  rawSourceTextStored: boolean;
  rawPdfTextStored: boolean;
  rawArchiveTextStored: boolean;
  rawServerInventoryStored: boolean;
  rawSecretsStored: boolean;
  productionActionExecuted: boolean;
};

const DEFAULT_OPERATOR_ACTION_PACK_PATH = join(process.cwd(), 'Migration', 'index', 'OPERATOR_ACTION_PACK.json');

function assertOperatorActionPack(value: unknown): asserts value is OperatorActionPack {
  if (!value || typeof value !== 'object') {
    throw new Error('Operator action pack is not an object.');
  }

  const candidate = value as Partial<OperatorActionPack>;
  if (!Array.isArray(candidate.actions)) {
    throw new Error('Operator action list is missing.');
  }
  if (!candidate.summary || typeof candidate.summary !== 'object') {
    throw new Error('Operator action summary is missing.');
  }
  if (!candidate.safety || typeof candidate.safety !== 'object') {
    throw new Error('Operator action safety block is missing.');
  }
}

export async function loadOperatorActionPack(
  packPath = DEFAULT_OPERATOR_ACTION_PACK_PATH
): Promise<OperatorActionPack> {
  const raw = await readFile(packPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertOperatorActionPack(parsed);
  return parsed;
}

export function summarizeOperatorActionPack(pack: OperatorActionPack): OperatorActionPackSummary {
  return {
    generatedAt: pack.generatedAt,
    operatorActionCount: pack.actions.length,
    externalGithubActionCount: pack.summary.externalGithubActionCount,
    privateOperatorActionCount: pack.summary.privateOperatorActionCount,
    issueReadyActionCount: pack.summary.issueReadyActionCount,
    publishedIssueCount: pack.summary.publishedIssueCount,
    unresolvedBlockerCount: pack.summary.unresolvedBlockerCount,
    unresolvedBlockerIds: pack.summary.unresolvedBlockerIds,
    actionIds: pack.summary.actionIds,
    issueUrls: pack.summary.issueUrls,
    rawSourceTextStored: pack.safety.rawSourceTextStored,
    rawPdfTextStored: pack.safety.rawPdfTextStored,
    rawArchiveTextStored: pack.safety.rawArchiveTextStored,
    rawServerInventoryStored: pack.safety.rawServerInventoryStored,
    rawSecretsStored: pack.safety.rawSecretsStored,
    productionActionExecuted: pack.safety.productionActionExecuted
  };
}
