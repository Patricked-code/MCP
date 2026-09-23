import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import express from 'express';
import test from 'node:test';

import {
  buildGithubReadonlyEvidenceCommand,
  createGithubReadonlyEvidenceRouter
} from '../src/evidence/githubReadonlyRoutes.js';
import { assertReadOnlyCommand } from '../src/ssh/safety.js';

const SHA = 'd'.repeat(40);

async function withServer(
  dependencies: Parameters<typeof createGithubReadonlyEvidenceRouter>[0],
  fn: (baseUrl: string) => Promise<void>
): Promise<void> {
  const app = express();
  app.use(createGithubReadonlyEvidenceRouter(dependencies));
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

function dependencies(
  overrides: Partial<Parameters<typeof createGithubReadonlyEvidenceRouter>[0]> = {}
) {
  return {
    verifyOidc: async (token: string, sha: string) => {
      if (token !== 'valid-oidc') throw new Error('oidc_signature_invalid');
      if (sha !== SHA) throw new Error('oidc_sha_mismatch');
      return { sha, event_name: 'issues', run_id: '123' };
    },
    runRead: async (_target: 's1' | 's2', _command: string) => ({
      code: 0,
      stdout: 'branch=main\nhead=abc\nworking_tree_changes=0\n',
      stderr: ''
    }),
    ...overrides
  };
}

test('endpoint requires GitHub OIDC before any server read', async () => {
  let reads = 0;
  await withServer(dependencies({
    runRead: async () => {
      reads += 1;
      return { code: 0, stdout: '', stderr: '' };
    }
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/evidence/github/readonly`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sha: SHA,
        target: 's2',
        probe: 'stablecoin_frontend_git_status',
        requestId: 'readonly-001'
      })
    });
    assert.equal(response.status, 401);
    assert.equal(reads, 0);
  });
});

test('ordinary bearer or extra command field is rejected before server read', async () => {
  let reads = 0;
  await withServer(dependencies({
    runRead: async () => {
      reads += 1;
      return { code: 0, stdout: '', stderr: '' };
    }
  }), async (baseUrl) => {
    const ordinary = await fetch(`${baseUrl}/evidence/github/readonly`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer ordinary-mcp-token',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sha: SHA,
        target: 's2',
        probe: 'stablecoin_frontend_git_status',
        requestId: 'readonly-001'
      })
    });
    assert.equal(ordinary.status, 403);

    const extra = await fetch(`${baseUrl}/evidence/github/readonly`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sha: SHA,
        target: 's2',
        probe: 'stablecoin_frontend_git_status',
        requestId: 'readonly-001',
        command: 'whoami'
      })
    });
    assert.equal(extra.status, 400);
    assert.equal(reads, 0);
  });
});

test('Stablecoin probe maps only to the documented S2 checkout', async () => {
  let observedTarget = '';
  let observedCommand = '';
  await withServer(dependencies({
    runRead: async (target, command) => {
      observedTarget = target;
      observedCommand = command;
      return {
        code: 0,
        stdout: 'branch=main\nhead=abc\nworking_tree_changes=0\n',
        stderr: ''
      };
    }
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/evidence/github/readonly`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sha: SHA,
        target: 's2',
        probe: 'stablecoin_frontend_git_status',
        requestId: 'stablecoin-s2-001'
      })
    });
    assert.equal(response.status, 200);
    const body = await response.json() as Record<string, unknown>;
    assert.equal(body.mutationAllowed, false);
    assert.equal(body.target, 's2');
    assert.equal(body.probe, 'stablecoin_frontend_git_status');
    assert.equal(observedTarget, 's2');
    assert.match(
      observedCommand,
      /\/var\/www\/vhosts\/chainsolutions\.fr\/stablecoin\.chainsolutions\.fr\/stablecoin/
    );
  });
});



test('Stablecoin backend probe is bounded to the documented API path', () => {
  const command = buildGithubReadonlyEvidenceCommand('s2', 'stablecoin_backend_git_status');
  assert.match(
    command,
    /\/var\/www\/vhosts\/chainsolutions\.fr\/api\.stablecoin\.chainsolutions\.fr/
  );
  assert.match(command, /path_exists=/);
  assert.match(command, /git_repo=/);
});

