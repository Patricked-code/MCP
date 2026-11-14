import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import express from 'express';
import { createCugAdmission, createCugRouter } from '../src/cug/admission.js';
import { GRT_CONTROL_REPOSITORY, observeGrtRequest, prepareGrtRequest, submitToGrt } from '../src/cug/questionnaire.js';

const origin='https://mcp.example.test';
const login='chainsolutions-wealthtech';
const target=login+'/sample';
const credential='fixture-oauth';
const answers={objective:'Préparer une application de démonstration',repositoryName:'sample',visibility:'private',
  publishToControlPlane:true,confirmCreateRepository:true};
const projectContinuityId='WT-PROJECT-GRT-1386478935-GR-000035';
const issueUrl='https://github.com/'+GRT_CONTROL_REPOSITORY+'/issues/35';
function fixture(write=true){
  const actor={subject:'test',clientId:'client',scopes:write?['mcp:read','mcp:write']:['mcp:read'],expiresAt:1_900_000_000};
  const calls:unknown[]=[];
  const reads:unknown[]=[];
  let revoked=false;
  let now=1_800_000_000_000;
  let uncertain=false;
  const service=createCugAdmission({origin,getConfig:async()=>({subject:'test',clientId:'client',identityKey:'a'.repeat(64),
    accounts:[{login,installationId:1,probeRepository:login+'/fixture'}]}),inspect:t=>t===credential?actor:null,
    now:()=>now,probe:async()=>!revoked,submit:async (payload,fullName)=>{
      calls.push({payload,fullName});return uncertain?'DELIVERY_UNKNOWN':'QUEUED';
    },observe:async (...args)=>{
      reads.push(args);
      return {status:'FOUND',projectContinuityId,phase:'PREP-002',grtState:'EXECUTING_PREPARATION',revision:2,issueUrl};
    }});
  return {service,calls,reads,revoke:()=>{revoked=true;},expire:()=>{now+=16*60_000;},uncertain:()=>{uncertain=true;}};
}
async function admit(f:ReturnType<typeof fixture>, resume?:string, continuity?:string){
  const started=await f.service.begin(credential,resume,continuity);
  assert.equal(started.status,'AUTHENTICATION_REQUIRED');
  if(started.status!=='AUTHENTICATION_REQUIRED')return assert.fail();
  assert.equal(new URL(started.authUrl).search,'');
  assert.doesNotMatch(started.authUrl,/sample|000035|fixture-oauth/);
  const ref=new URLSearchParams(new URL(started.authUrl).hash.slice(1)).get('request')!;
  assert.equal((await f.service.verify(ref,'5417646',credential)).status,'ACCOUNT_SELECTION_REQUIRED');
  let cookie='';
  const result=await f.service.select(ref,login,credential,{setQuestionnaire:x=>{cookie=x;}});
  assert.equal(result.status,'AUTHENTICATED');
  assert.ok(cookie);
  assert.doesNotMatch(JSON.stringify(result),/fixture-oauth|cug_questionnaire/);
  if(!('formRef' in result)||!result.formRef)return assert.fail();
  return {cookie,ref,result,formRef:result.formRef};
}

test('submit requires two explicit consents, binds the server-side account and prevents duplicate dispatch',async()=>{
  const f=fixture();
  const {cookie,formRef}=await admit(f);
  assert.equal((await f.service.submit(cookie,formRef,{...answers,confirmCreateRepository:false})).status,'INVALID_REQUEST');
  assert.equal((await f.service.submit(cookie,formRef,{...answers,owner:'other'})).status,'INVALID_REQUEST');
  assert.equal((await f.service.submit(cookie,formRef,{...answers,objective:'do not post @owner'})).status,'INVALID_REQUEST');
  assert.deepEqual(await f.service.submit(cookie,formRef,answers),{status:'QUEUED'});
  assert.deepEqual(f.calls,[{payload:{objective:answers.objective,creation:{owner:login,name:'sample',visibility:'private'}},fullName:target}]);
  assert.equal((await f.service.observe(cookie,formRef)).status,'FOUND');
  assert.equal((await f.service.submit(cookie,formRef,answers)).status,'ALREADY_SUBMITTED');
  const next=await admit(f);
  assert.equal((await f.service.submit(next.cookie,next.formRef,answers)).status,'RECONCILIATION_REQUIRED');
  assert.equal(f.calls.length,1);
});

test('read-only identity, expired admission and withdrawn CUG installation cannot submit',async()=>{
  const read=fixture(false);
  const first=await admit(read);
  assert.equal((await read.service.submit(first.cookie,first.formRef,answers)).status,'UNAVAILABLE');
  const f=fixture();
  const {cookie,formRef}=await admit(f);
  f.revoke();
  assert.equal((await f.service.submit(cookie,formRef,answers)).status,'AUTHORIZATION_REQUIRED');
  f.expire();
  assert.equal((await f.service.observe(cookie,formRef)).status,'AUTHORIZATION_REQUIRED');
  assert.deepEqual([...read.calls,...f.calls],[]);
});

test('uncertain delivery and a new MCP entrance by ID only allow reconciliation, not replay',async()=>{
  const f=fixture();
  f.uncertain();
  const {cookie,formRef}=await admit(f);
  assert.equal((await f.service.submit(cookie,formRef,answers)).status,'DELIVERY_UNKNOWN');
  const next=await admit(f,undefined,projectContinuityId);
  assert.equal('mode' in next.result&&next.result.mode,'RESUME');
  assert.equal((await f.service.submit(next.cookie,next.formRef,answers)).status,'AUTHORIZATION_REQUIRED');
  assert.equal((await f.service.observe(next.cookie,next.formRef)).status,'FOUND');
  assert.deepEqual(f.reads,[[login,undefined,projectContinuityId]]);
  assert.equal(f.calls.length,1);
  assert.equal((await f.service.recover(credential,projectContinuityId)).status,'FOUND');
  assert.equal((await f.service.recover('invalid',projectContinuityId)).status,'AUTHORIZATION_REQUIRED');
});

