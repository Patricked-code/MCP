import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const INVENTORY_PATH = 'docs/governance/oauth-correlation-inventory-20260928.json';
const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';

test('TB-W3-A3-01 publishes a bounded inventory of OAuth correlation surfaces', async () => {
  const inventory = JSON.parse(await readFile(INVENTORY_PATH, 'utf8'));

  assert.equal(inventory.schemaVersion, 1);
  assert.equal(inventory.blueprintId, 'TB-W3-A3-01');
  assert.equal(inventory.workItemId, 'PB-A3');
  assert.equal(inventory.lotId, 'A3.1');
  assert.equal(inventory.integrationSlot, 'connection.oauth-attempt-correlation');
  assert.equal(inventory.status, 'PASS_WITH_EVIDENCE');
  assert.equal(inventory.runtimeRequired, false);
  assert.equal(inventory.githubOnlyPossible, true);

  assert.equal(inventory.authorizationRequest.stateObserved, true);
  assert.equal(inventory.authorizationRequest.stateEchoedToClient, true);
  assert.equal(inventory.authorizationRequest.statePersistedServerSide, false);

  assert.equal(inventory.authorizationCode.oneTime, true);
  assert.equal(inventory.authorizationCode.correlationAttemptIdPresent, false);

  assert.equal(inventory.accessToken.jtiGenerated, true);
  assert.equal(inventory.accessToken.jtiExposedByVerifiedIdentity, false);

  assert.equal(inventory.authInfo.oauthPrincipalPropagated, true);
  assert.equal(inventory.authInfo.oauthAttemptCorrelationPresent, false);

  assert.equal(inventory.mcpInitialize.transportSessionGenerated, true);
  assert.equal(inventory.mcpInitialize.oauthAttemptCorrelationPresent, false);

  assert.equal(inventory.eventJournal.governedSessionIdCorrelationPresent, true);
  assert.equal(inventory.eventJournal.oauthEventTypesPresent, false);
  assert.equal(inventory.eventJournal.oauthAttemptCorrelationPresent, false);
  assert.equal(inventory.eventJournal.rawTransportSessionIdForbidden, true);

  assert.ok(Array.isArray(inventory.evidenceRefs));
  assert.ok(inventory.evidenceRefs.includes('src/oauth.ts'));
  assert.ok(inventory.evidenceRefs.includes('src/auth.ts'));
  assert.ok(inventory.evidenceRefs.includes('src/server.ts'));
  assert.ok(inventory.evidenceRefs.includes('src/operationalMemory/eventJournal.ts'));
  assert.ok(inventory.evidenceRefs.includes('src/operationalMemory/operationalAudit.ts'));
  assert.ok(inventory.evidenceRefs.includes('src/operationalMemory/sessionService.ts'));
});

test('A3.1 completion unlocks only the bounded A3.2 implementation step', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map(
    (program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry])
  );

  assert.equal(byId.get('TB-W3-A3-01')?.readiness?.state, 'DONE');
  assert.equal(byId.get('TB-W3-A3-02')?.readiness?.state, 'READY');
  assert.deepEqual(byId.get('TB-W3-A3-02')?.dependsOn, ['TB-W3-A3-01']);

  assert.ok(program.executionModel?.currentReadyBlueprintIds.includes('TB-W3-A3-02'));
  assert.equal(program.executionModel?.currentReadyBlueprintIds.includes('TB-W3-A3-01'), false);
});
