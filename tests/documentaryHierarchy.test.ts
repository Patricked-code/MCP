import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { admissionCatalogue } from '../src/web/admissionCatalogue.js';
// @ts-ignore -- standalone ESM report module
import { FOUNDATION_SOURCE,FOUNDATION_DOCUMENTS,ORIGINAL_READING_ORDER,observeFoundationContract,parseDocumentScope,buildCommonDocumentaryPlan,observeLoopbackCheckpoint,LOOPBACK_SOURCES } from '../scripts/documentary-hierarchy.mjs';
// @ts-ignore -- standalone ESM report module
import { buildDocumentaryClosureReport } from '../scripts/mcp-documentary-closure.mjs';

const sha='a'.repeat(40);
const project='docs/projects/PROJECT-01';
const sub=project+'/subprojects/SUB-01';
const work=sub+'/chantiers/WORK-01';
const child=work+'/subchantiers/CHILD-01';
const localTypes=['SOURCE_OF_TRUTH','DOCUMENT_AUTHORITIES','MISSION','DECISIONS','CONTINUITY','MEMORY',
  'INTENTIONS','ROADMAP','SUIVI','TASKS','TODO','IMPLEMENTATION_PLAN','EVIDENCE_INDEX','AGENTS','ARCHITECTURE','CARTOGRAPHY'];
