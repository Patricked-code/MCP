import assert from 'node:assert/strict';
import test from 'node:test';
import { probeDelegatedGithubRepositoryPermissions } from '../src/github/delegatedRepositoryPermissions.js';

test('RED: actual GitHub repository API permissions distinguish read/push/admin',async()=>{
  const urls:string[]=[];
  const p=await probeDelegatedGithubRepositoryPermissions('chainsolutions-wealthtech/Regulatory',
    async path=>{urls.push(path);return{ok:true,status:200,json:{
      full_name:'chainsolutions-wealthtech/Regulatory',
      permissions:{pull:true,push:true,admin:false}
    }}});
  assert.deepEqual(urls,['/repos/chainsolutions-wealthtech/Regulatory']);
  assert.equal(p.status,'VERIFIED_REPOSITORY_PERMISSIONS');
  assert.equal(p.readObserved,true);
  assert.equal(p.writeObserved,true);
  assert.equal(p.adminObserved,false);
  assert.equal(p.runtimeWriteAuthorized,false);
});

test('RED: provider admin=true is evidence only, never runtime admission',async()=>{
  const p=await probeDelegatedGithubRepositoryPermissions('Patricked-code/MCP',
    async()=>({ok:true,status:200,json:{full_name:'Patricked-code/MCP',
      permissions:{pull:true,push:true,admin:true}}}));
  assert.equal(p.adminObserved,true);
  assert.equal(p.runtimeWriteAuthorized,false);
  assert.equal(p.tokenExposed,false);
});

test('RED: permission hints absent, target mismatch, API failure or malformed repo do not grant any rights',async()=>{
  const cases=[
    {ok:true,status:200,json:{full_name:'chainsolutions-wealthtech/Regulatory'}},
    {ok:true,status:200,json:{full_name:'other/repo',permissions:{admin:true}}},
    {ok:false,status:403,json:null}
  ];
  for(const c of cases){
    const p=await probeDelegatedGithubRepositoryPermissions('chainsolutions-wealthtech/Regulatory',
      async()=>c);
    assert.equal(p.status,'BLOCKED');
    assert.equal(p.adminObserved,false);
    assert.equal(p.writeObserved,false);
  }
  await assert.rejects(()=>probeDelegatedGithubRepositoryPermissions('org/../escape',
    async()=>{throw Error('must-not-call')}),/GITHUB_PERMISSION_TARGET_INVALID/);
});

test('RED: network errors are sanitized and do not leak token or claim owner privileges',async()=>{
  const p=await probeDelegatedGithubRepositoryPermissions('Patricked-code/MCP',
    async()=>{throw Error('SECRET_TOKEN_MUST_NEVER_LEAK')});
  assert.equal(p.status,'BLOCKED');
  assert.doesNotMatch(JSON.stringify(p),/SECRET_/);
});
