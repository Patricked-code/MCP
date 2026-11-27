import { evaluateDockerMaintenance, type Observation, type Decision } from './maintenancePlan.js';
import { verifyDockerReceiptPair, type DockerReceiptInput } from './backupReceipt.js';

export type Prc17Effect='PRC17A_DOCKER_BACKUP'|'PRC17A_DOCKER_RESTORE'|'PRC17B_DOCKER_RETENTION';
export type Prc17Evidence=Readonly<{
  observation:Observation;
  /** Supplied only by an internal trusted private evidence reader. */
  offsite:DockerReceiptInput|null;
  restore:DockerReceiptInput|null;
}>;
export type Prc17Candidate=Readonly<{
  operation:Prc17Effect|null;
  decision:Decision;
  reasons:readonly string[];
  effectAuthorized:false;
}>;
/** Operation-specific adapter, not a second planner or authorization source. */
export function projectPrc17Operation(evidence:Prc17Evidence):Prc17Candidate {
  const decision=evaluateDockerMaintenance(evidence.observation);
  const none=(...reasons:string[]):Prc17Candidate=>({operation:null,decision,reasons,effectAuthorized:false});
  const candidate=(operation:Prc17Effect):Prc17Candidate=>({operation,decision,reasons:decision.reasons,effectAuthorized:false});
  if(decision.nextStep==='BACKUP_CANDIDATE')return candidate('PRC17A_DOCKER_BACKUP');
  if(decision.nextStep==='RESTORE_CANDIDATE')return candidate('PRC17A_DOCKER_RESTORE');
  if(decision.nextStep!=='RETENTION_CANDIDATE')return none(...decision.reasons);
  if(!evidence.offsite||!evidence.restore)return none('EXACT_RECEIPT_PAIR_REQUIRED');
  const pair=verifyDockerReceiptPair(evidence.offsite,evidence.restore);
  if(pair.status!=='PAIR_STRUCTURE_VERIFIED'||pair.planDigest!==decision.planDigest)
    return none('EXACT_RECEIPT_PAIR_UNVERIFIED');
  return candidate('PRC17B_DOCKER_RETENTION');
}
export type Prc17Lease=Readonly<{
  operation:Prc17Effect;planDigest:string;scriptSha256:string;taskId:string;sessionId:string;
  fencingToken:string;expiresAtMs:number;
}>;
export type Prc17DispatchOutcome=Readonly<{
  status:'BLOCKED'|'DISPATCH_ACCEPTED'|'RECONCILE_REQUIRED';
  reason:string;operation:Prc17Effect|null;effectCompleted:false;
}>;
export type Prc17RuntimePorts=Readonly<{
  /** Trusted adapter must independently read authoritative private receipts, live capacity and policy. */
  observe:()=>Promise<Prc17Evidence>;
  /** Existing task/session/lock and machine/script admission authorities, never client-supplied. */
  admit:(operation:Prc17Effect,planDigest:string)=>Promise<Prc17Lease|null>;
  /** The installed operation-specific worker must revalidate lease/fencing before each effect,
   * write durable start/finish receipts, and reject replays. No raw shell, path or args here. */
  submit:(lease:Prc17Lease)=>Promise<{status:'ACCEPTED'|'REJECTED'|'AMBIGUOUS'}>;
  now?:()=>number;
}>;
const sha=/^[a-f0-9]{64}$/;
function validLease(lease:Prc17Lease|null,op:Prc17Effect,plan:string,now:number):lease is Prc17Lease {
  return !!lease&&lease.operation===op&&lease.planDigest===plan&&sha.test(lease.scriptSha256)
    &&typeof lease.taskId==='string'&&lease.taskId.length>0&&typeof lease.sessionId==='string'&&lease.sessionId.length>0
    &&typeof lease.fencingToken==='string'&&lease.fencingToken.length>0
    &&Number.isSafeInteger(now)&&Number.isSafeInteger(lease.expiresAtMs)&&lease.expiresAtMs>now;
}
/** Internal, deliberately not registered as a write tool until the existing
 * durable worker/lease and private evidence ports are wired and certified.
 * On ambiguous submission it MUST NOT retry. The next cycle re-observes. */
export async function dispatchPrc17Operation(ports:Prc17RuntimePorts):Promise<Prc17DispatchOutcome> {
  const result=(status:Prc17DispatchOutcome['status'],reason:string,operation:Prc17Effect|null=null):Prc17DispatchOutcome=>({status,reason,operation,effectCompleted:false});
  let operation:Prc17Effect|null=null;
  const clock=ports.now??Date.now;
  const currentCandidate=async()=>{
    const evidence=await ports.observe();
    const now=clock();
    // Re-evaluate freshness against the server clock, not a stale snapshot clock.
    return projectPrc17Operation({...evidence,observation:{...evidence.observation,nowMs:now}});
  };
  try {
    const first=await currentCandidate();
    operation=first.operation;
    if(!operation)return result('BLOCKED',first.reasons.join(','),null);
    const plan=first.decision.planDigest;
    const lease=await ports.admit(operation,plan);
    if(!validLease(lease,operation,plan,clock()))return result('BLOCKED','GOVERNED_ADMISSION_REQUIRED',operation);
    const latest=await currentCandidate();
    if(latest.operation!==operation||latest.decision.planDigest!==plan)
      return result('BLOCKED','PLAN_OR_STAGE_CHANGED',operation);
    const current=await ports.admit(operation,plan);
    if(!validLease(current,operation,plan,clock())||
      current.taskId!==lease.taskId||current.sessionId!==lease.sessionId||
      current.fencingToken!==lease.fencingToken||current.scriptSha256!==lease.scriptSha256)
      return result('BLOCKED','LEASE_OR_SCRIPT_CHANGED',operation);
    // No await between the last gate and dispatch. The receiving worker must
    // enforce the same authority at every remote effect, not merely on launch.
    try {
      const sent=await ports.submit(current);
      if(sent.status==='ACCEPTED')return result('DISPATCH_ACCEPTED','WORKER_RECEIPT_REQUIRED',operation);
      if(sent.status==='REJECTED')return result('BLOCKED','WORKER_REJECTED',operation);
      return result('RECONCILE_REQUIRED','AMBIGUOUS_SUBMISSION',operation);
    } catch {return result('RECONCILE_REQUIRED','AMBIGUOUS_SUBMISSION',operation);}
  } catch {return result('BLOCKED','TRUSTED_EVIDENCE_OR_ADMISSION_UNAVAILABLE',operation);}
}
