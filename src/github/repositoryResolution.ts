import type { GithubIdentityResolution } from './identityResolution.js';

export type GithubRepositoryStatus = 'RESOLVED' | 'NONE' | 'AMBIGUOUS' | 'UNVERIFIED';
export type GithubRepositoryFreshness = 'CURRENT' | 'STALE' | 'UNKNOWN';
export type GithubRepositoryReasonCode =
  | 'GITHUB_REPOSITORY_IDENTITY_AMBIGUOUS'
  | 'GITHUB_REPOSITORY_IDENTITY_UNVERIFIED'
  | 'GITHUB_REPOSITORY_AUTHENTICATION_CONTEXT_UNAVAILABLE'
  | 'GITHUB_REPOSITORY_CONTEXT_INVALID'
  | 'GITHUB_REPOSITORY_CANDIDATE_NOT_FOUND'
  | 'GITHUB_REPOSITORY_CANDIDATE_AMBIGUOUS'
  | 'GITHUB_REPOSITORY_REGISTRY_UNAVAILABLE'
  | 'GITHUB_REPOSITORY_ACCOUNT_CONTEXT_MISMATCH'
  | 'GITHUB_REPOSITORY_AUTH_MISSING'
  | 'GITHUB_REPOSITORY_AUTH_INVALID'
  | 'GITHUB_REPOSITORY_PERMISSION_DENIED'
  | 'GITHUB_REPOSITORY_NOT_FOUND_OR_INVISIBLE'
  | 'GITHUB_REPOSITORY_API_UNAVAILABLE'
  | 'GITHUB_REPOSITORY_RESPONSE_INVALID'
  | 'GITHUB_REPOSITORY_EVIDENCE_STALE'
  | 'GITHUB_REPOSITORY_CACHE_MISS';

export type GithubRepositoryUncertainty = 'GITHUB_REPOSITORY_VISIBILITY_UNCERTAIN';

export type DurableGithubRepositoryObservation = {
  status:
    | 'VERIFIED'
    | 'NOT_FOUND_OR_INVISIBLE'
    | 'AUTH_INVALID'
    | 'PERMISSION_DENIED'
    | 'UNAVAILABLE'
    | 'MALFORMED';
  observedAt: string;
  freshness: 'CURRENT' | 'UNKNOWN';
  requestedFullName: string;
  repository: {
    githubRepositoryId: number;
    owner: string;
    ownerType: 'user' | 'organization';
    name: string;
    fullName: string;
    defaultBranch: string | null;
    visibility: 'public' | 'private' | 'internal' | null;
    archived: boolean;
    fork: boolean;
  } | null;
  reasonCode: GithubRepositoryReasonCode | null;
};

export type GithubRepositoryResolutionInput = {
  identity: GithubIdentityResolution;
  identityAuthenticationContextId: string | null;
  requestedRepositoryContext: string | null;
  registry: {
    available: boolean;
    schemaVersion: 1;
    mappings: Array<{ githubOwner: string; githubRepo: string }>;
    digest: string | null;
  };
  repositoryObservation: DurableGithubRepositoryObservation | null;
  observedAt: string;
};

export type GithubRepositoryResolution = {
  status: GithubRepositoryStatus;
  observedAt: string;
  requestedRepositoryContext: string | null;
  selectionSource: 'connection_context' | 'git_registry' | null;
  selectedAccountContext: {
    owner: string;
    type: 'user' | 'organization';
  } | null;
  selectedRepository: {
    repositoryId: string;
    githubRepositoryId: number;
    owner: string;
    ownerType: 'user' | 'organization';
    name: string;
    fullName: string;
    defaultBranch: string | null;
    visibility: 'public' | 'private' | 'internal' | null;
    archived: boolean;
    fork: boolean;
  } | null;
  candidates: Array<{
    repositoryId: string;
    fullName: string;
    source: 'git_registry';
  }>;
  candidateCount: number;
  freshness: GithubRepositoryFreshness;
  provenance: string[];
  reasonCodes: GithubRepositoryReasonCode[];
  uncertainties: GithubRepositoryUncertainty[];
  registryDigest: string | null;
};

type Candidate = { owner: string; name: string; fullName: string };

