import { createHash } from 'node:crypto';
import { constants, type Stats } from 'node:fs';
import { open, lstat } from 'node:fs/promises';
import type { z } from 'zod';
import { GITHUB_OIDC_POLICY } from './githubOidc.js';
import { canonicalJson } from '../currentState/toolCatalog.js';
import type { GitRegistryProjectEvidence } from '../github/registry.js';
import {loadProgramProjection,loadReadinessLibrary,type ProgramProjectionSnapshot,type ReadinessLibrary} from '../governance/programBlueprintMaterialization.js';
import {
  TaskStoreDocumentSchema, SessionStoreDocumentSchema, LockStoreDocumentSchema,
  type TaskStoreDocument, type SessionStoreDocument, type LockStoreDocument
} from '../operationalMemory/types.js';

const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const MAX_STORE_BYTES=16*1024*1024;
const MAX_OBSERVATION_MS=15000;
const TERMINAL=new Set(['DONE','CANCELLED','SUPERSEDED']);
const digest=(value:unknown)=>createHash('sha256').update(canonicalJson(value)).digest('hex');
const sameFile=(a:Stats,b:Stats)=>a.isFile()&&b.isFile()&&a.dev===b.dev&&a.ino===b.ino&&
  a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;

// Read the existing canonical stores with their own schemas. Unlike a
// service's empty-on-missing initialization, certification must never
// interpret a missing store as an empty, verified authority.
export async function readExistingDocumentaryStore<T>(path:string,schema:z.ZodType<T>):Promise<T> {
  const initial=await lstat(path);
  if(!initial.isFile()||initial.size<1||initial.size>MAX_STORE_BYTES)throw Error('AUTHORITY_STORE_NOT_BOUNDED_REGULAR_FILE');
  const fd=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try {
    const before=await fd.stat();
    if(!sameFile(initial,before))throw Error('AUTHORITY_STORE_CHANGED');
    const data=Buffer.alloc(before.size+1);
    let offset=0;
    while(offset<data.length) {
      const {bytesRead}=await fd.read(data,offset,data.length-offset,offset);
      if(!bytesRead)break;
      offset+=bytesRead;
    }
    const after=await fd.stat(), current=await lstat(path);
    if(offset!==before.size||!sameFile(before,after)||!sameFile(after,current))throw Error('AUTHORITY_STORE_CHANGED');
    return schema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data.subarray(0,offset))));
  } finally {await fd.close();}
}
type AuthorityName='GIT_REGISTRY_AND_PROJECT_BINDING'|'GOVERNED_TASK_QUEUE'|'GOVERNED_SESSIONS'|'GOVERNED_LOCKS';
type AuthorityRow=Readonly<{
  authority:AuthorityName; status:'OBSERVED'|'UNVERIFIED'; sourceVersion:number|null;
  recordCount:number|null; digest:string|null; coverage:'RETAINED_RECORDS'|'BOUNDED_REGISTRY_PROJECTION'|'UNVERIFIED';
}>;
// This is a bounded planning projection, not a certification of GWC/UAC
// or an admission into the runtime Task Queue. Preserve the four primary
// authority readers and their independent stability verdict.
type ProgramBacklogObservation=Readonly<{
  status:'OBSERVED'|'UNVERIFIED'; coverage:'PROGRAM_BACKLOG_ONLY'|'UNVERIFIED';
  sourceVersion:2|null; recordCount:number|null; digest:string|null;
  readinessStatus:'MATCHED'|'CONFLICT'|'UNVERIFIED'; readinessDriftCount:number|null;
}>;
const unverifiedProgram=():ProgramBacklogObservation=>({
  status:'UNVERIFIED',coverage:'UNVERIFIED',sourceVersion:null,recordCount:null,digest:null,
  readinessStatus:'UNVERIFIED',readinessDriftCount:null
});
const PLANNING_STATES=new Set(['DONE','READY','BLOCKED','DEFERRED','CONDITIONAL']);
export function projectProgramBacklogObservation(snapshot:ProgramProjectionSnapshot,library:ReadinessLibrary):ProgramBacklogObservation {
  const p=snapshot.projection as {schemaVersion?:unknown;repository?:unknown;
    authority?:{kind?:unknown;createsRuntimeTasks?:unknown;replacesTaskQueue?:unknown};
    executionModel?:{automaticRuntimeTaskCreation?:unknown;currentReadyBlueprintIds?:unknown};
    taskBlueprints?:Array<{id:string;readiness:{state:string};dependsOn:string[];materialization:{createsRuntimeTask:boolean;runtimeAuthority:string}}> }|null;
  if(p?.schemaVersion!==2||p.repository!==GITHUB_OIDC_POLICY.repository||!DIGEST.test(snapshot.digest)||
    p.authority?.kind!=='DERIVED_NON_EXECUTABLE_PROJECTION'||p.authority.createsRuntimeTasks!==false||
    p.authority.replacesTaskQueue!==false||p.executionModel?.automaticRuntimeTaskCreation!==false||
    !Array.isArray(p.taskBlueprints)||!p.taskBlueprints.length||p.taskBlueprints.length>10000||
    !Array.isArray(p.executionModel.currentReadyBlueprintIds))return unverifiedProgram();
  const records=p.taskBlueprints,ids=new Set(records.map(b=>b?.id));
  if(ids.size!==records.length||records.some(b=>typeof b?.id!=='string'||!b.id||b.id.length>160||
    !PLANNING_STATES.has(b.readiness?.state)||!Array.isArray(b.dependsOn)||
    b.dependsOn.some(d=>typeof d!=='string')||b.materialization?.createsRuntimeTask!==false||
    b.materialization.runtimeAuthority!=='Governed Task Queue'))return unverifiedProgram();
  const storedReady=p.executionModel.currentReadyBlueprintIds;
  if(storedReady.some(id=>typeof id!=='string')||new Set(storedReady).size!==storedReady.length)return unverifiedProgram();
  const derived=library.deriveProgramReadiness(snapshot.projection);
  if(!Array.isArray(derived.blueprints)||derived.blueprints.length!==records.length||
    !Array.isArray(derived.readyBlueprintIds)||new Set(derived.blueprints.map(b=>b.id)).size!==records.length||
    derived.blueprints.some(b=>!ids.has(b.id)||!PLANNING_STATES.has(b.currentState)||!PLANNING_STATES.has(b.derivedState))||
    derived.readyBlueprintIds.some(id=>!ids.has(id))||new Set(derived.readyBlueprintIds).size!==derived.readyBlueprintIds.length)
    return unverifiedProgram();
  const byId=new Map(records.map(b=>[b.id,b]));
  const drift=derived.blueprints.filter(b=>b.currentState!==byId.get(b.id)?.readiness.state||
    b.currentState!==b.derivedState||byId.get(b.id)?.dependsOn.some(d=>!ids.has(d))).length+
    (storedReady.length!==derived.readyBlueprintIds.length||storedReady.some((id,i)=>id!==derived.readyBlueprintIds[i])?1:0);
  return {status:'OBSERVED',coverage:'PROGRAM_BACKLOG_ONLY',sourceVersion:2,recordCount:records.length,
    digest:snapshot.digest,readinessStatus:drift?'CONFLICT':'MATCHED',readinessDriftCount:drift};
}
async function readProgramBacklogObservation():Promise<ProgramBacklogObservation> {
  return projectProgramBacklogObservation(await loadProgramProjection(),await loadReadinessLibrary());
}
type Snapshot={
  registry:GitRegistryProjectEvidence|null;
  tasks:TaskStoreDocument|null;
  sessions:SessionStoreDocument|null;
  locks:LockStoreDocument|null;
  programBacklog?:ProgramBacklogObservation|null;
};
export type RuntimeAuthorityReaders={
  registry:()=>Promise<GitRegistryProjectEvidence>;
  tasks:()=>Promise<TaskStoreDocument>;
  sessions:()=>Promise<SessionStoreDocument>;
  locks:()=>Promise<LockStoreDocument>;
  programBacklog?:()=>Promise<ProgramBacklogObservation>;
};
export type RuntimeAuthorityEvidence=Readonly<{
  schemaVersion:1; repository:typeof GITHUB_OIDC_POLICY.repository; sha:string; jobId:string; stateVersion:number;
  observedAt:string; status:'OBSERVED'|'UNVERIFIED'|'CONFLICT'; stableRead:boolean;
  authorities:readonly AuthorityRow[]; conflicts:readonly {code:string;count:number}[];
  coverage:'RETAINED_AUTHORITY_RECORDS_ONLY'; semanticCoverageComplete:false; mutationPerformed:false;
  programBacklog?:ProgramBacklogObservation;
  evidenceDigest:string;
}>;
function unknownRow(authority:AuthorityName):AuthorityRow {
  return {authority,status:'UNVERIFIED',sourceVersion:null,recordCount:null,digest:null,coverage:'UNVERIFIED'};
}
function rows(s:Snapshot):AuthorityRow[] {
  const r=s.registry;
  const registry:AuthorityRow=r?.available&&(r.sourceSchemaVersion===1||r.sourceSchemaVersion===2)&&r.digest&&DIGEST.test(r.digest)
    ? {authority:'GIT_REGISTRY_AND_PROJECT_BINDING',status:'OBSERVED',sourceVersion:r.sourceSchemaVersion,
      recordCount:r.mappings.length+r.projects.length,digest:digest({source:r.digest,candidate:r.candidateDigest,
        mappings:r.mappings,projects:r.projects,activationReadiness:r.activationReadiness}),coverage:'BOUNDED_REGISTRY_PROJECTION'}
    : unknownRow('GIT_REGISTRY_AND_PROJECT_BINDING');
  // Publish only counts, versions and digests. No raw records, credential
  // values, session secrets, principals, task summaries or transport IDs.
  const tasks=s.tasks?{authority:'GOVERNED_TASK_QUEUE' as const,status:'OBSERVED' as const,
    sourceVersion:s.tasks.storeRevision,recordCount:s.tasks.tasks.length,
    digest:digest(s.tasks),coverage:'RETAINED_RECORDS' as const}:unknownRow('GOVERNED_TASK_QUEUE');
  const sessions=s.sessions?{authority:'GOVERNED_SESSIONS' as const,status:'OBSERVED' as const,
    sourceVersion:s.sessions.storeRevision,recordCount:s.sessions.sessions.length,
    digest:digest({storeRevision:s.sessions.storeRevision,sessions:s.sessions.sessions.map(
      ({resumeSecretHash:_excluded,...record})=>record)}),coverage:'RETAINED_RECORDS' as const}:unknownRow('GOVERNED_SESSIONS');
  const locks=s.locks?{authority:'GOVERNED_LOCKS' as const,status:'OBSERVED' as const,
    sourceVersion:s.locks.storeRevision,recordCount:s.locks.locks.length,
    digest:digest(s.locks),coverage:'RETAINED_RECORDS' as const}:unknownRow('GOVERNED_LOCKS');
  return [registry,tasks,sessions,locks];
}

