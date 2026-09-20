import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import test from 'node:test';

import {
  GITHUB_READONLY_EVIDENCE_OIDC_POLICY,
  verifyGithubReadonlyEvidenceOidcToken
} from '../src/deploy/githubOidc.js';

const SHA = 'b'.repeat(40);
const NOW = 1_789_937_000;
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;
Object.assign(publicJwk, { kid: 'readonly-test-key', alg: 'RS256', use: 'sig' });
const jwks = { keys: [publicJwk] };

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signToken(overrides: Record<string, unknown> = {}): string {
  const header = { alg: 'RS256', typ: 'JWT', kid: 'readonly-test-key' };
  const claims = {
    iss: GITHUB_READONLY_EVIDENCE_OIDC_POLICY.issuer,
    aud: GITHUB_READONLY_EVIDENCE_OIDC_POLICY.audience,
    sub: 'repo:Patricked-code/MCP:ref:refs/heads/main',
    repository: GITHUB_READONLY_EVIDENCE_OIDC_POLICY.repository,
    repository_id: GITHUB_READONLY_EVIDENCE_OIDC_POLICY.repositoryId,
    repository_owner: GITHUB_READONLY_EVIDENCE_OIDC_POLICY.owner,
    repository_owner_id: GITHUB_READONLY_EVIDENCE_OIDC_POLICY.ownerId,
    ref: GITHUB_READONLY_EVIDENCE_OIDC_POLICY.ref,
    sha: SHA,
    workflow_ref: GITHUB_READONLY_EVIDENCE_OIDC_POLICY.workflowRef,
    workflow_sha: SHA,
    event_name: 'issues',
    run_id: '35530364503',
    run_attempt: '1',
    iat: NOW - 30,
    nbf: NOW - 30,
    exp: NOW + 300,
    ...overrides
  };
  const signingInput = `${encodeJson(header)}.${encodeJson(claims)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(privateKey).toString('base64url')}`;
}

test('read-only evidence OIDC policy is fixed to its own audience and workflow', () => {
  assert.equal(
    GITHUB_READONLY_EVIDENCE_OIDC_POLICY.audience,
    'https://mcp.wealthtechinnovations.com/evidence/github/readonly'
  );
  assert.equal(
    GITHUB_READONLY_EVIDENCE_OIDC_POLICY.workflowRef,
    'Patricked-code/MCP/.github/workflows/mcp-readonly-evidence.yml@refs/heads/main'
  );
  assert.deepEqual(
    GITHUB_READONLY_EVIDENCE_OIDC_POLICY.allowedEvents,
    ['issues', 'workflow_dispatch']
  );
});

test('issue-triggered GitHub OIDC token is accepted for exact main SHA', async () => {
  const claims = await verifyGithubReadonlyEvidenceOidcToken(signToken(), SHA, {
    jwks,
    nowEpochSeconds: NOW
  });
  assert.equal(claims.sha, SHA);
  assert.equal(claims.event_name, 'issues');
});

test('workflow_dispatch is accepted for explicit read-only evidence', async () => {
  await verifyGithubReadonlyEvidenceOidcToken(
    signToken({ event_name: 'workflow_dispatch' }),
    SHA,
    { jwks, nowEpochSeconds: NOW }
  );
});

test('deploy workflow token cannot be reused for read-only evidence endpoint', async () => {
  await assert.rejects(
    verifyGithubReadonlyEvidenceOidcToken(signToken({
      aud: 'https://mcp.wealthtechinnovations.com/deploy/github/s1',
      workflow_ref: 'Patricked-code/MCP/.github/workflows/mcp-deploy.yml@refs/heads/main',
      event_name: 'push'
    }), SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_audience_invalid/
  );
});

test('wrong workflow, event or SHA fails closed', async () => {
  await assert.rejects(
    verifyGithubReadonlyEvidenceOidcToken(signToken({
      workflow_ref: 'Patricked-code/MCP/.github/workflows/other.yml@refs/heads/main'
    }), SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_workflow_invalid/
  );
  await assert.rejects(
    verifyGithubReadonlyEvidenceOidcToken(signToken({ event_name: 'push' }), SHA, {
      jwks,
      nowEpochSeconds: NOW
    }),
    /oidc_event_not_allowed/
  );
  await assert.rejects(
    verifyGithubReadonlyEvidenceOidcToken(signToken({ sha: 'c'.repeat(40) }), SHA, {
      jwks,
      nowEpochSeconds: NOW
    }),
    /oidc_sha_mismatch/
  );
});
