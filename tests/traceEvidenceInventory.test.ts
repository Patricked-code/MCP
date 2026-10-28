import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

test('TB-W4-H-01: Trace evidence inventory', async (t) => {

  await t.test('inventory document exists and is valid JSON', async () => {
    const text = await readFile('docs/audits/trace-evidence-inventory.json', 'utf8');
    const doc = JSON.parse(text);
    assert.equal(doc.schemaVersion, 1);
    assert.equal(doc.blueprintId, 'TB-W4-H-01');
    assert.ok(doc.existingIdentifiers.length >= 10, 'at least 10 existing identifiers inventoried');
    assert.ok(doc.auditPoints.length >= 5, 'at least 5 audit points mapped');
    assert.ok(doc.gaps.length >= 1, 'at least 1 gap identified');
    assert.ok(doc.recommendations.length >= 1, 'at least 1 recommendation');
  });

  await t.test('GAP-01: no per-request operationId in MCP handler', async () => {
    const serverSrc = await readFile('src/server.ts', 'utf8');
    const hasOperationId = serverSrc.includes('operationId') || serverSrc.includes('X-Request-ID');
    assert.equal(hasOperationId, false, 'GAP-01 confirmed: server.ts has no per-request operationId');
  });

  await t.test('GAP-09: no end-to-end trace ID in event journal metadata keys', async () => {
    const journalSrc = await readFile('src/operationalMemory/eventJournal.ts', 'utf8');
    const hasTraceField = journalSrc.includes('operationId') || journalSrc.includes('traceId');
    assert.equal(hasTraceField, false, 'GAP-09 confirmed: event journal has no operationId/traceId in metadata');
  });

  await t.test('existing identifiers: governedSessionId propagated across key files', async () => {
    const files = [
      'src/operationalMemory/sessionService.ts',
      'src/operationalMemory/eventJournal.ts',
      'src/operationalMemory/lockService.ts',
      'src/tools/governedSessions.ts'
    ];
    for (const f of files) {
      const src = await readFile(f, 'utf8');
      assert.ok(src.includes('governedSessionId'), `governedSessionId found in ${f}`);
    }
  });

  await t.test('existing identifiers: eventId generated in event journal', async () => {
    const src = await readFile('src/operationalMemory/eventJournal.ts', 'utf8');
    assert.ok(src.includes('eventId') || src.includes('randomUUID'), 'eventId generation present');
  });

  await t.test('existing identifiers: transportSessionId used in server binding', async () => {
    const src = await readFile('src/server.ts', 'utf8');
    assert.ok(
      src.includes('mcp-session-id') || src.includes('sessionId'),
      'transport session ID referenced in server.ts'
    );
  });

  await t.test('inventory gap count matches codebase reality', async () => {
    const text = await readFile('docs/audits/trace-evidence-inventory.json', 'utf8');
    const doc = JSON.parse(text);
    const highGaps = doc.gaps.filter((g: any) => g.severity === 'HIGH');
    assert.ok(highGaps.length >= 2, 'at least 2 HIGH severity gaps documented');
    const reqCorrelationGaps = doc.gaps.filter((g: any) => g.category === 'request-correlation');
    assert.ok(reqCorrelationGaps.length >= 1, 'request-correlation gap category present');
  });
});
