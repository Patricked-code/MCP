# MCP Core Source Safe

Date: 2026-07-08T17:59:17+00:00
Path: /opt/apps/wealthtech-mcp-ssh-bridge

## Git status
```
## main...origin/main [ahead 2]
?? docs/reports/
?? memory/CHAINSOLUTIONS_WEALTHTECH_TARGET_ORG_20260708_044836.md
?? package-lock.json
```


## FILE: src/server.ts
```
import express from 'express';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { env } from './config/env.js';
import { requireBearerToken } from './auth.js';
import { registerOauthRoutes } from './oauth.js';
import { logger } from './logger.js';
import { registerReadOnlyTools } from './tools/readOnly.js';
import { registerScopedWriteTools } from './tools/writeScoped.js';
import { getGithubConnectionStatus, renderGithubConnectionPage, saveGithubToken, validateGithubToken } from './github/connection.js';
import { readGitRegistry, recordGithubConnection, renderGitSettingsPage } from './github/registry.js';

const WEB_SESSION_COOKIE = 'mcp_web_session';
const WEB_SESSION_MAX_AGE_SECONDS = Math.max(1, Number.parseInt(process.env.MCP_SESSION_TTL_HOURS || '8', 10)) * 60 * 60;

function mcpAuthSecret(): string {
  const value = env.MCP_AUTH_TOKEN;
  if (!value) throw new Error('MCP auth token is missing');
  return value;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function signSession(expiresAt: number): string {
  return createHmac('sha256', mcpAuthSecret()).update(String(expiresAt)).digest('hex');
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey || rawValue.length === 0) continue;
    cookies[rawKey] = decodeURIComponent(rawValue.join('='));
  }

  return cookies;
}

function isValidWebSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;

  const [expiresRaw, signature] = cookieValue.split('.');
  const expiresAt = Number(expiresRaw);

  if (!Number.isFinite(expiresAt) || !signature || expiresAt < Date.now() || !/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expectedBuffer = Buffer.from(signSession(expiresAt), 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function tokenMatches(input: string): boolean {
  const expected = Buffer.from(mcpAuthSecret());
  const actual = Buffer.from(input);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function secureCookieAttribute(): string {
  const baseUrl = process.env.MCP_WEB_BASE_URL || '';
  return env.NODE_ENV === 'production' || baseUrl.startsWith('https://') ? '; Secure' : '';
}

function createWebSessionCookie(): string {
  const expiresAt = Date.now() + WEB_SESSION_MAX_AGE_SECONDS * 1000;
  const value = `${expiresAt}.${signSession(expiresAt)}`;
  return `${WEB_SESSION_COOKIE}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${WEB_SESSION_MAX_AGE_SECONDS}${secureCookieAttribute()}`;
}

function clearWebSessionCookie(): string {
  return `${WEB_SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureCookieAttribute()}`;
}

function isWebAuthenticated(req: express.Request): boolean {
  const authorization = req.header('authorization') ?? '';

  if (authorization.startsWith('Bearer ') && authorization.slice('Bearer '.length) === mcpAuthSecret()) {
    return true;
  }

  return isValidWebSession(parseCookies(req.header('cookie'))[WEB_SESSION_COOKIE]);
}

function requireWebLogin(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (isWebAuthenticated(req)) {
    next();
    return;
  }

  if (req.accepts('html')) {
    res.redirect(`/login?next=${encodeURIComponent(req.originalUrl || '/dashboard')}`);
    return;
  }

  res.status(401).json({ error: 'mcp_web_login_required' });
}

function renderLoginPage(error?: string, next = '/dashboard'): string {
  const safeError = error ? `<p style="color:#b91c1c;font-weight:700">${escapeHtml(error)}</p>` : '';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Connexion MCP WealthTech</title>
</head>
<body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f9fafb;margin:0;color:#111827">
  <main style="max-width:540px;margin:10vh auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px">
    <h1>Connexion MCP WealthTech</h1>
    <p>Entre le token MCP pour accéder au tableau de bord.</p>
    ${safeError}
    <form method="post" action="/login">
      <input type="hidden" name="next" value="${escapeHtml(next)}" />
      <label style="display:block;margin:14px 0 6px;font-weight:700">Token MCP</label>
      <input name="token" type="password" autocomplete="current-password" required autofocus style="width:100%;padding:12px;box-sizing:border-box" />
      <button type="submit" style="margin-top:16px;width:100%;padding:12px">Accéder</button>
    </form>
  </main>
</body>
</html>`;
}

function normalizeAccountParam(value: string): string {
  return value.trim().replace(/^@/, '').replace(/[^A-Za-z0-9_.-]/g, '');
}

function nav(): string {
  return `<p>
    <a href="/dashboard">Dashboard</a> ·
    <a href="/git">Paramétrage Git</a> ·
    <a href="/github">GitHub</a> ·
    <a href="/github/status">Statut JSON</a> ·
    <a href="/github/Patricked-code">Patricked-code</a> ·
    <a href="/github/chainsolutions-wealthtech">chainsolutions-wealthtech</a> ·
    <a href="/logout">Déconnexion</a>
  </p>`;
}

