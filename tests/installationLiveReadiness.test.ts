import assert from 'node:assert/strict';
import test from 'node:test';
import {generateKeyPairSync} from 'node:crypto';
import {
  probeGithubAppReadOnlyRepository
} from '../src/github/installationLiveReadiness.js';

const repository='chainsolutions-wealthtech/Regulatory';
const installation={
  appId:'5417646',installationId:173915815,accountLogin:'chainsolutions-wealthtech'
};
const at=new Date('2026-10-30T07:00:00.000Z');
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const pem=privateKey.export({type:'pkcs8',format:'pem'}).toString();

type StubMode='OK'|'OTHER_REPO'|'BROAD_TOKEN'|'MISSING_REPO_PERMISSION'
  |'MISMATCH_REPO'|'HTTP_DENIED'|'TOKEN_DENIED';
const makeDeps=(mode:StubMode,calls:string[])=>({
  readPrivateKey:async()=>pem,
  now:()=>at,
  fetchImpl:(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input);
    calls.push((init?.method||'GET')+' '+url);
    if(url.includes('/access_tokens')){
      if(mode==='TOKEN_DENIED')return new Response('{}',{status:403});
      const body=init?.body?JSON.parse(String(init.body)) as Record<string,unknown>:{};
      assert.deepEqual(body.repositories,['Regulatory']);
      assert.deepEqual(body.permissions,{contents:'read'});
      return new Response(JSON.stringify({
        token:'TEST_SECRET_READ_TOKEN',
        expires_at:'2026-10-30T07:45:00.000Z'
      }),{status:201});
    }
    assert.equal(init?.method,'GET');
    assert.equal((init?.headers as Record<string,string>).Authorization,
      'Bearer TEST_SECRET_READ_TOKEN');
    if(mode==='HTTP_DENIED')return new Response('{}',{status:403});
    if(url.includes('/installation/repositories')){
      const selected=mode==='OTHER_REPO'?'chainsolutions-wealthtech/Other':repository;
      return new Response(JSON.stringify({
        total_count:mode==='BROAD_TOKEN'?2:1,
        repositories:[{full_name:selected}]
      }),{status:200});
    }
    if(url.includes('/repos/')){
      return new Response(JSON.stringify({
        full_name:mode==='MISMATCH_REPO'?'chainsolutions-wealthtech/Other':repository,
        permissions:{pull:mode!=='MISSING_REPO_PERMISSION',push:false,admin:false}
      }),{status:200});
    }
    throw new Error('UNEXPECTED_ENDPOINT');
  }) as typeof fetch
});

test('GD-U-E2: existing App credential makes scoped provider GETs and never grants writes',async()=>{
  const calls:string[]=[];
  const result=await probeGithubAppReadOnlyRepository(
    {installation,repository},makeDeps('OK',calls));
  assert.equal(result.status,'PERMISSION_OBSERVED');
  assert.equal(result.reason,'VERIFIED_READ_ONLY');
  assert.equal(result.assessment?.status,'PERMISSION_OBSERVED');
  assert.equal(result.assessment?.runtimeWriteAuthorized,false);
  assert.equal(result.adminPermissionAttested,false);
  assert.equal(result.tokenExposed,false);
  assert.equal(result.mutationExecuted,false);
  assert.deepEqual(calls.map(x=>x.split(' ')[0]),['POST','GET','GET']);
  assert.ok(calls[1]?.includes('/installation/repositories'));
  assert.ok(calls[2]?.includes('/repos/chainsolutions-wealthtech/Regulatory'));
  assert.doesNotMatch(JSON.stringify(result),/TEST_SECRET_READ_TOKEN/);
});

test('GD-U-E2: selected-repo mismatch and broad token fail closed',async()=>{
  for(const mode of ['OTHER_REPO','BROAD_TOKEN'] as const){
    const result=await probeGithubAppReadOnlyRepository(
      {installation,repository},makeDeps(mode,[]));
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.reason,'REPOSITORY_SCOPE_MISMATCH');
    assert.equal(result.runtimeWriteAuthorized,false);
  }
});

test('GD-U-E2: missing repo read permission and wrong repo response fail closed',async()=>{
  for(const mode of ['MISSING_REPO_PERMISSION','MISMATCH_REPO'] as const){
    const result=await probeGithubAppReadOnlyRepository(
      {installation,repository},makeDeps(mode,[]));
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.reason,'REPOSITORY_READ_NOT_ATTESTED');
  }
});

test('GD-U-E2: missing credential or denied API prevents permission attestation',async()=>{
  for(const mode of ['HTTP_DENIED','TOKEN_DENIED'] as const){
    const result=await probeGithubAppReadOnlyRepository(
      {installation,repository},makeDeps(mode,[]));
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.adminPermissionAttested,false);
    assert.equal(result.runtimeWriteAuthorized,false);
  }
});

test('GD-U-E2: account crossover and invalid target are rejected without a provider call',async()=>{
  for(const target of ['Patricked-code/MCP','../Regulatory',
    'chainsolutions-wealthtech/../Regulatory']){
    const calls:string[]=[];
    const result=await probeGithubAppReadOnlyRepository(
      {installation,repository:target},makeDeps('OK',calls));
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.reason,'INVALID_TARGET_OR_CREDENTIAL');
    assert.deepEqual(calls,[]);
  }
});

test('GD-U-E2: providers cannot leak secrets or raw errors into readiness',async()=>{
  const result=await probeGithubAppReadOnlyRepository({installation,repository},{
    readPrivateKey:async()=>{throw new Error('SECRET_PRIVATE_KEY');},
    now:()=>at,
    fetchImpl:(async()=>{throw new Error('SHOULD_NOT_CALL');}) as typeof fetch
  });
  assert.equal(result.status,'BLOCKED');
  assert.doesNotMatch(JSON.stringify(result),/SECRET_|SHOULD_NOT_CALL/);
});
