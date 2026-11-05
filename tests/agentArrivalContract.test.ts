import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {assessE2LivePreflight} from '../src/governance/e2LivePreflight.js';
import {activateE2WithAutomaticReconciliation} from '../src/governance/e2AutoActivation.js';

type Snapshot=Parameters<typeof assessE2LivePreflight>[0];
const SHA='05dbb66ed81aa4e7443655c89d10c0c390ff0f10';
const SHA2='7d29ad4212efa0bd343d53f400785e5c9cbf07f4';

function snapshot(overrides:Record<string,unknown>={}):Snapshot{
 const base={
  repository:'Patricked-code/MCP',generatedAt:'2026-11-05T10:00:00.000Z',
  freshness:'CURRENT',ageSeconds:0,maxAgeSeconds:60,stateVersion:1202,
  github:{status:'CURRENT',branch:'main',head:SHA},
  s1:{status:'CURRENT',branch:'main',head:SHA,originMain:SHA,
   workingTreeClean:true,diffEmpty:true,
   fetchRemote:'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
   pushRemote:'disabled://mcp-s1-read-only'},
  runtime:{status:'CURRENT',containerStatus:'running',health:'healthy',revision:SHA},
  documentation:{status:'CURRENT',drift:false}
 };
 return {...base,...overrides} as unknown as Snapshot;
}

test('agent GitHub arrival is instructed to connect to existing MCP before owner choice',()=>{
 const text=readFileSync('AGENTS.md','utf8');
 const section=text.slice(text.indexOf('## Arrivée agent GitHub → MCP'),text.indexOf('## Méthode universelle de bifurcation'));
 assert.ok(section.length>0);
 for(const name of ['IDENTIFY_GITHUB','READ_CANONICAL_INTAKE','CONNECT_EXISTING_MCP',
  'G1_RECONCILE','G1_GOVERNED_CORRECTION_IF_NEEDED','G2_DISCOVER_AND_MAP','G3_OWNER_CHOICE']){
  assert.ok(section.includes(name),name);
 }
 assert.ok(section.indexOf('ping')<section.indexOf('mcp_reconcile_governed_context'));
 assert.ok(section.indexOf('mcp_reconcile_governed_context')<section.indexOf('mcp_get_current_state_inventory'));
 assert.ok(section.indexOf('G1_RECONCILE')<section.indexOf('G2_DISCOVER_AND_MAP'));
 assert.ok(section.indexOf('G2_DISCOVER_AND_MAP')<section.indexOf('G3_OWNER_CHOICE'));
 assert.match(section,/E2_JOURNAL_POST_HTTP_403/);
 assert.match(section,/sans .*droit d'écriture/);
 assert.match(section,/aucun événement standard/);
});

test('same GitHub, S1 and runtime SHA does not bypass documentation reconciliation',()=>{
 const s=snapshot({documentation:{status:'CURRENT',drift:true}});
 const decision=assessE2LivePreflight(s);
 assert.equal(decision.gate,'BLOCKED');
 assert.ok(decision.blockers.includes('E2_DOCUMENTATION_DRIFT'));
});

test('GitHub/S1 mismatch never reaches owner choice',()=>{
 const s=snapshot({s1:{...snapshot().s1,head:SHA2}});
 const decision=assessE2LivePreflight(s);
 assert.equal(decision.canStartOrdinaryWork,false);
 assert.ok(decision.blockers.includes('E2_GITHUB_S1_RUNTIME_DIVERGENCE'));
});

test('aligned explicit E2 activation skips correction and can discover',async()=>{
 let observations=0,repairs=0;
 const result=await activateE2WithAutomaticReconciliation(
  {entryProfile:'EXTERNAL_GOVERNED_RECOVERY',explicitlySelected:true},
  {observe:async()=>{observations++;return snapshot();},
   reconcile:async()=>{repairs++;return{outcome:'BLOCKED',reason:'SHOULD_NOT_RUN'};}}
 );
 assert.equal(result.status,'CONTINUE_E2');
 assert.equal(result.nextStep,'DISCOVER_EXISTING_WORK');
 assert.equal(observations,1);
 assert.equal(repairs,0);
 assert.equal(result.grantsPermission,false);
});

test('a plain connection is not an implicit permission to activate E2',async()=>{
 let observed=false;
 await assert.rejects(
  activateE2WithAutomaticReconciliation(
   {entryProfile:'EXTERNAL_GOVERNED_RECOVERY',explicitlySelected:false},
   {observe:async()=>{observed=true;return snapshot();},
    reconcile:async()=>({outcome:'BLOCKED',reason:'UNAUTHORIZED'})}
  ),/E2_EXPLICIT_SELECTION_REQUIRED/
 );
 assert.equal(observed,false);
});

test('a correction that cannot reattest full alignment cannot reach work choice',async()=>{
 let observations=0,repairs=0;
 const dirty=snapshot({documentation:{status:'CURRENT',drift:true}});
 const result=await activateE2WithAutomaticReconciliation(
  {entryProfile:'EXTERNAL_GOVERNED_RECOVERY',explicitlySelected:true},
  {observe:async()=>{observations++;return dirty;},
   reconcile:async()=>{repairs++;return{outcome:'S1_GIT_RECONCILED',reason:'GIT_ONLY'};}}
 );
 assert.equal(result.status,'RECONCILIATION_PENDING');
 assert.equal(result.nextStep,'RECONCILE_BEFORE_WORK');
 assert.equal(repairs,1);
 assert.equal(observations,2);
 assert.equal(result.grantsPermission,false);
});
