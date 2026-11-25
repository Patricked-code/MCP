import test from 'node:test';
import assert from 'node:assert/strict';
import type { GithubContinuityReader } from '../src/tools/missionContinuity.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-20261122-registry-p2';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { recoverMissionFromGithub, applyObservedMissionLiveState } = await import('../src/tools/missionContinuity.js');

const SHA='7f0ae4d35daec8d85a430b5280abd16eda6a42c8';
const P='WT-MCP-REGISTRY-RESOLUTION-20261121-01';
const C='WT-MCP-AUTONOMY-24X7-20261121-01';
const ROOT='docs/projects/WT-PROJECT-MCP-001/chantiers/'+P+'/';
const child=ROOT+'subchantiers/'+C+'/';
const old=[
  {path: ROOT+P+'__MISSION.md',content:'# Mission R01-R07\n'},
  {path: ROOT+P+'__DECISIONS.md',content:'# Décisions\n## D32 — History (21/11/2026)\n\nRecorded\n## D35 — Intake (22/11/2026)\n'},
  {path: ROOT+P+'__CONTINUITY.md',content:'# Continuity\n## NEXT_ACTION_CURRENT\nP2: inspect GitRegistry/CUG coverage\n'},
  {path: ROOT+P+'__ROADMAP.md',content:'# Roadmap\n'},
  {path: ROOT+P+'__IMPLEMENTATION_PLAN.md',content:'# Operations\nRG-001 to RG-056\n'},
  {path: child+C+'__MEMORY.md',content:'# Child memory should never bleed into parent\n'},
  {path: child+C+'__CONTINUITY.md',content:'# Child continuity\n**NEXT_ACTION** : child independent action\n'},
  {path: child+C+'__SUIVI.md',content:'# Child suivi\nNo action marker in this file\n'},
  {path: child+C+'__TASKS.md',content:'# Child tasks\n'}
];
function reader(files=old, privateRepo=false, comments: Record<string, unknown>[]=[]): GithubContinuityReader {
  return async endpoint => {
    if(endpoint==='/repos/Patricked-code/MCP') {
      return {ok:true,status:200,json:{id:1285534440,private:privateRepo,full_name:'Patricked-code/MCP'}};
    }
    if(endpoint==='/repos/Patricked-code/MCP/git/ref/heads/main') {
      return {ok:true,status:200,json:{object:{sha:SHA}}};
    }
    if(endpoint.startsWith('/repos/Patricked-code/MCP/issues/430/comments?')) {
      const page=Number(new URL('https://example.invalid'+endpoint).searchParams.get('page')||'1');
      return {ok:true,status:200,json:page===1?comments:[]};
    }
    const prefix='/repos/Patricked-code/MCP/contents/';
    if(endpoint.startsWith(prefix)) {
      const path=endpoint.slice(prefix.length).split('?ref=')[0]!.split('/').map(decodeURIComponent).join('/');
      let content: string | null = path==='docs/governance/markdown-inventory.json'
        ? JSON.stringify({schemaVersion:1,entries:files.map(x=>({path:x.path,category:'documentation'}))})
        : files.find(x=>x.path===path)?.content??null;
      if(content===null)return {ok:false,status:404,json:null};
      const bytes=Buffer.from(content);
      return {ok:true,status:200,json:{
        type:'file',encoding:'base64',size:bytes.length,sha:'stub-blob-'+path.length,
        content:bytes.toString('base64'),path
      }};
    }
    throw new Error('Unexpected test endpoint: '+endpoint);
  };
}
test('only canonical ID retrieves parent docs and dated decisions from an exact HEAD',async()=>{
  const result=await recoverMissionFromGithub(P,reader(),{observedAt:'2026-11-22T03:00:00.000Z'});
  assert.equal(result.status,'PARTIAL');
  assert.equal(result.continuityId,P);
  assert.equal(result.projectUid,'WT-PROJECT-MCP-001');
  assert.equal(result.parentContinuityId,null);
  assert.equal(result.sourceCommitSha,SHA);
  assert.equal(result.documentationIndex.length,5);
  assert.deepEqual(result.historicalDecisions.map(x=>x.id),['D32','D35']);
  assert.match(result.documentaryNextAction?.text??'',/NEXT_ACTION_CURRENT/);
  assert.equal(result.projectId,null);
  assert.deepEqual(result.realTaskIds,[]);
  assert.equal(result.automaticExecutionAuthorized,false);
  assert.ok(result.blockers.includes('CUG_INSTALLATION_NOT_ATTESTED'));
});
test('child lookup does not absorb parent decisions and has parent reference',async()=>{
  const result=await recoverMissionFromGithub(C,reader(),{observedAt:'2026-11-22T03:00:00.000Z'});
  assert.equal(result.parentContinuityId,P);
  assert.equal(result.documentationIndex.length,4);
  assert.deepEqual(result.historicalDecisions,[]);
  assert.ok(!result.documentationIndex.some(x=>x.path.includes(P+'__DECISIONS')));
  assert.match(result.documentaryNextAction?.text??'',/child independent action/);
  assert.ok(result.documentaryNextAction?.source.includes('__CONTINUITY.md'));
});
test('pagination replays same decision references without changing records',async()=>{
  const a=await recoverMissionFromGithub(P,reader(),{historyLimit:1,observedAt:'2026-11-22T03:00:00.000Z'});
  const b=await recoverMissionFromGithub(P,reader(),{historyLimit:1,historyOffset:1,observedAt:'2026-11-22T03:00:00.000Z'});
  assert.deepEqual(a.historicalDecisions.map(x=>x.id),['D32']);
  assert.equal(a.historyNextOffset,1);
  assert.deepEqual(b.historicalDecisions.map(x=>x.id),['D35']);
  assert.equal(b.historyNextOffset,null);
  assert.deepEqual(a,await recoverMissionFromGithub(P,reader(),{historyLimit:1,observedAt:'2026-11-22T03:00:00.000Z'}));
});
test('real-format bullet decisions D01–D31 and grouped D32–D34 are all indexed without losing successors',async()=>{
  const decisionText=[
    '# Mission decisions',
    '## Décisions portées par le mandat',
    '- D01 — Mission stable',
    '- D02 — Repository boundaries',
    '## Décisions additionnelles',
    '- **D09 — One mission.** Original mandate preserved',
    '## D32–D34 — reprise historique (21/11/2026)',
    '- **D32 — Anchor immutable**',
    '- **D33 — G1 not certified by document alone**',
    '- **D34 — E2 journal preserved**',
    '## D35 — Capture (22/11/2026)'
  ].join('\n');
  const docs=old.map(x=>x.path.endsWith(P+'__DECISIONS.md')
    ? {...x,content:decisionText}:x);
  const result=await recoverMissionFromGithub(P,reader(docs),{
    observedAt:'2026-11-22T03:00:00.000Z'
  });
  assert.deepEqual(result.historicalDecisions.map(x=>x.id),[
    'D01','D02','D09','D32','D33','D34','D35'
  ]);
  assert.match(result.historicalDecisions.find(x=>x.id==='D32')?.heading??'',/Anchor immutable/);
  assert.ok(result.historicalDecisions.every(x=>x.source.includes('#L')));
});

