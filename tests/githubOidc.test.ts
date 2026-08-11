import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import test from 'node:test';

import {
  GITHUB_OIDC_POLICY,
  githubOidcJwksUrl,
  verifyGithubOidcToken
} from '../src/deploy/githubOidc.js';

const SHA = 'a'.repeat(40);
const NOW = 1_786_294_800;
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;
Object.assign(publicJwk, { kid: 'test-key', alg: 'RS256', use: 'sig' });

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signToken(
  claimOverrides: Record<string, unknown> = {},
  headerOverrides: Record<string, unknown> = {}
): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: 'test-key',
    ...headerOverrides
  };
  const claims = {
    iss: 'https://token.actions.githubusercontent.com',
    aud: 'https://mcp.wealthtechinnovations.com/deploy/github/s1',
    sub: 'repo:Patricked-code/MCP:ref:refs/heads/main',
    repository: 'Patricked-code/MCP',
    repository_id: '1285534440',
    repository_owner: 'Patricked-code',
    repository_owner_id: '270385782',
    ref: 'refs/heads/main',
    sha: SHA,
    workflow_ref: 'Patricked-code/MCP/.github/workflows/mcp-deploy.yml@refs/heads/main',
    workflow_sha: SHA,
    event_name: 'push',
    run_id: '31317000000',
    run_attempt: '1',
    iat: NOW - 30,
    nbf: NOW - 30,
    exp: NOW + 300,
    ...claimOverrides
  };
  const signingInput = `${encodeJson(header)}.${encodeJson(claims)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(privateKey).toString('base64url')}`;
}

const jwks = { keys: [publicJwk] };

test('la politique OIDC GitHub est fixe et non affaiblie par l’environnement', () => {
  process.env.MCP_GITHUB_OIDC_AUDIENCE = 'https://evil.invalid';
  process.env.MCP_GITHUB_OIDC_REPOSITORY = 'attacker/repo';

  assert.equal(GITHUB_OIDC_POLICY.issuer, 'https://token.actions.githubusercontent.com');
  assert.equal(GITHUB_OIDC_POLICY.audience, 'https://mcp.wealthtechinnovations.com/deploy/github/s1');
  assert.equal(GITHUB_OIDC_POLICY.repository, 'Patricked-code/MCP');
  assert.equal(GITHUB_OIDC_POLICY.repositoryId, '1285534440');
  assert.equal(GITHUB_OIDC_POLICY.owner, 'Patricked-code');
  assert.equal(GITHUB_OIDC_POLICY.ownerId, '270385782');
  assert.equal(GITHUB_OIDC_POLICY.ref, 'refs/heads/main');
  assert.equal(
    GITHUB_OIDC_POLICY.workflowRef,
    'Patricked-code/MCP/.github/workflows/mcp-deploy.yml@refs/heads/main'
  );
  assert.deepEqual(GITHUB_OIDC_POLICY.allowedEvents, ['push', 'workflow_dispatch']);
  assert.equal(githubOidcJwksUrl(), 'https://token.actions.githubusercontent.com/.well-known/jwks');

  delete process.env.MCP_GITHUB_OIDC_AUDIENCE;
  delete process.env.MCP_GITHUB_OIDC_REPOSITORY;
});

test('un token RS256 GitHub strictement conforme est accepté et lié au SHA demandé', async () => {
  const claims = await verifyGithubOidcToken(signToken(), SHA, { jwks, nowEpochSeconds: NOW });
  assert.equal(claims.sha, SHA);
  assert.equal(claims.run_id, '31317000000');
  assert.equal(claims.repository, 'Patricked-code/MCP');
});

