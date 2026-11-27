import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {mkdtemp,access,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkBashSyntax,collectScriptValidation} from '../src/infrastructureLifecycle/scriptValidation.js';
import type {GithubRead} from '../src/provisioning/revisionAdmission.js';
const revision='a'.repeat(40),sourcePath='scripts/fixture-maintenance.sh',body=Buffer.from('#!/bin/bash\nexit 0\n');
const sha256=createHash('sha256').update(body).digest('hex');
const candidate={revision,sourcePath,sha256};
const config=JSON.stringify({PRC17A:candidate,PRC17B:candidate});
const blob=createHash('sha1').update('blob '+body.length+'\0').update(body).digest('hex');
const read:GithubRead=async endpoint=>{
  const ok=(json:unknown)=>({ok:true,status:200,json});
  if(endpoint.includes('/branches/'))return ok({commit:{sha:revision}});
  if(endpoint.includes('/check-runs?'))return ok({total_count:1,check_runs:[{name:'validate',head_sha:revision,status:'completed',conclusion:'success'}]});
  if(endpoint.endsWith('/status'))return ok({state:'pending',total_count:0});
  if(endpoint.includes('/git/trees/'))return ok({truncated:false,tree:[{path:sourcePath,type:'blob',mode:'100755',sha:blob}]});
  if(endpoint.includes('/contents/'))return ok({type:'file',path:sourcePath,encoding:'base64',size:body.length,content:body.toString('base64'),sha:blob});
  throw Error('unexpected');
};
test('real Bash syntax parser refuses malformed input and never executes a valid script',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'ailm-syntax-'));
  try{
    const marker=join(directory,'must-not-exist');
    assert.equal(await checkBashSyntax(Buffer.from('printf test > "'+marker+'"\n')),true);
    await assert.rejects(access(marker));
    assert.equal(await checkBashSyntax(Buffer.from('if true; then\n')),false);
    assert.equal(await checkBashSyntax(Buffer.from([0])),false);
    assert.equal(await checkBashSyntax(Buffer.alloc(256*1024+1,65)),false);
  }finally{await rm(directory,{recursive:true,force:true});}
});
test('exact source is checked before real syntax, no source path or permission returned',async()=>{
  let calls=0;
  const r=await collectScriptValidation(config,read,async bytes=>{calls++;assert.ok(bytes.equals(body));return checkBashSyntax(bytes);});
  assert.equal(calls,2);assert.equal(r.status,'OBSERVED');assert.ok(r.items.every(x=>x.status==='SOURCE_AND_SYNTAX_VERIFIED'));
  assert.equal(r.installationAuthorized,false);assert.equal(r.executionAuthorized,false);
  assert.ok(!JSON.stringify(r).includes(sourcePath));assert.ok(!JSON.stringify(r).includes(sha256));
});
test('missing config, digest drift and syntax failure never authorize execution',async()=>{
  let calls=0;
  const syntax=async()=>{calls++;return false;};
  for(const raw of ['', '{}',JSON.stringify({PRC17A:{...candidate,sourcePath:'scripts/../x.sh'},PRC17B:candidate})]){
    const x=await collectScriptValidation(raw,async()=>{throw Error('must not fetch');},syntax);assert.equal(x.status,'UNVERIFIED');
  }
  assert.equal(calls,0);
  const x=await collectScriptValidation(JSON.stringify({PRC17A:{...candidate,sha256:'b'.repeat(64)},PRC17B:candidate}),read,syntax);
  assert.equal(calls,1);assert.ok(x.items.every(x=>x.status==='UNVERIFIED'));assert.equal(x.effectAuthorized,false);
});
