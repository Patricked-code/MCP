import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20261005-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const {
  CREDENTIAL_CONSENT,
  DISCOVERY_CONSENT,
  decideConnectConsent,
  renderConnectConsentFields
} = await import('../src/github/connectConsent.js');
const { issueWebConsentTicket, verifyWebConsentTicket } = await import('../src/oauth.js');
const { renderGithubConnectionPage } = await import('../src/github/connection.js');

const BINDING = 'web-session-binding-e3';

function connection(overrides: Record<string, unknown> = {}): any {
  return {
    configured: true, connected: true, org: 'Patricked-code', login: 'octo-e3', tokenFile: '/app/secrets/github_token',
    tokenFileExists: true, tokenFileMode: '600', tokenExpiresAt: null, oauthScopes: [], orgAccessible: true,
    reposVisible: 3, canReadReposHint: true, canWriteReposHint: false, canAdminOrgHint: false, warnings: [], error: null,
    userCheckStatus: 200, orgCheckStatus: 200, ...overrides
  };
}

test('a web consent ticket is signed, expiring, bound to its purpose and to the web session', () => {
  const now = Date.parse('2026-10-05T19:00:00.000Z');
  const ticket = issueWebConsentTicket('github-connect', BINDING, now);
  assert.equal(verifyWebConsentTicket('github-connect', ticket, BINDING, now + 1000), true);
  // Another purpose, another web session, an expired, tampered or malformed ticket never verify.
  assert.equal(verifyWebConsentTicket('oauth-authorize', ticket, BINDING, now + 1000), false);
  assert.equal(verifyWebConsentTicket('github-connect', ticket, 'another-web-session', now + 1000), false);
  assert.equal(verifyWebConsentTicket('github-connect', ticket, BINDING, now + 11 * 60 * 1000), false);
  const [expiresAt, signature] = ticket.split('.');
  assert.equal(verifyWebConsentTicket('github-connect', `${Number(expiresAt) + 60_000}.${signature}`, BINDING, now), false);
  assert.equal(verifyWebConsentTicket('github-connect', `${ticket}.extra`, BINDING, now), false);
  for (const malformed of [undefined, '', 'abc', 42, ['a', 'b']]) {
    assert.equal(verifyWebConsentTicket('github-connect', malformed, BINDING, now), false, JSON.stringify(malformed));
  }
});

test('connecting a credential requires same-origin, a valid ticket and the explicit credential consent', () => {
  const granted = { sameOrigin: true, ticketValid: true, credentialConsent: CREDENTIAL_CONSENT, discoveryConsent: undefined };
  assert.deepEqual(
    { ...decideConnectConsent(granted) },
    { allowed: true, discover: false, reasonCode: 'CONSENT_GRANTED' }
  );
  // Discovery adds unknown mappings: only its own explicit consent enables it.
  assert.equal(decideConnectConsent({ ...granted, discoveryConsent: DISCOVERY_CONSENT }).discover, true);
  for (const discoveryConsent of ['on', 'true', 'yes', DISCOVERY_CONSENT.toLowerCase(), [DISCOVERY_CONSENT]]) {
    assert.equal(decideConnectConsent({ ...granted, discoveryConsent }).discover, false, JSON.stringify(discoveryConsent));
  }
  const refusals: Array<[Record<string, unknown>, string]> = [
    [{ sameOrigin: false }, 'CONSENT_CROSS_ORIGIN'],
    [{ ticketValid: false }, 'CONSENT_TICKET_INVALID'],
    [{ credentialConsent: undefined }, 'CONSENT_MISSING'],
    [{ credentialConsent: 'on' }, 'CONSENT_MISSING'],
    [{ credentialConsent: [CREDENTIAL_CONSENT] }, 'CONSENT_MISSING'],
    // Discovery consent alone never authorizes replacing the credential.
    [{ credentialConsent: undefined, discoveryConsent: DISCOVERY_CONSENT }, 'CONSENT_MISSING']
  ];
  for (const [overrides, reasonCode] of refusals) {
    const decision = decideConnectConsent({ ...granted, ...overrides } as never) as any;
    assert.deepEqual({ ...decision }, { allowed: false, discover: false, reasonCode }, JSON.stringify(overrides));
    assert.ok(Object.isFrozen(decision));
  }
});

