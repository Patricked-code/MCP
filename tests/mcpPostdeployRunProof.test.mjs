import assert from 'node:assert/strict';
import test from 'node:test';
import {verifyGovernedDeployRun} from '../scripts/mcp-postdeploy-run-proof.mjs';

const SHA='7d29ad4212efa0bd343d53f400785e5c9cbf07f4';
const REPO='Patricked-code/MCP';
function input(){
  const run={
    id:842001,status:'completed',conclusion:'success',name:'MCP Governed Deploy',
    head_sha:SHA,head_branch:'main',event:'push',repository:{full_name:REPO}
  };
  const job={
    name:'deploy',head_sha:SHA,status:'completed',conclusion:'success',
    steps:[{name:'Deploy exact main SHA through MCP',status:'completed',conclusion:'success'}]
  };
  return {event:{workflow_run:run},repository:REPO,githubSha:SHA,jobs:{jobs:[job]}};
}
test('C25 post-deploy reobservation accepts the attested exact SHA job, never infers live runtime',()=>{
  const result=verifyGovernedDeployRun(input());
  assert.equal(result.verified,true);
  assert.equal(result.sourceRunId,842001);
  assert.equal(result.sourceSha,SHA);
  assert.equal(result.noRuntimeStateInferred,true);
});
test('C25 refuses a successful workflow where deployment was skipped, cancelled or wrong SHA',()=>{
  for(const patch of [
    x=>{x.jobs.jobs[0].steps[0].conclusion='skipped';},
    x=>{x.jobs.jobs[0].steps[0].conclusion='cancelled';},
    x=>{x.jobs.jobs[0].head_sha='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';},
    x=>{x.jobs.jobs[0].conclusion='failure';},
    x=>{x.event.workflow_run.conclusion='failure';},
    x=>{x.event.workflow_run.name='untrusted';},
    x=>{x.event.workflow_run.head_branch='feature';},
    x=>{x.githubSha='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';},
    x=>{x.jobs={jobs:[]};}
  ]) {
    const x=input();patch(x);
    assert.equal(verifyGovernedDeployRun(x).verified,false);
  }
});
test('C25 refuses absent job evidence and the wrong workflow owner',()=>{
  const x=input();
  x.event.workflow_run.repository.full_name='untrusted/MCP';
  assert.equal(verifyGovernedDeployRun(x).verified,false);
  x.event.workflow_run.repository.full_name=REPO;
  assert.equal(verifyGovernedDeployRun({...x,jobs:null}).verified,false);
});
