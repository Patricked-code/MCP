import test from 'node:test';
import assert from 'node:assert/strict';
import { projectPrc17Operation,dispatchPrc17Operation,type Prc17RuntimePorts,type Prc17Lease,type Prc17Evidence } from '../src/infrastructureLifecycle/prc17Operation.js';
import type { Observation } from '../src/infrastructureLifecycle/maintenancePlan.js';
const now=Date.parse('2026-01-15T10:00:00Z'),plan='a'.repeat(64),e=<T>(value:T)=>({value,observedAtMs:now});
const observation:Observation={nowMs:now,maxAgeMs:1000,stage:e('EMPTY'),producers:e('CLEAR'),deployment:e('CLEAR'),conflicts:e('CLEAR'),
sourceHealthy:e(true),destinationHealthy:e(true),relayFreeBytes:e(40*1024**3),destinationFreeBytes:e(30_000_000_000),rawArchiveBytes:null,
offsiteVerified:e(false),restoredExactReferences:e(false),protectedReferencesClear:e(false),policyAdmitted:e(true),planDigest:plan,receiptPlanDigest:null};
const evidence:Prc17Evidence={observation,offsite:null,restore:null};
const lease:Prc17Lease={operation:'PRC17A_DOCKER_BACKUP',planDigest:plan,scriptSha256:'b'.repeat(64),taskId:'task-1',sessionId:'session-1',fencingToken:'fence-1',expiresAtMs:now+60_000};
const ports=(overrides:Partial<Prc17RuntimePorts>={}):Prc17RuntimePorts=>({observe:async()=>evidence,admit:async()=>lease,submit:async()=>({status:'ACCEPTED'}),now:()=>now,...overrides});
test('PRC17 dispatcher re-observes and re-admits exact candidate and never claims completion',async()=>{
  let observations=0,admissions=0,submissions=0;
  const r=await dispatchPrc17Operation(ports({observe:async()=>{observations++;return evidence;},admit:async()=>{admissions++;return lease;},submit:async x=>{submissions++;assert.deepEqual(x,lease);return {status:'ACCEPTED'};}}));
  assert.equal(r.status,'DISPATCH_ACCEPTED');assert.equal(r.effectCompleted,false);
  assert.deepEqual([observations,admissions,submissions],[2,2,1]);
});
test('PRC17 retention requires exact receipts even when planner flags are true',()=>{
  const result=projectPrc17Operation({...evidence,observation:{...observation,stage:e('RESTORE_VERIFIED'),receiptPlanDigest:plan,
    offsiteVerified:e(true),restoredExactReferences:e(true),protectedReferencesClear:e(true)}});
  assert.equal(result.operation,null);assert.deepEqual(result.reasons,['EXACT_RECEIPT_PAIR_REQUIRED']);
});
test('PRC17 rejects missing admission, expired lease, stage drift and fencing drift',async()=>{
  let submissions=0;
  const submit=async()=>{submissions++;return {status:'ACCEPTED' as const};};
  for(const a of [null,{...lease,expiresAtMs:now},{...lease,scriptSha256:'bad'}])
    assert.equal((await dispatchPrc17Operation(ports({admit:async()=>a,submit}))).status,'BLOCKED');
  let n=0;
  assert.equal((await dispatchPrc17Operation(ports({observe:async()=>++n===1?evidence:{...evidence,observation:{...observation,stage:e('PARTIAL')}},submit}))).status,'BLOCKED');
  n=0;
  assert.equal((await dispatchPrc17Operation(ports({admit:async()=>++n===1?lease:{...lease,fencingToken:'other'},submit}))).status,'BLOCKED');
  assert.equal(submissions,0);
});
test('PRC17 ambiguous worker submission demands reconciliation and is not retried',async()=>{
  let calls=0;
  const r=await dispatchPrc17Operation(ports({submit:async()=>{calls++;throw Error('lost');}}));
  assert.equal(r.status,'RECONCILE_REQUIRED');assert.equal(r.effectCompleted,false);assert.equal(calls,1);
});

test('PRC17 stale observation cannot be revived by its historical snapshot clock',async()=>{
  let submissions=0;
  const r=await dispatchPrc17Operation(ports({now:()=>now+2000,submit:async()=>{submissions++;return {status:'ACCEPTED'};}}));
  assert.equal(r.status,'BLOCKED');assert.equal(submissions,0);
});