async function renderDashboardPage(): Promise<string> {
  const status = await getGithubConnectionStatus();
  const registry = await readGitRegistry();
  const connected = status.connected ? 'connecté' : 'non connecté';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>MCP WealthTech — Dashboard</title>
</head>
<body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:32px;color:#111827;line-height:1.45">
  <h1>MCP WealthTech — Tableau de bord</h1>
  ${nav()}

  <h2>GitHub</h2>
  <p>Connexion : <strong>${escapeHtml(connected)}</strong></p>
  <p>Compte : <strong>${escapeHtml(status.login || 'non détecté')}</strong></p>
  <p>Organisation : <strong>${escapeHtml(status.org || 'non définie')}</strong></p>
  <p>Repos visibles : <strong>${escapeHtml(status.reposVisible ?? 'n/a')}</strong></p>
  <p>Expiration token : <strong>${escapeHtml(status.tokenExpiresAt || 'non communiquée')}</strong></p>

  <h2>MCP</h2>
  <p>Service : <strong>wealthtech_ssh_bridge</strong></p>
  <p>Mode : <strong>${env.ENABLE_WRITE_TOOLS ? 'read-only-plus-scoped-write' : 'read-only-first'}</strong></p>
  <p>GitHub bootstrapped : <strong>${env.MCP_GITHUB_BOOTSTRAPPED ? 'oui' : 'non'}</strong></p>
  <p>Token GitHub : <code>${escapeHtml(status.tokenFile)}</code></p>

  <h2>Registre Git</h2>
  <p>Comptes enregistrés : <strong>${registry.accounts.length}</strong></p>
  <p>Mappings repo ↔ serveur : <strong>${registry.repoMappings.length}</strong></p>
  <p>Dernière mise à jour : <strong>${escapeHtml(registry.updatedAt)}</strong></p>
  <p><a href="/git/status">Voir JSON</a></p>
</body>
</html>`;
}

function addGithubNav(html: string): string {
  return html.replace(
    '<h1>WealthTech MCP — Connexion GitHub</h1>',
    `<h1>WealthTech MCP — Connexion GitHub</h1>${nav()}`
  );
}

function renderAccountPage(account: string, githubPageHtml: string): string {
  return githubPageHtml.replace(
    '<h1>WealthTech MCP — Connexion GitHub</h1>',
    `<h1>WealthTech MCP — Compte GitHub ${escapeHtml(account)}</h1>${nav()}`
  );
}

export function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: 'wealthtech_ssh_bridge',
    version: '0.1.0'
  });

  registerReadOnlyTools(server);
  if (env.ENABLE_WRITE_TOOLS) {
    registerScopedWriteTools(server);
  }

  return server;
}

export async function startHttpServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));

  registerOauthRoutes(app, {
    isAuthenticated: isWebAuthenticated
  });

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'wealthtech_ssh_bridge',
      mode: env.ENABLE_WRITE_TOOLS ? 'read-only-plus-scoped-write' : 'read-only-first',
      writeToolsEnabled: env.ENABLE_WRITE_TOOLS,
      githubBootstrapped: env.MCP_GITHUB_BOOTSTRAPPED,
      githubOrg: env.GITHUB_ORG || null
    });
  });

  app.get('/', (_req, res) => {
    res.redirect('/dashboard');
  });

  app.get('/login', (req, res) => {
    const next = typeof req.query.next === 'string' ? req.query.next : '/dashboard';
    res.type('html').send(renderLoginPage(undefined, next));
  });

  app.post('/login', (req, res) => {
    const token = typeof req.body.token === 'string' ? req.body.token : '';
    const next = typeof req.body.next === 'string' && req.body.next.startsWith('/') ? req.body.next : '/dashboard';

    if (!tokenMatches(token)) {
      res.status(401).type('html').send(renderLoginPage('Token MCP invalide.', next));
      return;
    }

    res.setHeader('Set-Cookie', createWebSessionCookie());
    res.redirect(next);
  });

  app.get('/logout', (_req, res) => {
```

## FILE: src/index.ts
```
import { startHttpServer } from './server.js';
import { logger } from './logger.js';

startHttpServer().catch((error) => {
  logger.fatal({ error }, 'Impossible de démarrer wealthtech_ssh_bridge');
});
```

## FILE: src/tools/readOnly.ts
```
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { managedServers, type ServerId } from '../config/servers.js';
import { runReadOnlyCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';

async function run(serverId: ServerId, command: string) {
  const result = await runReadOnlyCommand(serverId, command);
  return asText(commandResultToText(result));
}

export function registerReadOnlyTools(server: McpServer): void {
  server.tool('ping', 'Vérifie que le MCP WealthTech SSH Bridge répond.', {}, async () => asText('wealthtech_ssh_bridge_ok'));

  server.tool('get_project_context', 'Retourne le contexte projet, les serveurs et les domaines protégés.', {}, async () => asText(JSON.stringify({
    name: 'wealthtech_ssh_bridge',
    mode: 'read-only-first',
    servers: managedServers
  }, null, 2)));

  server.tool('check_disk_s1', 'Affiche df -h sur S1.', {}, async () => run('s1', 'df -h'));
  server.tool('check_disk_s2', 'Affiche df -h sur S2.', {}, async () => run('s2', 'df -h'));

  server.tool('pm2_status_s1', 'Affiche pm2 list sur S1.', {}, async () => run('s1', 'pm2 list'));
  server.tool('pm2_status_s2', 'Affiche pm2 list sur S2.', {}, async () => run('s2', 'pm2 list'));

  server.tool('docker_status_s1', 'Liste les conteneurs Docker actifs sur S1.', {}, async () => run('s1', 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'));
  server.tool('docker_status_s2', 'Liste les conteneurs Docker actifs sur S2.', {}, async () => run('s2', 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'));

  server.tool('list_domains_s1', 'Inventaire read-only des domaines Plesk/vhosts S1.', {}, async () => run('s1', 'find /var/www/vhosts -maxdepth 2 -type d -printf "%TY-%Tm-%Td %TH:%TM %p\\n" 2>/dev/null | sort | head -300'));
  server.tool('list_domains_s2', 'Inventaire read-only des domaines Plesk/vhosts S2.', {}, async () => run('s2', 'find /var/www/vhosts -maxdepth 2 -type d -printf "%TY-%Tm-%Td %TH:%TM %p\\n" 2>/dev/null | sort | head -300'));

  server.tool('list_large_files_s1', 'Liste les fichiers volumineux sur S1 sans suppression.', {}, async () => run('s1', 'find /var/www/vhosts /var/lib/psa/dumps -type f -size +100M -printf "%s %TY-%Tm-%Td %p\\n" 2>/dev/null | sort -nr | head -200'));
  server.tool('list_large_files_s2', 'Liste les fichiers volumineux sur S2 sans suppression.', {}, async () => run('s2', 'find /var/www/vhosts /var/lib/psa/dumps -type f -size +100M -printf "%s %TY-%Tm-%Td %p\\n" 2>/dev/null | sort -nr | head -200'));

  server.tool('list_backups_s1', 'Liste les sauvegardes potentielles sur S1 sans suppression.', {}, async () => run('s1', 'find /var/lib/psa/dumps /var/www/vhosts -type f \( -name "*.zip" -o -name "*.tar" -o -name "*.tar.gz" -o -name "*.tgz" -o -name "*.gz" -o -name "*.bak" -o -name "*.old" -o -name "*.sql" -o -name "*.dump" \) -printf "%s %TY-%Tm-%Td %p\\n" 2>/dev/null | sort -nr | head -200'));
  server.tool('list_backups_s2', 'Liste les sauvegardes potentielles sur S2 sans suppression.', {}, async () => run('s2', 'find /var/lib/psa/dumps /var/www/vhosts -type f \( -name "*.zip" -o -name "*.tar" -o -name "*.tar.gz" -o -name "*.tgz" -o -name "*.gz" -o -name "*.bak" -o -name "*.old" -o -name "*.sql" -o -name "*.dump" \) -printf "%s %TY-%Tm-%Td %p\\n" 2>/dev/null | sort -nr | head -200'));

  server.tool('curl_domain', 'Exécute un curl -I HTTPS sur un domaine fourni depuis S1.', { domain: z.string().min(3).max(255).regex(/^[a-zA-Z0-9.-]+$/) }, async ({ domain }) => run('s1', `curl -I --max-time 15 https://${domain}`));
}
```

## FILE: src/tools/writeScoped.ts
```
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from '../config/env.js';
import { runGuardedCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';
import {
  assertScopedWriteToolsEnabled,
  assertSelectOnlyQuery,
  assertSafeScriptArgs,
  assertWriteFlag,
  scriptArgsRequireWriteApproval
} from '../ssh/writeSafety.js';

const ProjectKeySchema = z.enum(['api_opcv', 'front_end_opcvm', 'brvmchainsolution']);
type ProjectKey = z.infer<typeof ProjectKeySchema>;

const AllowedScriptSchema = z.string()
  .regex(/^scripts\/[A-Za-z0-9_./-]+\.(js|ts)$/, 'Script autorisé uniquement sous scripts/ avec extension .js ou .ts')
  .refine((value) => !value.includes('..') && !value.startsWith('/'), 'Script path interdit hors dépôt');

type AllowedScript = z.infer<typeof AllowedScriptSchema>;

const projects: Record<ProjectKey, { label: string; path: string; note: string }> = {
  api_opcv: {
    label: 'API OPCVM / FundAfrica',
    path: '/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/api',
    note: 'Backend OPCVM autorisé pour diagnostics, scripts whitelistés et mise à jour Git contrôlée.'
  },
  front_end_opcvm: {
    label: 'Frontend OPCVM / FundAfrica',
    path: '/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/frontend',
    note: 'Frontend OPCVM autorisé pour statut Git, pull contrôlé et build contrôlé.'
  },
  brvmchainsolution: {
    label: 'BRVM Chain Solution',
    path: '/opt/apps/brvmchain/BRVMCHAINSOLUTION',
    note: 'Projet BRVM autorisé pour statut Git, pull contrôlé et déploiement Docker Compose contrôlé.'
  }
};


function inferScriptProject(script: AllowedScript): ProjectKey {
  if (
    script.includes('repair-ost') ||
    script.includes('align-dividend-years') ||
    script.includes('repair-dividends')
  ) {
    return 'brvmchainsolution';
  }

  return 'api_opcv';
}


const scriptsRequiringWriteApproval = new Set<AllowedScript>([
  'scripts/scraper/fix_index_tail.js',
  'scripts/scraper/propagate_indref_range.js',
  'scripts/scraper/scrape_indices_daily.js',
  'scripts/recalc/recalc_eur_usd_daily_rate.js',
  'scripts/repair-ost.ts',
  'scripts/align-dividend-years.ts',
  'scripts/repair-dividends.ts'
]);

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function projectFor(project: ProjectKey) {
  return projects[project];
}

function formatProjectCatalog(): string {
  return Object.entries(projects)
    .map(([key, value]) => `${key}: ${value.label}\n  path: ${value.path}\n  note: ${value.note}`)
    .join('\n\n');
}

async function runS2(command: string, intent: string, timeoutMs = 30_000) {
  const result = await runGuardedCommand('s2', command, {
    intent,
    timeoutMs,
    maxOutputBytes: 200_000
  });
  return asText(commandResultToText(result));
}

function buildGitStatusCommand(project: ProjectKey): string {
  const config = projectFor(project);
  return `set -euo pipefail
cd ${shellQuote(config.path)}
printf 'Projet: ${config.label}\nChemin: ${config.path}\n\n'
test -d .git
git status -sb
echo
echo 'Branche courante:'
git branch --show-current
echo
echo 'Dernier commit:'
git log -1 --oneline
echo
echo 'Remote:'
git remote -v`;
}

function buildGitPullCommand(project: ProjectKey): string {
  const config = projectFor(project);
  return `set -euo pipefail
cd ${shellQuote(config.path)}
mkdir -p .mcp_logs
LOG_FILE=".mcp_logs/mcp-autonomy-$(date +%Y%m%d).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "════════════════════════════════════════"
echo "MCP AUTONOMY — GIT UPDATE"
echo "Projet: ${config.label}"
echo "Chemin: ${config.path}"
echo "Date: $(date -Is)"
echo "════════════════════════════════════════"

test -d .git
git status -sb

CURRENT_BRANCH="$(git branch --show-current)"
echo "Branche courante: $CURRENT_BRANCH"

case "$CURRENT_BRANCH" in
  claude/*|main|master|server|production)
    echo "Branche autorisée: $CURRENT_BRANCH"
    ;;
  *)
    echo "ERREUR: branche non autorisée pour autonomie MCP: $CURRENT_BRANCH"
    exit 13
    ;;
esac

STASH_CREATED=0
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Changements suivis détectés: stash automatique avant rebase."
  git stash push -m "mcp-autostash-${config.label}-$(date +%Y%m%d_%H%M%S)"
  STASH_CREATED=1
else
  echo "Aucun changement suivi local à stasher."
fi

git fetch origin --prune
git pull --rebase origin "$CURRENT_BRANCH"

if [ "$STASH_CREATED" = "1" ]; then
  echo "Restauration du stash MCP."
  git stash pop || {
    echo "ERREUR: conflit pendant stash pop. Intervention nécessaire."
    git status -sb
    exit 14
  }
fi

echo
echo "Nouveau dernier commit:"
git log -1 --oneline

echo
echo "État Git final:"
git status -sb`;
}

function buildDeployCommand(project: ProjectKey): string {
  const config = projectFor(project);
  const common = buildGitPullCommand(project);

  if (project === 'brvmchainsolution') {
    return `${common}
echo
echo 'Déploiement BRVM contrôlé'
if [ -f package.json ]; then
  npm install
  npm run build --if-present
fi
if [ -f docker-compose.yml ] || [ -f compose.yml ]; then
  docker compose up -d --build
else
  echo 'Aucun fichier compose détecté: étape Docker ignorée.'
fi
echo
echo 'Conteneurs Docker:'
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo
echo 'Health public BRVM:'
curl -I --max-time 20 https://brvm.chainsolutions.fr/ || true`;
  }

  if (project === 'api_opcv') {
    return `${common}
echo
echo 'Déploiement API OPCVM contrôlé'
if [ -f package.json ]; then
  npm install --omit=dev
  npm run build --if-present
fi
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe api-monolith >/dev/null 2>&1; then
    pm2 restart api-monolith --update-env
  else
    echo 'Aucun process PM2 api-monolith trouvé: redémarrage PM2 ignoré.'
    pm2 list || true
  fi
else
  echo 'PM2 non disponible: redémarrage applicatif ignoré.'
fi`;
  }

  return `${common}
echo
echo 'Déploiement Frontend OPCVM contrôlé'
if [ -f package.json ]; then
  npm install
  npm run build --if-present
else
  echo 'Aucun package.json détecté: build ignoré.'
fi
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe fundafrique-frontend >/dev/null 2>&1; then
    pm2 restart fundafrique-frontend --update-env
  else
    echo 'Aucun process PM2 fundafrique-frontend trouvé: redémarrage PM2 ignoré.'
    pm2 list || true
  fi
else
  echo 'PM2 non disponible: redémarrage frontend ignoré.'
fi`;
}

export function registerScopedWriteTools(server: McpServer): void {
  server.tool('get_write_tools_context', 'Liste les projets et opérations d’écriture contrôlées disponibles. Aucun secret n’est exposé.', {}, async () => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    return asText(JSON.stringify({
      mode: 'scoped-write-tools',
      free_shell: false,
      run_command_s1: false,
      run_command_s2: false,
      sql: 'SELECT uniquement',
      projects: formatProjectCatalog()
    }, null, 2));
  });

  server.tool('run_sql_readonly_s2', 'Exécute une requête SQL SELECT uniquement sur la base OPCVM S2.', {
    query: z.string().min(8).max(20_000)
  }, async ({ query }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    assertSelectOnlyQuery(query);
    const command = `set -euo pipefail
mysql -N -B ${shellQuote(env.OPCVM_DB_NAME)} -e ${shellQuote(query.trim())}`;
    return runS2(command, 'run_sql_readonly_s2', 30_000);
  });

  server.tool('exec_repo_script_s2', 'Exécute uniquement un script autorisé du dépôt API OPCVM sur S2.', {
    script: AllowedScriptSchema,
    args: z.array(z.string()).default([])
  }, async ({ script, args }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
```

## FILE: src/tools/format.ts
```
import type { CommandResult } from '../ssh/client.js';

export function asText(content: string) {
  return { content: [{ type: 'text' as const, text: content }] };
}

export function commandResultToText(result: CommandResult): string {
  const output = result.stdout || '(vide)';
  const errors = result.stderr || '(vide)';
  return `Serveur: ${result.server}\nCommande: ${result.command}\nCode: ${result.code ?? 'unknown'}\n\nSortie standard:\n${output}\n\nSortie erreur:\n${errors}`;
}
```

## FILE: src/config/env.ts
```
import 'dotenv/config';
import { z } from 'zod';

const EnvBooleanSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  return false;
}, z.boolean());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  MCP_AUTH_TOKEN: z.string().min(24, 'MCP_AUTH_TOKEN doit être long et aléatoire en production'),
  LOG_LEVEL: z.string().default('info'),
  S1_HOST: z.string().min(1),
  S1_PORT: z.coerce.number().int().positive().default(22),
  S1_USER: z.string().min(1).default('root'),
  S1_KEY_PATH: z.string().min(1),
  S2_HOST: z.string().min(1),
  S2_PORT: z.coerce.number().int().positive().default(22),
  S2_USER: z.string().min(1).default('root'),
  S2_KEY_PATH: z.string().min(1),
  PROTECTED_MODE: z.string().default('read_only_first'),
  ENABLE_WRITE_TOOLS: EnvBooleanSchema.default(false),
  OPCVM_DB_NAME: z.string().min(1).default('fund_opcvm'),
  GITHUB_ORG: z.string().default(''),
  GITHUB_TOKEN_FILE: z.string().default(''),
  GITHUB_API_BASE: z.string().url().default('https://api.github.com'),
  MCP_GITHUB_BOOTSTRAPPED: EnvBooleanSchema.default(false)
});

