import { createHash } from 'node:crypto';

import { z } from 'zod';

import type { GithubOperationalContext } from '../../governedContext/types.js';
import type {
  GovernedContractSubstrate,
  GovernedStepId
} from '../contractSubstrate.js';
import type { EvidenceRef } from '../executionEngine.js';

const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const ShaSchema = z.string().regex(/^[0-9a-f]{40}$/);
const RepositorySchema = z.string().trim().min(3).max(300)
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
const BoundedIdSchema = z.string().trim().min(1).max(200);
const BoundedPathSchema = z.string().trim().min(1).max(500);

export type AuthorityContractBinding = Readonly<{
  stepId: GovernedStepId;
  contractVersion: number;
  contractRegistryDigest: string;
  graphRegistryDigest: string;
}>;

export type AuthorityContractObservation<TStatus extends string, TPayload> = Readonly<{
  contract: AuthorityContractBinding;
  status: TStatus;
  freshness: 'CURRENT' | 'STALE' | 'UNKNOWN';
  reasonCodes: readonly string[];
  evidenceRefs: readonly EvidenceRef[];
  payload: TPayload;
  authorizationInferred: false;
  mutationPerformed: false;
}>;

const Gw21InputSchema = z.object({
  repository: RepositorySchema,
  projectId: BoundedIdSchema,
  observedAt: z.string().datetime({ offset: true }),
  inventory: z.object({
    status: z.enum(['CURRENT', 'STALE', 'UNAVAILABLE']),
    ok: z.boolean(),
    digest: Sha256Schema,
    trackedCount: z.number().int().nonnegative().max(100_000)
  }).strict(),
  declaration: z.object({
    digest: Sha256Schema,
    canonicalDocumentPaths: z.array(BoundedPathSchema).min(1).max(256),
    canonicalStateKeys: z.array(BoundedIdSchema).min(1).max(128)
  }).strict(),
  cartography: z.object({
    digest: Sha256Schema,
    registeredToolCount: z.number().int().nonnegative().max(100_000)
  }).strict()
}).strict();
export type Gw21AuthorityDocumentsInput = z.input<typeof Gw21InputSchema>;

export type AuthorityDocumentSet = Readonly<{
  repository: string;
  projectId: string;
  inventoryDigest: string;
  declarationDigest: string;
  cartographyDigest: string;
  trackedCount: number;
  registeredToolCount: number;
  canonicalDocumentPaths: readonly string[];
  canonicalStateKeys: readonly string[];
}>;

export type Gw21AuthorityDocumentsResult = AuthorityContractObservation<
  'SUCCESS' | 'BLOCKED' | 'STALE' | 'UNVERIFIED',
  AuthorityDocumentSet
>;

const IntegrationProposalSchema = z.object({
  kind: z.enum(['MODULE', 'DOCUMENT', 'TOOL']),
  key: BoundedPathSchema
}).strict();

const IntegrationInventorySchema = z.object({
  modules: z.array(BoundedPathSchema).max(10_000),
  markdown: z.array(BoundedPathSchema).max(10_000),
  tools: z.array(z.object({
    name: BoundedPathSchema,
    surface: BoundedIdSchema
  }).strict()).max(10_000)
}).strict();

const Gw22InputSchema = z.object({
  repository: RepositorySchema,
  observedAt: z.string().datetime({ offset: true }),
  inventoryStatus: z.enum(['CURRENT', 'STALE', 'UNAVAILABLE']),
  inventoryDigest: Sha256Schema,
  proposal: IntegrationProposalSchema,
  inventory: IntegrationInventorySchema
}).strict();
export type Gw22IntegrationSlotInput = z.input<typeof Gw22InputSchema>;

export type IntegrationSlot = Readonly<{
  ownerKind: 'MODULE' | 'DOCUMENT' | 'TOOL';
  ownerKey: string;
  surface: string | null;
  invented: false;
}>;

