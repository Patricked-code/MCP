/**
 * GD-U-A1 — read-only autonomy advice built by composing CURRENT MCP planners.
 *
 * This module does not allocate candidate work, grant actual governed task
 * ownership, create queues/locks/claims, mint credentials or execute commands.
 * Candidate dispatch is a non-authoritative planning projection; only the
 * existing runtime Task Queue / Governed Sessions / claim / locks / E3 consent
 * can admit any real operation. Fail closed on missing observations.
 */
import {
  dispatchCandidateWork,
  type CandidateDispatchInput,
  type CandidateDispatchResult
} from '../governedContext/candidateContinuity.js';
import {
  assessGithubInstallationCapability,
  type GithubCapabilityRequest,
  type GithubInstallationObservation
} from '../github/installationCapabilityReadiness.js';
import {
  planPleskSubdomain,
  type PleskSubdomainInput,
  type PleskSubdomainPlan
} from './pleskSite.js';

export type UniversalAutonomyTarget =
  | Readonly<{ mode: 'NO_INFRA_CHANGE' }>
  | Readonly<{
      mode: 'SUBDOMAIN';
      input: PleskSubdomainInput;
      evidenceSource: 'LIVE_PLESK_AND_FILESYSTEM' | 'UNVERIFIED';
      observedAt: string;
    }>
  | Readonly<{ mode: 'EXISTING_HOST_SUBPATH'; host: string; path: string }>;

export type UniversalAutonomyAdviceInput = Readonly<{
  /** Explicit observation instant. NEVER infer freshness from undocumented state. */
  at: string;
  /** Pre-existing candidate dispatcher input, NOT a runtime lease. */
  candidate: CandidateDispatchInput;
  github: Readonly<{
    request: GithubCapabilityRequest;
    observation: GithubInstallationObservation | null;
  }>;
  exactHeads: Readonly<{
    githubMain: string | null;
    serverCheckout: string | null;
    runtimeRevision: string | null;
  }>;
  target: UniversalAutonomyTarget;
}>;

export type AutonomyReason =
  | 'CANDIDATE_WORK_NOT_ELIGIBLE'
  | 'GITHUB_PERMISSION_NOT_ATTESTED'
  | 'EXACT_HEAD_NOT_ALIGNED'
  | 'PLESK_PREFLIGHT_NOT_ATTESTED'
  | 'SUBPATH_ADAPTER_NOT_ATTESTED'
  | 'TARGET_MODE_NOT_SUPPORTED';

export type UniversalAutonomyAdvice = Readonly<{
  disposition: 'PROPOSE' | 'HOLD' | 'COMPLETE_CANDIDATE_SET';
  /** The existing candidate dispatcher status, never a real Task Queue claim. */
  candidateStatus: CandidateDispatchResult['status'];
  candidateWorkItemId: string | null;
  reasonCodes: readonly AutonomyReason[];
  pleskDecision: PleskSubdomainPlan['decision'] | null;
  requiredAuthorities: readonly string[];
  nextSafeActions: readonly string[];
  runtimeWriteAuthorized: false;
  claimCreated: false;
  executed: false;
}>;

const BASE_AUTHORITIES = [
  'EXISTING_GOVERNED_TASK_SESSION_CLAIM_LOCKS',
  'E3_EXACT_CONSENT',
  'GITHUB_BRANCH_RULES_AND_CI'
] as const;
const SHA = /^[a-f0-9]{40}$/;
const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function isFresh(observed: string, current: string, maxAgeSeconds = 300): boolean {
  if (!UTC_ISO.test(observed) || !UTC_ISO.test(current)) return false;
  const then = Date.parse(observed);
  const now = Date.parse(current);
  return Number.isFinite(then) && Number.isFinite(now)
    && then <= now && now - then <= maxAgeSeconds * 1000;
}

function exactHeadAligned(input: UniversalAutonomyAdviceInput['exactHeads']): boolean {
  return SHA.test(input.githubMain ?? '')
    && input.githubMain === input.serverCheckout
    && input.githubMain === input.runtimeRevision;
}

