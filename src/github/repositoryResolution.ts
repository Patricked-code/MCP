import type { GithubIdentityPolicy } from './identityPolicy.js';
import type { GitRegistryV2 } from './registryV2.js';

export type GithubRepositoryResolutionStatus = 'RESOLVED' | 'NONE' | 'AMBIGUOUS' | 'UNVERIFIED';
export type GithubTechnicalAccess = 'read' | 'write' | 'admin';
export type GithubRepositoryFreshness = 'CURRENT' | 'STALE' | 'UNKNOWN';
export type GithubRepositoryReasonCode =
  | 'GITHUB_REPOSITORY_POLICY_INVALID'
  | 'GITHUB_REPOSITORY_OAUTH_PRINCIPAL_UNAVAILABLE'
  | 'GITHUB_REPOSITORY_TARGET_REQUIRED'
  | 'GITHUB_REPOSITORY_TARGET_INVALID'
  | 'GITHUB_REPOSITORY_ROUTING_BINDING_NOT_FOUND'
  | 'GITHUB_REPOSITORY_ROUTING_BINDING_AMBIGUOUS'
  | 'GITHUB_REPOSITORY_ROUTE_CONNECTION_NOT_FOUND'
  | 'GITHUB_REPOSITORY_ROUTE_CONNECTION_AMBIGUOUS'
  | 'GITHUB_REPOSITORY_ACCOUNT_CONTEXT_UNVERIFIED'
  | 'GITHUB_REPOSITORY_NOT_VISIBLE'
  | 'GITHUB_REPOSITORY_API_UNAVAILABLE'
  | 'GITHUB_REPOSITORY_IDENTITY_MISMATCH'
  | 'GITHUB_REPOSITORY_TECHNICAL_ACCESS_INSUFFICIENT'
  | 'GITHUB_REPOSITORY_ARCHIVED_FOR_WRITE'
  | 'GITHUB_REPOSITORY_EVIDENCE_STALE';

export type GithubRepositoryObservation = {
  status: 'VERIFIED' | 'NOT_VISIBLE' | 'UNAVAILABLE';
  observedAt: string;
  freshness: GithubRepositoryFreshness;
  githubRepositoryId: number | null;
  fullName: string | null;
  defaultBranch: string | null;
  archived: boolean | null;
  permissions: {
    pull?: boolean;
    push?: boolean;
    maintain?: boolean;
    admin?: boolean;
  } | null;
};

export type GithubRepositoryRouteObservation = {
  connectionId: string;
  owner: string;
  type: 'user' | 'organization' | 'organization_or_user';
  configuredStatus: string;
  accountVerified: boolean;
  authenticationContextId: string | null;
  repository: GithubRepositoryObservation;
};

export type GithubRepositoryResolutionInput = {
  oauthPrincipalId: string | null;
  targetRepository: string | null;
  requiredTechnicalAccess: GithubTechnicalAccess;
  policy: GithubIdentityPolicy | null;
  policyDigest: string | null;
  policyValid: boolean;
  routes: GithubRepositoryRouteObservation[];
  registry: GitRegistryV2 | null;
  observedAt: string;
};

export type GithubRepositoryResolution = {
  status: GithubRepositoryResolutionStatus;
  observedAt: string;
  oauthPrincipalId: string | null;
  requestedRepository: string | null;
  requiredTechnicalAccess: GithubTechnicalAccess;
  repository: {
    fullName: string;
    owner: string;
    name: string;
    githubRepositoryId: number;
    registryRepositoryId: string;
    registryPresence: 'REGISTERED' | 'UNREGISTERED';
    defaultBranch: string | null;
    archived: boolean;
  } | null;
  route: {
    routingBindingId: string;
    connectionId: string;
    accountContext: {
      owner: string;
      type: 'user' | 'organization' | 'organization_or_user';
    };
  } | null;
  observedTechnicalAccess: {
    read: boolean;
    write: boolean;
    admin: boolean;
  } | null;
  authorizationEffect: 'NONE';
  freshness: GithubRepositoryFreshness;
  provenance: string[];
  reasonCodes: GithubRepositoryReasonCode[];
  policyDigest: string | null;
};

type ParsedRepository = { owner: string; name: string; fullName: string };

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPOSITORY_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;

