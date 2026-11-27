import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { verifyMaintenanceScriptRevision } from '../src/infrastructureLifecycle/scriptRevision.js';
import type { GithubRead } from '../src/provisioning/revisionAdmission.js';
const revision='a'.repeat(40), sourcePath='scripts/fixture-maintenance.sh';
const bytes=Buffer.from('#!/bin/bash\nexit 0\n');
const digest=createHash('sha256').update(bytes).digest('hex');
const candidate={revision,sourcePath,sha256:digest};
const check={name:'validate',head_sha:revision,status:'completed',conclusion:'success'};
const file={type:'file',path:sourcePath,encoding:'base64',size:bytes.length,
  content:bytes.toString('base64'),
  sha:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')};
function reader(options:{checks?:unknown[];file?:unknown;branch?:string;comparison?:string;status?:string;tree?:unknown}={}):GithubRead {
  return async endpoint=>{
    const ok=(json:unknown)=>({ok:true,status:200,json});
    if(endpoint.includes('/branches/'))return ok({commit:{sha:options.branch??revision}});
    if(endpoint.includes('/compare/'))return ok({status:options.comparison??'diverged'});
    if(endpoint.includes('/check-runs?'))return ok({total_count:(options.checks??[check]).length,check_runs:options.checks??[check]});
    if(endpoint.endsWith('/status'))return ok({state:options.status??'pending',total_count:options.status?1:0});
    if(endpoint.includes('/git/trees/'))return ok(options.tree??{truncated:false,
      tree:[{path:sourcePath,type:'blob',mode:'100755',sha:file.sha}]});
    if(endpoint.includes('/contents/')){assert.ok(endpoint.endsWith('?ref='+revision));return ok(options.file??file);}
    throw Error('unexpected endpoint');
  };
}
test('AILM script source exact revision and bytes verified without effect authorization',async()=>{
  const result=await verifyMaintenanceScriptRevision(candidate,reader());
  assert.deepEqual(result,{status:'SOURCE_VERIFIED',revision,sourcePath,sha256:digest,bytes:bytes.length,effectAuthorized:false});
});
test('AILM script candidate rejects traversal and invalid digests before GitHub access',async()=>{
  for(const path of ['scripts/../fixture.sh','scripts//fixture.sh','/scripts/a.sh','scripts/a.sh?ref=main','other/a.sh','scripts/a.py']){
    let calls=0;
    const result=await verifyMaintenanceScriptRevision({...candidate,sourcePath:path},async()=>{calls++;throw Error('unexpected');});
    assert.equal(result.status,'UNVERIFIED');assert.equal(calls,0);
  }
  assert.equal((await verifyMaintenanceScriptRevision({...candidate,sha256:'bad'},reader())).status,'UNVERIFIED');
});
test('AILM script source cannot use non-main revision or manual-consent fallback',async()=>{
  for(const options of [{branch:'b'.repeat(40),comparison:'diverged'}, {checks:[]}])
    assert.equal((await verifyMaintenanceScriptRevision(candidate,reader(options))).status,'UNVERIFIED');
});
test('AILM script source requires exact successful validate check',async()=>{
  for(const checks of [[{...check,conclusion:'skipped'}],[{...check,status:'in_progress'}],
    [{...check,head_sha:'b'.repeat(40)}],[{...check,name:'other'}],[check,check]])
    assert.equal((await verifyMaintenanceScriptRevision(candidate,reader({checks}))).status,'UNVERIFIED');
});
test('AILM script source rejects substituted bytes, blob hash, size, path and links',async()=>{
  for(const changed of [{...file,content:Buffer.from('x').toString('base64')},
    {...file,sha:'b'.repeat(40)},{...file,size:999999},{...file,path:'scripts/other.sh'},
    {...file,target:'other.sh'},{...file,content:file.content+'!'}])
    assert.equal((await verifyMaintenanceScriptRevision(candidate,reader({file:changed}))).status,'UNVERIFIED');
  assert.equal((await verifyMaintenanceScriptRevision({...candidate,sha256:'b'.repeat(64)},reader())).status,'UNVERIFIED');
});
test('AILM script source fails closed on unavailable transport',async()=>{
  assert.equal((await verifyMaintenanceScriptRevision(candidate,async()=>{throw Error('offline');})).status,'UNVERIFIED');
});

test('AILM script source rejects symlink, truncated tree and mismatched tree blob',async()=>{
  for(const tree of [
    {truncated:false,tree:[{path:sourcePath,type:'blob',mode:'120000',sha:file.sha}]},
    {truncated:true,tree:[]},
    {truncated:false,tree:[{path:sourcePath,type:'blob',mode:'100755',sha:'b'.repeat(40)}]},
    {truncated:false,tree:[]}
  ]) assert.equal((await verifyMaintenanceScriptRevision(candidate,reader({tree}))).status,'UNVERIFIED');
});
