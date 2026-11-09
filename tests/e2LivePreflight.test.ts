import assert from 'node:assert/strict';
import test from 'node:test';
import {assessE2LivePreflight} from '../src/governance/e2LivePreflight.js';
import type {LiveStateSnapshot} from '../src/liveState/types.js';
const sha='7cbc5496e2a3bd28cf1205d7b659429f61ef6cc6';
const snapshot={
 repository:'Patricked-code/MCP',stateVersion:10,
 freshness:'CURRENT',generatedAt:'2026-10-31T01:40:00.000Z',
 ageSeconds:0,maxAgeSeconds:60,
 github:{status:'CURRENT',branch:'main',head:sha},
 s1:{status:'CURRENT',branch:'main',head:sha,originMain:sha,
  fetchRemote:'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
  pushRemote:'disabled://mcp-s1-read-only',
  workingTreeClean:true,diffEmpty:true},
 runtime:{status:'CURRENT',revision:sha,containerStatus:'running',health:'healthy'},
 documentation:{status:'CURRENT',drift:false}
} as unknown as LiveStateSnapshot;
test('E2 read-only preflight permits continuity discovery only on fully attested alignment',()=>{
 const x=assessE2LivePreflight(snapshot);
 assert.equal(x.gate,'DISCOVER_GITHUB_CONTINUITIES');
 assert.equal(x.canStartOrdinaryWork,true);
 assert.equal(x.grantsWriteAccess,false);
 assert.deepEqual(x.blockers,[]);
});
test('E2 blocks S1 dirty worktree before owner choice even when Git SHAs match',()=>{
 const x=assessE2LivePreflight({...snapshot,s1:{...snapshot.s1,workingTreeClean:false}});
 assert.equal(x.gate,'BLOCKED');
 assert.equal(x.nextStep,'CORRECT_RECONCILIATION_FIRST');
 assert.ok(x.blockers.includes('E2_S1_UNRECONCILED_LOCAL_CHANGES'));
});
test('E2 blocks documentation drift, runtime drift and wrong remote independently',()=>{
 const cases=[
  {...snapshot,documentation:{...snapshot.documentation,drift:true}},
  {...snapshot,runtime:{...snapshot.runtime,revision:'a'.repeat(40)}},
  {...snapshot,s1:{...snapshot.s1,pushRemote:'https://github.com/Patricked-code/MCP'}},
  {...snapshot,s1:{...snapshot.s1,diffEmpty:false}},
  {...snapshot,github:{...snapshot.github,head:null}}
 ] as LiveStateSnapshot[];
 for(const current of cases){
  const result=assessE2LivePreflight(current);
  assert.equal(result.gate,'BLOCKED');
  assert.equal(result.canStartOrdinaryWork,false);
  assert.equal(result.grantsWriteAccess,false);
 }
});

test('preflight accepts existing none-healthcheck semantics but not unhealthy',()=>{
 const noHealthcheck=assessE2LivePreflight({
  ...snapshot,runtime:{...snapshot.runtime,health:'none'}
 });
 assert.equal(noHealthcheck.gate,'DISCOVER_GITHUB_CONTINUITIES');
 const bad=assessE2LivePreflight({...snapshot,runtime:{...snapshot.runtime,health:'unhealthy'}});
 assert.equal(bad.gate,'BLOCKED');
 assert.ok(bad.blockers.includes('E2_RUNTIME_UNHEALTHY'));
});
