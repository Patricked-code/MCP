import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { GitHubConnectionStatus } from './connection.js';

const FILE = '/app/data/mcp-git-registry.json';
const DEFAULT_PROJECT_KEY = 'mcp_bridge';

export type GitHubAccessMode = 'read' | 'write' | 'admin' | 'org_admin';
export type GitHubAccountRegistryEntry = Record<string, unknown>;
export type RepoMappingEntry = Record<string, unknown> & { githubOwner: string; githubRepo: string; projectKey: string; serverId: string; serverPath: string; officialBranch: string; allowedAccess: GitHubAccessMode; deployEnabled: boolean; };
export type RegistryAuditEvent = Record<string, unknown>;
export type AutoGitServerResolutionInput = { projectKey?: string | null; githubOwner?: string | null; githubRepo?: string | null; };
export type AutoGitServerContext = Record<string, unknown> & { resolved: boolean };
export type GitRegistry = { version: 1; updatedAt: string; accounts: GitHubAccountRegistryEntry[]; repoMappings: RepoMappingEntry[]; auditEvents: RegistryAuditEvent[]; activeContext?: AutoGitServerContext; };

const now = () => new Date().toISOString();
const eid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const rf = () => process.env.MCP_GIT_REGISTRY_FILE || FILE;
const org = () => process.env.GITHUB_ORG || 'chainsolutions-wealthtech';
const key = (v: unknown) => String(v ?? '').trim().toLowerCase();
const esc = (v: unknown) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const mode = (v: unknown): GitHubAccessMode => v === 'write' || v === 'admin' || v === 'org_admin' ? v : 'read';
const guardrails = () => ['Registry is the MCP-GitHub-Server source of truth.', 'No action outside mapped repo/server/path.', 'deployEnabled=false blocks deployment.', 'Secrets stay outside Git.', 'GitHub auto-discovery is additive and non-destructive.'];

export function resolveMcpGitServerContextFromRegistry(registry: Pick<GitRegistry, 'repoMappings'>, input: AutoGitServerResolutionInput = {}): AutoGitServerContext {
  let source = 'default_project';
  let m = input.githubOwner && input.githubRepo
    ? registry.repoMappings.find((x) => key(x.githubOwner) === key(input.githubOwner) && key(x.githubRepo) === key(input.githubRepo))
    : undefined;
  if (m) source = 'github_repo';
  if (!m && input.projectKey) {
    m = registry.repoMappings.find((x) => x.projectKey === input.projectKey);
    if (m) source = 'project_key';
  }
  if (!m) {
    m = registry.repoMappings.find((x) => x.projectKey === DEFAULT_PROJECT_KEY);
  }
  if (!m) return { resolved: false, source: 'none', error: 'no_git_server_mapping_found', guardrails: guardrails() };
  return { resolved: true, source, projectKey: m.projectKey, githubOwner: m.githubOwner, githubRepo: m.githubRepo, githubFullName: `${m.githubOwner}/${m.githubRepo}`, serverId: m.serverId, serverPath: m.serverPath, officialBranch: m.officialBranch, allowedAccess: m.allowedAccess, deployEnabled: m.deployEnabled, guardrails: guardrails() };
}

function attach(registry: GitRegistry): GitRegistry { return { ...registry, activeContext: resolveMcpGitServerContextFromRegistry(registry, {}) }; }
function empty(): GitRegistry { return attach({ version: 1, updatedAt: now(), accounts: [], repoMappings: [], auditEvents: [] }); }
function norm(v: unknown): GitRegistry {
  if (!v || typeof v !== 'object') return empty();
  const c = v as Partial<GitRegistry>;
  return attach({ version: 1, updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : now(), accounts: Array.isArray(c.accounts) ? c.accounts : [], repoMappings: Array.isArray(c.repoMappings) ? c.repoMappings : [], auditEvents: Array.isArray(c.auditEvents) ? c.auditEvents : [] });
}

export async function readGitRegistry(): Promise<GitRegistry> {
  try { return norm(JSON.parse(await readFile(rf(), 'utf8'))); } catch { return empty(); }
}

