import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { env } from './config/env.js';
import { requireBearerToken } from './auth.js';
import { logger } from './logger.js';
import { registerReadOnlyTools } from './tools/readOnly.js';
import { registerScopedWriteTools } from './tools/writeScoped.js';
import { getGithubConnectionStatus, renderGithubConnectionPage, saveGithubToken, validateGithubToken } from './github/connection.js';

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

  app.get('/github/status', async (_req, res) => {
    try {
      res.json(await getGithubConnectionStatus());
    } catch (error) {
      logger.error({ error }, 'Erreur GitHub status');
      res.status(500).json({ error: 'github_status_failed' });
    }
  });

  app.get('/github', async (_req, res) => {
    try {
      const status = await getGithubConnectionStatus();
      res.type('html').send(renderGithubConnectionPage(status));
    } catch (error) {
      logger.error({ error }, 'Erreur GitHub page');
      res.status(500).type('text').send('Erreur GitHub page');
    }
  });

  app.post('/github/connect', async (req, res) => {
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
      res.redirect('/github');
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
