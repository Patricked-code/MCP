import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { createGithubOperationalContextCollector } = await import('../src/governedContext/github.js');

const NOW = '2026-08-29T13:55:00.000Z';
const HEAD = 'a'.repeat(40);
const BRANCH = 'mcp/unified-operational-work-state-20260829';

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

test('GitHub review evidence blocks when an applicable ruleset requires missing approvals', async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/commits/main')) return json({ sha: HEAD });
    if (url.includes('/pulls?')) return json([{
      number: 55,
      state: 'open',
      draft: false,
      merged_at: null,
      base: { ref: 'main' },
      head: { ref: BRANCH, sha: HEAD },
      user: { login: 'Patricked-code' },
      updated_at: NOW
    }]);
    if (url.includes('/check-runs?')) return json({
      total_count: 1,
      check_runs: [{
        name: 'validate',
        head_sha: HEAD,
        status: 'completed',
        conclusion: 'success'
      }]
    });
    if (url.includes('/pulls/55/reviews?')) return json([]);
    if (url.endsWith('/graphql')) return json({
      data: { repository: { pullRequest: { reviewThreads: { nodes: [] } } } }
    });
    if (url.includes('/rulesets?')) return json([
      { id: 1, name: 'protect-main', enforcement: 'active' }
    ]);
    if (url.endsWith('/rulesets/1')) return json({
      id: 1,
      name: 'protect-main',
      enforcement: 'active',
      conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
      rules: [
        {
          type: 'pull_request',
          parameters: {
            required_approving_review_count: 1,
            required_review_thread_resolution: true
          }
        },
        {
          type: 'required_status_checks',
          parameters: { required_status_checks: [{ context: 'validate' }] }
        }
      ]
    });
    return json({ message: 'unexpected endpoint' }, 500);
  };

  const collector = createGithubOperationalContextCollector({
    fetchImpl,
    readToken: async () => 'test-token-not-returned',
    apiBase: 'https://api.github.test',
    allowedHosts: 'api.github.test',
    now: () => new Date(NOW),
    timeoutMs: 1_000
  });

  const result = await collector.reconcileExplicit(BRANCH);
  assert.equal(result.status, 'CURRENT');
  assert.equal(
    (result.ruleset as typeof result.ruleset & { requiredApprovingReviewCount?: number })
      .requiredApprovingReviewCount,
    1
  );
  assert.equal(result.reviews.approvals, 0);
  assert.equal(result.reasonCodes.includes('GITHUB_REVIEW_BLOCKING'), true);
});
