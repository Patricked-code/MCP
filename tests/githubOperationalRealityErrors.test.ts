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

const OBSERVED_AT = '2026-08-29T03:10:00.000Z';
const BRANCH = 'mcp/unified-operational-work-state-20260829';
const SHA = 'a'.repeat(40);
const WORK_SHA = 'b'.repeat(40);

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}

function collector(options: {
  readToken?: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  cacheTtlMs?: number;
  timeoutMs?: number;
}) {
  return createGithubOperationalContextCollector({
    readToken: options.readToken ?? (async () => 'bounded-test-token'),
    fetchImpl: options.fetchImpl ?? (async () => json({ sha: SHA })),
    apiBase: 'https://api.github.test',
    allowedHosts: 'api.github.test',
    now: options.now ?? (() => new Date(OBSERVED_AT)),
    cacheTtlMs: options.cacheTtlMs,
    timeoutMs: options.timeoutMs
  });
}

test('GitHub missing and invalid authentication stay distinct', async () => {
  const missing = await collector({ readToken: async () => null }).reconcileExplicit(BRANCH);
  assert.ok(missing.reasonCodes.includes('GITHUB_AUTH_MISSING'));

  const invalid = await collector({ fetchImpl: async () => json({ message: 'invalid' }, 401) })
    .reconcileExplicit(BRANCH);
  assert.ok(invalid.reasonCodes.includes('GITHUB_AUTH_INVALID'));
  assert.equal(invalid.reasonCodes.includes('GITHUB_PERMISSION_DENIED'), false);
});

test('GitHub permission denied and not-found-or-invisible stay distinct', async () => {
  const denied = await collector({ fetchImpl: async () => json({ message: 'denied' }, 403) })
    .reconcileExplicit(BRANCH);
  assert.ok(denied.reasonCodes.includes('GITHUB_PERMISSION_DENIED'));

  const hidden = await collector({ fetchImpl: async () => json({ message: 'missing' }, 404) })
    .reconcileExplicit(BRANCH);
  assert.ok(hidden.reasonCodes.includes('GITHUB_NOT_FOUND_OR_INVISIBLE'));
  assert.ok(hidden.uncertainties.includes('GITHUB_VISIBILITY_UNCERTAIN'));
});

test('GitHub timeout stays explicit', async () => {
  const fetchImpl: typeof fetch = async (_input, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  const result = await collector({ fetchImpl, timeoutMs: 2 }).reconcileExplicit(BRANCH);
  assert.ok(result.reasonCodes.includes('GITHUB_TIMEOUT'));
});

test('expired cached evidence becomes STALE while a never-observed key remains CACHE_MISS', async () => {
  let nowMs = Date.parse(OBSERVED_AT);
  const now = () => new Date(nowMs);
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/commits/main')) return json({ sha: SHA });
    if (url.includes('/pulls?')) return json([]);
    if (url.includes(`/commits/${encodeURIComponent(BRANCH)}`)) return json({ sha: WORK_SHA });
    if (url.includes('/rulesets?')) return json([]);
    return json({});
  };
  const subject = collector({ fetchImpl, now, cacheTtlMs: 10 });
  await subject.reconcileExplicit(BRANCH);
  nowMs += 20;
  const stale = await subject.getCurrent(BRANCH);
  assert.ok(stale.reasonCodes.includes('GITHUB_STALE'));
  assert.equal(stale.evidence.main.freshness, 'STALE');

  const miss = await subject.getCurrent('mcp/never-observed');
  assert.ok(miss.reasonCodes.includes('GITHUB_CACHE_MISS'));
  assert.equal(miss.cache.status, 'MISS');
});

test('GitHub observes work branch head before a pull request exists', async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/commits/main')) return json({ sha: SHA });
    if (url.includes('/pulls?')) return json([]);
    if (url.includes(`/commits/${encodeURIComponent(BRANCH)}`)) return json({ sha: WORK_SHA });
    if (url.includes('/rulesets?')) return json([]);
    return json({ message: 'unexpected endpoint' }, 500);
  };

  const result = await collector({ fetchImpl }).reconcileExplicit(BRANCH);
  assert.equal(result.status, 'CURRENT');
  assert.equal(result.pullRequest, null);
  assert.equal(result.workBranchHead, WORK_SHA);
  assert.equal(result.evidence.pullRequest.freshness, 'CURRENT');
  assert.equal(result.checks.status, 'unavailable');
  assert.equal(result.evidence.checks.freshness, 'NOT_APPLICABLE');
  assert.equal(
    calls.some((url) => url.includes(`/commits/${encodeURIComponent(BRANCH)}`)),
    true
  );
});

test('GitHub exact-head checks and review blockers are distinct reason codes', async () => {
  const expectedHead = 'b'.repeat(40);
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/commits/main')) return json({ sha: SHA });
    if (url.includes('/pulls?')) return json([{
      number: 61,
      state: 'open',
      draft: false,
      merged_at: null,
      base: { ref: 'main' },
      head: { ref: BRANCH, sha: expectedHead },
      user: { login: 'owner' },
      updated_at: OBSERVED_AT
    }]);
    if (url.includes('/check-runs?')) return json({
      head_sha: SHA,
      total_count: 2,
      check_runs: [
        { name: 'validate', status: 'in_progress', conclusion: null },
        { name: 'security', status: 'completed', conclusion: 'failure' }
      ]
    });
    if (url.includes('/reviews?')) return json([{
      id: 1,
      state: 'CHANGES_REQUESTED',
      submitted_at: OBSERVED_AT,
      user: { id: 10, login: 'reviewer' }
    }]);
    if (url.endsWith('/graphql')) return json({
      data: { repository: { pullRequest: { reviewThreads: { nodes: [{ isResolved: false }] } } } }
    });
    if (url.includes('/rulesets?')) return json([{ id: 42, name: 'protect-main', enforcement: 'active' }]);
    if (url.endsWith('/rulesets/42')) return json({
      id: 42,
      name: 'protect-main',
      enforcement: 'active',
      rules: [
        { type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'validate' }, { context: 'security' }] } },
        { type: 'required_conversation_resolution' }
      ]
    });
    return json({});
  };
  const result = await collector({ fetchImpl }).reconcileExplicit(BRANCH);
  assert.ok(result.reasonCodes.includes('GITHUB_HEAD_MISMATCH'));
  assert.ok(result.reasonCodes.includes('GITHUB_REQUIRED_CHECKS_PENDING'));
  assert.ok(result.reasonCodes.includes('GITHUB_REQUIRED_CHECKS_FAILED'));
  assert.ok(result.reasonCodes.includes('GITHUB_REVIEW_BLOCKING'));
});
