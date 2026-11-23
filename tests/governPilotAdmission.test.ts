import assert from 'node:assert/strict';
import test from 'node:test';
import { decideGovernPilotRuntimeAdmission, type GovernPilotAuthorityEvidence } from '../src/provisioning/governPilotAdmission.js';

const now = new Date('2026-10-23T02:00:00.000Z');
const scope = 'repository:chainsolutions-wealthtech/Governed-Repository-Template';
const sessionId='aaaacccc-1111-4111-8111-aaaacccc1111';
function good(): GovernPilotAuthorityEvidence {
  return {
    complete:true, observedStateVersion:1138, webPrincipalId:'oauth:wealthtech-mcp-admin',
    session: { governedSessionId:sessionId, ownerPrincipalId:'oauth:wealthtech-mcp-admin', status:'ACTIVE',
      lastAcknowledgedStateVersion:1138, bootstrapReceiptVerified:true, expiresAt:'2026-10-23T03:00:00.000Z' },
    tasks:[{taskId:'TASK-GRT-PILOT',status:'IN_PROGRESS',ownerGovernedSessionId:sessionId,resourceScopes:[scope]}],
    locks:[{scope, governedSessionId:sessionId,expiresAt:'2026-10-23T02:04:00.000Z'}]
  };
}
test('GRT authority RED: active, principal-bound, acked, receipt, exact claimed task and own live lock admit',()=>{
  assert.deepEqual(decideGovernPilotRuntimeAdmission(good(),now),{admitted:true,reason:'GRT_GOVERNED_RUNTIME_ADMITTED'});
});
test('GRT authority RED: missing or stale sources fail closed',()=>{
  const a=good();a.complete=false;
  assert.equal(decideGovernPilotRuntimeAdmission(a,now).admitted,false);
  const b=good();b.session=null;
  assert.equal(decideGovernPilotRuntimeAdmission(b,now).admitted,false);
  const c=good();c.session!.lastAcknowledgedStateVersion=1137;
  assert.equal(decideGovernPilotRuntimeAdmission(c,now).admitted,false);
});
test('GRT authority RED: web principal cannot use someone else governed session or claim',()=>{
  const a=good();a.session!.ownerPrincipalId='oauth:other-user';
  assert.equal(decideGovernPilotRuntimeAdmission(a,now).admitted,false);
  const b=good();b.tasks[0]!.ownerGovernedSessionId='other-session';
  assert.equal(decideGovernPilotRuntimeAdmission(b,now).admitted,false);
});
test('GRT authority RED: no verified bootstrap receipt or expired own lock cannot admit',()=>{
  const a=good();a.session!.bootstrapReceiptVerified=false;
  assert.equal(decideGovernPilotRuntimeAdmission(a,now).admitted,false);
  const b=good();b.locks[0]!.expiresAt='2026-10-23T01:59:00.000Z';
  assert.equal(decideGovernPilotRuntimeAdmission(b,now).admitted,false);
  const c=good();c.session!.expiresAt='2026-10-23T01:59:00.000Z';
  assert.equal(decideGovernPilotRuntimeAdmission(c,now).admitted,false);
});
test('GRT authority RED: another owner lock/task and wrong repo scope block',()=>{
  const a=good();a.locks.push({scope,governedSessionId:'another',expiresAt:'2026-10-23T03:00:00.000Z'});
  assert.equal(decideGovernPilotRuntimeAdmission(a,now).admitted,false);
  const b=good();b.tasks.push({taskId:'FOREIGN',status:'IN_PROGRESS',ownerGovernedSessionId:'another',resourceScopes:[scope]});
  assert.equal(decideGovernPilotRuntimeAdmission(b,now).admitted,false);
  const c=good();c.tasks[0]!.resourceScopes=['repository:Patricked-code/MCP'];
  assert.equal(decideGovernPilotRuntimeAdmission(c,now).admitted,false);
});
