import assert from 'node:assert/strict';
import test from 'node:test';
import {activateE2WithAutomaticReconciliation}
 from '../src/governance/e2AutoActivation.js';
import type {LiveStateSnapshot} from '../src/liveState/types.js';

const head='7cbc5496e2a3bd28cf1205d7b659429f61ef6cc6';
const old='1f6961063d27bc85087aab57a8f700fd7729e03f';
const aligned={
 repository:'Patricked-code/MCP',freshness:'CURRENT',stateVersion:100,
 generatedAt:'2026-10-31T01:30:00.000Z',ageSeconds:0,maxAgeSeconds:60,
 github:{status:'CURRENT',head,branch:'main'},
 s1:{status:'CURRENT',head,originMain:head,branch:'main',
  workingTreeClean:true,diffEmpty:true,
  fetchRemote:'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
  pushRemote:'disabled://mcp-s1-read-only'},
 runtime:{status:'CURRENT',revision:head,health:'healthy',containerStatus:'running'},
 documentation:{status:'CURRENT',drift:false}
} as unknown as LiveStateSnapshot;
const diverged={
 ...aligned,github:{...aligned.github,head},
 s1:{...aligned.s1,head:old,originMain:old,workingTreeClean:false,diffEmpty:false},
 runtime:{...aligned.runtime,revision:old},
 documentation:{...aligned.documentation,drift:true}
};
const chosen={entryProfile:'EXTERNAL_GOVERNED_RECOVERY',explicitlySelected:true};

test('E2 activation automatically proceeds when fully aligned, without starting reconciliation',async()=>{
 let observed=0,repairs=0;
 const result=await activateE2WithAutomaticReconciliation(chosen,{
  observe:async()=>{observed++;return aligned;},
  reconcile:async()=>{repairs++;return {outcome:'BLOCKED',reason:'NEVER_CALLED'};}
 });
 assert.equal(result.status,'CONTINUE_E2');
 assert.equal(result.mechanism,null);
 assert.equal(result.nextStep,'DISCOVER_EXISTING_WORK');
 assert.equal(result.reconciliationTriggered,false);
 assert.equal(result.grantsPermission,false);
 assert.equal(observed,1);
 assert.equal(repairs,0);
});
test('divergence starts mcp_reconcile_s1_to_main automatically without second tool call',async()=>{
 let observed=0,repairs=0;
 const result=await activateE2WithAutomaticReconciliation(chosen,{
  observe:async()=>{observed++;return observed===1?diverged:aligned;},
  reconcile:async(input)=>{
   repairs++;
   assert.equal(input.s1.head,old);
   return {outcome:'S1_GIT_RECONCILED',reason:'SAFE_APPROVED_CONTENT'};
  }
 });
 assert.equal(result.reconciliationTriggered,true);
 assert.equal(result.mechanism,'mcp_reconcile_s1_to_main');
 assert.equal(result.status,'CONTINUE_E2');
 assert.equal(result.nextStep,'DISCOVER_EXISTING_WORK');
 assert.equal(observed,2);
 assert.equal(repairs,1);
});
test('successful Git correction NEVER unlocks E2 while runtime or docs remain divergent',async()=>{
 let repairs=0;
 const result=await activateE2WithAutomaticReconciliation(chosen,{
  observe:async()=>diverged,
  reconcile:async()=>{
   repairs++;return {outcome:'S1_GIT_RECONCILED',reason:'GIT_ONLY'};
  }
 });
 assert.equal(repairs,1);
 assert.equal(result.status,'RECONCILIATION_PENDING');
 assert.equal(result.nextStep,'RECONCILE_BEFORE_WORK');
 assert.equal(result.final?.gate,'BLOCKED');
});
test('unpublished S1 change automatically initiates E2 process but does not bypass PR review',async()=>{
 let repairs=0;
 const result=await activateE2WithAutomaticReconciliation(chosen,{
  observe:async()=>diverged,
  reconcile:async()=>{
   repairs++;return {outcome:'GITHUB_PROPOSAL_REQUIRED',reason:'PR_NEEDED'};
  }
 });
 assert.equal(repairs,1);
 assert.equal(result.mechanism,'mcp_reconcile_s1_to_main');
 assert.equal(result.status,'RECONCILIATION_PENDING');
 assert.equal(result.nextStep,'RECONCILE_BEFORE_WORK');
});
test('invalid or incomplete E2 observation never invokes a corrective write',async()=>{
 let repairs=0;
 const result=await activateE2WithAutomaticReconciliation(chosen,{
  observe:async()=>({...diverged,github:{...diverged.github,head:null}}),
  reconcile:async()=>{
   repairs++;return {outcome:'S1_GIT_RECONCILED',reason:'SHOULD_NOT_RUN'};
  }
 });
 assert.equal(repairs,0);
 assert.equal(result.status,'RECONCILIATION_BLOCKED');
 assert.equal(result.reconciliationTriggered,false);
});
test('E1 and implicit E2 do not even observe server state',async()=>{
 for(const selection of [
  {entryProfile:'E1',explicitlySelected:true},
  {entryProfile:'EXTERNAL_GOVERNED_RECOVERY',explicitlySelected:false}
 ]){
  let observations=0,repairs=0;
  await assert.rejects(()=>activateE2WithAutomaticReconciliation(selection,{
   observe:async()=>{observations++;return diverged;},
   reconcile:async()=>{repairs++;return {outcome:'BLOCKED',reason:'UNREACHABLE'};}
  }),/E2_EXPLICIT_SELECTION_REQUIRED/);
  assert.equal(observations,0);
  assert.equal(repairs,0);
 }
});