export function compareRetainedAuthorityRelations(s:Snapshot,now:number) {
  const conflicts=new Map<string,number>();
  const note=(code:string)=>conflicts.set(code,(conflicts.get(code)??0)+1);
  const tasks=s.tasks?.tasks, sessions=s.sessions?.sessions, locks=s.locks?.locks;
  const taskIds=new Set<string>(), sessionIds=new Set<string>(),lockIds=new Set<string>();
  for(const t of tasks??[]) {if(taskIds.has(t.taskId))note('DUPLICATE_TASK_ID');taskIds.add(t.taskId);}
  for(const t of sessions??[]) {if(sessionIds.has(t.governedSessionId))note('DUPLICATE_SESSION_ID');sessionIds.add(t.governedSessionId);}
  for(const t of locks??[]) {if(lockIds.has(t.lockId))note('DUPLICATE_LOCK_ID');lockIds.add(t.lockId);}
  const bySession=new Map((sessions??[]).map(t=>[t.governedSessionId,t]));
  const byLock=new Map((locks??[]).map(t=>[t.lockId,t]));
  for(const t of tasks??[]) {
    // Historical terminal references are not rewritten to point at current
    // records: operational retention may legitimately evict old records.
    if(TERMINAL.has(t.status))continue;
    for(const dep of t.dependencies)if(!taskIds.has(dep))note('NONTERMINAL_TASK_DEPENDENCY_UNRESOLVED');
    if(t.ownerGovernedSessionId&&sessions) {
      const owner=bySession.get(t.ownerGovernedSessionId);
      if(!owner||['CLOSED','EXPIRED'].includes(owner.status))note('NONTERMINAL_TASK_OWNER_UNRESOLVED');
    }
    if(t.targetScope&&s.registry?.available) {
      const scope=t.targetScope;
      const project=s.registry.projects.filter(p=>p.projectId===scope.projectId);
      if(project.length!==1||(scope.projectUid!==null&&project[0]?.projectUid!==scope.projectUid))note('TASK_PROJECT_BINDING_UNRESOLVED');
      for(const component of scope.components) {
        const matching=s.registry.mappings.filter(m=>m.mappingId===component.mappingId&&
          m.repositoryId.toLowerCase()===component.repositoryId.toLowerCase()&&m.projectId===scope.projectId);
        if(matching.length!==1)note('TASK_COMPONENT_MAPPING_UNRESOLVED');
      }
    }
  }
  if(sessions&&locks) {
    for(const l of locks) {
      if(l.status!=='ACTIVE'||Date.parse(l.expiresAt)<=now)continue;
      const owner=bySession.get(l.governedSessionId);
      if(!owner||['CLOSED','EXPIRED'].includes(owner.status))note('ACTIVE_LOCK_OWNER_UNRESOLVED');
      else if(!owner.lockIds.includes(l.lockId))note('ACTIVE_LOCK_BACK_REFERENCE_MISSING');
    }
    for(const session of sessions) {
      if(['CLOSED','EXPIRED'].includes(session.status))continue;
      for(const id of session.lockIds) {
        const lock=byLock.get(id);
        if(!lock||lock.governedSessionId!==session.governedSessionId)note('SESSION_LOCK_REFERENCE_UNRESOLVED');
      }
    }
  }
  return [...conflicts].sort(([a],[b])=>a.localeCompare(b)).map(([code,count])=>({code,count}));
}
async function readSnapshot(readers:RuntimeAuthorityReaders):Promise<Snapshot> {
  const safe=<T>(fn:()=>Promise<T>)=>Promise.resolve().then(fn).catch(()=>null);
  const [registry,tasks,sessions,locks,programBacklog]=await Promise.all([
    safe(readers.registry),safe(readers.tasks),safe(readers.sessions),safe(readers.locks),
    readers.programBacklog?safe(readers.programBacklog):Promise.resolve(null)
  ]);
  return {registry,tasks,sessions,locks,programBacklog};
}
async function defaultReaders():Promise<RuntimeAuthorityReaders> {
  const [{operationalMemoryConfig:config},{readGitRegistryProjectEvidence}]=await Promise.all([
    import('../operationalMemory/config.js'),import('../github/registry.js')
  ]);
  const read=<T>(path:string,schema:z.ZodType<T>)=>config.enabled
    ? readExistingDocumentaryStore(path,schema):Promise.reject(Error('OPERATIONAL_MEMORY_DISABLED'));
  return {registry:readGitRegistryProjectEvidence,
    tasks:()=>read(config.taskStorePath,TaskStoreDocumentSchema),
    sessions:()=>read(config.sessionStorePath,SessionStoreDocumentSchema),
    locks:()=>read(config.lockStorePath,LockStoreDocumentSchema),programBacklog:readProgramBacklogObservation};
}
export async function observeDocumentaryRuntimeAuthorities(input:{
  sha:string;jobId:string;stateVersion:number;readers?:RuntimeAuthorityReaders;now?:()=>number
}):Promise<RuntimeAuthorityEvidence> {
  if(!SHA.test(input.sha)||!new RegExp('^mcp-s1-[0-9]{1,30}-'+input.sha.slice(0,12)+'$').test(input.jobId)||
    !Number.isSafeInteger(input.stateVersion)||input.stateVersion<1)throw Error('RUNTIME_AUTHORITY_BINDING_INVALID');
  const now=input.now??Date.now, start=now(), readers=input.readers??await defaultReaders();
  const first=await readSnapshot(readers), second=await readSnapshot(readers);
  const firstRows=rows(first), secondRows=rows(second);
  const end=now();
  const stableRead=end>=start&&end-start<=MAX_OBSERVATION_MS&&firstRows.every((r,i)=>
    r.status==='OBSERVED'&&secondRows[i]?.status==='OBSERVED'&&r.digest===secondRows[i]?.digest&&
    r.sourceVersion===secondRows[i]?.sourceVersion);
  const authorities=secondRows.map((r,i)=>firstRows[i]?.status==='OBSERVED'&&
    r.status==='OBSERVED'&&r.digest===firstRows[i]?.digest&&r.sourceVersion===firstRows[i]?.sourceVersion&&
    end>=start&&end-start<=MAX_OBSERVATION_MS?r:unknownRow(r.authority));
  const conflicts=stableRead?compareRetainedAuthorityRelations(second,end):[];
  const programBacklog=first.programBacklog?.status==='OBSERVED'&&second.programBacklog?.status==='OBSERVED'&&
    end>=start&&end-start<=MAX_OBSERVATION_MS&&digest(first.programBacklog)===digest(second.programBacklog)
    ?second.programBacklog:unverifiedProgram();
  const projection={
    schemaVersion:1 as const,repository:GITHUB_OIDC_POLICY.repository,sha:input.sha,jobId:input.jobId,stateVersion:input.stateVersion,
    observedAt:new Date(end).toISOString(),status:!stableRead?'UNVERIFIED' as const:conflicts.length?'CONFLICT' as const:'OBSERVED' as const,
    stableRead,authorities,conflicts,coverage:'RETAINED_AUTHORITY_RECORDS_ONLY' as const,
    semanticCoverageComplete:false as const,mutationPerformed:false as const,
    ...(readers.programBacklog?{programBacklog}:{})
  };
  return {...projection,evidenceDigest:digest(projection)};
}
