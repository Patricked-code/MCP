import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { CUG_APP_ID, createCugAdmission, createCugRouter } from '../src/cug/admission.js';
import { GRT_CONTROL_REPOSITORY } from '../src/cug/questionnaire.js';

const origin='https://mcp.example.test';
const account={login:'allowed',installationId:42,probeRepository:'allowed/probe'};
const config={subject:'cug-operator',clientId:'admitted-client',identityKey:'f'.repeat(64),accounts:[account]};
const actor={subject:config.subject,clientId:config.clientId,scopes:['mcp:read'],expiresAt:1_900_000_000};
const project='WT-PROJECT-GRT-1386478935-GR-000099';
const checkpoint={status:'FOUND' as const,projectContinuityId:project,phase:'HANDOFF',grtState:'HANDOFF_READY',
  revision:9,issueUrl:'https://github.com/'+GRT_CONTROL_REPOSITORY+'/issues/99'};
const timestamp='2026-11-20T12:00:00.000Z';
const sha='a'.repeat(40);
const receipt={status:'BASELINE_ATTESTED',subjectHead:sha,completedAt:timestamp};
const docs={status:'CLASSIFIED',policyId:'STD-GITHUB-DOC-GOV-001',policyVersion:1,observedCommit:sha,
  evidenceDigest:'b'.repeat(64),counts:{SCOPED_DOCUMENT:2},automaticMutation:false};
const dto={
  status:'HANDOFF',projectId:project,repository:{id:'123',name:'allowed/candidate',branch:'main'},
  checkpoint:{authority:'GRT_LOCAL',requestId:'LOCAL-000009',revision:2,phase:'HANDOFF',next:null,
    evidence:{repository:'allowed/candidate',issue:9,observedAt:timestamp}},
  architecture:receipt,documentation:docs,internalCanary:'NEVER_RETURN_THIS'
};

test('cockpit uses only the bound CUG admission, reads proofs on demand and never replays creation',async()=>{
  let reads=0, probes=0, now=1_800_000_000_000, enabled=true, revoked=false, central=true;
  let evidence:unknown=dto;
  const service=createCugAdmission({origin,now:()=>now,getConfig:async()=>config,inspect:t=>t==='fixture-token'?actor:null,
    probe:async()=>{probes++;return !revoked;},submit:async()=>{assert.fail('read-only action dispatched creation');},
    observe:async(login,target,id)=>{
      assert.equal(login,account.login);assert.equal(target,undefined);assert.equal(id,project);
      return central?checkpoint:{status:'UNCONFIRMED'};
    },
    readEvidence:async scope=>{
      reads++;
      assert.deepEqual(scope,{actor,login:'allowed',installationId:42,target:undefined,projectId:project});
      return evidence;
    }});
  const app=express();
  app.use(createCugRouter(service,origin,()=>enabled));
  const server=app.listen(0,'127.0.0.1');
  try{
    await once(server,'listening');
    const addr=server.address();if(!addr||typeof addr==='string')throw Error('Missing fixture address');
    const base='http://127.0.0.1:'+addr.port+'/repo-template/auth';
    const started=await service.begin('fixture-token',undefined,project);
    if(started.status!=='AUTHENTICATION_REQUIRED')assert.fail();
    const request=new URLSearchParams(new URL(started.authUrl).hash.slice(1)).get('request');
    const page=await (await fetch(base)).text();
    assert.match(page,/id="proofs" hidden/);
    assert.match(page,/\/repo-template\/auth\/evidence/);
    assert.match(page,/Dépôt GitHub/);
    async function post(action:string,body:Record<string,unknown>){
      return fetch(base+'/'+action,{method:'POST',headers:{Origin:origin,Authorization:'Bearer fixture-token',
        'Content-Type':'application/json'},body:JSON.stringify({request,appId:CUG_APP_ID,...body})});
    }
    await post('verify',{});
    const chosen=await post('select',{accountId:account.login});
    const cookie=chosen.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
    const {formRef}=await chosen.json();
    const endpoint=base+'/evidence';
    assert.equal((await fetch(endpoint,{headers:{'X-CUG-Form':formRef}})).status,401);
    assert.equal((await fetch(endpoint,{headers:{Cookie:cookie,'X-CUG-Form':'wrong'}})).status,401);
    assert.equal((await fetch(endpoint,{headers:{Cookie:cookie,'X-CUG-Form':formRef,Origin:'https://other.example'}})).status,403);
    assert.equal((await fetch(endpoint,{method:'POST',headers:{Cookie:cookie,'X-CUG-Form':formRef}})).status,404);
    assert.equal(reads,0);
    const read=()=>fetch(endpoint,{headers:{Cookie:cookie,'X-CUG-Form':formRef}});
    const result=await read();assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');
    const proof=await result.json();
    assert.equal(proof.central.projectContinuityId,project);
    assert.equal(proof.repository.status,'OBSERVED');
    assert.equal(proof.local.authority,'GRT_LOCAL');
    assert.equal(proof.baseline.status,'BASELINE_ATTESTED');
    assert.equal(proof.documentation.status,'CLASSIFIED');
    assert.doesNotMatch(JSON.stringify(proof),/NEVER_RETURN_THIS|fixture-token|installationId/);
    assert.equal(reads,1);
    assert.equal((await read()).status,429);
    now+=5_000; evidence={...dto,architecture:{status:'NOT_ATTESTED'}};
    const partial=await (await read()).json();
    assert.equal(partial.baseline.status,'NOT_ATTESTED');
    assert.equal(partial.documentation.status,'CLASSIFIED');
    now+=5_000; evidence={status:'BLOCKED'};
    const blocked=await (await read()).json();
    assert.equal(blocked.status,'ATTENTION');
    assert.equal(blocked.repository.status,'NOT_CONFIRMED');
    assert.equal(blocked.documentation.status,'NOT_OBSERVED');
    now+=5_000;central=false;
    assert.equal((await (await read()).json()).status,'UNCONFIRMED');
    assert.equal(reads,3);
    now+=5_000; revoked=true;
    assert.equal((await read()).status,401);assert.equal(reads,3);assert.ok(probes>=5);
    enabled=false;
    assert.equal((await read()).status,404);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
