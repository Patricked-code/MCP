import type {
  DurableGithubRepositoryObservation,
  GithubRepositoryResolution,
  GithubRepositoryReasonCode,
  GithubRepositoryUncertainty
} from './repositoryResolution.js';

/**
 * GGCC-6 (TB-W3-GGCC-GH-REPO-BRANCH): maps the bounded output of
 * github_get_repository_state to a DurableGithubRepositoryObservation so that
 * target-scope sessions (sessions bound to a non-MCP repository) can prove
 * their REPOSITORY layer in project reality without the MCP GitHub observer.
 *
 * Pure and read-only: no API call, no filesystem access, no mutation.
 */

type RepositoryStateOutput = {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  archived: boolean;
  disabled: boolean;
  defaultBranch: string;
  visibility: string;
  pushedAt: string;
  updatedAt: string;
  owner: { login: string; type: string };
  htmlUrl: string;
};

function normalizeOwnerType(value: string): 'user' | 'organization' {
  return value.toLowerCase() === 'organization' ? 'organization' : 'user';
}

function same(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

export function deriveTargetScopeRepositoryObservation(
  requestedFullName: string,
  toolOutput: RepositoryStateOutput,
  observedAt: string
): DurableGithubRepositoryObservation {
  if (
    !toolOutput.fullName
    || !same(toolOutput.fullName, requestedFullName)
    || typeof toolOutput.id !== 'number'
    || !toolOutput.owner?.login
  ) {
    return {
      status: 'MALFORMED',
      observedAt,
      freshness: 'UNKNOWN',
      requestedFullName,
      repository: null,
      reasonCode: null
    };
  }
  const parts = toolOutput.fullName.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      status: 'MALFORMED',
      observedAt,
      freshness: 'UNKNOWN',
      requestedFullName,
      repository: null,
      reasonCode: null
    };
  }
  return {
    status: 'VERIFIED',
    observedAt,
    freshness: 'CURRENT',
    requestedFullName,
    repository: {
      githubRepositoryId: toolOutput.id,
      owner: parts[0],
      ownerType: normalizeOwnerType(toolOutput.owner.type),
      name: parts[1],
      fullName: toolOutput.fullName,
      defaultBranch: toolOutput.defaultBranch ?? null,
      visibility: toolOutput.visibility === 'public' ? 'public'
        : toolOutput.visibility === 'internal' ? 'internal'
        : 'private',
      archived: toolOutput.archived === true,
      fork: false
    },
    reasonCode: null
  };
}

export function composeTargetScopeRepositoryResolution(
  observation: DurableGithubRepositoryObservation,
  requestedRepositoryContext: string,
  observedAt: string
): GithubRepositoryResolution {
  if (observation.status !== 'VERIFIED' || !observation.repository) {
    return {
      status: 'UNVERIFIED',
      observedAt,
      requestedRepositoryContext,
      selectionSource: null,
      selectedAccountContext: null,
      selectedRepository: null,
      candidates: [],
      candidateCount: 0,
      freshness: 'UNKNOWN',
      provenance: ['target_scope_observation'],
      reasonCodes: ['GITHUB_REPOSITORY_API_UNAVAILABLE'] as GithubRepositoryReasonCode[],
      uncertainties: [] as GithubRepositoryUncertainty[],
      registryDigest: null
    };
  }
  const repo = observation.repository;
  return {
    status: 'RESOLVED',
    observedAt,
    requestedRepositoryContext,
    selectionSource: 'connection_context',
    selectedAccountContext: {
      owner: repo.owner,
      type: repo.ownerType
    },
    selectedRepository: {
      repositoryId: `github:${repo.fullName}`,
      githubRepositoryId: repo.githubRepositoryId,
      owner: repo.owner,
      ownerType: repo.ownerType,
      name: repo.name,
      fullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
      visibility: repo.visibility,
      archived: repo.archived,
      fork: repo.fork
    },
    candidates: [],
    candidateCount: 1,
    freshness: observation.freshness === 'CURRENT' ? 'CURRENT' : 'UNKNOWN',
    provenance: [
      'target_scope_observation',
      'github_api:get_repository'
    ],
    reasonCodes: [] as GithubRepositoryReasonCode[],
    uncertainties: [] as GithubRepositoryUncertainty[],
    registryDigest: null
  };
}