test('Stablecoin runtime probe reads only paths, process identity and HTTP status', () => {
  const command = buildGithubReadonlyEvidenceCommand('s2', 'stablecoin_runtime_status');
  assert.match(command, /frontend_path_exists=/);
  assert.match(command, /backend_path_exists=/);
  assert.match(command, /pgrep -f 'Passenger\|passenger\|node'/);
  assert.match(command, /http_status=/);
  assert.match(command, /https:\/\/stablecoin\.chainsolutions\.fr\//);
  assert.match(command, /https:\/\/api\.stablecoin\.chainsolutions\.fr\/health/);
  assert.doesNotMatch(command, /printenv|env\s|\/proc\/[^\s]+\/environ/);
});

test('Stablecoin backend inventory probe emits metadata only and never secret values', () => {
  const command = buildGithubReadonlyEvidenceCommand('s2', 'stablecoin_backend_inventory');

  assert.match(command, /api\.stablecoin\.chainsolutions\.fr/);
  assert.match(command, /line\('package_name'/);
  assert.match(command, /line\('package_version'/);
  assert.match(command, /line\('package_repository'/);
  assert.match(command, /'sequelize'/);
  assert.match(command, /'mysql2'/);
  assert.match(command, /'pg'/);
  assert.match(command, /line\('dependency_' \+ dep\.replace/);
  assert.match(command, /line\('known_file'/);
  assert.match(command, /line\('sha256'/);
  assert.match(command, /line\('env_ref'/);
  assert.match(command, /line\('db_dialect_hint'/);
  assert.match(command, /line\('root_uid'/);
  assert.match(command, /line\('root_gid'/);

  assert.doesNotMatch(command, /printenv|\/proc\/[^\s]+\/environ/);
  assert.doesNotMatch(command, /(?:cat|grep|readFileSync)\([^\n]*['\"]?\.env(?:\.|['\"\s])/i);
  assert.doesNotMatch(command, /console\.log\([^\n]*(?:password|secret|token|key)[^\n]*\)/i);
  assert.doesNotMatch(command, /process\.env\[[^\]]+\]/);
  assert.doesNotThrow(() => assertReadOnlyCommand(command));

  const syntax = spawnSync('bash', ['-n'], { input: command, encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
});

test('Stablecoin backend runtime ownership probe exposes only bounded Passenger/Plesk metadata', () => {
  const command = buildGithubReadonlyEvidenceCommand('s2', 'stablecoin_backend_runtime_ownership');

  assert.match(command, /api\.stablecoin\.chainsolutions\.fr/);
  assert.match(command, /'passenger_app_root'/);
  assert.match(command, /'passenger_startup_file'/);
  assert.match(command, /'passenger_nodejs'/);
  assert.match(command, /out\('backend_process_uid'/);
  assert.match(command, /out\('backend_process_gid'/);
  assert.match(command, /out\('backend_process_exe'/);
  assert.match(command, /statMeta\(restartFile, 'restart_file'\)/);
  assert.match(command, /'plesk_conf_file'/);

  assert.doesNotMatch(command, /printenv|\/proc\/[^\s]+\/environ/);
  assert.doesNotMatch(command, /SetEnv|PassEnv|env\[/i);
  assert.doesNotMatch(command, /(?:cat|grep|readFileSync)\([^\n]*['"]?\.env/i);
  assert.doesNotThrow(() => assertReadOnlyCommand(command));

  const syntax = spawnSync('bash', ['-n'], { input: command, encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
});

test('Stablecoin backend/runtime probes satisfy the real runtime read-only policy and Bash syntax', () => {
  const commands = [
    buildGithubReadonlyEvidenceCommand('s2', 'stablecoin_backend_git_status'),
    buildGithubReadonlyEvidenceCommand('s2', 'stablecoin_backend_inventory'),
    buildGithubReadonlyEvidenceCommand('s2', 'stablecoin_backend_runtime_ownership'),
    buildGithubReadonlyEvidenceCommand('s2', 'stablecoin_runtime_status')
  ];
  for (const command of commands) {
    assert.doesNotThrow(() => assertReadOnlyCommand(command));
    const syntax = spawnSync('bash', ['-n'], {
      input: command,
      encoding: 'utf8'
    });
    assert.equal(syntax.status, 0, syntax.stderr);
  }
});

test('collection failures expose only bounded non-sensitive reason codes', async () => {
  await withServer(dependencies({
    runRead: async () => {
      throw new Error('Timeout SSH après 15000 ms');
    }
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/evidence/github/readonly`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sha: SHA,
        target: 's2',
        probe: 'stablecoin_backend_git_status',
        requestId: 'readonly-transport-001'
      })
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: 'readonly_evidence_collection_failed',
      reasonCode: 'read_transport_failed'
    });
  });

  await withServer(dependencies({
    runRead: async () => ({ code: 23, stdout: '', stderr: 'sensitive stderr must not escape' })
  }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/evidence/github/readonly`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sha: SHA,
        target: 's2',
        probe: 'stablecoin_runtime_status',
        requestId: 'readonly-exit-001'
      })
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: 'readonly_evidence_collection_failed',
      reasonCode: 'remote_exit_nonzero',
      exitCode: 23
    });
  });
});

test('probe and target combinations are fail-closed', async () => {
  await withServer(dependencies(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/evidence/github/readonly`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-oidc',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sha: SHA,
        target: 's1',
        probe: 'stablecoin_runtime_status',
        requestId: 'readonly-001'
      })
    });
    assert.equal(response.status, 400);
  });
});

test('hardcoded evidence commands contain no mutation primitives', () => {
  const commands = [
    buildGithubReadonlyEvidenceCommand('s1', 'mcp_git_status'),
    buildGithubReadonlyEvidenceCommand('s2', 'stablecoin_frontend_git_status'),
    buildGithubReadonlyEvidenceCommand('s2', 'stablecoin_backend_git_status'),
    buildGithubReadonlyEvidenceCommand('s2', 'stablecoin_backend_inventory'),
    buildGithubReadonlyEvidenceCommand('s2', 'stablecoin_runtime_status'),
    buildGithubReadonlyEvidenceCommand('s1', 'server_disk'),
    buildGithubReadonlyEvidenceCommand('s2', 'docker_status')
  ];
  const forbidden = [
    /\bgit\s+pull\b/i,
    /\bgit\s+merge\b/i,
    /\bgit\s+rebase\b/i,
    /\bgit\s+reset\b/i,
    /\bgit\s+checkout\b/i,
    /\bgit\s+switch\b/i,
    /\bgit\s+commit\b/i,
    /\bgit\s+push\b/i,
    /\bscp\b/i,
    /\brsync\b/i,
    /\beval\b/i,
    /\bsystemctl\b/i,
    /\bdocker\s+compose\b/i,
    /\bdocker\s+restart\b/i,
    /\brm\s+-rf\b/i,
    /\bsed\s+-i\b/i,
    /\btouch\b/i
  ];
  for (const command of commands) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(command, pattern);
    }
  }
});
