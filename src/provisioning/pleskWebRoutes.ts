import express from 'express';
import type { Request, RequestHandler, Router } from 'express';
import type { PleskPolicy, PleskRemotePort } from './pleskSshAdapter.js';

export type PleskWebDependencies = {
  requireLogin: RequestHandler;
  session: (req: Request) => string;
  sameOrigin: (req: Request) => boolean;
  issueTicket: (purpose: string, binding: string) => string;
  verifyTicket: (purpose: string, ticket: unknown, binding: string) => boolean;
  policy: () => PleskPolicy;
  io: PleskRemotePort;
  writeEnabled: () => boolean;
};

/** RED baseline: the session-bound web consent route does not yet exist. */
export function createPleskSubdomainRouter(_deps: PleskWebDependencies): Router {
  return express.Router();
}
