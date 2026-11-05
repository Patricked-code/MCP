import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {reconcileLiveState,applyFreshness} from '../src/liveState/reconcile.js';
import type {LiveStateObservations} from '../src/liveState/types.js';

const SHA='05dbb66ed81aa4e7443655c89d10c0c390ff0f10';
const SHA2='7d29ad4212efa0bd343d53f400785e5c9cbf07f4';
const NOW=new Date('2026-11-05T10:00:00.000Z');

function observations():LiveStateObservations{
 return {
  repository:'Patricked-code/MCP',
  github:{status:'CURRENT',branch:'main',head:SHA},
  s1:{status:'CURRENT',path:'/opt/apps/wealthtech-mcp-ssh-bridge',
   branch:'main',head:SHA,originMain:SHA,workingTreeClean:true,diffEmpty:true,
   fetchRemote:'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
   pushRemote:'disabled://mcp-s1-read-only'},
  runtime:{status:'CURRENT',container:'wealthtech_mcp_ssh_bridge',
   containerStatus:'running',health:'healthy',
   revision:SHA,imageId:'sha256:fixture'},
  documentation:{status:'CURRENT',activeTask:null,
   declaredGithubSha:SHA,declaredS1Sha:SHA,drift:false}
 };
}

test('universal arrival starts from GitHub, reads instructions and connects to MCP',()=>{
 const agents=readFileSync('AGENTS.md','utf8');
 const start=agents.indexOf('## INTAKE global — arrivée GitHub → MCP → point de choix');
 const end=agents.indexOf('## Méthode universelle de bifurcation',start);
 assert.ok(start>=0 && end>start,'universal INTAKE must precede work modes');
 const section=agents.slice(start,end);
 const steps=[
  'CONNECT_GITHUB','READ_INSTRUCTIONS','CONNECT_MCP',
  'G1_VERIFY_ALIGNMENT','G1_CORRECT_IF_REQUIRED','G1_REATTEST',
  'G2_DISCOVER_AND_MAP','G3_STOP_FOR_OWNER_CHOICE'
 ];
 let previous=-1;
 for(const step of steps){
  const at=section.indexOf('**'+step+'**');
  assert.ok(at>previous,step+' must appear in order');
  previous=at;
 }
 assert.ok(section.indexOf('ping')<section.indexOf('mcp_reconcile_governed_context'));
 assert.ok(section.indexOf('mcp_reconcile_governed_context')<section.indexOf('mcp_get_current_state_inventory'));
 assert.doesNotMatch(section,/mcp_e2_|E2_JOURNAL|EXTERNAL_GOVERNED_RECOVERY/);
 assert.match(section,/ne rien corriger/);
 assert.match(section,/Nouveau chantier ou reprise/);
 assert.match(section,/STOP_G1/);
 assert.match(section,/ne crée ni troisième voie/);
 assert.match(section,/un agent ou connecter deux applications externes/);
 for(const file of ['README.md','CLAUDE.md']){
  assert.match(readFileSync(file,'utf8'),/INTAKE global GitHub/);
 }
});

test('common Live State returns FULLY_ALIGNED without requiring an E2 profile',()=>{
 const s=reconcileLiveState(observations(),null,NOW);
 assert.equal(s.alignment.global,'FULLY_ALIGNED');
 assert.equal(s.nextAction,null);
 assert.deepEqual(s.contradictions,[]);
});

test('common Live State blocks choice on documentation drift despite equal commits',()=>{
 const o=observations();
 o.documentation.drift=true;
 const s=reconcileLiveState(o,null,NOW);
 assert.equal(s.alignment.global,'RECONCILIATION_REQUIRED');
 assert.equal(s.nextAction,'reconcile_canonical_documentation');
 assert.ok(s.contradictions.includes('DOCUMENTATION_DRIFT'));
});

test('common Live State identifies GitHub main ahead of S1, not as aligned',()=>{
 const o=observations();
 o.github.head=SHA2;
 const s=reconcileLiveState(o,null,NOW);
 assert.equal(s.alignment.global,'DEPLOYMENT_PENDING');
 assert.equal(s.nextAction,'governed_sync_github_main_to_s1');
});

test('common Live State detects local S1 modifications and preserves stop gate',()=>{
 const o=observations();
 o.s1.workingTreeClean=false;
 o.s1.diffEmpty=false;
 const s=reconcileLiveState(o,null,NOW);
 assert.equal(s.alignment.global,'RECONCILIATION_REQUIRED');
 assert.equal(s.nextAction,'reconcile_s1_working_tree_before_mutation');
});

test('unhealthy runtime cannot be accepted as global alignment',()=>{
 const o=observations();
 o.runtime.health='unhealthy';
 const s=reconcileLiveState(o,null,NOW);
 assert.equal(s.alignment.global,'DEGRADED');
});

test('a stale observation cannot be a fresh arrival attestation',()=>{
 const s=reconcileLiveState(observations(),null,NOW);
 const stale=applyFreshness(s,new Date(NOW.getTime()+61_000));
 assert.equal(stale.freshness,'STALE');
 assert.ok(stale.ageSeconds>stale.maxAgeSeconds);
});
