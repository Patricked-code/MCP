import express from 'express';
import type { Router } from 'express';

import type { GithubOidcClaims } from '../deploy/githubOidc.js';
import { buildRepositorySshCaBootstrapCommand } from './repositoryAccess.js';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const MAX_BEARER_BYTES = 16_384;

interface CommandResultLike {
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface GithubRepositorySshCaBootstrapDependencies {
  verifyOidc: (token: string, requestedSha: string) => Promise<GithubOidcClaims>;
  writeEnabled: () => boolean;
  runWrite: (command: string) => Promise<CommandResultLike>;
}

function bearerToken(value: string | undefined): string | null {
  if (!value || !value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length);
  if (!token || token.includes(' ') || Buffer.byteLength(token, 'utf8') > MAX_BEARER_BYTES) return null;
  return token;
}

function exactBody(value: unknown): { sha: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).join(',') !== 'sha') return null;
  if (typeof record.sha !== 'string') return null;
  const sha = record.sha.toLowerCase();
  return SHA_PATTERN.test(sha) ? { sha } : null;
}

function parseBootstrapOutput(stdout: string): { status: 'READY'; caFingerprint: string } | null {
  const lines = stdout.trim().split(/\r?\n/);
  const status = lines.find((line) => line.startsWith('status='))?.slice('status='.length);
  const fingerprint = lines.find((line) => line.startsWith('caFingerprint='))?.slice('caFingerprint='.length);
  if (status !== 'READY' || !fingerprint || !/^SHA256:[A-Za-z0-9+/]{20,100}$/.test(fingerprint)) {
    return null;
  }
  return { status: 'READY', caFingerprint: fingerprint };
}

export function createGithubRepositorySshCaBootstrapRouter(
  dependencies: GithubRepositorySshCaBootstrapDependencies
): Router {
  const router = express.Router();
  const json2kb = express.json({ limit: '2kb', strict: true });

  router.post('/access/github/repository-ssh/ca/bootstrap', json2kb, async (request, response) => {
    const token = bearerToken(request.header('authorization'));
    if (!token) return response.status(401).json({ error: 'github_oidc_required' });

    const body = exactBody(request.body);
    if (!body) return response.status(400).json({ error: 'invalid_request' });

    try {
      await dependencies.verifyOidc(token, body.sha);
    } catch {
      return response.status(403).json({ error: 'github_oidc_invalid' });
    }
    if (!dependencies.writeEnabled()) {
      return response.status(503).json({ error: 'repository_ssh_ca_write_gate_disabled' });
    }

    let result: CommandResultLike;
    try {
      result = await dependencies.runWrite(buildRepositorySshCaBootstrapCommand());
    } catch {
      return response.status(502).json({ error: 'repository_ssh_ca_bootstrap_failed' });
    }
    if (result.code !== 0) {
      return response.status(502).json({ error: 'repository_ssh_ca_bootstrap_failed' });
    }
    const parsed = parseBootstrapOutput(result.stdout);
    if (!parsed) {
      return response.status(502).json({ error: 'repository_ssh_ca_bootstrap_invalid_attestation' });
    }
    return response.status(200).json({
      ...parsed,
      requestedSha: body.sha,
      mutationScope: 'SSH_CA_BOOTSTRAP_ONLY'
    });
  });

  return router;
}
