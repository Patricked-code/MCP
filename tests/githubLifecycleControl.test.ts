import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.GITHUB_ORG = 'chainsolutions-wealthtech';
process.env.ENABLE_WRITE_TOOLS = 'true';

const READY = {
  mode: 'shadow' as const,
  toolName: 'pending',
  governedSessionId: '11111111-1111-4111-8111-111111111111',
  currentStateVersion: 7,
  acknowledgedStateVersion: 7,
  activeLockConflicts: 0,
  verdict: 'shadow_ready' as const,
  wouldBlock: false,
  bootstrapReceiptStatus: 'CURRENT' as const,
  currentTaskStatus: 'IN_PROGRESS',
  auditBaselineValid: true
};

function serverRegistry() {
  const names: string[] = [];
  const handlers = new Map<string, Function>();
  return {
    server: {
      tool(name: string, _description: string, _schema: unknown, callback: Function) {
        names.push(name);
        handlers.set(name, callback);
      }
    } as any,
    names,
    handlers
  };
}

function ok(json: unknown, status = 200) {
  return { ok: true, status, json, tokenExpiresAt: null, oauthScopes: [] };
}

test('GWC-12 RED: materializes only C-90.1/C-90.2 selected surface', async () => {
  const { registerGithubLifecycleReadTools, registerGithubLifecycleWriteTools } =
    await import('../src/tools/githubLifecycle.js');
  const read = serverRegistry();
  registerGithubLifecycleReadTools(read.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ok({})
  });
  const write = serverRegistry();
  registerGithubLifecycleWriteTools(write.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ok({}),
    writeEnabled: () => true,
    evaluateGovernance: async () => READY
  });

  assert.deepEqual(read.names.sort(), ['github_get_review_threads']);
  assert.deepEqual(write.names.sort(), [
    'github_create_branch',
    'github_create_commit',
    'github_create_or_update_file',
    'github_create_pull_request',
    'github_mark_pr_ready',
    'github_merge_pull_request',
    'github_reply_review_thread',
    'github_resolve_review_thread'
  ]);
  for (const forbidden of [
    'github_create_repository',
    'github_delete_branch',
    'github_delete_file',
    'github_request_review',
    'github_update_pull_request',
    'github_get_tree',
    'github_get_commits',
    'github_get_commit_diff',
    'github_get_mergeability',
    'github_get_required_checks'
  ]) {
    assert.equal(read.names.includes(forbidden) || write.names.includes(forbidden), false, forbidden);
  }
});

test('GWC-12 transport allows only required POST/PUT mutation methods and sends JSON body', async () => {
  const { githubJsonRequest } = await import('../src/github/connection.js');
  const calls: Array<{ method: string | undefined; body: string | null }> = [];
  const response = await (githubJsonRequest as any)(
    'sensitive-token',
    '/repos/chainsolutions-wealthtech/Repo/pulls/7/merge',
    {
      method: 'PUT',
      jsonBody: { sha: 'a'.repeat(40), merge_method: 'squash' },
      fetchImpl: async (_input: unknown, init: RequestInit) => {
        calls.push({
          method: init.method,
          body: typeof init.body === 'string' ? init.body : null
        });
        return new Response(JSON.stringify({ merged: true, sha: 'b'.repeat(40) }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      },
      apiBase: 'https://api.github.test',
      allowedHosts: 'api.github.test',
      timeoutMs: 1_000
    }
  );

  assert.equal(response.ok, true);
  assert.deepEqual(calls, [{
    method: 'PUT',
    body: JSON.stringify({ sha: 'a'.repeat(40), merge_method: 'squash' })
  }]);
});

test('GWC-12 write mutation is blocked before GitHub access unless existing gate is shadow_ready', async () => {
  const { registerGithubLifecycleWriteTools } = await import('../src/tools/githubLifecycle.js');
  const registry = serverRegistry();
  let requests = 0;
  registerGithubLifecycleWriteTools(registry.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => { requests += 1; return ok({}); },
    writeEnabled: () => true,
    evaluateGovernance: async () => ({
      ...READY,
      verdict: 'task_unclaimed',
      wouldBlock: true
    })
  });
  const handler = registry.handlers.get('github_create_branch');
  await assert.rejects(
    () => handler?.({
      organization: 'chainsolutions-wealthtech',
      repository: 'Repo',
      branch: 'mcp/work',
      baseSha: 'a'.repeat(40)
    }, {}),
    /GITHUB_CONTROL_GOVERNANCE_BLOCKED:task_unclaimed/
  );
  assert.equal(requests, 0);
});

test('GWC-12 create commit refuses a stale branch head before creating blobs/tree/commit', async () => {
  const { registerGithubLifecycleWriteTools } = await import('../src/tools/githubLifecycle.js');
  const registry = serverRegistry();
  const calls: string[] = [];
  registerGithubLifecycleWriteTools(registry.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    writeEnabled: () => true,
    evaluateGovernance: async () => READY,
    request: async (endpoint: string) => {
      calls.push(endpoint);
      if (endpoint.endsWith('/branches/mcp%2Fwork')) {
        return ok({ name: 'mcp/work', commit: { sha: 'b'.repeat(40) } });
      }
      return ok({});
    }
  });
  const handler = registry.handlers.get('github_create_commit');
  await assert.rejects(
    () => handler?.({
      organization: 'chainsolutions-wealthtech',
      repository: 'Repo',
      branch: 'mcp/work',
      expectedHeadSha: 'a'.repeat(40),
      message: 'test',
      files: [{ path: 'a.txt', contentBase64: 'YQ==' }]
    }, {}),
    /GITHUB_BRANCH_HEAD_STALE/
  );
  assert.deepEqual(calls, ['/repos/chainsolutions-wealthtech/Repo/branches/mcp%2Fwork']);
});

