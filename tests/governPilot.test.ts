import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {stageGovernPilot,readGovernPilot,GOUVERN_SHA,GOUVERN_SOURCE} from '../src/provisioning/governPilot.js';

async function withRoot(fn:(root:string)=>Promise<void>){
 const base=await mkdtemp(join(tmpdir(),'mcp-govern-pilot-'));
 try{await fn(join(base,'gouvern'))}finally{await rm(base,{recursive:true,force:true})}
}
test('GRT RED: no S1 folder is created without consent',async()=>{
 await withRoot(async root=>{
  let calls=0;
  const x=await stageGovernPilot({root,approved:false,revision:GOUVERN_SHA},async()=>{calls++;return {ok:true,sha256:'a'.repeat(64),bytes:16}});
  assert.equal(x.status,'BLOCKED');assert.equal(calls,0);
  await assert.rejects(readdir(root),{code:'ENOENT'});
 });
});
test('GRT RED: exact authorized SHA is copied once into a private archive directory',async()=>{
 await withRoot(async root=>{
  const files:string[]=[];
  const downloaded=async (input:{repositoryId:string;revision:string;destination:string;maxBytes:number})=>{
   files.push(input.destination);assert.equal(input.repositoryId,'github:'+GOUVERN_SOURCE);
   assert.equal(input.revision,GOUVERN_SHA);assert.ok(input.maxBytes<=50_000_000);
   const {writeFile}=await import('node:fs/promises');
   await writeFile(input.destination,Buffer.from('fake-test-archive'));
   return {ok:true as const,sha256:'a'.repeat(64),bytes:17};
  };
  const x=await stageGovernPilot({root,approved:true,revision:GOUVERN_SHA},downloaded);
  assert.equal(x.status,'STAGED');assert.equal(files.length,1);
  assert.deepEqual(await readGovernPilot(root),{revision:GOUVERN_SHA,sha256:'a'.repeat(64),bytes:17});
  const folder=await readdir(root);assert.ok(folder.includes('source-'+GOUVERN_SHA+'.tar.gz'));
  assert.ok(!folder.includes('AGENTS.md'));assert.ok(!folder.includes('secrets'));
  assert.equal((await stageGovernPilot({root,approved:true,revision:GOUVERN_SHA},downloaded)).status,'NO_OP');
  assert.equal(files.length,1);
 });
});
test('GRT RED: reject wrong SHA before writing anything',async()=>{
 await withRoot(async root=>{
  let calls=0;
  const x=await stageGovernPilot({root,approved:true,revision:'f'.repeat(40)},async()=>{calls++;return {ok:true,sha256:'a'.repeat(64),bytes:3}});
  assert.equal(x.status,'BLOCKED');assert.equal(calls,0);
  await assert.rejects(readdir(root),{code:'ENOENT'});
 });
});
test('GRT RED: failed GitHub transfer is not a successful deployment',async()=>{
 await withRoot(async root=>{
  const x=await stageGovernPilot({root,approved:true,revision:GOUVERN_SHA},async()=>({ok:false,reasonCode:'ARCHIVE_UNAVAILABLE'}));
  assert.equal(x.status,'FAILED');
  assert.equal(await readGovernPilot(root),null);
 });
});
