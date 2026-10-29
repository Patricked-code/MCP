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

/**
 * GGCC domain completion tests (TB-W3-GGCC-GH-COMMIT-FILE through GH-ORG).
 * Each GGCC blueprint maps to a capability domain; this test proves every
 * domain's tools are registered, classified (read vs write-scoped), and that
 * no tool escapes its domain boundary.
 */

const DOMAIN_MAP: Record<string, { blueprintId: string; tools: string[] }> = {
  'commit-file': {
    blueprintId: 'TB-W3-GGCC-GH-COMMIT-FILE',
    tools: [
      'github_create_commit',
      'github_create_or_update_file',
      'github_get_commit_state',
      'github_get_tree',
      'github_get_commits',
      'github_compare_refs'
    ]
  },
  'pr-review': {
    blueprintId: 'TB-W3-GGCC-GH-PR-REVIEW',
    tools: [
      'github_create_pull_request',
      'github_mark_pr_ready',
      'github_merge_pull_request',
      'github_get_pull_request_state',
      'github_get_pull_request_reviews',
      'github_get_review_threads',
      'github_reply_review_thread',
      'github_resolve_review_thread',
      'github_request_pull_request_review',
      'github_update_pull_request_metadata'
    ]
  },
  'actions': {
    blueprintId: 'TB-W3-GGCC-GH-ACTIONS',
    tools: [
      'github_get_workflow_runs',
      'github_get_commit_checks'
    ]
  },
  'rulesets': {
    blueprintId: 'TB-W3-GGCC-GH-RULESETS',
    tools: [
      'github_get_rulesets',
      'github_get_required_checks'
    ]
  },
  'webhooks': {
    blueprintId: 'TB-W3-GGCC-GH-WEBHOOKS',
    tools: [
      'github_get_webhooks'
    ]
  },
  'releases-deployments': {
    blueprintId: 'TB-W3-GGCC-GH-RELEASES-DEPLOYMENTS',
    tools: [
      'github_get_releases',
      'github_get_deployments'
    ]
  },
  'repo-branch': {
    blueprintId: 'TB-W3-GGCC-GH-REPO-BRANCH',
    tools: [
      'github_get_repository_state',
      'github_get_branch_state',
      'github_create_branch',
      'github_create_repository'
    ]
  }
};

function collectAllRegisteredTools(): string[] {
  const names: string[] = [];
  const server = {
    tool(name: string) { names.push(name); }
  } as unknown as McpServer;
  const deps = {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({
      ok: true, status: 200, json: {}, tokenExpiresAt: null, oauthScopes: []
    }),
    writeEnabled: () => true,
    evaluateGovernance: async () => ({
      mode: 'shadow', toolName: 'test',
      governedSessionId: '11111111-1111-4111-8111-111111111111',
      currentStateVersion: 1, acknowledgedStateVersion: 1,
      activeLockConflicts: 0, verdict: 'shadow_ready', wouldBlock: false
    })
  };
  registerGithubControlPlaneReadTools(server, deps);
  registerGithubLifecycleReadTools(server, deps);
  registerGithubLifecycleWriteTools(server, deps);
  return names;
}

test('every GGCC domain tool is registered in the runtime', () => {
  const registered = new Set(collectAllRegisteredTools());
  for (const [domain, spec] of Object.entries(DOMAIN_MAP)) {
    for (const tool of spec.tools) {
      assert.ok(registered.has(tool), `${domain} (${spec.blueprintId}): ${tool} not registered`);
    }
  }
});

test('write-scoped tools in each domain are in WRITE_SCOPED_TOOL_NAMES', () => {
  const KNOWN_WRITE = new Set([
    'github_create_commit',
    'github_create_or_update_file',
    'github_create_pull_request',
    'github_mark_pr_ready',
    'github_merge_pull_request',
    'github_reply_review_thread',
    'github_resolve_review_thread',
    'github_request_pull_request_review',
    'github_update_pull_request_metadata',
    'github_create_branch',
    'github_create_repository'
  ]);
  for (const name of KNOWN_WRITE) {
    assert.ok(WRITE_SCOPED_TOOL_NAMES.has(name), `${name} should be write-scoped`);
  }
});

test('read-only tools in each domain are NOT in WRITE_SCOPED_TOOL_NAMES', () => {
  const KNOWN_READ = [
    'github_get_repository_state',
    'github_get_branch_state',
    'github_get_commit_state',
    'github_get_tree',
    'github_get_commits',
    'github_compare_refs',
    'github_get_pull_request_state',
    'github_get_pull_request_reviews',
    'github_get_review_threads',
    'github_get_workflow_runs',
    'github_get_commit_checks',
    'github_get_rulesets',
    'github_get_required_checks',
    'github_get_webhooks',
    'github_get_releases',
    'github_get_deployments'
  ];
  for (const name of KNOWN_READ) {
    assert.ok(!WRITE_SCOPED_TOOL_NAMES.has(name), `${name} should NOT be write-scoped`);
  }
});

test('domain tool sets are disjoint (no tool in two domains)', () => {
  const seen = new Map<string, string>();
  for (const [domain, spec] of Object.entries(DOMAIN_MAP)) {
    for (const tool of spec.tools) {
      const existing = seen.get(tool);
      assert.ok(!existing, `${tool} appears in both ${existing} and ${domain}`);
      seen.set(tool, domain);
    }
  }
});

test('no arbitrary shell or raw API escape in domain tools (pure registration check)', () => {
  const registered = collectAllRegisteredTools();
  for (const name of registered) {
    assert.ok(!name.includes('shell'), `${name} looks like a shell escape`);
    assert.ok(!name.includes('exec'), `${name} looks like an exec escape`);
    assert.ok(!name.includes('raw_api'), `${name} looks like a raw API escape`);
  }
});
