import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
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