test('GWC-12 create pull request reobserves head branch and refuses stale expectedHeadSha', async () => {
  const { registerGithubLifecycleWriteTools } = await import('../src/tools/githubLifecycle.js');
  const registry = serverRegistry();
  const calls: Array<{ endpoint: string; method?: string }> = [];
  registerGithubLifecycleWriteTools(registry.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    writeEnabled: () => true,
    evaluateGovernance: async () => READY,
    request: async (endpoint: string, options?: any) => {
      calls.push({ endpoint, method: options?.method });
      if (endpoint.endsWith('/branches/mcp%2Fwork')) {
        return ok({ name: 'mcp/work', commit: { sha: 'b'.repeat(40) } });
      }
      return ok({});
    }
  });
  const handler = registry.handlers.get('github_create_pull_request');
  await assert.rejects(
    () => handler?.({
      organization: 'chainsolutions-wealthtech',
      repository: 'Repo',
      title: 'PR',
      head: 'mcp/work',
      targetBase: 'main',
      expectedHeadSha: 'a'.repeat(40),
      body: '',
      draft: true
    }, {}),
    /GITHUB_PR_HEAD_STALE/
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.endpoint.endsWith('/branches/mcp%2Fwork'), true);
});

test('GWC-12 mark ready is exact-head bound before GraphQL mutation', async () => {
  const { registerGithubLifecycleWriteTools } = await import('../src/tools/githubLifecycle.js');
  const registry = serverRegistry();
  const calls: Array<{ endpoint: string; method?: string }> = [];
  registerGithubLifecycleWriteTools(registry.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    writeEnabled: () => true,
    evaluateGovernance: async () => READY,
    request: async (endpoint: string, options?: any) => {
      calls.push({ endpoint, method: options?.method });
      if (endpoint.endsWith('/pulls/7')) {
        return ok({
          number: 7, node_id: 'PR_node', draft: true, merged: false,
          mergeable: true, head: { ref: 'mcp/work', sha: 'b'.repeat(40) },
          base: { ref: 'main', sha: 'c'.repeat(40) }
        });
      }
      return ok({});
    }
  });
  const handler = registry.handlers.get('github_mark_pr_ready');
  await assert.rejects(
    () => handler?.({
      organization: 'chainsolutions-wealthtech',
      repository: 'Repo',
      pullRequestNumber: 7,
      expectedHeadSha: 'a'.repeat(40)
    }, {}),
    /GITHUB_PR_HEAD_STALE/
  );
  assert.equal(calls.length, 1);
});

test('GWC-12 merge checks exact PR head and required check-runs before PUT merge', async () => {
  const { registerGithubLifecycleWriteTools } = await import('../src/tools/githubLifecycle.js');
  const registry = serverRegistry();
  const calls: Array<{ endpoint: string; method?: string; body?: unknown }> = [];
  const head = 'a'.repeat(40);
  registerGithubLifecycleWriteTools(registry.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    writeEnabled: () => true,
    evaluateGovernance: async () => READY,
    request: async (endpoint: string, options?: any) => {
      calls.push({ endpoint, method: options?.method, body: options?.jsonBody });
      if (endpoint.endsWith('/pulls/7')) {
        return ok({
          number: 7, draft: false, merged: false, mergeable: true,
          head: { ref: 'mcp/work', sha: head },
          base: { ref: 'main', sha: 'c'.repeat(40) }
        });
      }
      if (endpoint.includes('/commits/') && endpoint.includes('/check-runs')) {
        return ok({ check_runs: [{ name: 'MCP CI', status: 'completed', conclusion: 'success' }] });
      }
      if (endpoint.endsWith('/pulls/7/merge')) {
        return ok({ merged: true, message: 'merged', sha: 'd'.repeat(40) });
      }
      return ok({});
    }
  });
  const handler = registry.handlers.get('github_merge_pull_request');
  await handler?.({
    organization: 'chainsolutions-wealthtech',
    repository: 'Repo',
    pullRequestNumber: 7,
    expectedHeadSha: head,
    mergeMethod: 'squash'
  }, {});
  assert.equal(calls.at(-1)?.method, 'PUT');
  assert.deepEqual(calls.at(-1)?.body, { sha: head, merge_method: 'squash' });
});
