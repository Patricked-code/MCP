import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import express from 'express';
import test from 'node:test';

import {
  buildStablecoinFastForwardCommand,
  createStablecoinFastForwardRouter
} from '../src/stablecoin/githubFastForward.js';

const MCP_SHA = 'a'.repeat(40);
const SERVER_SHA = 'b'.repeat(40);
const TARGET_SHA = 'c'.repeat(40);

async function withServer(
  dependencies: Parameters<typeof createStablecoinFastForwardRouter>[0],
  fn: (baseUrl: string) => Promise<void>
): Promise<void> {
  const app = express();
  app.use(createStablecoinFastForwardRouter(dependencies));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function deps(
  overrides: Partial<Parameters<typeof createStablecoinFastForwardRouter>[0]> = {}
) {
  return {
    verifyOidc: async (token: string, sha: string) => {
      if (token !== 'valid-oidc') throw new Error('oidc_signature_invalid');
      if (sha !== MCP_SHA) throw new Error('oidc_sha_mismatch');
      return { sha, event_name: 'issues', run_id: '35540000000' };
    },
    writeEnabled: () => true,
    runWrite: async (_command: string) => ({
      code: 0,
      stdout: [
        'status=succeeded',
        `server_before=${SERVER_SHA}`,
        `server_after=${TARGET_SHA}`,
        `target_sha=${TARGET_SHA}`,
        'changed_files=16',
        'application_files=0',
        'frontend_http=200',
        'api_root_http=401',
        'api_health_http=401'
      ].join('\n'),
      stderr: ''
    }),
    ...overrides
  };
}

test('Stablecoin GitHub-first command is exact-SHA, fail-closed and metadata-only', () => {
  const command = buildStablecoinFastForwardCommand({
    expectedServerSha: SERVER_SHA,
    targetSha: TARGET_SHA
  });

  assert.match(command, /stablecoin\.chainsolutions\.fr\/stablecoin/);
  assert.match(command, /git branch --show-current/);
  assert.match(command, /working tree Stablecoin non propre/);
  assert.match(command, /git remote get-url origin/);
  assert.match(command, /Patricked-code\/Stablecoin\.git/);
  assert.match(command, new RegExp(SERVER_SHA));
  assert.match(command, new RegExp(TARGET_SHA));
  assert.match(command, /git ls-remote origin refs\/heads\/main/);
  assert.match(command, /git fetch --no-tags origin main/);
  assert.match(command, /git merge-base --is-ancestor/);
  assert.match(command, /git diff --name-only -z/);
  assert.match(command, /git merge --ff-only "\$TARGET_SHA"/);
  assert.match(command, /application_files=0/);

  assert.doesNotMatch(command, /git stash/);
  assert.doesNotMatch(command, /git rebase/);
  assert.doesNotMatch(command, /git reset/);
  assert.doesNotMatch(command, /npm (install|run build)/);
  assert.doesNotMatch(command, /touch tmp\/restart\.txt/);
  assert.doesNotMatch(command, /pm2 restart|docker compose|systemctl restart/);

  const syntax = spawnSync('bash', ['-n'], { input: command, encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
});

test('Stablecoin GitHub-first endpoint requires OIDC, exact payload and enabled write gate', async () => {
  let writes = 0;
  await withServer(deps({
    runWrite: async () => {
      writes += 1;
      return { code: 0, stdout: '', stderr: '' };
    }
  }), async (baseUrl) => {
    const missingAuth = await fetch(`${baseUrl}/deploy/github/stablecoin/s2/fast-forward`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sha: MCP_SHA,
        expectedServerSha: SERVER_SHA,
        targetSha: TARGET_SHA,
        requestId: 'stablecoin-write-001'
      })
    });
    assert.equal(missingAuth.status, 401);
    assert.equal(writes, 0);

    const extra = await fetch(`${baseUrl}/deploy/github/stablecoin/s2/fast-forward`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sha: MCP_SHA,
        expectedServerSha: SERVER_SHA,
        targetSha: TARGET_SHA,
        requestId: 'stablecoin-write-001',
        command: 'whoami'
      })
    });
    assert.equal(extra.status, 400);
    assert.equal(writes, 0);
  });

  await withServer(deps({ writeEnabled: () => false }), async (baseUrl) => {
    const disabled = await fetch(`${baseUrl}/deploy/github/stablecoin/s2/fast-forward`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sha: MCP_SHA,
        expectedServerSha: SERVER_SHA,
        targetSha: TARGET_SHA,
        requestId: 'stablecoin-write-002'
      })
    });
    assert.equal(disabled.status, 503);
  });
});

test('Stablecoin GitHub-first endpoint emits bounded success and failure envelopes only', async () => {
  await withServer(deps(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/deploy/github/stablecoin/s2/fast-forward`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sha: MCP_SHA,
        expectedServerSha: SERVER_SHA,
        targetSha: TARGET_SHA,
        requestId: 'stablecoin-write-003'
      })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      schemaVersion: 1,
      requestId: 'stablecoin-write-003',
      status: 'succeeded',
      serverBefore: SERVER_SHA,
      serverAfter: TARGET_SHA,
      targetSha: TARGET_SHA,
      changedFiles: 16,
      applicationFiles: 0,
      frontendHttp: 200,
      apiRootHttp: 401,
      apiHealthHttp: 401
    });
  });

  await withServer(deps({
    runWrite: async () => ({
      code: 28,
      stdout: 'sensitive output must not escape',
      stderr: 'sensitive stderr must not escape'
    })
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/deploy/github/stablecoin/s2/fast-forward`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sha: MCP_SHA,
        expectedServerSha: SERVER_SHA,
        targetSha: TARGET_SHA,
        requestId: 'stablecoin-write-004'
      })
    });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: 'stablecoin_fast_forward_rejected',
      reasonCode: 'application_diff_detected'
    });
  });
});
