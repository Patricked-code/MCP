import test from 'node:test';
import assert from 'node:assert/strict';
import { collectBackupAutomation,parseBackupTimerOutput } from '../src/infrastructureLifecycle/backupAutomation.js';
const unit=(name:string)=>'Id='+name+'\nLoadState=loaded\nActiveState=active\nUnitFileState=enabled\nLastTriggerUSec=Fri 2026-11-27 05:44:00 UTC\nNextElapseUSecRealtime=Sat 2026-11-28 05:44:00 UTC';
const output=unit('freebox-s2-offsite.timer')+'\n\n'+unit('freebox-s2-volumes.timer')+'\n';
test('observes two existing producer timers without claiming backup success or changing schedules',async()=>{
  const result=await collectBackupAutomation(async(host,command,timeout,max)=>{
    assert.equal(host,'s2');assert.match(command,/^LC_ALL=C systemctl show /);assert.equal(timeout,15000);assert.equal(max,12000);
    return {stdout:output,stderr:'',code:0};
  },()=>1);
  assert.equal(result.status,'OBSERVED');if(result.status==='OBSERVED'){
    assert.equal(result.timers.length,2);assert.ok(result.timers.every(x=>!x.automaticBackupCertified));assert.equal(result.automationModified,false);
  }
});
test('timer projection refuses incomplete, duplicate, foreign or truncated records',()=>{
  for(const x of [unit('freebox-s2-offsite.timer'),unit('freebox-s2-offsite.timer')+'\n\n'+unit('freebox-s2-offsite.timer'),output.replace('freebox-s2-volumes.timer','unknown.timer'),output+'sortie plafonnée'])
    assert.equal(parseBackupTimerOutput(x,1).status,'UNVERIFIED');
});
