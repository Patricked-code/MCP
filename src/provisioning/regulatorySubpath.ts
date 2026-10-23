import { governedRuntimePath } from './projectRuntime.js';

/**
 * An additive subpath publication plan for the existing PROJECT_RUNTIME
 * mechanism. A plan never writes Plesk, Nginx, GitRegistry or S1.
 * The repository SHA must be admitted by the existing GitHub revision gate.
 */
export const REGULATORY_S1_TARGET = Object.freeze({
  serverId: 'S1',
  repositoryId: 'chainsolutions-wealthtech/Regulatory',
  officialBranch: 'main',
  domain: 'wealthtechinnovations.com',
  httpPath: '/regulatory',
  serverPath: '/opt/apps/regulatory',
  applicationSubdirectory: 'apps/web',
  runtime: 'nextjs'
} as const);

export type RegulatorySubpathEvidence = Readonly<{
  githubRevisionOnMain: boolean | null;
  githubReadableByMcp: boolean | null;
  registryMappingVerified: boolean | null;
  subscriptionAndVhostOwnedOnS1: boolean | null;
  governedParentRealpathVerified: boolean | null;
  applicationDirectoryAbsent: boolean | null;
  ingressPathUnclaimed: boolean | null;
  nextBasePathAndAssetsVerified: boolean | null;
  deploymentAndRollbackPlanVerified: boolean | null;
}>;

export type RegulatorySubpathRequest = Readonly<{
  serverId: string;
  repositoryId: string;
  officialBranch: string;
  domain: string;
  httpPath: string;
  serverPath: string;
  applicationSubdirectory: string;
  revision: string;
}>;
export type RegulatorySubpathDecision = Readonly<{
  state: 'BLOCKED' | 'READY_FOR_GOVERNED_CONSENT';
  reason: string;
  target: typeof REGULATORY_S1_TARGET | null;
  revision: string | null;
  mutationPerformed: false;
  authorizationInferred: false;
}>;

const EVIDENCE_CODES: Readonly<Record<keyof RegulatorySubpathEvidence, string>> = Object.freeze({
  githubRevisionOnMain: 'GITHUB_REVISION_UNVERIFIED',
  githubReadableByMcp: 'GITHUB_REPOSITORY_UNVERIFIED',
  registryMappingVerified: 'GITREGISTRY_MAPPING_UNVERIFIED',
  subscriptionAndVhostOwnedOnS1: 'PLESK_VHOST_OWNERSHIP_UNVERIFIED',
  governedParentRealpathVerified: 'SERVER_PATH_REALPATH_UNVERIFIED',
  applicationDirectoryAbsent: 'APPLICATION_PATH_ABSENCE_UNVERIFIED',
  ingressPathUnclaimed: 'INGRESS_PATH_COLLISION_OR_UNVERIFIED',
  nextBasePathAndAssetsVerified: 'NEXT_BASEPATH_UNVERIFIED',
  deploymentAndRollbackPlanVerified: 'INGRESS_BACKUP_AND_ROLLBACK_UNVERIFIED'
});
const PINNED_TARGET_KEYS = [
  'serverId','repositoryId','officialBranch','domain','httpPath',
  'serverPath','applicationSubdirectory'
] as const;
const VALID_SHA = /^[a-f0-9]{40}$/;

function blocked(reason: string): RegulatorySubpathDecision {
  return Object.freeze({
    state: 'BLOCKED', reason, target: null, revision: null,
    mutationPerformed: false, authorizationInferred: false
  });
}

/**
 * RED-GREEN scope policy for the exact Regulatory pilot. The boolean inputs
 * are evidence projections supplied by existing authoritative readers, NOT
 * user input or a passed allowWrite flag. Missing/false evidence fails closed.
 */
export function planRegulatoryS1Subpath(
  request: RegulatorySubpathRequest,
  evidence: RegulatorySubpathEvidence
): RegulatorySubpathDecision {
  if (PINNED_TARGET_KEYS.some((key) => request[key] !== REGULATORY_S1_TARGET[key])
    || governedRuntimePath(request.serverPath) !== REGULATORY_S1_TARGET.serverPath
    || !VALID_SHA.test(request.revision)) {
    return blocked('REGULATORY_EXACT_TARGET_INVALID');
  }
  for (const [key, reason] of Object.entries(EVIDENCE_CODES)) {
    if (evidence[key as keyof RegulatorySubpathEvidence] !== true) return blocked(reason);
  }
  // A green plan is an invitation to existing E3 and Governed Session/Claim/
  // Lock admission, never a grant to create directories or change ingress.
  return Object.freeze({
    state: 'READY_FOR_GOVERNED_CONSENT',
    reason: 'ALL_PREFLIGHT_EVIDENCE_VERIFIED',
    target: REGULATORY_S1_TARGET,
    revision: request.revision,
    mutationPerformed: false,
    authorizationInferred: false
  });
}