/**
 * PLAN ONLY. Even "PROPOSE" is a candidate to request the *existing* runtime
 * admission, not permission to create or modify a live GitHub/Plesk/S1 resource.
 * No fallback from an existing host subpath to a new subdomain is permitted.
 */
export function composeUniversalAutonomyAdvice(
  input: UniversalAutonomyAdviceInput
): UniversalAutonomyAdvice {
  const candidate = dispatchCandidateWork(input.candidate);
  const base: Pick<UniversalAutonomyAdvice,
    'candidateStatus' | 'candidateWorkItemId' | 'runtimeWriteAuthorized' | 'claimCreated' | 'executed'
  > = {
    candidateStatus: candidate.status,
    candidateWorkItemId: candidate.workItem?.workItemId ?? null,
    runtimeWriteAuthorized: false,
    claimCreated: false,
    executed: false
  };

  // This says only that the local candidate set has reached terminal state.
  // It is NOT production readiness, deployment attestation, or program closure.
  if (candidate.status === 'COMPLETE') {
    return {
      ...base,
      disposition: 'COMPLETE_CANDIDATE_SET',
      reasonCodes: [],
      pleskDecision: null,
      requiredAuthorities: BASE_AUTHORITIES,
      nextSafeActions: ['VERIFY_EXISTING_RUNTIME_AND_CHECKPOINTS']
    };
  }

  const reasons: AutonomyReason[] = [];
  if (candidate.status !== 'ASSIGN' && candidate.status !== 'CONTINUE') {
    reasons.push('CANDIDATE_WORK_NOT_ELIGIBLE');
  }

  // Observation is necessary but insufficient; never manufacture admin rights.
  const github = assessGithubInstallationCapability(input.github.request, input.github.observation);
  if (github.status !== 'PERMISSION_OBSERVED'
    || input.at !== input.github.request.now) {
    reasons.push('GITHUB_PERMISSION_NOT_ATTESTED');
  }

  // Treat GitHub, S1 and Docker mismatch as a blocker for new work proposals.
  if (!exactHeadAligned(input.exactHeads)) reasons.push('EXACT_HEAD_NOT_ALIGNED');

  let pleskDecision: PleskSubdomainPlan['decision'] | null = null;
  const authorities: string[] = [...BASE_AUTHORITIES];
  switch (input.target.mode) {
    case 'NO_INFRA_CHANGE':
      break;
    case 'SUBDOMAIN': {
      authorities.push('PLESK_RUNTIME_ADMISSION');
      pleskDecision = planPleskSubdomain(input.target.input).decision;
      if (input.target.evidenceSource !== 'LIVE_PLESK_AND_FILESYSTEM'
        || !isFresh(input.target.observedAt, input.at)
        || (pleskDecision !== 'READY' && pleskDecision !== 'NO_OP')) {
        reasons.push('PLESK_PREFLIGHT_NOT_ATTESTED');
      }
      break;
    }
    case 'EXISTING_HOST_SUBPATH':
      // PR #352/#353 own the Regulatory subpath work. Never assume a
      // subdomain adapter can safely install a path into an existing vhost.
      reasons.push('SUBPATH_ADAPTER_NOT_ATTESTED');
      break;
    default:
      reasons.push('TARGET_MODE_NOT_SUPPORTED');
  }

  return {
    ...base,
    disposition: reasons.length === 0 ? 'PROPOSE' : 'HOLD',
    reasonCodes: reasons,
    pleskDecision,
    requiredAuthorities: authorities,
    nextSafeActions: reasons.length > 0
      ? ['REOBSERVE_EXISTING_AUTHORITIES', 'RECONCILE_WITH_OWNERS_AND_CONTRACTS']
      : ['REQUEST_GOVERNED_ADMISSION', 'VERIFY_CI_AND_EXACT_HEAD']
  };
}
