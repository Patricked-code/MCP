import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import test from 'node:test';

import {
  GITHUB_STABLECOIN_FAST_FORWARD_OIDC_POLICY,
  verifyGithubStablecoinFastForwardOidcToken
} from '../src/deploy/githubOidc.js';

const SHA = 'd'.repeat(40);
const NOW = 1_789_980_000;
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;
Object.assign(publicJwk, { kid: 'stablecoin-write-test-key', alg: 'RS256', use: 'sig' });
const jwks = { keys: [publicJwk] };

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signToken(overrides: Record<string, unknown> = {}): string {
  const header = { alg: 'RS256', typ: 'JWT', kid: 'stablecoin-write-test-key' };
  const claims = {
    iss: GITHUB_STABLECOIN_FAST_FORWARD_OIDC_POLICY.issuer,
    aud: GITHUB_STABLECOIN_FAST_FORWARD_OIDC_POLICY.audience,
    sub: 'repo:Patricked-code/MCP:ref:refs/heads/main',
    repository: GITHUB_STABLECOIN_FAST_FORWARD_OIDC_POLICY.repository,
    repository_id: GITHUB_STABLECOIN_FAST_FORWARD_OIDC_POLICY.repositoryId,
    repository_owner: GITHUB_STABLECOIN_FAST_FORWARD_OIDC_POLICY.owner,
    repository_owner_id: GITHUB_STABLECOIN_FAST_FORWARD_OIDC_POLICY.ownerId,
    ref: GITHUB_STABLECOIN_FAST_FORWARD_OIDC_POLICY.ref,
    sha: SHA,
    workflow_ref: GITHUB_STABLECOIN_FAST_FORWARD_OIDC_POLICY.workflowRef,
    workflow_sha: SHA,
    event_name: 'issues',
    run_id: '35540000001',
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

test('Stablecoin write OIDC has a dedicated audience, workflow and issue event', () => {
  assert.equal(
    GITHUB_STABLECOIN_FAST_FORWARD_OIDC_POLICY.audience,
    'https://mcp.wealthtechinnovations.com/deploy/github/stablecoin/s2'
  );
  assert.equal(
    GITHUB_STABLECOIN_FAST_FORWARD_OIDC_POLICY.workflowRef,
    'Patricked-code/MCP/.github/workflows/stablecoin-fast-forward.yml@refs/heads/main'
  );
  assert.deepEqual(
    GITHUB_STABLECOIN_FAST_FORWARD_OIDC_POLICY.allowedEvents,
    ['issues', 'workflow_dispatch']
  );
});

test('Stablecoin write token accepts exact main SHA and rejects read-only audience reuse', async () => {
  const claims = await verifyGithubStablecoinFastForwardOidcToken(signToken(), SHA, {
    jwks,
    nowEpochSeconds: NOW
  });
  assert.equal(claims.sha, SHA);

  await assert.rejects(
    verifyGithubStablecoinFastForwardOidcToken(signToken({
      aud: 'https://mcp.wealthtechinnovations.com/evidence/github/readonly',
      workflow_ref: 'Patricked-code/MCP/.github/workflows/mcp-readonly-evidence.yml@refs/heads/main'
    }), SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_audience_invalid/
  );
});
