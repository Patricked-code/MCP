import { mkdir, readFile, writeFile, chmod, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { env } from '../config/env.js';

const DEFAULT_TOKEN_FILE = '/app/secrets/github_token';

export type GitHubConnectionStatus = {
  configured: boolean;
  connected: boolean;
  org: string | null;
  login: string | null;
  tokenFile: string;
  tokenFileExists: boolean;
  tokenFileMode: string | null;
  tokenExpiresAt: string | null;
  oauthScopes: string[];
  orgAccessible: boolean;
  reposVisible: number | null;
  canReadReposHint: boolean;
  canWriteReposHint: boolean;
  canAdminOrgHint: boolean;
  warnings: string[];
  error: string | null;
};

type GitHubResponse = {
  ok: boolean;
  status: number;
  json: unknown;
  text: string;
  tokenExpiresAt: string | null;
  oauthScopes: string[];
};

function tokenFilePath(): string {
  return env.GITHUB_TOKEN_FILE || DEFAULT_TOKEN_FILE;
}

function githubApiBase(): string {
  return env.GITHUB_API_BASE || 'https://api.github.com';
}

function parseScopes(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function hasRepoWriteScope(scopes: string[]): boolean {
  return scopes.includes('repo') || scopes.includes('public_repo') || scopes.includes('write:packages') || scopes.includes('workflow');
}

function hasAdminOrgScope(scopes: string[]): boolean {
  return scopes.includes('admin:org') || scopes.includes('write:org');
}

async function readToken(): Promise<string | null> {
  try {
    const token = await readFile(tokenFilePath(), 'utf8');
    return token.trim() || null;
  } catch {
    return null;
  }
}

async function getTokenFileMode(): Promise<string | null> {
  try {
    const info = await stat(tokenFilePath());
    return (info.mode & 0o777).toString(8);
  } catch {
    return null;
  }
}

async function githubRequest(token: string, endpoint: string): Promise<GitHubResponse> {
  const base = githubApiBase().replace(/\/$/, '');
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'wealthtech-mcp-guardian'
    }
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
    text,
    tokenExpiresAt: response.headers.get('github-authentication-token-expiration'),
    oauthScopes: parseScopes(response.headers.get('x-oauth-scopes'))
  };
}

function getArrayLength(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null;
}

function getLogin(value: unknown): string | null {
  if (value && typeof value === 'object' && 'login' in value) {
    const login = (value as { login?: unknown }).login;
    return typeof login === 'string' ? login : null;
  }
  return null;
}

export async function validateGithubToken(token: string, org: string): Promise<GitHubConnectionStatus> {
  const tokenFile = tokenFilePath();
  const warnings: string[] = [];
  const user = await githubRequest(token, '/user');
  const login = user.ok ? getLogin(user.json) : null;
  const scopes = user.oauthScopes;

  let orgAccessible = false;
  let reposVisible: number | null = null;
  let error: string | null = null;

  if (!user.ok || !login) {
    error = `GitHub user check failed with HTTP ${user.status}`;
  } else if (org) {
    const orgCheck = await githubRequest(token, `/orgs/${encodeURIComponent(org)}`);
    orgAccessible = orgCheck.ok;
    if (!orgCheck.ok) {
      error = `GitHub org check failed for ${org} with HTTP ${orgCheck.status}`;
    } else {
      const repos = await githubRequest(token, `/orgs/${encodeURIComponent(org)}/repos?per_page=100&type=all`);
      if (repos.ok) {
        reposVisible = getArrayLength(repos.json);
      } else {
        warnings.push(`Repo listing failed with HTTP ${repos.status}`);
      }
    }
  }

  if (scopes.length === 0) {
    warnings.push('OAuth scopes header absent: fine-grained token or GitHub App token likely. Write/admin rights must be tested per repository.');
  }

  const canWrite = hasRepoWriteScope(scopes);
  const canAdmin = hasAdminOrgScope(scopes);

  return {
    configured: Boolean(org),
    connected: Boolean(login && (!org || orgAccessible)),
    org: org || null,
    login,
    tokenFile,
    tokenFileExists: false,
    tokenFileMode: null,
    tokenExpiresAt: user.tokenExpiresAt,
    oauthScopes: scopes,
    orgAccessible,
    reposVisible,
    canReadReposHint: Boolean(login),
    canWriteReposHint: canWrite || scopes.length === 0,
    canAdminOrgHint: canAdmin || scopes.length === 0,
    warnings,
    error
  };
}

export async function getGithubConnectionStatus(): Promise<GitHubConnectionStatus> {
  const tokenFile = tokenFilePath();
  const token = await readToken();
  const tokenFileMode = await getTokenFileMode();
  const warnings: string[] = [];

  if (!token) {
    return {
      configured: Boolean(env.GITHUB_ORG),
      connected: false,
      org: env.GITHUB_ORG || null,
      login: null,
      tokenFile,
      tokenFileExists: false,
      tokenFileMode,
      tokenExpiresAt: null,
      oauthScopes: [],
      orgAccessible: false,
      reposVisible: null,
      canReadReposHint: false,
      canWriteReposHint: false,
      canAdminOrgHint: false,
      warnings: ['No GitHub token file visible from the MCP container.'],
      error: null
    };
  }

  const status = await validateGithubToken(token, env.GITHUB_ORG || '');
  status.tokenFileExists = true;
  status.tokenFileMode = tokenFileMode;

  if (tokenFileMode && tokenFileMode !== '600') {
    warnings.push(`Token file mode is ${tokenFileMode}; expected 600.`);
  }
  status.warnings = [...status.warnings, ...warnings];
  return status;
}

