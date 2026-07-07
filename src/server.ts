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
import {
  buildOnboardingSnapshot,
  createAndRecordAgent,
  createOnboardingSession,
  filterAuditEvents,
  getAccountDetail,
  getRepoDetail,
  buildSourceIngestionSnapshot,
  loadArchiveTextAudit,
  loadBlockerEvidenceGate,
  loadBlockerResolutionRunbook,
  loadCompletionAudit,
  loadExecutionRunway,
  loadExecutionTaskIndex,
  loadObjectiveTraceabilityIndex,
  loadOperatorActionPack,
  loadResumeGate,
  loadServerInventoryCardIndex,
  prepareAndRecordOrganizationProfileBootstrap,
  prepareAndRecordRepoBootstrap,
  recordOrganizationSecurityPolicyVerification,
  recordOnboardingAnswer,
  renderOnboardingSnapshotHtml,
  summarizeArchiveTextAudit,
  summarizeBlockerEvidenceGate,
  summarizeBlockerResolutionRunbook,
  summarizeCompletionAudit,
  summarizeExecutionRunway,
  summarizeExecutionTaskIndex,
  summarizeObjectiveTraceabilityIndex,
  summarizeOperatorActionPack,
  summarizeResumeGate,
  summarizeServerInventoryCardIndex
} from './onboarding/index.js';
import type { AgentType } from './onboarding/types.js';

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

function normalizeAgentType(value: unknown): AgentType | null {
  const allowed: AgentType[] = [
    'superadmin_mcp',
    'human_admin',
    'chatgpt',
    'claude',
    'codex',
    'server_agent',
    'readonly_agent',
    'deployment_agent',
    'audit_agent'
  ];
  return typeof value === 'string' && allowed.includes(value as AgentType) ? value as AgentType : null;
}

