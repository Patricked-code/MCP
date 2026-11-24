import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
// The workflow report is a standalone dependency-free ESM script.
// @ts-ignore -- test runner imports the .mjs implementation directly.
import { buildDocumentaryClosureReport, parseNameStatus, observeDocumentAuthorities, parseTrackedTree, observeTrackedCorpus, classifyTrackedPath } from '../scripts/mcp-documentary-closure.mjs';

const HEAD = 'a'.repeat(40);
const BASE = 'b'.repeat(40);
function input(overrides = {}) {
  return {
    headSha: HEAD, baselineSha: BASE,
    trackedPaths: ['SUIVI.md', 'docs/OLD.md', '.mcp/registry.json', 'PRODUCTION_STATE.json', 'src/index.ts'],
    inventory: {schemaVersion: 1, trackedCount: 2, entries: [
      {path:'SUIVI.md',category:'canonical'}, {path:'docs/OLD.md',category:'documentation'}
    ]},
    changes: [{code:'M',path:'src/index.ts',previousPath:null}],
    g1: {status:'ALIGNED'}, governanceCheckOk: true, ...overrides
  };
}

test('documentary closure never equates G1 alignment with complete semantic coverage', () => {
  const report = buildDocumentaryClosureReport(input());
  assert.equal(report.status,'DOCUMENTARY_CLOSURE_PENDING');
  assert.equal(report.closureAttested,false);
  assert.equal(report.coverage.complete,false);
  assert.equal(report.inventory.inventoryAligned,true);
  assert.equal(report.inventory.candidateCount,4);
  assert.equal(report.documents.find((d: {path:string}) => d.path === 'SUIVI.md').semanticStatus,'UNVERIFIED');
  assert.equal(report.mutationPerformed,false);
});

test('report identifies the actual production fields and reuses GW60/GW61 for a bound G1 difference', () => {
  const report = buildDocumentaryClosureReport(input({g1:{status:'DRIFT',sha:HEAD,declaredGithubSha:BASE,declaredS1Sha:BASE}}));
  assert.equal(report.status,'DOCUMENTARY_CLOSURE_PENDING');
  assert.equal(report.differences.length,2);
  assert.equal(report.differences[0].declared,BASE);
  assert.equal(report.differences[0].observed,HEAD);
  assert.equal(report.differences[0].nextAction,'REUSE_GW60_GW61');
  assert.equal(report.closureAttested,false);
});

test('wrong SHA or missing proof blocks, without fabricating a correction', () => {
  for (const g1 of [{status:'DRIFT',sha:BASE,declaredGithubSha:BASE,declaredS1Sha:BASE},{status:'UNVERIFIED'},null]) {
    const report=buildDocumentaryClosureReport(input({g1}));
    assert.equal(report.status,'DOCUMENTARY_CLOSURE_BLOCKED');
    assert.equal(report.differences.length,0);
    assert.equal(report.closureAttested,false);
  }
});

test('unindexed added markdown, missing historical path and failed governance checks block', () => {
  const report=buildDocumentaryClosureReport(input({
    trackedPaths:['SUIVI.md','docs/NEW.md','PRODUCTION_STATE.json'],
    governanceCheckOk:false,
    changes:[{code:'R100',path:'docs/NEW.md',previousPath:'docs/OLD.md'}]
  }));
  assert.deepEqual(report.inventory.missing,['docs/NEW.md']);
  assert.deepEqual(report.inventory.absent,['docs/OLD.md']);
  assert.equal(report.status,'DOCUMENTARY_CLOSURE_BLOCKED');
  assert.equal(report.documents.find((d: {path:string}) => d.path==='docs/NEW.md').change,'R100');
  assert.ok(report.reasons.includes('DOCUMENT_GOVERNANCE_CHECK_NOT_SUCCESS'));
});

test('exact diff parses additions, deletion and rename without confusing paths', () => {
  assert.deepEqual(parseNameStatus('A\0docs/A.md\0D\0docs/D.md\0R100\0old.md\0new.md\0'),[
    {code:'A',path:'docs/A.md',previousPath:null},
    {code:'D',path:'docs/D.md',previousPath:null},
    {code:'R100',path:'new.md',previousPath:'old.md'}
  ]);
  for (const invalid of ['M\0x','R100\0old.md\0','M\0../x\0','M\0x\nbad\0']) assert.throws(()=>parseNameStatus(invalid));
});

test('duplicate and malformed inventory cannot produce closure', () => {
  const original = input();
  const report = buildDocumentaryClosureReport(input({inventory:{...original.inventory,trackedCount:3,entries:[...original.inventory.entries,original.inventory.entries[0]]}}));
  assert.equal(report.inventory.duplicates,true);
  assert.equal(report.status,'DOCUMENTARY_CLOSURE_BLOCKED');
  assert.throws(()=>buildDocumentaryClosureReport(input({inventory:null})));
});

test('post-deploy projection is mandatory on an attested run, read-only and separate from G1 repair', async () => {
  const source = await readFile('.github/workflows/mcp-deploy.yml','utf8');
  const closure = source.split('\n  documentary-closure:')[1]!;
  assert.ok(closure);
  assert.match(closure,/needs: deploy/);
  assert.match(closure,/needs\.deploy\.outputs\.g1-evidence != ''/);
  assert.match(closure,/fetch-depth: 0/);
  assert.match(closure,/permissions:\s*\n\s+contents: read/);
  assert.match(closure,/scripts\/mcp-documentary-closure\.mjs/);
  assert.match(closure,/actions\/upload-artifact@v4/);
  assert.doesNotMatch(closure,/id-token: write|pull-requests: write|contents: write|merge_pull_request/);
});

