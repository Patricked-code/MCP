import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, 'utf8'));
}

test('H.1 inventory is a seven-hop non-authoritative audit of the original Event Journal', async () => {
  const doc = await readJson('docs/governance/gwb04-h01-trace-evidence-inventory-20261016.json');
  const backlog = await readJson('docs/governance/program-backlog-convergence.json');
  const blueprint = backlog.taskBlueprints.find((b: any) => b.id === doc.blueprintId);
  assert.equal(doc.kind, 'GWB04_H01_TRACE_EVIDENCE_INVENTORY_NON_AUTHORITATIVE');
  assert.equal(doc.repository, 'Patricked-code/MCP');
  assert.ok(blueprint, 'H.1 must exist in the canonical Program Backlog');
  assert.equal(blueprint.integrationSlot, doc.programSlot);
  assert.equal(doc.scope, 'observability:tracing:inventory');
  assert.equal(doc.hopInventory.length, 7);
  assert.deepEqual(doc.hopInventory.map((h: any) => h.hop), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(doc.noRuntimeMutations, true);
  assert.equal(doc.noTaskClaims, true);
  assert.equal(doc.noSecondQueue, true);
  assert.match(doc.acceptance.blueprintState, /REMAINS_READY/);
  assert.equal(doc.identifiedGaps.length, 4);
  assert.equal(doc.existingAuthorities.length, 6);
});

test('H.1 source and test references are grounded and forbid fabricated cross-hop proofs', async () => {
  const doc = await readJson('docs/governance/gwb04-h01-trace-evidence-inventory-20261016.json');
  for (const authority of doc.existingAuthorities) {
    const source = await readFile(authority.file, 'utf8');
    for (const anchor of authority.anchors) {
      assert.ok(source.includes(anchor), 'missing source anchor ' + authority.file + ' :: ' + anchor);
    }
    if (authority.test) {
      const tests = await readFile(authority.test, 'utf8');
      for (const title of authority.testAnchors) {
        assert.ok(tests.includes(title), 'missing test anchor ' + authority.test + ' :: ' + title);
      }
    }
  }
  const journal = await readFile('src/operationalMemory/eventJournal.ts', 'utf8');
  const record = journal.slice(journal.indexOf('export type OperationalEvent = {'), journal.indexOf('type OperationalEventInput'));
  assert.match(record, /eventId: string/);
  assert.match(record, /governedSessionId: string/);
  for (const unproven of ['traceId', 'requestId', 'spanId']) {
    assert.ok(!record.includes(unproven), 'new trace ID means H.1 inventory must be reconciled');
  }
  const cc = await readFile('src/operationalMemory/connectionContext.ts', 'utf8');
  assert.match(cc, /clientClassification: z.literal\('UNRESOLVED'\)/);
  assert.ok(doc.sensitiveDataPolicy.includes('NEVER_LOG_ACCESS_OR_REFRESH_TOKEN'));
  assert.ok(doc.sensitiveDataPolicy.includes('NO_SECOND_EVENT_STORE_OR_TELEMETRY_AUTHORITY'));
});
