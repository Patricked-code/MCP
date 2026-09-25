import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const WORKFLOW_PATH = '.github/workflows/mcp-readonly-evidence.yml';
const POLICY_PATH = '.mcp/github-first-operational-policy.json';
const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const EVIDENCE_PATH = 'docs/governance/ssh-coordination-evidence-20260925.json';

test('protected SSH can directly collect sanitized governed coordination state when OIDC has no coverage', async () => {
  const workflow = await readFile(WORKFLOW_PATH, 'utf8');
  const policy = JSON.parse(await readFile(POLICY_PATH, 'utf8'));

  assert.match(workflow, /mcp_coordination_state/);
  assert.match(workflow, /mcp-governed-tasks\.json/);
  assert.match(workflow, /mcp-governed-sessions\.json/);
  assert.match(workflow, /mcp-governed-locks\.json/);
  assert.match(workflow, /github_actions_ssh_readonly/);
  assert.match(workflow, /needs\.authorize\.outputs\.probe\s*==\s*'mcp_coordination_state'/);
  assert.doesNotMatch(workflow, /resumeSecretHash/);

  assert.deepEqual(
    policy.executionModes.GITHUB_ACTION_READONLY_EVIDENCE.sshDirectSelectionProbes,
    ['mcp_coordination_state']
  );
  assert.equal(
    policy.executionModes.GITHUB_ACTION_READONLY_EVIDENCE.coordinationStateOutputPolicy.secretValuesAllowed,
    false
  );
  assert.equal(
    policy.executionModes.GITHUB_ACTION_READONLY_EVIDENCE.coordinationStateOutputPolicy.mutationAllowed,
    false
  );
});

test('TB-COND-SSH is closed only after the proven A2.2.2 OIDC coverage gap is bounded by evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const evidence = JSON.parse(await readFile(EVIDENCE_PATH, 'utf8'));
  const blueprint = (program.taskBlueprints ?? []).find((entry: any) => entry.id === 'TB-COND-SSH');

  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.blueprintId, 'TB-COND-SSH');
  assert.equal(evidence.trigger, 'PROVEN_OIDC_COVERAGE_GAP');
  assert.equal(evidence.requiredByBlueprintId, 'TB-W3-A22-02');
  assert.equal(evidence.mutationAllowed, false);
  assert.equal(evidence.transport, 'github_actions_ssh_readonly');

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.match(blueprint?.readiness?.reason ?? '', /PROVEN_OIDC_COVERAGE_GAP/);
});
