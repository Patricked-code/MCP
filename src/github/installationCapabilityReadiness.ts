/**
 * GitHub App installation permission observation for universal Governed Deploy.
 *
 * Pure, non-privileged preflight: consumes *fresh GitHub API observations* and
 * reports whether the permission is seen. It never mints a token, invokes the
 * GitHub API, grants a mandate or authorizes any runtime write.
 * All work still goes through existing GitRegistry V2, GitHub-first policy,
 * governed Task/Session/claim/locks, exact-HEAD review, consent and CI.
 */
export type GithubRepositoryOperation =
  | 'repository.read'
  | 'repository.write'
  | 'pull_request.create'
  | 'pull_request.merge'
  | 'actions.dispatch'
  | 'repository.admin';

export type GithubInstallationPermission = 'contents' | 'pull_requests' | 'actions' | 'administration';

export type GithubInstallationObservation = Readonly<{
  source: 'GITHUB_API' | 'UNVERIFIED';
  installationId: number;
  accountLogin: string;
  repositorySelection: 'all' | 'selected' | 'unknown';
  /** Must be true for a selected-repository installation. */
  repositoryIncluded: boolean | null;
  /** Explicit repository-level live observation, including on all-repo installations. */
  repositoryAccessible: boolean | null;
  permissions: Readonly<Partial<Record<GithubInstallationPermission, 'read' | 'write' | 'none'>>>;
  observedAt: string;
}>;

export type GithubCapabilityRequest = Readonly<{
  repository: string;
  operation: GithubRepositoryOperation;
  now: string;
  /** Bounded to 1..900 seconds; default 300. */
  maxAgeSeconds?: number;
}>;

export type GithubCapabilityReasonCode =
  | 'INVALID_TARGET'
  | 'INVALID_OPERATION'
  | 'MISSING_OBSERVATION'
  | 'UNVERIFIED_INSTALLATION'
  | 'ACCOUNT_MISMATCH'
  | 'REPOSITORY_NOT_ATTESTED'
  | 'STALE_OBSERVATION'
  | 'PERMISSION_MISSING';

export type GithubCapabilityAssessment = Readonly<{
  status: 'PERMISSION_OBSERVED' | 'BLOCKED';
  reasonCodes: readonly GithubCapabilityReasonCode[];
  requiredPermissions: readonly string[];
  repository: string;
  operation: GithubRepositoryOperation;
  /** Always false. The existing governed runtime determines write authority. */
  runtimeWriteAuthorized: false;
}>;

const REQUIREMENTS: Readonly<Record<GithubRepositoryOperation, Readonly<{
  name: GithubInstallationPermission;
  minimum: 'read' | 'write';
}>>> = {
  'repository.read': { name: 'contents', minimum: 'read' },
  'repository.write': { name: 'contents', minimum: 'write' },
  'pull_request.create': { name: 'pull_requests', minimum: 'write' },
  'pull_request.merge': { name: 'contents', minimum: 'write' },
  'actions.dispatch': { name: 'actions', minimum: 'write' },
  'repository.admin': { name: 'administration', minimum: 'write' }
};
const ACCOUNT = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO = /^[A-Za-z0-9_.-]{1,100}$/;
const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function validRepository(repository: string): boolean {
  if (typeof repository !== 'string') return false;
  const parts = repository.split('/');
  return parts.length === 2
    && ACCOUNT.test(parts[0]!)
    && REPO.test(parts[1]!)
    && parts[1] !== '.' && parts[1] !== '..';
}

function validObservedTime(request: GithubCapabilityRequest, observation: GithubInstallationObservation): boolean {
  const maxAge = request.maxAgeSeconds ?? 300;
  if (!Number.isSafeInteger(maxAge) || maxAge < 1 || maxAge > 900
    || typeof request.now !== 'string' || !UTC_ISO.test(request.now)
    || typeof observation.observedAt !== 'string' || !UTC_ISO.test(observation.observedAt)) {
    return false;
  }
  const now = Date.parse(request.now);
  const then = Date.parse(observation.observedAt);
  return Number.isFinite(now) && Number.isFinite(then)
    && then <= now && now - then <= maxAge * 1000;
}

function sufficientPermission(observed: unknown, minimum: 'read' | 'write'): boolean {
  return observed === 'write' || (minimum === 'read' && observed === 'read');
}

/**
 * Permission observation is necessary but insufficient for any write action.
 * No mutable operations or implicit account authority are performed.
 */
export function assessGithubInstallationCapability(
  request: GithubCapabilityRequest,
  observation: GithubInstallationObservation | null
): GithubCapabilityAssessment {
  const reasons: GithubCapabilityReasonCode[] = [];
  const requirement = Object.prototype.hasOwnProperty.call(REQUIREMENTS, request.operation)
    ? REQUIREMENTS[request.operation] : undefined;
  if (!validRepository(request.repository)) reasons.push('INVALID_TARGET');
  if (!requirement) reasons.push('INVALID_OPERATION');
  const requiredPermissions = requirement ? [requirement.name + ':' + requirement.minimum] : [];
  if (!observation) {
    reasons.push('MISSING_OBSERVATION');
  } else {
    if (observation.source !== 'GITHUB_API'
      || !Number.isSafeInteger(observation.installationId)
      || observation.installationId <= 0
      || !ACCOUNT.test(observation.accountLogin)) {
      reasons.push('UNVERIFIED_INSTALLATION');
    }
    if (validRepository(request.repository)
      && observation.accountLogin.toLowerCase() !== request.repository.split('/')[0]!.toLowerCase()) {
      reasons.push('ACCOUNT_MISMATCH');
    }
    if (observation.repositoryAccessible !== true
      || (observation.repositorySelection !== 'all' && observation.repositorySelection !== 'selected')
      || (observation.repositorySelection === 'selected' && observation.repositoryIncluded !== true)) {
      reasons.push('REPOSITORY_NOT_ATTESTED');
    }
    if (!validObservedTime(request, observation)) reasons.push('STALE_OBSERVATION');
    if (requirement && !sufficientPermission(observation.permissions?.[requirement.name], requirement.minimum)) {
      reasons.push('PERMISSION_MISSING');
    }
  }
  return {
    status: reasons.length === 0 ? 'PERMISSION_OBSERVED' : 'BLOCKED',
    reasonCodes: reasons,
    requiredPermissions,
    repository: request.repository,
    operation: request.operation,
    runtimeWriteAuthorized: false
  };
}