test('wrong inventory category is an explicit documentary drift, not alignment', () => {
  const fixture = input();
  const inventory = {...fixture.inventory, entries: fixture.inventory.entries.map(e => e.path === 'docs/OLD.md' ? {...e, category:'history'} : e)};
  const report = buildDocumentaryClosureReport(input({inventory}));
  assert.equal(report.status,'DOCUMENTARY_CLOSURE_BLOCKED');
  assert.deepEqual(report.inventory.categoryDrift,[{path:'docs/OLD.md',expected:'history',actual:'documentation'}]);
});

test('authority observation exposes canonical conflicts, broken mirror and invalid JSON without claiming full coverage', () => {
  const paths=['SUIVI.md','TASKS.md','TODO.md','DEPLOYMENT_PRODUCTION.md','MCP_ANTI_DISPERSION_GOVERNANCE.md',
    'docs/TASKS.md','.mcp/registry.json','PRODUCTION_STATE.json'];
  const state={repository:'Patricked-code/MCP',branch:'main',s1Root:'/opt/apps/mcp',fetchRemote:'git@github.com:Patricked-code/MCP.git',pushRemote:'disabled',container:'mcp'};
  const documents=new Map(paths.map(p=>[p,'# Test\n\n'+String.fromCharCode(96).repeat(3)+'canonical-state\n'+JSON.stringify(p==='TODO.md'?{...state,branch:'old'}:state)+'\n'+String.fromCharCode(96).repeat(3)+'\n']));
  documents.set('docs/TASKS.md','# Tasks\nNo authority banner');
  documents.set('.mcp/registry.json','{invalid');
  documents.set('PRODUCTION_STATE.json','{}');
  const result=observeDocumentAuthorities({trackedPaths:paths,productionState:{},readText:(p:string)=>documents.get(p)!});
  assert.equal(result.ok,false);
  assert.equal(result.coverage.complete,false);
  assert.ok(result.differences.some((d:{path:string,field:string,reason:string})=>d.path==='TODO.md'&&d.field==='branch'&&d.reason==='CANONICAL_STATE_CONFLICT'));
  assert.ok(result.differences.some((d:{path:string,reason:string})=>d.path==='.mcp/registry.json'&&d.reason==='JSON_INVALID_OR_UNREADABLE'));
  assert.ok(result.checks.some((d:{path:string,status:string})=>d.path==='docs/TASKS.md'&&d.status==='FAIL'));
  const report=buildDocumentaryClosureReport({...input(),authorityObservation:result});
  assert.equal(report.status,'DOCUMENTARY_CLOSURE_BLOCKED');
  assert.equal(report.closureAttested,false);
  assert.ok(report.reasons.includes('STATIC_AUTHORITY_PROOF_MISSING_OR_CONFLICT'));
  assert.equal(report.differences.length,result.differences.length);
});

test('every Git tree object is accounted for, including data outside docs, workflows, PDF and unknown formats', () => {
  const paths=['SUIVI.md','data/mcp-git-registry.json','.github/workflows/mcp-deploy.yml',
    'Migration/archive.pdf','docs/projects/WT-PROJECT-MCP-001/chantiers/CH-01/CH-01__TASKS.md','new/opaque.custom'];
  const tree=paths.map(p=>'100644 blob '+HEAD+' 10\t'+p+'\0').join('');
  const entries=parseTrackedTree(tree);
  const report=observeTrackedCorpus({entries,trackedPaths:paths,readText:(e:{path:string})=>e.path.endsWith('.json')?'{}':'text'});
  assert.equal(report.trackedCount,6);
  assert.equal(report.inventoryCoverageComplete,true);
  assert.equal(report.semanticCoverageComplete,false);
  assert.equal(report.candidateCount,5);
  assert.equal(report.structuralReadCount,4);
  assert.equal(report.identityOnlyCount,1);
  assert.equal(report.unknownImpactCount,1);
  assert.equal(report.rows.find((r:{path:string})=>r.path===paths[1]).role,'VERSIONED_DATA_NOT_RUNTIME_AUTHORITY');
  assert.equal(report.rows.find((r:{path:string})=>r.path===paths[4]).scopeHint,'CH-01');
  assert.equal(classifyTrackedPath('tests/fixtures/registry.json'),'TEST_FIXTURE');
  assert.throws(()=>observeTrackedCorpus({entries,trackedPaths:paths.slice(1),readText:()=>''}));
  assert.throws(()=>parseTrackedTree(tree+tree));
  assert.throws(()=>parseTrackedTree(tree.slice(0,-1)));
});
test('unreadable candidate and missing runtime proof prevent a false certification', () => {
  const paths=['data/registry.json','docs/secret.txt','docs/link.md'];
  const entries=parseTrackedTree('100644 blob '+HEAD+' 10\t'+paths[0]+'\0'+
    '100644 blob '+HEAD+' 10\t'+paths[1]+'\0'+'120000 blob '+HEAD+' 10\t'+paths[2]+'\0');
  let reads=0;
  const corpus=observeTrackedCorpus({entries,trackedPaths:paths,readText:()=>{reads++;return '{invalid';}});
  assert.equal(corpus.structuralUnverifiedCount,2);
  assert.equal(reads,2);
  const result=buildDocumentaryClosureReport({...input(),corpusObservation:corpus,
    g1:{status:'UNVERIFIED',reasonCodes:['G1_DOCUMENTATION_CONTRADICTIONS','unsafe output']}});
  assert.equal(result.closureAttested,false);
  assert.equal(result.status,'DOCUMENTARY_CLOSURE_BLOCKED');
  assert.deepEqual(result.g1ReasonCodes,['G1_DOCUMENTATION_CONTRADICTIONS']);
  assert.ok(result.reasons.includes('CORPUS_CONTENT_UNVERIFIED'));
});
