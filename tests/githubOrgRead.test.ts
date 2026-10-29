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
type ToolEntry = { name: string; description: string; schema: any; handler: ToolHandler };

function collectTools(
  dependencies: any
): ToolEntry[] {
  const entries: ToolEntry[] = [];
  const server = {
    tool(name: string, description: string, schema: any, handler: ToolHandler) {
      entries.push({ name, description, schema, handler });
    }
  } as unknown as McpServer;
  registerGithubControlPlaneReadTools(server, dependencies);
  return entries;
}

test('TB-W3-GGCC-GH-ORG: github_get_organization_state tool is registered as a read tool', () => {
  const deps = {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({ ok: true, status: 200, json: {}, tokenExpiresAt: null, oauthScopes: [] })
  };
  const tools = collectTools(deps);
  const org = tools.find((t) => t.name === 'github_get_organization_state');
  assert.ok(org, 'github_get_organization_state should be registered');
  assert.ok(!WRITE_SCOPED_TOOL_NAMES.has('github_get_organization_state'), 'should be read-only');
});

test('TB-W3-GGCC-GH-ORG: github_get_organization_members tool is registered as a read tool', () => {
  const deps = {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({ ok: true, status: 200, json: {}, tokenExpiresAt: null, oauthScopes: [] })
  };
  const tools = collectTools(deps);
  const members = tools.find((t) => t.name === 'github_get_organization_members');
  assert.ok(members, 'github_get_organization_members should be registered');
  assert.ok(!WRITE_SCOPED_TOOL_NAMES.has('github_get_organization_members'), 'should be read-only');
});

test('TB-W3-GGCC-GH-ORG: github_get_organization_state returns bounded org projection', async () => {
  const deps = {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({
      ok: true, status: 200, tokenExpiresAt: null, oauthScopes: [],
      json: {
        login: 'chainsolutions-wealthtech',
        id: 999,
        name: 'Chainsolutions Wealthtech',
        type: 'Organization',
        company: null,
        blog: '',
        location: null,
        email: null,
        description: 'WealthTech MCP',
        public_repos: 5,
        private_repos: 12,
        followers: 0,
        following: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2026-10-28T12:00:00Z',
        total_private_repos: 12,
        owned_private_repos: 12,
        plan: { name: 'team', space: 0, private_repos: 999 },
        default_repository_permission: 'read',
        members_can_create_repositories: true,
        two_factor_requirement_enforced: true,
        has_organization_projects: true
      }
    })
  };
  const tools = collectTools(deps);
  const orgTool = tools.find((t) => t.name === 'github_get_organization_state')!;
  const result = await orgTool.handler({ organization: 'chainsolutions-wealthtech' });
  const data = JSON.parse(result.content[0].text);
  assert.equal(data.login, 'chainsolutions-wealthtech');
  assert.equal(data.id, 999);
  assert.equal(data.type, 'Organization');
  assert.equal(data.publicRepos, 5);
  assert.equal(data.twoFactorEnforced, true);
  // Must not expose secrets, tokens or sensitive plan data
  assert.equal(data.token, undefined);
  assert.equal(data.secret, undefined);
});

test('TB-W3-GGCC-GH-ORG: github_get_organization_members returns bounded member list', async () => {
  const deps = {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({
      ok: true, status: 200, tokenExpiresAt: null, oauthScopes: [],
      json: [
        { login: 'user-a', id: 1, type: 'User', site_admin: false },
        { login: 'user-b', id: 2, type: 'User', site_admin: false }
      ]
    })
  };
  const tools = collectTools(deps);
  const membersTool = tools.find((t) => t.name === 'github_get_organization_members')!;
  const result = await membersTool.handler({ organization: 'chainsolutions-wealthtech' });
  const data = JSON.parse(result.content[0].text);
  assert.ok(Array.isArray(data.members));
  assert.equal(data.members.length, 2);
  assert.equal(data.members[0].login, 'user-a');
  assert.equal(data.members[1].login, 'user-b');
});

test('TB-W3-GGCC-GH-ORG: rejects wrong organization', async () => {
  const deps = {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({ ok: true, status: 200, json: {}, tokenExpiresAt: null, oauthScopes: [] })
  };
  const tools = collectTools(deps);
  const orgTool = tools.find((t) => t.name === 'github_get_organization_state')!;
  await assert.rejects(
    () => orgTool.handler({ organization: 'evil-org' }),
    /GITHUB_CONTROL_ORG_NOT_ALLOWED/
  );
});

test('TB-W3-GGCC-GH-ORG: no shell or raw API escape in org tools', () => {
  const deps = {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({ ok: true, status: 200, json: {}, tokenExpiresAt: null, oauthScopes: [] })
  };
  const tools = collectTools(deps);
  const orgTools = tools.filter((t) => t.name.includes('organization'));
  assert.ok(orgTools.length >= 2, 'at least 2 org tools');
  for (const t of orgTools) {
    assert.equal(typeof t.handler, 'function');
    assert.ok(!t.name.includes('shell'));
    assert.ok(!t.name.includes('exec'));
  }
});
