import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('intake #201 converges into the existing conditional bounded server-write blueprint without privilege widening', async () => {
  const [programRaw, policyRaw] = await Promise.all([
    readFile('docs/governance/program-backlog-convergence.json', 'utf8'),
    readFile('.mcp/github-first-operational-policy.json', 'utf8')
  ]);
  const program = JSON.parse(programRaw);
  const policy = JSON.parse(policyRaw);

  assert.equal(
    program.w3A3InventoryHandoff?.a32ExecutionGate?.reasonCode,
    'RUNTIME_REOBSERVATION_CLEAN_MATERIALIZATION_PATH_UNAVAILABLE'
  );
  assert.equal(
    program.w3A3InventoryHandoff?.a32ExecutionGate?.githubFallbackCoverage?.mutationOrClaim,
    false
  );

  const intake = (program.programIntakes ?? []).find((entry: any) => entry.issue === 201);
  assert.ok(intake, 'intake #201 must be represented in Program Backlog V2');
  assert.equal(intake.status, 'REMEDIATED_CLOSED');
  assert.equal(intake.createsParallelProgram, false);
  assert.equal(intake.createsRuntimeTasks, false);
  assert.equal(intake.integrationVerdict, 'COMPLEMENT');
  assert.deepEqual(intake.targetBlueprintIds, ['TB-COND-SERVER-WRITE']);
  assert.equal(
    intake.runtimeRemediationStatus,
    'COMPLETED_BY_AUTHORIZED_INFRASTRUCTURE_PATH'
  );
  assert.equal(intake.remediationEvidence?.issueState, 'closed');
  assert.equal(intake.remediationEvidence?.issueStateReason, 'completed');
  assert.equal(intake.remediationEvidence?.tlsRestored, true);
  assert.equal(
    intake.remediationEvidence?.restorationPath,
    'authorized_human_infrastructure_plesk'
  );
  assert.equal(intake.remediationEvidence?.governedDeploy?.runNumber, 87);
  assert.equal(intake.remediationEvidence?.governedDeploy?.attempt, 2);
  assert.equal(intake.remediationEvidence?.governedDeploy?.conclusion, 'success');
  assert.deepEqual(
    intake.remediationEvidence?.runtimeAuthorityProbes?.map((entry: any) => ({
      probe: entry.probe,
      conclusion: entry.conclusion,
      truncated: entry.truncated
    })),
    [
      { probe: 'mcp_governed_tasks', conclusion: 'success', truncated: false },
      { probe: 'mcp_governed_sessions', conclusion: 'success', truncated: false },
      { probe: 'mcp_governed_locks', conclusion: 'success', truncated: false }
    ]
  );

  const blueprint = (program.taskBlueprints ?? []).find(
    (entry: any) => entry.id === 'TB-COND-SERVER-WRITE'
  );
  assert.ok(blueprint);
  assert.equal(blueprint.readiness?.state, 'DEFERRED');
  assert.equal(blueprint.readiness?.autoPromotable, false);
  assert.deepEqual(blueprint.readiness?.requiredExplicitGates, [
    'CONCRETE_BOUNDED_OPERATION_REQUIRED',
    'DEDICATED_IDENTITY_AND_ROLLBACK_DESIGN'
  ]);

  const evidence = blueprint.conditionalGateEvidence;
  assert.equal(evidence?.concreteBoundedOperationRequired?.satisfied, true);
  assert.equal(evidence?.concreteBoundedOperationRequired?.sourceIssue, 201);
  assert.equal(
    evidence?.concreteBoundedOperationRequired?.operation,
    's1_public_tls_certificate_restore'
  );
  assert.equal(
    evidence?.concreteBoundedOperationRequired?.targetHost,
    'mcp.wealthtechinnovations.com'
  );
  assert.equal(evidence?.dedicatedIdentityAndRollbackDesign?.satisfied, false);
  assert.equal(
    evidence?.dedicatedIdentityAndRollbackDesign?.reasonCode,
    'DEDICATED_TLS_RECOVERY_IDENTITY_AND_ROLLBACK_NOT_DEFINED'
  );
  assert.equal(evidence?.dependencyD2Complete, false);

  assert.equal(
    policy.invariants.includes('READONLY_FALLBACK_NEVER_AUTHORIZES_SERVER_WRITE'),
    true
  );
  assert.equal(
    policy.invariants.includes('NO_ARBITRARY_SHELL'),
    true
  );
});

test('remediated intake #201 does not materialize or claim A3.2 runtime authority', async () => {
  const program = JSON.parse(
    await readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  );

  const a32 = (program.taskBlueprints ?? []).find(
    (entry: any) => entry.id === 'TB-W3-A3-02'
  );
  assert.equal(a32?.readiness?.state, 'READY');
  assert.equal(
    program.w3A3InventoryHandoff?.a32ExecutionGate?.executionStatus,
    'BLOCKED_PENDING_RUNTIME_MATERIALIZATION_AUTHORITY'
  );

  const intake = (program.programIntakes ?? []).find((entry: any) => entry.issue === 201);
  assert.equal(intake?.runtimeTasksCreatedByConvergence, 0);
  assert.equal(intake?.governedSessionsCreatedByConvergence, 0);
  assert.equal(intake?.runtimeLocksCreatedByConvergence, 0);
});
