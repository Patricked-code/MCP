import { readFile } from 'node:fs/promises';
import { env } from '../config/env.js';

const DEFAULT_TOKEN_FILE = '/app/secrets/github_token';
const DEFAULT_API_BASE = 'https://api.github.com';

export type GithubAuthorizationFailureKind =
  | 'none'
  | 'token_missing'
  | 'api_base_not_allowed'
  | 'authentication_failed'
  | 'token_expired_or_revoked'
  | 'rate_limited'
  | 'sso_authorization_required'
  | 'repository_not_visible_or_not_selected'
  | 'pull_request_permission_missing'
  | 'resource_not_accessible_by_integration'
  | 'insufficient_repository_role'
  | 'forbidden'
  | 'not_found'
  | 'unexpected_response'
  | 'network_error';

export type GithubAuthorizationProbe = {
  name: 'authenticated_user' | 'repository' | 'pull_request_list' | 'pull_request';
  endpoint: string;
  ok: boolean;
  status: number | null;
  failureKind: GithubAuthorizationFailureKind;
  message: string | null;
  acceptedPermissions: string[];
  oauthScopes: string[];
  requestId: string | null;
  tokenExpiresAt: string | null;
};

export type GithubPrAuthorizationDiagnostic = {
  ok: boolean;
  readOnly: true;
  diagnosticScope: 'mcp_server_github_credential';
  owner: string;
  repo: string;
  pullRequestNumber: number | null;
  login: string | null;
  tokenFile: string;
  probes: GithubAuthorizationProbe[];
  primaryFailure: GithubAuthorizationFailureKind;
  remediations: string[];
  warnings: string[];
};

type GithubRequestResult = {
  ok: boolean;
  status: number;
  message: string | null;
  json: unknown;
  acceptedPermissions: string[];
  oauthScopes: string[];
  requestId: string | null;
  tokenExpiresAt: string | null;
};

const tokenFilePath = () => env.GITHUB_TOKEN_FILE || DEFAULT_TOKEN_FILE;

function splitHeader(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeOwner(value: string): string {
  const owner = value.trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9_.-]{1,120}$/.test(owner)) throw new Error('GitHub owner invalide.');
  return owner;
}

function normalizeRepo(value: string): string {
  const repo = value.trim();
  if (!/^[A-Za-z0-9_.-]{1,120}$/.test(repo)) throw new Error('Nom de dépôt GitHub invalide.');
  return repo;
}

