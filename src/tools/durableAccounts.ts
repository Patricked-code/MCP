import { readFile, stat } from 'node:fs/promises';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  githubJsonRequest,
  observeGithubAuthenticatedPrincipal,
  observeGithubAuthenticatedPrincipalEvidence,
  type GitHubAuthenticatedPrincipalEvidence,
  type GitHubJsonResponse
} from '../github/connection.js';
import type {
  DurableGithubIdentityObservation,
  GithubAuthenticatedPrincipalObservation
} from '../github/identityResolution.js';
import type {
  DurableGithubRepositoryObservation,
  GithubRepositoryReasonCode
} from '../github/repositoryResolution.js';
import { asText } from './format.js';

const ACCOUNTS_FILE = process.env.MCP_GITHUB_ACCOUNTS_FILE || '/app/data/github-accounts.json';
const SECRET_PREFIX = '/app/secrets/';

export type DurableGithubAccountConfig = {
  owner?: string;
  type?: string;
  role?: string;
  tokenFile?: string;
  status?: string;
};
type AccountsFile = { defaultTargetOwner?: string; accounts?: DurableGithubAccountConfig[] };

const clean = (v: unknown) => String(v ?? '').trim().replace(/^@/, '').replace(/[^A-Za-z0-9_.-]/g, '');
const tokenPath = (v: unknown) => String(v ?? '').trim() || '/app/secrets/github_token';
const allowedSecret = (p: string) => p.startsWith(SECRET_PREFIX) && !p.includes('..');

function accountType(value: unknown): DurableGithubIdentityObservation['type'] {
  if (value === 'user' || value === 'organization') return value;
  return 'organization_or_user';
}

function activeOrganizationMembership(value: unknown, owner: string): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const membership = value as {
    state?: unknown;
    organization?: { login?: unknown };
  };
  return membership.state === 'active'
    && typeof membership.organization?.login === 'string'
    && membership.organization.login.toLowerCase() === owner.toLowerCase();
}

async function readJson(): Promise<AccountsFile> {
  try {
    return JSON.parse(await readFile(ACCOUNTS_FILE, 'utf8')) as AccountsFile;
  } catch {
    return { accounts: [] };
  }
}

async function readToken(path: string): Promise<string | null> {
  try {
    return (await readFile(path, 'utf8')).trim() || null;
  } catch {
    return null;
  }
}

async function modeOf(path: string): Promise<string | null> {
  try {
    return ((await stat(path)).mode & 0o777).toString(8);
  } catch {
    return null;
  }
}

function unavailablePrincipal(
  observedAt: string
): GithubAuthenticatedPrincipalObservation {
  return {
    status: 'UNAVAILABLE', observedAt, freshness: 'UNKNOWN', login: null,
    accountType: null, reasonCode: 'GITHUB_IDENTITY_AUTH_MISSING'
  };
}

export type DurableGithubIdentityObservationDependencies = {
  readToken?: (path: string) => Promise<string | null>;
  observePrincipal?: (token: string) => Promise<GithubAuthenticatedPrincipalObservation>;
  verifyAccountContext?: (
    token: string,
    owner: string,
    type: DurableGithubIdentityObservation['type'],
    principal: GithubAuthenticatedPrincipalObservation
  ) => Promise<boolean>;
  requestJson?: (token: string, endpoint: string) => Promise<GitHubJsonResponse>;
  now?: () => Date;
};

export type DurableGithubObservationBatch = {
  identityObservations: DurableGithubIdentityObservation[];
  observeRepository(
    authenticationContextId: string,
    repository: { owner: string; name: string }
  ): Promise<DurableGithubRepositoryObservation>;
};

function repositoryFailure(
  observedAt: string,
  requestedFullName: string,
  status: DurableGithubRepositoryObservation['status'],
  reasonCode: GithubRepositoryReasonCode
): DurableGithubRepositoryObservation {
  return {
    status,
    observedAt,
    freshness: 'UNKNOWN',
    requestedFullName,
    repository: null,
    reasonCode
  };
}

function boundedString(value: unknown, max = 255): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= max
    ? value
    : null;
}

