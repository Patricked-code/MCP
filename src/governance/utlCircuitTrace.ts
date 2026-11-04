/**
 * PR #372 — pure, read-only UTL V0.3 evidence contracts.
 *
 * Extends the existing E1/E2 GovernedWorkEntryTrace without replacing it.
 * No dispatcher, Task Queue, claim, lock, permission or deploy action.
 * A structurally acceptable UTL is never automatically ADMITTED or DONE.
 */
import {
  assessGovernedWorkEntryTrace,
  type GovernedWorkEntryTrace
} from './workEntryTrace.js';

export type UtlContractName=
  'T_IN'|'UTL_PLAN'|'D_IN'|'D_OUT'|'L_IN'|'L_OUT'|'UTL_OUT'|'T_OUT';
export type UtlEvidenceProjection=Readonly<{
  status:'EVIDENCE_PRESENT_NOT_AUTHORIZATION'|'BLOCKED';
  blockers:readonly string[];
  grantsWritePermission:false;
  createsRuntimeTask:false;
  closesParent:false;
}>;
export type UtlPlanUnit=Readonly<{
  utlRef:string;
  parentWorkRef:string;
  continuityId:string;
  objective:string;
  requirementRefs:readonly string[];
  acceptanceCriteria:readonly string[];
  dependsOnUtlRefs:readonly string[];
  collisionDomains:readonly string[];
  scope:string;
  deployRequired:boolean;
  evidenceUrl:string;
}>;
export type TInContract=Readonly<{
  parentWorkRef:string;
  workEntry:GovernedWorkEntryTrace;
  parentAdmissionEvidenceUrl:string|null;
  objective:string;
  acceptanceCriteria:readonly string[];
  nextAction:string;
}>;
export type UtlPlanContract=Readonly<{
  parent:TInContract;
  units:readonly UtlPlanUnit[];
  alreadySatisfiedEvidenceUrl:string|null;
}>;
export type DOutContract=Readonly<{
  utlRef:string;
  prNumber:number;
  prHeadSha:string;
  prCiRunId:number;
  prCiConclusion:'success'|'failure'|'unknown';
  independentReviewUrl:string|null;
  mergeCommitSha:string|null;
  mergedAtUtc:string|null;
}>;
export type LOutContract=Readonly<{
  utlRef:string;
  mainSha:string;
  ciMainRunId:number;
  ciMainConclusion:'success'|'failure'|'unknown';
  deployWorkflowRunId:number;
  deployWorkflowConclusion:'success'|'failure'|'unknown';
  serverJobId:string|null;
  requestedSha:string|null;
  runtimeRevision:string|null;
  serverStatus:'succeeded'|'failed'|'queued'|'running'|'unknown';
  phase:string|null;
  healthOk:boolean|null;
  oauthOk:boolean|null;
  mcpAuthOk:boolean|null;
  rollbackStatus:string|null;
  attestationUrl:string|null;
  observedAtUtc:string|null;
}>;
export type UtlOutContract=Readonly<{
  unit:UtlPlanUnit;
  development:DOutContract;
  delivery:LOutContract|null;
  unitAcceptanceUrl:string|null;
  attestedMainSha:string|null;
}>;
export type TOutContract=Readonly<{
  plan:UtlPlanContract;
  unitOutcomes:readonly UtlOutContract[];
  finalMainSha:string|null;
  finalIntegrationAcceptanceUrl:string|null;
  checkpointUrl:string|null;
}>;

