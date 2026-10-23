import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,rm,readFile,mkdir,writeFile,chmod,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
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

test('GRT review RED: invalid same-size archive hash is rejected, not NO_OP',async()=>{
 await withRoot(async root=>{
  const content=Buffer.from('hash-review-test');
  const sha=createHash('sha256').update(content).digest('hex');
  const download=async (input:{destination:string})=>{
   await writeFile(input.destination,content,{flag:'wx'});
   return {ok:true as const,sha256:sha,bytes:content.length};
  };
  assert.equal((await stageGovernPilot({root,approved:true,revision:GOUVERN_SHA},download)).status,'STAGED');
  const archive=join(root,'source-'+GOUVERN_SHA+'.tar.gz');
  await writeFile(archive,Buffer.from('H'+content.subarray(1).toString()));
  assert.equal(await readGovernPilot(root),null);
  assert.notEqual((await stageGovernPilot({root,approved:true,revision:GOUVERN_SHA},download)).status,'NO_OP');
 });
});
test('GRT review RED: precreated empty world-searchable directory is not trusted',async()=>{
 await withRoot(async root=>{
  await mkdir(root,{mode:0o755});
  await chmod(root,0o755);
  let called=0;
  const outcome=await stageGovernPilot({root,approved:true,revision:GOUVERN_SHA},async()=>{called++;return{ok:true as const,sha256:'a'.repeat(64),bytes:10}});
  assert.equal(outcome.status,'BLOCKED');
  assert.equal(called,0);
 });
});
test('GRT review RED: simultaneous staging never unlinks another attempt archive',async()=>{
 await withRoot(async root=>{
  const content=Buffer.from('atomic-stage-test');
  const sha=createHash('sha256').update(content).digest('hex');
  let release!:()=>void;
  const held=new Promise<void>(r=>{release=r});
  let entered!:()=>void;
  const started=new Promise<void>(r=>{entered=r});
  let calls=0;
  const download=async (input:{destination:string})=>{
   calls++;
   await writeFile(input.destination,content,{flag:'wx'});
   entered();
   await held;
   return{ok:true as const,sha256:sha,bytes:content.length};
  };
  const first=stageGovernPilot({root,approved:true,revision:GOUVERN_SHA},download);
  await started;
  const second=await stageGovernPilot({root,approved:true,revision:GOUVERN_SHA},download);
  release();
  const winner=await first;
  assert.equal(winner.status,'STAGED');
  assert.ok(second.status==='BLOCKED'||second.status==='NO_OP');
  assert.equal(calls,1);
  assert.equal((await readGovernPilot(root))?.sha256,sha);
 });
});
