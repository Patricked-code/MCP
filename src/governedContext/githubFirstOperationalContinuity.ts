import {
  reconcileE2Entry, routeE2OwnerChoice,
  type E2LiveSnapshot, type E2OwnerChoice
} from '../governance/e2EntryFlow.js';
import type {WorkEntryIndexResult} from '../governance/workEntryContinuityIndex.js';

import { z } from 'zod';

import type { GithubOperationalContext } from './types.js';

export const OperationalExecutionNeedSchema = z.object({
  repositoryRead: z.boolean().default(false),
  repositoryWrite: z.boolean().default(false),
  serverReadEvidence: z.boolean().default(false),
  serverWrite: z.boolean().default(false),
  operationalMemoryMutation: z.boolean().default(false),
  runtimeToolInvocation: z.boolean().default(false)
}).strict();

export const GithubFirstFallbackStateSchema = z.object({
  readonlyEvidenceWorkflowAvailable: z.boolean().default(false),
  readonlyEvidenceEnvironmentConfigured: z.boolean().default(false)
}).strict();

export const GithubFirstOperationalBootstrapInputSchema = z.object({
  githubConnected: z.boolean(),
  repository: z.string().trim().min(1).max(200),
  observedHeadSha: z.string().regex(/^[0-9a-f]{40}$/),
  needs: OperationalExecutionNeedSchema,
  fallback: GithubFirstFallbackStateSchema
}).strict();

export type GithubFirstOperationalBootstrapInput = z.infer<
  typeof GithubFirstOperationalBootstrapInputSchema
>;

export type GithubFirstOperationalMode =
  | 'GITHUB_ONLY'
  | 'GITHUB_ACTION_READONLY_EVIDENCE'
  | 'RUNTIME_REQUIRED'
  | 'BLOCKED_GITHUB_CONNECTION_REQUIRED';

export type GithubFirstOperationalBootstrapResult = {
  mode: GithubFirstOperationalMode;
  githubBootstrapAllowed: boolean;
  runtimeMcpRequiredNow: boolean;
  explicitBridgeExposureRequiredNow: boolean;
  readonlyEvidenceFallbackSelected: boolean;
  preservedAuthorities: string[];
  reasonCode:
    | 'github_connection_missing'
    | 'github_surface_sufficient'
    | 'readonly_server_evidence_via_github_fallback'
    | 'runtime_mutation_or_runtime_authority_required'
    | 'readonly_server_evidence_fallback_unavailable';
  nextAction: string;
};

const PRESERVED_AUTHORITIES = [
  'GitHub',
  'Governed Task Queue',
  'Governed Session',
  'Bootstrap Receipt',
  'Governed Locks',
  'Live State',
  'Runtime'
];

export function resolveGithubFirstOperationalBootstrap(
  rawInput: GithubFirstOperationalBootstrapInput
): GithubFirstOperationalBootstrapResult {
  const input = GithubFirstOperationalBootstrapInputSchema.parse(rawInput);

  if (!input.githubConnected) {
    return {
      mode: 'BLOCKED_GITHUB_CONNECTION_REQUIRED',
      githubBootstrapAllowed: false,
      runtimeMcpRequiredNow: false,
      explicitBridgeExposureRequiredNow: false,
      readonlyEvidenceFallbackSelected: false,
      preservedAuthorities: [...PRESERVED_AUTHORITIES],
      reasonCode: 'github_connection_missing',
      nextAction: 'Connect GitHub and reobserve repository/canonical state.'
    };
  }

  const requiresRuntimeAuthority = (
    input.needs.serverWrite
    || input.needs.operationalMemoryMutation
    || input.needs.runtimeToolInvocation
  );

  if (requiresRuntimeAuthority) {
    return {
      mode: 'RUNTIME_REQUIRED',
      githubBootstrapAllowed: true,
      runtimeMcpRequiredNow: true,
      explicitBridgeExposureRequiredNow: true,
      readonlyEvidenceFallbackSelected: false,
      preservedAuthorities: [...PRESERVED_AUTHORITIES],
      reasonCode: 'runtime_mutation_or_runtime_authority_required',
      nextAction: 'Continue all GitHub-safe work first, then obtain runtime capability only for the bounded operation that requires it.'
    };
  }

  if (input.needs.serverReadEvidence) {
    const fallbackAvailable = (
      input.fallback.readonlyEvidenceWorkflowAvailable
      && input.fallback.readonlyEvidenceEnvironmentConfigured
    );

    if (fallbackAvailable) {
      return {
        mode: 'GITHUB_ACTION_READONLY_EVIDENCE',
        githubBootstrapAllowed: true,
        runtimeMcpRequiredNow: false,
        explicitBridgeExposureRequiredNow: false,
        readonlyEvidenceFallbackSelected: true,
        preservedAuthorities: [...PRESERVED_AUTHORITIES],
        reasonCode: 'readonly_server_evidence_via_github_fallback',
        nextAction: 'Create a bounded GitHub read-only evidence request and consume its GitHub Actions artifact.'
      };
    }

    return {
      mode: 'RUNTIME_REQUIRED',
      githubBootstrapAllowed: true,
      runtimeMcpRequiredNow: true,
      explicitBridgeExposureRequiredNow: true,
      readonlyEvidenceFallbackSelected: false,
      preservedAuthorities: [...PRESERVED_AUTHORITIES],
      reasonCode: 'readonly_server_evidence_fallback_unavailable',
      nextAction: 'Continue all GitHub-safe work first; runtime access is required only for the unresolved read-only server evidence.'
    };
  }

  return {
    mode: 'GITHUB_ONLY',
    githubBootstrapAllowed: true,
    runtimeMcpRequiredNow: false,
    explicitBridgeExposureRequiredNow: false,
    readonlyEvidenceFallbackSelected: false,
    preservedAuthorities: [...PRESERVED_AUTHORITIES],
    reasonCode: 'github_surface_sufficient',
    nextAction: 'Continue through GitHub without requesting MCP bridge exposure.'
  };
}


