import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { projectGrgsInventory } from '../src/cug/grgsInventoryProjection.js';

const base = {
  installationId: 145098929,
  repositoryId: 1429189311,
  repositoryFullName: 'chainsolutions-wealthtech/universal-agent-engineering-system',
  observedCommit: 'a'.repeat(40)
};
test('GRGS inventory projection is stable across path ordering and never authorizes writes', () => {
  const first = projectGrgsInventory({ ...base, paths: ['README.md', 'docs/SUIVI.md'] });
  const second = projectGrgsInventory({ ...base, paths: ['docs/SUIVI.md', 'README.md'] });
  assert.equal(first.evidenceDigest, second.evidenceDigest);
  assert.equal(first.automaticMutation, false);
  assert.equal(first.registryMutation, false);
  assert.equal(first.deploymentAuthorized, false);
  assert.equal(first.documents.length, 2);
});
test('GRGS rejects duplicate, unsafe, oversized and unproven inputs', () => {
  assert.throws(() => projectGrgsInventory({ ...base, paths: ['README.md', 'README.md'] }));
  assert.throws(() => projectGrgsInventory({ ...base, paths: ['../README.md'] }));
  assert.throws(() => projectGrgsInventory({ ...base, paths: [], observedCommit: 'main' }));
  assert.throws(() => projectGrgsInventory({ ...base, paths: [], installationId: 0 }));
  assert.throws(() => projectGrgsInventory({ ...base, paths: Array(10001).fill('README.md') }));
});