export async function writeGitRegistry(registry: GitRegistry): Promise<void> {
  const file = rf();
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, `${JSON.stringify({ version: 1, updatedAt: now(), accounts: registry.accounts, repoMappings: registry.repoMappings, auditEvents: registry.auditEvents.slice(-500) }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await chmod(file, 0o600);
}

export async function resolveMcpGitServerContext(input: AutoGitServerResolutionInput = {}): Promise<AutoGitServerContext> {
  return resolveMcpGitServerContextFromRegistry(await readGitRegistry(), input);
}

export function getRepoMappingsForGithubStatus(registry: Pick<GitRegistry, 'repoMappings'>, status: Pick<GitHubConnectionStatus, 'login' | 'org'>): RepoMappingEntry[] {
  const owners = new Set<string>();
  if (status.login) owners.add(key(status.login));
  if (status.org) owners.add(key(status.org));
  return registry.repoMappings.filter((m) => owners.has(key(m.githubOwner)));
}

async function autoDiscover(status: GitHubConnectionStatus, actor: string): Promise<GitRegistry> {
  try {
    const { syncGithubReposToRegistry } = await import('./inventory.js');
    await syncGithubReposToRegistry({ owner: status.org || undefined, includeArchived: true, includeForks: true, maxPages: 100, actor: `${actor}:github-auto-discovery` });
    return readGitRegistry();
  } catch (e) {
    const r = await readGitRegistry();
    r.auditEvents.push({ id: eid(), at: now(), type: 'github.repos.auto_discovery.warning', actor, message: 'GitHub account was recorded, but repository auto-discovery could not complete. Existing mappings were preserved.', metadata: { org: status.org, login: status.login, error: e instanceof Error ? e.message : String(e), destructiveActions: false } });
    await writeGitRegistry(r);
    return readGitRegistry();
  }
}

export async function recordGithubConnection(status: GitHubConnectionStatus, requestedModeInput: unknown, actor = 'mcp-web'): Promise<GitRegistry> {
  const r = await readGitRegistry();
  const requestedMode = mode(requestedModeInput);
  const login = status.login || status.org || 'unknown';
  const id = `${status.org || 'personal'}:${login}`;
  const existing = r.accounts.find((x) => x.id === id) as GitHubAccountRegistryEntry | undefined;
  const at = now();
  const entry: GitHubAccountRegistryEntry = { id, login, org: status.org, accountType: status.org && status.org === login ? 'organization' : 'user', authMode: 'pat', requestedMode, connectedAt: existing?.connectedAt || at, lastCheckedAt: at, tokenExpiresAt: status.tokenExpiresAt, reposVisible: status.reposVisible, orgAccessible: status.orgAccessible, canReadReposHint: status.canReadReposHint, canWriteReposHint: status.canWriteReposHint, canAdminOrgHint: status.canAdminOrgHint, enabledOnPublicMcpDomain: existing?.enabledOnPublicMcpDomain ?? true, status: status.connected && status.warnings.length === 0 ? 'connected' : status.connected ? 'warning' : 'error', warnings: status.warnings };
  r.accounts = [entry, ...r.accounts.filter((x) => x.id !== id)];
  r.auditEvents.push({ id: eid(), at, type: 'github.connection.recorded', actor, message: `GitHub account ${login} recorded with requested mode ${requestedMode}`, metadata: { org: status.org, reposVisible: status.reposVisible, orgAccessible: status.orgAccessible, autoDiscoveryRequested: status.connected, destructiveActions: false } });
  await writeGitRegistry(r);
  return attach(status.connected ? await autoDiscover(status, actor) : r);
}

function ctxHtml(r: GitRegistry): string {
  const c = r.activeContext ?? resolveMcpGitServerContextFromRegistry(r, {});
  if (!c.resolved) return `<section class="card warning"><h2>Automatic MCP-GitHub-Server resolution</h2><p>Not resolved.</p></section>`;
  return `<section class="card"><h2>Automatic MCP-GitHub-Server resolution</h2><p><b>ACTIVE</b>: ${esc(c.githubFullName)} -> ${esc(c.serverId)} -> <code>${esc(c.serverPath)}</code></p></section>`;
}
function rows(r: GitRegistry): string {
  return r.repoMappings.map((m) => `<tr><td>${esc(`${m.githubOwner}/${m.githubRepo}`)}</td><td>${esc(m.projectKey)}</td><td>${esc(m.serverId)}</td><td><code>${esc(m.serverPath)}</code></td><td>${esc(m.officialBranch)}</td><td>${esc(m.allowedAccess)}</td><td>${m.deployEnabled ? 'yes' : 'no'}</td></tr>`).join('') || '<tr><td colspan="7">No mapping</td></tr>';
}
function matched(r: GitRegistry, s: GitHubConnectionStatus): string {
  return getRepoMappingsForGithubStatus(r, s).map((m) => `<tr><td>${esc(`${m.githubOwner}/${m.githubRepo}`)}</td><td>${esc(m.projectKey)}</td><td>${esc(m.serverId)}</td><td><code>${esc(m.serverPath)}</code></td></tr>`).join('') || '<tr><td colspan="4">No matching mapping for active GitHub account.</td></tr>';
}

export function renderGitSettingsPage(status: GitHubConnectionStatus, registry: GitRegistry): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>MCP WealthTech - Git</title><style>body{font-family:system-ui;margin:32px}.card{border:1px solid #ddd;border-radius:12px;padding:16px;margin:16px 0}.warning{background:#fff7ed}td,th{border-bottom:1px solid #eee;padding:6px;text-align:left}table{border-collapse:collapse;width:100%}code{background:#f3f4f6;padding:2px 4px}</style></head><body><h1>MCP WealthTech - Git</h1><p><a href="/dashboard">Dashboard</a> | <a href="/github/status">GitHub JSON</a> | <a href="/git/status">Registry JSON</a></p>${ctxHtml(registry)}<section class="card"><h2>GitHub status</h2><p>connected=${status.connected ? 'yes' : 'no'} login=${esc(status.login || 'none')} org=${esc(status.org || org())} repos=${esc(status.reposVisible ?? 'n/a')}</p><p>Auto-discovery: valid connection synchronizes visible repositories additively. No clone, no delete, no deploy, no force push.</p></section><section class="card"><h2>Connect GitHub</h2><form method="post" action="/git/connect"><input name="org" value="${esc(status.org || org())}"/><input name="token" type="password" required/><select name="mode"><option value="read">read</option><option value="write">write</option><option value="admin">admin</option><option value="org_admin">org_admin</option></select><button type="submit">Connect and auto-discover repositories</button></form></section><section class="card"><h2>Mappings matching active GitHub</h2><table><tbody>${matched(registry, status)}</tbody></table></section><section class="card"><h2>All repo/server mappings</h2><table><thead><tr><th>Repo</th><th>Project</th><th>Server</th><th>Path</th><th>Branch</th><th>Access</th><th>Deploy</th></tr></thead><tbody>${rows(registry)}</tbody></table></section></body></html>`;
}
