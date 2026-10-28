/**
 * GitHub installation permission observations for the universal Governed Deploy work.
 * This is NOT a runtime write admission or a replacement for GitRegistry V2,
 * Governed Sessions, claims, locks, consent or repository rulesets.
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
  repositoryIncluded: boolean | null;
  repositoryAccessible: boolean | null;
  permissions: Readonly<Partial<Record<GithubInstallationPermission, 'read' | 'write' | 'none'>>>;
  observedAt: string;
}>;

export type GithubCapabilityRequest = Readonly<{
  repository: string;
  operation: GithubRepositoryOperation;
  now: string;
  maxAgeSeconds?: number;
}>;

export type GithubCapabilityAssessment = Readonly<{
  status: 'PERMISSION_OBSERVED' | 'BLOCKED';
  reasonCodes: readonly string[];
  requiredPermissions: readonly string[];
  repository: string;
  operation: GithubRepositoryOperation;
  /** Permission observation never authorizes mutation by itself. */
  runtimeWriteAuthorized: false;
}>;

/** RED implementation: a safe stub, all positive behavior deliberately missing. */
export function assessGithubInstallationCapability(
  request: GithubCapabilityRequest,
  _observation: GithubInstallationObservation | null
): GithubCapabilityAssessment {
  return {
    status: 'BLOCKED',
    reasonCodes: ['UNVERIFIED_INSTALLATION'],
    requiredPermissions: [],
    repository: request.repository,
    operation: request.operation,
    runtimeWriteAuthorized: false
  };
}