export type Gw22IntegrationSlotResult = Readonly<
  AuthorityContractObservation<'FOUND' | 'NONE' | 'AMBIGUOUS' | 'UNVERIFIED' | 'STALE', {
    proposal: z.infer<typeof IntegrationProposalSchema>;
    inventoryDigest: string;
  }>
  & { slot: IntegrationSlot | null }
>;

export type Gw23ExactGithubBaselineInput = Readonly<{
  repository: string;
  workBranch: string;
  stepStartedAt: string;
  github: GithubOperationalContext;
}>;

export type GithubBaseline = Readonly<{
  repository: string;
  branch: string;
  headSha: string;
  observedAt: string;
}>;

export type Gw23ExactGithubBaselineResult = Readonly<
  AuthorityContractObservation<'SUCCESS' | 'STALE' | 'UNVERIFIED' | 'CONFLICT', {
    stepStartedAt: string;
  }>
  & { baseline: GithubBaseline | null }
>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function contract(
  stepId: 'GW-21' | 'GW-22' | 'GW-23',
  substrate: GovernedContractSubstrate
): AuthorityContractBinding {
  const resolved = substrate.resolve(stepId);
  if (!resolved) throw new Error(`GWC_AUTHORITY_CONTRACT_MISSING:${stepId}`);
  return Object.freeze({
    stepId: resolved.stepId,
    contractVersion: resolved.contractVersion,
    contractRegistryDigest: substrate.contractRegistryDigest,
    graphRegistryDigest: substrate.graphRegistryDigest
  });
}

function freezeEvidence(refs: readonly EvidenceRef[]): readonly EvidenceRef[] {
  return Object.freeze(refs.map((ref) => Object.freeze({
    ...ref,
    binding: Object.freeze({ ...ref.binding })
  })));
}