test('private repository is rejected even with server token to avoid cross-client data leakage',async()=>{
  await assert.rejects(()=>recoverMissionFromGithub(P,reader(old,true)),/CONTINUITY_REPOSITORY_AUTHORITY_UNVERIFIED/);
});
test('unknown ID is not invented; stays NOT_FOUND with no authority or task',async()=>{
  const result=await recoverMissionFromGithub('OTHER-UNKNOWN-CONT-001',reader());
  assert.equal(result.status,'NOT_FOUND');
  assert.equal(result.projectUid,null);
  assert.equal(result.automaticExecutionAuthorized,false);
});
test('two conflicting path ownership claims are rejected, not mapped by name',async()=>{
  const duplicated=[
    ...old,
    {path:'docs/projects/ANOTHER-UID/chantiers/'+P+'/'+P+'__MEMORY.md',content:'bad alias'}
  ];
  await assert.rejects(()=>recoverMissionFromGithub(P,reader(duplicated)),/CONTINUITY_DOCUMENT_IDENTITY_CONFLICT/);
});
test('missing or forbidden sources never produce successful recovery',async()=>{
  const bad: GithubContinuityReader=async endpoint => endpoint.endsWith('/contents/'+encodeURIComponent('docs/governance/markdown-inventory.json')+'?ref='+SHA)
    ? {ok:false,status:403,json:null}: {ok:false,status:403,json:null};
  await assert.rejects(()=>recoverMissionFromGithub(P,bad),/CONTINUITY_GITHUB_INACCESSIBLE/);
});
test('invalid offset and Continuity ID are rejected before any network requests',async()=>{
  const deny: GithubContinuityReader=async()=>{throw new Error('UNEXPECTED_NETWORK_REQUEST');};
  await assert.rejects(()=>recoverMissionFromGithub('../bad',deny),/CONTINUITY_ID_INVALID/);
  await assert.rejects(()=>recoverMissionFromGithub(P,deny,{historyLimit:101}),/CONTINUITY_HISTORY_PAGE_INVALID/);
});


