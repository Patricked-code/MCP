import { readFile } from 'node:fs/promises';

import type { GitHubJsonResponse } from './connection.js';
import { loadGithubIdentityPolicy, type LoadedGithubIdentityPolicy } from './identityPolicy.js';
import {
  resolveGithubRepository,
  type GithubRepositoryObservation,
  type GithubRepositoryResolution,
  type GithubTechnicalAccess
} from './repositoryResolution.js';
import { dryRunGitRegistryV2, type GitRegistryV2 } from './registryV2.js';
import type { DurableGithubAccountConfig } from '../tools/durableAccounts.js';
import type { DurableGithubIdentityObservation } from './identityResolution.js';

const DEFAULT_ACCOUNTS_FILE = '/app/data/github-accounts.json';
const DEFAULT_REGISTRY_FILE = '/app/data/mcp-git-registry.json';
const DEFAULT_TOKEN_FILE = '/app/secrets/github_token';
const SECRET_PREFIX = '/app/secrets/';
const MAX_CONFIG_BYTES = 64 * 1024;

export type GithubRepositoryRoutingRequest = {
  oauthPrincipalId: string | null;
  targetRepository: string | null;
  requiredTechnicalAccess: GithubTechnicalAccess;
};

export type GithubRepositoryRoutingService = {
  resolve(input: GithubRepositoryRoutingRequest): Promise<GithubRepositoryResolution>;
};

export type GithubRepositoryRoutingDependencies = {
  now?: () => Date;
  loadPolicy?: () => Promise<LoadedGithubIdentityPolicy>;
  loadAccounts?: () => Promise<DurableGithubAccountConfig[]>;
  readToken?: (path: string) => Promise<string | null>;
  collectIdentityObservations?: (
    accounts: DurableGithubAccountConfig[]
  ) => Promise<DurableGithubIdentityObservation[]>;
  githubRequest?: (token: string, endpoint: string) => Promise<GitHubJsonResponse>;
  loadRegistry?: () => Promise<GitRegistryV2 | null>;
};

function cleanOwner(value: unknown): string {
  return String(value ?? '').trim().replace(/^@/, '').replace(/[^A-Za-z0-9_.-]/g, '');
}

function accountType(value: unknown): DurableGithubIdentityObservation['type'] {
  if (value === 'user' || value === 'organization') return value;
  return 'organization_or_user';
}

function allowedSecret(path: string): boolean {
  return path.startsWith(SECRET_PREFIX) && !path.includes('..');
}

function tokenPath(account: DurableGithubAccountConfig): string {
  return String(account.tokenFile ?? '').trim() || DEFAULT_TOKEN_FILE;
}

async function defaultReadToken(path: string): Promise<string | null> {
  if (!allowedSecret(path)) return null;
  try {
    return (await readFile(path, 'utf8')).trim() || null;
  } catch {
    return null;
  }
}

async function defaultLoadAccounts(): Promise<DurableGithubAccountConfig[]> {
  const file = process.env.MCP_GITHUB_ACCOUNTS_FILE || DEFAULT_ACCOUNTS_FILE;
  try {
    const raw = await readFile(file, 'utf8');
    if (Buffer.byteLength(raw, 'utf8') > MAX_CONFIG_BYTES) return [];
    const parsed = JSON.parse(raw) as { accounts?: unknown };
    if (!Array.isArray(parsed.accounts)) return [];
    return parsed.accounts.slice(0, 100).filter((entry): entry is DurableGithubAccountConfig => (
      Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
    ));
  } catch {
    return [];
  }
}

async function defaultLoadRegistry(): Promise<GitRegistryV2 | null> {
  const file = process.env.MCP_GIT_REGISTRY_FILE || DEFAULT_REGISTRY_FILE;
  try {
    const raw = await readFile(file, 'utf8');
    if (Buffer.byteLength(raw, 'utf8') > 1_000_000) return null;
    return dryRunGitRegistryV2(JSON.parse(raw) as unknown).candidate;
  } catch {
    return null;
  }
}

async function defaultGithubRequest(token: string, endpoint: string): Promise<GitHubJsonResponse> {
  const { githubJsonRequest } = await import('./connection.js');
  return githubJsonRequest(token, endpoint);
}

async function defaultCollectIdentityObservations(
  accounts: DurableGithubAccountConfig[],
  readToken: (path: string) => Promise<string | null>,
  now: () => Date
): Promise<DurableGithubIdentityObservation[]> {
  const { collectDurableGithubIdentityObservations } = await import('../tools/durableAccounts.js');
  return collectDurableGithubIdentityObservations(accounts, { readToken, now });
}

function targetOwner(repository: string | null): string | null {
  if (!repository) return null;
  const parts = repository.trim().split('/');
  if (parts.length !== 2) return null;
  const owner = parts[0] ?? '';
  const name = parts[1] ?? '';
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner)) return null;
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(name)) return null;
  return owner;
}