export const env = EnvSchema.parse(process.env);
```

## FILE: src/config/servers.ts
```
import { env } from './env.js';

export type ServerId = 's1' | 's2';

export interface ManagedServerConfig {
  id: ServerId;
  label: string;
  host: string;
  port: number;
  username: string;
  privateKeyPath: string;
  protectedDomains: string[];
}

export const managedServers: Record<ServerId, ManagedServerConfig> = {
  s1: {
    id: 's1',
    label: 'S1 - serveur principal / destination',
    host: env.S1_HOST,
    port: env.S1_PORT,
    username: env.S1_USER,
    privateKeyPath: env.S1_KEY_PATH,
    protectedDomains: [
      'niakara.com',
      'www.niakara.com',
      'api.niakara.com',
      'wealthtechinnovations.com',
      'api.wealthtechinnovations.com',
      'stablecoin.wealthtechinnovations.com',
      'api.stablecoin.wealthtechinnovations.com',
      'blockchain.wealthtechinnovations.com',
      'tokenfactory.wealthtechinnovations.com',
      'wealthtechinnovation.com',
      'berebytours.com'
    ]
  },
  s2: {
    id: 's2',
    label: 'S2 - serveur source / migration / nettoyage sélectif',
    host: env.S2_HOST,
    port: env.S2_PORT,
    username: env.S2_USER,
    privateKeyPath: env.S2_KEY_PATH,
    protectedDomains: [
      'africafunds.chainsolutions.fr',
      'api.africafunds.chainsolutions.fr',
      'api.stablecoin.chainsolutions.fr',
      'stablecoin.chainsolutions.fr',
      'brvm.chainsolutions.fr',
      'bvmac.chainsolutions.fr',
      'chainsolutions.fr',
      'Funds.chainsolutions.fr',
      'api.funds.chainsolutions.fr'
    ]
  }
};
```

## FILE: src/ssh/client.ts
```
import { Client } from 'ssh2';
import { readFileSync } from 'node:fs';
import { managedServers, type ServerId } from '../config/servers.js';
import { logger } from '../logger.js';
import { assertReadOnlyCommand } from './safety.js';
import { assertNoCatastrophicCommand } from './writeSafety.js';