function same(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function parseRepository(value: string | null): Candidate | null {
  if (!value || value !== value.trim() || value.length > 202) return null;
  const parts = value.split('/');
  if (parts.length !== 2) return null;
  const [owner, name] = parts;
  if (!owner || !name || owner.length > 100 || name.length > 100) return null;
  if (owner === '.' || owner === '..' || name === '.' || name === '..') return null;
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(name)) return null;
  return { owner, name, fullName: `${owner}/${name}` };
}

function candidateProjection(candidate: Candidate) {
  return {
    repositoryId: `github:${candidate.fullName}`,
    fullName: candidate.fullName,
    source: 'git_registry' as const
  };
}

function unresolved(
  input: GithubRepositoryResolutionInput,
  status: Exclude<GithubRepositoryStatus, 'RESOLVED'>,
  reasonCode: GithubRepositoryReasonCode,
  options: {
    source?: 'connection_context' | 'git_registry' | null;
    candidates?: Candidate[];
    candidateCount?: number;
    freshness?: GithubRepositoryFreshness;
    uncertainty?: GithubRepositoryUncertainty;
  } = {}
): GithubRepositoryResolution {
  const candidates = options.candidates ?? [];
  return {
    status,
    observedAt: input.observedAt,
    requestedRepositoryContext: input.requestedRepositoryContext,
    selectionSource: options.source ?? null,
    selectedAccountContext: input.identity.selectedAccountContext
      ? {
          owner: input.identity.selectedAccountContext.owner,
          type: input.identity.selectedAccountContext.type
        }
      : null,
    selectedRepository: null,
    candidates: candidates.slice(0, 20).map(candidateProjection),
    candidateCount: options.candidateCount ?? candidates.length,
    freshness: options.freshness ?? 'UNKNOWN',
    provenance: [
      'github_identity',
      ...(options.source === 'connection_context' ? ['connection_context'] : []),
      ...(options.source === 'git_registry' ? ['git_registry_v1'] : [])
    ],
    reasonCodes: [reasonCode],
    uncertainties: options.uncertainty ? [options.uncertainty] : [],
    registryDigest: input.registry.digest
  };
}

function registryCandidates(input: GithubRepositoryResolutionInput): Candidate[] {
  const selectedOwner = input.identity.selectedAccountContext?.owner;
  if (!selectedOwner) return [];
  const unique = new Map<string, Candidate>();
  for (const mapping of input.registry.mappings.slice(0, 1000)) {
    const candidate = parseRepository(`${mapping.githubOwner}/${mapping.githubRepo}`);
    if (!candidate || !same(candidate.owner, selectedOwner)) continue;
    const key = candidate.fullName.toLowerCase();
    if (!unique.has(key)) unique.set(key, candidate);
  }
  return [...unique.values()].sort((left, right) => (
    left.fullName.toLowerCase().localeCompare(right.fullName.toLowerCase())
  ));
}