test('the connect forms name each resource and its authority, unchecked by default', () => {
  const fields = renderConnectConsentFields({ ticket: 'ticket-e3', org: 'Patricked-code' });
  assert.match(fields, new RegExp(`name="consent_credential" value="${CREDENTIAL_CONSENT}"`));
  assert.match(fields, new RegExp(`name="consent_discovery" value="${DISCOVERY_CONSENT}"`));
  assert.match(fields, /name="consent_ticket" value="ticket-e3"/);
  assert.doesNotMatch(fields, /checked/);
  assert.match(fields, /secret du conteneur/);
  assert.match(fields, /GitRegistry/);
  assert.match(fields, /Patricked-code/);
  const escaped = renderConnectConsentFields({ ticket: '"><script>', org: '<b>x</b>' });
  assert.ok(!escaped.includes('<script>') && !escaped.includes('<b>x</b>'));

  const page = renderGithubConnectionPage(connection(), { consentTicket: 'ticket-e3' });
  const form = page.slice(page.indexOf('action="/github/connect"'), page.indexOf('</form>', page.indexOf('action="/github/connect"')));
  assert.match(form, /name="consent_credential"/);
  assert.match(form, /name="consent_ticket" value="ticket-e3"/);
});

test('recording a connection discovers repositories only with consent and audits that consent', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-e3-registry-'));
  const file = join(directory, 'registry.json');
  await copyFile('data/mcp-git-registry.json', file);
  const previous = process.env.MCP_GIT_REGISTRY_FILE;
  process.env.MCP_GIT_REGISTRY_FILE = file;
  try {
    const { recordGithubConnection, readGitRegistry } = await import('../src/github/registry.js');
    const before = await readGitRegistry();
    await recordGithubConnection(connection(), 'read', 'mcp-web:test-e3', {
      consent: { credential: true, discovery: false }
    });
    const after = await readGitRegistry();
    assert.deepEqual(after.repoMappings, before.repoMappings);
    // Only the connection is recorded: no discovery ran without its consent.
    const known = new Set(before.auditEvents.map((event: any) => event.id));
    const added = after.auditEvents.filter((event: any) => !known.has(event.id)) as any[];
    assert.deepEqual(added.map((event) => event.type), ['github.connection.recorded']);
    assert.deepEqual(added[0].metadata.consent, { credential: true, discovery: false });
  } finally {
    if (previous === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
    else process.env.MCP_GIT_REGISTRY_FILE = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test('the connect routes decide consent before any GitHub call or write and issue a fresh ticket', async () => {
  const server = await readFile('src/server.ts', 'utf8');
  for (const route of ["app.post('/github/connect'", "app.post('/git/connect'"]) {
    const start = server.indexOf(route);
    const body = server.slice(start, server.indexOf('\n  });', start));
    const decide = body.indexOf('decideConnectConsent(');
    assert.ok(decide > 0, route);
    assert.ok(decide < body.indexOf('validateGithubToken('), `${route}: consent before the GitHub call`);
    assert.ok(decide < body.indexOf('saveGithubToken('), `${route}: consent before the write`);
    assert.match(body, /isSameOriginSubmission\(req\)/);
    assert.match(body, /verifyWebConsentTicket\('github-connect'/);
    assert.match(body, /discover: consent\.discover|discovery: consent\.discover/);
  }
  for (const route of ["app.get('/git'", "app.get('/github'", "app.get('/github/:account'"]) {
    const start = server.indexOf(route);
    const body = server.slice(start, server.indexOf('\n  });', start));
    assert.match(body, /issueWebConsentTicket\('github-connect'/, route);
  }
});
