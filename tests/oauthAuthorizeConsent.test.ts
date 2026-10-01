import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { registerOauthRoutes, inspectOauthAccessToken, oauthIssuer } = await import('../src/oauth.js');

const REDIRECT_URI = 'https://client.example/callback';

function base64Url(input: Buffer): string {
  return input.toString('base64').replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_');
}

function pkce() {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function authorizeQuery(challenge: string, overrides: Record<string, string> = {}): URLSearchParams {
  return new URLSearchParams({
    response_type: 'code',
    client_id: 'https://client.example/oauth-client',
    redirect_uri: REDIRECT_URI,
    state: 'state-123',
    scope: 'mcp:read',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: oauthIssuer(),
    ...overrides
  });
}

async function withOauthServer(
  authenticated: boolean,
  fn: (baseUrl: string) => Promise<void>
): Promise<void> {
  const app = express();
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  registerOauthRoutes(app, { isAuthenticated: () => authenticated });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function unescapeHtml(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function hiddenFields(html: string): URLSearchParams {
  const fields = new URLSearchParams();
  for (const match of html.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"/g)) {
    fields.append(match[1]!, unescapeHtml(match[2]!));
  }
  return fields;
}

async function consentForm(baseUrl: string, query: URLSearchParams) {
  const response = await fetch(`${baseUrl}/oauth/authorize?${query}`, { redirect: 'manual' });
  const html = await response.text();
  return { response, html, fields: hiddenFields(html) };
}

async function submitConsent(
  baseUrl: string,
  fields: URLSearchParams,
  decision: 'approve' | 'deny',
  headers: Record<string, string> = {}
) {
  const body = new URLSearchParams(fields);
  body.set('decision', decision);
  return fetch(`${baseUrl}/oauth/authorize`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body
  });
}

test('an authenticated authorize request renders an explicit consent page instead of issuing a code', async () => {
  const { challenge } = pkce();
  await withOauthServer(true, async (baseUrl) => {
    const { response, html } = await consentForm(baseUrl, authorizeQuery(challenge));

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
    assert.match(html, /<form method="post" action="\/oauth\/authorize">/);
    assert.match(html, /https:\/\/client\.example/);
    assert.match(html, /mcp:read/);
    assert.match(html, /name="decision" value="approve"/);
    assert.match(html, /name="decision" value="deny"/);
    assert.match(html, /name="consent_ticket"/);
  });
});

test('an approved consent issues a code for the original request and the token exchange still works', async () => {
  const { verifier, challenge } = pkce();
  await withOauthServer(true, async (baseUrl) => {
    const { fields } = await consentForm(baseUrl, authorizeQuery(challenge));
    const approved = await submitConsent(baseUrl, fields, 'approve');

    assert.equal(approved.status, 302);
    const location = new URL(approved.headers.get('location') ?? 'about:blank');
    assert.equal(`${location.origin}${location.pathname}`, REDIRECT_URI);
    assert.equal(location.searchParams.get('state'), 'state-123');
    assert.equal(location.searchParams.get('iss'), oauthIssuer());
    const code = location.searchParams.get('code');
    assert.ok(code);

    const token = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: 'https://client.example/oauth-client',
        code_verifier: verifier,
        resource: oauthIssuer()
      })
    });
    assert.equal(token.status, 200);
    const body = await token.json() as { access_token: string; scope: string };
    assert.equal(body.scope, 'mcp:read');
    assert.equal(inspectOauthAccessToken(body.access_token, 'mcp:read')?.subject, 'wealthtech-mcp-admin');
  });
});

test('a denied consent redirects with access_denied and never issues a code', async () => {
  const { challenge } = pkce();
  await withOauthServer(true, async (baseUrl) => {
    const { fields } = await consentForm(baseUrl, authorizeQuery(challenge));
    const denied = await submitConsent(baseUrl, fields, 'deny');

    assert.equal(denied.status, 302);
    const location = new URL(denied.headers.get('location') ?? 'about:blank');
    assert.equal(`${location.origin}${location.pathname}`, REDIRECT_URI);
    assert.equal(location.searchParams.get('error'), 'access_denied');
    assert.equal(location.searchParams.get('state'), 'state-123');
    assert.equal(location.searchParams.get('code'), null);
  });
});

