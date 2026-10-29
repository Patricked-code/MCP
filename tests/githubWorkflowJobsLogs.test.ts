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

test('github_get_workflow_jobs is registered', () => {
  const r = registry();
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ok({})
  });
  assert.ok(r.names.includes('github_get_workflow_jobs'));
});

test('github_get_workflow_jobs returns bounded job list with steps', async () => {
  const r = registry();
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async (endpoint: string) => {
      assert.match(endpoint, /\/actions\/runs\/12345\/jobs/);
      return ok({
        total_count: 2,
        jobs: [
          {
            id: 100,
            name: 'build',
            status: 'completed',
            conclusion: 'success',
            started_at: '2026-10-29T10:00:00Z',
            completed_at: '2026-10-29T10:05:00Z',
            runner_name: 'ubuntu-latest',
            steps: [
              { name: 'Checkout', status: 'completed', conclusion: 'success', number: 1, started_at: '2026-10-29T10:00:00Z', completed_at: '2026-10-29T10:00:10Z' },
              { name: 'Build', status: 'completed', conclusion: 'success', number: 2, started_at: '2026-10-29T10:00:10Z', completed_at: '2026-10-29T10:05:00Z' }
            ]
          },
          {
            id: 101,
            name: 'test',
            status: 'completed',
            conclusion: 'failure',
            started_at: '2026-10-29T10:05:00Z',
            completed_at: '2026-10-29T10:10:00Z',
            runner_name: 'ubuntu-latest',
            steps: []
          }
        ]
      });
    }
  });

  const handler = r.handlers.get('github_get_workflow_jobs');
  assert.ok(handler);
  const out = parsed(await handler({
    organization: 'chainsolutions-wealthtech',
    repository: 'Repo',
    runId: 12345
  }, {}));

  assert.equal(out.totalCount, 2);
  assert.equal(out.jobs.length, 2);
  assert.equal(out.jobs[0].name, 'build');
  assert.equal(out.jobs[0].conclusion, 'success');
  assert.equal(out.jobs[0].steps.length, 2);
  assert.equal(out.jobs[0].steps[0].name, 'Checkout');
  assert.equal(out.jobs[1].name, 'test');
  assert.equal(out.jobs[1].conclusion, 'failure');
});

test('github_get_workflow_run_logs is registered', () => {
  const r = registry();
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ok({})
  });
  assert.ok(r.names.includes('github_get_workflow_run_logs'));
});

test('github_get_workflow_run_logs returns bounded log text', async () => {
  const logContent = 'Step 1: Checkout\nStep 2: Build\nStep 3: Test\nAll passed.';
  const r = registry();
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async (endpoint: string) => {
      assert.match(endpoint, /\/actions\/jobs\/100\/logs/);
      return ok(logContent);
    }
  });

  const handler = r.handlers.get('github_get_workflow_run_logs');
  assert.ok(handler);
  const out = parsed(await handler({
    organization: 'chainsolutions-wealthtech',
    repository: 'Repo',
    jobId: 100
  }, {}));

  assert.equal(out.jobId, 100);
  assert.equal(out.logText, logContent);
  assert.equal(out.truncated, false);
  assert.equal(out.totalLength, logContent.length);
});

test('github_get_workflow_run_logs truncates large logs', async () => {
  const bigLog = 'x'.repeat(150000);
  const r = registry();
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ok(bigLog)
  });

  const handler = r.handlers.get('github_get_workflow_run_logs');
  assert.ok(handler);
  const out = parsed(await handler({
    organization: 'chainsolutions-wealthtech',
    repository: 'Repo',
    jobId: 200
  }, {}));

  assert.equal(out.truncated, true);
  assert.ok(out.logText.length <= 100001);
  assert.equal(out.totalLength, 150000);
});

test('github_get_workflow_jobs caps jobs to 200 entries', async () => {
  const manyJobs = Array.from({ length: 250 }, (_, i) => ({
    id: i,
    name: `job-${i}`,
    status: 'completed',
    conclusion: 'success',
    started_at: '2026-10-29T10:00:00Z',
    completed_at: '2026-10-29T10:05:00Z',
    runner_name: 'runner',
    steps: []
  }));
  const r = registry();
  registerGithubControlPlaneReadTools(r.server, {
    configuredOrg: 'chainsolutions-wealthtech',
    request: async () => ok({ total_count: 250, jobs: manyJobs })
  });

  const handler = r.handlers.get('github_get_workflow_jobs');
  assert.ok(handler);
  const out = parsed(await handler({
    organization: 'chainsolutions-wealthtech',
    repository: 'Repo',
    runId: 999
  }, {}));

  assert.ok(out.jobs.length <= 200);
});
