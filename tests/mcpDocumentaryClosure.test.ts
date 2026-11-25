import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
// The workflow report is a standalone dependency-free ESM script.
// @ts-ignore -- test runner imports the .mjs implementation directly.
import { buildDocumentaryClosureReport, parseNameStatus, observeDocumentAuthorities, parseTrackedTree, observeTrackedCorpus, classifyTrackedPath, compareLiveAuthorities, observeHistoricalPreservation, verifyCartographyProfiles, validateRuntimeAuthorityObservation } from '../scripts/mcp-documentary-closure.mjs';

const HEAD = 'a'.repeat(40);
const BASE = 'b'.repeat(40);
function input(overrides = {}) {
  return {
    headSha: HEAD, baselineSha: BASE,
    trackedPaths: ['SUIVI.md', 'docs/OLD.md', '.mcp/registry.json', 'PRODUCTION_STATE.json', 'src/index.ts'],
    inventory: {schemaVersion: 1, trackedCount: 2, categories: {canonical: 1, documentation: 1}, entries: [
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
  assert.match(closure,/needs: \[deploy, reobserve-documentation\]/);
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

test('live authority mismatch names exact field; a matching digest never certifies unknown runtime stores',()=>{
  const now=Date.now(),d='d'.repeat(64);
  const existingEvidence={ok:true,evidenceHead:HEAD,sourceDigest:d,documentationDigest:d,governanceDigest:d,
    testSuiteDigest:d,catalogueDigest:d,toolCount:159};
  const g1={status:'ALIGNED',authorityEvidence:{schemaVersion:1,sha:HEAD,observedAt:new Date(now).toISOString(),stateVersion:5,
    inventoryDigest:d,documentationDigest:d,governanceDigest:d,testSuiteDigest:d,catalogueDigest:d,toolCount:160}};
  const conflict=compareLiveAuthorities({headSha:HEAD,g1,existingEvidence,now});
  assert.equal(conflict.bound,true);
  assert.equal(conflict.matchedCount,5);
  assert.equal(conflict.differences.length,1);
  assert.equal(conflict.differences[0].path,'.mcp/function-cartography.json');
  assert.equal(conflict.differences[0].field,'toolCount');
  assert.equal(conflict.differences[0].observed,160);
  assert.equal(conflict.complete,false);
  assert.ok(conflict.unresolvedRuntime.every((r:{status:string})=>r.status==='UNVERIFIED'));
  const report=buildDocumentaryClosureReport({...input(),g1,existingEvidence});
  assert.equal(report.status,'DOCUMENTARY_CLOSURE_BLOCKED');
  assert.equal(report.closureAttested,false);
  const matched=compareLiveAuthorities({headSha:HEAD,g1:{...g1,authorityEvidence:{...g1.authorityEvidence,toolCount:159}},existingEvidence,now});
  assert.equal(matched.matchedCount,6);
  assert.equal(matched.complete,false);
  for(const proof of [undefined,{...g1.authorityEvidence,sha:BASE},{...g1.authorityEvidence,observedAt:new Date(now-901000).toISOString()}]) {
    const invalid=compareLiveAuthorities({headSha:HEAD,g1:{...g1,authorityEvidence:proof},existingEvidence,now});
    assert.equal(invalid.bound,false);
    assert.equal(invalid.matchedCount,0);
  }
});

test('documentary certification job cannot succeed on pending or blocked closure reports',async()=>{
  const source=await readFile('.github/workflows/mcp-deploy.yml','utf8');
  const job=source.split('\n  documentary-closure:')[1]!;
  assert.match(job,/Enforce explicit documentary certification verdict/);
  assert.match(job,/DOCUMENTARY_CLOSURE_STATUS.*!= 'DOCUMENTARY_CLOSURE_ATTESTED'/);
  assert.match(job,/exit 1/);
  assert.match(job,/continue-on-error: true/);
});

test('historical preservation binds exact archive and provenance bytes without verifying their content',()=>{
  const archive=Buffer.from([0,255,1,2]), source=Buffer.from('Archive is non-executable');
  const oid=(b:Buffer)=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
  const paths=['docs/audits/original.md','docs/audits/README.md'];
  const bytes=new Map([[paths[0],archive],[paths[1],source]]);
  const entries=paths.map(p=>({path:p,mode:'100644',type:'blob',oid:oid(bytes.get(p)!),size:bytes.get(p)!.length}));
  const obligations=[{path:paths[0],oid:oid(archive),kind:'CORRUPTED_FORENSIC_ORIGINAL',sources:[[paths[1],oid(source)]]}];
  const readBytes=(e:{path:string})=>bytes.get(e.path)!;
  const proof=observeHistoricalPreservation({entries,readBytes,obligations})[0];
  assert.equal(proof.preservationStatus,'PRESERVED_NON_EXECUTABLE');
  assert.equal(proof.historicalContentVerified,false);
  assert.equal(proof.currentAuthority,false);
  const report=observeTrackedCorpus({entries,trackedPaths:paths,readText:(e:{path:string})=>bytes.get(e.path)!.toString('utf8'),readBytes,historicalObligations:obligations});
  assert.equal(report.structuralUnverifiedCount,1);
  assert.equal(report.unresolvedStructuralCount,0);
  assert.equal(report.historicalPreservedCount,1);
  assert.equal(report.semanticCoverageComplete,false);
  bytes.set(paths[1],Buffer.from('replacement'));
  assert.equal(observeHistoricalPreservation({entries,readBytes,obligations})[0].preservationStatus,'UNVERIFIED');
  assert.equal(classifyTrackedPath('.env.example'),'INFRASTRUCTURE_CONFIGURATION_IMPACT');
  assert.equal(classifyTrackedPath('Dockerfile'),'INFRASTRUCTURE_CONFIGURATION_IMPACT');
});
test('real cartography generation produces a distinct exact HTTP profile and preserves the baseline',()=>{
  function generate(args:string[]) {
    const result=spawnSync(process.execPath,['--import','tsx','scripts/emit-function-cartography.ts',...args],{
      encoding:'utf8',maxBuffer:8*1024*1024,timeout:45000});
    assert.equal(result.error,undefined);
    assert.equal(result.status,0,result.stderr);
    return JSON.parse(result.stdout);
  }
  const standalone=generate([]),httpRuntime=generate(['--http-runtime']);
  const verified=verifyCartographyProfiles({versioned:standalone,standalone,httpRuntime});
  assert.equal(verified.ok,true);
  assert.equal(verified.httpCount,verified.standaloneCount+1);
  assert.notEqual(verified.httpDigest,verified.standaloneDigest);
  assert.deepEqual(verified.added,['mcp_issue_plesk_web_pairing_proof']);
  const invalid=verifyCartographyProfiles({versioned:standalone,standalone,httpRuntime:{...httpRuntime,tools:httpRuntime.tools.map((x:{name:string})=>x.name==='mcp_issue_plesk_web_pairing_proof'?{...x,name:'unknown_tool'}:x)}});
  assert.equal(invalid.ok,false);
});

test('runtime evidence is exact-job bound, digest checked and never implies semantic closure',async()=>{
  const {observeDocumentaryRuntimeAuthorities}=await import('../src/deploy/documentaryRuntimeEvidence.js');
  const {createEmptyTaskStoreDocument,createEmptySessionStoreDocument,createEmptyLockStoreDocument}=await import('../src/operationalMemory/types.js');
  const now=Date.now(),d='d'.repeat(64),jobId='mcp-s1-123-'+HEAD.slice(0,12);
  const runtimeEvidence=await observeDocumentaryRuntimeAuthorities({sha:HEAD,jobId,stateVersion:5,now:()=>now,readers:{
    registry:async()=>({available:true,sourceSchemaVersion:1,digest:d,candidateDigest:d,mappings:[],projects:[],activationReadiness:[]}),
    tasks:async()=>createEmptyTaskStoreDocument(),sessions:async()=>createEmptySessionStoreDocument(),locks:async()=>createEmptyLockStoreDocument()
  }});
  const g1={status:'ALIGNED',authorityEvidence:{stateVersion:5},runtimeEvidence};
  const verified=validateRuntimeAuthorityObservation({headSha:HEAD,g1,expectedJobId:jobId,now});
  assert.equal(verified.status,'OBSERVED');assert.equal(verified.semanticCoverageComplete,false);
  assert.equal(validateRuntimeAuthorityObservation({headSha:HEAD,g1,expectedJobId:'other',now}),null);
  assert.equal(validateRuntimeAuthorityObservation({headSha:HEAD,g1:{...g1,runtimeEvidence:{...runtimeEvidence,stableRead:false}},expectedJobId:jobId,now}),null);
});

test('routes archive, drift and conflicting fields without certifying their semantics', () => {
  const path = 'docs/OLD.md';
  const archive = {path, archiveVerified:true, preservationStatus:'PRESERVED_NON_EXECUTABLE',
    currentAuthority:false, nextAction:'PRESERVE_BYTES_AND_USE_CURRENT_AUTHORITY'};
  const options = {corpusObservation:{historicalPreservation:[archive]},
    g1:{status:'DRIFT',sha:HEAD,declaredGithubSha:BASE,declaredS1Sha:BASE}};
  const find = (report: ReturnType<typeof buildDocumentaryClosureReport>, name: string) =>
    report.documents.find((row: {path:string}) => row.path === name);
  const report = buildDocumentaryClosureReport(input(options));
  assert.equal(find(report,path).verdict,'HISTORICAL_PRESERVATION');
  assert.equal(find(report,'SUIVI.md').verdict,'UNVERIFIED');
  const production = find(report,'PRODUCTION_STATE.json');
  assert.equal(production.verdict,'RECONCILIATION_REQUIRED');
  assert.equal(production.differences.length,2);
  const difference = {path,field:'digest',reason:'CANONICAL_STATE_CONFLICT'};
  const conflict = buildDocumentaryClosureReport(input({...options,
    authorityObservation:{checks:[],differences:[difference],ok:false}}));
  assert.equal(find(conflict,path).verdict,'CONFLICT');
  assert.deepEqual(find(conflict,path).differences,[difference]);
  assert.equal(find(conflict,path).semanticStatus,'UNVERIFIED');
  assert.equal(conflict.closureAttested,false);
  const unavailable = buildDocumentaryClosureReport(input({
    corpusObservation:{historicalPreservation:[{...archive,archiveVerified:false}]}}));
  assert.equal(find(unavailable,path).verdict,'UNVERIFIED');
});

test('an unreadable source cannot become a conflict or an eligible G1 correction', () => {
  const report = buildDocumentaryClosureReport(input({
    g1:{status:'DRIFT',sha:HEAD,declaredGithubSha:BASE,declaredS1Sha:BASE},
    authorityObservation:{checks:[],ok:false,differences:[{
      path:'PRODUCTION_STATE.json',field:'$state',reason:'PRODUCTION_STATE_REFERENCE_UNAVAILABLE'
    }]}
  }));
  const row = report.documents.find((doc: {path:string}) => doc.path === 'PRODUCTION_STATE.json');
  assert.equal(row.verdict,'UNVERIFIED');
  assert.equal(row.nextAction,'RESOLVE_OWNER_AND_VALIDATE_IMPACT');
  assert.equal(row.differences.length,3);
});

test('routes Markdown inventory drift to its owner and keeps unclassified paths pending qualification', () => {
  const fixture = input();
  const owner = 'docs/governance/markdown-inventory.json';
  const trackedPaths = [...fixture.trackedPaths, owner];
  const row = (paths: string[], inventory: typeof fixture.inventory) =>
    buildDocumentaryClosureReport(input({trackedPaths: paths, inventory})).documents
      .find((doc: {path: string}) => doc.path === owner);
  const valid = row(trackedPaths, fixture.inventory);
  assert.equal(valid.inventoryEvidence.status, 'MATCHED');
  assert.equal(valid.inventoryEvidence.headSha, HEAD);
  assert.equal(valid.semanticStatus, 'UNVERIFIED');

  const wrongCounts = row(trackedPaths, {...fixture.inventory, categories: {canonical: 2, documentation: 0}});
  assert.equal(wrongCounts.verdict, 'UPDATE_REQUIRED');
  assert.deepEqual(wrongCounts.inventoryEvidence.observedCategories, {canonical: 1, documentation: 1});

  const drift = row([...trackedPaths, 'docs/NEW.md'], fixture.inventory);
  assert.equal(drift.verdict, 'UPDATE_REQUIRED');
  assert.equal(drift.inventoryEvidence.status, 'DRIFT');
  assert.equal(drift.inventoryEvidence.observedMarkdownCount, 3);

  const unknown = row([...trackedPaths, 'unclassified/NEW.md'], fixture.inventory);
  assert.equal(unknown.verdict, 'UNVERIFIED');
  assert.equal(unknown.inventoryEvidence.status, 'QUALIFICATION_REQUIRED');
});

test('checks each historical memory manifest reference against Git without updating the archive', () => {
  const path = 'memory/manifest.json';
  const trackedPaths = [path, 'memory/old.md'];
  const observe = (files: unknown) => observeDocumentAuthorities({
    trackedPaths, productionState: null,
    readText: () => JSON.stringify({files})
  });
  assert.equal(observe(['memory/old.md']).checks.find((c: {check: string}) =>
    c.check === 'MEMORY_MANIFEST_REFERENCES').status, 'PASS');
  for (const files of [[], null, ['memory/old.md','memory/old.md'], ['../private'], ['memory/missing.md']]) {
    const result = observe(files);
    assert.ok(result.differences.some((d: {path: string, field: string}) =>
      d.path === path && d.field.startsWith('files')));
    assert.equal(result.coverage.complete, false);
  }
});

test('partial program proof independently compares exact blob digest and keeps GWC/UAC unverified',async()=>{
  const {observeDocumentaryRuntimeAuthorities}=await import('../src/deploy/documentaryRuntimeEvidence.js');
  const {createEmptyTaskStoreDocument,createEmptySessionStoreDocument,createEmptyLockStoreDocument}=await import('../src/operationalMemory/types.js');
  const now=Date.now(),d='d'.repeat(64),jobId='mcp-s1-123-'+HEAD.slice(0,12);
  const program={status:'OBSERVED' as const,coverage:'PROGRAM_BACKLOG_ONLY' as const,sourceVersion:2 as const,
    recordCount:94,digest:d,readinessStatus:'MATCHED' as const,readinessDriftCount:0};
  const runtimeEvidence=await observeDocumentaryRuntimeAuthorities({sha:HEAD,jobId,stateVersion:5,now:()=>now,readers:{
    registry:async()=>({available:true,sourceSchemaVersion:1,digest:d,candidateDigest:d,mappings:[],projects:[],activationReadiness:[]}),
    tasks:async()=>createEmptyTaskStoreDocument(),sessions:async()=>createEmptySessionStoreDocument(),
    locks:async()=>createEmptyLockStoreDocument(),programBacklog:async()=>program
  }});
  const authorityEvidence={schemaVersion:1,sha:HEAD,stateVersion:5,observedAt:new Date(now).toISOString(),
    inventoryDigest:d,documentationDigest:d,governanceDigest:d,testSuiteDigest:d,catalogueDigest:d,toolCount:160};
  const existingEvidence={ok:true,evidenceHead:HEAD,sourceDigest:d,documentationDigest:d,governanceDigest:d,
    testSuiteDigest:d,catalogueDigest:d,toolCount:160,programBacklogDigest:d};
  const g1={status:'ALIGNED',authorityEvidence,runtimeEvidence};
  const matched=compareLiveAuthorities({headSha:HEAD,g1,existingEvidence,expectedJobId:jobId,now});
  assert.equal(matched.matchedCount,6);assert.equal(matched.programBacklogComparison.status,'MATCHED');
  assert.equal(matched.programBacklogComparison.gwcCoverage,'UNVERIFIED');
  assert.equal(matched.programBacklogComparison.uacCoverage,'UNVERIFIED');
  assert.equal(matched.complete,false);
  const mismatch=compareLiveAuthorities({headSha:HEAD,g1,existingEvidence:{...existingEvidence,programBacklogDigest:'e'.repeat(64)},expectedJobId:jobId,now});
  assert.equal(mismatch.programBacklogComparison.status,'CONFLICT');
  assert.equal(mismatch.differences[0].path,'docs/governance/program-backlog-convergence.json');
  const unavailable=compareLiveAuthorities({headSha:HEAD,g1,existingEvidence,expectedJobId:'wrong',now});
  assert.equal(unavailable.programBacklogComparison.status,'UNVERIFIED');
  const tampered={...g1,runtimeEvidence:{...runtimeEvidence,programBacklog:{...program,recordCount:95}}};
  assert.equal(validateRuntimeAuthorityObservation({headSha:HEAD,g1:tampered,expectedJobId:jobId,now}),null);
});
