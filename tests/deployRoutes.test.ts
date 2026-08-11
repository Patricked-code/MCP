import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';

import { createGithubDeployRouter } from '../src/deploy/routes.js';

const SHA = 'c'.repeat(40);
const RUN_ID = '31318000000';
const JOB_ID = `mcp-s1-${RUN_ID}-${SHA.slice(0, 12)}`;

function fakeClaims() {
  return {
    repository: 'Patricked-code/MCP',
    sha: SHA,
    run_id: RUN_ID,
    event_name: 'push'
  };
}

async function withServer(
  dependencies: Parameters<typeof createGithubDeployRouter>[0],
  fn: (baseUrl: string) => Promise<void>
) {
  const app = express();
  app.use(createGithubDeployRouter(dependencies));
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

function dependencies(overrides: Partial<Parameters<typeof createGithubDeployRouter>[0]> = {}) {
  return {
    verifyOidc: async (token: string, sha: string) => {
      if (token !== 'valid-oidc') throw new Error('oidc_signature_invalid');
      if (sha !== SHA) throw new Error('oidc_sha_mismatch');
      return fakeClaims();
    },
    writeEnabled: () => true,
    runWrite: async (_command: string) => ({ code: 0, stdout: '', stderr: '' }),
    runRead: async (_command: string) => ({
      code: 0,
      stdout: [
        `job_id=${JOB_ID}`,
        `requested_sha=${SHA}`,
        'status=succeeded',
        'phase=attested',
        `runtime_revision=${SHA}`,
        'rollback_status=not_needed',
        'health_ok=true',
        'oauth_ok=true',
        'mcp_auth_ok=true'
      ].join('\n'),
      stderr: ''
    }),
    ...overrides
  };
}

test('POST start refuse toute requête sans Bearer OIDC avant une écriture S1', async () => {
  let writes = 0;
  await withServer(dependencies({
    runWrite: async () => {
      writes += 1;
      return { code: 0, stdout: '', stderr: '' };
    }
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/deploy/github/s1/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sha: SHA })
    });
    assert.equal(response.status, 401);
    assert.equal(writes, 0);
  });
});

test('un Bearer MCP ordinaire ne remplace pas un OIDC GitHub valide', async () => {
  let writes = 0;
  await withServer(dependencies({
    runWrite: async () => {
      writes += 1;
      return { code: 0, stdout: '', stderr: '' };
    }
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/deploy/github/s1/start`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer ordinary-mcp-token-that-is-not-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ sha: SHA })
    });
    assert.equal(response.status, 403);
    assert.equal(writes, 0);
  });
});

test('POST start valide strictement le payload et le write-gate avant SSH', async () => {
  let writes = 0;
  await withServer(dependencies({
    writeEnabled: () => false,
    runWrite: async () => {
      writes += 1;
      return { code: 0, stdout: '', stderr: '' };
    }
  }), async (baseUrl) => {
    const disabled = await fetch(`${baseUrl}/deploy/github/s1/start`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ sha: SHA })
    });
    assert.equal(disabled.status, 503);
    assert.equal(writes, 0);
  });

  await withServer(dependencies(), async (baseUrl) => {
    const extra = await fetch(`${baseUrl}/deploy/github/s1/start`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ sha: SHA, command: 'whoami' })
    });
    assert.equal(extra.status, 400);

    const shortSha = await fetch(`${baseUrl}/deploy/github/s1/start`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ sha: SHA.slice(0, 12) })
    });
    assert.equal(shortSha.status, 400);
  });
});

test('POST start lie le run_id vérifié au job et retourne 202 après lancement détaché réussi', async () => {
  let writeCommand = '';
  await withServer(dependencies({
    runWrite: async (command: string) => {
      writeCommand = command;
      return { code: 0, stdout: `job_id=${JOB_ID}\nrequested_sha=${SHA}\nstatus=queued\n`, stderr: '' };
    }
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/deploy/github/s1/start`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ sha: SHA })
    });
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { jobId: JOB_ID, requestedSha: SHA, status: 'queued' });
    assert.match(writeCommand, new RegExp(JOB_ID));
    assert.match(writeCommand, new RegExp(SHA));
    assert.match(writeCommand, /nohup/);
  });
});

test('POST start fail closed si la commande S1 échoue', async () => {
  await withServer(dependencies({
    runWrite: async () => ({ code: 23, stdout: '', stderr: 'denied' })
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/deploy/github/s1/start`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ sha: SHA })
    });
    assert.equal(response.status, 502);
  });
});

test('GET status exige un OIDC frais et un SHA complet puis parse le statut borné', async () => {
  let reads = 0;
  await withServer(dependencies({
    runRead: async (command: string) => {
      reads += 1;
      assert.match(command, new RegExp(JOB_ID));
      return {
        code: 0,
        stdout: [
          `job_id=${JOB_ID}`,
          `requested_sha=${SHA}`,
          'status=succeeded',
          'phase=attested',
          `runtime_revision=${SHA}`,
          'rollback_status=not_needed',
          'health_ok=true',
          'oauth_ok=true',
          'mcp_auth_ok=true'
        ].join('\n'),
        stderr: ''
      };
    }
  }), async (baseUrl) => {
    const missingAuth = await fetch(`${baseUrl}/deploy/github/s1/status/${JOB_ID}?sha=${SHA}`);
    assert.equal(missingAuth.status, 401);
    assert.equal(reads, 0);

    const missingSha = await fetch(`${baseUrl}/deploy/github/s1/status/${JOB_ID}`, {
      headers: { authorization: 'Bearer valid-oidc' }
    });
    assert.equal(missingSha.status, 400);
    assert.equal(reads, 0);

    const response = await fetch(`${baseUrl}/deploy/github/s1/status/${JOB_ID}?sha=${SHA}`, {
      headers: { authorization: 'Bearer valid-oidc' }
    });
    assert.equal(response.status, 200);
    const body = await response.json() as Record<string, unknown>;
    assert.equal(body.jobId, JOB_ID);
    assert.equal(body.requestedSha, SHA);
    assert.equal(body.status, 'succeeded');
    assert.equal(body.runtimeRevision, SHA);
    assert.equal(body.healthOk, true);
    assert.equal(reads, 1);
  });
});

test('GET status refuse jobId arbitraire avant toute lecture S1', async () => {
  let reads = 0;
  await withServer(dependencies({
    runRead: async () => {
      reads += 1;
      return { code: 0, stdout: '', stderr: '' };
    }
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/deploy/github/s1/status/../../etc/passwd?sha=${SHA}`, {
      headers: { authorization: 'Bearer valid-oidc' },
      redirect: 'manual'
    });
    assert.notEqual(response.status, 200);
    assert.equal(reads, 0);
  });
});

test('le routeur limite son JSON à 4kb', async () => {
  await withServer(dependencies(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/deploy/github/s1/start`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ sha: SHA, padding: 'x'.repeat(5000) })
    });
    assert.equal(response.status, 413);
  });
});
