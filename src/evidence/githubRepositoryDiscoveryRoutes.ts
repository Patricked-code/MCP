import express from 'express';
import type { Router } from 'express';

import type { GithubOidcClaims } from '../deploy/githubOidc.js';
import {
  REPOSITORY_DISCOVERY_COMMANDS,
  type RepositoryDiscoveryCommand
} from '../ssh/repositoryGateway.js';
import { validateGovernedRepository } from '../ssh/repositoryAccess.js';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const MAX_BEARER_BYTES = 16_384;
const REQUIRED_COMMANDS = new Set<RepositoryDiscoveryCommand>(['ping', 'project-context']);

export interface GithubRepositoryDiscoveryDependencies {
  verifyOidc: (
    token: string,
    requestedSha: string,
    repository: string
  ) => Promise<GithubOidcClaims>;
  executeDiscovery: (
    repository: string,
    command: RepositoryDiscoveryCommand
  ) => Promise<string>;
}

function bearerToken(value: string | undefined): string | null {
  if (!value || !value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length);
  if (!token || token.includes(' ') || Buffer.byteLength(token, 'utf8') > MAX_BEARER_BYTES) return null;
  return token;
}

function exactBody(value: unknown): { sha: string; repository: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(',') !== 'repository,sha') return null;
  if (typeof record.sha !== 'string' || !SHA_PATTERN.test(record.sha.toLowerCase())) return null;
  if (typeof record.repository !== 'string') return null;
  try {
    return {
      sha: record.sha.toLowerCase(),
      repository: validateGovernedRepository(record.repository)
    };
  } catch {
    return null;
  }
}

function parseResult(raw: string): unknown {
  if (Buffer.byteLength(raw, 'utf8') > 250_000) {
    throw new Error('repository_discovery_result_too_large');
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

export function createGithubRepositoryDiscoveryRouter(
  dependencies: GithubRepositoryDiscoveryDependencies
): Router {
  const router = express.Router();
  const json8kb = express.json({ limit: '8kb', strict: true });

  router.post('/access/github/repository-mcp/discovery', json8kb, async (request, response) => {
    const token = bearerToken(request.header('authorization'));
    if (!token) return response.status(401).json({ error: 'github_oidc_required' });

    const body = exactBody(request.body);
    if (!body) return response.status(400).json({ error: 'invalid_request' });

    try {
      await dependencies.verifyOidc(token, body.sha, body.repository);
    } catch {
      return response.status(403).json({ error: 'github_oidc_invalid' });
    }

    const tools: Record<string, { status: 'PASS'; result: unknown } | { status: 'ERROR'; error: string }> = {};
    let requiredFailure = false;
    let partial = false;

    for (const command of REPOSITORY_DISCOVERY_COMMANDS) {
      try {
        const raw = await dependencies.executeDiscovery(body.repository, command);
        tools[command] = { status: 'PASS', result: parseResult(raw) };
      } catch {
        tools[command] = { status: 'ERROR', error: 'repository_discovery_failed' };
        partial = true;
        if (REQUIRED_COMMANDS.has(command)) requiredFailure = true;
      }
    }

    const envelope = {
      schemaVersion: 1,
      repository: body.repository,
      sha: body.sha,
      transport: 'github_oidc_direct_discovery',
      status: requiredFailure ? 'ERROR' : (partial ? 'PARTIAL' : 'PASS'),
      mutationAllowed: false,
      tools
    };

    return response.status(requiredFailure ? 502 : 200).json(envelope);
  });

  return router;
}