export function resolveGithubRepository(
  input: GithubRepositoryResolutionInput
): GithubRepositoryResolution {
  if (input.identity.status === 'AMBIGUOUS') {
    return unresolved(input, 'AMBIGUOUS', 'GITHUB_REPOSITORY_IDENTITY_AMBIGUOUS');
  }
  if (input.identity.status !== 'RESOLVED' || input.identity.freshness !== 'CURRENT') {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_REPOSITORY_IDENTITY_UNVERIFIED');
  }
  if (!input.identityAuthenticationContextId) {
    return unresolved(
      input,
      'UNVERIFIED',
      'GITHUB_REPOSITORY_AUTHENTICATION_CONTEXT_UNAVAILABLE'
    );
  }

  let source: 'connection_context' | 'git_registry';
  let candidate: Candidate;
  let candidates: Candidate[] = [];
  if (input.requestedRepositoryContext !== null) {
    const exact = parseRepository(input.requestedRepositoryContext);
    if (!exact) {
      return unresolved(input, 'UNVERIFIED', 'GITHUB_REPOSITORY_CONTEXT_INVALID');
    }
    source = 'connection_context';
    candidate = exact;
  } else {
    if (!input.registry.available) {
      return unresolved(input, 'UNVERIFIED', 'GITHUB_REPOSITORY_REGISTRY_UNAVAILABLE');
    }
    if (input.registry.mappings.length > 1000) {
      return unresolved(input, 'UNVERIFIED', 'GITHUB_REPOSITORY_REGISTRY_UNAVAILABLE');
    }
    candidates = registryCandidates(input);
    if (candidates.length === 0) {
      return unresolved(input, 'NONE', 'GITHUB_REPOSITORY_CANDIDATE_NOT_FOUND', {
        source: 'git_registry'
      });
    }
    if (candidates.length > 1) {
      return unresolved(input, 'AMBIGUOUS', 'GITHUB_REPOSITORY_CANDIDATE_AMBIGUOUS', {
        source: 'git_registry', candidates, candidateCount: candidates.length
      });
    }
    source = 'git_registry';
    candidate = candidates[0]!;
  }

  const accountOwner = input.identity.selectedAccountContext?.owner;
  if (!accountOwner || !same(candidate.owner, accountOwner)) {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_REPOSITORY_ACCOUNT_CONTEXT_MISMATCH', {
      source, candidates, candidateCount: candidates.length || 1
    });
  }
  const observation = input.repositoryObservation;
  if (!observation) {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_REPOSITORY_API_UNAVAILABLE', {
      source, candidates, candidateCount: candidates.length || 1
    });
  }
  if (observation.status !== 'VERIFIED' || !observation.repository) {
    const reason = observation.status === 'UNAVAILABLE'
      && observation.reasonCode === 'GITHUB_REPOSITORY_AUTH_MISSING'
      ? 'GITHUB_REPOSITORY_AUTH_MISSING'
      : ({
      NOT_FOUND_OR_INVISIBLE: 'GITHUB_REPOSITORY_NOT_FOUND_OR_INVISIBLE',
      AUTH_INVALID: 'GITHUB_REPOSITORY_AUTH_INVALID',
      PERMISSION_DENIED: 'GITHUB_REPOSITORY_PERMISSION_DENIED',
      UNAVAILABLE: 'GITHUB_REPOSITORY_API_UNAVAILABLE',
      MALFORMED: 'GITHUB_REPOSITORY_RESPONSE_INVALID'
    } as const)[observation.status as Exclude<typeof observation.status, 'VERIFIED'>]
      ?? 'GITHUB_REPOSITORY_RESPONSE_INVALID';
    return unresolved(input, 'UNVERIFIED', reason, {
      source,
      candidates,
      candidateCount: candidates.length || 1,
      uncertainty: observation.status === 'NOT_FOUND_OR_INVISIBLE'
        ? 'GITHUB_REPOSITORY_VISIBILITY_UNCERTAIN'
        : undefined
    });
  }
  if (observation.freshness !== 'CURRENT') {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_REPOSITORY_EVIDENCE_STALE', {
      source, candidates, candidateCount: candidates.length || 1,
      freshness: 'UNKNOWN'
    });
  }
  const repository = observation.repository;
  if (
    !same(observation.requestedFullName, candidate.fullName)
    || !same(repository.fullName, candidate.fullName)
    || !same(repository.fullName, `${repository.owner}/${repository.name}`)
    || repository.ownerType !== input.identity.selectedAccountContext?.type
  ) {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_REPOSITORY_RESPONSE_INVALID', {
      source, candidates, candidateCount: candidates.length || 1
    });
  }

  return {
    status: 'RESOLVED',
    observedAt: input.observedAt,
    requestedRepositoryContext: input.requestedRepositoryContext,
    selectionSource: source,
    selectedAccountContext: {
      owner: input.identity.selectedAccountContext!.owner,
      type: input.identity.selectedAccountContext!.type
    },
    selectedRepository: {
      repositoryId: `github:${repository.fullName}`,
      githubRepositoryId: repository.githubRepositoryId,
      owner: repository.owner,
      ownerType: repository.ownerType,
      name: repository.name,
      fullName: repository.fullName,
      defaultBranch: repository.defaultBranch,
      visibility: repository.visibility,
      archived: repository.archived,
      fork: repository.fork
    },
    candidates: candidates.slice(0, 20).map(candidateProjection),
    candidateCount: candidates.length || 1,
    freshness: 'CURRENT',
    provenance: [
      'github_identity',
      source === 'connection_context' ? 'connection_context' : 'git_registry_v1',
      'github_api:get_repository'
    ],
    reasonCodes: [],
    uncertainties: [],
    registryDigest: input.registry.digest
  };
}
