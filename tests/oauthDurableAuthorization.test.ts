import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.MCP_WEB_BASE_URL ??= 'https://mcp.wealthtechinnovations.com';

const { inspectOauthAccessToken } = await import('../src/oauth.js');
const { createOAuthRefreshGrantService } = await import('../src/oauthRefreshTokens.js');

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function signedAccessToken(overrides: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1_000);
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify({
    typ: 'wealthtech-mcp-oauth',
    iss: 'https://mcp.wealthtechinnovations.com',
    aud: 'https://mcp.wealthtechinnovations.com',
    resource: 'https://mcp.wealthtechinnovations.com',
    sub: 'wealthtech-mcp-admin',
    client_id: 'chatgpt-client',
    scope: 'mcp:read offline_access',
    iat: now,
    exp: now + 3_600,
    jti: 'durable-auth-test',
    oauth_attempt_ref: 'oa_abcdefghijklmnopqrstuv',
    grant_id: '11111111-1111-4111-8111-111111111111',
    ...overrides
  }));
  const input = `${header}.${body}`;
  const signature = createHmac('sha256', process.env.MCP_AUTH_TOKEN!).update(input).digest('base64url');
  return `${input}.${signature}`;
}

test('A3.2 projette des références OAuth bornées sans exposer de token brut', () => {
  const identity = inspectOauthAccessToken(signedAccessToken(), 'mcp:read');
  assert.deepEqual(identity, {
    subject: 'wealthtech-mcp-admin',
    clientId: 'chatgpt-client',
    scopes: ['mcp:read', 'offline_access'],
    expiresAt: identity?.expiresAt,
    oauthAttemptRef: 'oa_abcdefghijklmnopqrstuv',
    oauthGrantId: '11111111-1111-4111-8111-111111111111'
  });
  assert.equal(Object.hasOwn(identity ?? {}, 'token'), false);
  assert.equal(Object.hasOwn(identity ?? {}, 'refreshToken'), false);
});

test('refresh token durable: rotation, hash-only persistence et replay revocation', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'mcp-oauth-refresh-'));
  const storePath = path.join(directory, 'refresh-grants.json');
  let now = new Date('2026-09-30T00:00:00.000Z');

  try {
    const service = createOAuthRefreshGrantService({
      storePath,
      idleTtlSeconds: 30 * 24 * 60 * 60,
      absoluteTtlSeconds: 90 * 24 * 60 * 60,
      now: () => now
    });

    const issued = await service.issue({
      subject: 'wealthtech-mcp-admin',
      clientId: 'chatgpt-client',
      resource: 'https://mcp.wealthtechinnovations.com',
      scopes: ['mcp:read', 'offline_access'],
      oauthAttemptRef: 'oa_abcdefghijklmnopqrstuv'
    });

    assert.match(issued.refreshToken, /^mcp_rt1\.[0-9a-f-]{36}\.0\.[A-Za-z0-9_-]{32,}$/);
    assert.match(issued.grantId, /^[0-9a-f-]{36}$/);

    const persistedAfterIssue = await readFile(storePath, 'utf8');
    assert.equal(persistedAfterIssue.includes(issued.refreshToken), false);
    assert.equal(persistedAfterIssue.includes(createHash('sha256').update(issued.refreshToken).digest('hex')), true);

    now = new Date('2026-09-30T01:00:00.000Z');
    const rotated = await service.rotate({
      refreshToken: issued.refreshToken,
      clientId: 'chatgpt-client',
      resource: 'https://mcp.wealthtechinnovations.com'
    });

    assert.equal(rotated.grantId, issued.grantId);
    assert.equal(rotated.oauthAttemptRef, 'oa_abcdefghijklmnopqrstuv');
    assert.deepEqual(rotated.scopes, ['mcp:read', 'offline_access']);
    assert.notEqual(rotated.refreshToken, issued.refreshToken);
    assert.match(rotated.refreshToken, /^mcp_rt1\.[0-9a-f-]{36}\.1\.[A-Za-z0-9_-]{32,}$/);

    await assert.rejects(
      service.rotate({
        refreshToken: issued.refreshToken,
        clientId: 'chatgpt-client',
        resource: 'https://mcp.wealthtechinnovations.com'
      }),
      /OAUTH_REFRESH_TOKEN_REPLAY/
    );

    await assert.rejects(
      service.rotate({
        refreshToken: rotated.refreshToken,
        clientId: 'chatgpt-client',
        resource: 'https://mcp.wealthtechinnovations.com'
      }),
      /OAUTH_REFRESH_GRANT_REVOKED/
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('le serveur OAuth annonce refresh_token et offline_access de façon additive', async () => {
  const source = await readFile(new URL('../src/oauth.ts', import.meta.url), 'utf8');

  assert.match(source, /grant_types_supported:[^\n]*authorization_code[^\n]*refresh_token/s);
  assert.match(source, /SUPPORTED_SCOPES[^\n]*offline_access/s);
  assert.match(source, /grantType\s*===\s*['"]refresh_token['"]/);
  assert.match(source, /refresh_token/);
  assert.match(source, /offline_access/);
});
