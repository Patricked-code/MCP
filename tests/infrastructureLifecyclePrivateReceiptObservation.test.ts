import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { collectPrivateReceiptObservation,projectPrivateReceiptOutput } from '../src/infrastructureLifecycle/privateReceiptObservation.js';
const digest='a'.repeat(64),tar='b'.repeat(64),archive='c'.repeat(64);
const settings={stagePrefix:'/var/lib/test-stage-',planDigest:digest};
const bytes=(s:string)=>({size:Buffer.byteLength(s),sha256:createHash('sha256').update(s).digest('hex'),content:Buffer.from(s).toString('base64')});
const offsite=[
  'MISSION=PLESK-FREEBOX-BACKUP-20261120-01','CHECKPOINT=PRC-20261126-17A-docker','UTC=2026-01-15T10:00:00Z',
  'REMOTE_PATH=fixture/archive-'+archive.slice(0,16)+'.tar.gz.gpg','GPG_SHA256='+archive,'GPG_BYTES=100','TAR_SHA256='+tar,'TAR_BYTES=200',
  'FREEBOX_ARCHIVE_VERIFIEE','AUCUNE_ARCHIVE_SOURCE_SUPPRIMEE',''
].join('\n');
const restore=offsite+[
  'IMAGES_RESTAUREES_ET_IDENTIQUES=79','TAGS_RESTAURES_ET_IDENTIQUES=160','PLAN_SHA256='+digest,
  'IMAGES_TEST_S2_CONSERVEES','CONTENEURS_NON_LANCES','SUPPRESSION_S1_NON_EXECUTEE','PRC17A_DOCKER_ARCHIVE_RESTAUREE',''
].join('\n');
const base={'plan.json':{size:12,sha256:digest},'archive.tar.gz.gpg':{size:100,sha256:''},'remote-verified.txt':bytes(offsite)};
const project=(files:object,count=1)=>projectPrivateReceiptOutput(JSON.stringify({count,files}),settings,1);
test('private PRC17 observations distinguish absence, partial, offsite and pair without authority',()=>{
  const results=[project({},0),project({}),project(base),project({...base,'verified.txt':bytes(restore)})];
  assert.deepEqual(results.map(x=>x.status==='OBSERVED'?x.stage:x.status),['EMPTY','PARTIAL','OFFSITE_VERIFIED','RESTORE_VERIFIED']);
  for(const x of results){assert.equal(x.effectAuthorized,false);assert.equal(x.writesPerformed,false);
    if(x.status==='OBSERVED'){assert.equal(x.independentlyVerified,false);assert.equal(x.completionCertified,false);}}
  const pair=results[3]!;
  assert.ok(!JSON.stringify(pair).includes('fixture/'));assert.ok(!JSON.stringify(pair).includes(archive));
});
test('retention start wins and result alone is never certified',()=>{
  const marker={size:1,sha256:''};
  const x=project({...base,'verified.txt':bytes(restore),'retention-started':marker,'retention-result.txt':marker});
  assert.equal(x.status==='OBSERVED'?x.stage:x.status,'RETENTION_STARTED');
  const y=project({...base,'retention-result.txt':marker});
  assert.equal(y.status==='OBSERVED'?y.stage:y.status,'PARTIAL');
});
test('private receipt projection refuses mismatched plan, archive, bytes and unknown fields',()=>{
  for(const f of [
    {...base,'plan.json':{size:1,sha256:tar}},
    {...base,'archive.tar.gz.gpg':{size:101,sha256:''}},
    {...base,'verified.txt':bytes(restore.replace('TAR_BYTES=200','TAR_BYTES=201'))},
    {...base,'remote-verified.txt':{...bytes(offsite),sha256:tar}}
  ]){const x=project(f);assert.equal(x.status==='OBSERVED'?x.stage:x.status,'PARTIAL');}
  assert.equal(project({...base,other:{size:1,sha256:''}}).status,'UNVERIFIED');
  assert.equal(project(base,2).status,'UNVERIFIED');
});
test('remote observation is bounded to S2 and refuses invalid config or transport failure',async()=>{
  let calls=0;
  const read=async(host:string,command:string,timeout:number,max:number)=>{
    calls++;assert.equal(host,'s2');assert.match(command,/^python3 -I -c /);
    assert.equal(timeout,15000);assert.equal(max,60000);
    return {code:0,stdout:'{"count":0,"files":{}}',stderr:''};
  };
  assert.equal((await collectPrivateReceiptObservation(read,{...settings,stagePrefix:'/etc/'},()=>1)).status,'UNVERIFIED');
  assert.equal(calls,0);
  assert.equal((await collectPrivateReceiptObservation(read,settings,()=>1)).status,'OBSERVED');
  assert.equal(calls,1);
  assert.equal((await collectPrivateReceiptObservation(async()=>({code:1,stdout:'',stderr:'private'}),settings,()=>1)).status,'UNVERIFIED');
});