test('workflow_dispatch est accepté mais aucun autre événement', async () => {
  await verifyGithubOidcToken(signToken({ event_name: 'workflow_dispatch' }), SHA, {
    jwks,
    nowEpochSeconds: NOW
  });
  await assert.rejects(
    verifyGithubOidcToken(signToken({ event_name: 'pull_request' }), SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_event_not_allowed/
  );
});

test('la signature, algorithme, kid et type JWT sont fail-closed', async () => {
  const attacker = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const badSigningInput = `${encodeJson({ alg: 'RS256', typ: 'JWT', kid: 'test-key' })}.${encodeJson({
    iss: GITHUB_OIDC_POLICY.issuer,
    aud: GITHUB_OIDC_POLICY.audience,
    repository: GITHUB_OIDC_POLICY.repository,
    repository_id: GITHUB_OIDC_POLICY.repositoryId,
    repository_owner: GITHUB_OIDC_POLICY.owner,
    repository_owner_id: GITHUB_OIDC_POLICY.ownerId,
    ref: GITHUB_OIDC_POLICY.ref,
    sha: SHA,
    workflow_ref: GITHUB_OIDC_POLICY.workflowRef,
    event_name: 'push',
    run_id: '1',
    iat: NOW - 10,
    nbf: NOW - 10,
    exp: NOW + 100
  })}`;
  const attackerSigner = createSign('RSA-SHA256');
  attackerSigner.update(badSigningInput);
  attackerSigner.end();
  const badSignature = `${badSigningInput}.${attackerSigner.sign(attacker.privateKey).toString('base64url')}`;

  await assert.rejects(verifyGithubOidcToken(badSignature, SHA, { jwks, nowEpochSeconds: NOW }), /oidc_signature_invalid/);
  await assert.rejects(
    verifyGithubOidcToken(signToken({}, { alg: 'HS256' }), SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_alg_invalid/
  );
  await assert.rejects(
    verifyGithubOidcToken(signToken({}, { kid: 'unknown' }), SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_kid_unknown/
  );
  await assert.rejects(
    verifyGithubOidcToken(signToken({}, { typ: 'NOT-JWT' }), SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_typ_invalid/
  );
});

test('expiration, nbf et durée incohérente sont refusés', async () => {
  await assert.rejects(
    verifyGithubOidcToken(signToken({ exp: NOW - 1 }), SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_expired/
  );
  await assert.rejects(
    verifyGithubOidcToken(signToken({ nbf: NOW + 1 }), SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_not_yet_valid/
  );
  await assert.rejects(
    verifyGithubOidcToken(signToken({ iat: NOW + 30 }), SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_iat_invalid/
  );
});

const mismatches: Array<[string, unknown, RegExp]> = [
  ['iss', 'https://issuer.invalid', /oidc_issuer_invalid/],
  ['aud', 'wrong-audience', /oidc_audience_invalid/],
  ['repository', 'attacker/MCP', /oidc_repository_invalid/],
  ['repository_id', '999', /oidc_repository_id_invalid/],
  ['repository_owner', 'attacker', /oidc_owner_invalid/],
  ['repository_owner_id', '999', /oidc_owner_id_invalid/],
  ['ref', 'refs/heads/feature', /oidc_ref_invalid/],
  ['workflow_ref', 'Patricked-code/MCP/.github/workflows/other.yml@refs/heads/main', /oidc_workflow_invalid/]
];

for (const [claim, value, error] of mismatches) {
  test(`le claim ${claim} incorrect est refusé`, async () => {
    await assert.rejects(
      verifyGithubOidcToken(signToken({ [claim]: value }), SHA, { jwks, nowEpochSeconds: NOW }),
      error
    );
  });
}

test('le SHA du token doit être exactement le SHA complet demandé', async () => {
  await assert.rejects(
    verifyGithubOidcToken(signToken({ sha: 'b'.repeat(40) }), SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_sha_mismatch/
  );
  await assert.rejects(
    verifyGithubOidcToken(signToken(), 'a'.repeat(12), { jwks, nowEpochSeconds: NOW }),
    /requested_sha_invalid/
  );
});

test('run_id doit être borné et numérique pour le futur identifiant de job', async () => {
  await assert.rejects(
    verifyGithubOidcToken(signToken({ run_id: '../../tmp' }), SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_run_id_invalid/
  );
  await assert.rejects(
    verifyGithubOidcToken(signToken({ run_id: '9'.repeat(40) }), SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_run_id_invalid/
  );
});

test('un token surdimensionné ou une JWKS non bornée est refusé avant vérification', async () => {
  const hugeToken = `a.${'b'.repeat(20_000)}.c`;
  await assert.rejects(
    verifyGithubOidcToken(hugeToken, SHA, { jwks, nowEpochSeconds: NOW }),
    /oidc_token_too_large/
  );
  await assert.rejects(
    verifyGithubOidcToken(signToken(), SHA, {
      jwks: { keys: Array.from({ length: 40 }, () => publicJwk) },
      nowEpochSeconds: NOW
    }),
    /oidc_jwks_invalid/
  );
});
