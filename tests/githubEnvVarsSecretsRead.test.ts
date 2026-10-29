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

test('TB-W3-GGCC-GH-ENV-VARS-SECRETS: github_get_environments registered as read-only', () => {
  const tools = collectTools(DEPS);
  const t = tools.find((x) => x.name === 'github_get_environments');
  assert.ok(t, 'github_get_environments should be registered');
  assert.ok(!WRITE_SCOPED_TOOL_NAMES.has('github_get_environments'));
});

test('TB-W3-GGCC-GH-ENV-VARS-SECRETS: github_get_repo_secrets registered as read-only', () => {
  const tools = collectTools(DEPS);
  const t = tools.find((x) => x.name === 'github_get_repo_secrets');
  assert.ok(t, 'github_get_repo_secrets should be registered');
  assert.ok(!WRITE_SCOPED_TOOL_NAMES.has('github_get_repo_secrets'));
});

test('TB-W3-GGCC-GH-ENV-VARS-SECRETS: github_get_repo_variables registered as read-only', () => {
  const tools = collectTools(DEPS);
  const t = tools.find((x) => x.name === 'github_get_repo_variables');
  assert.ok(t, 'github_get_repo_variables should be registered');
  assert.ok(!WRITE_SCOPED_TOOL_NAMES.has('github_get_repo_variables'));
});

test('TB-W3-GGCC-GH-ENV-VARS-SECRETS: environments returns bounded list', async () => {
  const deps = {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({
      ok: true, status: 200, tokenExpiresAt: null, oauthScopes: [],
      json: {
        total_count: 2,
        environments: [
          { id: 1, name: 'production', html_url: 'https://github.com/o/r/settings/environments/1', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
          { id: 2, name: 'staging', html_url: 'https://github.com/o/r/settings/environments/2', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-03T00:00:00Z' }
        ]
      }
    })
  };
  const tools = collectTools(deps);
  const t = tools.find((x) => x.name === 'github_get_environments')!;
  const result = await t.handler({ organization: 'chainsolutions-wealthtech', repository: 'test' });
  const data = JSON.parse(result.content[0].text);
  assert.ok(Array.isArray(data.environments));
  assert.equal(data.environments.length, 2);
  assert.equal(data.environments[0].name, 'production');
});

test('TB-W3-GGCC-GH-ENV-VARS-SECRETS: secrets returns names only, never values', async () => {
  const deps = {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({
      ok: true, status: 200, tokenExpiresAt: null, oauthScopes: [],
      json: {
        total_count: 2,
        secrets: [
          { name: 'AWS_ACCESS_KEY', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
          { name: 'DB_PASSWORD', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-03T00:00:00Z' }
        ]
      }
    })
  };
  const tools = collectTools(deps);
  const t = tools.find((x) => x.name === 'github_get_repo_secrets')!;
  const result = await t.handler({ organization: 'chainsolutions-wealthtech', repository: 'test' });
  const data = JSON.parse(result.content[0].text);
  assert.ok(Array.isArray(data.secrets));
  assert.equal(data.secrets.length, 2);
  assert.equal(data.secrets[0].name, 'AWS_ACCESS_KEY');
  const text = JSON.stringify(data);
  assert.ok(!text.includes('value'), 'secrets must never contain values');
});

test('TB-W3-GGCC-GH-ENV-VARS-SECRETS: variables returns bounded list', async () => {
  const deps = {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({
      ok: true, status: 200, tokenExpiresAt: null, oauthScopes: [],
      json: {
        total_count: 1,
        variables: [
          { name: 'NODE_ENV', value: 'production', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' }
        ]
      }
    })
  };
  const tools = collectTools(deps);
  const t = tools.find((x) => x.name === 'github_get_repo_variables')!;
  const result = await t.handler({ organization: 'chainsolutions-wealthtech', repository: 'test' });
  const data = JSON.parse(result.content[0].text);
  assert.ok(Array.isArray(data.variables));
  assert.equal(data.variables[0].name, 'NODE_ENV');
  assert.equal(data.variables[0].value, 'production');
});

test('TB-W3-GGCC-GH-ENV-VARS-SECRETS: rejects wrong org', async () => {
  const tools = collectTools(DEPS);
  const t = tools.find((x) => x.name === 'github_get_environments')!;
  await assert.rejects(() => t.handler({ organization: 'evil', repository: 'r' }), /GITHUB_CONTROL_ORG_NOT_ALLOWED/);
});