function parseRepositoryObservation(
  response: GitHubJsonResponse,
  observedAt: string,
  requestedFullName: string
): DurableGithubRepositoryObservation {
  if (!response.ok) {
    if (response.status === 401) {
      return repositoryFailure(observedAt, requestedFullName, 'AUTH_INVALID', 'GITHUB_REPOSITORY_AUTH_INVALID');
    }
    if (response.status === 403) {
      return repositoryFailure(observedAt, requestedFullName, 'PERMISSION_DENIED', 'GITHUB_REPOSITORY_PERMISSION_DENIED');
    }
    if (response.status === 404) {
      return repositoryFailure(
        observedAt,
        requestedFullName,
        'NOT_FOUND_OR_INVISIBLE',
        'GITHUB_REPOSITORY_NOT_FOUND_OR_INVISIBLE'
      );
    }
    return repositoryFailure(observedAt, requestedFullName, 'UNAVAILABLE', 'GITHUB_REPOSITORY_API_UNAVAILABLE');
  }
  const root = response.json && typeof response.json === 'object' && !Array.isArray(response.json)
    ? response.json as Record<string, unknown>
    : null;
  const ownerRoot = root?.owner && typeof root.owner === 'object' && !Array.isArray(root.owner)
    ? root.owner as Record<string, unknown>
    : null;
  const githubRepositoryId = root?.id;
  const owner = boundedString(ownerRoot?.login, 100);
  const name = boundedString(root?.name, 100);
  const fullName = boundedString(root?.full_name, 202);
  const ownerType = ownerRoot?.type === 'User'
    ? 'user' as const
    : ownerRoot?.type === 'Organization'
      ? 'organization' as const
      : null;
  const defaultBranch = root?.default_branch === null || root?.default_branch === undefined
    ? null
    : boundedString(root.default_branch, 255);
  const visibility = root?.visibility === 'public'
    || root?.visibility === 'private'
    || root?.visibility === 'internal'
    ? root.visibility
    : root?.visibility === null || root?.visibility === undefined
      ? null
      : undefined;
  if (
    typeof githubRepositoryId !== 'number'
    || !Number.isSafeInteger(githubRepositoryId)
    || githubRepositoryId < 1
    || !owner
    || !name
    || !fullName
    || !ownerType
    || fullName.toLowerCase() !== `${owner}/${name}`.toLowerCase()
    || (root?.default_branch !== null && root?.default_branch !== undefined && !defaultBranch)
    || visibility === undefined
    || typeof root?.archived !== 'boolean'
    || typeof root?.fork !== 'boolean'
  ) {
    return repositoryFailure(observedAt, requestedFullName, 'MALFORMED', 'GITHUB_REPOSITORY_RESPONSE_INVALID');
  }
  return {
    status: 'VERIFIED',
    observedAt,
    freshness: 'CURRENT',
    requestedFullName,
    repository: {
      githubRepositoryId,
      owner,
      ownerType,
      name,
      fullName,
      defaultBranch,
      visibility,
      archived: root.archived,
      fork: root.fork
    },
    reasonCode: null
  };
}

