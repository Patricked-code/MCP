import type { Request, Response, NextFunction } from 'express';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { env } from './config/env.js';
import { inspectOauthAccessToken, oauthChallengeHeader } from './oauth.js';

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
    (req as Request & { auth?: AuthInfo }).auth = {
      token,
      clientId: 'wealthtech-shared-mcp',
      scopes: ['mcp:read'],
      extra: {
        governedPrincipalId: null,
        identityAssurance: 'shared_credential'
      }
    };
    next();
    return;
  }

  const oauthIdentity = token === null
    ? null
    : inspectOauthAccessToken(token, 'mcp:read');
  if (token !== null && oauthIdentity !== null) {
    (req as Request & { auth?: AuthInfo }).auth = {
      token,
      clientId: oauthIdentity.clientId,
      scopes: oauthIdentity.scopes,
      expiresAt: oauthIdentity.expiresAt,
      extra: {
        governedPrincipalId: `oauth:${oauthIdentity.subject}`,
        identityAssurance: 'oauth_subject'
      }
    };
    next();
    return;
  }

  res.setHeader('WWW-Authenticate', oauthChallengeHeader('mcp:read'));
  res.status(401).json({ error: 'unauthorized' });
}
