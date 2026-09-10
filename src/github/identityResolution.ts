import type { GithubIdentityPolicy } from './identityPolicy.js';

export type GithubIdentityStatus = 'RESOLVED' | 'NONE' | 'AMBIGUOUS' | 'UNVERIFIED';
export type GithubIdentityFreshness = 'CURRENT' | 'STALE' | 'UNKNOWN';
export type GithubIdentityReasonCode =
  | 'GITHUB_IDENTITY_BINDING_NOT_FOUND'
  | 'GITHUB_IDENTITY_BINDING_AMBIGUOUS'
  | 'GITHUB_IDENTITY_CONNECTION_NOT_FOUND'
  | 'GITHUB_IDENTITY_CONNECTION_AMBIGUOUS'
  | 'GITHUB_IDENTITY_AUTHENTICATION_CONTEXT_UNAVAILABLE'
  | 'GITHUB_IDENTITY_ACCOUNT_CONTEXT_UNVERIFIED'
  | 'GITHUB_IDENTITY_OAUTH_PRINCIPAL_UNAVAILABLE'
  | 'GITHUB_IDENTITY_CONTEXT_REQUIRED'
  | 'GITHUB_IDENTITY_AUTH_MISSING'
  | 'GITHUB_IDENTITY_AUTH_INVALID'
  | 'GITHUB_IDENTITY_PRINCIPAL_MISMATCH'
  | 'GITHUB_IDENTITY_EVIDENCE_STALE'
  | 'GITHUB_IDENTITY_API_UNAVAILABLE'
  | 'GITHUB_IDENTITY_POLICY_INVALID'
  | 'GITHUB_IDENTITY_CACHE_MISS';

export type GithubAuthenticatedPrincipalObservation = {
  status: 'VERIFIED' | 'MISSING' | 'INVALID' | 'UNAVAILABLE';
  observedAt: string;
  freshness: GithubIdentityFreshness;
  login: string | null;
  githubUserId?: number;
  accountType: 'user' | null;
  reasonCode: GithubIdentityReasonCode | null;
};

export type DurableGithubIdentityObservation = {
  owner: string;
  type: 'user' | 'organization' | 'organization_or_user';
  configuredStatus: string;
  authenticationContextId: string | null;
  principal: GithubAuthenticatedPrincipalObservation;
  accountVerified: boolean;
};

export type GithubIdentityResolutionInput = {
  oauthPrincipalId: string | null;
  repositoryContext: string | null;
  policy: GithubIdentityPolicy | null;
  policyDigest: string | null;
  policyValid: boolean;
  connections: DurableGithubIdentityObservation[];
  observedAt: string;
};

export type GithubIdentityResolution = {
  status: GithubIdentityStatus;
  observedAt: string;
  bindingId: string | null;
  oauthPrincipalId: string | null;
  repositoryContext: string | null;
  authenticatedPrincipal: {
    provider: 'github';
    login: string;
    accountType: 'user';
    githubUserId?: number;
  } | null;
  selectedAccountContext: {
    owner: string;
    type: 'user' | 'organization';
    source: 'durable_account';
  } | null;
  accessibleAccountContexts: Array<{
    owner: string;
    type: 'user' | 'organization';
    verified: boolean;
  }>;
  freshness: GithubIdentityFreshness;
  provenance: string[];
  reasonCodes: GithubIdentityReasonCode[];
  policyDigest: string | null;
};

function same(left: string, right: string): boolean {
  return left.localeCompare(right, undefined, { sensitivity: 'accent' }) === 0;
}

function contexts(
  connections: DurableGithubIdentityObservation[],
  authenticationContextId?: string | null
) {
  if (!authenticationContextId) return [];
  return connections
    .filter((entry) => entry.authenticationContextId === authenticationContextId)
    .filter((entry): entry is DurableGithubIdentityObservation & { type: 'user' | 'organization' } => (
      entry.type === 'user' || entry.type === 'organization'
    ))
    .map((entry) => ({ owner: entry.owner, type: entry.type, verified: entry.accountVerified }))
    .sort((left, right) => left.owner.toLowerCase().localeCompare(right.owner.toLowerCase())
      || left.type.localeCompare(right.type));
}