export async function collectDurableGithubObservationBatch(
  accounts: DurableGithubAccountConfig[],
  dependencies: DurableGithubIdentityObservationDependencies = {}
): Promise<DurableGithubObservationBatch> {
  const now = dependencies.now ?? (() => new Date());
  const tokenReader = dependencies.readToken ?? readToken;
  const principalObserver = dependencies.observePrincipal
    ?? ((token: string) => observeGithubAuthenticatedPrincipal(token, { now }));
  const contextVerifier = dependencies.verifyAccountContext ?? (async (
    token,
    owner,
    type,
    principal
  ) => {
    if (type === 'user') {
      return Boolean(principal.login && principal.login.toLowerCase() === owner.toLowerCase());
    }
    if (type === 'organization') {
      const membership = await githubJsonRequest(
        token,
        `/user/memberships/orgs/${encodeURIComponent(owner)}`
      );
      return membership.ok && activeOrganizationMembership(membership.json, owner);
    }
    if (principal.login?.toLowerCase() === owner.toLowerCase()) return true;
    const membership = await githubJsonRequest(
      token,
      `/user/memberships/orgs/${encodeURIComponent(owner)}`
    );
    return membership.ok && activeOrganizationMembership(membership.json, owner);
  });
  const byTokenFile = new Map<string, Promise<{
    authenticationContextId: string;
    token: string | null;
    principal: GithubAuthenticatedPrincipalObservation;
  }>>();
  let nextAuthenticationContext = 0;

  const observations = await Promise.all(accounts.slice(0, 100).map(async (account) => {
    const owner = clean(account.owner);
    const type = accountType(account.type);
    const configuredStatus = String(account.status ?? 'unknown').slice(0, 120);
    const file = tokenPath(account.tokenFile);
    const observedAt = now().toISOString();
    if (!owner || !allowedSecret(file)) {
      return {
        owner,
        type,
        configuredStatus,
        authenticationContextId: null,
        principal: unavailablePrincipal(observedAt),
        accountVerified: false
      };
    }
    let shared = byTokenFile.get(file);
    if (!shared) {
      const authenticationContextId = `durable-authentication-context-${++nextAuthenticationContext}`;
      shared = tokenReader(file).then(async (token) => ({
        authenticationContextId,
        token,
        principal: token
          ? await principalObserver(token)
          : unavailablePrincipal(observedAt)
      })).catch(() => ({
        authenticationContextId,
        token: null,
        principal: unavailablePrincipal(observedAt)
      }));
      byTokenFile.set(file, shared);
    }
    const { authenticationContextId, token, principal } = await shared;
    const accountVerified = Boolean(
      token
      && principal.status === 'VERIFIED'
      && await contextVerifier(token, owner, type, principal).catch(() => false)
    );
    return {
      owner,
      type,
      configuredStatus,
      authenticationContextId,
      principal,
      accountVerified
    };
  }));
  const tokenByAuthenticationContext = new Map<string, string>();
  for (const shared of byTokenFile.values()) {
    const { authenticationContextId, token } = await shared;
    if (token) tokenByAuthenticationContext.set(authenticationContextId, token);
  }
  const requestJson = dependencies.requestJson
    ?? ((token: string, endpoint: string) => githubJsonRequest(token, endpoint));
  return {
    identityObservations: observations,
    observeRepository: async (authenticationContextId, repository) => {
      const observedAt = now().toISOString();
      const owner = clean(repository.owner);
      const name = clean(repository.name);
      const requestedFullName = owner && name ? `${owner}/${name}` : 'invalid/invalid';
      const token = tokenByAuthenticationContext.get(authenticationContextId);
      if (!token) {
        return repositoryFailure(
          observedAt,
          requestedFullName,
          'UNAVAILABLE',
          'GITHUB_REPOSITORY_AUTH_MISSING'
        );
      }
      if (!owner || !name || owner !== repository.owner || name !== repository.name) {
        return repositoryFailure(
          observedAt,
          requestedFullName,
          'MALFORMED',
          'GITHUB_REPOSITORY_RESPONSE_INVALID'
        );
      }
      const response = await requestJson(
        token,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
      ).catch((): GitHubJsonResponse => ({
        ok: false,
        status: null,
        json: null,
        tokenExpiresAt: null,
        oauthScopes: []
      }));
      return parseRepositoryObservation(response, observedAt, requestedFullName);
    }
  };
}

export async function collectDurableGithubIdentityObservations(
  accounts: DurableGithubAccountConfig[],
  dependencies: DurableGithubIdentityObservationDependencies = {}
): Promise<DurableGithubIdentityObservation[]> {
  return (await collectDurableGithubObservationBatch(accounts, dependencies)).identityObservations;
}

export async function loadDurableGithubIdentityObservations(
  dependencies: DurableGithubIdentityObservationDependencies = {}
): Promise<DurableGithubIdentityObservation[]> {
  const cfg = await readJson();
  return collectDurableGithubIdentityObservations(
    Array.isArray(cfg.accounts) ? cfg.accounts : [],
    dependencies
  );
}

export async function loadDurableGithubObservationBatch(
  dependencies: DurableGithubIdentityObservationDependencies = {}
): Promise<DurableGithubObservationBatch> {
  const cfg = await readJson();
  return collectDurableGithubObservationBatch(
    Array.isArray(cfg.accounts) ? cfg.accounts : [],
    dependencies
  );
}

