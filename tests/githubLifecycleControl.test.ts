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

const { registerGithubLifecycleReadTools, registerGithubLifecycleWriteTools } =
  await import('../src/tools/githubLifecycle.js');

const READY = {
  mode: 'shadow' as const,
  toolName: 'ignored',
  governedSessionId: '11111111-1111-4111-8111-111111111111',
  currentStateVersion: 10,
  acknowledgedStateVersion: 10,
  activeLockConflicts: 0,
  verdict: 'shadow_ready' as const,
  wouldBlock: false
};

test('le lot lifecycle expose la surface READ attendue', () => {
  const names: string[] = [];
  const server = {
    tool(name: string, _description: string, _schema: unknown, _callback: Function) {
      names.push(name);
    }
  } as unknown as McpServer;

  registerGithubLifecycleReadTools(server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ({ ok: true, status: 200, json: {}, tokenExpiresAt: null, oauthScopes: [] })
  });

  assert.deepEqual(names.sort(), [
    'github_get_commit_diff',
    'github_get_commits',
    'github_get_mergeability',
    'github_get_required_checks',
    'github_get_review_threads',
    'github_get_tree'
  ]);
});

test('le lot lifecycle expose les mutations GitHub attendues', () => {
  const names: string[] = [];
  const server = {
    tool(name: string, _description: string, _schema: unknown, _callback: Function) {
      names.push(name);
    }
  } as unknown as McpServer;

  registerGithubLifecycleWriteTools(server, {
    configuredOrg: 'chainsolutions-wealthtech',
    writeEnabled: () => true,
    evaluateGovernance: async () => READY,
    request: async () => ({ ok: true, status: 200, json: {}, tokenExpiresAt: null, oauthScopes: [] })
  });

  assert.deepEqual(names.sort(), [
    'github_create_branch',
    'github_create_commit',
    'github_create_or_update_file',
    'github_create_pull_request',
    'github_delete_branch',
    'github_delete_file',
    'github_mark_pr_ready',
    'github_merge_pull_request',
    'github_reply_review_thread',
    'github_request_review',
    'github_resolve_review_thread',
    'github_update_pull_request'
  ]);
});

test('aucune mutation lifecycle ne passe sans shadow_ready', async () => {
  let handler: Function | null = null;
  let requests = 0;
  const server = {
    tool(name: string, _description: string, _schema: unknown, callback: Function) {
      if (name === 'github_create_branch') handler = callback;
    }
  } as unknown as McpServer;

  registerGithubLifecycleWriteTools(server, {
    configuredOrg: 'chainsolutions-wealthtech',
    writeEnabled: () => true,
    evaluateGovernance: async () => ({ ...READY, verdict: 'task_unclaimed', wouldBlock: true }),
    request: async () => {
      requests += 1;
      return { ok: true, status: 200, json: {}, tokenExpiresAt: null, oauthScopes: [] };
    }
  });

  assert.ok(handler);
  await assert.rejects(
    () => handler!({
      organization: 'chainsolutions-wealthtech',
      repository: 'Repo',
      branch: 'mcp/test',
      baseSha: 'a'.repeat(40)
    }, {}),
    /GITHUB_ADMIN_GOVERNANCE_BLOCKED:task_unclaimed/
  );
  assert.equal(requests, 0);
});

test('create branch utilise un SHA exact et force=false implicite', async () => {
  let handler: Function | null = null;
  const calls: Array<{ endpoint: string; options: any }> = [];
  const server = {
    tool(name: string, _description: string, _schema: unknown, callback: Function) {
      if (name === 'github_create_branch') handler = callback;
    }
  } as unknown as McpServer;

  registerGithubLifecycleWriteTools(server, {
    configuredOrg: 'chainsolutions-wealthtech',
    writeEnabled: () => true,
    evaluateGovernance: async () => READY,
    request: async (endpoint, options = {}) => {
      calls.push({ endpoint, options });
      return {
        ok: true,
        status: 201,
        json: { ref: 'refs/heads/mcp/test', object: { sha: 'a'.repeat(40) } },
        tokenExpiresAt: null,
        oauthScopes: []
      };
    }
  });

  const response = await handler!({
    organization: 'chainsolutions-wealthtech',
    repository: 'Repo',
    branch: 'mcp/test',
    baseSha: 'a'.repeat(40)
  }, {});

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.endpoint, '/repos/chainsolutions-wealthtech/Repo/git/refs');
  assert.deepEqual(calls[0]?.options, {
    method: 'POST',
    jsonBody: { ref: 'refs/heads/mcp/test', sha: 'a'.repeat(40) }
  });
  assert.equal(JSON.stringify(response).includes('mcp/test'), true);
});

