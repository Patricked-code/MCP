import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

process.env.NODE_ENV = 'test';
process.env.MCP_AUTH_TOKEN ??= 'test-only-mcp-auth-value-000000';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/test-s2-key';
process.env.ENABLE_WRITE_TOOLS = 'true';
process.env.MCP_GOVERNED_SESSIONS_ENABLED = 'true';
process.env.MCP_WRITE_GATE_MODE = 'shadow';
process.env.GITHUB_ORG = 'chainsolutions-wealthtech';

const { registerGithubControlPlaneReadTools } =
  await import('../src/tools/githubControlPlaneRead.js');
const { WRITE_SCOPED_TOOL_NAMES } =
  await import('../src/tools/registrationPolicy.js');
const { registerGithubLifecycleReadTools, registerGithubLifecycleWriteTools } =
  await import('../src/tools/githubLifecycle.js');

const C89_READ = [
  'github_compare_refs',
  'github_get_branch_state',
  'github_get_commit_checks',
  'github_get_commit_state',
  'github_get_deployments',
  'github_get_pull_request_reviews',
  'github_get_pull_request_state',
  'github_get_releases',
  'github_get_repository_state',
  'github_get_rulesets',
  'github_get_webhooks',
  'github_get_workflow_runs'
] as const;

const C90_SPLIT_AFTER_GWC9 = [
  'github_create_branch',
  'github_create_pull_request',
  'github_mark_pr_ready',
  'github_merge_pull_request',
  'github_get_review_threads',
  'github_reply_review_thread',
  'github_resolve_review_thread',
  'github_create_commit',
  'github_create_or_update_file'
] as const;

const W2_READ_R1 = [
  'github_get_commits',
  'github_get_required_checks',
  'github_get_tree'
] as const;

const C90_DEFERRED = [
  'github_delete_branch',
  'github_delete_file',
  'github_request_review',
  'github_update_pull_request',
  'github_get_commit_diff',
  'github_get_mergeability'
] as const;

function namesFrom(
  register: (server: McpServer, dependencies: any) => void,
  dependencies: any
): string[] {
  const names: string[] = [];
  const server = {
    tool(name: string, _description: string, _schema: unknown, _callback: Function) {
      names.push(name);
    }
  } as unknown as McpServer;
  register(server, dependencies);
  return names.sort();
}

test('W2 GitHub READ R1 extends the existing control-plane READ split only', () => {
  const names = namesFrom(registerGithubControlPlaneReadTools, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({
      ok: true, status: 200, json: {}, tokenExpiresAt: null, oauthScopes: []
    })
  });
  assert.deepEqual(names, [...C89_READ, ...W2_READ_R1].sort());
});

test('GWC-12 materializes the planned C-90 split only after the GWC-9 AF-32 gate closes', () => {
  const c89Names = new Set(C89_READ);
  for (const name of C90_SPLIT_AFTER_GWC9) {
    assert.equal(c89Names.has(name as (typeof C89_READ)[number]), false, name);
  }

  const common = {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({
      ok: true, status: 200, json: {}, tokenExpiresAt: null, oauthScopes: []
    })
  };
  const readNames = namesFrom(registerGithubLifecycleReadTools, common);
  const writeNames = namesFrom(registerGithubLifecycleWriteTools, {
    ...common,
    writeEnabled: () => true,
    evaluateGovernance: async () => ({
      mode: 'shadow',
      toolName: 'test',
      governedSessionId: '11111111-1111-4111-8111-111111111111',
      currentStateVersion: 1,
      acknowledgedStateVersion: 1,
      activeLockConflicts: 0,
      verdict: 'shadow_ready',
      wouldBlock: false
    })
  });

  assert.deepEqual(readNames, ['github_get_review_threads']);
  assert.deepEqual(
    writeNames,
    C90_SPLIT_AFTER_GWC9
      .filter((name) => name !== 'github_get_review_threads')
      .sort()
  );
  for (const name of writeNames) {
    assert.equal(WRITE_SCOPED_TOOL_NAMES.has(name), true, name);
  }
  for (const name of C90_DEFERRED) {
    assert.equal(readNames.includes(name), false, name);
    assert.equal(writeNames.includes(name), false, name);
    assert.equal(WRITE_SCOPED_TOOL_NAMES.has(name), false, name);
  }
});

test('the C-90 partition remains exact and exhaustive after W2 READ R1 materializes', () => {
  const all = [...C90_SPLIT_AFTER_GWC9, ...W2_READ_R1, ...C90_DEFERRED];
  assert.equal(all.length, 18);
  assert.equal(new Set(all).size, 18);
  assert.equal(C90_SPLIT_AFTER_GWC9.length, 9);
  assert.equal(W2_READ_R1.length, 3);
  assert.equal(C90_DEFERRED.length, 6);
});