function observation<TStatus extends string, TPayload>(input: {
  contract: AuthorityContractBinding;
  status: TStatus;
  freshness: AuthorityContractObservation<TStatus, TPayload>['freshness'];
  reasonCodes?: readonly string[];
  evidenceRefs?: readonly EvidenceRef[];
  payload: TPayload;
}): AuthorityContractObservation<TStatus, TPayload> {
  return Object.freeze({
    contract: input.contract,
    status: input.status,
    freshness: input.freshness,
    reasonCodes: Object.freeze([...(input.reasonCodes ?? [])]),
    evidenceRefs: freezeEvidence(input.evidenceRefs ?? []),
    payload: input.payload,
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

export function observeGw21AuthorityDocuments(
  rawInput: Gw21AuthorityDocumentsInput,
  substrate: GovernedContractSubstrate
): Gw21AuthorityDocumentsResult {
  const input = Gw21InputSchema.parse(rawInput);
  const payload: AuthorityDocumentSet = Object.freeze({
    repository: input.repository,
    projectId: input.projectId,
    inventoryDigest: input.inventory.digest,
    declarationDigest: input.declaration.digest,
    cartographyDigest: input.cartography.digest,
    trackedCount: input.inventory.trackedCount,
    registeredToolCount: input.cartography.registeredToolCount,
    canonicalDocumentPaths: Object.freeze(sortedUnique(input.declaration.canonicalDocumentPaths)),
    canonicalStateKeys: Object.freeze(sortedUnique(input.declaration.canonicalStateKeys))
  });

  let status: Gw21AuthorityDocumentsResult['status'] = 'SUCCESS';
  let freshness: Gw21AuthorityDocumentsResult['freshness'] = 'CURRENT';
  let reasonCodes: string[] = [];
  if (input.inventory.status === 'STALE') {
    status = 'STALE';
    freshness = 'STALE';
    reasonCodes = ['AUTHORITY_DOCUMENT_EVIDENCE_STALE'];
  } else if (input.inventory.status === 'UNAVAILABLE') {
    status = 'UNVERIFIED';
    freshness = 'UNKNOWN';
    reasonCodes = ['AUTHORITY_DOCUMENT_EVIDENCE_UNAVAILABLE'];
  } else if (!input.inventory.ok) {
    status = 'BLOCKED';
    reasonCodes = ['AUTHORITY_DOCUMENT_INVENTORY_DRIFT'];
  }

  const evidence: EvidenceRef = {
    authority: 'Documentation Governance + Function Cartography',
    kind: 'OBSERVATION',
    reference: `authority-documents:${input.projectId}:inventory:${input.inventory.digest}`,
    observedAt: input.observedAt,
    freshness,
    digest: digest(payload),
    binding: {
      repository: input.repository,
      project: input.projectId
    }
  };

  return observation({
    contract: contract('GW-21', substrate),
    status,
    freshness,
    reasonCodes,
    evidenceRefs: [evidence],
    payload
  });
}

function integrationCandidates(input: z.infer<typeof Gw22InputSchema>): IntegrationSlot[] {
  const proposal = input.proposal;
  if (proposal.kind === 'MODULE') {
    return sortedUnique(input.inventory.modules.filter((entry) => entry === proposal.key))
      .map((ownerKey) => Object.freeze({
        ownerKind: 'MODULE' as const,
        ownerKey,
        surface: null,
        invented: false as const
      }));
  }
  if (proposal.kind === 'DOCUMENT') {
    return sortedUnique(input.inventory.markdown.filter((entry) => entry === proposal.key))
      .map((ownerKey) => Object.freeze({
        ownerKind: 'DOCUMENT' as const,
        ownerKey,
        surface: null,
        invented: false as const
      }));
  }
  const seen = new Set<string>();
  const matches: IntegrationSlot[] = [];
  for (const tool of input.inventory.tools) {
    if (tool.name !== proposal.key) continue;
    const key = `${tool.name}\u0000${tool.surface}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push(Object.freeze({
      ownerKind: 'TOOL',
      ownerKey: tool.name,
      surface: tool.surface,
      invented: false
    }));
  }
  return matches.sort((left, right) => (
    left.ownerKey.localeCompare(right.ownerKey)
    || String(left.surface).localeCompare(String(right.surface))
  ));
}

export function resolveGw22IntegrationSlot(
  rawInput: Gw22IntegrationSlotInput,
  substrate: GovernedContractSubstrate
): Gw22IntegrationSlotResult {
  const input = Gw22InputSchema.parse(rawInput);
  const candidates = input.inventoryStatus === 'CURRENT'
    ? integrationCandidates(input)
    : [];
  const status: Gw22IntegrationSlotResult['status'] = input.inventoryStatus === 'STALE'
    ? 'STALE'
    : input.inventoryStatus === 'UNAVAILABLE'
      ? 'UNVERIFIED'
      : candidates.length === 0
        ? 'NONE'
        : candidates.length === 1
          ? 'FOUND'
          : 'AMBIGUOUS';
  const freshness: Gw22IntegrationSlotResult['freshness'] = input.inventoryStatus === 'STALE'
    ? 'STALE'
    : input.inventoryStatus === 'UNAVAILABLE'
      ? 'UNKNOWN'
      : 'CURRENT';
  const reasonCodes = status === 'STALE'
    ? ['INTEGRATION_SLOT_INVENTORY_STALE']
    : status === 'UNVERIFIED'
      ? ['INTEGRATION_SLOT_INVENTORY_UNAVAILABLE']
      : status === 'NONE'
        ? ['INTEGRATION_SLOT_NOT_FOUND']
        : status === 'AMBIGUOUS'
          ? ['INTEGRATION_SLOT_AMBIGUOUS']
          : [];
  const payload = Object.freeze({
    proposal: Object.freeze({ ...input.proposal }),
    inventoryDigest: input.inventoryDigest
  });
  const base = observation({
    contract: contract('GW-22', substrate),
    status,
    freshness,
    reasonCodes,
    evidenceRefs: [{
      authority: 'Current State inventories',
      kind: 'DERIVATION',
      reference: `integration-slot:${input.proposal.kind.toLowerCase()}:${input.proposal.key}`,
      observedAt: input.observedAt,
      freshness,
      digest: digest({
        inventoryStatus: input.inventoryStatus,
        inventoryDigest: input.inventoryDigest,
        proposal: input.proposal,
        candidates
      }),
      binding: { repository: input.repository }
    }],
    payload
  });
  return Object.freeze({
    ...base,
    slot: status === 'FOUND' ? candidates[0]! : null
  });
}

function validIso(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function observeGw23ExactGithubBaseline(
  input: Gw23ExactGithubBaselineInput,
  substrate: GovernedContractSubstrate
): Gw23ExactGithubBaselineResult {
  const repository = RepositorySchema.parse(input.repository);
  const workBranch = BoundedPathSchema.parse(input.workBranch);
  const stepStartedAt = z.string().datetime({ offset: true }).parse(input.stepStartedAt);
  const observedAt = z.string().datetime({ offset: true }).parse(input.github.observedAt);
  const payload = Object.freeze({ stepStartedAt });

  let status: Gw23ExactGithubBaselineResult['status'] = 'SUCCESS';
  let freshness: Gw23ExactGithubBaselineResult['freshness'] = 'CURRENT';
  let reasonCodes: string[] = [];
  let baseline: GithubBaseline | null = null;

  const startedMs = validIso(stepStartedAt)!;
  const observedMs = validIso(observedAt)!;
  const head = input.github.workBranchHead;
  const checksHead = input.github.checks.headSha;
  const pullRequestHead = input.github.pullRequest?.headSha ?? null;

  const requiredEvidence = [
    ...(input.github.pullRequest ? [input.github.evidence.pullRequest] : []),
    ...(input.github.checks.total > 0 ? [input.github.evidence.checks] : [])
  ];
  const requiredEvidenceStale = requiredEvidence.some((entry) => entry.freshness === 'STALE');
  const requiredEvidenceUnavailable = requiredEvidence.some(
    (entry) => entry.freshness === 'UNAVAILABLE'
  );

  if (observedMs < startedMs) {
    status = 'STALE';
    freshness = 'STALE';
    reasonCodes = ['GITHUB_BASELINE_PRE_STEP'];
  } else if (requiredEvidenceStale) {
    status = 'STALE';
    freshness = 'STALE';
    reasonCodes = ['GITHUB_BASELINE_EVIDENCE_STALE'];
  } else if (requiredEvidenceUnavailable) {
    status = 'UNVERIFIED';
    freshness = 'UNKNOWN';
    reasonCodes = ['GITHUB_BASELINE_EVIDENCE_UNAVAILABLE'];
  } else if (
    input.github.status !== 'CURRENT'
    || input.github.workBranch !== workBranch
    || !head
    || !ShaSchema.safeParse(head).success
  ) {
    status = 'UNVERIFIED';
    freshness = 'UNKNOWN';
    reasonCodes = ['GITHUB_BASELINE_UNVERIFIED'];
  } else if (
    input.github.checks.exactHead === false
    || (checksHead !== null && checksHead !== head)
    || (pullRequestHead !== null && pullRequestHead !== head)
    || input.github.reasonCodes.includes('GITHUB_HEAD_MISMATCH')
  ) {
    status = 'CONFLICT';
    reasonCodes = ['GITHUB_BASELINE_HEAD_MISMATCH'];
  } else {
    baseline = Object.freeze({
      repository,
      branch: workBranch,
      headSha: head,
      observedAt
    });
  }

  const evidenceRefs: EvidenceRef[] = baseline ? [{
    authority: 'GitHub',
    kind: 'OBSERVATION',
    reference: `github-baseline:${repository}:${workBranch}:${baseline.headSha}`,
    observedAt,
    freshness,
    digest: digest(baseline),
    binding: {
      repository,
      branch: workBranch,
      headSha: baseline.headSha
    }
  }] : [];

  const base = observation({
    contract: contract('GW-23', substrate),
    status,
    freshness,
    reasonCodes,
    evidenceRefs,
    payload
  });
  return Object.freeze({ ...base, baseline });
}
