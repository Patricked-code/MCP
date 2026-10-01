import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = 'e7143506ea30acc666805f67f3a186eea4d1060b';

test('TB-W3-C1-01 is DONE only with exact-head, deploy and registry readiness evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-C1-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 211);
  assert.equal(evidence?.candidateHeadSha, 'fe4331f64674915f290bb0452e974625f999fc51');
  assert.equal(evidence?.redHeadSha, 'b3a46af94f10af78f31156c8c266592aa94f4191');
  assert.equal(evidence?.prCiRunId, 36908240855);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.governedDeployRuntimeRevision, MERGE_SHA);

  const registry = evidence?.readonlyEvidence?.mcp_git_registry_readiness;
  assert.equal(registry?.status, 'SUCCESS');
  assert.equal(registry?.mutationAllowed, false);
  assert.equal(registry?.workflowSha, MERGE_SHA);
  assert.deepEqual(registry?.counts, { mappings: 5, projects: 2, ready: 0, blocked: 5 });
  assert.equal(registry?.truncated, false);

  const gitStatus = evidence?.readonlyEvidence?.mcp_git_status;
  assert.equal(gitStatus?.status, 'SUCCESS');
  assert.equal(gitStatus?.workflowSha, MERGE_SHA);

  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);

  // Activation stays fail-closed: every mapping is still BLOCKED, so dependents must not start.
  assert.equal(byId.get('TB-COND-C1-ACTIVATE')?.readiness?.state, 'CONDITIONAL');
  assert.equal(byId.get('TB-W3-C3-01')?.readiness?.state, 'BLOCKED');
  assert.equal(byId.get('TB-W3-GGCC-GIT-READ')?.readiness?.state, 'BLOCKED');
});