function same(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function configuredConnectionMatches(
  account: DurableGithubAccountConfig,
  selector: { owner: string; type: 'user' | 'organization' | 'organization_or_user' }
): boolean {
  return same(cleanOwner(account.owner), selector.owner)
    && accountType(account.type) === selector.type;
}

function parseRepositoryObservation(
  response: GitHubJsonResponse,
  observedAt: string
): GithubRepositoryObservation {
  if (response.status === 403 || response.status === 404) {
    return {
      status: 'NOT_VISIBLE',
      observedAt,
      freshness: 'CURRENT',
      githubRepositoryId: null,
      fullName: null,
      defaultBranch: null,
      archived: null,
      permissions: null
    };
  }
  if (!response.ok) {
    return {
      status: 'UNAVAILABLE',
      observedAt,
      freshness: 'UNKNOWN',
      githubRepositoryId: null,
      fullName: null,
      defaultBranch: null,
      archived: null,
      permissions: null
    };
  }
  const root = response.json && typeof response.json === 'object' && !Array.isArray(response.json)
    ? response.json as Record<string, unknown>
    : null;
  const permissions = root?.permissions && typeof root.permissions === 'object' && !Array.isArray(root.permissions)
    ? root.permissions as Record<string, unknown>
    : null;
  return {
    status: 'VERIFIED',
    observedAt,
    freshness: 'CURRENT',
    githubRepositoryId: typeof root?.id === 'number' ? root.id : null,
    fullName: typeof root?.full_name === 'string' ? root.full_name.slice(0, 241) : null,
    defaultBranch: typeof root?.default_branch === 'string' ? root.default_branch.slice(0, 255) : null,
    archived: typeof root?.archived === 'boolean' ? root.archived : null,
    permissions: permissions ? {
      pull: permissions.pull === true,
      push: permissions.push === true,
      maintain: permissions.maintain === true,
      admin: permissions.admin === true
    } : null
  };
}

function emptyResolution(
  input: GithubRepositoryRoutingRequest,
  policy: LoadedGithubIdentityPolicy,
  registry: GitRegistryV2 | null,
  observedAt: string
): GithubRepositoryResolution {
  return resolveGithubRepository({
    oauthPrincipalId: input.oauthPrincipalId,
    targetRepository: input.targetRepository,
    requiredTechnicalAccess: input.requiredTechnicalAccess,
    policy: policy.parse.ok ? policy.parse.policy : null,
    policyDigest: policy.digest,
    policyValid: policy.parse.ok,
    routes: [],
    registry,
    observedAt
  });
}

export function createGithubRepositoryRoutingService(
  dependencies: GithubRepositoryRoutingDependencies = {}
): GithubRepositoryRoutingService {
  const now = dependencies.now ?? (() => new Date());
  const loadPolicy = dependencies.loadPolicy ?? loadGithubIdentityPolicy;
  const loadAccounts = dependencies.loadAccounts ?? defaultLoadAccounts;
  const readToken = dependencies.readToken ?? defaultReadToken;
  const githubRequest = dependencies.githubRequest ?? defaultGithubRequest;
  const loadRegistry = dependencies.loadRegistry ?? defaultLoadRegistry;
  const collectIdentityObservations = dependencies.collectIdentityObservations
    ?? ((accounts: DurableGithubAccountConfig[]) => defaultCollectIdentityObservations(accounts, readToken, now));

  return {
    async resolve(input) {
      const observedAt = now().toISOString();
      const [policy, registry] = await Promise.all([
        loadPolicy().catch(() => ({
          parse: { ok: false as const, reasonCode: 'GITHUB_IDENTITY_POLICY_INVALID' as const },
          digest: null
        })),
        loadRegistry().catch(() => null)
      ]);

      const early = emptyResolution(input, policy, registry, observedAt);
      if (!(
        early.status === 'UNVERIFIED'
        && early.reasonCodes.length === 1
        && early.reasonCodes[0] === 'GITHUB_REPOSITORY_ROUTE_CONNECTION_NOT_FOUND'
      )) return early;

      if (!policy.parse.ok || policy.parse.policy.schemaVersion !== 3) return early;
      const owner = targetOwner(input.targetRepository);
      if (!owner || !input.oauthPrincipalId) return early;

      const matchingBindings = policy.parse.policy.githubRepositoryRoutingBindings.filter((binding) => (
        binding.enabled
        && binding.provider === 'github'
        && same(binding.oauthPrincipalId, input.oauthPrincipalId!)
        && same(binding.repositoryOwner, owner)
      ));
      if (matchingBindings.length !== 1) return early;
      const binding = matchingBindings[0]!;

      const accounts = (await loadAccounts().catch(() => []))
        .filter((account) => configuredConnectionMatches(account, binding.connectionSelector))
        .filter((account) => allowedSecret(tokenPath(account)))
        .slice(0, 20);
      if (accounts.length === 0) return early;

      const identities = await collectIdentityObservations(accounts).catch(() => []);
      const routes = await Promise.all(accounts.map(async (account, index) => {
        const identity = identities[index];
        const file = tokenPath(account);
        const token = await readToken(file).catch(() => null);
        const repository = token && identity?.accountVerified && input.targetRepository
          ? parseRepositoryObservation(
              await githubRequest(
                token,
                `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(input.targetRepository.split('/')[1]!)}`
              ).catch(() => ({ ok: false, status: null, json: null, tokenExpiresAt: null, oauthScopes: [] })),
              observedAt
            )
          : {
              status: 'UNAVAILABLE' as const,
              observedAt,
              freshness: 'UNKNOWN' as const,
              githubRepositoryId: null,
              fullName: null,
              defaultBranch: null,
              archived: null,
              permissions: null
            };
        return {
          connectionId: `github:${cleanOwner(account.owner)}`,
          owner: cleanOwner(account.owner),
          type: accountType(account.type),
          configuredStatus: String(account.status ?? 'unknown').slice(0, 120),
          accountVerified: identity?.accountVerified === true,
          authenticationContextId: identity?.authenticationContextId ?? null,
          repository
        };
      }));

      return resolveGithubRepository({
        oauthPrincipalId: input.oauthPrincipalId,
        targetRepository: input.targetRepository,
        requiredTechnicalAccess: input.requiredTechnicalAccess,
        policy: policy.parse.policy,
        policyDigest: policy.digest,
        policyValid: true,
        routes,
        registry,
        observedAt
      });
    }
  };
}