export type AgentCoordinationGithubExecutionProjection = Readonly<{
  authority: 'GitHub';
  repository: string;
  status: GithubOperationalContext['status'];
  observedAt: string;
  mainHead: string | null;
  workBranch: string | null;
  workBranchHead: string | null;
  pullRequest: Readonly<{
    number: number;
    state: 'open' | 'closed';
    draft: boolean;
    merged: boolean;
    base: string;
    head: string;
    headSha: string;
    updatedAt: string;
  }> | null;
  checks: Readonly<{
    status: GithubOperationalContext['checks']['status'];
    conclusion: string | null;
    total: number;
    failed: number;
    headSha: string | null;
    exactHead: boolean | null;
    requiredSatisfied: boolean | null;
    required: readonly Readonly<{
      context: string;
      status: string;
      conclusion: string | null;
    }>[];
  }>;
  reviews: Readonly<{
    headSha: string | null;
    exactHead: boolean | null;
    approvals: number;
    changesRequested: number;
    unresolvedThreads: number | null;
  }>;
  reasonCodes: readonly GithubOperationalContext['reasonCodes'][number][];
  authorizationInferred: false;
  mutationPerformed: false;
}>;

export function projectGithubExecutionForCoordination(
  repository: string,
  github: GithubOperationalContext
): AgentCoordinationGithubExecutionProjection {
  const boundedRepository = z.string().trim().min(1).max(200).parse(repository);
  return Object.freeze({
    authority: 'GitHub',
    repository: boundedRepository,
    status: github.status,
    observedAt: github.observedAt,
    mainHead: github.mainHead,
    workBranch: github.workBranch,
    workBranchHead: github.workBranchHead,
    pullRequest: github.pullRequest
      ? Object.freeze({
          number: github.pullRequest.number,
          state: github.pullRequest.state,
          draft: github.pullRequest.draft,
          merged: github.pullRequest.merged,
          base: github.pullRequest.base,
          head: github.pullRequest.head,
          headSha: github.pullRequest.headSha,
          updatedAt: github.pullRequest.updatedAt
        })
      : null,
    checks: Object.freeze({
      status: github.checks.status,
      conclusion: github.checks.conclusion,
      total: github.checks.total,
      failed: github.checks.failed,
      headSha: github.checks.headSha,
      exactHead: github.checks.exactHead,
      requiredSatisfied: github.checks.requiredSatisfied,
      required: Object.freeze(github.checks.required.map((check) => Object.freeze({ ...check })))
    }),
    reviews: Object.freeze({
      headSha: github.reviews.headSha ?? null,
      exactHead: github.reviews.exactHead ?? null,
      approvals: github.reviews.approvals,
      changesRequested: github.reviews.changesRequested,
      unresolvedThreads: github.reviews.unresolvedThreads
    }),
    reasonCodes: Object.freeze([...github.reasonCodes]),
    authorizationInferred: false,
    mutationPerformed: false
  });
}