export async function saveGithubToken(token: string): Promise<void> {
  const file = tokenFilePath();
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, token.trim(), { encoding: 'utf8', mode: 0o600 });
  await chmod(file, 0o600);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderGithubConnectionPage(status: GitHubConnectionStatus): string {
  const scopes = status.oauthScopes.length ? status.oauthScopes.join(', ') : 'non communiqué / token finement limité possible';
  const warnings = status.warnings.length
    ? `<ul>${status.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>`
    : '<p>Aucun avertissement.</p>';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WealthTech MCP — GitHub Connection</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; margin: 32px; line-height: 1.45; color: #111827; }
    .card { border: 1px solid #d1d5db; border-radius: 12px; padding: 20px; margin: 16px 0; max-width: 980px; }
    .ok { color: #047857; font-weight: 700; }
    .ko { color: #b91c1c; font-weight: 700; }
    code { background: #f3f4f6; padding: 2px 5px; border-radius: 4px; }
    label { display: block; margin: 10px 0 4px; font-weight: 600; }
    input, select, textarea { width: 100%; max-width: 680px; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; }
    button { margin-top: 12px; padding: 10px 16px; border: 0; border-radius: 8px; background: #111827; color: white; font-weight: 700; }
    table { border-collapse: collapse; width: 100%; max-width: 980px; }
    td { border-bottom: 1px solid #e5e7eb; padding: 8px; vertical-align: top; }
    td:first-child { font-weight: 700; width: 280px; }
  </style>
</head>
<body>
  <h1>WealthTech MCP — Connexion GitHub</h1>
  <div class="card">
    <h2>État actuel</h2>
    <p>Connexion : <span class="${status.connected ? 'ok' : 'ko'}">${status.connected ? 'connectée' : 'non connectée'}</span></p>
    <table>
      <tr><td>Organisation</td><td>${escapeHtml(status.org || env.GITHUB_ORG || 'non définie')}</td></tr>
      <tr><td>Compte GitHub</td><td>${escapeHtml(status.login || 'non détecté')}</td></tr>
      <tr><td>Token visible par le conteneur</td><td>${status.tokenFileExists ? 'oui' : 'non'} — <code>${escapeHtml(status.tokenFile)}</code></td></tr>
      <tr><td>Permissions fichier token</td><td>${escapeHtml(status.tokenFileMode || 'n/a')}</td></tr>
      <tr><td>Expiration token</td><td>${escapeHtml(status.tokenExpiresAt || 'non communiquée par GitHub')}</td></tr>
      <tr><td>Scopes OAuth</td><td>${escapeHtml(scopes)}</td></tr>
      <tr><td>Organisation accessible</td><td>${status.orgAccessible ? 'oui' : 'non'}</td></tr>
      <tr><td>Repos visibles</td><td>${escapeHtml(status.reposVisible ?? 'n/a')}</td></tr>
      <tr><td>Lecture repos</td><td>${status.canReadReposHint ? 'probable' : 'non détectée'}</td></tr>
      <tr><td>Écriture repos</td><td>${status.canWriteReposHint ? 'à tester / probable' : 'non détectée'}</td></tr>
      <tr><td>Admin organisation</td><td>${status.canAdminOrgHint ? 'à tester / possible' : 'non détectée'}</td></tr>
    </table>
    ${status.error ? `<p class="ko">Erreur : ${escapeHtml(status.error)}</p>` : ''}
    <h3>Avertissements</h3>
    ${warnings}
  </div>

  <div class="card">
    <h2>Connecter ou remplacer le token GitHub</h2>
    <p>Le token sera stocké dans le fichier secret du conteneur MCP. Il ne doit jamais être commité dans Git.</p>
    <form method="post" action="/github/connect">
      <label>Organisation GitHub</label>
      <input name="org" value="${escapeHtml(status.org || env.GITHUB_ORG || 'chainsolutions-wealthtech')}" />
      <label>Token GitHub</label>
      <input name="token" type="password" autocomplete="off" required />
      <label>Niveau souhaité</label>
      <select name="mode">
        <option value="read">Lecture seule</option>
        <option value="write">Lecture / écriture repos</option>
        <option value="admin">Administration repos</option>
        <option value="org_admin">Administration organisation</option>
      </select>
      <button type="submit">Vérifier et connecter</button>
    </form>
  </div>

  <div class="card">
    <h2>Questions de paramétrage à traiter ensuite</h2>
    <ol>
      <li>Faut-il lier un repo GitHub existant à un dossier serveur ?</li>
      <li>Faut-il inventorier tous les dossiers serveur S1/S2 ?</li>
      <li>Faut-il créer un nouveau repo projet ?</li>
      <li>Quelle branche unique sera officielle : <code>main</code> ou <code>final</code> ?</li>
      <li>Quel projet peut écrire sur quel chemin serveur ?</li>
      <li>Quels fichiers mémoire et loopback doivent être installés ?</li>
    </ol>
    <p>Prochaine étape MCP : créer les outils <code>github_org_inventory</code>, <code>github_link_repo_to_server_path</code>, <code>github_bootstrap_project_memory</code> et <code>mcp_server_inventory</code>.</p>
  </div>
</body>
</html>`;
}
