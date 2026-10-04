import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const INVENTORY_PATH = 'docs/governance/multi-repository-inventory-20261001.json';
// B3.2 supersedes the literal classification; the B3.1 inventory stays immutable evidence.
const CURRENT_CLASSIFICATION_PATH = 'docs/governance/multi-repository-target-scope-20261004.json';
const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const LITERAL = 'Patricked-code/MCP';

async function sourceFiles(directory = 'src'): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(relative));
    else if (entry.isFile() && relative.endsWith('.ts')) files.push(relative);
  }
  return files;
}

test('TB-W3-B3-01 publishes a bounded inventory of residual single-repository assumptions', async () => {
  const inventory = JSON.parse(await readFile(INVENTORY_PATH, 'utf8'));

  assert.equal(inventory.schemaVersion, 1);
  assert.equal(inventory.blueprintId, 'TB-W3-B3-01');
  assert.equal(inventory.workItemId, 'PB-B3');
  assert.equal(inventory.lotId, 'B3.1');
  assert.equal(inventory.integrationSlot, 'context.multi-repository');
  assert.equal(inventory.status, 'PASS_WITH_EVIDENCE');
  assert.equal(inventory.runtimeRequired, false);
  assert.equal(inventory.githubOnlyPossible, true);
  assert.equal(inventory.coreAuthorities.targetScopeAcceptedBy.length > 0, true);
  assert.equal(inventory.toolSurface.targetScopeExposedByAnyTool, false);
  assert.equal(inventory.verdict, 'CORE_MULTI_REPOSITORY_TOOL_SURFACE_SINGLE_REPOSITORY');
});

test('every hard-coded repository literal in src is classified exactly once', async () => {
  const inventory = JSON.parse(await readFile(CURRENT_CLASSIFICATION_PATH, 'utf8'));
  assert.equal(inventory.supersedesClassificationOf, INVENTORY_PATH);
  const residual: string[] = inventory.residualSingleRepositoryConsumers.map((entry: any) => entry.path);
  const boundaries: string[] = inventory.legitimateSelfManagementBoundaries.map((entry: any) => entry.path);
  const classified = [...residual, ...boundaries];

  assert.equal(new Set(classified).size, classified.length, 'a path is classified twice');

  const actual: string[] = [];
  for (const file of await sourceFiles()) {
    if ((await readFile(file, 'utf8')).includes(LITERAL)) actual.push(file);
  }
  assert.deepEqual([...classified].sort(), actual.sort());

  for (const entry of inventory.residualSingleRepositoryConsumers) {
    assert.match(entry.disposition, /^(GENERALIZE_IN_B3_2|PRESERVE_DEFAULT_WITH_TARGET_SCOPE_OVERRIDE)$/);
    assert.ok(entry.detail.length > 10);
  }
  for (const entry of inventory.legitimateSelfManagementBoundaries) {
    assert.equal(entry.disposition, 'ACCEPTED_BOUNDARY');
  }
});

test('B3.1 completion unlocks only B3.2 and preserves the other ready blueprints', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));

  assert.equal(byId.get('TB-W3-B3-01')?.readiness?.state, 'DONE');
  // B3.2 may since wait on OWNER_DECISION_B3_TARGET_PROJECT_SELECTION (w3B3TargetSelectionGate).
  assert.ok(['READY', 'CONDITIONAL', 'DONE'].includes(byId.get('TB-W3-B3-02')?.readiness?.state));
  assert.equal(program.w3B3InventoryHandoff?.status, 'PASS_WITH_EVIDENCE');
  assert.equal(program.w3B3InventoryHandoff?.runtimeTasksCreated, 0);
  for (const id of ['TB-W3-A3-02', 'TB-W3-C1-01', 'TB-W4-G1-01']) {
    assert.ok(['READY', 'DONE'].includes(byId.get(id)?.readiness?.state), id);
  }
});
