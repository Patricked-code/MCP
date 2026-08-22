import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

import { collectCurrentStateEvidence } from '../scripts/current-state-evidence.mjs';

const execFileAsync = promisify(execFile);

async function write(root: string, path: string, content: string): Promise<void> {
  const fullPath = join(root, path);
  await mkdir(join(fullPath, '..'), { recursive: true });
  await writeFile(fullPath, content, 'utf8');
}

async function fixtureRepository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'mcp-current-state-evidence-'));
  await write(root, 'src/b.ts', 'export const b = 1;\n');
  await write(root, 'src/a.ts', [
    "import { b } from './b.js';",
    "app.get('/health', (_req, res) => res.json({ b }));",
    ''
  ].join('\n'));
  await write(root, 'tests/a.test.ts', "import '../src/a.js';\n");
  await write(root, 'README.md', '# Fixture\n');
  await write(root, 'docs/audits/proof.md', '# Audit\n');
  await write(root, '.mcp/manifest.json', '{"version":1}\n');
  await write(root, '.mcp/task-registry.json', '{"schemaVersion":1,"registryVersion":3,"tasks":[]}\n');
  await write(root, 'secrets/key.txt', 'must-never-be-returned\n');
  await symlink('../outside.ts', join(root, 'src/external.ts'));
  await execFileAsync('git', ['init', '-q'], { cwd: root });
  await execFileAsync('git', ['add', '.'], { cwd: root });
  await execFileAsync('git', [
    '-c', 'user.name=MCP Test',
    '-c', 'user.email=mcp-test@example.invalid',
    'commit', '-qm', 'fixture'
  ], { cwd: root });
  await write(root, 'untracked-secret.env', 'TOKEN=must-not-be-read\n');
  return root;
}

async function visiblePaths(root: string): Promise<string[]> {
  return (await readdir(root)).sort();
}

test('dérive une preuve triée et déterministe depuis les seuls fichiers Git suivis sans écrire', async () => {
  const root = await fixtureRepository();
  const before = await visiblePaths(root);

  const first = await collectCurrentStateEvidence({ repositoryRoot: root });
  const second = await collectCurrentStateEvidence({ repositoryRoot: root });

  assert.deepEqual(first, second);
  assert.deepEqual(await visiblePaths(root), before);
  assert.equal(first.schemaVersion, 1);
  assert.match(first.repositoryHead, /^[0-9a-f]{40}$/);
  assert.deepEqual(first.architecture.modules.map(({ path }) => path), [
    'src/a.ts',
    'src/b.ts'
  ]);
  assert.deepEqual(first.architecture.modules[0]?.imports, ['./b.js']);
  assert.deepEqual(first.architecture.routes, [{
    file: 'src/a.ts',
    method: 'GET',
    path: '/health'
  }]);
  assert.deepEqual(first.documentation.files, ['README.md', 'docs/audits/proof.md']);
  assert.deepEqual(first.audits, ['docs/audits/proof.md']);
  assert.equal(first.taskRegistry.present, true);
  assert.equal(first.taskRegistry.registryVersion, 3);
  assert.equal(first.governance.files.find(({ path }) => path === '.mcp/manifest.json')?.present, true);
  assert.equal(first.governance.files.find(({ path }) => path === '.mcp/onboarding.json')?.present, false);
  assert.equal(first.contradictions.includes('missing_governance_file:.mcp/onboarding.json'), true);
  assert.equal(first.contradictions.includes('sensitive_tracked_path:secrets/key.txt'), true);
  assert.equal(first.contradictions.includes('tracked_symlink_refused:src/external.ts'), true);
  assert.equal(JSON.stringify(first).includes('must-not-be-read'), false);
  assert.equal(JSON.stringify(first).includes('must-never-be-returned'), false);
  assert.match(first.sourceDigest, /^[0-9a-f]{64}$/);
  assert.match(first.testSuiteDigest, /^[0-9a-f]{64}$/);
});

test('le CLI retourne le même schéma JSON borné et ne crée aucun artefact', async () => {
  const root = await fixtureRepository();
  const before = await visiblePaths(root);
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ['scripts/current-state-evidence.mjs', '--root', root],
    { cwd: process.cwd(), maxBuffer: 1_048_576 }
  );
  const parsed = JSON.parse(stdout);

  assert.equal(stderr, '');
  assert.equal(parsed.schemaVersion, 1);
  assert.ok(stdout.length < 1_048_576);
  assert.deepEqual(await visiblePaths(root), before);
});
