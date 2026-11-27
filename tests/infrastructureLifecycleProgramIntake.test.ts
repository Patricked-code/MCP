import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const program=JSON.parse(readFileSync('docs/governance/program-backlog-convergence.json','utf8'));
test('AILM #492 converges to the sole versioned program without runtime authority',()=>{
  const intake=program.programIntakes.filter((x:any)=>x.issue===492);
  assert.equal(intake.length,1);
  assert.equal(intake[0].createsParallelProgram,false);
  assert.equal(intake[0].createsRuntimeTasks,false);
  assert.equal(intake[0].authorizesRuntimeMutation,false);
  assert.equal(intake[0].operationalPriority.independentOfFullAilmCompletion,true);
  assert.equal(intake[0].operationalPriority.completionAttested,false);
  assert.equal(program.workItems.filter((x:any)=>x.id==='PB-AILM').length,1);
  const lots=program.taskBlueprints.filter((x:any)=>x.workItemId==='PB-AILM');
  assert.equal(lots.length,13);
  assert.deepEqual(intake[0].targetBlueprintIds,lots.map((x:any)=>x.id));
  assert.equal(new Set(lots.map((x:any)=>x.lotId)).size,13);
  assert.ok(lots.every((x:any)=>x.materialization.createsRuntimeTask===false &&
    x.materialization.requiresRuntimeAuthorityReobservation===true &&
    x.materialization.requiresCollisionCheck===true));
});
test('AILM independent software readiness and retention dependencies remain distinct',()=>{
  const lot=(n:string)=>program.taskBlueprints.find((x:any)=>x.id==='TB-W3-AILM-'+n);
  assert.equal(lot('01').readiness.state,'READY');
  assert.equal(lot('05').readiness.state,'READY');
  assert.equal(lot('05').githubOnlyPossible,true);
  assert.equal(lot('06').readiness.state,'BLOCKED');
  assert.ok(lot('09').dependsOn.includes('TB-W3-AILM-08'));
  assert.ok(lot('09').dependsOn.includes('TB-W3-AILM-04'));
  assert.ok(program.taskBlueprints.find((x:any)=>x.id==='TB-W4-MCP-FINAL-ACCEPTANCE')
    .dependsOn.includes('TB-W3-AILM-13'));
});