export interface CommandResult {
  server: ServerId;
  command: string;
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface GuardedCommandOptions {
  timeoutMs?: number;
  maxOutputBytes?: number;
  intent?: string;
}

function appendLimited(current: string, data: Buffer, maxOutputBytes: number): string {
  if (Buffer.byteLength(current, 'utf8') >= maxOutputBytes) {
    return current;
  }
  const next = current + data.toString('utf8');
  if (Buffer.byteLength(next, 'utf8') <= maxOutputBytes) {
    return next;
  }
  return `${next.slice(0, maxOutputBytes)}\n...[sortie plafonnée par le MCP]`;
}

async function runCommand(serverId: ServerId, command: string, options: GuardedCommandOptions = {}): Promise<CommandResult> {
  const server = managedServers[serverId];
  const timeoutMs = options.timeoutMs ?? 30_000;
  const maxOutputBytes = options.maxOutputBytes ?? 200_000;
  logger.info({ serverId, command, intent: options.intent ?? 'unspecified', timeoutMs }, 'Exécution SSH demandée');

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      conn.end();
      reject(new Error(`Timeout SSH après ${timeoutMs} ms`));
    }, timeoutMs);

    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      conn.end();
      reject(error);
    };

    conn
      .on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            fail(err);
            return;
          }

          stream
            .on('close', (code: number | null) => {
              if (settled) {
                return;
              }
              settled = true;
              clearTimeout(timeout);
              conn.end();
              resolve({ server: serverId, command, stdout, stderr, code });
            })
            .on('data', (data: Buffer) => {
              stdout = appendLimited(stdout, data, maxOutputBytes);
            });

          stream.stderr.on('data', (data: Buffer) => {
            stderr = appendLimited(stderr, data, maxOutputBytes);
          });
        });
      })
      .on('error', fail)
      .connect({
        host: server.host,
        port: server.port,
        username: server.username,
        privateKey: readFileSync(server.privateKeyPath)
      });
  });
}

