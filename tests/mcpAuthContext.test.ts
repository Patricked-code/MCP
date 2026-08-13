import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.MCP_WEB_BASE_URL ??= 'https://mcp.wealthtechinnovations.com';

const { requireBearerToken } = await import('../src/auth.js');
const { inspectOauthAccessToken, verifyOauthAccessToken } = await import('../src/oauth.js');

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function oauthToken(overrides: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1_000);
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify({
    typ: 'wealthtech-mcp-oauth',
    iss: 'https://mcp.wealthtechinnovations.com',
    aud: 'https://mcp.wealthtechinnovations.com',
    resource: 'https://mcp.wealthtechinnovations.com',
    sub: 'wealthtech-mcp-admin',
    client_id: 'chatgpt-client',
    scope: 'mcp:read mcp:write',
    iat: now,
    exp: now + 3_600,
    jti: 'unit-test-token',
    ...overrides
  }));
  const input = `${header}.${body}`;
  const signature = createHmac('sha256', process.env.MCP_AUTH_TOKEN!).update(input).digest('base64url');
  return `${input}.${signature}`;
}

function invokeMiddleware(token: string) {
  const request: Record<string, unknown> = {
    header(name: string) {
      return name === 'authorization' ? `Bearer ${token}` : undefined;
    }
  };
  const response = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as unknown,
    setHeader(name: string, value: string) { this.headers[name] = value; },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; }
  };
  let nextCalls = 0;
  requireBearerToken(request as never, response as never, () => { nextCalls += 1; });
  return { request, response, nextCalls };
}

test('le token partagé garde la décision existante et attache une identité sanitizée', () => {
  const { request, response, nextCalls } = invokeMiddleware(process.env.MCP_AUTH_TOKEN!);
  assert.equal(nextCalls, 1);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(request.auth, {
    token: process.env.MCP_AUTH_TOKEN,
    clientId: 'wealthtech-shared-mcp',
    scopes: ['mcp:read'],
    extra: {
      governedPrincipalId: null,
      identityAssurance: 'shared_credential'
    }
  });
});

test('OAuth conserve 200/401 et expose sujet, client, scopes et expiration sans vue token', () => {
  const token = oauthToken();
  const inspected = inspectOauthAccessToken(token, 'mcp:read');
  assert.deepEqual(inspected, {
    subject: 'wealthtech-mcp-admin',
    clientId: 'chatgpt-client',
    scopes: ['mcp:read', 'mcp:write'],
    expiresAt: inspected?.expiresAt
  });
  assert.equal(Object.hasOwn(inspected ?? {}, 'token'), false);
  assert.equal(verifyOauthAccessToken(token, 'mcp:write'), true);

  const accepted = invokeMiddleware(token);
  assert.equal(accepted.nextCalls, 1);
  assert.equal(accepted.response.statusCode, 200);
  assert.deepEqual(accepted.request.auth, {
    token,
    clientId: 'chatgpt-client',
    scopes: ['mcp:read', 'mcp:write'],
    expiresAt: inspected?.expiresAt,
    extra: {
      governedPrincipalId: 'oauth:wealthtech-mcp-admin',
      identityAssurance: 'oauth_subject'
    }
  });

  const rejected = invokeMiddleware(oauthToken({ exp: 1 }));
  assert.equal(rejected.nextCalls, 0);
  assert.equal(rejected.response.statusCode, 401);
  assert.deepEqual(rejected.response.body, { error: 'unauthorized' });
  assert.equal(Object.hasOwn(rejected.request, 'auth'), false);
});
