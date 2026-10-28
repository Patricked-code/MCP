import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { consumeSignedPleskE3Once } from '../src/provisioning/pleskE3SingleUse.js';

const now = Date.parse('2026-10-28T07:00:00.000Z');
const binding=JSON.stringify(['web-session-from-server','s1','example.com','sandbox','/sandbox']);
const ticket=String(now+600000)+'.'+'A'.repeat(43);
const scope='resource:plesk:s1:example.com';
const context={ticket,binding,scope,principalId:'oauth:owner',governedSessionId:'11111111-1111-4111-8111-111111111111',taskId:'TASK-20261028-555'};
const verify=(purpose:string,t:string,b:string)=>purpose==='plesk-create-subdomain'&&t===ticket&&b===binding;
async function sandbox(fn:(dir:string)=>Promise<void>) {
  const root=await mkdtemp(join(tmpdir(),'gd-u-plesk-e3-'));
  try { await fn(join(root,'receipts')); } finally { await rm(root,{recursive:true,force:true}); }
}

test('RED: only one concurrent signed ticket succeeds across multiple instances using same directory',async()=>{
  await sandbox(async dir=>{
    const results=await Promise.all(Array.from({length:12},()=>consumeSignedPleskE3Once(context,{
      directory:dir,verifyTicket:verify,verifyPreAdmission:async()=>true,now:()=>now
    })));
    assert.equal(results.filter(r=>r.status==='CONSUMED').length,1);
    assert.equal(results.filter(r=>r.reason==='ALREADY_CONSUMED').length,11);
    assert.ok(results.every(r=>r.runtimeWriteAuthorized===false));
    const names=await readdir(dir);
    assert.equal(names.length,1);
    assert.match(names[0],/^[0-9a-f]{64}\.json$/);
    const payload=await readFile(join(dir,names[0]),'utf8');
    assert.doesNotMatch(payload,/A{43}|web-session-from-server|oauth:owner|TASK-20261028-555/);
  });
});

test('RED: already consumed ticket stays blocked after restarting consumer',async()=>{
  await sandbox(async dir=>{
    assert.equal((await consumeSignedPleskE3Once(context,{directory:dir,verifyTicket:verify,verifyPreAdmission:async()=>true,now:()=>now})).status,'CONSUMED');
    const next=await consumeSignedPleskE3Once({...context},{directory:dir,verifyTicket:verify,verifyPreAdmission:async()=>true,now:()=>now+1000});
    assert.equal(next.status,'BLOCKED');
    assert.equal(next.reason,'ALREADY_CONSUMED');
  });
});

test('RED: wrong binding, invalid/expired signature or malformed ticket cannot consume',async()=>{
  await sandbox(async dir=>{
    for(const changed of [
      {...context,binding:'another-web-session'},
      {...context,ticket:'forged'},
      {...context,scope:'resource:plesk:s2:example.com'},
      {...context,governedSessionId:''}
    ]){
      const result=await consumeSignedPleskE3Once(changed,{directory:dir,verifyTicket:verify,verifyPreAdmission:async()=>true,now:()=>now});
      assert.equal(result.status,'BLOCKED');
    }
    const expired=await consumeSignedPleskE3Once(context,{directory:dir,verifyTicket:verify,verifyPreAdmission:async()=>true,now:()=>now+600001});
    assert.equal(expired.status,'BLOCKED');
    assert.deepEqual(await readdir(dir),[]);
  });
});

test('RED: if trusted pre-admission rejects, no ticket is burned',async()=>{
  await sandbox(async dir=>{
    let count=0;
    const denied=await consumeSignedPleskE3Once(context,{
      directory:dir,verifyTicket:verify,verifyPreAdmission:async()=>true,now:()=>now,
      verifyPreAdmission:async()=>{count++;return false;}
    });
    assert.equal(denied.status,'BLOCKED');
    assert.equal(denied.reason,'GOVERNED_ADMISSION_NOT_ATTESTED');
    assert.equal(count,1);
    assert.deepEqual(await readdir(dir),[]);
  });
});

test('RED: missing directory permission or storage fault fails closed, never claims consumed',async()=>{
  await sandbox(async dir=>{
    const a=await consumeSignedPleskE3Once(context,{directory:'',verifyTicket:verify,verifyPreAdmission:async()=>true,now:()=>now});
    assert.equal(a.status,'BLOCKED');
    const b=await consumeSignedPleskE3Once(context,{
      directory:join(dir,'missing'),verifyTicket:()=>{throw Error('SECRET_API_KEY');},verifyPreAdmission:async()=>true,now:()=>now
    });
    assert.equal(b.status,'BLOCKED');
    assert.doesNotMatch(JSON.stringify(b),/SECRET_API_KEY/);
  });
});

test('GREEN: a missing governed preadmission callback can never consume a signed ticket',async()=>{
  await sandbox(async dir=>{
    const result=await consumeSignedPleskE3Once(context,{
      directory:dir,verifyTicket:verify,now:()=>now
    } as never);
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.reason,'GOVERNED_ADMISSION_NOT_ATTESTED');
    assert.deepEqual(await readdir(dir),[]);
  });
});
