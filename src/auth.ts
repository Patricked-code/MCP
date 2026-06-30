import type { Request, Response, NextFunction } from 'express';
import { env } from './config/env.js';

export function requireBearerToken(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const expected = `Bearer ${env.MCP_AUTH_TOKEN}`;

  if (header !== expected) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  next();
}
