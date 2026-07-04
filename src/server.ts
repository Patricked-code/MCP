import express from 'express';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { env } from './config/env.js';
import { requireBearerToken } from './auth.js';
import { logger } from './logger.js';
import { registerReadOnlyTools } from './tools/readOnly.js';
import { registerScopedWriteTools } from './tools/writeScoped.js';
import { getGithubConnectionStatus, renderGithubConnectionPage, saveGithubToken, validateGithubToken } from './github/connection.js';


const WEB_SESSION_COOKIE = 'mcp_web_session';
const WEB_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function signSession(expiresAt: number): string {
  return createHmac('sha256', env.MCP_AUTH_TOKEN).update(String(expiresAt)).digest('hex');
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

  if (!Number.isFinite(expiresAt) || !signature || expiresAt < Date.now()) {
    return false;
  }

  const expected = signSession(expiresAt);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function createWebSessionCookie(): string {
  const expiresAt = Date.now() + WEB_SESSION_MAX_AGE_SECONDS * 1000;
  const value = `${expiresAt}.${signSession(expiresAt)}`;
  return `${WEB_SESSION_COOKIE}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${WEB_SESSION_MAX_AGE_SECONDS}`;
}

function clearWebSessionCookie(): string {
  return `${WEB_SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function isWebAuthenticated(req: express.Request): boolean {
  const authorization = req.header('authorization') ?? '';

  if (authorization.startsWith('Bearer ') && authorization.slice('Bearer '.length) === env.MCP_AUTH_TOKEN) {
    return true;
  }

  const cookies = parseCookies(req.header('cookie'));
  return isValidWebSession(cookies[WEB_SESSION_COOKIE]);
}

function requireWebLogin(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (isWebAuthenticated(req)) {
    next();
    return;
  }

  if (req.accepts('html')) {
    res.redirect(`/login?next=${encodeURIComponent(req.originalUrl || '/github')}`);
    return;
  }

  res.status(401).json({ error: 'mcp_web_login_required' });
}

function renderLoginPage(error?: string, next = '/github'): string {
  const safeError = error ? `<p class="error">${escapeHtml(error)}</p>` : '';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Connexion MCP WealthTech</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; background: #f9fafb; margin: 0; color: #111827; }
    main { max-width: 540px; margin: 10vh auto; background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 28px; box-shadow: 0 10px 30px rgba(0,0,0,.06); }
    h1 { margin-top: 0; }
    label { display: block; margin: 14px 0 6px; font-weight: 700; }
    input { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 10px; box-sizing: border-box; }
    button { margin-top: 16px; width: 100%; padding: 12px; border: 0; border-radius: 10px; background: #111827; color: white; font-weight: 800; }
    .error { color: #b91c1c; font-weight: 700; }
    .hint { color: #4b5563; font-size: .95rem; }
  </style>
</head>
<body>
  <main>
    <h1>Connexion MCP</h1>
    <p class="hint">Entre le token MCP pour accéder aux pages GitHub Guardian et aux paramètres par compte/repo.</p>
    ${safeError}
    <form method="post" action="/login">
      <input type="hidden" name="next" value="${escapeHtml(next)}" />
      <label>Token MCP</label>
      <input name="token" type="password" autocomplete="current-password" required autofocus />
      <button type="submit">Se connecter</button>
    </form>
  </main>
</body>
</html>`;
}

function normalizeAccountParam(value: string): string {
  return value.trim().replace(/^@/, '').replace(/[^A-Za-z0-9_.-]/g, '');
}

function addGithubNav(html: string): string {
  return html.replace(
    '<h1>WealthTech MCP — Connexion GitHub</h1>',
    '<h1>WealthTech MCP — Connexion GitHub</h1><p><a href="/github/status">Statut JSON</a> · <a href="/logout">Déconnexion</a></p>'
  );
}

function renderAccountPage(account: string, githubPageHtml: string): string {
  return githubPageHtml.replace(
    '<h1>WealthTech MCP — Connexion GitHub</h1>',
    `<h1>WealthTech MCP — Compte GitHub ${escapeHtml(account)}</h1><p><a href="/github">Vue générale</a> · <a href="/github/status">Statut JSON</a> · <a href="/logout">Déconnexion</a></p>`
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
    res.redirect(`/github/${encodeURIComponent(validation.login ?? org ?? 'github')}`);
  });

  app.get('/login', (req, res) => {
    const next = typeof req.query.next === 'string' ? req.query.next : '/github';
    res.type('html').send(renderLoginPage(undefined, next));
  });

  app.post('/login', (req, res) => {
    const token = typeof req.body.token === 'string' ? req.body.token : '';
    const next = typeof req.body.next === 'string' && req.body.next.startsWith('/') ? req.body.next : '/github';

    if (token !== env.MCP_AUTH_TOKEN) {
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
      const account = normalizeAccountParam(req.params.account);
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
      logger.info({ org, login: validation.login }, 'Token GitHub MCP connecté depuis la page /github');
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