export function resolveGithubApiBase(
  configuredBase = env.GITHUB_API_BASE || DEFAULT_API_BASE,
  allowedHostsValue = env.GITHUB_API_ALLOWED_HOSTS
): string {
  const parsed = new URL(configuredBase);
  const allowedHosts = new Set(
    allowedHostsValue
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  );

  if (parsed.protocol !== 'https:') {
    throw new Error('GitHub API base doit utiliser HTTPS.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('GitHub API base ne doit contenir aucun identifiant.');
  }
  if (parsed.search || parsed.hash) {
    throw new Error('GitHub API base ne doit contenir ni query string ni fragment.');
  }
  if (!allowedHosts.has(parsed.hostname.toLowerCase())) {
    throw new Error('Hôte GitHub API non autorisé.');
  }

  return parsed.toString().replace(/\/$/, '');
}

async function readToken(): Promise<string | null> {
  try {
    const token = await readFile(tokenFilePath(), 'utf8');
    return token.trim() || null;
  } catch {
    return null;
  }
}

function extractMessage(json: unknown): string | null {
  if (!json || typeof json !== 'object' || !('message' in json)) return null;
  const message = (json as { message?: unknown }).message;
  return typeof message === 'string' ? message.slice(0, 500) : null;
}

function extractLogin(json: unknown): string | null {
  if (!json || typeof json !== 'object' || !('login' in json)) return null;
  const login = (json as { login?: unknown }).login;
  return typeof login === 'string' ? login : null;
}

async function githubRequest(
  token: string,
  apiBase: string,
  endpoint: string
): Promise<GithubRequestResult> {
  if (!endpoint.startsWith('/')) throw new Error('Endpoint GitHub invalide.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.GITHUB_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBase}${endpoint}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'wealthtech-mcp-github-auth-diagnostic'
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
      message: extractMessage(json),
      json,
      acceptedPermissions: splitHeader(response.headers.get('x-accepted-github-permissions')),
      oauthScopes: splitHeader(response.headers.get('x-oauth-scopes')),
      requestId: response.headers.get('x-github-request-id'),
      tokenExpiresAt: response.headers.get('github-authentication-token-expiration')
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function classifyGithubAuthorizationFailure(
  status: number,
  message: string | null,
  probeName: GithubAuthorizationProbe['name']
): GithubAuthorizationFailureKind {
  const normalized = (message || '').toLowerCase();

  if (status >= 200 && status < 300) return 'none';
  if (status === 401) {
    return normalized.includes('expired') || normalized.includes('bad credentials')
      ? 'token_expired_or_revoked'
      : 'authentication_failed';
  }
  if (status === 403) {
    if (normalized.includes('rate limit')) return 'rate_limited';
    if (normalized.includes('saml') || normalized.includes('single sign-on')) return 'sso_authorization_required';
    if (normalized.includes('resource not accessible by integration')) {
      return probeName === 'pull_request' || probeName === 'pull_request_list'
        ? 'pull_request_permission_missing'
        : 'resource_not_accessible_by_integration';
    }
    if (normalized.includes('admin rights') || normalized.includes('must have push access')) {
      return 'insufficient_repository_role';
    }
    return probeName === 'pull_request' || probeName === 'pull_request_list'
      ? 'pull_request_permission_missing'
      : 'forbidden';
  }
  if (status === 404) {
    if (probeName === 'repository') return 'repository_not_visible_or_not_selected';
    if (probeName === 'pull_request_list') return 'pull_request_permission_missing';
    return 'not_found';
  }
  return 'unexpected_response';
}

function toProbe(
  name: GithubAuthorizationProbe['name'],
  endpoint: string,
  result: GithubRequestResult
): GithubAuthorizationProbe {
  return {
    name,
    endpoint,
    ok: result.ok,
    status: result.status,
    failureKind: classifyGithubAuthorizationFailure(result.status, result.message, name),
    message: result.message,
    acceptedPermissions: result.acceptedPermissions,
    oauthScopes: result.oauthScopes,
    requestId: result.requestId,
    tokenExpiresAt: result.tokenExpiresAt
  };
}

export function buildGithubAuthorizationRemediations(
  failure: GithubAuthorizationFailureKind,
  owner: string,
  repo: string
): string[] {
  const repository = `${owner}/${repo}`;
  switch (failure) {
    case 'token_missing':
      return ['Connecter un credential GitHub au MCP sans le commiter dans Git.', 'Vérifier que le fichier secret GitHub est monté en lecture seule dans le conteneur.'];
    case 'api_base_not_allowed':
      return ['Configurer une API GitHub HTTPS dont le hostname figure explicitement dans GITHUB_API_ALLOWED_HOSTS.', 'Ne jamais autoriser un hôte arbitraire à recevoir le credential GitHub.'];
    case 'authentication_failed':
    case 'token_expired_or_revoked':
      return ['Renouveler ou réautoriser le credential GitHub utilisé par le MCP.', 'Ne jamais copier le token dans un issue, une PR, un log ou un fichier versionné.'];
    case 'repository_not_visible_or_not_selected':
      return [`Ajouter ${repository} à la sélection de dépôts de l’installation GitHub App ou du token finement limité.`, 'Vérifier que le compte authentifié possède au minimum un accès en lecture au dépôt.'];
    case 'pull_request_permission_missing':
      return [`Accorder la permission GitHub App « Pull requests: Read » pour ${repository}.`, 'Réapprouver toute mise à jour de permissions en attente, puis relancer le diagnostic.'];
    case 'resource_not_accessible_by_integration':
      return [`Vérifier que l’installation GitHub App inclut ${repository}.`, 'Vérifier les permissions demandées et approuvées par l’installation.'];
    case 'sso_authorization_required':
      return ['Autoriser le credential GitHub auprès du SSO/SAML de l’organisation concernée.', 'Relancer le diagnostic après l’autorisation SSO.'];
    case 'rate_limited':
      return ['Attendre la réinitialisation de la limite GitHub ou utiliser un credential correctement authentifié.', 'Conserver le X-GitHub-Request-Id pour le diagnostic sans exposer le token.'];
    case 'insufficient_repository_role':
      return [`Accorder au compte ou à l’installation le rôle minimal nécessaire sur ${repository}.`, 'Ne pas accorder de privilèges administrateur si la lecture seule suffit.'];
    case 'forbidden':
      return ['Vérifier la sélection du dépôt, les permissions GitHub App, le SSO et les restrictions de l’organisation.', 'Réautoriser la connexion uniquement après avoir identifié la permission manquante.'];
    case 'network_error':
      return ['Vérifier la résolution DNS, la connectivité HTTPS et le timeout vers l’API GitHub depuis le runtime MCP.', 'Relancer le diagnostic sans modifier Git ni la production.'];
    case 'not_found':
    case 'unexpected_response':
      return ['Vérifier le propriétaire, le nom du dépôt et le numéro de PR.', 'Conserver le statut HTTP et le X-GitHub-Request-Id pour l’analyse.'];
    case 'none':
      return ['Aucune correction d’autorisation GitHub n’est requise pour les lectures testées.'];
  }
}

function diagnosticFailure(
  failure: GithubAuthorizationFailureKind,
  owner: string,
  repo: string,
  pullRequestNumber: number | null,
  tokenFile: string,
  login: string | null,
  probes: GithubAuthorizationProbe[],
  warning: string
): GithubPrAuthorizationDiagnostic {
  return {
    ok: false,
    readOnly: true,
    diagnosticScope: 'mcp_server_github_credential',
    owner,
    repo,
    pullRequestNumber,
    login,
    tokenFile,
    probes,
    primaryFailure: failure,
    remediations: buildGithubAuthorizationRemediations(failure, owner, repo),
    warnings: [warning]
  };
}

export async function diagnoseGithubPrAuthorization(options: {
  owner: string;
  repo: string;
  pullRequestNumber?: number | null;
}): Promise<GithubPrAuthorizationDiagnostic> {
  const owner = normalizeOwner(options.owner);
  const repo = normalizeRepo(options.repo);
  const pullRequestNumber = options.pullRequestNumber ?? null;
  if (pullRequestNumber !== null && (!Number.isInteger(pullRequestNumber) || pullRequestNumber < 1)) {
    throw new Error('Numéro de pull request invalide.');
  }

  const tokenFile = tokenFilePath();
  let apiBase: string;
  try {
    apiBase = resolveGithubApiBase();
  } catch {
    return diagnosticFailure(
      'api_base_not_allowed',
      owner,
      repo,
      pullRequestNumber,
      tokenFile,
      null,
      [],
      'La configuration de l’API GitHub est refusée avant toute lecture du credential.'
    );
  }

  const token = await readToken();
  if (!token) {
    return diagnosticFailure(
      'token_missing',
      owner,
      repo,
      pullRequestNumber,
      tokenFile,
      null,
      [],
      'Ce diagnostic teste le credential GitHub du serveur MCP, pas la session interne du connecteur GitHub de ChatGPT.'
    );
  }

  const probes: GithubAuthorizationProbe[] = [];
  let login: string | null = null;

  try {
    const userResult = await githubRequest(token, apiBase, '/user');
    login = userResult.ok ? extractLogin(userResult.json) : null;
    probes.push(toProbe('authenticated_user', '/user', userResult));

    if (userResult.ok) {
      const repoEndpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
      const repoResult = await githubRequest(token, apiBase, repoEndpoint);
      probes.push(toProbe('repository', repoEndpoint, repoResult));

      if (repoResult.ok) {
        const pullListEndpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=all&per_page=1`;
        const pullListResult = await githubRequest(token, apiBase, pullListEndpoint);
        probes.push(toProbe('pull_request_list', pullListEndpoint, pullListResult));

        if (pullListResult.ok && pullRequestNumber !== null) {
          const pullEndpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullRequestNumber}`;
          const pullResult = await githubRequest(token, apiBase, pullEndpoint);
          probes.push(toProbe('pull_request', pullEndpoint, pullResult));
        }
      }
    }
  } catch {
    return diagnosticFailure(
      'network_error',
      owner,
      repo,
      pullRequestNumber,
      tokenFile,
      login,
      probes,
      'Une erreur réseau ou un timeout a interrompu le diagnostic. Aucun objet d’erreur, secret ou header de requête n’est retourné.'
    );
  }

  const failedProbe = probes.find((probe) => !probe.ok);
  const primaryFailure = failedProbe?.failureKind || 'none';
  const warnings = ['Ce diagnostic teste le credential GitHub du serveur MCP, pas la session interne du connecteur GitHub de ChatGPT.'];
  if (probes.some((probe) => probe.oauthScopes.length === 0)) {
    warnings.push('L’en-tête OAuth scopes est absent ; il peut s’agir d’un token GitHub App ou d’un token finement limité. Les résultats des probes font foi.');
  }

  return {
    ok: !failedProbe,
    readOnly: true,
    diagnosticScope: 'mcp_server_github_credential',
    owner,
    repo,
    pullRequestNumber,
    login,
    tokenFile,
    probes,
    primaryFailure,
    remediations: buildGithubAuthorizationRemediations(primaryFailure, owner, repo),
    warnings
  };
}

export async function buildGithubPrAuthorizationSummary(options: {
  owner: string;
  repo: string;
  pullRequestNumber?: number | null;
}): Promise<string> {
  const result = await diagnoseGithubPrAuthorization(options);
  const lines: string[] = [
    'Diagnostic autorisation GitHub PR — lecture seule',
    `scope: ${result.diagnosticScope}`,
    `repository: ${result.owner}/${result.repo}`,
    `pull_request: ${result.pullRequestNumber ?? 'non ciblée'}`,
    `login: ${result.login || 'non détecté'}`,
    `ok: ${result.ok}`,
    `primary_failure: ${result.primaryFailure}`
  ];

  lines.push('', 'Probes:');
  if (result.probes.length === 0) lines.push('- aucune probe exécutée');
  for (const probe of result.probes) {
    lines.push(`- ${probe.name}: HTTP ${probe.status ?? 'n/a'} | ok=${probe.ok} | failure=${probe.failureKind} | request_id=${probe.requestId || 'n/a'}`);
    if (probe.acceptedPermissions.length) lines.push(`  accepted_permissions: ${probe.acceptedPermissions.join(', ')}`);
    if (probe.message) lines.push(`  message: ${probe.message}`);
  }

  lines.push('', 'Actions recommandées:');
  for (const remediation of result.remediations) lines.push(`- ${remediation}`);

  if (result.warnings.length) {
    lines.push('', 'Limites et avertissements:');
    for (const warning of result.warnings) lines.push(`- ${warning}`);
  }

  lines.push('', 'Aucun token, secret ou en-tête Authorization n’est affiché.');
  return lines.join('\n');
}
