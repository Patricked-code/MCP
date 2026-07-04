import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { GitHubConnectionStatus } from './connection.js';

const DEFAULT_REGISTRY_FILE = '/app/data/mcp-git-registry.json';

export type GitHubAccessMode = 'read' | 'write' | 'admin' | 'org_admin';

export type GitHubAccountRegistryEntry = {
  id: string;
  login: string;
  org: string | null;
  accountType: 'user' | 'organization' | 'unknown';
  authMode: 'pat' | 'github_app' | 'oauth' | 'unknown';
  requestedMode: GitHubAccessMode;
  connectedAt: string;
  lastCheckedAt: string;
  tokenExpiresAt: string | null;
  reposVisible: number | null;
  orgAccessible: boolean;
  canReadReposHint: boolean;
  canWriteReposHint: boolean;
  canAdminOrgHint: boolean;
  enabledOnPublicMcpDomain: boolean;
  status: 'connected' | 'warning' | 'error';
  warnings: string[];
};

export type RepoMappingEntry = {
  id: string;
  githubOwner: string;
  githubRepo: string;
  projectKey: string;
  serverId: string;
  serverPath: string;
  officialBranch: string;
  allowedAccess: GitHubAccessMode;
  deployEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RegistryAuditEvent = {
  id: string;
  at: string;
  type: string;
  actor: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type GitRegistry = {
  version: 1;
  updatedAt: string;
  accounts: GitHubAccountRegistryEntry[];
  repoMappings: RepoMappingEntry[];
  auditEvents: RegistryAuditEvent[];
};

function registryFilePath(): string {
  return process.env.MCP_GIT_REGISTRY_FILE || DEFAULT_REGISTRY_FILE;
}

function configuredOrg(): string {
  return process.env.GITHUB_ORG || 'chainsolutions-wealthtech';
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeMode(value: unknown): GitHubAccessMode {
  if (value === 'write' || value === 'admin' || value === 'org_admin') {
    return value;
  }
  return 'read';
}

function emptyRegistry(): GitRegistry {
  return {
    version: 1,
    updatedAt: nowIso(),
    accounts: [],
    repoMappings: [],
    auditEvents: []
  };
}

function normalizeRegistry(value: unknown): GitRegistry {
  if (!value || typeof value !== 'object') {
    return emptyRegistry();
  }

  const candidate = value as Partial<GitRegistry>;
  return {
    version: 1,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : nowIso(),
    accounts: Array.isArray(candidate.accounts) ? candidate.accounts : [],
    repoMappings: Array.isArray(candidate.repoMappings) ? candidate.repoMappings : [],
    auditEvents: Array.isArray(candidate.auditEvents) ? candidate.auditEvents : []
  };
}

export async function readGitRegistry(): Promise<GitRegistry> {
  try {
    const raw = await readFile(registryFilePath(), 'utf8');
    return normalizeRegistry(JSON.parse(raw));
  } catch {
    return emptyRegistry();
  }
}

export async function writeGitRegistry(registry: GitRegistry): Promise<void> {
  const file = registryFilePath();
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const nextRegistry: GitRegistry = {
    ...registry,
    updatedAt: nowIso(),
    auditEvents: registry.auditEvents.slice(-500)
  };
  await writeFile(file, `${JSON.stringify(nextRegistry, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await chmod(file, 0o600);
}

export async function recordGithubConnection(
  status: GitHubConnectionStatus,
  requestedModeInput: unknown,
  actor = 'mcp-web'
): Promise<GitRegistry> {
  const registry = await readGitRegistry();
  const requestedMode = normalizeMode(requestedModeInput);
  const login = status.login || status.org || 'unknown';
  const id = `${status.org || 'personal'}:${login}`;
  const existing = registry.accounts.find((entry) => entry.id === id);
  const at = nowIso();

  const entry: GitHubAccountRegistryEntry = {
    id,
    login,
    org: status.org,
    accountType: status.org && status.org === login ? 'organization' : 'user',
    authMode: 'pat',
    requestedMode,
    connectedAt: existing?.connectedAt || at,
    lastCheckedAt: at,
    tokenExpiresAt: status.tokenExpiresAt,
    reposVisible: status.reposVisible,
    orgAccessible: status.orgAccessible,
    canReadReposHint: status.canReadReposHint,
    canWriteReposHint: status.canWriteReposHint,
    canAdminOrgHint: status.canAdminOrgHint,
    enabledOnPublicMcpDomain: existing?.enabledOnPublicMcpDomain ?? true,
    status: status.connected && status.warnings.length === 0 ? 'connected' : status.connected ? 'warning' : 'error',
    warnings: status.warnings
  };

  registry.accounts = [entry, ...registry.accounts.filter((candidate) => candidate.id !== id)];
  registry.auditEvents.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at,
    type: 'github.connection.recorded',
    actor,
    message: `GitHub account ${login} recorded with requested mode ${requestedMode}`,
    metadata: {
      org: status.org,
      reposVisible: status.reposVisible,
      orgAccessible: status.orgAccessible,
      canWriteReposHint: status.canWriteReposHint,
      canAdminOrgHint: status.canAdminOrgHint
    }
  });

  await writeGitRegistry(registry);
  return registry;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function statusClass(value: boolean): string {
  return value ? 'ok' : 'ko';
}

function renderAccountRows(registry: GitRegistry): string {
  if (registry.accounts.length === 0) {
    return '<tr><td colspan="9">Aucun compte GitHub enregistré dans le registre MCP local.</td></tr>';
  }

  return registry.accounts
    .map((account) => `<tr>
      <td>${escapeHtml(account.login)}</td>
      <td>${escapeHtml(account.org || 'personnel')}</td>
      <td>${escapeHtml(account.authMode)}</td>
      <td>${escapeHtml(account.requestedMode)}</td>
      <td>${escapeHtml(account.reposVisible ?? 'n/a')}</td>
      <td>${account.canReadReposHint ? 'oui' : 'non'}</td>
      <td>${account.canWriteReposHint ? 'probable / à tester' : 'non détecté'}</td>
      <td>${account.canAdminOrgHint ? 'possible / à tester' : 'non détecté'}</td>
      <td>${escapeHtml(account.lastCheckedAt)}</td>
    </tr>`)
    .join('');
}

function renderMappingRows(registry: GitRegistry): string {
  if (registry.repoMappings.length === 0) {
    return '<tr><td colspan="8">Aucun mapping repo ↔ serveur validé pour le moment.</td></tr>';
  }

  return registry.repoMappings
    .map((mapping) => `<tr>
      <td>${escapeHtml(`${mapping.githubOwner}/${mapping.githubRepo}`)}</td>
      <td>${escapeHtml(mapping.projectKey)}</td>
      <td>${escapeHtml(mapping.serverId)}</td>
      <td><code>${escapeHtml(mapping.serverPath)}</code></td>
      <td>${escapeHtml(mapping.officialBranch)}</td>
      <td>${escapeHtml(mapping.allowedAccess)}</td>
      <td>${mapping.deployEnabled ? 'oui' : 'non'}</td>
      <td>${escapeHtml(mapping.updatedAt)}</td>
    </tr>`)
    .join('');
}

function renderAuditRows(registry: GitRegistry): string {
  const recentEvents = registry.auditEvents.slice(-20).reverse();
  if (recentEvents.length === 0) {
    return '<li>Aucun événement enregistré.</li>';
  }
  return recentEvents
    .map((event) => `<li><strong>${escapeHtml(event.at)}</strong> — ${escapeHtml(event.type)} — ${escapeHtml(event.message)}</li>`)
    .join('');
}

export function renderGitSettingsPage(status: GitHubConnectionStatus, registry: GitRegistry): string {
  const scopes = status.oauthScopes.length ? status.oauthScopes.join(', ') : 'non communiqué / fine-grained PAT ou GitHub App possible';
  const warnings = status.warnings.length
    ? `<ul>${status.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>`
    : '<p>Aucun avertissement.</p>';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>MCP WealthTech — Paramétrage Git</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; margin: 32px; color: #111827; line-height: 1.45; }
    a { color: #1d4ed8; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(300px,1fr)); gap: 16px; max-width: 1280px; }
    .card { border: 1px solid #d1d5db; border-radius: 14px; padding: 18px; background: #fff; margin: 16px 0; }
    .ok { color: #047857; font-weight: 800; }
    .ko { color: #b91c1c; font-weight: 800; }
    code { background: #f3f4f6; padding: 2px 5px; border-radius: 4px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f9fafb; }
    label { display: block; margin: 10px 0 4px; font-weight: 700; }
    input, select, textarea { width: 100%; max-width: 760px; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; }
    button { margin-top: 12px; padding: 10px 16px; border: 0; border-radius: 8px; background: #111827; color: white; font-weight: 800; cursor: pointer; }
    .warning { background: #fffbeb; border-color: #f59e0b; }
  </style>
</head>
<body>
  <h1>MCP WealthTech — Paramétrage Git</h1>
  <p><a href="/dashboard">Dashboard</a> · <a href="/github">GitHub</a> · <a href="/github/status">Statut JSON</a> · <a href="/git/status">Registre JSON</a> · <a href="/logout">Déconnexion</a></p>

  <div class="grid">
    <section class="card">
      <h2>Connexion GitHub active</h2>
      <p>État : <span class="${status.connected ? 'ok' : 'ko'}">${status.connected ? 'connectée' : 'non connectée'}</span></p>
      <table>
        <tr><td>Compte détecté</td><td>${escapeHtml(status.login || 'non détecté')}</td></tr>
        <tr><td>Organisation cible</td><td>${escapeHtml(status.org || 'non définie')}</td></tr>
        <tr><td>Organisation accessible</td><td><span class="${statusClass(status.orgAccessible)}">${status.orgAccessible ? 'oui' : 'non'}</span></td></tr>
        <tr><td>Repos visibles</td><td>${escapeHtml(status.reposVisible ?? 'n/a')}</td></tr>
        <tr><td>Expiration token</td><td>${escapeHtml(status.tokenExpiresAt || 'non communiquée')}</td></tr>
        <tr><td>Scopes</td><td>${escapeHtml(scopes)}</td></tr>
        <tr><td>Lecture repos</td><td>${status.canReadReposHint ? 'probable' : 'non détectée'}</td></tr>
        <tr><td>Écriture repos</td><td>${status.canWriteReposHint ? 'à tester / probable' : 'non détectée'}</td></tr>
        <tr><td>Admin organisation</td><td>${status.canAdminOrgHint ? 'à tester / possible' : 'non détectée'}</td></tr>
      </table>
      <h3>Avertissements</h3>
      ${warnings}
    </section>

    <section class="card warning">
      <h2>Connecter un compte GitHub au MCP</h2>
      <p>Le MCP n'enregistre pas le mot de passe GitHub. Pour l'accès serveur/API, il utilise un token GitHub valide ou, plus tard, une GitHub App. Le token est stocké hors Git dans le fichier secret configuré.</p>
      <form method="post" action="/git/connect">
        <label>Organisation ou compte cible</label>
        <input name="org" value="${escapeHtml(status.org || configuredOrg())}" />
        <label>Token GitHub</label>
        <input name="token" type="password" autocomplete="off" required />
        <label>Droit demandé au MCP pour cet espace</label>
        <select name="mode">
          <option value="read">Lecture seule</option>
          <option value="write">Lecture + écriture repos</option>
          <option value="admin">Administration repos</option>
          <option value="org_admin">Administration organisation</option>
        </select>
        <button type="submit">Vérifier, stocker hors Git et enregistrer</button>
      </form>
    </section>
  </div>

  <section class="card">
    <h2>Comptes GitHub enregistrés</h2>
    <table>
      <thead><tr><th>Compte</th><th>Organisation</th><th>Mode auth</th><th>Droit demandé</th><th>Repos visibles</th><th>Lecture</th><th>Écriture</th><th>Admin org</th><th>Dernier check</th></tr></thead>
      <tbody>${renderAccountRows(registry)}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Mappings repo ↔ serveur</h2>
    <table>
      <thead><tr><th>Repo</th><th>Projet</th><th>Serveur</th><th>Chemin</th><th>Branche officielle</th><th>Droit autorisé</th><th>Déploiement</th><th>Mis à jour</th></tr></thead>
      <tbody>${renderMappingRows(registry)}</tbody>
    </table>
  </section>

  <section class="card">
    <h2>Audit récent</h2>
    <ul>${renderAuditRows(registry)}</ul>
  </section>
</body>
</html>`;
}
