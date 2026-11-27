import assert from 'node:assert/strict';
import test from 'node:test';
import { createInfrastructureLifecycleService } from '../src/infrastructureLifecycle/service.js';
import type { CapacityObservation, Host, CapacityTarget, CapacityKind } from '../src/infrastructureLifecycle/capacityProbe.js';
const observed=async(host:Host,target:CapacityTarget,kind:CapacityKind):Promise<CapacityObservation>=>({
  status:'OBSERVED',host,target,kind,observedAtMs:1000,measurement:{filesystem:'/dev/test',mount:'/',total:100,used:80,available:20,usedPercent:80},writesPerformed:false
});
test('AILM status and Freebox do not fabricate measurements or authorize effects',async()=>{
  let calls=0;
  const run=createInfrastructureLifecycleService(async(...args)=>{calls++;return observed(...args)},async()=>{calls++;return {};},()=>1000);
  const a=await run('all','status'),b=await run('freebox','audit');
  assert.equal(calls,0);assert.equal(a.effectAuthorized,false);
  assert.equal(b.freebox.status,'UNVERIFIED');assert.equal(b.observations.length,0);
});
test('AILM reads exact scoped capacity and reuses cleanup projection only for plan',async()=>{
  const seen:string[]=[];
  const run=createInfrastructureLifecycleService(async(h,t,k)=>{seen.push(h+':'+t+':'+k);return observed(h,t,k);},async h=>({host:h,deletionAllowed:false}),()=>1000);
  const x=await run('s1','plan');
  assert.equal(seen.length,4);assert.ok(seen.every(s=>s.startsWith('s1:')));
  assert.equal(x.observations[0]?.aliases.length,2);
  assert.deepEqual(x.observations[0]?.cleanup,{host:'s1',deletionAllowed:false});
  assert.equal(x.prc17.nextStep,'WAIT');assert.equal(x.writesPerformed,false);
});
test('AILM rejects destructive operations, arbitrary targets and overlapping reads',async()=>{
  let release!:()=>void; const gate=new Promise<void>(r=>{release=r;});
  let calls=0;
  const run=createInfrastructureLifecycleService(async(...args)=>{calls++;await gate;return observed(...args);},async()=>null,()=>1000);
  await assert.rejects(run('s1','execute'),/AILM_INVALID_REQUEST/);
  await assert.rejects(run('/etc','audit'),/AILM_INVALID_REQUEST/);
  const first=run('s1','audit');const second=await run('s1','audit');
  assert.equal(second.observations[0]?.status,'BUSY');assert.equal(calls,1);
  release();await first;assert.equal(calls,4);
});
test('AILM probe failures are partial and never authorize cleanup',async()=>{
  const run=createInfrastructureLifecycleService(async()=>{throw Error('private');},async()=>{throw Error('private');},()=>1000);
  const x=await run('s2','plan');
  assert.equal(x.observations[0]?.status,'PARTIAL');assert.equal(x.effectAuthorized,false);
  assert.ok(!JSON.stringify(x).includes('private'));
});
