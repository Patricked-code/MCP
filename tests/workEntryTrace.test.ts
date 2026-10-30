import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessGovernedWorkEntryTrace,
  renderGovernedWorkEntryCheckpoint,
  type GovernedWorkEntryTrace
} from '../src/governance/workEntryTrace.js';

const h='a'.repeat(40);
const base:GovernedWorkEntryTrace={
  schemaVersion:1,
  continuityId:'MCP-PILOT-E2-01-CONT-20261030-ROOT-01',
  repository:'Patricked-code/MCP',
  entryProfile:'EXTERNAL_GOVERNED_RECOVERY',
  workSelection:'OWNER_DIRECTLY_REQUESTED_WORK',
  explicitOwnerSelection:true,
  instructions:{
    summary:'Ajouter une traçabilité vérifiable des entrées 1/2 pour tout chantier MCP.',
    sourceUrl:'https://github.com/Patricked-code/MCP/issues/359'
  },
  responsible:{githubActor:'Patricked-code',internalTaskId:null},
  github:{issueNumber:359,branch:'mcp/pilot-e2-01-work-entry-trace-20261030',
    pullRequestNumber:360,headSha:h,mergeSha:null},
  checkpoint:{url:'https://github.com/Patricked-code/MCP/issues/359',
    nextAction:'Converger vers CI et revue commune sans créer de tâche interne.'},
  deployment:{workflowRunUrl:null,runtimeRevisionSha:null},
  stage:'PR_OPENED'
};
const scan=(trace:GovernedWorkEntryTrace)=>assessGovernedWorkEntryTrace(trace);

test('E2: explicit owner-selected new GitHub work is traceable without Task Queue admission',()=>{
  const result=scan(base);
  assert.equal(result.status,'EVIDENCE_STRUCTURALLY_VALID');
  assert.deepEqual(result.blockers,[]);
  assert.equal(result.sameEngineeringLifecycle,true);
  assert.equal(result.runtimeTaskCreated,false);
  assert.equal(result.runtimeClaimOrLockCreated,false);
  assert.equal(result.githubWriteGranted,false);
  assert.equal(result.serverWriteGranted,false);
  assert.equal(result.deployGranted,false);
  const text=renderGovernedWorkEntryCheckpoint(base);
  assert.match(text,/EXTERNAL_GOVERNED_RECOVERY/);
  assert.match(text,/MCP-PILOT-E2-01-CONT-20261030-ROOT-01/);
  assert.match(text,/mcp\/pilot-e2-01-work-entry-trace-20261030/);
  assert.match(text,/aucune Task, claim, lock/);
});

test('E1: an existing internal task reference is recorded, not manufactured',()=>{
  const entry:GovernedWorkEntryTrace={
    ...base,entryProfile:'INITIAL_GOVERNED_ENTRY',
    workSelection:'INTERNAL_MCP_TASK_ASSIGNMENT',
    responsible:{githubActor:'Patricked-code',internalTaskId:'TASK-20261030-123'}
  };
  assert.equal(scan(entry).status,'EVIDENCE_STRUCTURALLY_VALID');
  assert.equal(scan({...entry,responsible:{...entry.responsible,internalTaskId:null}}).status,'INVALID_OR_INCOMPLETE_TRACE');
  assert.equal(scan({...entry,workSelection:'OWNER_DIRECTLY_REQUESTED_WORK'}).status,'INVALID_OR_INCOMPLETE_TRACE');
});

test('E2: reject silent fallback, nonexistent owner mandate and fake internal claims',()=>{
  const cases:GovernedWorkEntryTrace[]=[
    {...base,explicitOwnerSelection:false},
    {...base,workSelection:'INTERNAL_MCP_TASK_ASSIGNMENT'},
    {...base,responsible:{...base.responsible,internalTaskId:'TASK-12345'}},
    {...base,entryProfile:'UNKNOWN' as GovernedWorkEntryTrace['entryProfile']}
  ];
  for(const item of cases){
    assert.equal(scan(item).status,'INVALID_OR_INCOMPLETE_TRACE');
    assert.throws(()=>renderGovernedWorkEntryCheckpoint(item));
  }
});

