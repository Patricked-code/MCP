import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const WORKFLOW = new URL('../.github/workflows/mcp-deploy.yml', import.meta.url);

function extractDeployShell(source: string): string {
  const marker = '      - name: Deploy exact main SHA through MCP\n';
  const markerIndex = source.indexOf(marker);
  assert.ok(markerIndex >= 0, 'étape deploy introuvable');
  const runIndex = source.indexOf('        run: |\n', markerIndex);
  assert.ok(runIndex >= 0, 'bloc run deploy introuvable');

  const lines = source.slice(runIndex + '        run: |\n'.length).split(/\r?\n/);
  const body: string[] = [];
  for (const line of lines) {
    if (line.length === 0) {
      body.push('');
      continue;
    }
    if (!line.startsWith('          ')) break;
    body.push(line.slice(10));
  }
  return `${body.join('\n')}\n`;
}

test('le bloc shell réel du workflow passe bash -n', async () => {
  const source = await readFile(WORKFLOW, 'utf8');
  const shell = extractDeployShell(source);
  const result = spawnSync('bash', ['-n'], {
    input: shell,
    encoding: 'utf8',
    timeout: 5_000
  });

  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout || 'bash -n a échoué');
});

test('le JavaScript inline du validateur de statut n’utilise pas de return top-level', async () => {
  const source = await readFile(WORKFLOW, 'utf8');
  const shell = extractDeployShell(source);
  assert.doesNotMatch(shell, /process\.stdout\.write\('succeeded'\);\s*return;/);
  assert.doesNotMatch(shell, /process\.stdout\.write\('failed'\);\s*return;/);
});

test('le shell déployé propage DRIFT et ALIGNED seulement avec une attestation valide', async () => {
  const shell = extractDeployShell(await readFile(WORKFLOW, 'utf8'));
  const dir = await mkdtemp(join(tmpdir(), 'mcp-g1-shell-'));
  try {
    const sha = 'a'.repeat(40);
    const queued = { jobId: 'mcp-s1-12-' + sha.slice(0, 12), requestedSha: sha, status: 'queued' };
    const attested = { ...queued, status: 'succeeded', phase: 'attested', runtimeRevision: sha,
      rollbackStatus: 'not_needed', healthOk: true, oauthOk: true, mcpAuthOk: true };
    const drift = { status: 'DRIFT', sha };
    const aligned = { status: 'ALIGNED' };
    const unverified = { status: 'UNVERIFIED' };
    const proofPending = { status: 'UNVERIFIED', reasonCodes: ['G1_POST_DEPLOY_PROOF_PENDING'] };
    const mocks = [
      "sleep() { :; }",
      "curl() {",
      '  case "${!#}" in',
      '    https://oidc.test/*) printf \'%s\' "$TEST_OIDC" ;;',
      '    */start) printf \'%s\' "$TEST_START" ;;',
      '    *"&g1=1") printf \'%s\' "$TEST_G1" ;;',
      '    */status/*) printf \'%s\' "$TEST_STATUS" ;;',
      '    *) return 1 ;;',
      '  esac',
      '}'
    ].join('\n');
    for (const [g1, revision, expected] of [
      [drift, sha, drift], [aligned, sha, aligned], [drift, 'b'.repeat(40), proofPending],
      [unverified, sha, unverified]
    ] as const) {
      const output = join(dir, g1.status + '-' + revision[0]);
      const result = spawnSync('bash', ['-s'], {
        input: mocks + '\n' + shell, encoding: 'utf8', timeout: 10_000,
        env: { ...process.env, GITHUB_SHA: sha, GITHUB_RUN_ID: '12', GITHUB_OUTPUT: output,
          MCP_BASE_URL: 'https://mcp.test', DEPLOY_ADMISSION_KIND: 'workflow_dispatch_manual', DEPLOY_CI_RUN_ID: '',
          ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.test/token', ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'mock',
          TEST_OIDC: JSON.stringify({ value: 'a'.repeat(32) }), TEST_START: JSON.stringify(queued),
          TEST_STATUS: JSON.stringify(attested), TEST_G1: JSON.stringify({ ...attested, runtimeRevision: revision, g1 })
        }
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(await readFile(output, 'utf8'), 'g1-evidence=' + JSON.stringify(expected) + '\n');
      assert.doesNotMatch(result.stderr, /command not found/);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
