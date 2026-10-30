import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

type Profile = {
  enabledForExplicitSelection: boolean;
  selectedByDefault: boolean;
  executionEngineCreated: boolean;
  runtimeWritePermissionGranted: boolean;
  taskSessionOrLockCreated: boolean;
  policyAuthority: string;
  runbook: string;
  transportOrder: string[];
  mandatoryGates: string[];
  forbidden: string[];
};

const policy = JSON.parse(readFileSync('.mcp/github-first-operational-policy.json', 'utf8')) as {
  mode: string;
  executionModes: Record<string, unknown>;
  selectableProfiles: Record<string, Profile>;
};
const profile = policy.selectableProfiles.EXTERNAL_GOVERNED_RECOVERY;

test('external governed recovery is explicitly selectable but neither default nor runtime authority', () => {
  assert.equal(policy.mode, 'GITHUB_FIRST_OPERATIONAL_CONTINUITY');
  assert.equal(profile.enabledForExplicitSelection, true);
  assert.equal(profile.selectedByDefault, false);
  assert.equal(profile.executionEngineCreated, false);
  assert.equal(profile.runtimeWritePermissionGranted, false);
  assert.equal(profile.taskSessionOrLockCreated, false);
  assert.equal(profile.policyAuthority, policy.mode);
});

test('external recovery only composes existing least-privileged transports', () => {
  assert.deepEqual(profile.transportOrder, [
    'GITHUB_ONLY', 'GITHUB_ACTION_READONLY_EVIDENCE', 'GITHUB_ACTION_BOUNDED_WRITE', 'RUNTIME_REQUIRED'
  ]);
  for (const transport of profile.transportOrder) assert.ok(policy.executionModes[transport]);
  assert.ok(profile.forbidden.includes('BYPASS_E3_OAUTH_OIDC_TASK_SESSION_LOCK'));
  assert.ok(profile.forbidden.includes('GITHUB_DIRECT_MAIN_PUSH'));
  assert.ok(profile.mandatoryGates.includes('CI_AND_REQUIRED_REVIEWS_ON_EXACT_SHA'));
});

test('agents discover the same recovery procedure; no parallel profile authority', () => {
  const runbook = readFileSync(profile.runbook, 'utf8');
  assert.match(runbook, /PR #342/);
  assert.match(runbook, /PR #345/);
  assert.match(runbook, /HEAD_MOVED/);
  for (const file of ['AGENTS.md', 'CLAUDE.md']) {
    const content = readFileSync(file, 'utf8');
    assert.match(content, /EXTERNAL_GOVERNED_RECOVERY/);
    assert.match(content, /GITHUB_FIRST_GOVERNED_RECOVERY\.md/);
  }
});
