import { readFile } from 'node:fs/promises';
import { env } from '../config/env.js';
import { readGitRegistry, writeGitRegistry, type GitRegistry, type RepoMappingEntry } from './registry.js';

const TOKEN_FILE = '/app/secrets/github_token';
const REPO_ROOT = '/opt/apps/wealthtech-github-repos';
const SERVER_ID = 's1';

export type GithubRepoSummary = { id: number; owner: string; name: string; fullName: string; private: boolean; archived: boolean; fork: boolean; defaultBranch: string; htmlUrl: string; cloneUrl: string; sshUrl: string; pushedAt: string | null; updatedAt: string | null; };
export type GithubInventoryOptions = { owner?: string | null; actor?: string; includeArchived?: boolean; includeForks?: boolean; maxPages?: number; forceAuthenticatedAccount?: boolean; };
export type GithubInventoryResult = { ok: boolean; actor: string; owner: string | null; login: string | null; source: 'organization' | 'authenticated_account'; totalVisible: number; totalReturned: number; repos: GithubRepoSummary[]; warnings: string[]; };
export type GithubRegistrySyncResult = GithubInventoryResult & { registryUpdated: boolean; mappingsBefore: number; mappingsAfter: number; mappingsAdded: number; mappingsUpdated: number; mappingsPreserved: number; };
type GithubApiResponse = { ok: boolean; status: number; json: unknown; nextUrl: string | null; };

const now = () => new Date().toISOString();
const eid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const tokenFile = () => env.GITHUB_TOKEN_FILE || TOKEN_FILE;
const apiBase = () => env.GITHUB_API_BASE || 'https://api.github.com';
const configuredOwner = () => (env.GITHUB_ORG || '').trim() || null;
const repoKey = (owner: string, repo: string) => `${owner.toLowerCase()}/${repo.toLowerCase()}`;
const projectKeyFor = (owner: string, repo: string) => `${owner}_${repo}`.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'github_repo';
const serverPath = (owner: string, repo: string) => `${REPO_ROOT}/${owner}/${repo}`;
const mapId = (owner: string, repo: string, serverId: string, projectKey: string) => `github:${owner}/${repo}:${serverId}:${projectKey}`;

