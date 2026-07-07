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
