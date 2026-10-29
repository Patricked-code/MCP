import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

process.env.NODE_ENV = 'test';
process.env.MCP_AUTH_TOKEN ??= 'test-only-mcp-auth-value-000000';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/test-s2-key';
process.env.GITHUB_ORG = 'chainsolutions-wealthtech';

const { registerGithubControlPlaneReadTools } =
  await import('../src/tools/githubControlPlaneRead.js');
const { WRITE_SCOPED_TOOL_NAMES } =
  await import('../src/tools/registrationPolicy.js');

type ToolHandler = (...args: any[]) => any;
type ToolEntry = { name: string; handler: ToolHandler };

function collectTools(dependencies: any): ToolEntry[] {
  const entries: ToolEntry[] = [];
  const server = {
    tool(name: string, _d: string, _s: any, handler: ToolHandler) {
      entries.push({ name, handler });
    }
  } as unknown as McpServer;
  registerGithubControlPlaneReadTools(server, dependencies);
  return entries;
}

const DEPS = {
  configuredOrg: 'chainsolutions-wealthtech',
  request: async () => ({ ok: true, status: 200, json: {}, tokenExpiresAt: null, oauthScopes: [] })
};

test('TB-W3-GGCC-GH-ISSUES-PROJECTS: github_get_issues tool is registered as read-only', () => {
  const tools = collectTools(DEPS);
  const t = tools.find((x) => x.name === 'github_get_issues');
  assert.ok(t, 'github_get_issues should be registered');
  assert.ok(!WRITE_SCOPED_TOOL_NAMES.has('github_get_issues'));
});

test('TB-W3-GGCC-GH-ISSUES-PROJECTS: github_get_issue_state tool is registered as read-only', () => {
  const tools = collectTools(DEPS);
  const t = tools.find((x) => x.name === 'github_get_issue_state');
  assert.ok(t, 'github_get_issue_state should be registered');
  assert.ok(!WRITE_SCOPED_TOOL_NAMES.has('github_get_issue_state'));
});

test('TB-W3-GGCC-GH-ISSUES-PROJECTS: github_get_issues returns bounded issue list', async () => {
  const deps = {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({
      ok: true, status: 200, tokenExpiresAt: null, oauthScopes: [],
      json: [
        { number: 1, title: 'Test issue', state: 'open', user: { login: 'u1' }, labels: [{ name: 'bug' }], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', html_url: 'https://github.com/o/r/issues/1', pull_request: null },
        { number: 2, title: 'Another', state: 'closed', user: { login: 'u2' }, labels: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-03T00:00:00Z', html_url: 'https://github.com/o/r/issues/2', pull_request: { url: 'x' } }
      ]
    })
  };
  const tools = collectTools(deps);
  const t = tools.find((x) => x.name === 'github_get_issues')!;
  const result = await t.handler({ organization: 'chainsolutions-wealthtech', repository: 'test' });
  const data = JSON.parse(result.content[0].text);
  assert.ok(Array.isArray(data.issues));
  assert.equal(data.issues.length, 2);
  assert.equal(data.issues[0].number, 1);
  assert.equal(data.issues[0].title, 'Test issue');
  assert.equal(data.issues[0].state, 'open');
  assert.ok(data.issues[1].isPullRequest);
});

test('TB-W3-GGCC-GH-ISSUES-PROJECTS: github_get_issue_state returns bounded issue detail', async () => {
  const deps = {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({
      ok: true, status: 200, tokenExpiresAt: null, oauthScopes: [],
      json: {
        number: 42, title: 'Important', state: 'open', body: 'description',
        user: { login: 'owner' }, labels: [{ name: 'enhancement' }],
        assignees: [{ login: 'dev1' }], milestone: { title: 'v1.0', number: 1 },
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
        closed_at: null, html_url: 'https://github.com/o/r/issues/42',
        pull_request: null, comments: 3
      }
    })
  };
  const tools = collectTools(deps);
  const t = tools.find((x) => x.name === 'github_get_issue_state')!;
  const result = await t.handler({ organization: 'chainsolutions-wealthtech', repository: 'test', issueNumber: 42 });
  const data = JSON.parse(result.content[0].text);
  assert.equal(data.number, 42);
  assert.equal(data.title, 'Important');
  assert.equal(data.state, 'open');
  assert.equal(data.author, 'owner');
  assert.equal(data.commentCount, 3);
  assert.ok(!data.isPullRequest);
});

test('TB-W3-GGCC-GH-ISSUES-PROJECTS: rejects wrong org', async () => {
  const tools = collectTools(DEPS);
  const t = tools.find((x) => x.name === 'github_get_issues')!;
  await assert.rejects(() => t.handler({ organization: 'evil', repository: 'r' }), /GITHUB_CONTROL_ORG_NOT_ALLOWED/);
});

test('TB-W3-GGCC-GH-ISSUES-PROJECTS: issue tools never replace the Governed Task Queue', () => {
  const tools = collectTools(DEPS);
  const issueTools = tools.filter((t) => t.name.includes('issue'));
  assert.ok(issueTools.length >= 2);
  for (const t of issueTools) {
    assert.ok(!t.name.includes('create'), 'issue tools should be read-only projections');
    assert.ok(!t.name.includes('update'), 'issue tools should be read-only projections');
    assert.ok(!t.name.includes('close'), 'issue tools should be read-only projections');
  }
});