const SHA=/^[0-9a-f]{40}$/;
const EVIDENCE=/^https:\/\/github\.com\/Patricked-code\/MCP\/(?:issues|pull|actions|commit)\/[A-Za-z0-9/#-]+$/;
const meaningful=(s:unknown):s is string=>typeof s==='string'&&s.trim().length>=3;
const validLink=(s:unknown)=>typeof s==='string'&&EVIDENCE.test(s);
const positive=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0;
function result(blockers:string[]):UtlEvidenceProjection{
  return {status:blockers.length?'BLOCKED':'EVIDENCE_PRESENT_NOT_AUTHORIZATION',
    blockers:[...new Set(blockers)],grantsWritePermission:false,
    createsRuntimeTask:false,closesParent:false};
}
function hasCycle(units:readonly UtlPlanUnit[]):boolean{
  const adj=new Map<string,readonly string[]>(units.map(unit=>[unit.utlRef,unit.dependsOnUtlRefs]));
  const visiting=new Set<string>();const visited=new Set<string>();
  function walk(key:string):boolean{
    if(visiting.has(key))return true;
    if(visited.has(key))return false;
    visiting.add(key);
    for(const dep of adj.get(key)??[]){if(walk(dep))return true;}
    visiting.delete(key);visited.add(key);return false;
  }
  return units.some(unit=>walk(unit.utlRef));
}
export function assessUtlPlan(plan:UtlPlanContract):UtlEvidenceProjection{
  const b:string[]=[];
  if(!plan?.parent?.workEntry || assessGovernedWorkEntryTrace(plan.parent.workEntry).blockers.length){
    b.push('PARENT_E1_E2_ENTRY_NOT_VERIFIED');
  }
  if(!meaningful(plan?.parent?.parentWorkRef)||!meaningful(plan?.parent?.objective)
    ||!meaningful(plan?.parent?.nextAction)
    ||!validLink(plan?.parent?.parentAdmissionEvidenceUrl)){
    b.push('PARENT_ADMISSION_OR_OBJECTIVE_MISSING');
  }
  if(!plan?.parent?.acceptanceCriteria?.length)b.push('PARENT_ACCEPTANCE_MISSING');
  if(!Array.isArray(plan?.units)){b.push('UTL_PLAN_MISSING');return result(b);}
  const refs=new Set<string>();
  for(const u of plan.units){
    if(!meaningful(u.utlRef)||refs.has(u.utlRef))b.push('DUPLICATE_OR_INVALID_UTL_REFERENCE');
    refs.add(u.utlRef);
    if(u.parentWorkRef!==plan.parent.parentWorkRef
      ||u.continuityId!==plan.parent.workEntry.continuityId){
      b.push('UTL_PARENT_CONTINUITY_MISMATCH');
    }
    if(!meaningful(u.objective)||!meaningful(u.scope)
      ||u.acceptanceCriteria.length===0||u.requirementRefs.length===0
      ||u.collisionDomains.length===0||!validLink(u.evidenceUrl)){
      b.push('UTL_CRITERIA_SCOPE_OR_PROVENANCE_MISSING');
    }
  }
  for(const u of plan.units){
    if(u.dependsOnUtlRefs.some(dep=>!refs.has(dep)))b.push('MISSING_UTL_DEPENDENCY');
  }
  if(hasCycle(plan.units))b.push('CYCLIC_UTL_DEPENDENCIES');
  if(plan.units.length===0&&!validLink(plan.alreadySatisfiedEvidenceUrl)){
    b.push('ZERO_UTL_ALREADY_SATISFIED_EVIDENCE_MISSING');
  }
  return result(b);
}
export function assessDOut(d:DOutContract):UtlEvidenceProjection{
  const b:string[]=[];
  if(!meaningful(d.utlRef)||!positive(d.prNumber)||!SHA.test(d.prHeadSha))
    b.push('PR_ID_OR_HEAD_SHA_MISSING');
  if(!positive(d.prCiRunId)||d.prCiConclusion!=='success')
    b.push('PR_CI_NOT_SUCCESS');
  if(!validLink(d.independentReviewUrl))b.push('INDEPENDENT_REVIEW_MISSING');
  if(!d.mergeCommitSha||!SHA.test(d.mergeCommitSha)||!meaningful(d.mergedAtUtc))
    b.push('REAL_MAIN_MERGE_NOT_ATTESTED');
  return result(b);
}
export function assessLOut(d:LOutContract):UtlEvidenceProjection{
  const b:string[]=[];
  if(!meaningful(d.utlRef)||!SHA.test(d.mainSha)||d.requestedSha!==d.mainSha
    ||d.runtimeRevision!==d.mainSha)b.push('EXACT_MAIN_REQUESTED_RUNTIME_SHA_MISMATCH');
  if(!positive(d.ciMainRunId)||d.ciMainConclusion!=='success')
    b.push('CI_MAIN_GATE_MISSING');
  if(!positive(d.deployWorkflowRunId)||d.deployWorkflowConclusion!=='success')
    b.push('DEPLOY_WORKFLOW_NOT_SUCCESS');
  const expected='mcp-s1-'+d.deployWorkflowRunId+'-'+d.mainSha.slice(0,12);
  if(d.serverJobId!==expected)b.push('SERVER_JOB_RUN_SHA_MISMATCH');
  if(d.serverStatus!=='succeeded'||d.phase!=='attested'||d.healthOk!==true
    ||d.oauthOk!==true||d.mcpAuthOk!==true||d.rollbackStatus!=='not_needed'){
    b.push('SERVER_HEALTH_ROLLBACK_ATTESTATION_MISSING');
  }
  if(!validLink(d.attestationUrl)||!meaningful(d.observedAtUtc))
    b.push('ATTESTATION_PROVENANCE_OR_TIME_MISSING');
  return result(b);
}
export function assessUtlOut(o:UtlOutContract):UtlEvidenceProjection{
  const b:string[]=[...assessDOut(o.development).blockers];
  if(o.unit.utlRef!==o.development.utlRef)b.push('D_OUT_UTL_ID_MISMATCH');
  if(o.unit.deployRequired){
    if(!o.delivery)b.push('REQUIRED_L_OUT_MISSING');
    else {
      b.push(...assessLOut(o.delivery).blockers);
      if(o.delivery.utlRef!==o.unit.utlRef)b.push('L_OUT_UTL_ID_MISMATCH');
      if(o.delivery.mainSha!==o.attestedMainSha)b.push('LATEST_UNIT_ATTESTED_SHA_MISMATCH');
    }
  }else if(o.development.mergeCommitSha!==o.attestedMainSha){
    b.push('UNIT_INTEGRATED_SHA_MISMATCH');
  }
  if(!validLink(o.unitAcceptanceUrl))b.push('UNIT_ACCEPTANCE_NOT_ATTESTED');
  return result(b);
}
export function assessTOut(o:TOutContract):UtlEvidenceProjection{
  const b:string[]=[...assessUtlPlan(o.plan).blockers];
  const units=o.plan.units;
  if(units.length!==o.unitOutcomes.length)b.push('REQUIRED_UTL_OUT_COUNT_MISMATCH');
  const seen=new Set<string>();
  for(const outcome of o.unitOutcomes){
    const id=outcome.unit.utlRef;
    if(!units.some(x=>x.utlRef===id)||seen.has(id))b.push('UNKNOWN_OR_DUPLICATED_UTL_OUT');
    seen.add(id);
    b.push(...assessUtlOut(outcome).blockers);
  }
  if(!o.finalMainSha||!SHA.test(o.finalMainSha)
    ||!validLink(o.finalIntegrationAcceptanceUrl)||!validLink(o.checkpointUrl)){
    b.push('PARENT_FINAL_INTEGRATION_AND_CHECKPOINT_MISSING');
  }
  return result(b);
}