test('merge refuse un head différent avant toute mutation', async () => {
  let handler: Function | null = null;
  const calls: Array<{ endpoint: string; options: any }> = [];
  const server = {
    tool(name: string, _description: string, _schema: unknown, callback: Function) {
      if (name === 'github_merge_pull_request') handler = callback;
    }
  } as unknown as McpServer;

  registerGithubLifecycleWriteTools(server, {
    configuredOrg: 'chainsolutions-wealthtech',
    writeEnabled: () => true,
    evaluateGovernance: async () => READY,
    request: async (endpoint, options = {}) => {
      calls.push({ endpoint, options });
      if (options.method === undefined || options.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: {
            number: 7,
            draft: false,
            merged: false,
            mergeable: true,
            head: { sha: 'b'.repeat(40) },
            base: { ref: 'main' }
          },
          tokenExpiresAt: null,
          oauthScopes: []
        };
      }
      throw new Error('mutation should not happen');
    }
  });

  await assert.rejects(
    () => handler!({
      organization: 'chainsolutions-wealthtech',
      repository: 'Repo',
      pullRequestNumber: 7,
      expectedHeadSha: 'a'.repeat(40),
      mergeMethod: 'squash'
    }, {}),
    /GITHUB_PR_HEAD_STALE/
  );
  assert.equal(calls.length, 1);
});

test('create commit vérifie le head exact avant de créer blobs/tree/commit/ref', async () => {
  let handler: Function | null = null;
  const calls: Array<{ endpoint: string; options: any }> = [];
  const baseSha='a'.repeat(40);
  const newSha='d'.repeat(40);
  const server = {
    tool(name: string, _description: string, _schema: unknown, callback: Function) {
      if (name === 'github_create_commit') handler = callback;
    }
  } as unknown as McpServer;

  registerGithubLifecycleWriteTools(server, {
    configuredOrg: 'chainsolutions-wealthtech',
    writeEnabled: () => true,
    evaluateGovernance: async () => READY,
    request: async (endpoint, options = {}) => {
      calls.push({ endpoint, options });
      if (endpoint.endsWith('/branches/mcp%2Fwork')) {
        return { ok:true,status:200,json:{name:'mcp/work',commit:{sha:baseSha}},tokenExpiresAt:null,oauthScopes:[] };
      }
      if (endpoint.endsWith('/git/commits/'+baseSha)) {
        return { ok:true,status:200,json:{sha:baseSha,tree:{sha:'c'.repeat(40)}},tokenExpiresAt:null,oauthScopes:[] };
      }
      if (endpoint.endsWith('/git/blobs')) {
        return { ok:true,status:201,json:{sha:'1'.repeat(40)},tokenExpiresAt:null,oauthScopes:[] };
      }
      if (endpoint.endsWith('/git/trees')) {
        return { ok:true,status:201,json:{sha:'2'.repeat(40)},tokenExpiresAt:null,oauthScopes:[] };
      }
      if (endpoint.endsWith('/git/commits')) {
        return { ok:true,status:201,json:{sha:newSha},tokenExpiresAt:null,oauthScopes:[] };
      }
      if (endpoint.endsWith('/git/refs/heads/mcp%2Fwork')) {
        return { ok:true,status:200,json:{ref:'refs/heads/mcp/work',object:{sha:newSha}},tokenExpiresAt:null,oauthScopes:[] };
      }
      throw new Error('unexpected '+endpoint);
    }
  });

  const response = await handler!({
    organization:'chainsolutions-wealthtech',
    repository:'Repo',
    branch:'mcp/work',
    expectedHeadSha:baseSha,
    message:'feat: bounded change',
    files:[{path:'src/example.ts',contentBase64:Buffer.from('export {};').toString('base64')}]
  },{});

  assert.equal(JSON.stringify(response).includes(newSha),true);
  assert.equal(calls[0]?.endpoint,'/repos/chainsolutions-wealthtech/Repo/branches/mcp%2Fwork');
  assert.equal(calls.at(-1)?.options?.method,'PATCH');
  assert.deepEqual(calls.at(-1)?.options?.jsonBody,{sha:newSha,force:false});
});
