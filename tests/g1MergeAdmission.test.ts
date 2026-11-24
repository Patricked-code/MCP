import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { G1_REPOSITORY,G1_MANIFEST,prepareG1Candidate,type G1Drift } from '../src/deploy/g1Documentation.js';
import { validateG1MergeCandidate,validateG1BranchRules,exactG1CiState,validateG1NativePrState } from '../src/deploy/g1MergeAdmission.js';
const sha='a'.repeat(40),head='b'.repeat(40),branch='mcp/docs-reconcile-'+sha;
const rules=[{type:'pull_request',parameters:{required_approving_review_count:0,require_code_owner_review:false,
  require_last_push_approval:false,required_review_thread_resolution:true}},
  {type:'required_status_checks',parameters:{strict_required_status_checks_policy:true,required_status_checks:[{context:'validate',integration_id:15368}]}}];
test('native rules require real zero-human-approval policy and strict exact-head CI',()=>{
  assert.equal(validateG1BranchRules(rules),15368);
  assert.throws(()=>validateG1BranchRules([]));
  assert.throws(()=>validateG1BranchRules([{...rules[0],parameters:{...rules[0]!.parameters,required_approving_review_count:1}},rules[1]]));
  assert.throws(()=>validateG1BranchRules([rules[0],{...rules[1],parameters:{...rules[1]!.parameters,strict_required_status_checks_policy:false}}]));
});
test('G1 rebuilds exact candidate from fresh deployment evidence and rejects unrelated changes',()=>{
  const baseline=readFileSync(G1_MANIFEST,'utf8'),manifest=JSON.parse(baseline),now=Date.now();
  const evidence:G1Drift={status:'DRIFT',sha,observedAt:new Date(now).toISOString(),stateVersion:8,imageId:'sha256:'+'c'.repeat(64),
    declaredGithubSha:manifest.githubCommitFull,declaredS1Sha:manifest.serverGitState.lastDirectlyVerifiedCommitFull};
  const candidate=prepareG1Candidate(baseline,evidence,sha,now);
  const pr={state:'open',merged:false,head:{sha:head,ref:branch,repo:{full_name:G1_REPOSITORY}},
    base:{sha,ref:'main',repo:{full_name:G1_REPOSITORY}},commits:1,changed_files:1};
  const compare={status:'ahead',ahead_by:1,behind_by:0,files:[{filename:G1_MANIFEST,status:'modified'}]};
  const input={baseSha:sha,headSha:head,branch,pr,compare,baseManifest:baseline,candidateManifest:candidate,freshEvidence:evidence,now};
  assert.doesNotThrow(()=>validateG1MergeCandidate(input));
  assert.throws(()=>validateG1MergeCandidate({...input,pr:{...pr,changed_files:2}}));
  assert.throws(()=>validateG1MergeCandidate({...input,candidateManifest:candidate+' '}));
  assert.throws(()=>validateG1MergeCandidate({...input,now:now+61000}));
  assert.throws(()=>validateG1MergeCandidate({...input,freshEvidence:{...evidence,imageId:'sha256:'+'d'.repeat(64)}}));
});
test('CI gate checks exact push run and validate integration, rejects failed or truncated evidence',()=>{
  const run={id:1,head_sha:head,head_branch:branch,event:'push',name:'MCP CI',status:'completed',conclusion:'success'};
  const check={head_sha:head,name:'validate',app:{id:15368},status:'completed',conclusion:'success'};
  const input={headSha:head,branch,integration:15368,runs:{total_count:1,workflow_runs:[run]},checks:{total_count:1,check_runs:[check]}};
  assert.equal(exactG1CiState(input),'SUCCESS');
  assert.equal(exactG1CiState({...input,checks:{total_count:1,check_runs:[{...check,app:{id:5}}]}}),'PENDING');
  assert.equal(exactG1CiState({...input,runs:{total_count:1,workflow_runs:[{...run,status:'in_progress'}]}}),'PENDING');
  assert.throws(()=>exactG1CiState({...input,checks:{total_count:2,check_runs:[check]}}));
  assert.throws(()=>exactG1CiState({...input,checks:{total_count:1,check_runs:[{...check,conclusion:'failure'}]}}));
});
test('native CLEAN, exact base/head and resolved threads are mandatory; bypass states never pass',()=>{
  const pr={state:'OPEN',isCrossRepository:false,headRefOid:head,baseRefOid:sha,headRefName:branch,baseRefName:'main',
    isDraft:false,unresolvedThreads:0,reviewDecision:null,mergeable:'MERGEABLE',mergeStateStatus:'CLEAN'};
  const input={pr,headSha:head,baseSha:sha,branch,requireReady:true};
  assert.equal(validateG1NativePrState(input),'SUCCESS');
  for(const mergeStateStatus of ['BLOCKED','BEHIND','UNSTABLE','UNKNOWN','HAS_HOOKS'])
    assert.equal(validateG1NativePrState({...input,pr:{...pr,mergeStateStatus}}),'PENDING');
  assert.throws(()=>validateG1NativePrState({...input,pr:{...pr,unresolvedThreads:1}}));
  assert.throws(()=>validateG1NativePrState({...input,pr:{...pr,reviewDecision:'CHANGES_REQUESTED'}}));
  assert.throws(()=>validateG1NativePrState({...input,pr:{...pr,baseRefOid:head}}));
});
