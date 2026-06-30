import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { env } from './config/env.js';
import { requireBearerToken } from './auth.js';
import { logger } from './logger.js';
import { registerReadOnlyTools } from './tools/readOnly.js';

export function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: 'wealthtech_ssh_bridge',
    version: '0.1.0'
  });

  registerReadOnlyTools(server);
  return server;
}

export async function startHttpServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'wealthtech_ssh_bridge', mode: 'read-only-first' });
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

  app.listen(env.PORT, '127.0.0.1', () => {
    logger.info({ port: env.PORT }, 'wealthtech_ssh_bridge démarré');
  });
}