function same(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function parseRepository(value: string | null): ParsedRepository | null {
  if (!value) return null;
  const trimmed = value.trim();
  const parts = trimmed.split('/');
  if (parts.length !== 2) return null;
  const [owner, name] = parts;
  if (!owner || !name || !OWNER_PATTERN.test(owner) || !REPOSITORY_NAME_PATTERN.test(name)) return null;
  return { owner, name, fullName: `${owner}/${name}` };
}

function baseResult(
  input: GithubRepositoryResolutionInput,
  status: GithubRepositoryResolutionStatus,
  reasonCodes: GithubRepositoryReasonCode[],
  options: Partial<Pick<GithubRepositoryResolution, 'repository' | 'route' | 'observedTechnicalAccess' | 'freshness' | 'provenance'>> = {}
): GithubRepositoryResolution {
  return {
    status,
    observedAt: input.observedAt,
    oauthPrincipalId: input.oauthPrincipalId,
    requestedRepository: input.targetRepository,
    requiredTechnicalAccess: input.requiredTechnicalAccess,
    repository: options.repository ?? null,
    route: options.route ?? null,
    observedTechnicalAccess: options.observedTechnicalAccess ?? null,
    authorizationEffect: 'NONE',
    freshness: options.freshness ?? 'UNKNOWN',
    provenance: options.provenance ?? ['identity_policy', 'durable_accounts'],
    reasonCodes,
    policyDigest: input.policyDigest
  };
}

function connectionMatches(
  route: GithubRepositoryRouteObservation,
  selector: { owner: string; type: 'user' | 'organization' | 'organization_or_user' }
): boolean {
  return same(route.owner, selector.owner) && route.type === selector.type;
}

function technicalAccess(repository: GithubRepositoryObservation): {
  read: boolean;
  write: boolean;
  admin: boolean;
} {
  const admin = repository.permissions?.admin === true;
  const write = admin || repository.permissions?.maintain === true || repository.permissions?.push === true;
  return {
    read: repository.status === 'VERIFIED',
    write,
    admin
  };
}

function hasRequiredAccess(
  access: ReturnType<typeof technicalAccess>,
  required: GithubTechnicalAccess
): boolean {
  if (required === 'admin') return access.admin;
  if (required === 'write') return access.write;
  return access.read;
}

export function resolveGithubRepository(input: GithubRepositoryResolutionInput): GithubRepositoryResolution {
  if (!input.policyValid || !input.policy) {
    return baseResult(input, 'UNVERIFIED', ['GITHUB_REPOSITORY_POLICY_INVALID']);
  }
  if (!input.oauthPrincipalId) {
    return baseResult(input, 'UNVERIFIED', ['GITHUB_REPOSITORY_OAUTH_PRINCIPAL_UNAVAILABLE']);
  }
  if (!input.targetRepository || !input.targetRepository.trim()) {
    return baseResult(input, 'UNVERIFIED', ['GITHUB_REPOSITORY_TARGET_REQUIRED']);
  }
  const requested = parseRepository(input.targetRepository);
  if (!requested) {
    return baseResult(input, 'UNVERIFIED', ['GITHUB_REPOSITORY_TARGET_INVALID']);
  }

  const bindings = input.policy.schemaVersion === 3
    ? input.policy.githubRepositoryRoutingBindings.filter((binding) => (
        binding.enabled
        && binding.provider === 'github'
        && same(binding.oauthPrincipalId, input.oauthPrincipalId!)
        && same(binding.repositoryOwner, requested.owner)
      ))
    : [];

  if (bindings.length === 0) {
    return baseResult(input, 'NONE', ['GITHUB_REPOSITORY_ROUTING_BINDING_NOT_FOUND']);
  }
  if (bindings.length > 1) {
    return baseResult(input, 'AMBIGUOUS', ['GITHUB_REPOSITORY_ROUTING_BINDING_AMBIGUOUS']);
  }

  const binding = bindings[0]!;
  const matchingRoutes = input.routes.filter((route) => connectionMatches(route, binding.connectionSelector));
  if (matchingRoutes.length === 0) {
    return baseResult(input, 'UNVERIFIED', ['GITHUB_REPOSITORY_ROUTE_CONNECTION_NOT_FOUND']);
  }
  if (matchingRoutes.length > 1) {
    return baseResult(input, 'AMBIGUOUS', ['GITHUB_REPOSITORY_ROUTE_CONNECTION_AMBIGUOUS']);
  }

  const candidate = matchingRoutes[0]!;
  const publicRoute: NonNullable<GithubRepositoryResolution['route']> = {
    routingBindingId: binding.routingBindingId,
    connectionId: candidate.connectionId,
    accountContext: { owner: candidate.owner, type: candidate.type }
  };

  if (!candidate.accountVerified) {
    return baseResult(input, 'UNVERIFIED', ['GITHUB_REPOSITORY_ACCOUNT_CONTEXT_UNVERIFIED'], {
      route: publicRoute
    });
  }

  const evidence = candidate.repository;
  if (evidence.freshness !== 'CURRENT') {
    return baseResult(input, 'UNVERIFIED', ['GITHUB_REPOSITORY_EVIDENCE_STALE'], {
      route: publicRoute,
      freshness: evidence.freshness,
      provenance: ['identity_policy', 'durable_accounts', 'github_api:get_repository']
    });
  }
  if (evidence.status === 'NOT_VISIBLE') {
    return baseResult(input, 'UNVERIFIED', ['GITHUB_REPOSITORY_NOT_VISIBLE'], {
      route: publicRoute,
      freshness: evidence.freshness,
      provenance: ['identity_policy', 'durable_accounts', 'github_api:get_repository']
    });
  }
  if (evidence.status !== 'VERIFIED') {
    return baseResult(input, 'UNVERIFIED', ['GITHUB_REPOSITORY_API_UNAVAILABLE'], {
      route: publicRoute,
      freshness: evidence.freshness,
      provenance: ['identity_policy', 'durable_accounts', 'github_api:get_repository']
    });
  }
  if (
    !evidence.fullName
    || !same(evidence.fullName, requested.fullName)
    || !Number.isSafeInteger(evidence.githubRepositoryId)
    || (evidence.githubRepositoryId ?? 0) <= 0
  ) {
    return baseResult(input, 'UNVERIFIED', ['GITHUB_REPOSITORY_IDENTITY_MISMATCH'], {
      route: publicRoute,
      freshness: evidence.freshness,
      provenance: ['identity_policy', 'durable_accounts', 'github_api:get_repository']
    });
  }

  const access = technicalAccess(evidence);
  if (evidence.archived === true && input.requiredTechnicalAccess !== 'read') {
    return baseResult(input, 'UNVERIFIED', ['GITHUB_REPOSITORY_ARCHIVED_FOR_WRITE'], {
      route: publicRoute,
      observedTechnicalAccess: access,
      freshness: evidence.freshness,
      provenance: ['identity_policy', 'durable_accounts', 'github_api:get_repository']
    });
  }
  if (!hasRequiredAccess(access, input.requiredTechnicalAccess)) {
    return baseResult(input, 'UNVERIFIED', ['GITHUB_REPOSITORY_TECHNICAL_ACCESS_INSUFFICIENT'], {
      route: publicRoute,
      observedTechnicalAccess: access,
      freshness: evidence.freshness,
      provenance: ['identity_policy', 'durable_accounts', 'github_api:get_repository']
    });
  }

  const logicalRepositoryId = `github:${evidence.fullName}`;
  const registered = input.registry?.repositories.find((repository) => (
    same(repository.fullName, evidence.fullName!) || same(repository.repositoryId, logicalRepositoryId)
  ));
  const repository: NonNullable<GithubRepositoryResolution['repository']> = {
    fullName: evidence.fullName,
    owner: evidence.fullName.split('/')[0]!,
    name: evidence.fullName.split('/')[1]!,
    githubRepositoryId: evidence.githubRepositoryId!,
    registryRepositoryId: registered?.repositoryId ?? logicalRepositoryId,
    registryPresence: registered ? 'REGISTERED' : 'UNREGISTERED',
    defaultBranch: evidence.defaultBranch,
    archived: evidence.archived === true
  };

  return baseResult(input, 'RESOLVED', [], {
    repository,
    route: publicRoute,
    observedTechnicalAccess: access,
    freshness: evidence.freshness,
    provenance: [
      'identity_policy',
      'durable_accounts',
      'github_api:get_repository',
      ...(input.registry ? ['git_registry_v2'] : [])
    ]
  });
}