test('child A24-01…A24-10 decisions, local mandate and inherited parent authorities remain separate',async()=>{
  const localTypes=[
    'AGENTS','ARCHITECTURE','CARTOGRAPHY','CONTINUITY','DECISIONS',
    'EVIDENCE_INDEX','MANDATE','MEMORY','ROADMAP','SOURCE_OF_TRUTH',
    'SUIVI','TASKS','TODO'
  ];
  const docs=[
    ...old.filter(x=>x.path.startsWith(ROOT)&&!x.path.includes('/subchantiers/')),
    {path:ROOT+P+'__DOCUMENT_AUTHORITIES.md',content:'# Parent document authorities'},
    ...localTypes.map(type=>({path:child+C+'__'+type+'.md',content:
      type==='DECISIONS'
        ? '# Child decisions\n'+Array.from({length:10},(_,i)=>
            '- A24-'+String(i+1).padStart(2,'0')+' — Child-only decision').join('\n')
        : type==='TASKS'
        ? '| Groupe documentaire | Références parent |\n|---|---|\n| HOST_PREPARATION | RG-046–047 |\n'
        : type==='CONTINUITY'
        ? '# Child continuity\n**NEXT_ACTION** : audit isolation U02\n'
        : '# '+type+'\n'}))
  ].filter((x,i,a)=>a.findIndex(y=>y.path===x.path)===i);
  const parent=await recoverMissionFromGithub(P,reader(docs),{observedAt:'2026-11-22T03:00:00.000Z'});
  const result=await recoverMissionFromGithub(C,reader(docs),{observedAt:'2026-11-22T03:00:00.000Z'});
  assert.equal(result.parentContinuityId,P);
  assert.equal(result.documentationIndex.length,13);
  assert.deepEqual(result.historicalDecisions.map(x=>x.id),
    Array.from({length:10},(_,i)=>'A24-'+String(i+1).padStart(2,'0')));
  assert.ok(result.historicalDecisions.every(x=>x.source.includes('/subchantiers/')));
  assert.equal(result.inheritedDocumentationIndex.length,3);
  assert.ok(result.inheritedDocumentationIndex.every(x=>x.ownerContinuityId===P&&x.inherited));
  assert.ok(result.inheritedDocumentationIndex.every(x=>!x.path.includes('/subchantiers/')));
  assert.ok(!result.missingAuthorities.some(x=>x.startsWith('DOCUMENT_MISSING:')));
  assert.deepEqual(result.workPackages.map(x=>x.id),['HOST_PREPARATION']);
  assert.ok(parent.historicalDecisions.every(x=>x.id.startsWith('D')));
  assert.ok(parent.documentationIndex.every(x=>!x.path.includes('/subchantiers/')));
  assert.match(result.documentaryNextAction?.text??'',/audit isolation U02/);
  assert.equal(result.projectId,null);
  assert.deepEqual(result.realTaskIds,[]);
  assert.equal(result.automaticExecutionAuthorized,false);
});

test('NEXT_ACTION_CURRENT marker defeats historical comparison tables',async()=>{
  const suivi=[
    '# Mission SUIVI',
    '## Variations de priorité et historique',
    '| Ancienne prochaine action | Nouvelle prochaine action |',
    '|---|---|',
    '| G1 | P2 |',
    '',
    '## NEXT_ACTION_CURRENT — scope mission',
    '**Opération :** vérifier Project Binding/CUG, puis recette de continuité.',
    '',
    '## Protocole de tenue',
    'historique'
  ].join('\n');
  const docs=[...old,{path:ROOT+P+'__SUIVI.md',content:suivi}];
  const result=await recoverMissionFromGithub(P,reader(docs),{
    observedAt:'2026-11-22T03:00:00.000Z'
  });
  assert.match(result.documentaryNextAction?.text??'',/NEXT_ACTION_CURRENT/);
  assert.match(result.documentaryNextAction?.text??'',/Project Binding\/CUG/);
  assert.ok(!result.documentaryNextAction?.text.includes('Ancienne prochaine action'));
  assert.ok(result.documentaryNextAction?.source.endsWith('__SUIVI.md#L7'));
  assert.equal(result.documentaryNextAction?.verification,'DECLARED');
});