export const EXTERNAL_GOVERNED_RECOVERY_FULL_NAME = "Méthode universelle de bifurcation externe gouvernée pour le développement, la correction, la maintenance, la reprise et le déploiement contrôlé du MCP — GitHub-first / OIDC / Non-régression";

export const ExternalGovernedRecoveryInputSchema = z.object({
  profile: z.literal('EXTERNAL_GOVERNED_RECOVERY'),
  ownerSelected: z.boolean(),
  collisionFreeObserved: z.boolean(),
  expectedMainSha: z.string().regex(/^[a-f0-9]{40}$/),
  observedMainSha: z.string().regex(/^[a-f0-9]{40}$/),
  expectedBranchSha: z.string().regex(/^[a-f0-9]{40}$/),
  observedBranchSha: z.string().regex(/^[a-f0-9]{40}$/),
  github: GithubFirstOperationalBootstrapInputSchema
}).strict();

export type ExternalGovernedRecoveryInput = z.infer<typeof ExternalGovernedRecoveryInputSchema>;

export function previewExternalGovernedRecovery(raw: ExternalGovernedRecoveryInput) {
  const input = ExternalGovernedRecoveryInputSchema.parse(raw);
  const safe = {
    profile: 'EXTERNAL_GOVERNED_RECOVERY' as const,
    advisoryOnly: true as const,
    newTaskOrSessionCreated: false as const,
    githubWriteGranted: false as const,
    serverWriteGranted: false as const,
    deployGranted: false as const,
    workflowTriggered: false as const
  };
  if (!input.ownerSelected) return { ...safe, state: 'EXPLICIT_SELECTION_REQUIRED', transport: null };
  if (input.expectedMainSha !== input.observedMainSha ||
      input.expectedBranchSha !== input.observedBranchSha ||
      input.github.observedHeadSha !== input.observedBranchSha) {
    return { ...safe, state: 'HEAD_DRIFT_STOP_WRITE', transport: null };
  }
  if (!input.collisionFreeObserved) return { ...safe, state: 'COLLISION_UNRESOLVED', transport: null };
  if (!input.github.githubConnected) return { ...safe, state: 'GITHUB_CONNECTION_REQUIRED', transport: null };
  const transport = resolveGithubFirstOperationalBootstrap(input.github);
  const state = transport.mode === 'GITHUB_ONLY' ? 'GITHUB_WORK_CANDIDATE'
    : transport.mode === 'GITHUB_ACTION_READONLY_EVIDENCE' ? 'OIDC_EVIDENCE_CANDIDATE'
      : 'RUNTIME_AUTHORITY_REQUIRED';
  return { ...safe, state, transport: transport.mode, nextAction: transport.nextAction,
    githubOperationsRequireExistingPermissions: true as const };
}

/**
 * E2 continuation adapter for the existing external governed recovery profile.
 * The owner route is checked before the legacy GitHub-first preview is evaluated.
 * This is an advisory projection: it never creates a task, permission, or runtime session.
 */
export function previewExternalGovernedRecoveryAfterE2Reconciliation(
  rawInput:ExternalGovernedRecoveryInput,
  liveState:E2LiveSnapshot,
  index:WorkEntryIndexResult,
  ownerChoice:E2OwnerChoice,
  assessedAt:string=new Date().toISOString()
){
  const reconciliation=reconcileE2Entry(liveState,index,assessedAt);
  const ownerRoute=routeE2OwnerChoice(reconciliation,ownerChoice);
  const existingPreview=(
    ownerRoute.decision==='RESUME_EXISTING'&&rawInput.ownerSelected===true
  )?previewExternalGovernedRecovery(rawInput):null;
  const state=rawInput.ownerSelected!==true?'EXPLICIT_SELECTION_REQUIRED'
    :ownerRoute.decision==='BLOCKED'?'E2_RECONCILIATION_OR_CHOICE_BLOCKED'
      :ownerRoute.decision==='REVIEW_NEW_WORK_FOR_DUPLICATES'
        ?'E2_DUPLICATE_REVIEW_REQUIRED'
        :existingPreview?.state??'E2_RECONCILIATION_OR_CHOICE_BLOCKED';
  return {
    profile:'EXTERNAL_GOVERNED_RECOVERY' as const,
    state,
    reconciliation,
    ownerRoute,
    existingPreview,
    advisoryOnly:true as const,
    newTaskOrSessionCreated:false as const,
    githubWriteGranted:false as const,
    serverWriteGranted:false as const,
    deployGranted:false as const
  };
}
