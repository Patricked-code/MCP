import { readFile, stat } from 'node:fs/promises';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { asText } from './format.js';

const ACCOUNTS_FILE = process.env.MCP_GITHUB_ACCOUNTS_FILE || '/app/data/github-accounts.json';
const API_BASE = process.env.GITHUB_API_BASE || 'https://api.github.com';
const SECRET_PREFIX = '/app/secrets/';

type Account = { owner?: string; type?: string; role?: string; tokenFile?: string; status?: string };
type AccountsFile = { defaultTargetOwner?: string; accounts?: Account[] };

const clean = (v: unknown) => String(v ?? '').trim().replace(/^@/, '').replace(/[^A-Za-z0-9_.-]/g, '');
const tokenPath = (v: unknown) => String(v ?? '').trim() || '/app/secrets/github_token';
const allowedSecret = (p: string) => p.startsWith(SECRET_PREFIX) && !p.includes('..');
const scopesOf = (v: string | null) => v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
const loginOf = (v: unknown) => v && typeof v === 'object' && typeof (v as { login?: unknown }).login === 'string' ? String((v as { login: string }).login) : null;

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

async function gh(token: string, endpoint: string) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE.replace(/\/$/, '')}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'wealthtech-mcp-durable-accounts'
    }
  });
  const text = await response.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return {
    ok: response.ok,
    status: response.status,
    json,
    scopes: scopesOf(response.headers.get('x-oauth-scopes')),
    expires: response.headers.get('github-authentication-token-expiration')
  };
}

async function accountLines(account: Account, includeRepos: boolean, maxRepos: number): Promise<string[]> {
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

  const user = await gh(token, '/user');
  const login = user.ok ? loginOf(user.json) : null;
  lines.push(`  githubUserCheck=${user.ok} | http=${user.status} | login=${login ?? 'n/a'} | tokenExpires=${user.expires ?? 'n/a'}`);
  lines.push(`  scopes=${user.scopes.length ? user.scopes.join(',') : 'non_communique_ou_token_finement_limite'}`);
  if (!user.ok || !login) {
    lines.push('  connected=false');
    return lines;
  }

  const isOrg = type.toLowerCase().includes('org') || owner.toLowerCase() !== login.toLowerCase();
  if (isOrg) {
    const org = await gh(token, `/orgs/${encodeURIComponent(owner)}`);
    lines.push(`  orgAccess=${org.ok} | orgHttp=${org.status}`);
    if (!org.ok) lines.push(`  warning=${owner} n'est pas confirmé accessible avec ce token`);
  } else {
    lines.push(`  ownerMatchesLogin=${owner.toLowerCase() === login.toLowerCase()}`);
  }

  if (includeRepos) {
    const endpoint = isOrg
      ? `/orgs/${encodeURIComponent(owner)}/repos?per_page=${Math.max(1, Math.min(maxRepos, 100))}&type=all&sort=updated`
      : `/user/repos?per_page=${Math.max(1, Math.min(maxRepos, 100))}&visibility=all&affiliation=owner,collaborator,organization_member&sort=updated`;
    const repos = await gh(token, endpoint);
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
  for (const account of accounts) lines.push(...await accountLines(account, includeRepos, maxRepos));
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
