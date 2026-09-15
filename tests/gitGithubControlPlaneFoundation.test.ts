import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

process.env.NODE_ENV = 'test';
process.env.MCP_AUTH_TOKEN ??= 'test-only-mcp-auth-value-000000';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/test-s2-key';
process.env.GITHUB_ORG = 'chainsolutions-wealthtech';

const { parseGitGithubCapabilityManifest } = await import('../src/controlPlane/gitGithubCapabilities.js');
const { registerGithubControlPlaneReadTools } = await import('../src/tools/githubControlPlaneRead.js');

const manifestRaw = JSON.parse(await readFile('.mcp/git-github-capabilities.json', 'utf8'));

test('le manifeste Git/GitHub est exhaustif, unique et classifié', () => {
  const manifest = parseGitGithubCapabilityManifest(manifestRaw);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.program, 'GIT_GITHUB_CONTROL_PLANE');
  assert.ok(manifest.capabilities.length >= 90);

  const ids = new Set<string>();
  const tools = new Set<string>();
  for (const capability of manifest.capabilities) {
    assert.equal(ids.has(capability.id), false, `ID dupliqué: ${capability.id}`);
    ids.add(capability.id);
    if (capability.toolName) {
      assert.equal(tools.has(capability.toolName), false, `outil dupliqué: ${capability.toolName}`);
      tools.add(capability.toolName);
    }
    assert.ok(['git', 'github'].includes(capability.platform));
    assert.ok(['read', 'write', 'admin', 'security_sensitive', 'production_effect', 'forbidden'].includes(capability.effect));
    assert.ok(['existing', 'candidate', 'planned', 'forbidden'].includes(capability.implementationStatus));
  }

  for (const required of [
    'github_create_repository',
    'github_get_repository_state',
    'github_get_branch_state',
    'github_get_commit_state',
    'github_compare_refs',
    'github_get_pull_request_state',
    'github_get_commit_checks',
    'github_get_workflow_runs',
    'github_get_rulesets',
    'github_get_webhooks',
    'github_get_releases',
    'github_get_deployments',
    'github_create_branch',
    'github_create_commit',
    'github_create_pull_request',
    'github_merge_pull_request',
    'github_create_ruleset',
    'github_create_webhook',
    'github_dispatch_workflow',
    'github_create_release',
    'github_create_deployment',
    'git_fetch_project',
    'git_diff_project',
    'git_log_project',
    'git_create_branch_project',
    'git_commit_project',
    'git_merge_project',
    'git_rebase_project',
    'git_cherry_pick_project',
    'git_revert_project',
    'git_worktree_add_project',
    'git_bisect_start_project'
  ]) {
    assert.equal(tools.has(required), true, `capacité attendue absente: ${required}`);
  }
});

test('les portes dérobées Git/GitHub restent explicitement interdites', () => {
  const manifest = parseGitGithubCapabilityManifest(manifestRaw);
  const byId = new Map(manifest.capabilities.map((entry) => [entry.id, entry]));
  for (const id of [
    'GIT-FORBID-RAW-SHELL',
    'GIT-FORBID-FORCE-PUSH',
    'GIT-FORBID-RESET-HARD',
    'GITHUB-FORBID-RAW-API',
    'GITHUB-FORBID-DELETE-REPOSITORY',
    'GITHUB-FORBID-READ-SECRET-VALUE'
  ]) {
    const entry = byId.get(id);
    assert.ok(entry, id);
    assert.equal(entry?.effect, 'forbidden');
    assert.equal(entry?.implementationStatus, 'forbidden');
    assert.equal(entry?.toolName, null);
  }
});

test('la première vague GitHub READ enregistre uniquement des outils de lecture bornés', () => {
  const registrations: Array<{ name: string; description: string; callback: Function }> = [];
  const server = {
    tool(name: string, description: string, _schema: unknown, callback: Function) {
      registrations.push({ name, description, callback });
    }
  } as unknown as McpServer;

  registerGithubControlPlaneReadTools(server, {
    request: async () => ({ ok: true, status: 200, json: {}, tokenExpiresAt: null, oauthScopes: [] }),
    configuredOrg: 'chainsolutions-wealthtech'
  });

  const names = registrations.map((entry) => entry.name).sort();
  assert.deepEqual(names, [
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
  ]);
  for (const entry of registrations) {
    assert.match(entry.description, /lecture|lit|retourne|compare/i);
    assert.doesNotMatch(entry.description, /crée|supprime|modifie/i);
  }
});

test('les outils GitHub READ bornent l’organisation avant appel réseau', async () => {
  let calls = 0;
  let handler: Function | null = null;
  const server = {
    tool(name: string, _description: string, _schema: unknown, callback: Function) {
      if (name === 'github_get_repository_state') handler = callback;
    }
  } as unknown as McpServer;

  registerGithubControlPlaneReadTools(server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => {
      calls += 1;
      return { ok: true, status: 200, json: {}, tokenExpiresAt: null, oauthScopes: [] };
    }
  });

  assert.ok(handler);
  await assert.rejects(
    () => handler!({ organization: 'other-org', repository: 'Repo' }, {}),
    /GITHUB_CONTROL_ORG_NOT_ALLOWED/
  );
  assert.equal(calls, 0);
});

test('repository state ne projette jamais token, permissions brutes ou payload complet', async () => {
  let handler: Function | null = null;
  const server = {
    tool(name: string, _description: string, _schema: unknown, callback: Function) {
      if (name === 'github_get_repository_state') handler = callback;
    }
  } as unknown as McpServer;

  registerGithubControlPlaneReadTools(server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({
      ok: true,
      status: 200,
      tokenExpiresAt: null,
      oauthScopes: ['repo', 'admin:org'],
      json: {
        id: 123,
        name: 'Repo',
        full_name: 'chainsolutions-wealthtech/Repo',
        private: true,
        archived: false,
        default_branch: 'main',
        visibility: 'private',
        pushed_at: '2026-09-15T00:00:00Z',
        updated_at: '2026-09-15T00:00:00Z',
        owner: { login: 'chainsolutions-wealthtech' },
        permissions: { admin: true, push: true },
        token: 'do-not-return'
      }
    })
  });

  const response = await handler!({ organization: 'chainsolutions-wealthtech', repository: 'Repo' }, {});
  const serialized = JSON.stringify(response);
  assert.match(serialized, /chainsolutions-wealthtech\/Repo/);
  assert.equal(serialized.includes('do-not-return'), false);
  assert.equal(serialized.includes('admin:org'), false);
  assert.equal(serialized.includes('"permissions"'), false);
});
