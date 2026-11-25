import assert from 'node:assert/strict';
import { test } from 'node:test';
// Like the cartography test harness, provide inert config before importing
// modules that read env.ts at module evaluation time. No live secrets.
process.env.MCP_AUTH_TOKEN ??= 'unit-test-only-not-a-runtime-token';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/workers-project4-test-s1-unused';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/workers-project4-test-s2-unused';

const { inspectWorkersProject4Access, WORKERS_PROJECT4_QUERY } =
  await import('../src/tools/githubProjectAccess.js');
import type { GitHubJsonRequestOptions, GitHubJsonResponse } from '../src/github/connection.js';

function response(json: unknown, status = 200): GitHubJsonResponse {
  return { ok: status >= 200 && status < 300, status, json, tokenExpiresAt: null, oauthScopes: [] };
}
const sample = {
  data: {
    viewer: { login: 'Patricked-code' },
    user: {
      projectV2: {
        id: 'PVT_test_project4',
        number: 4,
        title: 'WORKERS — Mémoire canonique commune',
        public: true,
        url: 'https://github.com/users/Patricked-code/projects/4',
        viewerCanUpdate: true
      }
    }
  }
};

test('dedicated Projects credential rejects arbitrary GraphQL and mutations', async () => {
  const { githubJsonRequestWithPersonalProjectsCredential } =
    await import('../src/github/connection.js');
  for (const input of [
    { endpoint: '/repos/Patricked-code/MCP', options: {method:'POST' as const, jsonBody:{query:'query WorkersProject4Read($owner: String!) { viewer {login} }'}} },
    { endpoint: '/graphql', options: {method:'POST' as const, jsonBody:{query:'mutation Test { __typename }'}} },
    { endpoint: '/graphql', options: {method:'POST' as const, jsonBody:{query:'query ArbitraryQuery { viewer { login } }'}} }
  ]) {
    const r = await githubJsonRequestWithPersonalProjectsCredential(input.endpoint, input.options);
    assert.equal(r.ok, false);
    assert.equal(r.status, null);
    assert.equal(r.json, null);
  }
});

test('GraphQL operation is a query, never a mutation', () => {
  assert.match(WORKERS_PROJECT4_QUERY, /^query\s/);
  assert.doesNotMatch(WORKERS_PROJECT4_QUERY, /\bmutation\b/i);
});

test('read access verified with existing server credential and expected target', async () => {
  const result = await inspectWorkersProject4Access(async (endpoint: string, options?: GitHubJsonRequestOptions) => {
    assert.equal(endpoint, '/graphql');
    assert.equal(options?.method, 'POST');
    const args = options?.jsonBody as { variables: {owner:string;number:number};query:string };
    assert.deepEqual(args.variables, { owner: 'Patricked-code', number: 4 });
    assert.equal(args.query, WORKERS_PROJECT4_QUERY);
    return response(sample);
  });
  assert.equal(result.status, 'READ_ACCESS_VERIFIED');
  assert.equal(result.projectNodeId, 'PVT_test_project4');
  assert.equal(result.viewerCanUpdate, true);
  assert.equal(result.noMutation, true);
});

test('read does not imply mutation authorization', async () => {
  const result = await inspectWorkersProject4Access(async () => response({
    data: {
      viewer: sample.data.viewer,
      user: { projectV2: { ...sample.data.user.projectV2, viewerCanUpdate: false } }
    }
  }));
  assert.equal(result.status, 'READ_ACCESS_VERIFIED');
  assert.equal(result.viewerCanUpdate, false);
});

test('different authenticated GitHub user is blocked', async () => {
  const result = await inspectWorkersProject4Access(async () => response({
    data: { viewer: { login: 'other-user' }, user: sample.data.user }
  }));
  assert.equal(result.status, 'GITHUB_PRINCIPAL_MISMATCH');
});

test('private Project can be read without changing its visibility', async () => {
  const result = await inspectWorkersProject4Access(async () => response({
    data: {
      viewer: sample.data.viewer,
      user: { projectV2: { ...sample.data.user.projectV2, public: false } }
    }
  }));
  assert.equal(result.status, 'READ_ACCESS_VERIFIED');
  assert.equal(result.public, false);
  assert.equal(result.noMutation, true);
});

test('missing Project visibility fails closed', async () => {
  const result = await inspectWorkersProject4Access(async () => response({
    data: {
      viewer: sample.data.viewer,
      user: { projectV2: { ...sample.data.user.projectV2, public: null } }
    }
  }));
  assert.equal(result.status, 'PROJECT_IDENTITY_MISMATCH');
});

test('inaccessible project is not reported as absent', async () => {
  const result = await inspectWorkersProject4Access(async () => response({
    data: { viewer: sample.data.viewer, user: { projectV2: null } }
  }));
  assert.equal(result.status, 'PROJECT_UNAVAILABLE_OR_UNAUTHORIZED');
});

test('API error strings and tokens are never included in result', async () => {
  const secret = 'ghp_secret_must_not_appear';
  const result = await inspectWorkersProject4Access(async () => response({
    errors: [{ message: secret }], data: null
  }));
  assert.equal(result.status, 'GITHUB_GRAPHQL_REJECTED');
  assert.doesNotMatch(JSON.stringify(result), /ghp_secret/);
});

test('HTTP authorization refusal stays a bounded error', async () => {
  const result = await inspectWorkersProject4Access(async () => response(null, 403));
  assert.equal(result.status, 'GITHUB_REQUEST_UNAVAILABLE');
  assert.equal(result.httpStatus, 403);
});

test('transport exception stays bounded and read-only', async () => {
  const result = await inspectWorkersProject4Access(async () => {
    throw Error('sensitive');
  });
  assert.equal(result.status, 'GITHUB_REQUEST_UNAVAILABLE');
  assert.equal(result.noMutation, true);
  assert.doesNotMatch(JSON.stringify(result), /sensitive/);
});
