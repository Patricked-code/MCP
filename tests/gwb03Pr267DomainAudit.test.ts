import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const load = async (p: string): Promise<any> => JSON.parse(await readFile(p, 'utf8'));

test('GWB03 F04 history remains 26 review findings, never a runtime certification', async () => {
  const source = await load('docs/governance/gwb03-pr-review-findings-triage-20261015.json');
  const audit = await load('docs/governance/gwb03-pr267-domain-evidence-20261015.json');
  const historical = source.findings.filter((f: any) => f.prNumber === 267);
  assert.equal(audit.kind, 'GWB03_02_PR267_SOURCE_AND_RUNTIME_LIMITS_NON_AUTHORITATIVE');
  assert.equal(historical.length, 26);
  assert.equal(audit.scope.P1, 15);
  assert.equal(audit.scope.P2, 11);
  assert.deepEqual(audit.allHistoricalFindings.map((f: any) => f.reviewCommentId).sort(),
    historical.map((f: any) => f.reviewCommentId).sort());
  assert.equal(audit.allHistoricalFindings.every((x: any) => x.resolved === 'UNKNOWN'), true);
  assert.equal(audit.scope.perFindingRuntimeCertifications, 0);
  assert.equal(audit.knownLimitations.length, 4);
  assert.ok(audit.knownLimitations.some((x: any) => x.status === 'HISTORICAL_RUNTIME_FACT_REOBSERVATION_REQUIRED'));
});
test('F04 source and test anchors remain exactly traceable', async () => {
  const audit = await load('docs/governance/gwb03-pr267-domain-evidence-20261015.json');
  assert.equal(audit.checks.length, 18);
  for (const check of audit.checks) {
    const source = (await readFile(check.sourcePath, 'utf8')).split('\n');
    const tests = (await readFile(check.testPath, 'utf8')).split('\n');
    assert.ok(source[check.sourceLine - 1].includes(check.sourceAnchor), String(check.reviewCommentId));
    assert.equal(tests[check.testLine - 1], check.testTitle, String(check.reviewCommentId));
    assert.equal(check.resolved, 'UNKNOWN');
  }
});