async function accountLines(
  account: DurableGithubAccountConfig,
  includeRepos: boolean,
  maxRepos: number,
  principalEvidence: GitHubAuthenticatedPrincipalEvidence | null
): Promise<string[]> {
  const owner = clean(account.owner);
  const type = String(account.type ?? 'unknown');
  const role = String(account.role ?? 'unknown');
  const configuredStatus = String(account.status ?? 'unknown');
  const file = tokenPath(account.tokenFile);
  const lines: string[] = [];
  lines.push(`- ${owner || 'owner_invalide'} | type=${type} | role=${role} | configuredStatus=${configuredStatus}`);
  lines.push(`  tokenFile=${file}`);

  if (!owner) {
    lines.push('  error=owner manquant ou invalide');
    return lines;
  }
  if (!allowedSecret(file)) {
    lines.push(`  error=chemin token refusé; seuls ${SECRET_PREFIX}* sont autorisés`);
    return lines;
  }

  const mode = await modeOf(file);
  const token = await readToken(file);
  lines.push(`  tokenFileExists=${Boolean(mode)} | mode=${mode ?? 'n/a'}`);
  if (mode && mode !== '600') lines.push(`  warning=permissions ${mode}; recommandé 600`);
  if (!token) {
    lines.push('  connected=false | error=token absent ou illisible');
    return lines;
  }

  const evidence = principalEvidence
    ?? await observeGithubAuthenticatedPrincipalEvidence(token);
  const principal = evidence.principal;
  const login = principal.login;
  lines.push(`  githubUserCheck=${principal.status === 'VERIFIED'} | http=${evidence.httpStatus ?? 'n/a'} | login=${login ?? 'n/a'} | tokenExpires=${evidence.tokenExpiresAt ?? 'n/a'}`);
  lines.push(`  scopes=${evidence.oauthScopes.length ? evidence.oauthScopes.join(',') : 'non_communique_ou_token_finement_limite'}`);
  if (principal.status !== 'VERIFIED' || !login) {
    lines.push('  connected=false');
    return lines;
  }

  const isOrg = type.toLowerCase().includes('org') || owner.toLowerCase() !== login.toLowerCase();
  if (isOrg) {
    const org = await githubJsonRequest(token, `/orgs/${encodeURIComponent(owner)}`);
    lines.push(`  orgAccess=${org.ok} | orgHttp=${org.status}`);
    if (!org.ok) lines.push(`  warning=${owner} n'est pas confirmé accessible avec ce token`);
  } else {
    lines.push(`  ownerMatchesLogin=${owner.toLowerCase() === login.toLowerCase()}`);
  }

  if (includeRepos) {
    const endpoint = isOrg
      ? `/orgs/${encodeURIComponent(owner)}/repos?per_page=${Math.max(1, Math.min(maxRepos, 100))}&type=all&sort=updated`
      : `/user/repos?per_page=${Math.max(1, Math.min(maxRepos, 100))}&visibility=all&affiliation=owner,collaborator,organization_member&sort=updated`;
    const repos = await githubJsonRequest(token, endpoint);
    const arr = Array.isArray(repos.json) ? repos.json : [];
    lines.push(`  reposHttp=${repos.status} | reposReturned=${arr.length}`);
    for (const item of arr.slice(0, maxRepos)) {
      if (!item || typeof item !== 'object') continue;
      const repo = item as Record<string, unknown>;
      const full = typeof repo.full_name === 'string' ? repo.full_name : 'repo_inconnu';
      lines.push(`    repo=${full} | private=${Boolean(repo.private)} | archived=${Boolean(repo.archived)} | fork=${Boolean(repo.fork)} | branch=${String(repo.default_branch ?? 'main')}`);
    }
  }

  return lines;
}

async function render(includeRepos: boolean, maxRepos: number): Promise<string> {
  const cfg = await readJson();
  const accounts = Array.isArray(cfg.accounts) ? cfg.accounts : [];
  const lines: string[] = [];
  lines.push('Gestion durable des comptes MCP — GitHub');
  lines.push(`checkedAt=${new Date().toISOString()}`);
  lines.push(`accountsFile=${ACCOUNTS_FILE}`);
  lines.push(`defaultTargetOwner=${cfg.defaultTargetOwner ?? 'n/a'}`);
  lines.push(`accountsConfigured=${accounts.length}`);
  lines.push('security=aucun token affiché; chemins secrets limités à /app/secrets/*; lecture seule; aucun clone; aucune suppression; aucune écriture GitHub');
  lines.push('');
  const principalByTokenFile = new Map<string, Promise<GitHubAuthenticatedPrincipalEvidence | null>>();
  for (const account of accounts) {
    const file = tokenPath(account.tokenFile);
    let principal = principalByTokenFile.get(file);
    if (!principal && allowedSecret(file)) {
      principal = readToken(file).then((token) => (
        token ? observeGithubAuthenticatedPrincipalEvidence(token) : null
      )).catch(() => null);
      principalByTokenFile.set(file, principal);
    }
    lines.push(...await accountLines(
      account,
      includeRepos,
      maxRepos,
      principal ? await principal : null
    ));
  }
  if (accounts.length === 0) lines.push('Aucun compte configuré.');
  return lines.join('\n');
}

export function registerDurableAccountReadOnlyTools(server: McpServer): void {
  server.tool(
    'github_durable_accounts_status',
    'Vérifie durablement tous les comptes GitHub déclarés dans le registre MCP, sans afficher les secrets et sans écrire.',
    {},
    async () => asText(await render(false, 0))
  );

  server.tool(
    'github_durable_accounts_inventory',
    'Inventorie les dépôts visibles par les comptes GitHub durablement configurés, sans écrire, sans cloner et sans supprimer.',
    { maxReposPerAccount: z.number().int().min(1).max(100).default(30) },
    async ({ maxReposPerAccount }) => asText(await render(true, maxReposPerAccount))
  );
}
