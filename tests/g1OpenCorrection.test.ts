import assert from 'node:assert/strict';
import test from 'node:test';
import { findG1OpenCorrection, G1_MANIFEST } from '../src/deploy/g1Documentation.js';

test('G1 detects a manually named PR from a fork, including a renamed manifest on a later file page', async () => {
  const inspected: string[] = [];
  const collision = await findG1OpenCorrection(async path => {
    inspected.push(path);
    if (path.includes('/pulls?state=open&base=main')) return [
      { number: 403 }, { number: 405, head: { ref: 'manual/cleanup', repo: { full_name: 'contributor/fork' } } }
    ];
    if (path.endsWith('/403/files?per_page=100&page=1')) return [{ filename: 'README.md', status: 'modified' }];
    if (path.endsWith('/405/files?per_page=100&page=1')) return Array.from({ length: 100 },
      (_, i) => ({ filename: 'docs/' + i + '.md', status: 'modified' }));
    if (path.endsWith('/405/files?per_page=100&page=2')) return [
      { filename: 'archived.json', previous_filename: G1_MANIFEST, status: 'renamed' }
    ];
    throw new Error('Unexpected path: ' + path);
  });
  assert.equal(collision, 405);
  assert.equal(inspected.length, 4);
});

test('G1 can proceed past unrelated documentation', async () => {
  assert.equal(await findG1OpenCorrection(async path => path.includes('/pulls?')
    ? [{ number: 403 }]
    : [{ filename: 'docs/' + G1_MANIFEST, status: 'modified' }]), null);
});

test('G1 fails closed on unavailable, empty, malformed or truncated PR file evidence', async () => {
  for (const files of [null, [], [{ filename: 'moved.json', status: 'renamed' }]]) {
    await assert.rejects(findG1OpenCorrection(async path => path.includes('/pulls?') ? [{ number: 405 }] : files),
      /g1_invalid_pr_file/);
  }
  await assert.rejects(findG1OpenCorrection(async path => {
    if (path.includes('/pulls?')) return [{ number: 405 }];
    throw new Error('github_temporarily_unavailable');
  }), /github_temporarily_unavailable/);
  await assert.rejects(findG1OpenCorrection(async path => path.includes('/pulls?') ? [{ number: 405 }]
    : Array.from({ length: 100 }, () => ({ filename: 'other.md', status: 'modified' }))), /g1_pr_file_scan_limit/);
});
