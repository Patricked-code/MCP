/**
 * E2-only, read-only preflight immediately following an explicit selection.
 * This gate deliberately does NOT discover or select work, create a GWC task,
 * perform a GitHub write, or grant S1/deployment permissions.
 */
import type {LiveStateSnapshot} from '../liveState/types.js';

const SHA=/^[0-9a-f]{40}$/;
const FETCH='git@github.com-mcp-patricked-ro:Patricked-code/MCP.git';
const PUSH='disabled://mcp-s1-read-only';

export type E2Preflight=Readonly<{
  entryProfile:'EXTERNAL_GOVERNED_RECOVERY';
  gate:'BLOCKED'|'DISCOVER_GITHUB_CONTINUITIES';
  blockers:readonly string[];
  githubMainSha:string|null;
  s1HeadSha:string|null;
  runtimeSha:string|null;
  observedAt:string;
  stateVersion:number;
  canStartOrdinaryWork:boolean;
  grantsWriteAccess:false;
  nextStep:'CORRECT_RECONCILIATION_FIRST'|'DISCOVER_EXISTING_AND_NEW_WORK';
}>;

/** Read-only alignment decision; never treat same commits as sufficient. */
export function assessE2LivePreflight(snapshot:LiveStateSnapshot):E2Preflight{
 const blockers:string[]=[];
 const enough=(x:unknown):x is string=>typeof x==='string'&&SHA.test(x);
 const now=Date.parse(snapshot.generatedAt);
 if(snapshot.repository!=='Patricked-code/MCP'||snapshot.freshness!=='CURRENT'
   ||!Number.isFinite(now)||snapshot.ageSeconds>snapshot.maxAgeSeconds
   ||snapshot.ageSeconds<0)blockers.push('E2_LIVE_EVIDENCE_STALE');
 if(snapshot.github.status!=='CURRENT'||snapshot.s1.status!=='CURRENT'
   ||snapshot.runtime.status!=='CURRENT'
   ||!enough(snapshot.github.head)||!enough(snapshot.s1.head)
   ||!enough(snapshot.s1.originMain)||!enough(snapshot.runtime.revision))
   blockers.push('E2_EXACT_SHA_UNAVAILABLE');
 if(snapshot.s1.branch!=='main'||snapshot.github.branch!=='main'
   ||snapshot.s1.fetchRemote!==FETCH||snapshot.s1.pushRemote!==PUSH)
   blockers.push('E2_REPOSITORY_IDENTITY_INVALID');
 if(snapshot.s1.workingTreeClean!==true||snapshot.s1.diffEmpty!==true)
   blockers.push('E2_S1_UNRECONCILED_LOCAL_CHANGES');
 if(snapshot.runtime.containerStatus!=='running'||!['healthy','none'].includes(snapshot.runtime.health))
   blockers.push('E2_RUNTIME_UNHEALTHY');
 if(snapshot.documentation.status!=='CURRENT'||snapshot.documentation.drift!==false)
   blockers.push('E2_DOCUMENTATION_DRIFT');
 if(enough(snapshot.github.head)&&enough(snapshot.s1.head)
    &&enough(snapshot.s1.originMain)&&enough(snapshot.runtime.revision)
    &&(snapshot.github.head!==snapshot.s1.head
       ||snapshot.s1.originMain!==snapshot.s1.head
       ||snapshot.runtime.revision!==snapshot.s1.head))
   blockers.push('E2_GITHUB_S1_RUNTIME_DIVERGENCE');
 const aligned=blockers.length===0;
 return {
   entryProfile:'EXTERNAL_GOVERNED_RECOVERY',gate:aligned?'DISCOVER_GITHUB_CONTINUITIES':'BLOCKED',
   blockers,githubMainSha:snapshot.github.head,s1HeadSha:snapshot.s1.head,
   runtimeSha:snapshot.runtime.revision,observedAt:snapshot.generatedAt,
   stateVersion:snapshot.stateVersion,canStartOrdinaryWork:aligned,
   grantsWriteAccess:false,
   nextStep:aligned?'DISCOVER_EXISTING_AND_NEW_WORK':'CORRECT_RECONCILIATION_FIRST'
 };
}
