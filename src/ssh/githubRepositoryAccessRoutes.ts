import express from 'express';
import type { Router } from 'express';

import type { GithubOidcClaims } from '../deploy/githubOidc.js';
import type { RepositorySshCertificate } from './repositoryCertificate.js';
import { validateGovernedRepository, validateRepositorySshPublicKey } from './repositoryAccess.js';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const MAX_BEARER_BYTES = 16_384;

export type RepositorySshAuthorizationStatus = 'CLAIM_MISMATCH' | 'FORBIDDEN_BY_POLICY';

const CLAIM_MISMATCH_CODES = new Set([
  'oidc_audience_invalid',
  'oidc_repository_invalid',
  'oidc_repository_id_invalid',
  'oidc_owner_id_invalid',
  'oidc_ref_invalid',
  'oidc_workflow_invalid',
  'oidc_event_not_allowed',
  'oidc_sha_mismatch'
]);

export function classifyRepositorySshOidcFailure(error: unknown): RepositorySshAuthorizationStatus {
  const code = error instanceof Error ? error.message : '';
  return CLAIM_MISMATCH_CODES.has(code) ? 'CLAIM_MISMATCH' : 'FORBIDDEN_BY_POLICY';
}

export interface GithubRepositorySshAccessDependencies {
  verifyOidc: (token: string, requestedSha: string, repository: string) => Promise<GithubOidcClaims>;
  signCertificate: (input: {
    repository: string;
    publicKey: string;
    runId: string;
  }) => Promise<RepositorySshCertificate>;
}

function bearerToken(value: string | undefined): string | null {
  if (!value || !value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length);
  if (!token || token.includes(' ') || Buffer.byteLength(token, 'utf8') > MAX_BEARER_BYTES) return null;
  return token;
}

function exactBody(value: unknown): { sha: string; repository: string; publicKey: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(',') !== 'publicKey,repository,sha') return null;
  if (typeof record.sha !== 'string' || !SHA_PATTERN.test(record.sha.toLowerCase())) return null;
  if (typeof record.repository !== 'string' || typeof record.publicKey !== 'string') return null;
  try {
    return {
      sha: record.sha.toLowerCase(),
      repository: validateGovernedRepository(record.repository),
      publicKey: validateRepositorySshPublicKey(record.publicKey)
    };
  } catch {
    return null;
  }
}

export function createGithubRepositorySshAccessRouter(
  dependencies: GithubRepositorySshAccessDependencies
): Router {
  const router = express.Router();
  const json8kb = express.json({ limit: '8kb', strict: true });

  router.post('/access/github/repository-ssh/certificate', json8kb, async (request, response) => {
    const token = bearerToken(request.header('authorization'));
    if (!token) return response.status(401).json({ error: 'github_oidc_required' });

    const body = exactBody(request.body);
    if (!body) return response.status(400).json({ error: 'invalid_request' });
    let claims: GithubOidcClaims;
    try {
      claims = await dependencies.verifyOidc(token, body.sha, body.repository);
    } catch (error) {
      return response.status(403).json({
        error: 'github_oidc_invalid',
        authorizationStatus: classifyRepositorySshOidcFailure(error)
      });
    }
    if (typeof claims.run_id !== 'string') {
      return response.status(403).json({ error: 'github_oidc_invalid' });
    }

    try {
      const certificate = await dependencies.signCertificate({
        repository: body.repository,
        publicKey: body.publicKey,
        runId: claims.run_id
      });
      return response.status(201).json({
        authorizationStatus: 'AUTHORIZED',
        ...certificate
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'repository_ssh_ca_unavailable') {
        return response.status(503).json({ error: 'repository_ssh_ca_unavailable' });
      }
      return response.status(502).json({ error: 'repository_ssh_certificate_issue_failed' });
    }
  });

  return router;
}
