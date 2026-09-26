import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const INVENTORY_PATH = 'docs/governance/client-evidence-inventory-20260925.json';
const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';

test('TB-W3-A22-01 publishes a bounded inventory of verifiable client evidence', async () => {
  const inventory = JSON.parse(await readFile(INVENTORY_PATH, 'utf8'));

  assert.equal(inventory.schemaVersion, 1);
  assert.equal(inventory.blueprintId, 'TB-W3-A22-01');
  assert.equal(inventory.workItemId, 'PB-A2.2');
  assert.equal(inventory.lotId, 'A2.2.1');
  assert.equal(inventory.integrationSlot, 'connection.client-evidence');
  assert.equal(inventory.status, 'PASS_WITH_EVIDENCE');
  assert.equal(inventory.runtimeRequired, false);
  assert.equal(inventory.githubOnlyPossible, true);

  assert.deepEqual(inventory.currentRequestIdentityFields, [
    'principalId',
    'clientId',
    'assurance'
  ]);
  assert.equal(inventory.oauthSubject.verifiable, true);
  assert.equal(inventory.oauthClientId.observed, true);
  assert.equal(inventory.oauthClientId.classificationAuthority, false);
  assert.equal(inventory.conversationReference.supplied, false);
  assert.equal(inventory.conversationReference.verifiable, false);
  assert.equal(inventory.workspaceReference.supplied, false);
  assert.equal(inventory.workspaceReference.verifiable, false);
  assert.equal(
    inventory.classificationVerdict,
    'UNKNOWN_UNTIL_VERIFIABLE_CLIENT_EVIDENCE'
  );

  assert.deepEqual(inventory.forbiddenInferences.sort(), [
    'CLIENT_CLASS_FROM_CLIENT_ID_ONLY',
    'CONVERSATION_FROM_TRANSPORT_SESSION',
    'WORKSPACE_FROM_REPOSITORY'
  ].sort());

  assert.ok(Array.isArray(inventory.evidenceRefs));
  assert.ok(inventory.evidenceRefs.includes('src/auth.ts'));
  assert.ok(inventory.evidenceRefs.includes('src/tools/governedSessions.ts'));
  assert.ok(inventory.evidenceRefs.includes('src/operationalMemory/sessionService.ts'));
  assert.ok(inventory.evidenceRefs.includes('src/operationalMemory/connectionContext.ts'));
  assert.ok(inventory.evidenceRefs.includes('tests/connectionContext.test.ts'));
});

test('A2.2.1 completion unlocks only the bounded A2.2.2 extension while preserving other W3 candidates', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map(
    (program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry])
  );

  assert.equal(byId.get('TB-W3-A22-01')?.readiness?.state, 'DONE');
  assert.equal(byId.get('TB-W3-A22-02')?.readiness?.state, 'READY');
  assert.deepEqual(byId.get('TB-W3-A22-02')?.dependsOn, ['TB-W3-A22-01']);

  assert.deepEqual(program.executionModel?.currentReadyBlueprintIds, [
    'TB-W3-A22-02',
    'TB-W3-A3-01',
    'TB-W3-B3-01',
    'TB-W3-C1-01'
  ]);
});