const p=(base:string,type:string)=>base+'/'+base.split('/').at(-1)+'__'+type+'.md';
const foundation=readFileSync(FOUNDATION_SOURCE,'utf8');
const checkpointFixture='# POINT DE REPRISE COURANT\n'+String.fromCharCode(96).repeat(3)+'loopback-checkpoint\n'+JSON.stringify({
  schemaVersion:1,scope:'REPOSITORY_NAVIGATION',observedAt:'2026-11-24T04:15:30.677Z',observedMainSha:sha,
  continuityId:'MISSION-01',proofIssue:441,observationStatus:'REOBSERVE_REQUIRED',
  nextAction:'REOBSERVE_GITHUB_S1_RUNTIME_AND_CONTINUITY'
})+'\n'+String.fromCharCode(96).repeat(3)+'\n';
function fixture(extra:string[]=[],changed:string[]=[]) {
  const paths=[...new Set<string>([...FOUNDATION_DOCUMENTS,FOUNDATION_SOURCE,...LOOPBACK_SOURCES,'AGENTS.md','CLAUDE.md','SOURCE_OF_TRUTH.md',
    ...[project,sub,work,child].flatMap(s=>localTypes.map(t=>p(s,t))),...extra])];
  const entries=paths.map(path=>({path,mode:'100644',type:'blob',oid:sha,size:10}));
  const reads:string[]=[];
  const input={headSha:sha,entries,candidatePaths:paths,changes:changed.map(path=>({path,previousPath:null,code:'M'})),
    readText:(path:string)=>{reads.push(path);return path===FOUNDATION_SOURCE?foundation:path==='SUIVI.md'?checkpointFixture:path.endsWith('.json')?'{}':'# Test';}};
  return {input,reads};
}
test('original founding contract is read from the actual retained source; 20 documents, exact order of 17 plus checkpoint',()=>{
  const r=observeFoundationContract(foundation);
  assert.equal(r.status,'MATCHED');
  assert.equal(r.required.length,20);assert.equal(r.reading.length,17);
  assert.deepEqual(r.reading,ORIGINAL_READING_ORDER);
  assert.equal(observeFoundationContract(foundation.replace('6. Ordre obligatoire de lecture avant toute action','6. Changed')).status,'UNVERIFIED');
});
test('discover project/subproject/workstream/subworkstream with explicit parent chain, never from similar IDs',()=>{
  const r=parseDocumentScope(p(child,'TASKS'));
  assert.deepEqual(r.chain.map((x:{level:number})=>x.level),[2,3,4,5]);
  assert.equal(r.scopeKey,child);assert.equal(r.type,'TASKS');
  assert.equal(parseDocumentScope(child+'/OTHER__TASKS.md'),null);
  assert.equal(parseDocumentScope(project+'/../OTHER__TASKS.md'),null);
  assert.equal(parseDocumentScope(project+'/subchantiers/X/X__TASKS.md'),null);
});
test('same exact plan for every catalogued entry, no admission or mutation derived from plan',()=>{
  const {input}=fixture();
  const base=buildCommonDocumentaryPlan(input);
  assert.equal(admissionCatalogue.length,23);
  for(const admission of admissionCatalogue){
    const plan=buildCommonDocumentaryPlan({...input,entryChannel:admission.id,workEntry:'E1'});
    assert.deepEqual(plan,base);
    assert.deepEqual(buildCommonDocumentaryPlan({...input,entryChannel:admission.id,workEntry:'E2'}),base);
  }
  assert.equal(base.entryIndependent,true);assert.equal(base.mutationPerformed,false);
  assert.equal(base.automaticExecutionAuthorized,false);
  assert.equal(base.coverage.semanticCoverageComplete,false);
  assert.equal(base.closureAttested,false);
});
test('ordered reads include parent scope and every candidate; omissions and unresolved ownership stay explicit',()=>{
  const {input,reads}=fixture([project+'/unidentified.md','Migration/old.pdf']);
  const r=buildCommonDocumentaryPlan(input);
  assert.equal(r.coverage.allCandidatesAccountedFor,true);
  assert.equal(r.documents.length,input.candidatePaths.length);
  assert.equal(r.foundation.checkpoint.status,'PRESENT');
  assert.ok(reads.indexOf(p(project,'SOURCE_OF_TRUTH'))<reads.indexOf(p(child,'SOURCE_OF_TRUTH')));
  const deepest=r.scopes.find((s:{scopeKey:string})=>s.scopeKey===child);
  assert.deepEqual(deepest.inheritedScopes,['REPOSITORY_ROOT',project,sub,work]);
  assert.equal(deepest.semanticStatus,'UNVERIFIED');
  assert.ok(r.issues.some((x:{code:string})=>x.code==='SCOPED_PATH_UNRESOLVED'));
  assert.equal(r.documents.find((d:{path:string})=>d.path==='Migration/old.pdf').semanticStatus,'UNVERIFIED');
  assert.ok(r.issues.some((x:{code:string})=>x.code.includes('MISSING_OR_EQUIVALENT_UNVERIFIED')));
});
test('review impact propagates upward/downward without assuming a document must change or a sibling is owned',()=>{
  const {input}=fixture([], [p(child,'TASKS'),p(project,'DECISIONS'),'src/new.ts']);
  const r=buildCommonDocumentaryPlan(input);
  const edges=r.dependencies;
  assert.ok(edges.some((e:{from:string,to:string,kind:string})=>e.from===p(child,'TASKS')&&e.to===p(work,'SUIVI')&&e.kind==='ASCENDING_IMPACT_REVIEW'));
  assert.ok(edges.some((e:{from:string,to:string,kind:string})=>e.from===p(project,'DECISIONS')&&e.to===p(sub,'AGENTS')&&e.kind==='DESCENDING_IMPACT_REVIEW'));
  assert.equal(r.documents.find((d:{path:string})=>d.path===p(work,'SUIVI')).impactReviewRequired,true);
  assert.ok(r.issues.some((x:{code:string,path:string})=>x.code==='CHANGE_IMPACT_UNRESOLVED'&&x.path==='src/new.ts'));
  assert.equal(r.coverage.transversalDependencyCoverageComplete,false);
  assert.equal(r.closureAttested,false);
});
test('missing scope equivalence and unreadable evidence block actual report, never promote a structurally read document',()=>{
  const {input}=fixture();
  const absent=p(child,'CONTINUITY');
  const plan=buildCommonDocumentaryPlan({...input,entries:input.entries.filter(x=>x.path!==absent),
    candidatePaths:input.candidatePaths.filter(x=>x!==absent)});
  assert.ok(plan.issues.some((x:{scopeKey:string,type:string})=>x.scopeKey===child&&x.type==='CONTINUITY'));
  const trackedPaths=plan.documents.map((r:{path:string})=>r.path);
  const report=buildDocumentaryClosureReport({headSha:sha,baselineSha:sha,trackedPaths,
    inventory:{schemaVersion:1,trackedCount:trackedPaths.length,entries:trackedPaths.map((path:string)=>({path,category:'documentation'}))},
    changes:[],g1:{status:'ALIGNED'},governanceCheckOk:true,hierarchicalPlan:plan});
  assert.equal(report.status,'DOCUMENTARY_CLOSURE_BLOCKED');
  assert.ok(report.reasons.includes('HIERARCHICAL_DOCUMENTARY_OBLIGATIONS_UNRESOLVED'));
  assert.equal(report.closureAttested,false);
});

