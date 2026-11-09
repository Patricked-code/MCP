import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  C26_OAUTH_SUBJECT,
  C26_OAUTH_COOKIE_NAME,
  verifyC26OAuthLoginToken,
  issueC26OAuthCookie,
  c26SubjectFromCookie,
  clearC26OAuthCookie
} = await import('../src/oauthC26WebIdentity.js');

const c26Secret = 'C26testRandomSecret_' + 'M'.repeat(48);
const wrongSecret = 'DifferentSecret_OnlyForTests_' + 'X'.repeat(48);

test('C26 OAuth-only identity is opt-in, requires the distinct secret, and is time-bound', () => {
  const at = Date.parse('2026-11-09T00:00:00.000Z');
  assert.equal(verifyC26OAuthLoginToken(c26Secret, () => null), false);
  assert.equal(verifyC26OAuthLoginToken(c26Secret, () => c26Secret), true);
  assert.equal(verifyC26OAuthLoginToken('not-the-password', () => c26Secret), false);
  const cookie = issueC26OAuthCookie({
    now: at, maxAgeSeconds: 3600, secure: true, readSecret: () => c26Secret
  });
  assert.match(cookie, /HttpOnly; SameSite=Lax; Path=\/oauth; Max-Age=3600; Secure/);
  assert.equal(cookie.includes('mcp_web_session='), false);
  assert.equal(cookie.includes(c26Secret), false);
  assert.ok(cookie.startsWith(`${C26_OAUTH_COOKIE_NAME}=`));
  const header = cookie.split(';')[0];
  assert.equal(c26SubjectFromCookie(header, { now: at + 5_000, readSecret: () => c26Secret }), C26_OAUTH_SUBJECT);
  assert.equal(c26SubjectFromCookie(header, { now: at + 3_600_001, readSecret: () => c26Secret }), null);
  assert.equal(c26SubjectFromCookie(header, { now: at + 5_000, readSecret: () => wrongSecret }), null);
  assert.equal(c26SubjectFromCookie(header, { now: at + 5_000, readSecret: () => null }), null);
  assert.match(clearC26OAuthCookie(true), /Path=\/oauth; Max-Age=0; Secure/);
});

test('C26 identity is not elevatable by a legacy administrative cookie or a malformed cookie', () => {
  const at = Date.now();
  const validCookie = issueC26OAuthCookie({
    now: at, maxAgeSeconds: 3600, secure: true, readSecret: () => c26Secret
  }).split(';')[0];
  const token = validCookie.split('=')[1];
  assert.ok(token);
  const forged = `${C26_OAUTH_COOKIE_NAME}=${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`;
  assert.equal(c26SubjectFromCookie(forged, { now: at, readSecret: () => c26Secret }), null);
  assert.equal(c26SubjectFromCookie('mcp_web_session=not-c26', { now: at, readSecret: () => c26Secret }), null);
  assert.equal(c26SubjectFromCookie(`${C26_OAUTH_COOKIE_NAME}=%invalid`, { now: at, readSecret: () => c26Secret }), null);
  assert.throws(() => issueC26OAuthCookie({
    now: at, maxAgeSeconds: 3600, secure: true, readSecret: () => null
  }), /C26_OAUTH_IDENTITY_NOT_PROVISIONED/);
});

test('C26 subject can only enter the OAuth route; web admin and shared Bearer remain legacy-only', async () => {
  const server = await readFile(new URL('../src/server.ts', import.meta.url), 'utf8');
  const auth = await readFile(new URL('../src/auth.ts', import.meta.url), 'utf8');
  assert.match(server, /registerOauthRoutes\(app, \{\s*isAuthenticated: isOAuthWebAuthenticated,\s*authenticatedSubject: oauthAuthenticatedSubject/);
  assert.match(server, /function requireWebLogin\([\s\S]*?if \(isWebAuthenticated\(req\)\)/);
  assert.doesNotMatch(server.match(/function isWebAuthenticated\([\s\S]*?\n\}/)?.[0] ?? '', /c26SubjectFromCookie/);
  assert.match(server, /issueC26OAuthCookie\(\{/);
  assert.match(auth, /token === env\.MCP_AUTH_TOKEN/);
  assert.doesNotMatch(auth, /C26_OAUTH_COOKIE_NAME|verifyC26OAuthLoginToken/);
});