function normalizeOwner(value: string | null | undefined): string | null {
  const cleaned = String(value ?? '').trim().replace(/^@/, '');
  if (!cleaned) return null;
  if (!/^[A-Za-z0-9_.-]+$/.test(cleaned)) throw new Error(`GitHub owner invalide: ${cleaned}`);
  return cleaned;
}
function normalizeRepoName(value: unknown): string | null {
  const repo = String(value ?? '').trim();
  return /^[A-Za-z0-9_.-]+$/.test(repo) ? repo : null;
}
async function readToken(): Promise<string | null> {
  try { return (await readFile(tokenFile(), 'utf8')).trim() || null; } catch { return null; }
}
function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    const [rawUrl, rawRel] = part.split(';').map((item) => item.trim());
    if (rawUrl && rawRel === 'rel="next"') return rawUrl.replace(/^<|>$/g, '');
  }
  return null;
}
async function githubRequest(token: string, endpointOrUrl: string): Promise<GithubApiResponse> {
  const base = apiBase().replace(/\/$/, '');
  const url = endpointOrUrl.startsWith('http') ? endpointOrUrl : `${base}${endpointOrUrl}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'wealthtech-mcp-guardian' } });
  const text = await response.text();
  let jsonValue: unknown = null;
  try { jsonValue = text ? JSON.parse(text) : null; } catch { jsonValue = null; }
  return { ok: response.ok, status: response.status, json: jsonValue, nextUrl: parseNextLink(response.headers.get('link')) };
}
function loginOf(value: unknown): string | null {
  if (value && typeof value === 'object' && 'login' in value) {
    const login = (value as { login?: unknown }).login;
    return typeof login === 'string' ? login : null;
  }
  return null;
}
function toRepoSummary(value: unknown): GithubRepoSummary | null {
  if (!value || typeof value !== 'object') return null;
  const repo = value as Record<string, unknown>;
  const name = normalizeRepoName(repo.name);
  const owner = repo.owner && typeof repo.owner === 'object' ? loginOf(repo.owner) : null;
  const fullName = typeof repo.full_name === 'string' ? repo.full_name : owner && name ? `${owner}/${name}` : null;
  if (!owner || !name || !fullName) return null;
  return { id: Number(repo.id ?? 0), owner, name, fullName, private: Boolean(repo.private), archived: Boolean(repo.archived), fork: Boolean(repo.fork), defaultBranch: typeof repo.default_branch === 'string' && repo.default_branch ? repo.default_branch : 'main', htmlUrl: typeof repo.html_url === 'string' ? repo.html_url : '', cloneUrl: typeof repo.clone_url === 'string' ? repo.clone_url : '', sshUrl: typeof repo.ssh_url === 'string' ? repo.ssh_url : '', pushedAt: typeof repo.pushed_at === 'string' ? repo.pushed_at : null, updatedAt: typeof repo.updated_at === 'string' ? repo.updated_at : null };
}
async function listAllPages(token: string, firstEndpoint: string, maxPages: number): Promise<unknown[]> {
  const values: unknown[] = [];
  let next: string | null = firstEndpoint;
  let pages = 0;
  while (next && pages < maxPages) {
    pages += 1;
    const response = await githubRequest(token, next);
    if (!response.ok) throw new Error(`GitHub API failed with HTTP ${response.status} on ${next}`);
    if (Array.isArray(response.json)) values.push(...response.json);
    next = response.nextUrl;
  }
  return values;
}

export async function listGithubRepositories(options: GithubInventoryOptions = {}): Promise<GithubInventoryResult> {
  const actor = options.actor || 'mcp-github-inventory';
  const includeArchived = options.includeArchived ?? true;
  const includeForks = options.includeForks ?? true;
  const maxPages = Math.max(1, Math.min(options.maxPages ?? 20, 100));
  const token = await readToken();
  if (!token) return { ok: false, actor, owner: null, login: null, source: 'authenticated_account', totalVisible: 0, totalReturned: 0, repos: [], warnings: ['Aucun token GitHub lisible dans le conteneur MCP. Connexion GitHub requise via /git ou /github.'] };

  const user = await githubRequest(token, '/user');
  if (!user.ok) return { ok: false, actor, owner: null, login: null, source: 'authenticated_account', totalVisible: 0, totalReturned: 0, repos: [], warnings: [`Validation du compte GitHub impossible: HTTP ${user.status}.`] };

  const login = loginOf(user.json);
  const targetOwner = options.forceAuthenticatedAccount ? null : normalizeOwner(options.owner) || configuredOwner();
  const source: 'organization' | 'authenticated_account' = targetOwner ? 'organization' : 'authenticated_account';
  const endpoint = targetOwner
    ? `/orgs/${encodeURIComponent(targetOwner)}/repos?per_page=100&type=all&sort=updated`
    : '/user/repos?per_page=100&visibility=all&affiliation=owner,collaborator,organization_member&sort=updated';

  try {
    const raw = await listAllPages(token, endpoint, maxPages);
    let repos = raw.map(toRepoSummary).filter((repo): repo is GithubRepoSummary => Boolean(repo));
    const totalVisible = repos.length;
    if (!includeArchived) repos = repos.filter((repo) => !repo.archived);
    if (!includeForks) repos = repos.filter((repo) => !repo.fork);
    const warnings = raw.length >= maxPages * 100 ? [`Inventaire limité à ${maxPages} pages GitHub. Augmenter maxPages si nécessaire.`] : [];
    return { ok: true, actor, owner: targetOwner, login, source, totalVisible, totalReturned: repos.length, repos, warnings };
  } catch (error) {
    return { ok: false, actor, owner: targetOwner, login, source, totalVisible: 0, totalReturned: 0, repos: [], warnings: [error instanceof Error ? error.message : 'Inventaire GitHub impossible.'] };
  }
}

function existingMappingByRepo(registry: GitRegistry): Map<string, RepoMappingEntry> {
  const map = new Map<string, RepoMappingEntry>();
  for (const mapping of registry.repoMappings) map.set(repoKey(mapping.githubOwner, mapping.githubRepo), mapping);
  return map;
}
function buildMapping(repo: GithubRepoSummary, existing: RepoMappingEntry | undefined, at: string): RepoMappingEntry {
  const projectKey = existing?.projectKey || projectKeyFor(repo.owner, repo.name);
  const serverId = existing?.serverId || SERVER_ID;
  return { ...existing, id: existing?.id || mapId(repo.owner, repo.name, serverId, projectKey), githubOwner: existing?.githubOwner || repo.owner, githubRepo: existing?.githubRepo || repo.name, projectKey, serverId, serverPath: existing?.serverPath || serverPath(repo.owner, repo.name), officialBranch: existing?.officialBranch || repo.defaultBranch || 'main', allowedAccess: existing?.allowedAccess || 'read', deployEnabled: existing?.deployEnabled ?? false, createdAt: typeof existing?.createdAt === 'string' ? existing.createdAt : at, updatedAt: at };
}

export async function syncGithubReposToRegistry(options: GithubInventoryOptions = {}): Promise<GithubRegistrySyncResult> {
  const inventory = await listGithubRepositories({ ...options, actor: options.actor || 'mcp-github-registry-sync' });
  const registry = await readGitRegistry();
  const at = now();
  const mappingsBefore = registry.repoMappings.length;

  if (!inventory.ok) {
    registry.auditEvents.push({ id: eid(), at, type: 'github.repos.auto_discovery.failed', actor: inventory.actor, message: 'GitHub auto-discovery failed before registry update.', metadata: { owner: inventory.owner, login: inventory.login, warnings: inventory.warnings, destructiveActions: false } });
    await writeGitRegistry(registry);
    return { ...inventory, registryUpdated: false, mappingsBefore, mappingsAfter: registry.repoMappings.length, mappingsAdded: 0, mappingsUpdated: 0, mappingsPreserved: registry.repoMappings.length };
  }

  const byRepo = existingMappingByRepo(registry);
  let mappingsAdded = 0;
  let mappingsUpdated = 0;
  for (const repo of inventory.repos) {
    const key = repoKey(repo.owner, repo.name);
    const existing = byRepo.get(key);
    byRepo.set(key, buildMapping(repo, existing, at));
    if (existing) mappingsUpdated += 1;
    else mappingsAdded += 1;
  }

  const originalOrder = registry.repoMappings.map((mapping) => repoKey(mapping.githubOwner, mapping.githubRepo)).filter((key, index, array) => array.indexOf(key) === index);
  const discoveredOrder = inventory.repos.map((repo) => repoKey(repo.owner, repo.name)).filter((key) => !originalOrder.includes(key));
  registry.repoMappings = [...originalOrder, ...discoveredOrder].map((key) => byRepo.get(key)).filter((mapping): mapping is RepoMappingEntry => Boolean(mapping));

  for (const account of registry.accounts) {
    const a = account as Record<string, unknown>;
    const owners = new Set<string>();
    if (typeof a.login === 'string') owners.add(a.login.toLowerCase());
    if (typeof a.org === 'string') owners.add(a.org.toLowerCase());
    if (inventory.owner) owners.add(inventory.owner.toLowerCase());
    if ((inventory.owner && owners.has(inventory.owner.toLowerCase())) || (inventory.login && owners.has(inventory.login.toLowerCase()))) {
      a.lastCheckedAt = at;
      a.reposVisible = inventory.totalVisible;
      if (inventory.ok && a.status === 'error') a.status = 'warning';
    }
  }

  registry.auditEvents.push({ id: eid(), at, type: 'github.repos.auto_discovered', actor: inventory.actor, message: `GitHub auto-discovery synchronized ${inventory.totalReturned} repository mappings without deleting existing mappings.`, metadata: { owner: inventory.owner, login: inventory.login, source: inventory.source, totalVisible: inventory.totalVisible, returned: inventory.totalReturned, mappingsBefore, mappingsAdded, mappingsUpdated, destructiveActions: false, defaultDeployEnabledForNewMappings: false } });
  await writeGitRegistry(registry);

  return { ...inventory, registryUpdated: true, mappingsBefore, mappingsAfter: registry.repoMappings.length, mappingsAdded, mappingsUpdated, mappingsPreserved: registry.repoMappings.length - mappingsUpdated };
}

export async function buildGithubInventorySummary(options: GithubInventoryOptions = {}): Promise<string> {
  const inventory = await listGithubRepositories(options);
  const lines: string[] = [];
  lines.push('Inventaire GitHub MCP — lecture seule');
  lines.push(`ok: ${inventory.ok}`);
  lines.push(`acteur: ${inventory.actor}`);
  lines.push(`source: ${inventory.source}`);
  lines.push(`login: ${inventory.login || 'n/a'}`);
  lines.push(`owner/org: ${inventory.owner || 'compte authentifié'}`);
  lines.push(`repos visibles: ${inventory.totalVisible}`);
  lines.push(`repos retournés: ${inventory.totalReturned}`);
  if (inventory.warnings.length) {
    lines.push('');
    lines.push('Avertissements:');
    for (const warning of inventory.warnings) lines.push(`- ${warning}`);
  }
  if (inventory.repos.length) {
    lines.push('');
    lines.push('Dépôts:');
    for (const repo of inventory.repos) lines.push(`- ${repo.fullName} | branch=${repo.defaultBranch} | private=${repo.private} | archived=${repo.archived} | fork=${repo.fork} | pushed=${repo.pushedAt || 'n/a'}`);
  }
  return lines.join('\n');
}
