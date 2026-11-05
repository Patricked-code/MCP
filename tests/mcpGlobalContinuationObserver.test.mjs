import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  validateTrigger,
  validateGapMap,
  buildReport,
  REPOSITORY
} from '../scripts/mcp-global-continuation-observer.mjs';

const SHA = '7d29ad4212efa0bd343d53f400785e5c9cbf07f4';
const event = {
  name: 'push',
  repository: REPOSITORY,
  ref: 'refs/heads/main',
  sha: SHA
};
const map = JSON.parse(readFileSync('docs/governance/mcp-global-automation-gap-map-20261105.json', 'utf8'));
const program = JSON.parse(readFileSync('docs/governance/program-backlog-convergence.json', 'utf8'));
const at = '2026-11-05T12:00:00.000Z';

test('canonical main commits are observed, other repositories/branches and untrusted events are refused', () => {
  assert.equal(validateTrigger(event).accepted, true);
  assert.equal(validateTrigger({...event,name:'workflow_dispatch'}).accepted, true);
  for (const changed of [
    {...event,name:'pull_request'},
    {...event,ref:'refs/heads/mcp/feature'},
    {...event,repository:'other/MCP'},
    {...event,sha:'not-a-sha'},
    {...event,sha:SHA.slice(0,8)}
  ]) {
    assert.equal(validateTrigger(changed).accepted, false);
  }
});

test('the gap map is an ordered non-authoritative qualification, never a new runtime queue', () => {
  const gaps = validateGapMap(map);
  assert.equal(map.authority,'NONE');
  assert.equal(map.canonicalTaskAuthority,'Governed Task Queue');
  assert.ok(gaps.length >= 25);
  assert.deepEqual(map.historicalFamilies,['GWC','UAC','Program Backlog V2']);
  const levels = new Set(gaps.map(item => item.level));
  for(const stage of ['FOUNDATIONS','INTAKE','GWC','UAC','BACKLOG','MANDATE',
    'PROGRAM','ADMISSION','DISPATCH','UTL','DELIVERY','EVIDENCE','AUTOMATION','ACCEPTANCE']) {
    assert.ok(levels.has(stage),stage);
  }
  for (const gap of gaps) {
    assert.doesNotMatch(gap.gapId,/^TASK-/);
    assert.ok(gap.acceptance.length>15);
    assert.ok(gap.sourceLinks.length>0);
  }
});

test('missing/duplicated/forward dependencies and forged authority are rejected', () => {
  const copy = structuredClone(map);
  copy.gaps[1].dependsOn=['S32'];
  assert.throws(()=>validateGapMap(copy),/GAP_MAP_ORDER_DEPENDENCY_OR_PROVENANCE_INVALID/);
  const dup=structuredClone(map);
  dup.gaps[1].gapId=dup.gaps[0].gapId;
  assert.throws(()=>validateGapMap(dup),/GAP_MAP_ORDER_DEPENDENCY_OR_PROVENANCE_INVALID/);
  const hostile=structuredClone(map);
  hostile.executionPolicy.automaticTaskClaim=true;
  assert.throws(()=>validateGapMap(hostile),/INVALID_NON_AUTHORITATIVE_GAP_MAP/);
});

test('each main push yields a deterministic read-only continuation plan with no fabricated permissions', () => {
  const report=buildReport({event,map,program,observedAt:at});
  assert.equal(report.observedAt,at);
  assert.equal(report.trigger.sourceSha,SHA);
  assert.equal(report.canonicalProgram.totalBlueprints,program.taskBlueprints.length);
  assert.equal(report.gapQualification.total,map.gaps.length);
  assert.equal(report.operationalGates.runtimeSha,'UNKNOWN');
  assert.equal(report.operationalGates.ownerChoice,'NOT_OBSERVED');
  assert.equal(report.operationalGates.canExecute,false);
  assert.equal(report.operationalGates.canClaimTask,false);
  assert.equal(report.operationalGates.canMerge,false);
  assert.equal(report.operationalGates.canDeploy,false);
  assert.equal(report.operationalGates.noParallelQueueCreated,true);
  assert.ok(report.canonicalProgram.readinessCandidateIds.length>=0);
  assert.match(report.nextAction,/reconnect MCP|Reconcile the canonical/);
});

test('a program projection discrepancy prevents readiness from being treated as cleared', () => {
  const altered=structuredClone(program);
  altered.executionModel.currentReadyBlueprintIds=['INVALID_NONEXISTENT_BLUEPRINT'];
  const report=buildReport({event,map,program:altered,observedAt:at});
  assert.equal(report.outcome,'STOP_PROGRAM_PROJECTION_DRIFT');
  assert.ok(report.canonicalProgram.drift.length>0);
  assert.equal(report.operationalGates.canExecute,false);
});

test('no GitHub issue, PR, or workflow event claims the agent or selects a task', () => {
  const report=buildReport({event,map,program,observedAt:at});
  assert.equal(report.kind,'READ_ONLY_CONTINUATION_OBSERVATION_NOT_AGENT_DISPATCH');
  assert.equal(report.canonicalProgram.candidateAuthority,'PLANNING_ONLY');
  assert.equal(report.canonicalProgram.runtimeAuthorityConsulted,false);
  assert.ok(report.gapQualification.candidates.every(x=>
    x.qualification==='REQUIRES_LIVE_EVIDENCE_AND_OWNER_COLLISION_CHECK'));
  assert.throws(()=>buildReport({
    event:{...event,name:'issue_comment'},map,program,observedAt:at
  }),/EVENT_NOT_AUTHORIZED_FOR_MAIN_OBSERVATION/);
});

test('the existing intake workflow observes every main push without broadening its issue-write job', () => {
  const workflow=readFileSync('.github/workflows/mcp-auto-intake-discovery.yml','utf8');
  assert.match(workflow,/  push:\n    branches: \[main\]/);
  assert.match(workflow,/  observe-main:\n/);
  assert.match(workflow,/      contents: read/);
  assert.match(workflow,/github.event_name == 'issues' \|\| github.event_name == 'issue_comment'/);
  assert.match(workflow,/tests\/mcpGlobalContinuationObserver\.test\.mjs/);
  assert.doesNotMatch(workflow,/mcp_claim_next_governed_task|mcp_materialize_program_blueprint|secrets\.MCP_AUTH_TOKEN/);
});
