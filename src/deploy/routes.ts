import express from 'express';
import type { Router } from 'express';

import type { GithubOidcClaims } from './githubOidc.js';
import {
  buildS1DeployJobId,
  buildS1DeployLaunchCommand,
  buildS1DeployStatusCommand,
  parseS1DeployStatus
} from './s1Deploy.js';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const MAX_BEARER_BYTES = 16_384;

interface CommandResultLike {
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface GithubDeployRouteDependencies {
  verifyOidc: (token: string, requestedSha: string) => Promise<GithubOidcClaims>;
  writeEnabled: () => boolean;
  runWrite: (command: string) => Promise<CommandResultLike>;
  runRead: (command: string) => Promise<CommandResultLike>;
}

function bearerToken(value: string | undefined): string | null {
  if (!value || !value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length);
  if (!token || token.includes(' ') || Buffer.byteLength(token, 'utf8') > MAX_BEARER_BYTES) return null;
  return token;
}

function requestedSha(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  return SHA_PATTERN.test(normalized) ? normalized : null;
}

function exactStartBody(value: unknown): { sha: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== 'sha') return null;
  const sha = requestedSha(record.sha);
  return sha ? { sha } : null;
}

async function authenticate(
  dependencies: GithubDeployRouteDependencies,
  authorization: string | undefined,
  sha: string
): Promise<GithubOidcClaims | null> {
  const token = bearerToken(authorization);
  if (!token) return null;
  return dependencies.verifyOidc(token, sha);
}

function jsonError(response: express.Response, status: number, error: string) {
  return response.status(status).json({ error });
}

export function createGithubDeployRouter(dependencies: GithubDeployRouteDependencies): Router {
  const router = express.Router();
  const json4kb = express.json({ limit: '4kb', strict: true });

  router.post('/deploy/github/s1/start', json4kb, async (request, response) => {
    const token = bearerToken(request.header('authorization'));
    if (!token) return jsonError(response, 401, 'github_oidc_required');

    const body = exactStartBody(request.body);
    if (!body) return jsonError(response, 400, 'invalid_request');

    let claims: GithubOidcClaims;
    try {
      claims = await dependencies.verifyOidc(token, body.sha);
    } catch {
      return jsonError(response, 403, 'github_oidc_invalid');
    }

    if (!dependencies.writeEnabled()) {
      return jsonError(response, 503, 'deploy_write_gate_disabled');
    }

    if (typeof claims.run_id !== 'string') {
      return jsonError(response, 403, 'github_oidc_invalid');
    }

    let jobId: string;
    let command: string;
    try {
      jobId = buildS1DeployJobId(claims.run_id, body.sha);
      command = buildS1DeployLaunchCommand(claims.run_id, body.sha);
    } catch {
      return jsonError(response, 403, 'github_oidc_invalid');
    }

    let result: CommandResultLike;
    try {
      result = await dependencies.runWrite(command);
    } catch {
      return jsonError(response, 502, 's1_deploy_start_failed');
    }
    if (result.code !== 0) {
      return jsonError(response, 502, 's1_deploy_start_failed');
    }

    return response.status(202).json({ jobId, requestedSha: body.sha, status: 'queued' });
  });

  router.get('/deploy/github/s1/status/:jobId', async (request, response) => {
    const token = bearerToken(request.header('authorization'));
    if (!token) return jsonError(response, 401, 'github_oidc_required');

    const sha = requestedSha(request.query.sha);
    if (!sha) return jsonError(response, 400, 'invalid_request');

    try {
      await authenticate(dependencies, request.header('authorization'), sha);
    } catch {
      return jsonError(response, 403, 'github_oidc_invalid');
    }

    let command: string;
    try {
      command = buildS1DeployStatusCommand(request.params.jobId, sha);
    } catch {
      return jsonError(response, 400, 'invalid_job');
    }

    let result: CommandResultLike;
    try {
      result = await dependencies.runRead(command);
    } catch {
      return jsonError(response, 502, 's1_deploy_status_failed');
    }
    if (result.code !== 0) {
      return jsonError(response, 404, 'deploy_job_not_found');
    }

    try {
      const status = parseS1DeployStatus(result.stdout, request.params.jobId, sha);
      return response.status(200).json(status);
    } catch {
      return jsonError(response, 502, 's1_deploy_status_invalid');
    }
  });

  return router;
}