export async function runReadOnlyCommand(serverId: ServerId, command: string): Promise<CommandResult> {
  assertReadOnlyCommand(command);
  return runCommand(serverId, command, { intent: 'read_only', timeoutMs: 30_000, maxOutputBytes: 200_000 });
}

export async function runGuardedCommand(serverId: ServerId, command: string, options: GuardedCommandOptions = {}): Promise<CommandResult> {
  assertNoCatastrophicCommand(command);
  return runCommand(serverId, command, options);
}
```

## FILE: src/ssh/safety.ts
```
export const blockedCommandFragments = [
  'rm -rf /',
  'rm -rf /*',
  'mkfs',
  'dd if=',
  ':(){',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'chmod -R 777 /',
  'chown -R',
  '>/dev/sda',
  'wipefs'
];

export function assertReadOnlyCommand(command: string): void {
  const normalized = command.trim().toLowerCase();
  for (const fragment of blockedCommandFragments) {
    if (normalized.includes(fragment.toLowerCase())) {
      throw new Error(`Commande bloquée par la politique de sécurité: ${fragment}`);
    }
  }

  const writeLike = [' rm ', ' rm\t', 'mv ', 'cp ', 'truncate ', 'sed -i', 'tee ', 'echo ', 'cat >', 'mysql ', 'psql ', 'systemctl restart', 'pm2 restart', 'pm2 stop', 'docker compose down', 'docker stop'];
  for (const fragment of writeLike) {
    if (` ${normalized}`.includes(fragment)) {
      throw new Error(`Commande non read-only bloquée: ${fragment.trim()}`);
    }
  }
}
```

## FILE: src/ssh/writeSafety.ts
```
const catastrophicCommandPatterns = [
  /\brm\s+-[^\n;&|]*[rf][^\n;&|]*\s+\/(?:\s|$)/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bhalt\b/i,
  /\bpoweroff\b/i,
  /\bwipefs\b/i,
  /\bdocker\s+volume\s+(rm|prune)\b/i,
  /\bdocker\s+(compose|system)\b[^\n]*(--volumes|-v)\b/i,
  /\bdrop\s+(database|table)\b/i,
  /\btruncate\s+table\b/i,
  /\bdelete\s+from\b/i,
  /\bgrant\s+all\b/i,
  /\brevoke\s+all\b/i,
  /\balter\s+user\b/i
];

