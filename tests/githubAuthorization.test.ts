import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after } from 'node:test';

const TEST_CREDENTIAL = ['test', 'credential', 'value', 'only'].join('-');
const tempDirectory = await mkdtemp(join(tmpdir(), 'mcp-github-auth-'));
const credentialFile = join(tempDirectory, 'github_credential');
await writeFile(credentialFile, TEST_CREDENTIAL, { mode: 0o600 });

process.env.NODE_ENV = 'test';
process.env.MCP_AUTH_TOKEN = 'test-only-mcp-auth-value-000000';
process.env.S1_HOST = '127.0.0.1';
process.env.S1_KEY_PATH = '/tmp/test-s1-key';
process.env.S2_HOST = '127.0.0.1';
process.env.S2_KEY_PATH = '/tmp/test-s2-key';
process.env.GITHUB_TOKEN_FILE = credentialFile;
process.env.GITHUB_API_BASE = 'https://api.github.test';
process.env.GITHUB_API_ALLOWED_HOSTS = 'api.github.test';
process.env.GITHUB_REQUEST_TIMEOUT_MS = '100';

const {
  buildGithubAuthorizationRemediations,
  classifyGithubAuthorizationFailure,
  diagnoseGithubPrAuthorization,
  resolveGithubApiBase
} = await import('../src/github/authorizationDiagnostics.js');

const originalFetch = globalThis.fetch;

after(async () => {
  globalThis.fetch = originalFetch;
  await rm(tempDirectory, { recursive: true, force: true });
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function installSequence(responses: Response[], calls: string[]): void {
  globalThis.fetch = (async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => {
    calls.push(String(input));
    assert.ok(init?.signal, 'Chaque requête doit recevoir un AbortSignal.');
    const response = responses.shift();
    assert.ok(response, 'Réponse simulée manquante.');
    return response;
  }) as typeof fetch;
}

test('classifie les réponses et distingue une PR inexistante', () => {
  assert.equal(classifyGithubAuthorizationFailure(200, null, 'repository'), 'none');
  assert.equal(classifyGithubAuthorizationFailure(401, 'Bad credentials', 'authenticated_user'), 'token_expired_or_revoked');
  assert.equal(classifyGithubAuthorizationFailure(404, 'Not Found', 'repository'), 'repository_not_visible_or_not_selected');
  assert.equal(classifyGithubAuthorizationFailure(403, 'Resource not accessible by integration', 'pull_request_list'), 'pull_request_permission_missing');
  assert.equal(classifyGithubAuthorizationFailure(404, 'Not Found', 'pull_request'), 'not_found');
  assert.equal(classifyGithubAuthorizationFailure(403, 'API rate limit exceeded', 'repository'), 'rate_limited');
  assert.equal(classifyGithubAuthorizationFailure(403, 'SAML enforcement', 'repository'), 'sso_authorization_required');
});

test('refuse les API non HTTPS ou non autorisées', () => {
  assert.equal(
    resolveGithubApiBase('https://github.example.test/api/v3', 'github.example.test'),
    'https://github.example.test/api/v3'
  );
  assert.throws(() => resolveGithubApiBase('http://api.github.com', 'api.github.com'), /HTTPS/);
  assert.throws(() => resolveGithubApiBase('https://untrusted.example', 'api.github.com'), /non autorisé/);
});

test('les remédiations restent limitées au dépôt', () => {
  const steps = buildGithubAuthorizationRemediations('pull_request_permission_missing', 'Patricked-code', 'MCP');
  assert.ok(steps.some((step) => step.includes('Pull requests: Read')));
  assert.ok(steps.some((step) => step.includes('Patricked-code/MCP')));
});

test('les probes s’arrêtent après échec et les résultats restent publics', async () => {
  const missingPrCalls: string[] = [];
  installSequence([
    jsonResponse(200, { login: 'diagnostic-user' }),
    jsonResponse(200, { full_name: 'Patricked-code/MCP' }),
    jsonResponse(200, []),
    jsonResponse(404, { message: 'Not Found' })
  ], missingPrCalls);

  const missingPr = await diagnoseGithubPrAuthorization({
    owner: 'Patricked-code',
    repo: 'MCP',
    pullRequestNumber: 999
  });

  assert.equal(missingPr.primaryFailure, 'not_found');
  assert.equal(missingPr.probes.length, 4);
  assert.equal(missingPrCalls.length, 4);
  assert.equal(JSON.stringify(missingPr).includes(TEST_CREDENTIAL), false);

  const permissionCalls: string[] = [];
  installSequence([
    jsonResponse(200, { login: 'diagnostic-user' }),
    jsonResponse(200, { full_name: 'Patricked-code/MCP' }),
    jsonResponse(403, { message: 'Resource not accessible by integration' })
  ], permissionCalls);

  const denied = await diagnoseGithubPrAuthorization({
    owner: 'Patricked-code',
    repo: 'MCP',
    pullRequestNumber: 21
  });

  assert.equal(denied.primaryFailure, 'pull_request_permission_missing');
  assert.equal(denied.probes.length, 3);
  assert.equal(permissionCalls.length, 3);
  assert.equal(JSON.stringify(denied).includes(TEST_CREDENTIAL), false);
});

test('interrompt une requête réseau bloquée', async () => {
  globalThis.fetch = (async (
    _input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal;
    assert.ok(signal);
    const abort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  })) as typeof fetch;

  const startedAt = Date.now();
  const result = await diagnoseGithubPrAuthorization({ owner: 'Patricked-code', repo: 'MCP' });

  assert.equal(result.primaryFailure, 'network_error');
  assert.ok(Date.now() - startedAt < 2_000);
  assert.equal(JSON.stringify(result).includes(TEST_CREDENTIAL), false);
  globalThis.fetch = originalFetch;
});
