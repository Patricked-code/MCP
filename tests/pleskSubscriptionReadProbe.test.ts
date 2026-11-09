import assert from 'node:assert/strict';
import test from 'node:test';
import {probeAllowlistedPleskSubscriptionRead} from '../src/provisioning/pleskSubscriptionReadProbe.js';
test('B3j: verified allowlisted subscription info reads on S1 and S2 do not grant write',async()=>{
 const commands:string[]=[];
 const x=await probeAllowlistedPleskSubscriptionRead({
   s1:['wealthtechinnovations.com'],s2:['chainsolutions.fr']
 },async(s,c)=>{commands.push(s+':'+c);return{code:0,stdout:'Subscription ok'};});
 assert.deepEqual(commands,[
   "s1:plesk bin subscription --info 'wealthtechinnovations.com'",
   "s2:plesk bin subscription --info 'chainsolutions.fr'"
 ]);
 assert.equal(x.length,2);
 assert.ok(x.every(v=>v.status==='SUBSCRIPTION_READABLE'));
 assert.ok(x.every(v=>v.readPermissionObserved));
 assert.ok(x.every(v=>v.pleskAdminWritePermissionVerified===false && v.mutationExecuted===false));
});
test('B3j: denied or empty Plesk output is not permission evidence',async()=>{
 const x=await probeAllowlistedPleskSubscriptionRead({
   s1:['wealthtechinnovations.com'],s2:['chainsolutions.fr']
 },async(server)=>server==='s1'?{code:13,stdout:'',stderr:'SECRET_KEY'}:
  {code:0,stdout:' ',stderr:''});
 assert.ok(x.every(v=>v.status==='SUBSCRIPTION_READ_DENIED_OR_UNVERIFIED'));
 assert.ok(x.every(v=>!v.readPermissionObserved));
 assert.doesNotMatch(JSON.stringify(x),/SECRET_/);
});
test('B3j: injected domains and duplicate subscription targets are rejected before SSH',async()=>{
 let calls=0;
 const read=async()=>{calls++;return{code:0,stdout:'OK'};};
 for(const domains of [
   {s1:["example.com'; rm -rf /"]},
   {s1:['wealthtechinnovations.com','wealthtechinnovations.com']},
   {s2:['EXAMPLE.com']},
   {s1:['a.com','b.com','c.com','d.com','e.com']}
 ]){
   await assert.rejects(()=>probeAllowlistedPleskSubscriptionRead(domains,read));
 }
 assert.equal(calls,0);
});
test('B3j: missing allowlist means zero Plesk probes and no inferred privileges',async()=>{
 let calls=0;
 const x=await probeAllowlistedPleskSubscriptionRead({},async()=>{
   calls++;return{code:0,stdout:'OK'};
 });
 assert.deepEqual(x,[]);
 assert.equal(calls,0);
});
test('B3j: SSH failure is denied with no secret disclosure',async()=>{
 const x=await probeAllowlistedPleskSubscriptionRead({
   s1:['wealthtechinnovations.com']
 },async()=>{throw Error('SECRET_TRANSPORT')});
 assert.equal(x[0]?.readPermissionObserved,false);
 assert.doesNotMatch(JSON.stringify(x),/SECRET/);
});
