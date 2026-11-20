import { consoleDocument } from '../web/consoleUi.js';
import { mkdir, readFile, writeFile, chmod, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { env } from '../config/env.js';
import { downloadGithubArchive, type ArchiveDownloadResult } from '../provisioning/sourceArchive.js';
import { resolveGithubApiBase } from './authorizationDiagnostics.js';
import { renderConnectConsentFields } from './connectConsent.js';
import {
  deriveGithubCredentialCompletion,
  renderGithubCredentialCompletion,
  renderGithubCredentialRequest
} from './credentialCompletion.js';

export {
  deriveGithubCredentialCompletion,
  renderGithubCredentialCompletion,
  renderGithubCredentialRequest,
  type GithubCredentialCompletion
} from './credentialCompletion.js';
import type {
  GithubAuthenticatedPrincipalObservation,
  GithubIdentityReasonCode
} from './identityResolution.js';

const DEFAULT_TOKEN_FILE = '/app/secrets/github_token';
const MAX_RESPONSE_BYTES = 1_000_000;

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
  /** E2: HTTP status of the `GET /user` check; null without a token or a response. */
  userCheckStatus?: number | null;
  /** E2: HTTP status of the organization check; null when it did not run. */
  orgCheckStatus?: number | null;
};

export type GitHubJsonResponse = {
  ok: boolean;
  status: number | null;
  json: unknown;
  tokenExpiresAt: string | null;
  oauthScopes: string[];
};

export type GitHubJsonRequestOptions = {
  fetchImpl?: typeof fetch;
  apiBase?: string;
  allowedHosts?: string;
  timeoutMs?: number;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT';
  jsonBody?: unknown;
};

export type GitHubPrincipalObservationOptions = GitHubJsonRequestOptions & {
  now?: () => Date;
};

