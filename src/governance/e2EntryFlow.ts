/**
 * E2 reconciliation and owner choice, additive to the existing E1/E2 contract.
 * Pure read-only evaluation of observations supplied by existing authorized readers.
 * No task allocation, GitHub write, server write, claim, lock, or deployment authority.
 */
import type {WorkEntryIndexResult} from './workEntryContinuityIndex.js';

type RevisionObservation=Readonly<{status:string;head:string|null}>;
export type E2LiveSnapshot=Readonly<{
  repository:string;
  freshness:string;
  generatedAt:string;
  github:RevisionObservation;
  s1:Readonly<{
    status:string;
    head:string|null;
    originMain:string|null;
    workingTreeClean:boolean|null;
  }>;
  runtime:Readonly<{
    status:string;
    revision:string|null;
    containerStatus:string|null;
    health:string|null;
  }>;
  documentation:Readonly<{
    status:string;
    drift:boolean|null;
    declaredGithubSha:string|null;
    declaredS1Sha:string|null;
  }>;
}>;
export type E2Reconciliation=Readonly<{
  decision:'ASK_OWNER'|'BLOCKED';
  alignment:'ALIGNED'|'DIVERGED'|'UNVERIFIED';
  blockers:readonly string[];
  warnings:readonly string[];
  question:string|null;
  candidates:readonly Readonly<{continuityId:string;issueNumber:number}>[];
  /** This is evidence, never authorization for actions on GitHub or S1. */
  grantsWriteAccess:false;
}>;
const SHA=/^[0-9a-f]{40}$/;
const validSha=(v:unknown):v is string=>typeof v==='string'&&SHA.test(v);

/** Reconciliation always precedes owner-choice routing, not vice versa. */
export function reconcileE2Entry(
  snapshot:E2LiveSnapshot,
  index:WorkEntryIndexResult
):E2Reconciliation{
  const blockers:string[]=[];
  const warnings:string[]=[];
  if(snapshot.repository!=='Patricked-code/MCP'||snapshot.freshness!=='CURRENT'
    ||!Number.isFinite(Date.parse(snapshot.generatedAt)))blockers.push('STALE_OR_WRONG_REPOSITORY');
  const github=snapshot.github;
  const s1=snapshot.s1;
  const runtime=snapshot.runtime;
  if(github.status!=='CURRENT'||s1.status!=='CURRENT'||runtime.status!=='CURRENT'
    ||!validSha(github.head)||!validSha(s1.head)
    ||!validSha(s1.originMain)||!validSha(runtime.revision)){
    blockers.push('MISSING_EXACT_HEAD_EVIDENCE');
  }
  const comparable=validSha(github.head)&&validSha(s1.head)
    &&validSha(s1.originMain)&&validSha(runtime.revision);
  const aligned=comparable&&github.head===s1.head&&s1.head===s1.originMain
    &&s1.head===runtime.revision;
  if(comparable&&!aligned)blockers.push('GITHUB_S1_RUNTIME_SHA_DIVERGENCE');
  if(runtime.containerStatus!=='running'||runtime.health!=='healthy')
    blockers.push('MCP_RUNTIME_NOT_HEALTHY');
  if(s1.workingTreeClean!==true)warnings.push('S1_WORKTREE_NOT_CLEAN');
  if(snapshot.documentation.status!=='CURRENT'||snapshot.documentation.drift!==false)
    warnings.push('MCP_DOCUMENTATION_DRIFT_OR_UNKNOWN');
  if(index.status!=='READY')blockers.push('CONTINUITY_INDEX_CONFLICT');
  const decision=blockers.length===0?'ASK_OWNER':'BLOCKED';
  return {
    decision,
    alignment:!comparable?'UNVERIFIED':aligned?'ALIGNED':'DIVERGED',
    blockers,warnings,
    question:decision==='ASK_OWNER'?'Continuer un chantier MCP existant ? Oui ou non ?':null,
    candidates:index.status==='READY'?index.entries.map(e=>({
      continuityId:e.continuityId,issueNumber:e.issueNumber
    })):[],
    grantsWriteAccess:false
  };
}
export type E2OwnerChoice=Readonly<
 {kind:'CONTINUE';continuityId:string}|
 {kind:'NEW';mandate:string}
>;
export type E2OwnerRouting=Readonly<{
  decision:'RESUME_EXISTING'|'REVIEW_NEW_WORK_FOR_DUPLICATES'|'BLOCKED';
  continuityId:string|null;
  blockers:readonly string[];
  grantsWriteAccess:false;
}>;
/** A new mandate is reviewed for duplicates, never silently instantiated. */
export function routeE2OwnerChoice(
  reconciliation:E2Reconciliation,
  choice:E2OwnerChoice
):E2OwnerRouting{
  const deny=(reason:string):E2OwnerRouting=>({
    decision:'BLOCKED',continuityId:null,blockers:[reason],grantsWriteAccess:false
  });
  if(reconciliation.decision!=='ASK_OWNER')
    return deny('RECONCILIATION_NOT_COMPLETE');
  if(choice.kind==='CONTINUE'){
    const matches=reconciliation.candidates.filter(c=>c.continuityId===choice.continuityId);
    if(matches.length!==1)return deny('UNKNOWN_OR_AMBIGUOUS_CONTINUITY');
    return {decision:'RESUME_EXISTING',continuityId:choice.continuityId,
      blockers:[],grantsWriteAccess:false};
  }
  if(choice.mandate.trim().length<8)return deny('NEW_MANDATE_REQUIRED');
  return {decision:'REVIEW_NEW_WORK_FOR_DUPLICATES',continuityId:null,
    blockers:[],grantsWriteAccess:false};
}
