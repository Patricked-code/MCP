import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

type Profile = {
  id: string;
  repositoryScope: string;
  implementationStatus: string;
  selectionContract: {
    automaticallyProcessedByRuntime: boolean;
    noNewTaskQueueOrWorker: boolean;
    selectedProfileRecordedInExistingIssueOrPrCheckpoint: boolean;
  };
  constructionMethodRelationship: {
    independentOfConstructionMethods: boolean;
    mayCoexistWith: string;
  };
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

test('recovery selection applies MCP-wide without a new runtime engine or GD-U global authority', () => {
  assert.equal(policy.selectableProfiles.EXTERNAL_GOVERNED_RECOVERY.repositoryScope, 'MCP_GLOBAL_ALL_WORKSTREAMS');
  assert.equal(policy.selectableProfiles.EXTERNAL_GOVERNED_RECOVERY.implementationStatus, 'AGENT_RUNBOOK_AND_EXISTING_PROJECT_CONTEXT_DISCOVERY_NO_AUTOMATIC_EXECUTION');
  const selection = policy.selectableProfiles.EXTERNAL_GOVERNED_RECOVERY.selectionContract;
  assert.equal(selection.automaticallyProcessedByRuntime, false);
  assert.equal(selection.noNewTaskQueueOrWorker, true);
  assert.equal(selection.selectedProfileRecordedInExistingIssueOrPrCheckpoint, true);
  const runbook = readFileSync('docs/runbooks/GITHUB_FIRST_GOVERNED_RECOVERY.md', 'utf8');
  assert.match(runbook, /tout le MCP|l'ensemble du MCP/);
  assert.match(runbook, /aucun moteur runtime/);
  assert.match(runbook, /#346/);
});

test('GD-U construction methodology stays independent of optional recovery transport', () => {
  const gd = JSON.parse(readFileSync('docs/governance/universal-capabilities-bifurcation-20261028.json', 'utf8'));
  const foundations = JSON.parse(readFileSync('docs/governance/FND_FOUNDATIONS_REGISTRY.json', 'utf8'));
  const p = policy.selectableProfiles.EXTERNAL_GOVERNED_RECOVERY;
  assert.equal(gd.workingMethodology.version, 'GD-U-METHOD-20261028-01');
  assert.equal(p.constructionMethodRelationship.mayCoexistWith, gd.workingMethodology.version);
  assert.equal(p.constructionMethodRelationship.independentOfConstructionMethods, true);
  assert.equal(foundations.method, 'EXTERNAL_GOVERNED_RECOVERY'); // historical field preserved for compatibility
  assert.equal(foundations.constructionMethodId, gd.workingMethodology.version);
  assert.equal(foundations.externalOperatingProfileId, p.id);
  assert.match(foundations.methodFieldLegacyInterpretation, /NOT GD-U construction methodology/);
  assert.deepEqual(gd.workingMethodology.principles.map((x: { id: string }) => x.id), [
    'GITHUB_FIRST', 'NO_REGRESSION', 'INDEPENDENT_SLICES', 'RED_GREEN_REGRESSION'
  ]);
});

test('official full name and read-only preview stay linked to the same non-authoritative profile', () => {
  assert.match(profile.fullName, /développement.*correction.*maintenance.*reprise.*déploiement/);
  assert.equal(profile.selectionContract.readonlySelectionPreviewTool, 'get_project_context');
  assert.equal(profile.selectionContract.automaticallyProcessedByRuntime, false);
  assert.match(readFileSync(profile.runbook, 'utf8'), /get_project_context/);
});
