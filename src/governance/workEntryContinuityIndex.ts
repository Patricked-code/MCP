/**
 * Additive, read-only continuity index for the existing E1/E2 checkpoint contract.
 * Caller supplies GitHub-attested snapshots; this module does not fetch, persist,
 * grant authority, create runtime tasks, or infer an E2 selection.
 */
import {assessGovernedWorkEntryTrace} from './workEntryTrace.js';
import type {GovernedWorkEntryTrace} from './workEntryTrace.js';

export type IndexedWorkEntry=Readonly<{
  continuityId:string;
  entryProfile:GovernedWorkEntryTrace['entryProfile'];
  issueNumber:number;
  latest:GovernedWorkEntryTrace;
  history:readonly GovernedWorkEntryTrace[];
}>;
export type WorkEntryIndexResult=Readonly<{
  status:'READY'|'CONFLICT';
  entries:readonly IndexedWorkEntry[];
  blockers:readonly string[];
}>;
const rank:Record<GovernedWorkEntryTrace['stage'],number>={
  ISSUE_OPENED:0,PR_OPENED:1,MAIN_MERGED:2,S1_ATTESTED:3
};
const canonical=(x:GovernedWorkEntryTrace)=>JSON.stringify(x);

/** Deterministic, fail-closed materialized view. Never silently select a conflict. */
export function buildWorkEntryContinuityIndex(records:readonly GovernedWorkEntryTrace[]):WorkEntryIndexResult{
  const grouped=new Map<string,GovernedWorkEntryTrace[]>();
  const blockers:string[]=[];
  for(const record of records){
    const assessment=assessGovernedWorkEntryTrace(record);
    if(assessment.status!=='EVIDENCE_STRUCTURALLY_VALID'){
      blockers.push('INVALID_TRACE:'+String(record?.continuityId??'UNKNOWN'));
      continue;
    }
    const existing=grouped.get(record.continuityId)??[];
    existing.push(record);
    grouped.set(record.continuityId,existing);
  }
  const entries:IndexedWorkEntry[]=[];
  for(const [continuityId,raw] of grouped){
    const history=[...new Map(raw.map(x=>[canonical(x),x])).values()];
    const first=history[0];
    if(!first){blockers.push('EMPTY_HISTORY:'+continuityId);continue;}
    if(history.some(x=>x.github.issueNumber!==first.github.issueNumber
      ||x.entryProfile!==first.entryProfile
      ||x.instructions.sourceUrl!==first.instructions.sourceUrl)){
      blockers.push('CONTINUITY_IDENTITY_CONFLICT:'+continuityId);
      continue;
    }
    history.sort((a,b)=>rank[a.stage]-rank[b.stage]||canonical(a).localeCompare(canonical(b)));
    const sameStage=new Map<number,string>();
    let conflict=false;
    for(const snapshot of history){
      const key=rank[snapshot.stage];
      const previous=sameStage.get(key);
      if(previous!==undefined&&previous!==canonical(snapshot)){
        conflict=true;
      }
      sameStage.set(key,canonical(snapshot));
    }
    if(conflict){
      blockers.push('AMBIGUOUS_STAGE:'+continuityId);
      continue;
    }
    const latest=history[history.length-1];
    if(!latest){blockers.push('EMPTY_HISTORY:'+continuityId);continue;}
    entries.push({continuityId,entryProfile:first.entryProfile,
      issueNumber:first.github.issueNumber,latest,history});
  }
  entries.sort((a,b)=>a.continuityId.localeCompare(b.continuityId));
  return {status:blockers.length?'CONFLICT':'READY',entries:blockers.length?[]:entries,blockers};
}

/** No result is never interpreted as a successful admission or recovery. */
export function recoverWorkEntryByContinuityId(
  index:WorkEntryIndexResult,continuityId:string
):IndexedWorkEntry|null{
  if(index.status!=='READY')return null;
  return index.entries.find(x=>x.continuityId===continuityId)??null;
}
