import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type ServerInventoryCard = {
  id: string;
  title: string;
  serverScope: string;
  status: string;
  purpose: string;
  blockedBy: string[];
  allowedActions: string[];
  forbiddenActions: string[];
  protectedDomains: string[];
  cleanupCandidates: string[];
  backupReviewCandidates: string[];
  requiredInventoryFields: string[];
  requiredPrivateEvidence: string[];
  publicEvidenceAllowed: string[];
  postActionTests: string[];
};

export type ServerInventoryCardIndex = {
  version: number;
  generatedAt: string;
  generator: string;
  purpose: string;
  safety: {
    rawServerInventoryStored: boolean;
    rawSecretsStored: boolean;
    productionActionExecuted: boolean;
    publicationMode: string;
  };
  inputs: Record<string, unknown>;
  summary: {
    cardCount: number;
    readyCardCount: number;
    blockedCardCount: number;
    byStatus: Record<string, number>;
    byScope: Record<string, number>;
    readyCardIds: string[];
    blockedCardIds: string[];
    protectedDomainCount: number;
    cleanupCandidateCount: number;
    backupReviewCandidateCount: number;
  };
  cards: ServerInventoryCard[];
};

export type ServerInventoryCardSummary = {
  generatedAt: string;
  cardCount: number;
  readyCardCount: number;
  blockedCardCount: number;
  protectedDomainCount: number;
  cleanupCandidateCount: number;
  backupReviewCandidateCount: number;
  readyCardIds: string[];
  blockedCardIds: string[];
  scopes: string[];
  rawServerInventoryStored: boolean;
  rawSecretsStored: boolean;
  productionActionExecuted: boolean;
};

const DEFAULT_SERVER_CARDS_PATH = join(process.cwd(), 'Migration', 'serveur', 'PRIVATE_SERVER_INVENTORY_TASK_CARDS.json');

function assertServerInventoryCards(value: unknown): asserts value is ServerInventoryCardIndex {
  if (!value || typeof value !== 'object') {
    throw new Error('Server inventory cards index is not an object.');
  }

  const candidate = value as Partial<ServerInventoryCardIndex>;
  if (!Array.isArray(candidate.cards)) {
    throw new Error('Server inventory card list is missing.');
  }
  if (!candidate.safety || typeof candidate.safety !== 'object') {
    throw new Error('Server inventory card safety block is missing.');
  }
}

export async function loadServerInventoryCardIndex(
  indexPath = DEFAULT_SERVER_CARDS_PATH
): Promise<ServerInventoryCardIndex> {
  const raw = await readFile(indexPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertServerInventoryCards(parsed);
  return parsed;
}

export function summarizeServerInventoryCardIndex(
  index: ServerInventoryCardIndex
): ServerInventoryCardSummary {
  return {
    generatedAt: index.generatedAt,
    cardCount: index.cards.length,
    readyCardCount: index.summary.readyCardCount,
    blockedCardCount: index.summary.blockedCardCount,
    protectedDomainCount: index.summary.protectedDomainCount,
    cleanupCandidateCount: index.summary.cleanupCandidateCount,
    backupReviewCandidateCount: index.summary.backupReviewCandidateCount,
    readyCardIds: index.summary.readyCardIds,
    blockedCardIds: index.summary.blockedCardIds,
    scopes: Object.keys(index.summary.byScope).sort(),
    rawServerInventoryStored: index.safety.rawServerInventoryStored,
    rawSecretsStored: index.safety.rawSecretsStored,
    productionActionExecuted: index.safety.productionActionExecuted
  };
}