test('browser route requires same origin and a private questionnaire cookie instead of a posted OAuth token',async()=>{
  const f=fixture();
  const app=express();
  app.use(createCugRouter(f.service,origin,()=>true));
  const server=app.listen(0,'127.0.0.1');
  try {
    await new Promise<void>(r=>server.once('listening',r));
    const address=server.address();
    if(!address||typeof address==='string')return assert.fail();
    const base='http://127.0.0.1:'+address.port+'/repo-template/auth';
    const post=(path:string,body:unknown,headers:Record<string,string>={})=>fetch(base+path,{
      method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
    const started=await f.service.begin(credential);
    if(started.status!=='AUTHENTICATION_REQUIRED')return assert.fail();
    const request=new URLSearchParams(new URL(started.authUrl).hash.slice(1)).get('request')!;
    const auth={authorization:'Bearer '+credential};
    assert.equal((await post('/verify',{request,appId:'5417646'},auth)).status,200);
    const selected=await post('/select',{request,appId:'5417646',accountId:login},auth);
    assert.equal(selected.status,200);
    const formRef=(await selected.json()).formRef;
    const setCookie=selected.headers.get('set-cookie')!;
    assert.match(setCookie,/HttpOnly; Secure; SameSite=Strict/);
    const cookie=setCookie.split(';')[0]!;
    assert.equal((await post('/submit',answers,auth)).status,401);
    assert.equal((await post('/submit',answers,{origin:'https://foreign.test',cookie})).status,403);
    assert.equal((await post('/submit',answers,{cookie,'x-cug-form':'a'.repeat(43)})).status,401);
    const sent=await post('/submit',answers,{cookie,'x-cug-form':formRef});
    assert.equal(sent.status,202);
    assert.deepEqual(await sent.json(),{status:'QUEUED'});
    const status=await fetch(base+'/status',{headers:{cookie,'x-cug-form':formRef}});
    assert.equal(status.status,200);
    assert.equal((await status.json()).projectContinuityId,projectContinuityId);
    assert.equal((await fetch(base+'/status')).status,401);
  }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});

test('CUG uses a single central repository token and refuses writes for another target or unexpected GRT head',async()=>{
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
  const expectedGrtMain='a'.repeat(40);
  const config={appId:'5417646',installationId:42,allowedTarget:target,expectedGrtMain};
  const ops:Array<{path:string; body?:any}>=[];
  let head='b'.repeat(40);
  const deps={readPrivateKey:async()=>privateKey,now:()=>new Date('2026-11-14T04:00:00Z'),fetchImpl:(async(input,init)=>{
    const path=new URL(String(input)).pathname;
    ops.push({path,body:init?.body?JSON.parse(String(init.body)):undefined});
    if(path.endsWith('/access_tokens'))return Response.json({token:'fixture-installation',expires_at:'2026-11-14T05:00:00Z'},{status:201});
    if(path.endsWith('/main'))return Response.json({commit:{sha:head}});
    return new Response(null,{status:204});
  }) as typeof fetch};
  const body=prepareGrtRequest(login,answers)!;
  assert.equal(await submitToGrt(body,config,login+'/other',deps),'NOT_AVAILABLE');
  assert.deepEqual(ops,[]);
  assert.equal(await submitToGrt(body,config,target,deps),'NOT_AVAILABLE');
  assert.equal(ops.length,2);
  head=expectedGrtMain;
  assert.equal(await submitToGrt(body,config,target,deps),'QUEUED');
  assert.deepEqual(ops[2]?.body,{repositories:['Governed-Repository-Template'],permissions:{contents:'write'}});
  assert.deepEqual(ops[4],{path:'/repos/'+GRT_CONTROL_REPOSITORY+'/dispatches',
    body:{event_type:'governed_request_start',client_payload:body}});
});

test('observation returns only an exact correlated central checkpoint without leaking state or accepting a foreign issue',async()=>{
  const state={schema_version:'1.0.0',project_continuity_id:projectContinuityId,request_id:'GR-000035',
    control_plane_repository:GRT_CONTROL_REPOSITORY,credential_provider:'CUG',
    answers:{entry_action:'CREATE_NEW_REPOSITORY',creation_target_owner:login,repository_name:'sample'},
    status:'HANDOFF_READY',phase:'HANDOFF',revision:8};
  const encoded=Buffer.from(JSON.stringify(state)).toString('base64url');
  const issue={number:35,user:{login:'github-actions[bot]'},title:'[Governed Request] sample',
    body:'<!-- GRT_CUG_CREATE_TARGET:'+target+' -->\n<!-- GOVERNED_REQUEST_STATE:'+encoded+' -->'};
  const f=(async(input,init)=>{
    assert.equal(new URL(String(input)).pathname,'/repos/'+GRT_CONTROL_REPOSITORY+'/issues/35');
    assert.equal(new Headers(init?.headers).get('authorization'),null);
    return Response.json(issue);
  }) as typeof fetch;
  assert.deepEqual(await observeGrtRequest(target,{allowedTarget:target},f,projectContinuityId),
    {status:'FOUND',projectContinuityId,phase:'HANDOFF',grtState:'HANDOFF_READY',revision:8,issueUrl});
  issue.user.login='imposter';
  assert.deepEqual(await observeGrtRequest(target,{allowedTarget:target},f,projectContinuityId),{status:'UNCONFIRMED'});
});
