import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { collectCurrentStateEvidence } from '../scripts/current-state-evidence.mjs';

const fixture = path.resolve('tests/fixtures/current-state-evidence-repo');
const script = path.resolve('scripts/current-state-evidence.mjs');

async function repositoryFixture(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'mcp-evidence-'));
  await cp(fixture, root, { recursive: true });
  await mkdir(path.join(root, 'secrets'), { recursive: true });
  await writeFile(path.join(root, 'secrets', 'key.txt'), 'must-never-be-returned\n');
  const outside = path.join(tmpdir(), `outside-${path.basename(root)}.ts`);
  await writeFile(outside, 'export const outside = true;\n');
  await symlink(outside, path.join(root, 'src', 'external.ts'));
  for (const args of [
    ['init', '-b', 'main'],
    ['config', 'user.email', 'fixture@example.test'],
    ['config', 'user.name', 'Fixture'],
    ['add', '.'],
    ['commit', '-m', 'fixture']
  ]) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  await writeFile(path.join(root, 'src', 'untracked.ts'), 'export const secret = true;\n');
  await writeFile(path.join(root, 'untracked-secret.env'), 'TOKEN=must-not-be-read\n');
  return root;
}

test('derives deterministic bounded relationships from tracked non-sensitive files only', async () => {
  const root = await repositoryFixture();
  const before = (await readdir(root)).sort();

  const first = collectCurrentStateEvidence({ repositoryRoot: root });
  const second = collectCurrentStateEvidence({ repositoryRoot: root });

  assert.deepEqual(first, second);
  assert.deepEqual((await readdir(root)).sort(), before);
  assert.equal(first.schemaVersion, 1);
  assert.match(first.evidenceHead, /^[a-f0-9]{40}$/);
  assert.match(first.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(first.architecture.modules, ['src/a.ts', 'src/b.ts', 'src/server.ts']);
  assert.deepEqual(first.architecture.imports, [{ from: 'src/a.ts', to: 'src/b.ts' }]);
  assert.deepEqual(first.architecture.routes, [{ method: 'GET', path: '/health', source: 'src/server.ts' }]);
  assert.deepEqual(first.documentation.markdown, [
    'README.md',
    'docs/audits/baseline.md',
    'docs/history/change.md'
  ]);
  assert.deepEqual(first.audits, ['docs/audits/baseline.md']);
  assert.deepEqual(first.history, ['docs/history/change.md']);
  assert.equal(first.governance.files.find((file: any) => file.path === '.mcp/manifest.json')?.status, 'PRESENT');
  assert.equal(first.contradictions.some((entry: any) => entry.code === 'REQUIRED_GOVERNANCE_FILE_MISSING'), true);
  assert.equal(first.contradictions.some((entry: any) => entry.code === 'STATIC_GOVERNANCE_DYNAMIC_VALUE'), true);
  assert.equal(first.contradictions.some((entry: any) => entry.code === 'SENSITIVE_TRACKED_PATH'), true);
  assert.equal(first.contradictions.some((entry: any) => entry.code === 'TRACKED_SYMLINK_OUTSIDE_ROOT'), true);
  assert.equal(JSON.stringify(first).includes('must-never-be-returned'), false);
  assert.equal(JSON.stringify(first).includes('must-not-be-read'), false);
  assert.equal(first.architecture.modules.includes('src/untracked.ts'), false);
  assert.match(first.governance.digest, /^[a-f0-9]{64}$/);
  assert.match(first.documentation.digest, /^[a-f0-9]{64}$/);
  assert.match(first.testSuiteDigest, /^[a-f0-9]{64}$/);
  assert.match(first.sourceDigest, /^[a-f0-9]{64}$/);
  assert.ok(Buffer.byteLength(JSON.stringify(first)) < 1_000_000);
});

test('CLI exposes the same bounded schema without creating an artifact', async () => {
  const root = await repositoryFixture();
  const before = (await readdir(root)).sort();
  const expected = collectCurrentStateEvidence({ repositoryRoot: root });
  const result = spawnSync(process.execPath, [script, '--root', root], {
    cwd: root,
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '' },
    maxBuffer: 1_048_576
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), expected);
  assert.ok(Buffer.byteLength(result.stdout) < 1_000_000);
  assert.deepEqual((await readdir(root)).sort(), before);
});

test('evidence remains bound to HEAD when tracked working-tree content is modified', async () => {
  const root = await repositoryFixture();
  const committed = collectCurrentStateEvidence({ repositoryRoot: root });
  await writeFile(
    path.join(root, 'src', 'a.ts'),
    "import './b.js';\nexport const dirty = true;\n"
  );
  await writeFile(path.join(root, 'README.md'), '# Dirty working tree\n');

  const observed = collectCurrentStateEvidence({ repositoryRoot: root });
  assert.deepEqual(observed, committed);
});

test('evidence ignores replacement refs and keeps metadata bound to the reported SHA', async () => {
  const root = await repositoryFixture();
  const original = collectCurrentStateEvidence({ repositoryRoot: root });
  await writeFile(path.join(root, 'README.md'), '# Replacement content\n');
  for (const args of [
    ['add', 'README.md'],
    ['commit', '-m', 'replacement']
  ]) {
    const result = spawnSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: '2030-01-01T00:00:00Z',
        GIT_COMMITTER_DATE: '2030-01-01T00:00:00Z'
      }
    });
    assert.equal(result.status, 0, result.stderr);
  }
  const replacement = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
  const checkout = spawnSync('git', ['checkout', '--detach', original.evidenceHead], { cwd: root, encoding: 'utf8' });
  assert.equal(checkout.status, 0, checkout.stderr);
  const replace = spawnSync('git', ['replace', original.evidenceHead, replacement], { cwd: root, encoding: 'utf8' });
  assert.equal(replace.status, 0, replace.stderr);

  assert.deepEqual(collectCurrentStateEvidence({ repositoryRoot: root }), original);
});
