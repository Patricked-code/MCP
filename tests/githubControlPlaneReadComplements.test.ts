import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.GITHUB_ORG = 'chainsolutions-wealthtech';

const { registerGithubControlPlaneReadTools } =
  await import('../src/tools/githubControlPlaneRead.js');

function registry() {
  const handlers = new Map<string, Function>();
  const names: string[] = [];
  return {
    server: {
      tool(name: string, _description: string, _schema: unknown, callback: Function) {
        names.push(name);
        handlers.set(name, callback);
      }
    } as any,
    handlers,
    names
  };
}

function ok(json: unknown, status = 200) {
  return { ok: true, status, json, tokenExpiresAt: null, oauthScopes: [] };
}

function parsed(result: any) {
  const text = result?.content?.[0]?.text;
  assert.equal(typeof text, 'string');
  return JSON.parse(text);
}

function commit(index: number) {
  const sha = index.toString(16).padStart(40, '0').slice(-40);
  return {
    sha,
    html_url: `https://github.test/commit/${sha}`,
    commit: {
      message: `commit-${index}`,
      author: { date: '2026-09-24T00:00:00Z' },
      committer: { date: '2026-09-24T00:00:00Z' }
    },
    author: { login: 'author' },
    committer: { login: 'committer' },
    parents: []
  };
}

test('TB-W2-01 github_get_commits paginates internally and reports local truncation', async () => {
  const r = registry();
  const calls: string[] = [];
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async (endpoint: string) => {
      calls.push(endpoint);
      const url = new URL(`https://api.github.test${endpoint}`);
      assert.equal(url.pathname, '/repos/chainsolutions-wealthtech/Repo/commits');
      assert.equal(url.searchParams.get('per_page'), '100');
      assert.equal(url.searchParams.get('sha'), 'main');
      const page = Number(url.searchParams.get('page'));
      if (page === 1) return ok(Array.from({ length: 100 }, (_, i) => commit(i + 1)));
      if (page === 2) return ok(Array.from({ length: 30 }, (_, i) => commit(i + 101)));
      throw new Error(`unexpected page ${page}`);
    }
  });

  const handler = r.handlers.get('github_get_commits');
  assert.ok(handler, 'github_get_commits must be registered');
  const out = parsed(await handler({
    organization: 'chainsolutions-wealthtech',
    repository: 'Repo',
    ref: 'main',
    limit: 120
  }, {}));

  assert.equal(calls.length, 2);
  assert.equal(out.ref, 'main');
  assert.equal(out.limit, 120);
  assert.equal(out.pagesFetched, 2);
  assert.equal(out.returnedCount, 120);
  assert.equal(out.truncated, true);
  assert.equal(out.commits.length, 120);
  assert.equal(out.commits[0].message, 'commit-1');
  assert.equal(out.commits[119].message, 'commit-120');
});

test('TB-W2-02 github_get_tree bounds entries and makes upstream/local truncation explicit without blob reads', async () => {
  const r = registry();
  const calls: string[] = [];
  const head = 'a'.repeat(40);
  const tree = 'b'.repeat(40);
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async (endpoint: string) => {
      calls.push(endpoint);
      if (endpoint.endsWith('/commits/main')) {
        return ok({ sha: head, commit: { tree: { sha: tree } } });
      }
      if (endpoint === `/repos/chainsolutions-wealthtech/Repo/git/trees/${tree}?recursive=1`) {
        return ok({
          sha: tree,
          truncated: false,
          tree: [
            { path: 'a.txt', mode: '100644', type: 'blob', sha: '1'.repeat(40), size: 1 },
            { path: 'src', mode: '040000', type: 'tree', sha: '2'.repeat(40) },
            { path: 'src/b.ts', mode: '100644', type: 'blob', sha: '3'.repeat(40), size: 2 }
          ]
        });
      }
      throw new Error(`unexpected endpoint ${endpoint}`);
    }
  });

  const handler = r.handlers.get('github_get_tree');
  assert.ok(handler, 'github_get_tree must be registered');
  const out = parsed(await handler({
    organization: 'chainsolutions-wealthtech',
    repository: 'Repo',
    ref: 'main',
    recursive: true,
    limit: 2
  }, {}));

  assert.equal(out.ref, 'main');
  assert.equal(out.commitSha, head);
  assert.equal(out.treeSha, tree);
  assert.equal(out.recursive, true);
  assert.equal(out.returnedCount, 2);
  assert.equal(out.upstreamTruncated, false);
  assert.equal(out.localTruncated, true);
  assert.equal(out.truncated, true);
  assert.deepEqual(out.entries.map((entry: any) => entry.path), ['a.txt', 'src']);
  assert.equal(calls.some((endpoint) => endpoint.includes('/git/blobs/')), false);
});

