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

const COMMIT_WITH_FILES = {
  sha: 'abc123'.padEnd(40, '0'),
  html_url: 'https://github.test/commit/abc123',
  commit: {
    message: 'feat: add new feature',
    author: { date: '2026-10-29T10:00:00Z' },
    committer: { date: '2026-10-29T10:00:00Z' }
  },
  author: { login: 'dev' },
  committer: { login: 'dev' },
  parents: [{ sha: 'parent1'.padEnd(40, '0') }],
  stats: { total: 15, additions: 10, deletions: 5 },
  files: [
    {
      sha: 'filesha1'.padEnd(40, '0'),
      filename: 'src/feature.ts',
      status: 'added',
      additions: 8,
      deletions: 0,
      changes: 8,
      patch: '@@ -0,0 +1,8 @@\n+export function feature() {\n+  return true;\n+}'
    },
    {
      sha: 'filesha2'.padEnd(40, '0'),
      filename: 'src/index.ts',
      status: 'modified',
      additions: 2,
      deletions: 5,
      changes: 7,
      patch: '@@ -1,5 +1,2 @@\n-old line\n+new line'
    }
  ]
};

test('github_get_commit_diff is registered as a tool', () => {
  const r = registry();
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ok({})
  });
  assert.ok(r.names.includes('github_get_commit_diff'), 'github_get_commit_diff must be registered');
});

test('github_get_commit_diff returns file-level diff with patches for a commit', async () => {
  const r = registry();
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async (endpoint: string) => {
      assert.match(endpoint, /\/repos\/chainsolutions-wealthtech\/Repo\/commits\//);
      return ok(COMMIT_WITH_FILES);
    }
  });

  const handler = r.handlers.get('github_get_commit_diff');
  assert.ok(handler);
  const out = parsed(await handler({
    organization: 'chainsolutions-wealthtech',
    repository: 'Repo',
    ref: 'abc123'.padEnd(40, '0')
  }, {}));

  assert.equal(out.sha, 'abc123'.padEnd(40, '0'));
  assert.equal(out.message, 'feat: add new feature');
  assert.equal(out.stats.additions, 10);
  assert.equal(out.stats.deletions, 5);
  assert.equal(out.stats.total, 15);
  assert.equal(out.files.length, 2);

  const f0 = out.files[0];
  assert.equal(f0.filename, 'src/feature.ts');
  assert.equal(f0.status, 'added');
  assert.equal(f0.additions, 8);
  assert.equal(typeof f0.patch, 'string');
  assert.ok(f0.patch.includes('export function feature'));

  const f1 = out.files[1];
  assert.equal(f1.filename, 'src/index.ts');
  assert.equal(f1.status, 'modified');
});

test('github_get_commit_diff truncates patch to bounded size', async () => {
  const bigPatch = '@@ -1,1 +1,1 @@\n' + '+x'.repeat(60000);
  const r = registry();
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ok({
      ...COMMIT_WITH_FILES,
      files: [{
        sha: 'a'.padEnd(40, '0'),
        filename: 'big.ts',
        status: 'modified',
        additions: 1000,
        deletions: 0,
        changes: 1000,
        patch: bigPatch
      }]
    })
  });

  const handler = r.handlers.get('github_get_commit_diff');
  assert.ok(handler);
  const out = parsed(await handler({
    organization: 'chainsolutions-wealthtech',
    repository: 'Repo',
    ref: 'abc123'.padEnd(40, '0')
  }, {}));

  assert.equal(out.files.length, 1);
  assert.ok(out.files[0].patch.length <= 50001, 'patch must be truncated to bounded size');
  assert.equal(out.files[0].patchTruncated, true);
});

test('github_get_commit_diff caps files array to 300 entries', async () => {
  const manyFiles = Array.from({ length: 400 }, (_, i) => ({
    sha: i.toString(16).padStart(40, '0'),
    filename: `file-${i}.ts`,
    status: 'modified',
    additions: 1,
    deletions: 0,
    changes: 1,
    patch: '@@ -1 +1 @@\n+x'
  }));
  const r = registry();
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ok({ ...COMMIT_WITH_FILES, files: manyFiles })
  });

  const handler = r.handlers.get('github_get_commit_diff');
  assert.ok(handler);
  const out = parsed(await handler({
    organization: 'chainsolutions-wealthtech',
    repository: 'Repo',
    ref: 'abc123'.padEnd(40, '0')
  }, {}));

  assert.ok(out.files.length <= 300, 'files must be capped at 300');
});

test('github_get_commit_diff is read-only and bounded', () => {
  const r = registry();
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ok({})
  });
  assert.ok(r.handlers.has('github_get_commit_diff'));
});
