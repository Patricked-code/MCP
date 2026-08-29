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
      user: { login: 'task-owner' },
      updated_at: '2026-08-13T08:00:00Z'
    }]);
    if (url.includes('/check-runs?')) return json({
      head_sha: SHA,
      total_count: 3,
      check_runs: [
        { name: 'validate', status: 'completed', conclusion: 'success' },
        { name: 'security', status: 'completed', conclusion: 'failure' },
        { name: 'optional', status: 'in_progress', conclusion: null }
      ]
    });
    if (url.includes('/pulls/44/reviews?')) return json([
      {
        id: 10,
        state: 'CHANGES_REQUESTED',
        submitted_at: '2026-08-13T07:00:00Z',
        user: { id: 101, login: 'reviewer-one' }
      },
      {
        id: 11,
        state: 'APPROVED',
        submitted_at: '2026-08-13T07:30:00Z',
        user: { id: 101, login: 'reviewer-one' }
      },
      {
        id: 13,
        state: 'COMMENTED',
        submitted_at: '2026-08-13T07:40:00Z',
        user: { id: 101, login: 'reviewer-one' }
      },
      {
        id: 12,
        state: 'CHANGES_REQUESTED',
        submitted_at: '2026-08-13T07:45:00Z',
        user: { id: 202, login: 'reviewer-two' }
      },
      {
        id: 14,
        state: 'COMMENTED',
        submitted_at: '2026-08-13T07:50:00Z',
        user: { id: 202, login: 'reviewer-two' }
      },
      {
        id: 15,
        state: 'DISMISSED',
        submitted_at: '2026-08-13T07:55:00Z',
        user: { id: 303, login: 'reviewer-three' }
      }
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
      id: 42,
      name: 'main-protection',
      enforcement: 'active'
    }, {
      id: 43,
      name: 'evaluate-only',
      enforcement: 'evaluate'
    }]);
    if (url.endsWith('/rulesets/42')) return json({
      id: 42,
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
    });
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
  assert.equal(first.cache.status, 'REFRESHED');
  assert.equal(cached.cache.status, 'HIT');
  assert.equal(cacheOnly.cache.status, 'HIT');
  assert.equal(cached.workBranchHead, first.workBranchHead);
  assert.equal(cacheOnly.pullRequest?.headSha, first.pullRequest?.headSha);
  assert.equal(calls.length, 7);
  assert.equal(calls.every((call) => call.authorization === 'Bearer sensitive-token-never-returned'), true);
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1);
  assert.deepEqual(first, {
    status: 'CURRENT',
    observedAt: '2026-08-13T08:00:00.000Z',
    mainHead: SHA,
    workBranch: BRANCH,
    workBranchHead: SHA,
    pullRequest: {
      number: 44,
      state: 'open',
      draft: false,
      merged: false,
      base: 'main',
      head: BRANCH,
      headSha: SHA,
      author: 'task-owner',
      updatedAt: '2026-08-13T08:00:00.000Z'
    },
    checks: {
      status: 'in_progress',
      conclusion: 'failure',
      total: 3,
      failed: 1,
      headSha: SHA,
      exactHead: true,
      required: [
        { context: 'validate', status: 'completed', conclusion: 'success' },
        { context: 'security', status: 'completed', conclusion: 'failure' }
      ],
      requiredSatisfied: false
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
    ownership: { pullRequestAuthor: 'task-owner' },
    activity: { lastActivityAt: '2026-08-13T08:00:00.000Z' },
    cache: {
      status: 'REFRESHED',
      observedAt: '2026-08-13T08:00:00.000Z',
      provenance: 'github_api'
    },
    evidence: {
      main: { freshness: 'CURRENT', observedAt: '2026-08-13T08:00:00.000Z', provenance: 'github_api' },
      pullRequest: { freshness: 'CURRENT', observedAt: '2026-08-13T08:00:00.000Z', provenance: 'github_api' },
      checks: { freshness: 'CURRENT', observedAt: '2026-08-13T08:00:00.000Z', provenance: 'github_api' },
      reviews: { freshness: 'CURRENT', observedAt: '2026-08-13T08:00:00.000Z', provenance: 'github_api' },
      ruleset: { freshness: 'CURRENT', observedAt: '2026-08-13T08:00:00.000Z', provenance: 'github_api' }
    },
    error: null
  });
  assert.equal(JSON.stringify(first).includes('sensitive-token'), false);
  assert.match(calls.find((call) => call.url.includes('/pulls?'))?.url ?? '', /per_page=10/);
  assert.match(calls.find((call) => call.url.includes('/check-runs?'))?.url ?? '', /per_page=100/);
  assert.match(calls.find((call) => call.url.includes('/reviews?'))?.url ?? '', /per_page=100/);
  assert.match(calls.find((call) => call.url.includes('/rulesets?'))?.url ?? '', /per_page=20/);
  assert.equal(calls.filter((call) => /\/rulesets\/[0-9]+$/.test(call.url)).length, 1);
  assert.equal(calls.some((call) => call.url.endsWith('/rulesets/43')), false);

  const [forced, forcedJoined] = await Promise.all([
    collector.reconcileExplicit(BRANCH),
    collector.reconcileExplicit(BRANCH)
  ]);
  assert.deepEqual(forcedJoined, forced);
  assert.equal(forced.cache.status, 'REFRESHED');
  assert.equal(calls.length, 14);
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
  assert.equal(result.cache.status, 'MISS');
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