test('TB-W2-03 github_get_required_checks reuses active ruleset semantics and binds evidence to exact branch head', async () => {
  const r = registry();
  const calls: string[] = [];
  const head = 'c'.repeat(40);
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async (endpoint: string) => {
      calls.push(endpoint);
      if (endpoint === '/repos/chainsolutions-wealthtech/Repo') {
        return ok({ default_branch: 'main' });
      }
      if (endpoint.endsWith('/branches/main')) {
        return ok({ name: 'main', commit: { sha: head } });
      }
      if (endpoint.includes('/rulesets?')) {
        return ok([
          { id: 42, name: 'main-protection', enforcement: 'active' },
          { id: 43, name: 'evaluate-only', enforcement: 'evaluate' },
          { id: 44, name: 'release-only', enforcement: 'active' }
        ]);
      }
      if (endpoint.endsWith('/rulesets/42')) {
        return ok({
          id: 42,
          name: 'main-protection',
          enforcement: 'active',
          conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
          rules: [{
            type: 'required_status_checks',
            parameters: {
              required_status_checks: [{ context: 'validate' }, { context: 'security' }]
            }
          }]
        });
      }
      if (endpoint.endsWith('/rulesets/44')) {
        return ok({
          id: 44,
          name: 'release-only',
          enforcement: 'active',
          conditions: { ref_name: { include: ['refs/heads/release/*'], exclude: [] } },
          rules: [{
            type: 'required_status_checks',
            parameters: { required_status_checks: [{ context: 'release' }] }
          }]
        });
      }
      if (endpoint.includes(`/commits/${head}/check-runs?`)) {
        return ok({
          total_count: 3,
          check_runs: [
            { name: 'validate', head_sha: head, status: 'completed', conclusion: 'success' },
            { name: 'security', head_sha: head, status: 'completed', conclusion: 'failure' },
            { name: 'optional', head_sha: head, status: 'in_progress', conclusion: null }
          ]
        });
      }
      throw new Error(`unexpected endpoint ${endpoint}`);
    }
  });

  const handler = r.handlers.get('github_get_required_checks');
  assert.ok(handler, 'github_get_required_checks must be registered');
  const out = parsed(await handler({
    organization: 'chainsolutions-wealthtech',
    repository: 'Repo',
    branch: 'main'
  }, {}));

  assert.equal(out.branch, 'main');
  assert.equal(out.headSha, head);
  assert.equal(out.checks.headSha, head);
  assert.equal(out.checks.exactHead, true);
  assert.deepEqual(out.ruleset.requiredStatusChecks, ['validate', 'security']);
  assert.deepEqual(out.checks.required, [
    { context: 'validate', status: 'completed', conclusion: 'success' },
    { context: 'security', status: 'completed', conclusion: 'failure' }
  ]);
  assert.equal(out.checks.requiredSatisfied, false);
  assert.equal(calls.some((endpoint) => endpoint.endsWith('/rulesets/43')), false);
  assert.equal(calls.some((endpoint) => endpoint.includes('/commits/main/check-runs')), false);
  assert.equal(calls.some((endpoint) => endpoint.includes(`/commits/${head}/check-runs`)), true);
});
