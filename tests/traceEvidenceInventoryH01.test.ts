import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const INVENTORY = 'docs/governance/trace-evidence-inventory-h01-20261010.json';

test('H-01 inventory cites existing bounded correlation signals', async () => {
  const inventory = JSON.parse(await readFile(INVENTORY, 'utf8'));
  assert.equal(inventory.blueprintId, 'TB-W4-H-01');
  assert.equal(inventory.sourceEvidence.length, 8);
  assert.equal(inventory.h01Done, false);
  const paths = new Set<string>();
  let signals = 0;
  for (const ref of inventory.sourceEvidence) {
    assert.equal(paths.has(ref.path), false, `duplicate source: ${ref.path}`);
    paths.add(ref.path);
    const source = await readFile(ref.path, 'utf8');
    for (const signal of ref.signals) {
      assert.ok(source.includes(signal), `Missing ${signal} in ${ref.path}`);
      signals++;
    }
  }
  assert.equal(signals, 13);
});

test('H-01 inventory cannot authorize runtime work or assert unverified live authority', async () => {
  const inventory = JSON.parse(await readFile(INVENTORY, 'utf8'));
  assert.equal(inventory.planningOnly, true);
  assert.equal(inventory.createsRuntimeTask, false);
  assert.equal(inventory.materializesClaim, false);
  assert.equal(inventory.runtimeMutationAuthorized, false);
  assert.equal(inventory.liveAuthorities.tasks, 'UNKNOWN');
  assert.equal(inventory.liveAuthorities.sessions, 'UNKNOWN');
  assert.equal(inventory.liveAuthorities.locks, 'UNKNOWN');
  assert.equal(inventory.h01Done, false);
});

test('H-01 inventory preserves known OAuth collision boundary', async () => {
  const inventory = JSON.parse(await readFile(INVENTORY, 'utf8'));
  assert.equal(inventory.collisionCheck.knownAdjacentPullRequest, 207);
  assert.ok(inventory.collisionCheck.excludedScope.includes('src/oauth.ts'));
  assert.ok(inventory.collisionCheck.excludedScope.includes('src/logger.ts'));
  assert.equal(inventory.correlationVerdict, 'OAUTH_MCP_SSH_END_TO_END_TRACE_NOT_DEMONSTRATED');
});
