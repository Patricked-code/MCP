import assert from 'node:assert/strict';
import test from 'node:test';
import { collectCapacity, parseCapacityOutput, sameObservedFilesystem,
  type CapacityTarget, type CapacityObservation } from '../src/infrastructureLifecycle/capacityProbe.js';
const header='Filesystem 1-blocks Used Available Capacity Mounted on\n';
const sample=header+'/dev/sample 1000 800 100 89% /\n';
const inode='Filesystem Inodes IUsed IFree IUse% Mounted on\n/dev/sample 100 80 20 80% /\n';
const success={code:0,stderr:'',stdout:sample};
test('capacity includes reserve and GNU percentage semantics',()=>{
  assert.deepEqual(parseCapacityOutput(sample,'BYTES'),
    {filesystem:'/dev/sample',mount:'/',total:1000,used:800,available:100,usedPercent:89});
  assert.equal(parseCapacityOutput(inode,'INODES')?.available,20);
  assert.equal(parseCapacityOutput(sample,'INODES'),null);
});
test('malformed, incomplete, duplicate, inconsistent and unsafe values fail closed',()=>{
  for(const s of [
    '',sample+sample, sample.replace('1000','99999999999999999999'),
    sample.replace('100 89%','-100 89%'),sample.replace('89%','80%'),
    sample.replace('100 89%','300 89%'),sample.replace('1000','0'),
    sample.replace('Mounted on','Unknown'),sample+'...[sortie plafonnée par le MCP]',
    sample.replace('/dev/sample','/dev/a b')
  ]) assert.equal(parseCapacityOutput(s,'BYTES'),null);
});
test('collector sends fixed commands, bounded timeout/output, no write',async()=>{
  const seen:string[]=[];
  const r=await collectCapacity(async(host,cmd,ms,max)=>{
    assert.equal(host,'s2');assert.equal(ms,15000);assert.equal(max,10000);
    seen.push(cmd);return success;
  },'s2','RELAY_STORAGE','BYTES',()=>100);
  assert.deepEqual(seen,['LC_ALL=C df -P -B1 /var/lib']);
  assert.equal(r.status,'OBSERVED');assert.equal(r.writesPerformed,false);
});
test('invalid path-like target cannot reach transport',async()=>{
  let calls=0;
  const r=await collectCapacity(async()=>{calls++;return success;},'s1',
    '; invalid' as CapacityTarget,'BYTES');
  assert.equal(r.status,'UNVERIFIED');assert.equal(calls,0);
});
test('nonzero exit, warnings, timeout, invalid clock and transport failure are unknown',async()=>{
  for(const result of [{...success,code:1},{...success,code:null},{...success,stderr:'warning'}]){
    assert.equal((await collectCapacity(async()=>result,'s1','ROOT','BYTES',()=>100)).status,'UNVERIFIED');
  }
  let ticks=[100,15101];
  assert.equal((await collectCapacity(async()=>success,'s1','ROOT','BYTES',()=>ticks.shift()!)).status,'UNVERIFIED');
  assert.equal((await collectCapacity(async()=>{throw Error('offline');},'s1','ROOT','BYTES')).status,'UNVERIFIED');
});
test('mount aliases are not independent physical capacity',async()=>{
  const a=await collectCapacity(async()=>success,'s2','RELAY_STORAGE','BYTES',()=>100);
  const b=await collectCapacity(async()=>success,'s2','DOCKER_STORAGE','BYTES',()=>100);
  const c=await collectCapacity(async()=>success,'s1','ROOT','BYTES',()=>100);
  assert.equal(sameObservedFilesystem(a,b),true);
  assert.equal(sameObservedFilesystem(a,c),false);
  assert.equal(sameObservedFilesystem(a,{status:'UNVERIFIED'} as CapacityObservation),false);
});
