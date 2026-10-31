/**
 * E2 entry is a single gated transaction: observe -> auto-trigger the existing
 * E2 reconciliation process on drift -> observe again -> open work discovery
 * ONLY after a fresh fully aligned snapshot. Never create a GWC task.
 *
 * No background schedule, E1 hook, or implicit server write is introduced.
 */
import {assessE2LivePreflight,type E2Preflight} from './e2LivePreflight.js';
import type {LiveStateSnapshot} from '../liveState/types.js';

export type E2RepairResult=Readonly<{
  outcome:'S1_GIT_RECONCILED'|'GOVERNED_DEPLOY_PENDING'|
    'GITHUB_PROPOSAL_REQUIRED'|'GITHUB_PROPOSAL_OPENED'|
    'AWAITING_AUTHORITY'|'BLOCKED';
  reason:string;
  reviewUrl?:string;
}>;
export type E2ActivationPorts=Readonly<{
  observe:()=>Promise<LiveStateSnapshot>;
  reconcile:(snapshot:LiveStateSnapshot,preflight:E2Preflight)=>Promise<E2RepairResult>;
}>;
export type E2ActivationResult=Readonly<{
  entryProfile:'EXTERNAL_GOVERNED_RECOVERY';
  status:'CONTINUE_E2'|'RECONCILIATION_BLOCKED'|'RECONCILIATION_PENDING';
  reconciliationTriggered:boolean;
  mechanism:'mcp_reconcile_s1_to_main'|null;
  initial:E2Preflight;
  final:E2Preflight|null;
  repair:E2RepairResult|null;
  nextStep:'DISCOVER_EXISTING_WORK'|'RECONCILE_BEFORE_WORK';
  grantsPermission:false;
}>;

export async function activateE2WithAutomaticReconciliation(
  selection:Readonly<{entryProfile:string;explicitlySelected:boolean}>,
  ports:E2ActivationPorts
):Promise<E2ActivationResult>{
  if(selection.entryProfile!=='EXTERNAL_GOVERNED_RECOVERY'
     ||selection.explicitlySelected!==true)
    throw new Error('E2_EXPLICIT_SELECTION_REQUIRED');
  const firstObservation=await ports.observe();
  const initial=assessE2LivePreflight(firstObservation);
  if(initial.gate==='DISCOVER_GITHUB_CONTINUITIES')
    return {
      entryProfile:'EXTERNAL_GOVERNED_RECOVERY',status:'CONTINUE_E2',
      reconciliationTriggered:false,mechanism:null,
      initial,final:initial,repair:null,nextStep:'DISCOVER_EXISTING_WORK',
      grantsPermission:false
    };
  // An incomplete observation is not a trustworthy correction instruction.
  const invalid=new Set(['E2_LIVE_EVIDENCE_STALE','E2_EXACT_SHA_UNAVAILABLE',
    'E2_REPOSITORY_IDENTITY_INVALID','E2_RUNTIME_UNHEALTHY']);
  if(initial.blockers.some(b=>invalid.has(b)))
    return {
      entryProfile:'EXTERNAL_GOVERNED_RECOVERY',status:'RECONCILIATION_BLOCKED',
      reconciliationTriggered:false,mechanism:null,
      initial,final:null,repair:{outcome:'BLOCKED',reason:'E2_INVALID_LIVE_EVIDENCE'},
      nextStep:'RECONCILE_BEFORE_WORK',grantsPermission:false
    };
  // This is the automatic E2 correction trigger; caller does not invoke a
  // second MCP tool manually. The adapter must enforce its own write gates.
  let repair:E2RepairResult;
  try{
    repair=await ports.reconcile(firstObservation,initial);
  }catch{
    repair={outcome:'BLOCKED',reason:'E2_RECONCILIATION_CONNECTOR_FAILED'};
  }
  if(repair.outcome!=='S1_GIT_RECONCILED')
    return {
      entryProfile:'EXTERNAL_GOVERNED_RECOVERY',
      status:repair.outcome==='BLOCKED'||repair.outcome==='AWAITING_AUTHORITY'
        ?'RECONCILIATION_BLOCKED':'RECONCILIATION_PENDING',
      reconciliationTriggered:true,mechanism:'mcp_reconcile_s1_to_main',
      initial,final:null,repair,nextStep:'RECONCILE_BEFORE_WORK',
      grantsPermission:false
    };
  // A successful Git operation is NOT sufficient: runtime and docs may lag.
  const final=assessE2LivePreflight(await ports.observe());
  return {
    entryProfile:'EXTERNAL_GOVERNED_RECOVERY',
    status:final.gate==='DISCOVER_GITHUB_CONTINUITIES'
      ?'CONTINUE_E2':'RECONCILIATION_PENDING',
    reconciliationTriggered:true,mechanism:'mcp_reconcile_s1_to_main',
    initial,final,repair,
    nextStep:final.gate==='DISCOVER_GITHUB_CONTINUITIES'
      ?'DISCOVER_EXISTING_WORK':'RECONCILE_BEFORE_WORK',
    grantsPermission:false
  };
}
