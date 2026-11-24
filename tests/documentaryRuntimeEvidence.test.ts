import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp,writeFile,symlink,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readExistingDocumentaryStore,observeDocumentaryRuntimeAuthorities,compareRetainedAuthorityRelations } from '../src/deploy/documentaryRuntimeEvidence.js';
import { createEmptyTaskStoreDocument,createEmptySessionStoreDocument,createEmptyLockStoreDocument,TaskStoreDocumentSchema } from '../src/operationalMemory/types.js';
import type { GitRegistryProjectEvidence } from '../src/github/registry.js';
const sha='a'.repeat(40),jobId='mcp-s1-123-'+sha.slice(0,12);
const registry:GitRegistryProjectEvidence={available:true,sourceSchemaVersion:1,digest:'d'.repeat(64),candidateDigest:'e'.repeat(64),mappings:[],projects:[],activationReadiness:[]};
const readers={registry:async()=>registry,tasks:async()=>createEmptyTaskStoreDocument(),
  sessions:async()=>createEmptySessionStoreDocument(),locks:async()=>createEmptyLockStoreDocument()};
test('canonical store reader refuses missing, corrupt, and symlink stores instead of inventing empty records',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'mcp-doc-runtime-'));
  try {
    const p=join(dir,'queue.json');
    await assert.rejects(()=>readExistingDocumentaryStore(p,TaskStoreDocumentSchema));
    await writeFile(p,'{invalid');
    await assert.rejects(()=>readExistingDocumentaryStore(p,TaskStoreDocumentSchema));
    await writeFile(p,JSON.stringify(createEmptyTaskStoreDocument()));
    assert.deepEqual(await readExistingDocumentaryStore(p,TaskStoreDocumentSchema),createEmptyTaskStoreDocument());
    const link=join(dir,'link.json');await symlink(p,link);
    await assert.rejects(()=>readExistingDocumentaryStore(link,TaskStoreDocumentSchema));
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('stable retained authority observation has exact job/SHA, no raw records and no semantic certification',async()=>{
  const result=await observeDocumentaryRuntimeAuthorities({sha,jobId,stateVersion:5,readers});
  assert.equal(result.status,'OBSERVED');assert.equal(result.authorities.length,4);
  assert.equal(result.semanticCoverageComplete,false);assert.equal(result.mutationPerformed,false);
  assert.equal(result.jobId,jobId);assert.equal(result.sha,sha);
  assert.match(result.evidenceDigest,/^[a-f0-9]{64}$/);
  assert.ok(result.authorities.every(r=>r.status==='OBSERVED'));
  assert.doesNotMatch(JSON.stringify(result),/resumeSecretHash|ownerPrincipalId|rawRecords/);
  const missing=await observeDocumentaryRuntimeAuthorities({sha,jobId,stateVersion:5,readers:{...readers,tasks:async()=>{throw Error('missing');}}});
  assert.equal(missing.status,'UNVERIFIED');
  assert.equal(missing.authorities.find(r=>r.authority==='GOVERNED_TASK_QUEUE')?.status,'UNVERIFIED');
  let rev=0;
  const changing=await observeDocumentaryRuntimeAuthorities({sha,jobId,stateVersion:5,readers:{...readers,tasks:async()=>({...createEmptyTaskStoreDocument(),storeRevision:++rev})}});
  assert.equal(changing.status,'UNVERIFIED');
  await assert.rejects(()=>observeDocumentaryRuntimeAuthorities({sha,jobId:'mcp-s1-123-bad',stateVersion:5,readers}));
});
test('nonterminal task dependencies and lock owners are checked without rewriting historical references',()=>{
  const tasks=createEmptyTaskStoreDocument();
  tasks.tasks=[{taskId:'TASK-20261124-001',status:'READY',dependencies:['TASK-20261124-999'],ownerGovernedSessionId:null},
    {taskId:'TASK-20261124-002',status:'DONE',dependencies:['TASK-20261124-999'],ownerGovernedSessionId:'historical'}] as typeof tasks.tasks;
  const locks=createEmptyLockStoreDocument();
  locks.locks=[{lockId:'lock1',status:'ACTIVE',expiresAt:new Date(Date.now()+60000).toISOString(),governedSessionId:'absent'}] as typeof locks.locks;
  assert.deepEqual(compareRetainedAuthorityRelations({registry,tasks,sessions:createEmptySessionStoreDocument(),locks},Date.now()),[
    {code:'ACTIVE_LOCK_OWNER_UNRESOLVED',count:1},{code:'NONTERMINAL_TASK_DEPENDENCY_UNRESOLVED',count:1}]);
});
