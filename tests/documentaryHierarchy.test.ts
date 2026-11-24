import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { admissionCatalogue } from '../src/web/admissionCatalogue.js';
// @ts-ignore -- standalone ESM report module
import { FOUNDATION_SOURCE,FOUNDATION_DOCUMENTS,ORIGINAL_READING_ORDER,observeFoundationContract,parseDocumentScope,buildCommonDocumentaryPlan } from '../scripts/documentary-hierarchy.mjs';
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
function fixture(extra:string[]=[],changed:string[]=[]) {
  const paths=[...new Set<string>([...FOUNDATION_DOCUMENTS,FOUNDATION_SOURCE,'AGENTS.md','CLAUDE.md','SOURCE_OF_TRUTH.md',
    ...[project,sub,work,child].flatMap(s=>localTypes.map(t=>p(s,t))),...extra])];
  const entries=paths.map(path=>({path,mode:'100644',type:'blob',oid:sha,size:10}));
  const reads:string[]=[];
  const input={headSha:sha,entries,candidatePaths:paths,changes:changed.map(path=>({path,previousPath:null,code:'M'})),
    readText:(path:string)=>{reads.push(path);return path===FOUNDATION_SOURCE?foundation:path==='SUIVI.md'?'# POINT DE REPRISE COURANT\nCurrent':path.endsWith('.json')?'{}':'# Test';}};
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
  const report=buildDocumentaryClosureReport({headSha:sha,baselineSha:sha,trackedPaths:['SUIVI.md'],
    inventory:{schemaVersion:1,trackedCount:1,entries:[{path:'SUIVI.md',category:'canonical'}]},
    changes:[],g1:{status:'ALIGNED'},governanceCheckOk:true,hierarchicalPlan:plan});
  assert.equal(report.status,'DOCUMENTARY_CLOSURE_BLOCKED');
  assert.ok(report.reasons.includes('HIERARCHICAL_DOCUMENTARY_OBLIGATIONS_UNRESOLVED'));
  assert.equal(report.closureAttested,false);
});
