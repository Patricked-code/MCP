import type { GithubRepositoryResolution } from './repositoryResolution.js';
import type {
  GitRegistryProjectEvidence
} from './registry.js';
import type {
  GitRegistryV2ActivationReasonCode
} from './registryV2.js';

export type GithubProjectStatus = 'RESOLVED' | 'NONE' | 'AMBIGUOUS' | 'UNVERIFIED';
export type GithubProjectFreshness = 'CURRENT' | 'STALE' | 'UNKNOWN';
export type GithubProjectReasonCode =
  | 'GITHUB_PROJECT_REPOSITORY_AMBIGUOUS'
  | 'GITHUB_PROJECT_REPOSITORY_NONE'
  | 'GITHUB_PROJECT_REPOSITORY_UNVERIFIED'
  | 'GITHUB_PROJECT_REGISTRY_UNAVAILABLE'
  | 'GITHUB_PROJECT_REGISTRY_MISMATCH'
  | 'GITHUB_PROJECT_MAPPING_NOT_FOUND'
  | 'GITHUB_PROJECT_MAPPING_AMBIGUOUS'
  | 'GITHUB_PROJECT_REFERENCE_UNVERIFIED'
  | 'GITHUB_PROJECT_CACHE_MISS'
  | 'GITHUB_PROJECT_EVIDENCE_STALE';

export type GithubProjectResolution = {
  status: GithubProjectStatus;
  observedAt: string;
  repositoryId: string | null;
  selectedMapping: {
    mappingId: string;
    repositoryId: string;
    projectId: string;
    projectUid: string | null;
    componentRole: string | null;
    activationReadiness: 'READY' | 'BLOCKED' | 'UNKNOWN';
    activationReasonCodes: GitRegistryV2ActivationReasonCode[];
  } | null;
  selectedProject: {
    projectId: string;
    projectUid: string;
    name: string;
    kind: string;
  } | null;
  candidates: Array<{
    mappingId: string;
    projectId: string;
  }>;
  candidateCount: number;
  freshness: GithubProjectFreshness;
  provenance: string[];
  reasonCodes: GithubProjectReasonCode[];
  registryDigest: string | null;
  candidateDigest: string | null;
};

export type GithubProjectResolutionInput = {
  repository: GithubRepositoryResolution;
  registry: GitRegistryProjectEvidence;
  observedAt: string;
};

function same(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function unresolved(
  input: GithubProjectResolutionInput,
  status: Exclude<GithubProjectStatus, 'RESOLVED'>,
  reasonCode: GithubProjectReasonCode,
  options: {
    repositoryId?: string | null;
    candidates?: Array<{ mappingId: string; projectId: string }>;
  } = {}
): GithubProjectResolution {
  const candidates = options.candidates ?? [];
  return {
    status,
    observedAt: input.observedAt,
    repositoryId: options.repositoryId ?? input.repository.selectedRepository?.repositoryId ?? null,
    selectedMapping: null,
    selectedProject: null,
    candidates: candidates.slice(0, 20),
    candidateCount: candidates.length,
    freshness: input.repository.freshness === 'STALE' ? 'STALE' : 'UNKNOWN',
    provenance: ['github_repository_resolution', ...(input.registry.available ? ['git_registry_v2_candidate'] : [])],
    reasonCodes: [reasonCode],
    registryDigest: input.registry.digest,
    candidateDigest: input.registry.candidateDigest
  };
}

export function resolveGithubProject(
  input: GithubProjectResolutionInput
): GithubProjectResolution {
  if (input.repository.status === 'AMBIGUOUS') {
    return unresolved(input, 'AMBIGUOUS', 'GITHUB_PROJECT_REPOSITORY_AMBIGUOUS');
  }
  if (input.repository.status === 'NONE') {
    return unresolved(input, 'NONE', 'GITHUB_PROJECT_REPOSITORY_NONE');
  }
  if (
    input.repository.status !== 'RESOLVED'
    || input.repository.freshness !== 'CURRENT'
    || !input.repository.selectedRepository
  ) {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_PROJECT_REPOSITORY_UNVERIFIED');
  }
  if (!input.registry.available || !input.registry.digest || !input.registry.candidateDigest) {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_PROJECT_REGISTRY_UNAVAILABLE');
  }
  if (
    input.repository.registryDigest
    && input.repository.registryDigest !== input.registry.digest
  ) {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_PROJECT_REGISTRY_MISMATCH');
  }
  if (input.registry.mappings.length > 1000 || input.registry.projects.length > 200) {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_PROJECT_REGISTRY_UNAVAILABLE');
  }

  const repositoryId = input.repository.selectedRepository.repositoryId;
  const matches = input.registry.mappings
    .filter((mapping) => same(mapping.repositoryId, repositoryId))
    .map((mapping) => ({
      mapping,
      candidate: { mappingId: mapping.mappingId, projectId: mapping.projectId }
    }))
    .sort((left, right) => left.mapping.mappingId.localeCompare(right.mapping.mappingId));

  if (matches.length === 0) {
    return unresolved(input, 'NONE', 'GITHUB_PROJECT_MAPPING_NOT_FOUND', { repositoryId });
  }
  if (matches.length > 1) {
    return unresolved(input, 'AMBIGUOUS', 'GITHUB_PROJECT_MAPPING_AMBIGUOUS', {
      repositoryId,
      candidates: matches.map((entry) => entry.candidate)
    });
  }

  const mapping = matches[0]!.mapping;
  const projects = input.registry.projects.filter((project) => project.projectId === mapping.projectId);
  if (projects.length !== 1) {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_PROJECT_REFERENCE_UNVERIFIED', {
      repositoryId,
      candidates: [matches[0]!.candidate]
    });
  }
  const project = projects[0]!;
  const component = project.repositoryComponents.find((entry) => (
    same(entry.repositoryId, repositoryId)
    && entry.mappingId === mapping.mappingId
  ));
  if (
    !component
    || (mapping.projectUid !== null && mapping.projectUid !== project.projectUid)
    || (mapping.componentRole !== null && mapping.componentRole !== component.role)
  ) {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_PROJECT_REFERENCE_UNVERIFIED', {
      repositoryId,
      candidates: [matches[0]!.candidate]
    });
  }

  const readiness = input.registry.activationReadiness.find(
    (entry) => entry.mappingId === mapping.mappingId
  );

  return {
    status: 'RESOLVED',
    observedAt: input.observedAt,
    repositoryId,
    selectedMapping: {
      mappingId: mapping.mappingId,
      repositoryId: mapping.repositoryId,
      projectId: mapping.projectId,
      projectUid: mapping.projectUid,
      componentRole: mapping.componentRole,
      activationReadiness: readiness?.status ?? 'UNKNOWN',
      activationReasonCodes: readiness?.reasonCodes ?? []
    },
    selectedProject: {
      projectId: project.projectId,
      projectUid: project.projectUid,
      name: project.name,
      kind: project.kind
    },
    candidates: [{ mappingId: mapping.mappingId, projectId: mapping.projectId }],
    candidateCount: 1,
    freshness: 'CURRENT',
    provenance: ['github_repository_resolution', 'git_registry_v2_candidate'],
    reasonCodes: [],
    registryDigest: input.registry.digest,
    candidateDigest: input.registry.candidateDigest
  };
}