test('explicit relative reference links a dependent document to another scope without inferring ownership',()=>{
  const {input}=fixture([], [p(child,'TASKS')]);
  const target=p(child,'TASKS'),dependent=p(work,'SUIVI');
  const result=buildCommonDocumentaryPlan({...input,readText:(path:string)=>path===dependent
    ?'# Test\n[Child tasks](subchantiers/CHILD-01/CHILD-01__TASKS.md)':input.readText(path)});
  assert.ok(result.dependencies.some((e:{from:string,to:string,kind:string})=>e.from===target&&e.to===dependent&&e.kind==='EXPLICIT_CROSS_SCOPE_REFERENCE_REVIEW'));
  assert.equal(result.coverage.transversalDependencyCoverageComplete,false);
});
test('plan bound to a different candidate corpus cannot satisfy the report',()=>{
  const {input}=fixture();
  const plan=buildCommonDocumentaryPlan(input);
  const report=buildDocumentaryClosureReport({headSha:sha,baselineSha:sha,trackedPaths:['SUIVI.md'],
    inventory:{schemaVersion:1,trackedCount:1,entries:[{path:'SUIVI.md',category:'canonical'}]},
    changes:[],g1:{status:'ALIGNED'},governanceCheckOk:true,hierarchicalPlan:plan});
  assert.equal(report.status,'DOCUMENTARY_CLOSURE_BLOCKED');
  assert.ok(report.reasons.includes('HIERARCHICAL_DOCUMENTARY_PLAN_UNVERIFIED'));
});
test('real checkout preflight uses exact Git SHA and same plan independently of deploy and credentials',()=>{
  const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const result=spawnSync(process.execPath,['scripts/mcp-documentary-closure.mjs','--plan',head],{
    encoding:'utf8',maxBuffer:8*1024*1024,timeout:120000});
  assert.equal(result.error,undefined);
  assert.ok(result.status===0||result.status===2,result.stderr);
  const plan=JSON.parse(result.stdout);
  assert.equal(plan.headSha,head);
  assert.equal(plan.foundation.status,'MATCHED');
  assert.equal(plan.coverage.allCandidatesAccountedFor,true);
  assert.equal(plan.entryIndependent,true);
  assert.equal(plan.closureAttested,false);
  const wrong=spawnSync(process.execPath,['scripts/mcp-documentary-closure.mjs','--plan','f'.repeat(40)],{
    encoding:'utf8',timeout:10000});
  assert.notEqual(wrong.status,0);
  assert.match(wrong.stderr,/CHECKOUT_SHA_MISMATCH/);
});

test('Loopback locates one explicit active checkpoint, never interprets old free-text SHA or claims DONE',()=>{
  const old='# Old history\n- NEXT_ACTION: old task\n- '+sha+'\n';
  const observed=observeLoopbackCheckpoint(old+checkpointFixture);
  assert.equal(observed.status,'PRESENT');
  assert.equal(observed.proofStatus,'DECLARED_REOBSERVE_REQUIRED');
  assert.equal(observed.closureAttested,false);
  assert.equal(observeLoopbackCheckpoint(old).status,'UNVERIFIED');
  assert.equal(observeLoopbackCheckpoint(checkpointFixture+checkpointFixture).reason,'CHECKPOINT_AMBIGUOUS');
  assert.equal(observeLoopbackCheckpoint(checkpointFixture.replace('REOBSERVE_REQUIRED','DONE')).status,'UNVERIFIED');
  const {input}=fixture([],['SUIVI.md']);
  const plan=buildCommonDocumentaryPlan(input);
  assert.equal(plan.foundation.loopbackReads.length,LOOPBACK_SOURCES.length);
  assert.ok(plan.foundation.loopbackReads.every((r:{status:string})=>r.status==='CONTENT_READ'));
  assert.ok(plan.dependencies.some((e:{from:string,to:string,kind:string})=>e.from==='SUIVI.md'&&e.to==='memory/LOOPBACK_WEALTHTECH_CURRENT.md'&&e.kind==='LOOPBACK_REVIEW'));
  assert.equal(plan.closureAttested,false);
});
test('actual SUIVI checkpoint is present without overwriting the historical Loopback',()=>{
  const body=readFileSync('SUIVI.md','utf8');
  assert.equal(observeLoopbackCheckpoint(body).status,'PRESENT');
  const loopback=readFileSync('memory/LOOPBACK_WEALTHTECH_CURRENT.md','utf8');
  assert.match(loopback,/SUIVI\.md#point-de-reprise-courant/);
  assert.match(loopback,/Date UTC : 2026-07-01/);
});
