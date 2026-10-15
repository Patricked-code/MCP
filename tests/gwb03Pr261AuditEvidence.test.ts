import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, 'utf8'));
}

test('GWB03 PR261 reconciling evidence preserves 73 historical findings without pretending resolution', async () => {
  const evidence = await readJson('docs/governance/gwb03-pr261-source-policy-evidence-20261015.json');
  const history = await readJson('docs/governance/gwb03-pr-review-findings-triage-20261015.json');
  const originals = history.findings.filter((item: any) => item.prNumber === 261);
  const actual = evidence.allHistoricalFindings;
  assert.equal(evidence.kind, 'GWB03_PR261_SOURCE_POLICY_EVIDENCE_SNAPSHOT_NON_AUTHORITATIVE');
  assert.equal(evidence.repository, 'Patricked-code/MCP');
  assert.equal(evidence.history.pr, 261);
  assert.equal(originals.length, 73);
  assert.equal(evidence.coverage.historicalFindings, originals.length);
  assert.deepEqual(actual.map((v: any) => v.reviewCommentId).sort(), originals.map((v: any) => v.reviewCommentId).sort());
  assert.equal(actual.filter((v: any) => v.priority === 'P1').length, 54);
  assert.equal(actual.filter((v: any) => v.priority === 'P2').length, 19);
  assert.equal(actual.every((v: any) => v.resolution === 'UNKNOWN'), true);
  assert.equal(evidence.coverage.perFindingRuntimeCertifications, 0);
  assert.equal(evidence.authority.noNewRuntimeTasks, true);
  assert.match(evidence.authority.runtimeOwnership, /^UNOBSERVED/);
  assert.ok(evidence.coverage.reviewedBySourceAnchor >= 10);
  assert.equal(evidence.coverage.reviewedBySourceAnchor + evidence.coverage.unreviewed, 73);
});

test('PR261 spotchecks cite real source and test anchors without manufacturing a passing test', async () => {
  const evidence = await readJson('docs/governance/gwb03-pr261-source-policy-evidence-20261015.json');
  for (const check of evidence.checks) {
    const lines = (await readFile(check.sourcePath, 'utf8')).split('\n');
    assert.equal(lines[check.sourceLine - 1].includes(check.sourceAnchor), true,
      'source anchor moved for historical review ' + check.reviewCommentId);
    if (check.testPath !== null) {
      const assertions = (await readFile(check.testPath, 'utf8')).split('\n');
      assert.equal(assertions[check.testLine - 1], check.testTitle);
    }
    assert.equal(check.resolved, 'UNKNOWN');
  }
  assert.deepEqual(Object.keys(evidence.knownPolicyRisks).sort(), ['4216890728', '4222289799']);
  assert.match(evidence.knownPolicyRisks['4216890728'].testNeeded, /issue #262/);
  assert.match(evidence.knownPolicyRisks['4222289799'].testNeeded, /negative pure-policy test/);
});
