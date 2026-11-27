import { observeMcpCapacity, sameObservedFilesystem, type Host, type CapacityObservation } from './capacityProbe.js';
import { observeDockerReferences, type DockerReferenceObservation } from './dockerInventory.js';
import { observeBackupAutomation, type BackupAutomationObservation } from './backupAutomation.js';
import { observePrivateReceipts, type PrivateReceiptObservation } from './privateReceiptObservation.js';
import { observeFreeboxCapacity, type FreeboxCapacityObservation } from './freeboxCapacity.js';
import { DockerBackupBounds } from './maintenancePlan.js';

export const AILM_TOOL = 'mcp_infrastructure_lifecycle';
export const AILM_SCOPES = ['s1','s2','freebox','all'] as const;
export type AilmScope = typeof AILM_SCOPES[number];
export const AILM_OPERATIONS = ['status','audit','plan'] as const;
export type AilmOperation = typeof AILM_OPERATIONS[number];
type CleanupReader = (host:Host)=>Promise<unknown>;
type CapacityReader = typeof observeMcpCapacity;
export function isAilmScope(x:unknown):x is AilmScope {
  return typeof x==='string' && (AILM_SCOPES as readonly string[]).includes(x);
}
export function isAilmOperation(x:unknown):x is AilmOperation {
  return typeof x==='string' && (AILM_OPERATIONS as readonly string[]).includes(x);
}
const unavailable = [
  'TRUSTED_PRIVATE_RECEIPT_ADAPTER_REQUIRED',
  'FREEBOX_LIVE_CAPACITY_ADAPTER_REQUIRED',
  'SCRIPT_MANIFEST_AND_MACHINE_IDENTITY_REQUIRED',
  'GOVERNED_EFFECT_EXECUTOR_REQUIRED'
] as const;
export function createInfrastructureLifecycleService(
  capacity:CapacityReader, cleanup:CleanupReader, now:()=>number=Date.now, docker?: (host:Host)=>Promise<DockerReferenceObservation>, backupAutomation?:()=>Promise<BackupAutomationObservation>, privateReceipts?:()=>Promise<PrivateReceiptObservation>, freeboxCapacity?:()=>Promise<FreeboxCapacityObservation>
) {
  // A single active read cycle per server. No queued or overlapping SSH scans.
  const active=new Set<Host>();
  let freeboxActive=false;
  async function observe(host:Host, operation:AilmOperation) {
    if(active.has(host)) return {host,status:'BUSY' as const,measurements:[],aliases:[],cleanup:null,dockerReferences:null,privateReceipts:null};
    active.add(host);
    try {
      const measurements:CapacityObservation[]=[];
      for(const [target,kind] of [
        ['ROOT','BYTES'],['ROOT','INODES'],['DOCKER_STORAGE','BYTES'],['RELAY_STORAGE','BYTES']
      ] as const) {
        try { measurements.push(await capacity(host,target,kind)); }
        catch { measurements.push({host,target,kind,status:'UNVERIFIED',reason:'PROBE_UNAVAILABLE',writesPerformed:false}); }
      }
      const aliases:{target:string;sameAs:string}[]=[];
      for(let i=0;i<measurements.length;i++){
        const current=measurements[i]!;
        const previous=measurements.slice(0,i).find(x=>sameObservedFilesystem(x,current));
        if(previous) aliases.push({target:current.target,sameAs:previous.target});
      }
      let dockerReferences:DockerReferenceObservation|null=null;
      if(docker) {
        try {dockerReferences=await docker(host);} catch {dockerReferences={status:'UNVERIFIED',reason:'DOCKER_INVENTORY_UNAVAILABLE',writesPerformed:false};}
      }
      let receipts:PrivateReceiptObservation|null=null;
      if(host==='s2'&&privateReceipts){
        try{receipts=await privateReceipts();}catch{receipts={status:'UNVERIFIED',reason:'PRIVATE_EVIDENCE_PROBE_UNAVAILABLE',effectAuthorized:false,writesPerformed:false};}
      }
      let review:unknown=null;
      if(operation==='plan') {
        try { review=await cleanup(host); } catch { review={status:'UNVERIFIED',reasonCode:'CLEANUP_OBSERVATION_UNAVAILABLE'}; }
      }
      return {host,status:measurements.every(x=>x.status==='OBSERVED')?'OBSERVED' as const:'PARTIAL' as const,
        measurements,aliases,cleanup:review,dockerReferences,privateReceipts:receipts};
    } finally {active.delete(host);}
  }
  return async function run(scope:unknown,operation:unknown) {
    if(!isAilmScope(scope)||!isAilmOperation(operation)) throw Error('AILM_INVALID_REQUEST');
    const hosts:Host[]=scope==='all'?['s1','s2']:scope==='freebox'?[]:[scope];
    const observations=operation==='status'?[]:await Promise.all(hosts.map(host=>observe(host,operation)));
    let existingBackupAutomation:BackupAutomationObservation|null=null;
    if(operation!=='status'&&(scope==='s2'||scope==='all')&&backupAutomation){
      try{existingBackupAutomation=await backupAutomation();}catch{existingBackupAutomation={status:'UNVERIFIED',reason:'TIMER_PROBE_UNAVAILABLE',writesPerformed:false};}
    }
    let freebox:FreeboxCapacityObservation={status:'UNVERIFIED',reason:'DESTINATION_CAPACITY_ADAPTER_REQUIRED',writesPerformed:false};
    if(operation!=='status'&&(scope==='all'||scope==='freebox')&&freeboxCapacity){
      if(freeboxActive)freebox={status:'UNVERIFIED',reason:'FREEBOX_OBSERVATION_BUSY',writesPerformed:false};
      else{
        freeboxActive=true;
        try{freebox=await freeboxCapacity();}catch{freebox={status:'UNVERIFIED',reason:'FREEBOX_API_UNAVAILABLE_OR_NOT_ADMITTED',writesPerformed:false};}
        finally{freeboxActive=false;}
      }
    }
    return {
      schemaVersion:1,scope,operation,observedAt:new Date(now()).toISOString(),
      status:operation==='status'?'CAPABILITY_STATUS':'PARTIAL_READ_ONLY',
      writesPerformed:false,effectAuthorized:false,automaticExecutionAuthorized:false,
      observations,existingBackupAutomation,freebox,
      prc17:{nextStep:'WAIT',reasons:unavailable,bounds:DockerBackupBounds},
      capabilities:{capacity:'CALLABLE',cleanupPlan:'CALLABLE_READ_ONLY',receiptVerification:'PRIVATE_STRUCTURE_READER_CONFIG_REQUIRED',
        scriptRevision:'MODULE_DEPLOYED_ADAPTER_REQUIRED',maintenancePlanner:'MODULE_DEPLOYED_TRUSTED_OBSERVATIONS_REQUIRED',
        deduplication:'FILESYSTEM_AND_DOCKER_REFERENCE_OBSERVATION_ONLY',transfer:'NOT_CONNECTED',retention:'NOT_CONNECTED',
        schedule:'NOT_CONNECTED',executor:'NOT_CONNECTED'},
      limitations:['No physical totals are added across mounts or hosts.','No complete backup or file inventory is claimed.',
        'No client-supplied path, command, receipt, permission or destructive operation accepted.']
    };
  };
}
export const runInfrastructureLifecycle=createInfrastructureLifecycleService(
  observeMcpCapacity,async host=>{
    const {observeServerCleanupPlan}=await import('../tools/cleanupPlan.js');
    return observeServerCleanupPlan(host);
  },Date.now,observeDockerReferences,observeBackupAutomation,observePrivateReceipts,observeFreeboxCapacity
);