export type GitHubAuthenticatedPrincipalEvidence = {
  principal: GithubAuthenticatedPrincipalObservation;
  httpStatus: number | null;
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

export async function githubJsonRequest(
  token: string,
  endpoint: string,
  options: GitHubJsonRequestOptions = {}
): Promise<GitHubJsonResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = Math.max(1, Math.min(options.timeoutMs ?? env.GITHUB_REQUEST_TIMEOUT_MS, 15_000));
  let base: string;
  try {
    base = resolveGithubApiBase(
      options.apiBase ?? githubApiBase(),
      options.allowedHosts ?? env.GITHUB_API_ALLOWED_HOSTS
    ).replace(/\/$/, '');
  } catch {
    return {
      ok: false, status: null, json: null, tokenExpiresAt: null, oauthScopes: []
    };
  }
  if (!endpoint.startsWith('/') || endpoint.startsWith('//')) {
    return {
      ok: false, status: null, json: null, tokenExpiresAt: null, oauthScopes: []
    };
  }
  const url = `${base}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const method = options.method ?? 'GET';
  const hasJsonBody = method !== 'GET' && options.jsonBody !== undefined;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'wealthtech-mcp-guardian'
  };
  if (hasJsonBody) headers['Content-Type'] = 'application/json';
  try {
    const response = await fetchImpl(url, {
      method,
      redirect: 'error',
      signal: controller.signal,
      headers,
      ...(hasJsonBody ? { body: JSON.stringify(options.jsonBody) } : {})
    });
    const declaredLength = Number(response.headers.get('content-length') ?? '0');
    if (declaredLength > MAX_RESPONSE_BYTES) {
      return {
        ok: false, status: response.status, json: null,
        tokenExpiresAt: null, oauthScopes: []
      };
    }
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) {
      return {
        ok: false, status: response.status, json: null,
        tokenExpiresAt: null, oauthScopes: []
      };
    }
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
      tokenExpiresAt: response.headers.get('github-authentication-token-expiration'),
      oauthScopes: parseScopes(response.headers.get('x-oauth-scopes'))
    };
  } catch {
    return {
      ok: false, status: null, json: null, tokenExpiresAt: null, oauthScopes: []
    };
  } finally {
    clearTimeout(timer);
  }
}


export async function githubJsonRequestWithServerCredential(
  endpoint: string,
  options: GitHubJsonRequestOptions = {}
): Promise<GitHubJsonResponse> {
  const token = await readToken();
  if (!token) {
    return {
      ok: false,
      status: null,
      json: null,
      tokenExpiresAt: null,
      oauthScopes: []
    };
  }
  return githubJsonRequest(token, endpoint, options);
}

/**
 * F.2 (TB-W3-F-03): the archive of an exact revision, fetched with the server
 * credential through the allowlisted API host; the credential never leaves
 * this module and never reaches the signed archive URL.
 */
export async function downloadGithubArchiveWithServerCredential(input: {
  repositoryId: string;
  revision: string;
  destination: string;
  maxBytes: number;
}): Promise<ArchiveDownloadResult> {
  const token = await readToken();
  if (!token) return Object.freeze({ ok: false as const, reasonCode: 'ARCHIVE_CREDENTIAL_MISSING' });
  let apiBase: string;
  try {
    apiBase = resolveGithubApiBase(githubApiBase(), env.GITHUB_API_ALLOWED_HOSTS);
  } catch {
    return Object.freeze({ ok: false as const, reasonCode: 'ARCHIVE_REQUEST_INVALID' });
  }
  return downloadGithubArchive({ ...input, token, apiBase });
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

function principalReason(status: number | null): GithubIdentityReasonCode {
  if (status === 401) return 'GITHUB_IDENTITY_AUTH_INVALID';
  return 'GITHUB_IDENTITY_API_UNAVAILABLE';
}

export async function observeGithubAuthenticatedPrincipalEvidence(
  token: string | null,
  options: GitHubPrincipalObservationOptions = {}
): Promise<GitHubAuthenticatedPrincipalEvidence> {
  const observedAt = (options.now ?? (() => new Date()))().toISOString();
  if (!token) {
    return {
      principal: {
        status: 'MISSING', observedAt, freshness: 'UNKNOWN', login: null,
        accountType: null, reasonCode: 'GITHUB_IDENTITY_AUTH_MISSING'
      },
      httpStatus: null,
      tokenExpiresAt: null,
      oauthScopes: []
    };
  }
  const response = await githubJsonRequest(token, '/user', options);
  if (!response.ok) {
    const reasonCode = principalReason(response.status);
    return {
      principal: {
        status: reasonCode === 'GITHUB_IDENTITY_AUTH_INVALID' ? 'INVALID' : 'UNAVAILABLE',
        observedAt,
        freshness: 'UNKNOWN',
        login: null,
        accountType: null,
        reasonCode
      },
      httpStatus: response.status,
      tokenExpiresAt: response.tokenExpiresAt,
      oauthScopes: response.oauthScopes
    };
  }
  const root = response.json && typeof response.json === 'object' && !Array.isArray(response.json)
    ? response.json as Record<string, unknown>
    : null;
  const login = getLogin(root);
  const githubUserId = root?.id;
  const accountType = typeof root?.type === 'string' && root.type.toLowerCase() === 'user'
    ? 'user' as const
    : null;
  if (
    !login
    || login.length > 120
    || !accountType
    || typeof githubUserId !== 'number'
    || !Number.isSafeInteger(githubUserId)
    || githubUserId < 1
  ) {
    return {
      principal: {
        status: 'UNAVAILABLE', observedAt, freshness: 'UNKNOWN', login: null,
        accountType: null, reasonCode: 'GITHUB_IDENTITY_API_UNAVAILABLE'
      },
      httpStatus: response.status,
      tokenExpiresAt: response.tokenExpiresAt,
      oauthScopes: response.oauthScopes
    };
  }
  return {
    principal: {
      status: 'VERIFIED', observedAt, freshness: 'CURRENT', login,
      githubUserId, accountType, reasonCode: null
    },
    httpStatus: response.status,
    tokenExpiresAt: response.tokenExpiresAt,
    oauthScopes: response.oauthScopes
  };
}

export async function observeGithubAuthenticatedPrincipal(
  token: string | null,
  options: GitHubPrincipalObservationOptions = {}
): Promise<GithubAuthenticatedPrincipalObservation> {
  return (await observeGithubAuthenticatedPrincipalEvidence(token, options)).principal;
}

export async function validateGithubToken(token: string, org: string): Promise<GitHubConnectionStatus> {
  const tokenFile = tokenFilePath();
  const warnings: string[] = [];
  const user = await githubJsonRequest(token, '/user');
  const login = user.ok ? getLogin(user.json) : null;
  const scopes = user.oauthScopes;

  let orgAccessible = false;
  let reposVisible: number | null = null;
  let error: string | null = null;
  let orgCheckStatus: number | null = null;

  if (!user.ok || !login) {
    error = `GitHub user check failed with HTTP ${user.status}`;
  } else if (org) {
    const orgCheck = await githubJsonRequest(token, `/orgs/${encodeURIComponent(org)}`);
    orgAccessible = orgCheck.ok;
    orgCheckStatus = orgCheck.status;
    if (!orgCheck.ok) {
      error = `GitHub org check failed for ${org} with HTTP ${orgCheck.status}`;
    } else {
      const repos = await githubJsonRequest(token, `/orgs/${encodeURIComponent(org)}/repos?per_page=100&type=all`);
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
    error,
    userCheckStatus: user.status,
    orgCheckStatus
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
      error: null,
      userCheckStatus: null,
      orgCheckStatus: null
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

export function renderGithubConnectionPage(
  status: GitHubConnectionStatus,
  options: { consentTicket?: string } = {}
): string {
  const scopes = status.oauthScopes.length ? status.oauthScopes.join(', ') : 'non communiqué / token finement limité possible';
  const warnings = status.warnings.length
    ? `<ul>${status.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>`
    : '<p>Aucun avertissement.</p>';

  return consoleDocument('WealthTech MCP — Connexion GitHub', `
  <h1>WealthTech MCP — Connexion GitHub</h1>
  <p class="wt-copy">Vérifiez le compte actif et ses accès avant d’intervenir sur un dépôt.</p>
  ${renderGithubCredentialCompletion(status)}
  <div class="card">
    <h2 id="github-current">État actuel</h2>
    <p>Connexion : <span class="${status.connected ? 'ok' : 'ko'}">${status.connected ? 'connectée' : 'non connectée'}</span></p>
    <div class="wt-table" role="region" aria-labelledby="github-current" tabindex="0"><table>
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
    </table></div>
    ${status.error ? `<p class="ko">Erreur : ${escapeHtml(status.error)}</p>` : ''}
    <h3>Avertissements</h3>
    ${warnings}
  </div>


  ${renderGithubCredentialRequest(status, {
    request: 'Connecter le token GitHub',
    optional: 'Remplacer le token GitHub (facultatif)'
  }, `<p>Le token sera stocké dans le fichier secret du conteneur MCP. Il ne doit jamais être commité dans Git.</p>
    <form method="post" action="/github/connect">
      <label for="github-org">Organisation GitHub</label>
      <input id="github-org" name="org" value="${escapeHtml(status.org || env.GITHUB_ORG || 'chainsolutions-wealthtech')}" />
      <label for="github-token">Token GitHub</label>
      <input id="github-token" name="token" type="password" autocomplete="off" required />
      <label for="github-mode">Niveau souhaité</label>
      <select id="github-mode" name="mode">
        <option value="read">Lecture seule</option>
        <option value="write">Lecture / écriture repos</option>
        <option value="admin">Administration repos</option>
        <option value="org_admin">Administration organisation</option>
      </select>
      ${renderConnectConsentFields({ ticket: options.consentTicket ?? '', org: status.org || env.GITHUB_ORG || null })}
      <button type="submit">Vérifier et connecter</button>
    </form>`)}

  <div class="card">
    <h2>Contexte projet</h2>
    <p>Le mapping dépôt ↔ projet ↔ serveur d’un dépôt se consulte sur <a href="/git">/git</a> (<code>/git?repository=Owner/Name</code>) : seules les informations manquantes y sont demandées.</p>
  </div>
`);
}