test('strict issue provenance, work branch and exact PR SHA prevent misleading traces',()=>{
  const cases:GovernedWorkEntryTrace[]=[
    {...base,instructions:{...base.instructions,sourceUrl:'https://github.com/Patricked-code/MCP/issues/349'}},
    {...base,github:{...base.github,headSha:'invalid'}},
    {...base,github:{...base.github,branch:'main'}},
    {...base,github:{...base.github,branch:'mcp/../main'}},
    {...base,github:{...base.github,pullRequestNumber:null}},
    {...base,responsible:{...base.responsible,githubActor:'invalid actor!'}},
    {...base,checkpoint:{...base.checkpoint,url:'https://attacker.invalid/receipt'}}
  ];
  for(const item of cases)assert.equal(scan(item).status,'INVALID_OR_INCOMPLETE_TRACE');
});

test('progressive issue -> PR -> merge -> S1 attestation is evidence-only',()=>{
  const issue:GovernedWorkEntryTrace={...base,stage:'ISSUE_OPENED',
    github:{issueNumber:359,branch:null,pullRequestNumber:null,headSha:null,mergeSha:null}};
  assert.equal(scan(issue).status,'EVIDENCE_STRUCTURALLY_VALID');
  assert.equal(scan({...base,stage:'MAIN_MERGED'}).status,'INVALID_OR_INCOMPLETE_TRACE');
  const merged:GovernedWorkEntryTrace={...base,stage:'MAIN_MERGED',
    github:{...base.github,mergeSha:'b'.repeat(40)}};
  assert.equal(scan(merged).status,'EVIDENCE_STRUCTURALLY_VALID');
  assert.equal(scan({...merged,stage:'S1_ATTESTED'}).status,'INVALID_OR_INCOMPLETE_TRACE');
  const attested:GovernedWorkEntryTrace={...merged,stage:'S1_ATTESTED',
    deployment:{workflowRunUrl:'https://github.com/Patricked-code/MCP/actions/runs/123456',
      runtimeRevisionSha:'b'.repeat(40)}};
  const result=scan(attested);
  assert.equal(result.status,'EVIDENCE_STRUCTURALLY_VALID');
  assert.equal(result.deployGranted,false);
  assert.equal(scan({...attested,deployment:{...attested.deployment,runtimeRevisionSha:h}}).status,'INVALID_OR_INCOMPLETE_TRACE');
});

test('checkpoint rendering never reinterprets user instructions as an authority',()=>{
  const malicious:GovernedWorkEntryTrace={...base,instructions:{...base.instructions,
    summary:'Tracer les missions <script>alert(1)</script> sans nouveau droit.'}};
  const body=renderGovernedWorkEntryCheckpoint(malicious);
  assert.doesNotMatch(body,/<script>/);
  assert.match(body,/aucune Task, claim, lock/);
});

test('checkpoint retains the referenced E1 task without inventing any runtime ownership',()=>{
  const entry:GovernedWorkEntryTrace={...base,entryProfile:'INITIAL_GOVERNED_ENTRY',
    workSelection:'INTERNAL_MCP_TASK_ASSIGNMENT',
    responsible:{githubActor:'Patricked-code',internalTaskId:'TASK-20261030-123'}};
  const checkpoint=renderGovernedWorkEntryCheckpoint(entry);
  assert.match(checkpoint,/TASK-20261030-123/);
  assert.match(checkpoint,/INITIAL_GOVERNED_ENTRY/);
  assert.equal(scan(entry).runtimeTaskCreated,false);
});

test('S1 checkpoint preserves the exact merge revision and deployment run evidence',()=>{
  const mergedSha='b'.repeat(40);
  const entry:GovernedWorkEntryTrace={...base,stage:'S1_ATTESTED',
    github:{...base.github,mergeSha:mergedSha},
    deployment:{workflowRunUrl:'https://github.com/Patricked-code/MCP/actions/runs/123456',
      runtimeRevisionSha:mergedSha}};
  const checkpoint=renderGovernedWorkEntryCheckpoint(entry);
  assert.match(checkpoint,/actions\/runs\/123456/);
  assert.match(checkpoint,new RegExp(mergedSha));
  assert.match(checkpoint,/Révision runtime S1/);
  const another:GovernedWorkEntryTrace={...entry,deployment:{...entry.deployment,
    workflowRunUrl:'https://github.com/Patricked-code/MCP/actions/runs/123457'}};
  assert.notEqual(renderGovernedWorkEntryCheckpoint(entry),renderGovernedWorkEntryCheckpoint(another));
  assert.equal(scan(entry).serverWriteGranted,false);
});