function nav(): string {
  return `<p>
    <a href="/dashboard">Dashboard</a> ·
    <a href="/git">Paramétrage Git</a> ·
    <a href="/git/onboarding">Onboarding</a> ·
    <a href="/git/onboarding/sources">Sources</a> ·
    <a href="/git/onboarding/archive-texts">Archives</a> ·
    <a href="/git/onboarding/objectives">Objectifs</a> ·
    <a href="/git/onboarding/tasks">Tâches</a> ·
    <a href="/git/onboarding/runway">Étapes</a> ·
    <a href="/git/onboarding/blockers">Blocages</a> ·
    <a href="/git/onboarding/evidence">Preuves</a> ·
    <a href="/git/onboarding/completion">Complétude</a> ·
    <a href="/git/onboarding/operator-actions">Actions</a> ·
    <a href="/git/onboarding/resume-gate">Reprise</a> ·
    <a href="/git/onboarding/server-cards">Serveur</a> ·
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
    res.setHeader('Set-Cookie', clearWebSessionCookie());
    res.redirect('/login');
  });

  app.get('/dashboard', requireWebLogin, async (_req, res) => {
    try {
      res.type('html').send(await renderDashboardPage());
    } catch (error) {
      logger.error({ error }, 'Erreur dashboard');
      res.status(500).type('text').send('Erreur dashboard MCP.');
    }
  });

  app.get('/git', requireWebLogin, async (_req, res) => {
    try {
      const status = await getGithubConnectionStatus();
      const registry = await readGitRegistry();
      res.type('html').send(renderGitSettingsPage(status, registry));
    } catch (error) {
      logger.error({ error }, 'Erreur page /git');
      res.status(500).type('text').send('Erreur page paramétrage Git.');
    }
  });

  app.get('/git/status', requireWebLogin, async (_req, res) => {
    try {
      const status = await getGithubConnectionStatus();
      const registry = await readGitRegistry();
      res.json({ status, registry });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/status');
      res.status(500).json({ error: 'git_status_failed' });
    }
  });

  app.get('/git/onboarding', requireWebLogin, async (req, res) => {
    try {
      const status = await getGithubConnectionStatus();
      const registry = await readGitRegistry();
      const snapshot = await buildOnboardingSnapshot({
        status,
        registry,
        source: 'mcp-web:/git/onboarding',
        userAgent: req.header('user-agent') ?? undefined
      });

      if (req.accepts('html')) {
        res.type('html').send(renderOnboardingSnapshotHtml(snapshot));
        return;
      }
      res.json(snapshot);
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding');
      res.status(500).json({ error: 'git_onboarding_failed' });
    }
  });

  app.get('/git/onboarding/sources', requireWebLogin, async (_req, res) => {
    try {
      res.json(await buildSourceIngestionSnapshot());
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding/sources');
      res.status(500).json({ error: 'source_registry_failed' });
    }
  });

  app.get('/git/onboarding/archive-texts', requireWebLogin, async (_req, res) => {
    try {
      const audit = await loadArchiveTextAudit();
      res.json({ summary: summarizeArchiveTextAudit(audit), audit });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding/archive-texts');
      res.status(500).json({ error: 'archive_text_audit_failed' });
    }
  });

  app.get('/git/onboarding/objectives', requireWebLogin, async (_req, res) => {
    try {
      const index = await loadObjectiveTraceabilityIndex();
      res.json({
        summary: summarizeObjectiveTraceabilityIndex(index),
        index
      });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding/objectives');
      res.status(500).json({ error: 'objective_traceability_failed' });
    }
  });

  app.get('/git/onboarding/tasks', requireWebLogin, async (_req, res) => {
    try {
      const index = await loadExecutionTaskIndex();
      res.json({
        summary: summarizeExecutionTaskIndex(index),
        index
      });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding/tasks');
      res.status(500).json({ error: 'execution_tasks_failed' });
    }
  });

  app.get('/git/onboarding/runway', requireWebLogin, async (_req, res) => {
    try {
      const runway = await loadExecutionRunway();
      res.json({
        summary: summarizeExecutionRunway(runway),
        runway
      });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding/runway');
      res.status(500).json({ error: 'execution_runway_failed' });
    }
  });

  app.get('/git/onboarding/blockers', requireWebLogin, async (_req, res) => {
    try {
      const runbook = await loadBlockerResolutionRunbook();
      res.json({
        summary: summarizeBlockerResolutionRunbook(runbook),
        runbook
      });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding/blockers');
      res.status(500).json({ error: 'blocker_resolution_failed' });
    }
  });

  app.get('/git/onboarding/evidence', requireWebLogin, async (_req, res) => {
    try {
      const gate = await loadBlockerEvidenceGate();
      res.json({ summary: summarizeBlockerEvidenceGate(gate), gate });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding/evidence');
      res.status(500).json({ error: 'blocker_evidence_gate_failed' });
    }
  });

  app.get('/git/onboarding/completion', requireWebLogin, async (_req, res) => {
    try {
      const audit = await loadCompletionAudit();
      res.json({ summary: summarizeCompletionAudit(audit), audit });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding/completion');
      res.status(500).json({ error: 'completion_audit_failed' });
    }
  });

  app.get('/git/onboarding/operator-actions', requireWebLogin, async (_req, res) => {
    try {
      const pack = await loadOperatorActionPack();
      res.json({ summary: summarizeOperatorActionPack(pack), pack });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding/operator-actions');
      res.status(500).json({ error: 'operator_action_pack_failed' });
    }
  });

  app.get('/git/onboarding/resume-gate', requireWebLogin, async (_req, res) => {
    try {
      const gate = await loadResumeGate();
      res.json({ summary: summarizeResumeGate(gate), gate });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding/resume-gate');
      res.status(500).json({ error: 'resume_gate_failed' });
    }
  });

  app.get('/git/onboarding/server-cards', requireWebLogin, async (_req, res) => {
    try {
      const index = await loadServerInventoryCardIndex();
      res.json({
        summary: summarizeServerInventoryCardIndex(index),
        index
      });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding/server-cards');
      res.status(500).json({ error: 'server_inventory_cards_failed' });
    }
  });

  app.post('/git/onboarding/start', requireWebLogin, async (req, res) => {
    try {
      const status = await getGithubConnectionStatus();
      const registry = await readGitRegistry();
      const result = await createOnboardingSession({
        status,
        registry,
        source: 'mcp-web:/git/onboarding/start',
        userAgent: req.header('user-agent') ?? undefined
      });
      res.status(201).json({ session: result.session, snapshot: result.snapshot });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding/start');
      res.status(500).json({ error: 'git_onboarding_start_failed' });
    }
  });

  app.post('/git/onboarding/answer', requireWebLogin, async (req, res) => {
    try {
      const sessionId = typeof req.body.sessionId === 'string' ? req.body.sessionId.trim() : '';
      const questionId = typeof req.body.questionId === 'string' ? req.body.questionId.trim() : '';
      const choiceId = typeof req.body.choiceId === 'string' ? req.body.choiceId.trim() : '';

      if (!sessionId || !questionId || !choiceId) {
        res.status(400).json({ error: 'sessionId_questionId_choiceId_required' });
        return;
      }

      const status = await getGithubConnectionStatus();
      const registry = await readGitRegistry();
      const result = await recordOnboardingAnswer({
        status,
        registry,
        sessionId,
        questionId,
        choiceId,
        source: 'mcp-web:/git/onboarding/answer'
      });
      res.status(result.accepted ? 200 : 403).json(result);
    } catch (error) {
      logger.error({ error }, 'Erreur /git/onboarding/answer');
      res.status(500).json({ error: 'git_onboarding_answer_failed' });
    }
  });

  app.get('/git/organization', requireWebLogin, async (req, res) => {
    try {
      const status = await getGithubConnectionStatus();
      const registry = await readGitRegistry();
      const snapshot = await buildOnboardingSnapshot({
        status,
        registry,
        source: 'mcp-web:/git/organization',
        userAgent: req.header('user-agent') ?? undefined
      });
      res.json({
        organization: snapshot.organization,
        nextActions: snapshot.organization.nextSteps,
        safetyRules: snapshot.organization.safetyRules
      });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/organization');
      res.status(500).json({ error: 'git_organization_failed' });
    }
  });

  app.post('/git/organization/bootstrap', requireWebLogin, async (req, res) => {
    try {
      const status = await getGithubConnectionStatus();
      const registry = await readGitRegistry();
      const { bootstrap } = await prepareAndRecordOrganizationProfileBootstrap({
        status,
        registry,
        source: 'mcp-web:/git/organization/bootstrap',
        userAgent: req.header('user-agent') ?? undefined
      });
      res.status(bootstrap.blockedReason ? 409 : 200).json({ bootstrap });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/organization/bootstrap');
      res.status(500).json({ error: 'git_organization_bootstrap_failed' });
    }
  });

  app.get('/git/organization/security', requireWebLogin, async (req, res) => {
    try {
      const status = await getGithubConnectionStatus();
      const registry = await readGitRegistry();
      const snapshot = await buildOnboardingSnapshot({
        status,
        registry,
        source: 'mcp-web:/git/organization/security',
        userAgent: req.header('user-agent') ?? undefined
      });
      res.json({
        organization: snapshot.organization.organization,
        security: snapshot.organization.securitySettings,
        accessSignals: snapshot.organization.accessSignals,
        nextActions: snapshot.organization.securitySettings.twoFactorRequirement.verificationSteps
      });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/organization/security');
      res.status(500).json({ error: 'git_organization_security_failed' });
    }
  });

  app.post('/git/organization/security/verify', requireWebLogin, async (req, res) => {
    try {
      const ownerConfirmed = req.body.ownerConfirmed === true;
      const twoFactorRequirementEnabled = req.body.twoFactorRequirementEnabled;

      if (typeof twoFactorRequirementEnabled !== 'boolean' || !ownerConfirmed) {
        res.status(400).json({ error: 'ownerConfirmed_true_and_twoFactorRequirementEnabled_boolean_required' });
        return;
      }

      const status = await getGithubConnectionStatus();
      const registry = await readGitRegistry();
      const { policy } = await recordOrganizationSecurityPolicyVerification({
        status,
        registry,
        ownerConfirmed,
        twoFactorRequirementEnabled,
        source: 'mcp-web:/git/organization/security/verify',
        userAgent: req.header('user-agent') ?? undefined
      });
      res.status(policy.compliant ? 200 : 409).json({ policy });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/organization/security/verify');
      res.status(500).json({ error: 'git_organization_security_verify_failed' });
    }
  });

  app.get('/git/accounts', requireWebLogin, async (_req, res) => {
    try {
      const registry = await readGitRegistry();
      res.json({ accounts: registry.accounts });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/accounts');
      res.status(500).json({ error: 'git_accounts_failed' });
    }
  });

  app.get('/git/accounts/:account', requireWebLogin, async (req, res) => {
    try {
      const account = normalizeAccountParam(String(req.params.account ?? ''));
      const registry = await readGitRegistry();
      const detail = getAccountDetail(registry, account);
      if (!detail) {
        res.status(404).json({ error: 'git_account_not_found' });
        return;
      }
      res.json({ account: detail });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/accounts/:account');
      res.status(500).json({ error: 'git_account_failed' });
    }
  });

  app.get('/git/repos', requireWebLogin, async (req, res) => {
    try {
      const status = await getGithubConnectionStatus();
      const registry = await readGitRegistry();
      const snapshot = await buildOnboardingSnapshot({
        status,
        registry,
        source: 'mcp-web:/git/repos',
        userAgent: req.header('user-agent') ?? undefined
      });
      res.json({ repos: snapshot.repos });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/repos');
      res.status(500).json({ error: 'git_repos_failed' });
    }
  });

  app.get('/git/repos/:owner/:repo', requireWebLogin, async (req, res) => {
    try {
      const owner = normalizeAccountParam(String(req.params.owner ?? ''));
      const repo = normalizeAccountParam(String(req.params.repo ?? ''));
      const status = await getGithubConnectionStatus();
      const registry = await readGitRegistry();
      const snapshot = await buildOnboardingSnapshot({
        status,
        registry,
        source: 'mcp-web:/git/repos/detail',
        userAgent: req.header('user-agent') ?? undefined
      });
      const detail = getRepoDetail(snapshot.repos, owner, repo);
      if (!detail) {
        res.status(404).json({ error: 'git_repo_not_found' });
        return;
      }
      res.json({ repo: detail });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/repos/:owner/:repo');
      res.status(500).json({ error: 'git_repo_failed' });
    }
  });

  app.post('/git/repos/:owner/:repo/bootstrap', requireWebLogin, async (req, res) => {
    try {
      const owner = normalizeAccountParam(String(req.params.owner ?? ''));
      const repo = normalizeAccountParam(String(req.params.repo ?? ''));
      const status = await getGithubConnectionStatus();
      const registry = await readGitRegistry();
      const snapshot = await buildOnboardingSnapshot({
        status,
        registry,
        source: 'mcp-web:/git/repos/bootstrap',
        userAgent: req.header('user-agent') ?? undefined
      });
      const detail = getRepoDetail(snapshot.repos, owner, repo);
      if (!detail) {
        res.status(404).json({ error: 'git_repo_not_found' });
        return;
      }
      const { bootstrap } = await prepareAndRecordRepoBootstrap({
        status,
        registry,
        repo: detail,
        source: 'mcp-web:/git/repos/bootstrap',
        userAgent: req.header('user-agent') ?? undefined
      });
      res.json({ bootstrap });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/repos/:owner/:repo/bootstrap');
      res.status(500).json({ error: 'git_repo_bootstrap_failed' });
    }
  });

  app.get('/git/agents', requireWebLogin, async (req, res) => {
    try {
      const status = await getGithubConnectionStatus();
      const registry = await readGitRegistry();
      const snapshot = await buildOnboardingSnapshot({
        status,
        registry,
        source: 'mcp-web:/git/agents',
        userAgent: req.header('user-agent') ?? undefined
      });
      res.json({ agents: snapshot.agents });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/agents');
      res.status(500).json({ error: 'git_agents_failed' });
    }
  });

  app.post('/git/agents/create', requireWebLogin, async (req, res) => {
    try {
      const agentName = typeof req.body.agentName === 'string' ? req.body.agentName.trim() : '';
      const role = typeof req.body.role === 'string' ? req.body.role.trim() : '';
      const agentType = normalizeAgentType(req.body.agentType);

      if (!agentName || !role || !agentType) {
        res.status(400).json({ error: 'agentName_agentType_role_required' });
        return;
      }

      const registry = await readGitRegistry();
      const result = await createAndRecordAgent({
        registry,
        agentName,
        agentType,
        role,
        actor: 'mcp-web:/git/agents/create'
      });
      res.status(201).json({ agent: result.agent });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'agent_create_failed';
      if (message.includes('SuperAdmin MCP')) {
        res.status(403).json({ error: 'superadmin_requires_master_mcp_token_validation' });
        return;
      }
      logger.error({ error }, 'Erreur /git/agents/create');
      res.status(500).json({ error: 'git_agent_create_failed' });
    }
  });

  app.get('/git/audit', requireWebLogin, async (req, res) => {
    try {
      const registry = await readGitRegistry();
      const limit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 100;
      const actor = typeof req.query.actor === 'string' ? req.query.actor : undefined;
      const type = typeof req.query.type === 'string' ? req.query.type : undefined;
      res.json({ events: filterAuditEvents(registry, { actor, type, limit: Number.isFinite(limit) ? limit : 100 }) });
    } catch (error) {
      logger.error({ error }, 'Erreur /git/audit');
      res.status(500).json({ error: 'git_audit_failed' });
    }
  });

  app.post('/git/connect', requireWebLogin, async (req, res) => {
    try {
      const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
      const org = typeof req.body.org === 'string' ? req.body.org.trim() : env.GITHUB_ORG;
      const mode = typeof req.body.mode === 'string' ? req.body.mode : 'read';

      if (!token) {
        res.status(400).type('text').send('Token GitHub manquant.');
        return;
      }

      const validation = await validateGithubToken(token, org);
      if (!validation.connected) {
        res.status(400).type('text').send(`Token refusé: ${validation.error ?? 'connexion GitHub impossible'}`);
        return;
      }

      await saveGithubToken(token);
      await recordGithubConnection(validation, mode, 'mcp-web:/git/connect');
      logger.info({ org, login: validation.login, mode }, 'Token GitHub MCP connecté depuis la page /git');
      res.redirect('/git');
    } catch (error) {
      logger.error({ error }, 'Erreur Git connect');
      res.status(500).type('text').send('Erreur pendant la connexion Git.');
    }
  });

  app.get('/github/status', requireWebLogin, async (_req, res) => {
    try {
      res.json(await getGithubConnectionStatus());
    } catch (error) {
      logger.error({ error }, 'Erreur GitHub status');
      res.status(500).json({ error: 'github_status_failed' });
    }
  });

  app.get('/github', requireWebLogin, async (_req, res) => {
    try {
      const status = await getGithubConnectionStatus();
      res.type('html').send(addGithubNav(renderGithubConnectionPage(status)));
    } catch (error) {
      logger.error({ error }, 'Erreur GitHub page');
      res.status(500).type('text').send('Erreur GitHub page');
    }
  });

  app.get('/github/:account', requireWebLogin, async (req, res) => {
    try {
      const account = normalizeAccountParam(String(req.params.account ?? ''));
      if (!account) {
        res.status(400).type('text').send('Compte GitHub invalide.');
        return;
      }

      const status = await getGithubConnectionStatus();
      res.type('html').send(renderAccountPage(account, renderGithubConnectionPage(status)));
    } catch (error) {
      logger.error({ error }, 'Erreur GitHub account page');
      res.status(500).type('text').send('Erreur page compte GitHub.');
    }
  });

  app.post('/github/connect', requireWebLogin, async (req, res) => {
    try {
      const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
      const org = typeof req.body.org === 'string' ? req.body.org.trim() : env.GITHUB_ORG;
      const mode = typeof req.body.mode === 'string' ? req.body.mode : 'read';

      if (!token) {
        res.status(400).type('text').send('Token GitHub manquant.');
        return;
      }

      const validation = await validateGithubToken(token, org);
      if (!validation.connected) {
        res.status(400).type('text').send(`Token refusé: ${validation.error ?? 'connexion GitHub impossible'}`);
        return;
      }

      await saveGithubToken(token);
      await recordGithubConnection(validation, mode, 'mcp-web:/github/connect');
      logger.info({ org, login: validation.login, mode }, 'Token GitHub MCP connecté depuis la page /github');
      res.redirect(`/github/${encodeURIComponent(validation.login ?? org ?? 'github')}`);
    } catch (error) {
      logger.error({ error }, 'Erreur GitHub connect');
      res.status(500).type('text').send('Erreur pendant la connexion GitHub.');
    }
  });

  app.use('/mcp', requireBearerToken);

  const transports: Record<string, StreamableHTTPServerTransport> = {};

  app.post('/mcp', async (req, res) => {
    try {
      const sessionId = req.header('mcp-session-id') ?? undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId: string) => {
            transports[newSessionId] = transport;
            logger.info({ sessionId: newSessionId }, 'MCP session initialisée');
          }
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
          }
        };

        const mcpServer = buildMcpServer();
        await mcpServer.connect(transport);
      } else {
        res.status(400).json({ error: 'Invalid or missing MCP session' });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error({ error }, 'Erreur MCP POST');
      if (!res.headersSent) {
        res.status(500).json({ error: 'internal_server_error' });
      }
    }
  });

  const handleSessionRequest = async (req: express.Request, res: express.Response) => {
    const sessionId = req.header('mcp-session-id') ?? undefined;

    if (!sessionId || !transports[sessionId]) {
      res.status(400).json({ error: 'Invalid or missing MCP session' });
      return;
    }

    await transports[sessionId].handleRequest(req, res);
  };

  app.get('/mcp', handleSessionRequest);
  app.delete('/mcp', handleSessionRequest);

  const listenHost = '0.0.0.0';
  app.listen(env.PORT, listenHost, () => {
    logger.info({ port: env.PORT, host: listenHost, writeToolsEnabled: env.ENABLE_WRITE_TOOLS }, 'wealthtech_ssh_bridge démarré');
  });
}