const forbiddenSqlKeywords = /\b(insert|update|delete|drop|truncate|alter|grant|revoke|create|replace|merge|call|execute|load|outfile|infile)\b/i;
const forbiddenSqlSyntax = /(;|--|\/\*|\*\/|#)/;

const forbiddenArgCharacters = /[;&|`$()<>]/;
const forbiddenArgWords = /\b(rm|mv|scp|ssh|sudo|su|curl|wget|bash|sh|python|perl|nc|mkfs|dd)\b/i;

const allowedScriptArgPatterns = [
  /^--since=\d{4}-\d{2}-\d{2}$/,
  /^--until=\d{4}-\d{2}-\d{2}$/,
  /^--seuil=\d+(?:\.\d+)?$/,
  /^--indice=[A-Z]+$/,
  /^--pays=[A-Za-zÀ-ÿ '\-]+$/,
  /^--fond=\d+$/,
  /^--execute$/,
  /^--dry-run$/,
  /^(backup|state|rollback)$/,
  /^\d+$/
];

export function assertNoCatastrophicCommand(command: string): void {
  for (const pattern of catastrophicCommandPatterns) {
    if (pattern.test(command)) {
      throw new Error('Commande bloquée par la politique de sécurité MCP.');
    }
  }
}

export function assertScopedWriteToolsEnabled(enabled: boolean): void {
  if (!enabled) {
    throw new Error('Outils d’écriture désactivés. Activer ENABLE_WRITE_TOOLS=true côté serveur après validation explicite.');
  }
}

export function assertWriteFlag(allowWrite: boolean, operation: string): void {
  if (!allowWrite) {
    throw new Error(`Écriture refusée pour ${operation}. Relancer l’outil avec allow_write=true après validation explicite.`);
  }
}

export function assertSelectOnlyQuery(query: string): void {
  const trimmed = query.trim();
  if (!/^select\s/i.test(trimmed)) {
    throw new Error('SQL refusé: seules les requêtes SELECT sont autorisées.');
  }
  if (forbiddenSqlSyntax.test(trimmed)) {
    throw new Error('SQL refusé: séparateurs, commentaires et requêtes multiples interdits.');
  }
  if (forbiddenSqlKeywords.test(trimmed)) {
    throw new Error('SQL refusé: mot-clé d’écriture ou d’administration détecté.');
  }
}

export function assertSafeScriptArgs(args: string[]): void {
  for (const arg of args) {
    if (arg.length === 0 || arg.length > 120) {
      throw new Error(`Argument refusé: longueur invalide (${arg}).`);
    }
    if (forbiddenArgCharacters.test(arg) || forbiddenArgWords.test(arg)) {
      throw new Error(`Argument refusé: caractère ou mot dangereux détecté (${arg}).`);
    }
    if (!allowedScriptArgPatterns.some((pattern) => pattern.test(arg))) {
      throw new Error(`Argument refusé par la liste blanche: ${arg}`);
    }
  }
}

export function scriptArgsRequireWriteApproval(args: string[]): boolean {
  return args.some((arg) => arg === '--execute' || arg === 'rollback' || arg === 'backup');
}
```

## FILE: src/github/connection.ts
```
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
```

## FILE: src/github/registry.ts
```
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
```

## FILE: src/auth.ts
```
import type { Request, Response, NextFunction } from 'express';
import { env } from './config/env.js';
import { oauthChallengeHeader, verifyOauthAccessToken } from './oauth.js';

function extractBearerToken(header: string): string | null {
  const prefix = 'Bearer ';

  if (!header.startsWith(prefix)) {
    return null;
  }

  const token = header.slice(prefix.length).trim();
  return token.length > 0 ? token : null;
}

export function requireBearerToken(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.header('authorization') ?? '');

  if (token === env.MCP_AUTH_TOKEN) {
    next();
    return;
  }

  if (token !== null && verifyOauthAccessToken(token, 'mcp:read')) {
    next();
    return;
  }

  res.setHeader('WWW-Authenticate', oauthChallengeHeader('mcp:read'));
  res.status(401).json({ error: 'unauthorized' });
}
```

## FILE: src/oauth.ts
```
import type { Express, Request, Response } from 'express';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from './config/env.js';
import { logger } from './logger.js';

const DEFAULT_ISSUER = 'https://mcp.wealthtechinnovations.com';
const ACCESS_TOKEN_TTL_SECONDS = Math.max(
  300,
  Number.parseInt(process.env.MCP_OAUTH_ACCESS_TOKEN_TTL_SECONDS || '3600', 10)
);
const AUTHORIZATION_CODE_TTL_MS = Math.max(
  60,
  Number.parseInt(process.env.MCP_OAUTH_CODE_TTL_SECONDS || '300', 10)
) * 1000;

const SUPPORTED_SCOPES = ['mcp:read', 'mcp:write'] as const;

type SupportedScope = typeof SUPPORTED_SCOPES[number];

type AuthorizationCodeRecord = {
  clientId: string;
  redirectUri: string;
  scope: string;
  resource: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  expiresAt: number;
  subject: string;
};

type OAuthTokenPayload = {
  typ: 'wealthtech-mcp-oauth';
  iss: string;
  aud: string;
  resource: string;
  sub: string;
  client_id: string;
  scope: string;
  iat: number;
  exp: number;
  jti: string;
};

type RegisterOAuthRoutesOptions = {
  isAuthenticated: (req: Request) => boolean;
};

const authorizationCodes = new Map<string, AuthorizationCodeRecord>();

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function oauthIssuer(): string {
  return normalizeBaseUrl(process.env.MCP_WEB_BASE_URL || DEFAULT_ISSUER);
}

export function protectedResourceMetadataUrl(): string {
  return `${oauthIssuer()}/.well-known/oauth-protected-resource`;
}

export function oauthChallengeHeader(scope = 'mcp:read'): string {
  return `Bearer ***MASKED***"${protectedResourceMetadataUrl()}", scope="${scope}"`;
}

function oauthSecret(): string {
  return env.MCP_AUTH_TOKEN;
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replaceAll('=', '')
    .replaceAll('+', '-')
    .replaceAll('/', '_');
}

function base64UrlJson(value: unknown): string {
  return base64Url(JSON.stringify(value));
}

function base64UrlToBuffer(value: string): Buffer {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

function hmac(input: string): string {
  return base64Url(createHmac('sha256', oauthSecret()).update(input).digest());
}

function safeEqualString(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function getSingleQueryParam(req: Request, name: string): string | undefined {
  const value = req.query[name];

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
}

function getSingleBodyParam(req: Request, name: string): string | undefined {
  const body = req.body as Record<string, unknown> | undefined;
  const value = body?.[name];

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
}

function isHttpsOrLocalUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function normalizeScopeString(rawScope: string | undefined): string {
  const requested = (rawScope || 'mcp:read')
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter((scope): scope is SupportedScope => SUPPORTED_SCOPES.includes(scope as SupportedScope));

  const scopes = new Set<SupportedScope>(requested.length > 0 ? requested : ['mcp:read']);

  if (scopes.has('mcp:write')) {
    scopes.add('mcp:read');
  }

  return [...scopes].join(' ');
}

function buildAuthorizationServerMetadata() {
  const issuer = oauthIssuer();

  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: SUPPORTED_SCOPES,
    client_id_metadata_document_supported: true
  };
}

function buildProtectedResourceMetadata() {
  const issuer = oauthIssuer();

  return {
    resource: issuer,
    authorization_servers: [issuer],
    scopes_supported: SUPPORTED_SCOPES,
    bearer_methods_supported: ['header'],
    resource_documentation: `${issuer}/dashboard`
  };
}

function pruneExpiredAuthorizationCodes(): void {
  const now = Date.now();

  for (const [code, record] of authorizationCodes) {
    if (record.expiresAt <= now) {
      authorizationCodes.delete(code);
    }
  }
}

function issueAuthorizationCode(record: AuthorizationCodeRecord): string {
  pruneExpiredAuthorizationCodes();

  const code = base64Url(randomBytes(32));
  authorizationCodes.set(code, record);

  return code;
}

function signAccessToken(payload: OAuthTokenPayload): string {
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const body = base64UrlJson(payload);
  const signingInput = `${header}.${body}`;
  const signature = hmac(signingInput);

  return `${signingInput}.${signature}`;
}

function parseAccessToken(token: string): OAuthTokenPayload | null {
  const [header, body, signature] = token.split('.');

  if (!header || !body || !signature) {
    return null;
  }

  const signingInput = `${header}.${body}`;
  const expectedSignature = hmac(signingInput);

  if (!safeEqualString(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlToBuffer(body).toString('utf8')) as Partial<OAuthTokenPayload>;

    if (
      payload.typ !== 'wealthtech-mcp-oauth' ||
      typeof payload.iss !== 'string' ||
      typeof payload.aud !== 'string' ||
      typeof payload.resource !== 'string' ||
      typeof payload.sub !== 'string' ||
      typeof payload.client_id !== 'string' ||
      typeof payload.scope !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number' ||
      typeof payload.jti !== 'string'
    ) {
      return null;
    }

    return payload as OAuthTokenPayload;
  } catch {
    return null;
  }
}

export function verifyOauthAccessToken(token: string, requiredScope = 'mcp:read'): boolean {
  const payload = parseAccessToken(token);
  const issuer = oauthIssuer();
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!payload) {
    return false;
  }

  if (payload.iss !== issuer || payload.aud !== issuer || payload.resource !== issuer) {
    return false;
  }

  if (payload.exp <= nowSeconds || payload.iat > nowSeconds + 60) {
    return false;
```

## FILE: src/logger.ts
```
import pino from 'pino';
import { env } from './config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'authorization', '*.privateKey', '*.password', '*.token'],
    censor: '[REDACTED]'
  },
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined
});
```

## FILE: package.json
```
{
  "name": "wealthtech-mcp-ssh-bridge",
  "version": "0.1.0",
  "description": "MCP SSH Bridge sécurisé pour piloter les serveurs WealthTech S1/S2 avec des outils contrôlés, journalisés et documentés.",
  "type": "module",
  "private": false,
  "license": "UNLICENSED",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint:secrets": "node scripts/check-no-secrets.mjs",
    "docs:check": "node scripts/check-docs.mjs"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "dotenv": "latest",
    "express": "latest",
    "pino": "latest",
    "pino-pretty": "latest",
    "ssh2": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@types/express": "latest",
    "@types/node": "latest",
    "@types/ssh2": "latest",
    "tsx": "latest",
    "typescript": "latest"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## FILE: tsconfig.json
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  },
  "include": ["src/**/*.ts", "scripts/**/*.mjs"],
  "exclude": ["node_modules", "dist"]
}
```

## FILE: Dockerfile
```
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "dist/src/index.js"]
```

## FILE: docker-compose.yml
```
services:
  wealthtech-mcp-ssh-bridge:
    build: .
    container_name: wealthtech_mcp_ssh_bridge
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "127.0.0.1:8787:8787"
    volumes:
      - ./keys:/app/keys:ro
      - ./logs:/app/logs
```

## FILE: data/github-accounts.json
```
{
  "version": 1,
  "defaultTargetOwner": "chainsolutions-wealthtech",
  "accounts": [
    {
      "owner": "chainsolutions-wealthtech",
      "type": "organization",
      "role": "target",
      "tokenFile": "/app/secrets/github_token",
      "status": "active"
    },
    {
      "owner": "Patricked-code",
      "type": "user",
      "role": "source",
      "tokenFile": "/app/secrets/github_token",
      "status": "active"
    },
    {
      "owner": "Wealthtechinnovations",
      "type": "organization_or_user",
      "role": "source_or_secondary_target",
      "tokenFile": "/app/secrets/github_token_wealthtechinnovations",
      "status": "pending_s2_token_sync"
    }
  ]
}
```

## FILE: data/mcp-git-registry.json
```
{
  "version": 1,
  "updatedAt": "2026-07-08T04:55:00.000Z",
  "accounts": [
    {
      "id": "github:org:chainsolutions-wealthtech",
      "provider": "github",
      "owner": "chainsolutions-wealthtech",
      "account": "chainsolutions-wealthtech",
      "type": "organization",
      "authMode": "pat",
      "role": "target",
      "tokenFile": "/app/secrets/github_token",
      "canCreateRepos": true,
      "canWriteRepos": true,
      "canOpenPullRequests": true,
      "status": "active",
      "notes": "Organisation cible principale du MCP. Tous les nouveaux repos doivent être créés ici."
    },
    {
      "id": "github:user:Patricked-code",
      "provider": "github",
      "owner": "Patricked-code",
      "account": "Patricked-code",
      "type": "user",
      "authMode": "pat",
      "role": "source",
      "tokenFile": "/app/secrets/github_token",
      "canCreateRepos": true,
      "canWriteRepos": true,
      "canOpenPullRequests": true,
      "status": "active",
      "notes": "Compte source actuel contenant MCP, api, Front, Stablecoin, Investbourse et autres repos."
    },
    {
      "id": "github:owner:Wealthtechinnovations",
      "provider": "github",
      "owner": "Wealthtechinnovations",
      "account": "Wealthtechinnovations",
      "type": "organization_or_user",
      "authMode": "pat",
      "role": "source_or_secondary_target",
      "tokenFile": "/app/secrets/github_token_wealthtechinnovations",
      "canCreateRepos": true,
      "canWriteRepos": true,
      "canOpenPullRequests": true,
      "status": "pending_s2_token_sync",
      "notes": "Compte à connecter via le token présent sur S2."
    }
  ],
  "repoMappings": [
    {
      "sourceRepo": "Patricked-code/MCP",
      "targetRepo": "chainsolutions-wealthtech/MCP",
      "serverPath": "/opt/apps/wealthtech-mcp-ssh-bridge",
      "status": "to_migrate_or_mirror",
      "priority": "high"
    },
    {
      "sourceRepo": "chainsolutions-wealthtech/.github",
      "targetRepo": "chainsolutions-wealthtech/.github",
      "serverPath": null,
      "status": "governance_repo",
      "priority": "high"
    },
    {
      "sourceRepo": "Patricked-code/api",
      "targetRepo": "chainsolutions-wealthtech/api",
      "serverPath": null,
      "status": "to_migrate_or_mirror",
      "priority": "medium"
    },
    {
      "sourceRepo": "Patricked-code/Front",
      "targetRepo": "chainsolutions-wealthtech/Front",
      "serverPath": null,
      "status": "to_migrate_or_mirror",
      "priority": "medium"
    },
    {
      "sourceRepo": "Patricked-code/Stablecoin",
      "targetRepo": "chainsolutions-wealthtech/Stablecoin",
      "serverPath": null,
      "status": "to_migrate_or_mirror",
      "priority": "medium"
    },
    {
      "sourceRepo": "Patricked-code/Investbourse",
      "targetRepo": "chainsolutions-wealthtech/Investbourse",
      "serverPath": null,
      "status": "to_migrate_or_mirror",
      "priority": "medium"
    },
    {
      "sourceRepo": "Patricked-code/civitech-commune-saas",
      "targetRepo": "chainsolutions-wealthtech/civitech-commune-saas",
      "serverPath": "/var/www/vhosts/niakara.com/repo/civitech-commune-saas",
      "status": "to_migrate_or_mirror",
      "priority": "medium"
    }
  ],
  "auditEvents": [
    {
      "at": "2026-07-08T04:55:00.000Z",
      "event": "target_org_configured",
      "owner": "chainsolutions-wealthtech",
      "details": "chainsolutions-wealthtech configured as default MCP GitHub target organization."
    }
  ]
}
```

## FILE: .mcp/permissions.json
```
{
  "schemaVersion": 1,
  "writePolicy": {
    "directMainPush": false,
    "branchRequired": true,
    "pullRequestRequired": true,
    "secretReadingForbidden": true
  },
  "allowedBranchPrefixes": [
    "chatgpt/",
    "claude/",
    "codex/",
    "agent/",
    "mcp/"
  ],
  "forbiddenPaths": [
    ".env",
    ".env.*",
    "secrets/",
    "keys/",
    "logs/",
    "*.pem",
    "*.key",
    "*.p12",
    "*.dump",
    "*.sql"
  ]
}
```

## FILE: .mcp/server-map.json
```
{
  "schemaVersion": 1,
  "servers": {
    "S1": {
      "role": "mcp_host_and_destination",
      "mainPath": "/opt/apps/wealthtech-mcp-ssh-bridge",
      "mcpDomain": "https://mcp.wealthtechinnovations.com"
    },
    "S2": {
      "role": "source_migration_server",
      "protectedApplications": [
        "africafunds.chainsolutions.fr",
        "api.africafunds.chainsolutions.fr",
        "api.stablecoin.chainsolutions.fr",
        "stablecoin.chainsolutions.fr",
        "brvm.chainsolutions.fr",
        "bvmac.chainsolutions.fr",
        "chainsolutions.fr",
        "Funds.chainsolutions.fr",
        "api.funds.chainsolutions.fr"
      ]
    }
  }
}
```
