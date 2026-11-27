import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { assertReadOnlyCommand } from '../src/ssh/safety.js';
import { collectFreeboxCapacity,parseFreeboxCapacity } from '../src/infrastructureLifecycle/freeboxCapacity.js';
const path='/etc/fixture/freebox.json',out='{"totalBytes":1000,"usedBytes":600,"availableBytes":300}';
test('Freebox capacity preserves available bytes instead of assuming total minus used',()=>{
  assert.deepEqual(parseFreeboxCapacity(out,1),{status:'OBSERVED',observedAtMs:1,totalBytes:1000,usedBytes:600,availableBytes:300,destinationIdentity:'CONFIGURED_PARTITION',writesPerformed:false});
  for(const s of ['{}','{"totalBytes":1000,"usedBytes":600,"availableBytes":500}',out.replace('300','-1'),out.replace('300','1.2'),out.slice(0,-1)+',"token":"private"}'])
    assert.equal(parseFreeboxCapacity(s,1).status,'UNVERIFIED');
});
test('Freebox adapter uses fixed bounded S2 command, no external config or response secrets',async()=>{
  let calls=0;
  const read=async(host:string,command:string,timeout:number,max:number)=>{
    calls++;assert.equal(host,'s2');assert.equal(timeout,30000);assert.equal(max,1024);
    assertReadOnlyCommand(command);
    execFileSync('bash',['-n','-c',command]);
    assert.match(command,/storage\/partition\//);assert.match(command,/login\/logout\//);
    return {stdout:out,stderr:'',code:0};
  };
  assert.equal((await collectFreeboxCapacity(read,'/etc/../private.json',()=>1)).status,'UNVERIFIED');
  assert.equal(calls,0);
  assert.equal((await collectFreeboxCapacity(read,path,()=>1)).status,'OBSERVED');assert.equal(calls,1);
  const x=await collectFreeboxCapacity(async()=>({code:1,stdout:'secret',stderr:'private'}),path,()=>1);
  assert.equal(x.status,'UNVERIFIED');assert.ok(!JSON.stringify(x).includes('secret'));
});
