import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
// The workflow report is a standalone dependency-free ESM script.
// @ts-ignore -- test runner imports the .mjs implementation directly.
import { buildDocumentaryClosureReport, parseNameStatus } from '../scripts/mcp-documentary-closure.mjs';

const HEAD = 'a'.repeat(40);
const BASE = 'b'.repeat(40);
function input(overrides = {}) {
  return {
    headSha: HEAD, baselineSha: BASE,
    trackedPaths: ['SUIVI.md', 'docs/OLD.md', '.mcp/registry.json', 'PRODUCTION_STATE.json', 'src/index.ts'],
    inventory: {schemaVersion: 1, trackedCount: 2, entries: [
      {path:'SUIVI.md',category:'canonical'}, {path:'docs/OLD.md',category:'history'}
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
