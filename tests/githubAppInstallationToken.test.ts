import assert from 'node:assert/strict';
import { generateKeyPairSync, createPublicKey, verify } from 'node:crypto';
import test from 'node:test';
import { mintGithubAppRepoToken, type GithubAppTokenDeps } from '../src/github/appInstallationToken.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const now = new Date('2026-10-23T01:00:00.000Z');
const installation = { appId: '87654', installationId: 145098929, accountLogin: 'chainsolutions-wealthtech' };
function deps(fetchImpl: typeof fetch): GithubAppTokenDeps {
  return { readPrivateKey: async () => privateKeyPem, now: () => now, fetchImpl };
}
function response(value: unknown, status = 201): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}

test('GitHub App RED: mint a short-lived token scoped to one installed repository', async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(String(url), 'https://api.github.com/app/installations/145098929/access_tokens');
    assert.equal(init?.method, 'POST');
    const json = JSON.parse(String(init?.body));
    assert.deepEqual(json, { repositories: ['MCP'], permissions: { contents: 'read' } });
    const auth = String((init?.headers as Record<string, string>)?.Authorization);
    assert.match(auth, /^Bearer [A-Za-z0-9._-]+$/);
    const parts = auth.replace(/^Bearer /, '').split('.');
    assert.equal(parts.length, 3);
    assert.deepEqual(JSON.parse(Buffer.from(parts[0]!, 'base64url').toString()), { alg: 'RS256', typ: 'JWT' });
    assert.equal(JSON.parse(Buffer.from(parts[1]!, 'base64url').toString()).iss, '87654');
    assert.ok(verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), publicKey, Buffer.from(parts[2]!, 'base64url')));
    return response({ token: 'ghs_in_memory_test', expires_at: '2026-10-23T02:00:00.000Z' });
  };
  const result = await mintGithubAppRepoToken({ installation, repository: 'chainsolutions-wealthtech/MCP', contentsPermission: 'read' }, deps(fakeFetch));
  assert.equal(calls, 1);
  assert.deepEqual(result, { token: 'ghs_in_memory_test', expiresAt: '2026-10-23T02:00:00.000Z', repository: 'chainsolutions-wealthtech/MCP', installationId: 145098929 });
});

test('GitHub App RED: refuse mismatched owner and malformed repository BEFORE private key or network', async () => {
  let reads = 0;
  let requests = 0;
  const d: GithubAppTokenDeps = { readPrivateKey: async () => {reads++; return privateKeyPem}, now: () => now, fetchImpl: async () => {requests++; return response({})} };
  for (const repository of ['Patricked-code/MCP', '../MCP', 'chainsolutions-wealthtech/test;id', 'chainsolutions-wealthtech/']) {
    await assert.rejects(mintGithubAppRepoToken({installation,repository,contentsPermission:'read'},d), /GITHUB_APP_TARGET_INVALID/);
  }
  assert.equal(reads, 0);
  assert.equal(requests, 0);
});

test('GitHub App RED: installation revoked or missing permission fails closed', async () => {
  for (const status of [401,403,404,422]) {
    await assert.rejects(
      mintGithubAppRepoToken({ installation, repository: 'chainsolutions-wealthtech/MCP', contentsPermission: 'write' }, deps(async ()=>response({ message: 'not available' }, status))),
      /GITHUB_APP_INSTALLATION_TOKEN_REFUSED/
    );
  }
});

test('GitHub App RED: reject empty, expired and malformed token responses', async () => {
  for (const payload of [{ token: '', expires_at: '2026-10-23T02:00:00.000Z' }, {token:'t',expires_at:'2026-10-23T00:59:00.000Z'}, {token:'t',expires_at:'garbage'}]) {
    await assert.rejects(
      mintGithubAppRepoToken({installation,repository:'chainsolutions-wealthtech/MCP',contentsPermission:'read'},deps(async()=>response(payload))),
      /GITHUB_APP_INSTALLATION_TOKEN_INVALID/
    );
  }
});