test('canonical #430 source checkpoint is verified but its claims stay DECLARED',async()=>{
  const checkpoint={
    id:7073160993,created_at:'2026-11-22T02:50:11Z',
    user:{login:'Patricked-code'},
    body:'### Checkpoint final D39 — WT-MCP-REGISTRY-RESOLUTION-20261121-01\n'
      +'**NEXT_ACTION_CURRENT** : découvrir Project Binding et CUG avant toute écriture'
  };
  const spoof={...checkpoint,id:7074000000,user:{login:'unknown-user'}};
  const docsWithoutCurrentAction=old.map(x=>x.path.endsWith(P+'__CONTINUITY.md')
    ? {...x,content:'# Continuity without a current-action marker'}:x);
  const result=await recoverMissionFromGithub(P,reader(docsWithoutCurrentAction,false,[checkpoint,spoof]),{
    observedAt:'2026-11-22T03:00:00.000Z'
  });
  assert.equal(result.latestVerifiedCheckpoint?.id,'7073160993');
  assert.equal(result.checkpointHistory.length,1);
  assert.equal(result.latestVerifiedCheckpoint?.sourceVerification,'VERIFIED');
  assert.equal(result.latestVerifiedCheckpoint?.claimsVerification,'DECLARED');
  assert.equal(result.documentaryNextAction?.verification,'DECLARED');
  assert.match(result.documentaryNextAction?.text??'',/découvrir Project Binding/);
  assert.ok(!result.blockers.includes('VERIFIED_CHECKPOINT_MISSING'));
  const childResult=await recoverMissionFromGithub(C,reader(old,false,[checkpoint]),{
    observedAt:'2026-11-22T03:00:00.000Z'
  });
  assert.equal(childResult.latestVerifiedCheckpoint,null);
  assert.equal(childResult.checkpointHistory.length,0);
});

test('live state clears NOT_OBSERVED on readback, never promotes task or action permissions',async()=>{
  const result=await recoverMissionFromGithub(P,reader(),{
    observedAt:'2026-11-22T03:00:00.000Z'
  });
  assert.ok(result.missingAuthorities.includes('LIVE_STATE_NOT_OBSERVED'));
  const current={
    stateVersion:1458,observedAt:'2026-11-22T02:55:00.000Z',
    freshness:'CURRENT',alignment:'FULLY_ALIGNED',
    githubHead:SHA,s1Head:SHA,runtimeRevision:SHA,runtimeHealth:'healthy'
  };
  const merged=applyObservedMissionLiveState(result,current);
  assert.ok(!merged.missingAuthorities.includes('LIVE_STATE_NOT_OBSERVED'));
  assert.ok(!merged.blockers.includes('LIVE_STATE_NOT_OBSERVED'));
  assert.equal(merged.liveState?.stateVersion,1458);
  assert.equal(merged.documentaryNextAction?.verification,'DECLARED');
  assert.equal(merged.projectId,null);
  assert.deepEqual(merged.realTaskIds,[]);
  assert.equal(merged.automaticExecutionAuthorized,false);
  const stale=applyObservedMissionLiveState(result,{
    ...current,freshness:'STALE',githubHead:'a'.repeat(40)
  });
  assert.ok(stale.blockers.includes('LIVE_STATE_STALE'));
  assert.ok(stale.blockers.includes('GITHUB_LIVE_SHA_MISMATCH'));
  assert.equal(stale.automaticExecutionAuthorized,false);
});

test('scoped SUIVI current action takes precedence over an older checkpoint declaration',async()=>{
  const checkpoint={
    id:7073160993,created_at:'2026-11-22T02:50:11Z',user:{login:'Patricked-code'},
    body:'### Checkpoint D39 — WT-MCP-REGISTRY-RESOLUTION-20261121-01\n'
      +'**NEXT_ACTION_CURRENT** : historical action only'
  };
  const files=[...old,{path:ROOT+P+'__SUIVI.md',
    content:'# SUIVI\n## NEXT_ACTION_CURRENT — current scope\n'
      +'**Opération :** latest scoped action (no Task admission)\n'}];
  const result=await recoverMissionFromGithub(P,reader(files,false,[checkpoint]),{
    observedAt:'2026-11-22T03:00:00.000Z'
  });
  assert.equal(result.latestVerifiedCheckpoint?.id,'7073160993');
  assert.match(result.documentaryNextAction?.text??'',/latest scoped action/);
  assert.ok(!result.documentaryNextAction?.text.includes('historical action only'));
  assert.equal(result.documentaryNextAction?.verification,'DECLARED');
});