function unresolved(
  input: GithubIdentityResolutionInput,
  status: Exclude<GithubIdentityStatus, 'RESOLVED'>,
  reasonCode: GithubIdentityReasonCode,
  bindingId: string | null = null,
  freshness: GithubIdentityFreshness = 'UNKNOWN'
): GithubIdentityResolution {
  return {
    status,
    observedAt: input.observedAt,
    bindingId,
    oauthPrincipalId: input.oauthPrincipalId,
    repositoryContext: input.repositoryContext,
    authenticatedPrincipal: null,
    selectedAccountContext: null,
    accessibleAccountContexts: contexts(input.connections),
    freshness,
    provenance: ['identity_policy', 'durable_accounts'],
    reasonCodes: [reasonCode],
    policyDigest: input.policyDigest
  };
}

export function resolveGithubIdentity(
  input: GithubIdentityResolutionInput
): GithubIdentityResolution {
  if (!input.policyValid || !input.policy) {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_IDENTITY_POLICY_INVALID');
  }
  if (!input.oauthPrincipalId) {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_IDENTITY_OAUTH_PRINCIPAL_UNAVAILABLE');
  }
  const bindings = input.policy.schemaVersion === 1
    ? []
    : input.policy.githubPrincipalBindings.filter((binding) => (
        binding.enabled
        && binding.provider === 'github'
        && same(binding.oauthPrincipalId, input.oauthPrincipalId!)
      ));
  const contextRequired = bindings.some((binding) => (
    Boolean(binding.context?.repository) && !input.repositoryContext
  ));
  const applicable = bindings.filter((binding) => {
    const expectedRepository = binding.context?.repository;
    return !expectedRepository || Boolean(
      input.repositoryContext && same(expectedRepository, input.repositoryContext)
    );
  });
  if (applicable.length === 0) {
    return contextRequired
      ? unresolved(input, 'UNVERIFIED', 'GITHUB_IDENTITY_CONTEXT_REQUIRED')
      : unresolved(input, 'NONE', 'GITHUB_IDENTITY_BINDING_NOT_FOUND');
  }
  if (applicable.length > 1) {
    return unresolved(input, 'AMBIGUOUS', 'GITHUB_IDENTITY_BINDING_AMBIGUOUS');
  }
  const binding = applicable[0]!;
  const matches = input.connections.filter((connection) => (
    same(connection.owner, binding.connectionSelector.owner)
    && connection.type === binding.connectionSelector.type
  ));
  if (matches.length === 0) {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_IDENTITY_CONNECTION_NOT_FOUND', binding.bindingId);
  }
  if (matches.length > 1) {
    return unresolved(input, 'AMBIGUOUS', 'GITHUB_IDENTITY_CONNECTION_AMBIGUOUS', binding.bindingId);
  }
  const connection = matches[0]!;
  if (!connection.authenticationContextId) {
    return unresolved(
      input,
      'UNVERIFIED',
      'GITHUB_IDENTITY_AUTHENTICATION_CONTEXT_UNAVAILABLE',
      binding.bindingId
    );
  }
  const principal = connection.principal;
  if (principal.freshness !== 'CURRENT') {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_IDENTITY_EVIDENCE_STALE', binding.bindingId, principal.freshness);
  }
  if (principal.status !== 'VERIFIED' || !principal.login || principal.accountType !== 'user') {
    return unresolved(
      input,
      'UNVERIFIED',
      principal.reasonCode ?? 'GITHUB_IDENTITY_API_UNAVAILABLE',
      binding.bindingId,
      principal.freshness
    );
  }
  if (!same(principal.login, binding.expectedAuthenticatedLogin)) {
    return unresolved(input, 'UNVERIFIED', 'GITHUB_IDENTITY_PRINCIPAL_MISMATCH', binding.bindingId, principal.freshness);
  }
  if (!connection.accountVerified) {
    return unresolved(
      input,
      'UNVERIFIED',
      'GITHUB_IDENTITY_ACCOUNT_CONTEXT_UNVERIFIED',
      binding.bindingId,
      principal.freshness
    );
  }
  return {
    status: 'RESOLVED',
    observedAt: input.observedAt,
    bindingId: binding.bindingId,
    oauthPrincipalId: input.oauthPrincipalId,
    repositoryContext: input.repositoryContext,
    authenticatedPrincipal: {
      provider: 'github',
      login: principal.login,
      accountType: 'user',
      ...(principal.githubUserId !== undefined ? { githubUserId: principal.githubUserId } : {})
    },
    selectedAccountContext: {
      owner: connection.owner,
      type: binding.connectionSelector.type,
      source: 'durable_account'
    },
    accessibleAccountContexts: contexts(input.connections, connection.authenticationContextId),
    freshness: 'CURRENT',
    provenance: ['identity_policy', 'durable_accounts', 'github_api:get_user'],
    reasonCodes: [],
    policyDigest: input.policyDigest
  };
}
