import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { createGithubOperationalContextCollector } = await import(
  '../src/governedContext/github.js'
);

const SHA = 'a'.repeat(40);
const BRANCH = 'mcp/session-continuity-v1-20260813';

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

test('collecte PR/checks/reviews/threads/ruleset avec cache et single-flight bornés', async () => {
  const calls: Array<{ url: string; method: string; authorization: string | null }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({
      url,
      method: init?.method ?? 'GET',
      authorization: new Headers(init?.headers).get('authorization')
    });
    await Promise.resolve();
    if (url.endsWith('/commits/main')) return json({ sha: SHA });
    if (url.includes('/pulls?')) return json([{
      number: 44,
      state: 'open',
      draft: false,
      merged_at: null,
      base: { ref: 'main' },
      head: { ref: BRANCH, sha: SHA },
      updated_at: '2026-08-13T08:00:00Z'
    }]);
    if (url.includes('/check-runs?')) return json({
      total_count: 3,
      check_runs: [
        { status: 'completed', conclusion: 'success' },
        { status: 'completed', conclusion: 'failure' },
        { status: 'in_progress', conclusion: null }
      ]
    });
    if (url.includes('/pulls/44/reviews?')) return json([
      { state: 'APPROVED' },
      { state: 'CHANGES_REQUESTED' }
    ]);
    if (url.endsWith('/graphql')) return json({
      data: {
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: [{ isResolved: false }, { isResolved: true }]
            }
          }
        }
      }
    });
    if (url.includes('/rulesets?')) return json([{
      name: 'main-protection',
      enforcement: 'active',
      rules: [
        { type: 'pull_request' },
        {
          type: 'required_status_checks',
          parameters: {
            required_status_checks: [{ context: 'validate' }, { context: 'security' }]
          }
        },
        { type: 'required_conversation_resolution' }
      ]
    }]);
    return json({ message: 'unexpected endpoint' }, 500);
  };
  const collector = createGithubOperationalContextCollector({
    fetchImpl,
    readToken: async () => 'sensitive-token-never-returned',
    apiBase: 'https://api.github.test',
    allowedHosts: 'api.github.test',
    now: () => new Date('2026-08-13T08:00:00.000Z'),
    timeoutMs: 1_000,
    cacheTtlMs: 15_000
  });

  const [first, joined] = await Promise.all([
    collector.collect(BRANCH),
    collector.collect(BRANCH)
  ]);
  const cached = await collector.collect(BRANCH);
  const cacheOnly = await collector.getCurrent(BRANCH);

  assert.deepEqual(joined, first);
  assert.deepEqual(cached, first);
  assert.deepEqual(cacheOnly, first);
  assert.equal(calls.length, 6);
  assert.equal(calls.every((call) => call.authorization === 'Bearer sensitive-token-never-returned'), true);
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1);
  assert.deepEqual(first, {
    status: 'CURRENT',
    observedAt: '2026-08-13T08:00:00.000Z',
    mainHead: SHA,
    workBranch: BRANCH,
    pullRequest: {
      number: 44,
      state: 'open',
      draft: false,
      merged: false,
      base: 'main',
      head: BRANCH,
      headSha: SHA,
      updatedAt: '2026-08-13T08:00:00.000Z'
    },
    checks: {
      status: 'in_progress',
      conclusion: 'failure',
      total: 3,
      failed: 1
    },
    reviews: {
      approvals: 1,
      changesRequested: 1,
      unresolvedThreads: 1
    },
    ruleset: {
      name: 'main-protection',
      enforcement: 'active',
      requiresPullRequest: true,
      requiredStatusChecks: ['validate', 'security'],
      requiresConversationResolution: true
    },
    error: null
  });
  assert.equal(JSON.stringify(first).includes('sensitive-token'), false);
  assert.match(calls.find((call) => call.url.includes('/pulls?'))?.url ?? '', /per_page=10/);
  assert.match(calls.find((call) => call.url.includes('/check-runs?'))?.url ?? '', /per_page=100/);
  assert.match(calls.find((call) => call.url.includes('/reviews?'))?.url ?? '', /per_page=100/);
  assert.match(calls.find((call) => call.url.includes('/rulesets?'))?.url ?? '', /per_page=20/);

  const [forced, forcedJoined] = await Promise.all([
    collector.reconcileExplicit(BRANCH),
    collector.reconcileExplicit(BRANCH)
  ]);
  assert.deepEqual(forcedJoined, forced);
  assert.equal(calls.length, 12);
});

test('getCurrent sur cache miss ne déclenche aucun accès GitHub', async () => {
  let calls = 0;
  const collector = createGithubOperationalContextCollector({
    fetchImpl: async () => { calls += 1; return json({}); },
    readToken: async () => 'must-not-be-read-for-cache-only',
    apiBase: 'https://api.github.test',
    allowedHosts: 'api.github.test',
    now: () => new Date('2026-08-13T08:00:00.000Z')
  });

  const result = await collector.getCurrent('mcp/another-branch');
  assert.equal(calls, 0);
  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.error, 'github_cache_miss');
});

test('un body malformé dégrade la vue avec champs bornés sans propager de secret', async () => {
  const collector = createGithubOperationalContextCollector({
    fetchImpl: async (input) => String(input).endsWith('/commits/main')
      ? json({ sha: 'invalid' })
      : json({ malformed: true }),
    readToken: async () => 'another-sensitive-token',
    apiBase: 'https://api.github.test',
    allowedHosts: 'api.github.test',
    now: () => new Date('2026-08-13T08:00:00.000Z'),
    timeoutMs: 1_000
  });

  const result = await collector.collect(BRANCH);
  assert.equal(result.status, 'DEGRADED');
  assert.equal(result.mainHead, null);
  assert.equal(result.pullRequest, null);
  assert.equal(result.checks.total <= 100, true);
  assert.equal(result.reviews.unresolvedThreads, null);
  assert.equal(result.error?.includes('another-sensitive-token'), false);
  assert.match(result.error ?? '', /^[a-z0-9_|-]{1,240}$/);
});

test('le timeout global est borné et retourne UNAVAILABLE sans throw', async () => {
  const collector = createGithubOperationalContextCollector({
    fetchImpl: async (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }),
    readToken: async () => 'timeout-sensitive-token',
    apiBase: 'https://api.github.test',
    allowedHosts: 'api.github.test',
    timeoutMs: 10
  });

  const result = await collector.collect(BRANCH);
  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.error, 'github_timeout');
  assert.equal(JSON.stringify(result).includes('timeout-sensitive-token'), false);
});