test('tampered consent parameters or tickets are refused without issuing a code', async () => {
  const { challenge } = pkce();
  await withOauthServer(true, async (baseUrl) => {
    const { fields } = await consentForm(baseUrl, authorizeQuery(challenge));

    const tamperedRedirect = new URLSearchParams(fields);
    tamperedRedirect.set('redirect_uri', 'https://attacker.example/callback');
    const tamperedScope = new URLSearchParams(fields);
    tamperedScope.set('scope', 'mcp:read mcp:write');
    const tamperedTicket = new URLSearchParams(fields);
    tamperedTicket.set('consent_ticket', `${Date.now() + 60_000}.${'A'.repeat(43)}`);
    const missingTicket = new URLSearchParams(fields);
    missingTicket.delete('consent_ticket');

    for (const candidate of [tamperedRedirect, tamperedScope, tamperedTicket, missingTicket]) {
      for (const decision of ['approve', 'deny'] as const) {
        const response = await submitConsent(baseUrl, candidate, decision);
        assert.equal(response.status, 400, `${decision} ${candidate.toString()}`);
        assert.equal(response.headers.get('location'), null);
      }
    }
  });
});

test('a consent submission without an operator session is refused', async () => {
  const { challenge } = pkce();
  let fields = new URLSearchParams();
  await withOauthServer(true, async (baseUrl) => {
    fields = (await consentForm(baseUrl, authorizeQuery(challenge))).fields;
  });
  await withOauthServer(false, async (baseUrl) => {
    const response = await submitConsent(baseUrl, fields, 'approve');
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('location'), null);
  });
});

test('a cross-site consent submission is refused', async () => {
  const { challenge } = pkce();
  await withOauthServer(true, async (baseUrl) => {
    const { fields } = await consentForm(baseUrl, authorizeQuery(challenge));

    for (const headers of [
      { origin: 'https://attacker.example' },
      { 'sec-fetch-site': 'cross-site' },
      { 'sec-fetch-site': 'same-site' }
    ]) {
      const response = await submitConsent(baseUrl, fields, 'approve', headers);
      assert.equal(response.status, 403, JSON.stringify(headers));
      assert.equal(response.headers.get('location'), null);
    }

    const sameOrigin = await submitConsent(baseUrl, fields, 'approve', {
      origin: new URL(oauthIssuer()).origin,
      'sec-fetch-site': 'same-origin'
    });
    assert.equal(sameOrigin.status, 302);
  });
});

test('an expired consent ticket is refused', async (t) => {
  const { challenge } = pkce();
  await withOauthServer(true, async (baseUrl) => {
    const { fields } = await consentForm(baseUrl, authorizeQuery(challenge));
    t.mock.timers.enable({ apis: ['Date'], now: Date.now() + 11 * 60 * 1000 });
    try {
      const response = await submitConsent(baseUrl, fields, 'approve');
      assert.equal(response.status, 400);
      assert.equal(response.headers.get('location'), null);
    } finally {
      t.mock.timers.reset();
    }
  });
});

test('an unauthenticated authorize request still redirects to the operator login', async () => {
  const { challenge } = pkce();
  await withOauthServer(false, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/oauth/authorize?${authorizeQuery(challenge)}`, {
      redirect: 'manual'
    });
    assert.equal(response.status, 302);
    assert.match(response.headers.get('location') ?? '', /^\/login\?next=/);
  });
});

test('the consent page escapes untrusted request values', async () => {
  const { challenge } = pkce();
  await withOauthServer(true, async (baseUrl) => {
    const { response, html } = await consentForm(baseUrl, authorizeQuery(challenge, {
      client_id: 'client"><script>alert(1)</script>',
      state: '"><img src=x onerror=alert(1)>'
    }));

    assert.equal(response.status, 200);
    assert.equal(html.includes('<script>alert(1)</script>'), false);
    assert.equal(html.includes('<img src=x'), false);
    assert.match(html, /&lt;script&gt;/);
  });
});

test('invalid authorization requests still fail before any consent page', async () => {
  const { challenge } = pkce();
  await withOauthServer(true, async (baseUrl) => {
    const missingChallenge = authorizeQuery(challenge);
    missingChallenge.delete('code_challenge');
    const insecureRedirect = authorizeQuery(challenge, { redirect_uri: 'http://client.example/callback' });

    for (const query of [missingChallenge, insecureRedirect]) {
      const response = await fetch(`${baseUrl}/oauth/authorize?${query}`, { redirect: 'manual' });
      assert.equal(response.status, 400);
      const body = await response.json() as { error: string };
      assert.equal(body.error, 'invalid_request');
    }
  });
});
