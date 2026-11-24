// REC-00/01: evidence projection, not a new registry or a write authority.
import { execFileSync } from 'node:child_process';
import { writeFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { collectCurrentStateEvidence } from './current-state-evidence.mjs';
import { buildCommonDocumentaryPlan, observeLoopbackCheckpoint } from './documentary-hierarchy.mjs';
import { deriveLoopbackCandidate } from './documentary-loopback.mjs';
import { validateMarkdownBaseline, extractCanonicalState, validateRequiredCanonicalStates,
  validateProductionState, detectHistoricalMirrors, validateHistoricalMirrorBanner, canonicalStateKeys }
  from './doc-governance-lib.mjs';

const SHA = /^[a-f0-9]{40}$/;
const REPO = 'Patricked-code/MCP';
const INVENTORY = 'docs/governance/markdown-inventory.json';
const PRODUCTION = 'PRODUCTION_STATE.json';
const LIMIT = 20000;
const MAX_BUFFER = 8 * 1024 * 1024;
// Do not filter on a fixed list of folders. Every tracked object is inventoried;
// classification is a routing hint, never a proof that a file is non-impacting.
const isCandidate = p => /\.(?:md|json|ya?ml|txt|csv|tsv|xml|pdf|docx?|xlsx?|toml|ini|rst|adoc)$/i.test(p) ||
  /^(?:docs\/|\.mcp\/|memory\/|wealthtech_project_memory\/|Migration\/|data\/)/.test(p);
const SENSITIVE_PATH = /(^|\/)(?:\.env(?:\.|$)|secrets?|credentials?)(?:\/|$)/iu;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validPath = p => typeof p === 'string' && p.length > 0 && p.length <= 1024 &&
  !/[\x00-\x1f\x7f]/.test(p) && !p.startsWith('/') && !p.split('/').some(x => x === '' || x === '.' || x === '..');

export function parseTrackedTree(raw) {
  if (typeof raw !== 'string' || (raw !== '' && !raw.endsWith('\0'))) throw Error('TREE_TRUNCATED');
  const seen=new Set();
  const entries=[];
  for(const row of raw ? raw.slice(0,-1).split('\0') : []) {
    const tab=row.indexOf('\t');
    const meta=tab < 0 ? [] : row.slice(0,tab).trim().split(/\s+/);
    const [mode,type,oid,size]=meta;
    const path=tab<0?'':row.slice(tab+1);
    if(meta.length!==4 || !/^[0-9]{6}$/.test(mode??'') || !['blob','commit'].includes(type) ||
       !SHA.test(oid??'') || !validPath(path) || seen.has(path) ||
       (type==='blob' && (!/^\d+$/.test(size??'') || !Number.isSafeInteger(Number(size)))) ||
       (type==='commit' && size!=='-')) throw Error('TREE_ENTRY_INVALID');
    seen.add(path);
    entries.push({path,mode,type,oid,size:size==='-'?null:Number(size)});
    if(entries.length>LIMIT) throw Error('TREE_LIMIT_EXCEEDED');
  }
  return entries.sort((a,b)=>a.path.localeCompare(b.path));
}

export function classifyTrackedPath(path) {
  if(!validPath(path)) throw Error('TREE_ENTRY_INVALID');
  if(/^(?:tests\/fixtures\/|capsules\/[^/]+\/test\/)/.test(path)) return 'TEST_FIXTURE';
  if(/^docs\/projects\//.test(path)) return 'SCOPED_PROJECT_DOCUMENT';
  if(/^\.mcp\//.test(path)) return 'VERSIONED_GOVERNANCE';
  if(/^data\//.test(path)) return 'VERSIONED_DATA_NOT_RUNTIME_AUTHORITY';
  if(/^(?:docs\/history\/|docs\/audits\/|docs\/reports\/|Migration\/)/.test(path)) return 'HISTORICAL_EVIDENCE_CANDIDATE';
  if(/^(?:memory\/|wealthtech_project_memory\/|docs\/gwc\/canonical-memory\/)/.test(path)) return 'MEMORY_CANDIDATE';
  if(/^(?:\.github\/workflows\/)/.test(path)) return 'WORKFLOW_CONTRACT';
  if(path===PRODUCTION) return 'PRODUCTION_DECLARATION';
  if(/^(?:Dockerfile|\.gitignore|\.env\.example|\.devcontainer\/[^/]+)$/.test(path)) return 'INFRASTRUCTURE_CONFIGURATION_IMPACT';
  if(/^docs\//.test(path) || /\.md$/i.test(path)) return 'DOCUMENT_CANDIDATE';
  if(isCandidate(path)) return 'STRUCTURED_OR_DOCUMENT_CANDIDATE';
  if(/^(?:src\/|scripts\/|tests\/|capsules\/)/.test(path)) return 'IMPLEMENTATION_OR_TEST_IMPACT';
  return 'UNCLASSIFIED_IMPACT';
}

// These are explicit preservation obligations from existing historical
// authorities, not exemptions based on a filename extension or a directory.
// Pin both archive and provenance blobs; any change requires requalification.
// Preserve bytes only: never claim historical content or missing source
// conversations have been semantically verified.
const HISTORICAL_PRESERVATION = Object.freeze([
  {path:'docs/audits/2026-08-05/MCP_REGISTRY_UPDATE_WORKFLOW.corrupted-original.md',
    oid:'a4a16b472b5dd524c8baabd36fdea38da46a28ce',kind:'CORRUPTED_FORENSIC_ORIGINAL',
    sources:[['docs/audits/2026-08-05/README.md','e65bd18de56a2fc21f1d6764c62d9229b0b28137'],
      ['docs/audits/2026-08-05/MCP_REGISTRY_UPDATE_WORKFLOW.md','f4dfa52f11ff3c52b2fd48d3df965f09ce069bf9']]},
  {path:'Migration/conversation_migration_disponible.pdf',oid:'bea5e4dd670431c459f27f93736bc0cabce2b3dc',
    kind:'HISTORICAL_CONSOLIDATION_PDF',
    sources:[['Migration/README.md','0ae43622050f554ad02532387cbcc7bae51e054b'],
      ['Migration/03_MANIFESTE_SOURCES.md','c4c9949014e5b353e61e31b473a2a5d819f58fbd']]},
  ...[['01','6550cd2785c7da9c2fe706bb0af741519e1cde59'],['02','bce8b82cee52b37fba50f4fe8db08401f7370029']].map(([part,oid])=>({
    path:'Migration/PDF/conversation_migration_part_'+part+'_of_05_2026-07-04.pdf',oid,kind:'PARTIAL_MIGRATION_ARCHIVE_PDF',
    sources:[['Migration/PDF/README.md','e3ac35ad9438fc5a7d26ce8c400746957c6fbf8d'],
      ['Migration/PDF/UPLOAD_STATUS_2026-07-04.md','caa9e4607222f39f6f8cc02c82ebb95470d3d30c']]
  }))
]);
export function observeHistoricalPreservation({entries,readBytes,obligations=HISTORICAL_PRESERVATION}) {
  const byPath=new Map(entries.map(e=>[e.path,e]));
  function verifyBlob(path,oid) {
    const entry=byPath.get(path);
    if(!entry||entry.oid!==oid||entry.type!=='blob'||!['100644','100755'].includes(entry.mode)||
      !SHA.test(oid)||SENSITIVE_PATH.test(path)||!readBytes) return false;
    try {
      const bytes=readBytes(entry);
      return Buffer.isBuffer(bytes)&&bytes.length===entry.size&&
        createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')===oid;
    } catch {return false;}
  }
  return obligations.map(o=>{
    const archiveVerified=verifyBlob(o.path,o.oid);
    const sources=o.sources.map(([path,oid])=>({path,oid,verified:verifyBlob(path,oid)}));
    const preserved=archiveVerified&&sources.length>0&&sources.every(x=>x.verified);
    return {path:o.path,oid:o.oid,kind:o.kind,sources,archiveVerified,
      preservationStatus:preserved?'PRESERVED_NON_EXECUTABLE':'UNVERIFIED',
      historicalContentVerified:false,currentAuthority:false,
      nextAction:preserved?'PRESERVE_BYTES_AND_USE_CURRENT_AUTHORITY':'REQUALIFY_HISTORICAL_SOURCE'};
  });
}

// Inventory coverage is distinct from semantic reconciliation coverage.
// Even a binary, symlink, submodule or unknown format gets an explicit row.
export function observeTrackedCorpus({entries, trackedPaths, readText, readBytes, historicalObligations}) {
  const entriesByPath=new Map(entries.map(e=>[e.path,e]));
  if(entries.length!==entriesByPath.size || entries.length!==trackedPaths.length ||
    !trackedPaths.every(p=>entriesByPath.has(p))) throw Error('TREE_COVERAGE_MISMATCH');
  const historicalPreservation=observeHistoricalPreservation({entries,readBytes,obligations:historicalObligations});
  const historicalByPath=new Map(historicalPreservation.map(x=>[x.path,x]));
  const rows=[];
  let deadline=Date.now()+90_000;
  const groups={};
  for(const entry of entries) {
    const {path,mode,type,oid,size}=entry;
    const role=classifyTrackedPath(path);
    groups[role]=(groups[role]??0)+1;
    let structuralStatus='IDENTITY_ONLY';
    let reason='SEMANTIC_IMPACT_UNVERIFIED';
    let scopeHint=null;
    if(role==='SCOPED_PROJECT_DOCUMENT') {
      const pieces=path.split('/');
      const file=pieces.at(-1);
      const parent=pieces.at(-2);
      if(file.includes('__') && file.startsWith(parent+'__')) scopeHint=parent;
    }
    if(SENSITIVE_PATH.test(path)) {
      structuralStatus='UNVERIFIED';reason='SENSITIVE_PATH_NO_CONTENT_READ';
    } else if(type!=='blob'||!['100644','100755'].includes(mode)) {
      structuralStatus='UNVERIFIED';reason='NON_REGULAR_GIT_OBJECT';
    } else if(isCandidate(path) && /\.(?:md|json|txt|csv|tsv|xml|ya?ml|toml|ini|rst|adoc)$/i.test(path)) {
      if(Date.now()>=deadline) {
        structuralStatus='UNVERIFIED';reason='CORPUS_SCAN_DEADLINE';
      } else {
        try {
          const body=readText(entry);
          if(typeof body!=='string' || body.includes('\u0000') || body.includes('\uFFFD')) throw Error('TEXT_ENCODING_UNVERIFIED');
          if(/\.json$/i.test(path)) {
            JSON.parse(body);structuralStatus='JSON_PARSED';reason='SEMANTIC_SCHEMA_UNVERIFIED';
          } else {
            structuralStatus='TEXT_READ';reason='SEMANTIC_CONTENT_UNVERIFIED';
          }
        } catch {
          structuralStatus='UNVERIFIED';reason='CONTENT_UNREADABLE_OR_INVALID';
        }
      }
    }
    const historical=historicalByPath.get(path);
    rows.push({path,mode,type,oid,size,role,scopeHint,structuralStatus,reason,semanticStatus:'UNVERIFIED',
      ...(historical ? {historicalPreservationStatus:historical.preservationStatus} : {})});
  }
  const candidateRows=rows.filter(r=>isCandidate(r.path));
  const structuralRead=candidateRows.filter(r=>['JSON_PARSED','TEXT_READ'].includes(r.structuralStatus)).length;
  return {treeDigest:digest(rows.map(({path,mode,type,oid,size})=>({path,mode,type,oid,size}))),
    trackedCount:rows.length,inventoryCoverageComplete:true,roleCounts:groups,
    candidateCount:candidateRows.length,structuralReadCount:structuralRead,
    identityOnlyCount:candidateRows.filter(r=>r.structuralStatus==='IDENTITY_ONLY').length,
    structuralUnverifiedCount:candidateRows.filter(r=>r.structuralStatus==='UNVERIFIED').length,
    unresolvedStructuralCount:candidateRows.filter(r=>r.structuralStatus==='UNVERIFIED'&&r.historicalPreservationStatus!=='PRESERVED_NON_EXECUTABLE').length,
    historicalPreservation, historicalPreservedCount:historicalPreservation.filter(x=>x.preservationStatus==='PRESERVED_NON_EXECUTABLE').length,
    historicalUnverifiedCount:historicalPreservation.filter(x=>x.preservationStatus==='UNVERIFIED').length,
    unknownImpactCount:rows.filter(r=>r.role==='UNCLASSIFIED_IMPACT').length,
    semanticCoverageComplete:false,rows};
}

export function parseNameStatus(raw) {
  if (raw === '') return [];
  if (!raw.endsWith('\0')) throw Error('DIFF_TRUNCATED');
  const parts = raw.slice(0, -1).split('\0');
  const result = [];
  for (let i = 0; i < parts.length;) {
    const code = parts[i++];
    const rename = /^[RC](?:100|[0-9]{1,2})$/.test(code);
    if (!rename && !/^[ADMTUXB]$/.test(code)) throw Error('DIFF_STATUS_INVALID');
    const previousPath = rename ? parts[i++] : null;
    const path = parts[i++];
    if (!validPath(path) || (rename && !validPath(previousPath))) throw Error('DIFF_PATH_INVALID');
    result.push({ code, path, previousPath });
    if (result.length > LIMIT) throw Error('DIFF_LIMIT_EXCEEDED');
  }
  return result;
}

// These are the same five required canonical-state documents as the existing
// check-doc-governance.mjs. The existing validators remain the authority.
const REQUIRED_STATES = Object.freeze(['SUIVI.md','TASKS.md','TODO.md',
  'DEPLOYMENT_PRODUCTION.md','MCP_ANTI_DISPERSION_GOVERNANCE.md']);
const MAX_JSON_CHECKS = LIMIT;
function safeValue(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value !== 'string' || value.length > 240 ||
      /[\x00-\x1f\x7f]|:\/\/[^/]*@|(?:token|secret|password|authorization)\s*[:=]/i.test(value)) return '[REDACTED]';
  return value;
}
export function observeDocumentAuthorities({trackedPaths, readText, productionState}) {
  const checks = [];
  const differences = [];
  const tracked = new Set(trackedPaths);
  const required = [];
  const mark = (path, check, ok, reason) => checks.push({path, check, status:ok?'PASS':'FAIL', reason:ok?null:reason});
  const add = (path,field,reason,declared,expected) => differences.push({
    path,field,reason,declared:safeValue(declared),expected:safeValue(expected),
    source:'EXISTING_DOCUMENT_GOVERNANCE_VALIDATOR',
    nextAction:'RESOLVE_AUTHORITY_AND_RECONCILE'
  });
  for (const path of REQUIRED_STATES) {
    if (!tracked.has(path)) {
      mark(path,'CANONICAL_STATE',false,'REQUIRED_DOCUMENT_MISSING');
      add(path,'$state','REQUIRED_DOCUMENT_MISSING',null,'present');
      continue;
    }
    try {
      const state=extractCanonicalState(readText(path));
      required.push({path,state});
      const missing = canonicalStateKeys.filter(key => typeof state?.[key] !== 'string' || !state[key].trim());
      mark(path,'CANONICAL_STATE',!!state && !missing.length,'CANONICAL_STATE_INCOMPLETE');
      for(const key of missing) add(path,key,'CANONICAL_STATE_KEY_MISSING',null,'non-empty string');
    } catch {
      mark(path,'CANONICAL_STATE',false,'CANONICAL_STATE_UNREADABLE');
      add(path,'$state','CANONICAL_STATE_UNREADABLE',null,'readable canonical state');
    }
  }
  const shared=validateRequiredCanonicalStates(REQUIRED_STATES,required);
  for (const conflict of shared.conflicts) {
    add(conflict.path,conflict.key,'CANONICAL_STATE_CONFLICT',conflict.actual,conflict.expected);
  }
  for(const path of shared.withoutState) add(path,'$state','CANONICAL_STATE_MISSING',null,'present');
  // Agreement between documents is not evidence that all of their content is current.
  const canonicalReference=required.find(d=>d.path==='SUIVI.md')?.state;
  if(canonicalReference && productionState) {
    const prod=validateProductionState(productionState,canonicalReference);
    mark(PRODUCTION,'PRODUCTION_STATE_CONTRACT',prod.ok,'PRODUCTION_STATE_CONTRACT_CONFLICT');
    for(const issue of prod.issues) add(PRODUCTION,issue.path,issue.reason,issue.actual,issue.expected);
  } else {
    mark(PRODUCTION,'PRODUCTION_STATE_CONTRACT',false,'PRODUCTION_STATE_REFERENCE_UNAVAILABLE');
    add(PRODUCTION,'$state','PRODUCTION_STATE_REFERENCE_UNAVAILABLE',null,'canonical reference');
  }
  for(const path of detectHistoricalMirrors(trackedPaths)) {
    try {
      const result=validateHistoricalMirrorBanner(path,readText(path));
      mark(path,'HISTORICAL_MIRROR_AUTHORITY',result.ok,'HISTORICAL_MIRROR_AUTHORITY_UNVERIFIED');
      for(const reason of result.issues) add(path,'$authority',reason,null,path.slice(5));
    } catch {
      mark(path,'HISTORICAL_MIRROR_AUTHORITY',false,'HISTORICAL_MIRROR_UNREADABLE');
      add(path,'$authority','HISTORICAL_MIRROR_UNREADABLE',null,path.slice(5));
    }
  }
  const json=trackedPaths.filter(p=>p.endsWith('.json')&&!SENSITIVE_PATH.test(p)).sort();
  for(const path of json.slice(0,MAX_JSON_CHECKS)){
    try {
      JSON.parse(readText(path));
      mark(path,'JSON_SYNTAX',true,null);
    } catch {
      mark(path,'JSON_SYNTAX',false,'JSON_INVALID_OR_UNREADABLE');
      add(path,'$syntax','JSON_INVALID_OR_UNREADABLE',null,'valid JSON');
    }
  }
  const omitted=json.slice(MAX_JSON_CHECKS);
  return {checks,differences,omitted,ok:shared.ok&&!differences.length&&!omitted.length&&checks.every(c=>c.status==='PASS'),
    coverage:{canonicalDocuments:REQUIRED_STATES.length,canonicalStateKeys:canonicalStateKeys.length,
      mirrorDocuments:detectHistoricalMirrors(trackedPaths).length,jsonCandidates:json.length,
      jsonChecked:json.length-omitted.length,complete:false}};
}

// Compare the existing GitHub/S1 evidence producers, not self-declared
// status flags. Matching byte digests is not semantic certification.
const DIGEST=/^[0-9a-f]{64}$/;
const RUNTIME_AUTHORITIES = Object.freeze([
  ['GIT_REGISTRY_AND_PROJECT_BINDING','EXISTING_GIT_REGISTRY_READER'],
  ['GOVERNED_TASK_QUEUE','EXISTING_TASK_QUEUE_READER'],
  ['GOVERNED_SESSIONS','EXISTING_SESSION_READER'],
  ['GOVERNED_LOCKS','EXISTING_LOCK_READER'],
  ['OPERATIONAL_MEMORY','EXISTING_OPERATIONAL_MEMORY_AUTHORITY'],
  ['CUG_RECEIPTS_AND_INSTALLATIONS','EXISTING_CUG_AUTHORITY'],
  ['PROGRAM_BACKLOG_GWC_UAC','EXISTING_PROGRAM_CONTRACTS']
]);
// Verify the baseline by regenerating it, then compare the actual HTTP
// registration profile, not a manually incremented tool count.
export function verifyCartographyProfiles({versioned,standalone,httpRuntime}) {
  const valid=x=>x?.schemaVersion===2&&x.generatedFrom==='runtime-registration'&&
    DIGEST.test(x.catalogueDigest??'')&&Array.isArray(x.tools)&&Array.isArray(x.resources)&&
    Number.isSafeInteger(x.registeredToolCount)&&x.registeredToolCount===x.tools.length&&
    x.tools.every(t=>typeof t.name==='string'&&DIGEST.test(t.contractDigest??''))&&
    new Set(x.tools.map(t=>t.name)).size===x.tools.length;
  if(!valid(versioned)||!valid(standalone)||!valid(httpRuntime)) return {ok:false,reason:'CARTOGRAPHY_PROFILE_UNVERIFIED'};
  if(JSON.stringify(versioned)!==JSON.stringify(standalone)) return {ok:false,reason:'VERSIONED_STANDALONE_CARTOGRAPHY_DRIFT'};
  const baseTools=new Map(standalone.tools.map(t=>[t.name,t.contractDigest]));
  const httpTools=new Map(httpRuntime.tools.map(t=>[t.name,t.contractDigest]));
  const added=httpRuntime.tools.filter(t=>!baseTools.has(t.name)).map(t=>t.name);
  const removed=standalone.tools.filter(t=>!httpTools.has(t.name)).map(t=>t.name);
  const changed=standalone.tools.filter(t=>httpTools.has(t.name)&&httpTools.get(t.name)!==t.contractDigest).map(t=>t.name);
  // The existing P2 registration contract is conditional on the pairing
  // dependency, and the HTTP server supplies it. Do not silently admit a
  // different extra tool or a changed contract.
  if(added.length!==1||added[0]!=='mcp_issue_plesk_web_pairing_proof'||removed.length||changed.length||
    JSON.stringify(standalone.resources)!==JSON.stringify(httpRuntime.resources)||
    httpRuntime.tools.find(t=>t.name===added[0])?.surface!=='operational-write')
    return {ok:false,reason:'HTTP_CARTOGRAPHY_PROFILE_CONTRACT_UNVERIFIED',added,removed,changed};
  return {ok:true,reason:null,profile:'HTTP_SERVER_WITH_PLESK_PAIRING',standaloneCount:standalone.registeredToolCount,
    standaloneDigest:standalone.catalogueDigest,httpCount:httpRuntime.registeredToolCount,
    httpDigest:httpRuntime.catalogueDigest,added,removed,changed};
}

export function validateRuntimeAuthorityObservation({headSha,g1,expectedJobId,now=Date.now()}) {
  const e=g1?.runtimeEvidence;
  const names=RUNTIME_AUTHORITIES.slice(0,4).map(([authority])=>authority);
  const age=now-Date.parse(e?.observedAt??'');
  const rowOk=r=>r&&names.includes(r.authority)&&['OBSERVED','UNVERIFIED'].includes(r.status)&&
    (r.status==='OBSERVED'?Number.isSafeInteger(r.sourceVersion)&&r.sourceVersion>=0&&
      Number.isSafeInteger(r.recordCount)&&r.recordCount>=0&&DIGEST.test(r.digest??'')&&
      ['RETAINED_RECORDS','BOUNDED_REGISTRY_PROJECTION'].includes(r.coverage):
      r.sourceVersion===null&&r.recordCount===null&&r.digest===null&&r.coverage==='UNVERIFIED');
  if(!expectedJobId||e?.schemaVersion!==1||e.repository!==REPO||e.sha!==headSha||e.jobId!==expectedJobId||
    e.stateVersion!==g1?.authorityEvidence?.stateVersion||!Number.isFinite(age)||age< -5000||age>900000||
    !['OBSERVED','UNVERIFIED','CONFLICT'].includes(e.status)||typeof e.stableRead!=='boolean'||
    e.coverage!=='RETAINED_AUTHORITY_RECORDS_ONLY'||e.semanticCoverageComplete!==false||e.mutationPerformed!==false||
    !DIGEST.test(e.evidenceDigest??'')||!Array.isArray(e.authorities)||e.authorities.length!==names.length||
    !e.authorities.every(rowOk)||new Set(e.authorities.map(r=>r.authority)).size!==names.length||
    !Array.isArray(e.conflicts)||e.conflicts.length>30||!e.conflicts.every(r=>r&&
      /^[A-Z_]{3,80}$/.test(r.code??'')&&Number.isSafeInteger(r.count)&&r.count>0)) return null;
  if((e.status==='OBSERVED'&&(!e.stableRead||e.conflicts.length||e.authorities.some(r=>r.status!=='OBSERVED')))||
    (e.status==='CONFLICT'&&(!e.stableRead||!e.conflicts.length||e.authorities.some(r=>r.status!=='OBSERVED')))||
    (e.status==='UNVERIFIED'&&e.stableRead))return null;
  // The producer's canonical hash is verified against a fixed, publication-safe
  // shape. Arbitrary extra fields from an untrusted envelope are not retained.
  const {evidenceDigest,...body}=e;
  const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
    ?Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):value;
  const expected=digest(canonical(body));
  if(expected!==evidenceDigest)return null;
  return {sha:e.sha,jobId:e.jobId,stateVersion:e.stateVersion,observedAt:e.observedAt,status:e.status,
    stableRead:e.stableRead,evidenceDigest,coverage:e.coverage,semanticCoverageComplete:false,
    authorities:e.authorities.map(({authority,status,sourceVersion,recordCount,digest,coverage})=>({authority,status,sourceVersion,recordCount,digest,coverage})),
    conflicts:e.conflicts.map(({code,count})=>({code,count}))};
}
export function compareLiveAuthorities({headSha,g1,existingEvidence,expectedJobId=null,now=Date.now()}) {
  const e=g1?.authorityEvidence;
  const pairs=[
    ['inventoryDigest','sourceDigest','CURRENT_STATE_EVIDENCE','scripts/current-state-evidence.mjs'],
    ['documentationDigest','documentationDigest','MARKDOWN_CONTENT','docs/governance/markdown-inventory.json'],
    ['governanceDigest','governanceDigest','GOVERNANCE_PROJECTION','.mcp/manifest.json'],
    ['testSuiteDigest','testSuiteDigest','TEST_SUITE','tests/'],
    ['catalogueDigest','catalogueDigest','FUNCTION_CARTOGRAPHY','.mcp/function-cartography.json'],
    ['toolCount','toolCount','FUNCTION_CARTOGRAPHY','.mcp/function-cartography.json']
  ];
  const age=now-Date.parse(e?.observedAt??'');
  // The report may be queued after the fresh authenticated observation.
  // This bounds the report's provenance window; it is not proof of freshness
  // for future mutations or a substitute for a new Live State read.
  const bound=existingEvidence?.ok===true&&existingEvidence.evidenceHead===headSha&&
    ['ALIGNED','DRIFT'].includes(g1?.status)&&e?.schemaVersion===1&&e.sha===headSha&&
    Number.isSafeInteger(e.stateVersion)&&e.stateVersion>0&&Number.isFinite(age)&&age>=-5000&&age<=900000;
  const checks=[],differences=[];
  for(const [liveField,localField,authority,path] of pairs) {
    const observed=e?.[liveField],declared=existingEvidence?.[localField];
    const valid=liveField==='toolCount'
      ? Number.isSafeInteger(observed)&&observed>0&&Number.isSafeInteger(declared)&&declared>0
      : typeof observed==='string'&&DIGEST.test(observed)&&typeof declared==='string'&&DIGEST.test(declared);
    const status=!bound||!valid?'UNVERIFIED':observed===declared?'MATCHED':'CONFLICT';
    checks.push({authority,path,field:liveField,status,declared:valid?declared:null,observed:valid?observed:null});
    if(status==='CONFLICT') differences.push({path,field:liveField,declared,observed,
      reason:'LIVE_AUTHORITY_VALUE_MISMATCH',source:authority,nextAction:'RESOLVE_AUTHORITY_AND_RECONCILE'});
  }
  // Diagnostic only: missing components never erase or weaken the primary
  // exact sourceDigest comparison, including for earlier evidence producers.
  const inventoryDiagnostics=['architectureDigest','sourceGeneratedAt'].map(field=>{
    const declared=existingEvidence?.[field],observed=e?.[field];
    const valid=x=>typeof x==='string'&&(field==='architectureDigest'?DIGEST.test(x):
      x.length<=40&&/^\d{4}-\d{2}-\d{2}T/.test(x)&&Number.isFinite(Date.parse(x)));
    return {field,declared:valid(declared)?declared:null,observed:valid(observed)?observed:null,
      status:!bound||!valid(declared)||!valid(observed)?'UNVERIFIED':declared===observed?'MATCHED':'CONFLICT'};
  });
  const runtimeObservation=bound?validateRuntimeAuthorityObservation({headSha,g1,expectedJobId,now}):null;
  const observedByAuthority=new Map((runtimeObservation?.authorities??[]).map(r=>[r.authority,r]));
  const unresolvedRuntime=RUNTIME_AUTHORITIES.map(([authority,source])=>({
    authority,source,status:'UNVERIFIED',sourceObservation:observedByAuthority.get(authority)??null,reason:'SOURCE_BOUND_SEMANTIC_RECONCILIATION_NOT_ATTESTED',
    nextAction:'REUSE_EXISTING_AUTHORITY_READER_AND_COMPARE_PROJECTIONS'
  }));
  return {bound,headSha,observedAt:bound?e.observedAt:null,stateVersion:bound?e.stateVersion:null,
    checks,differences,inventoryDiagnostics,runtimeObservation,unresolvedRuntime,matchedCount:checks.filter(c=>c.status==='MATCHED').length,
    complete:false};
}

export function buildDocumentaryClosureReport({headSha, baselineSha, trackedPaths, inventory, changes, g1, governanceCheckOk, authorityObservation = null, corpusObservation = null, existingEvidence = null, expectedJobId = null, hierarchicalPlan = null}) {
  if (!SHA.test(headSha ?? '') || !SHA.test(baselineSha ?? '') ||
      !Array.isArray(trackedPaths) || trackedPaths.length > LIMIT ||
      !trackedPaths.every(validPath) || new Set(trackedPaths).size !== trackedPaths.length ||
      !Array.isArray(changes) || changes.length > LIMIT) throw Error('INVALID_OBSERVATION');
  const markdown = trackedPaths.filter(p => p.endsWith('.md')).sort();
  if (inventory?.schemaVersion !== 1 || !Array.isArray(inventory.entries) ||
      inventory.entries.length > LIMIT || !inventory.entries.every(e => validPath(e?.path) && typeof e.category === 'string')) {
    throw Error('INVENTORY_UNREADABLE');
  }
  const declared = inventory.entries.map(e => e.path);
  const declaredSet = new Set(declared);
  const actualSet = new Set(markdown);
  const missing = markdown.filter(p => !declaredSet.has(p));
  const absent = [...declaredSet].filter(p => !actualSet.has(p)).sort();
  const duplicates = declared.length !== declaredSet.size;
  const baselineCheck = validateMarkdownBaseline(inventory.entries, markdown);
  const inventoryAligned = baselineCheck.ok && !missing.length && !absent.length && !duplicates &&
    inventory.trackedCount === declared.length && inventory.trackedCount === markdown.length;
  const byPath = new Map(inventory.entries.map(e => [e.path, e.category]));
  const changed = new Map();
  for (const c of changes) {
    if (!c || !validPath(c.path) || (c.previousPath !== null && !validPath(c.previousPath)) ||
        typeof c.code !== 'string' || !/^(?:[ADMTUXB]|[RC](?:100|[0-9]{1,2}))$/.test(c.code)) throw Error('INVALID_CHANGE');
    changed.set(c.path, c.code);
    if (c.previousPath !== null) changed.set(c.previousPath, c.code);
  }
  const candidates = trackedPaths.filter(isCandidate).sort();
  const pathChecks = new Map();
  for(const check of authorityObservation?.checks ?? []) {
    if(!pathChecks.has(check.path)) pathChecks.set(check.path,[]);
    pathChecks.get(check.path).push(check);
  }
  const differences = [...(authorityObservation?.differences ?? [])];
  const g1Differences = [];
  if (g1?.status === 'DRIFT' && g1.sha === headSha && SHA.test(g1.declaredGithubSha ?? '') &&
      SHA.test(g1.declaredS1Sha ?? '') && g1.declaredGithubSha === baselineSha) {
    g1Differences.push(
      {path: PRODUCTION, field: 'githubCommitFull', declared: g1.declaredGithubSha, observed: headSha,
       reason: 'G1_DOCUMENTATION_DRIFT', source: 'G1_ATTESTED_LIVE_STATE', nextAction: 'REUSE_GW60_GW61'},
      {path: PRODUCTION, field: 'serverGitState.lastDirectlyVerifiedCommitFull', declared: g1.declaredS1Sha, observed: headSha,
       reason: 'G1_DOCUMENTATION_DRIFT', source: 'G1_ATTESTED_LIVE_STATE', nextAction: 'REUSE_GW60_GW61'}
    );
  }
  differences.push(...g1Differences);
  const liveAuthorities=compareLiveAuthorities({headSha,g1,existingEvidence,expectedJobId});
  differences.push(...liveAuthorities.differences);
  const differencesByPath = new Map();
  for (const difference of differences) {
    if (!differencesByPath.has(difference.path)) differencesByPath.set(difference.path, []);
    differencesByPath.get(difference.path).push(difference);
  }
  const preservedByPath = new Map((corpusObservation?.historicalPreservation ?? [])
    .filter(record => record.archiveVerified === true &&
      record.preservationStatus === 'PRESERVED_NON_EXECUTABLE' && record.currentAuthority === false)
    .map(record => [record.path, record]));
  const documents = candidates.map(path => {
    const findings = differencesByPath.get(path) ?? [];
    const hasConflict = findings.some(finding => ['CANONICAL_STATE_CONFLICT', 'LIVE_AUTHORITY_VALUE_MISMATCH'].includes(finding.reason));
    const preserved = preservedByPath.get(path);
    let verdict = 'UNVERIFIED';
    let nextAction = 'RESOLVE_OWNER_AND_VALIDATE_IMPACT';
    if (hasConflict) {
      verdict = 'CONFLICT';
      nextAction = 'RESOLVE_AUTHORITY_AND_RECONCILE';
    } else if (findings.length && findings.every(finding => finding.reason === 'G1_DOCUMENTATION_DRIFT')) {
      verdict = 'RECONCILIATION_REQUIRED';
      nextAction = 'REUSE_GW60_GW61';
    } else if (!findings.length && preserved) {
      verdict = 'HISTORICAL_PRESERVATION';
      nextAction = preserved.nextAction;
    }
    return {
      path, category: byPath.get(path) ?? 'AUTHORITY_UNVERIFIED',
      change: changed.get(path) ?? 'NO_DIRECT_GIT_CHANGE',
      verdict, semanticStatus: 'UNVERIFIED', staticChecks: pathChecks.get(path) ?? [],
      differences: findings, nextAction
    };
  });
  const planPaths=hierarchicalPlan?.documents?.map(d=>d.path)??[];
  const planSet=new Set(planPaths);
  const corpusByPath=new Map((corpusObservation?.rows??[]).map(r=>[r.path,r.oid]));
  const {planDigest,...planProjection}=hierarchicalPlan??{};
  const planBound=hierarchicalPlan?.headSha===headSha&&hierarchicalPlan.entryIndependent===true&&
    hierarchicalPlan.coverage?.allCandidatesAccountedFor===true&&
    Array.isArray(hierarchicalPlan.issues)&&Array.isArray(hierarchicalPlan.documents)&&
    planPaths.length===candidates.length&&planSet.size===candidates.length&&candidates.every(p=>planSet.has(p))&&
    (!corpusObservation||hierarchicalPlan.documents.every(d=>d.oid===corpusByPath.get(d.path)))&&
    DIGEST.test(planDigest??'')&&digest(planProjection)===planDigest;
  const reasons = ['SEMANTIC_AND_RUNTIME_REGISTRY_COVERAGE_UNVERIFIED'];
  if(!planBound) reasons.push('HIERARCHICAL_DOCUMENTARY_PLAN_UNVERIFIED');
  else if(hierarchicalPlan.issues.length) reasons.push('HIERARCHICAL_DOCUMENTARY_OBLIGATIONS_UNRESOLVED');
  if (authorityObservation?.ok !== true) reasons.push('STATIC_AUTHORITY_PROOF_MISSING_OR_CONFLICT');
  if (corpusObservation?.inventoryCoverageComplete !== true) reasons.push('EXACT_CORPUS_INVENTORY_UNVERIFIED');
  if ((corpusObservation?.unresolvedStructuralCount ?? corpusObservation?.structuralUnverifiedCount ?? 0)>0) reasons.push('CORPUS_CONTENT_UNVERIFIED');
  if (corpusObservation?.historicalUnverifiedCount>0) reasons.push('HISTORICAL_PRESERVATION_UNVERIFIED');
  if (corpusObservation?.unknownImpactCount>0) reasons.push('UNCLASSIFIED_IMPACT');
  if (existingEvidence && existingEvidence.ok !== true) reasons.push('CURRENT_STATE_EVIDENCE_CONTRADICTIONS');
  if (liveAuthorities.differences.length) reasons.push('LIVE_AUTHORITY_CONFLICT');
  if(liveAuthorities.runtimeObservation?.status==='CONFLICT') reasons.push('RUNTIME_AUTHORITY_RELATION_CONFLICT');
  if(liveAuthorities.runtimeObservation?.status!=='OBSERVED') reasons.push('RUNTIME_AUTHORITY_OBSERVATION_UNVERIFIED');
  if (existingEvidence?.cartographyProfile?.ok===false) reasons.push(existingEvidence.cartographyProfile.reason);
  if (!liveAuthorities.bound || liveAuthorities.checks.some(c=>c.status==='UNVERIFIED')) reasons.push('LIVE_AUTHORITY_PROOF_UNVERIFIED');
  const g1ReasonCodes=Array.isArray(g1?.reasonCodes)?g1.reasonCodes.filter(x=>typeof x==='string'&&/^G1_[A-Z0-9_]{2,80}$/.test(x)).slice(0,20):[];
  if (!inventoryAligned) reasons.push('MARKDOWN_INVENTORY_DRIFT');
  if (governanceCheckOk !== true) reasons.push('DOCUMENT_GOVERNANCE_CHECK_NOT_SUCCESS');
  if (g1?.status === 'DRIFT' && g1Differences.length) reasons.push('G1_DOCUMENTATION_DRIFT');
  else if (g1?.status !== 'ALIGNED') reasons.push('G1_PROOF_UNVERIFIED');
  const status = !inventoryAligned || governanceCheckOk !== true ||
    (hierarchicalPlan!==null && (!planBound || hierarchicalPlan.issues.length>0)) ||
    (authorityObservation !== null && authorityObservation.ok !== true) ||
    (corpusObservation !== null && (corpusObservation.inventoryCoverageComplete !== true || (corpusObservation.unresolvedStructuralCount ?? corpusObservation.structuralUnverifiedCount)>0 || corpusObservation.historicalUnverifiedCount>0 || corpusObservation.unknownImpactCount>0)) ||
    (existingEvidence !== null && existingEvidence.ok !== true) ||
    liveAuthorities.differences.length>0 || liveAuthorities.runtimeObservation?.status==='CONFLICT' || existingEvidence?.cartographyProfile?.ok===false ||
    (g1?.status !== 'ALIGNED' && !g1Differences.length)
    ? 'DOCUMENTARY_CLOSURE_BLOCKED' : 'DOCUMENTARY_CLOSURE_PENDING';
  return {
    schemaVersion: 1, repository: REPO, headSha, baselineSha,
    comparisonBasis: 'PRODUCTION_STATE_DECLARED_GITHUB_SHA_NOT_PREVIOUS_DEPLOY_PROOF',
    status, closureAttested: false, technicalDeploymentIndependent: true,
    inventory: {markdownCount: markdown.length, declaredCount: inventory.trackedCount,
      inventoryAligned, missing, absent, duplicates, unclassified: baselineCheck.unclassified,
      categoryDrift: baselineCheck.categoryDrift, candidateCount: documents.length},
    coverage: {semanticVerifiedCount: 0, complete: false, runtimeRegistryCoverage: 'UNVERIFIED'},
    corpusObservation, existingEvidence, authorityObservation, liveAuthorities, g1ReasonCodes, hierarchicalPlan,
    governanceCheckOk: governanceCheckOk === true,
    g1Status: ['DRIFT','ALIGNED','UNVERIFIED'].includes(g1?.status) ? g1.status : 'UNVERIFIED',
    differences, changes, documents, reasons,
    nextAction: status === 'DOCUMENTARY_CLOSURE_BLOCKED'
      ? 'REOBSERVE_AND_RESOLVE_BLOCKERS' : g1Differences.length
        ? 'RECONCILE_G1_AND_VALIDATE_DOCUMENT_AUTHORITIES' : 'VALIDATE_DOCUMENT_AND_REGISTRY_AUTHORITIES',
    mutationPerformed: false
  };
}

function git(args) {
  return execFileSync('git', args, {encoding:'utf8', env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1'}, maxBuffer:MAX_BUFFER, timeout:60000, stdio:['ignore','pipe','ignore']});
}

function createExactBlobReader(entries) {
  const deadline=Date.now()+90_000;
  const entriesByPath=new Map(entries.map(e=>[e.path,e]));
  const texts=new Map();
  let bytesRead=0;
  function readBytes(entry) {
    if(!entry||SENSITIVE_PATH.test(entry.path)||entry.type!=='blob'||!['100644','100755'].includes(entry.mode)||
      entry.size>MAX_BUFFER-1024||Date.now()>=deadline||bytesRead+entry.size>48*1024*1024) throw Error('DOCUMENT_AUTHORITY_SCAN_LIMIT');
    const bytes=execFileSync('git',['cat-file','blob',entry.oid],{
      env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1'},maxBuffer:MAX_BUFFER,
      timeout:Math.min(deadline-Date.now(),5000),stdio:['ignore','pipe','ignore']});
    bytesRead+=entry.size;
    return bytes;
  }
  function readEntry(entry) {
    if(!entry||SENSITIVE_PATH.test(entry.path)||entry.type!=='blob'||!['100644','100755'].includes(entry.mode))
      throw Error('CONTENT_UNVERIFIED');
    if(texts.has(entry.path))return texts.get(entry.path);
    const content=readBytes(entry).toString('utf8');
    texts.set(entry.path,content);
    return content;
  }
  return {entriesByPath,readEntry,readBytes};
}

// Same resolver is available BEFORE a work session, independently of OIDC,
// a deploy run or an admission channel. It cannot create authority or write.
export function observeCommonPlanAtCheckout(headSha,baselineSha=headSha) {
  if(!SHA.test(headSha??'')||!SHA.test(baselineSha??'')||git(['rev-parse','HEAD']).trim()!==headSha)
    throw Error('CHECKOUT_SHA_MISMATCH');
  git(['merge-base','--is-ancestor',baselineSha,headSha]);
  const entries=parseTrackedTree(git(['ls-tree','-r','--long','-z',headSha]));
  const changes=parseNameStatus(git(['diff','--no-ext-diff','--name-status','-z','-M',baselineSha,headSha,'--']));
  const {entriesByPath,readEntry}=createExactBlobReader(entries);
  return buildCommonDocumentaryPlan({headSha,entries,candidatePaths:entries.map(e=>e.path).filter(isCandidate),
    changes,readText:path=>readEntry(entriesByPath.get(path))});
}

export function main(env = process.env) {
  const headSha = env.GITHUB_SHA ?? '';
  if (env.GITHUB_REPOSITORY !== REPO || env.GITHUB_REF !== 'refs/heads/main' || !SHA.test(headSha)
      || !env.GITHUB_STEP_SUMMARY || !env.DOCUMENTARY_REPORT_FILE) throw Error('INVALID_EXECUTION_CONTEXT');
  let report;
  try {
    if (git(['rev-parse','HEAD']).trim() !== headSha) throw Error('CHECKOUT_SHA_MISMATCH');
    const manifest = JSON.parse(git(['show',headSha+':'+PRODUCTION]));
    const baselineSha = manifest.githubCommitFull;
    if (!SHA.test(baselineSha ?? '') || manifest.repository !== REPO || manifest.branch !== 'main') throw Error('INVALID_BASELINE');
    git(['merge-base','--is-ancestor',baselineSha,headSha]);
    const inventory = JSON.parse(git(['show',headSha+':'+INVENTORY]));
    const entries=parseTrackedTree(git(['ls-tree','-r','--long','-z',headSha]));
    const trackedPaths=entries.map(e=>e.path);
    const changes = parseNameStatus(git(['diff','--no-ext-diff','--name-status','-z','-M',baselineSha,headSha,'--']));
    const g1 = JSON.parse(env.G1_EVIDENCE ?? 'null');
    let governanceCheckOk = false;
    try {
      execFileSync(process.execPath,['scripts/check-doc-governance.mjs'],{stdio:'ignore',timeout:60000});
      governanceCheckOk = true;
    } catch { /* absence of proof blocks closure */ }
    const {entriesByPath,readEntry,readBytes}=createExactBlobReader(entries);
    const hierarchicalPlan=buildCommonDocumentaryPlan({headSha,entries,candidatePaths:trackedPaths.filter(isCandidate),changes,
      readText:path=>readEntry(entriesByPath.get(path))});
    const corpusObservation=observeTrackedCorpus({entries,trackedPaths,readText:readEntry,readBytes});
    const authorityObservation=observeDocumentAuthorities({trackedPaths,productionState:manifest,
      readText:path=>readEntry(entriesByPath.get(path))});
    let existingEvidence;
    try {
      const state=collectCurrentStateEvidence();
      const cartography=JSON.parse(readEntry(entriesByPath.get('.mcp/function-cartography.json')));
      let cartographyProfile;
      try {
        const generate=(args)=>JSON.parse(execFileSync(process.execPath,['--import','tsx','scripts/emit-function-cartography.ts',...args],{
          encoding:'utf8',maxBuffer:MAX_BUFFER,timeout:45000,stdio:['ignore','pipe','ignore']}));
        cartographyProfile=verifyCartographyProfiles({versioned:cartography,standalone:generate([]),httpRuntime:generate(['--http-runtime'])});
      } catch {cartographyProfile={ok:false,reason:'CARTOGRAPHY_PROFILE_GENERATOR_UNAVAILABLE'};}
      existingEvidence={ok:state.evidenceHead===headSha&&state.contradictions.length===0,
        evidenceHead:state.evidenceHead,sourceDigest:state.sourceDigest,
        architectureDigest:state.architecture.digest,sourceGeneratedAt:state.generatedAt,
        documentationDigest:state.documentation.digest,governanceDigest:state.governance.digest,
        testSuiteDigest:state.testSuiteDigest,cartographyProfile,
        catalogueDigest:cartographyProfile.ok?cartographyProfile.httpDigest:null,
        toolCount:cartographyProfile.ok?cartographyProfile.httpCount:null,
        contradictions:state.contradictions.map(({code,path})=>({code,path:path??null})),
        authority:'EXISTING_CURRENT_STATE_EVIDENCE'};
    } catch {
      existingEvidence={ok:false,contradictions:[{code:'CURRENT_STATE_EVIDENCE_UNAVAILABLE',path:null}]};
    }
    report = buildDocumentaryClosureReport({headSha,baselineSha,trackedPaths,inventory,changes,g1,
      governanceCheckOk,authorityObservation,corpusObservation,existingEvidence,hierarchicalPlan,
      expectedJobId:/^[0-9]{1,30}$/.test(env.GITHUB_RUN_ID??'')?'mcp-s1-'+env.GITHUB_RUN_ID+'-'+headSha.slice(0,12):null});
    // Produce the next SUIVI candidate from the same exact report, never
    // from a client-supplied certificate or arbitrary historical prose.
    try {
      const raw=readEntry(entriesByPath.get('SUIVI.md'));
      const old=observeLoopbackCheckpoint(raw);
      if(old.status!=='PRESENT')throw Error('LOOPBACK_CHECKPOINT_UNVERIFIED');
      const previous=old.declared.observedMainSha;
      git(['merge-base','--is-ancestor',previous,headSha]);
      const checkpointChanges=parseNameStatus(git(['diff','--no-ext-diff','--name-status','-z','-M',previous,headSha,'--']));
      report.loopbackCandidate=deriveLoopbackCandidate({raw,headSha,checkpointChanges,report,
        expectedJobId:/^[0-9]{1,30}$/.test(env.GITHUB_RUN_ID??'')?'mcp-s1-'+env.GITHUB_RUN_ID+'-'+headSha.slice(0,12):null});
    }catch{
      report.loopbackCandidate={schemaVersion:1,path:'SUIVI.md',status:'BLOCKED_OR_UNVERIFIED',
        reason:'LOOPBACK_CHECKPOINT_ANCESTRY_OR_CONTENT_UNVERIFIED',mutationPerformed:false,
        automaticPublicationAuthorized:false,closureAttested:false};
    }
  } catch (error) {
    const bounded = new Set(['CHECKOUT_SHA_MISMATCH','INVALID_BASELINE','TREE_TRUNCATED','DIFF_TRUNCATED',
      'DIFF_STATUS_INVALID','DIFF_PATH_INVALID','DIFF_LIMIT_EXCEEDED','INVALID_OBSERVATION','INVENTORY_UNREADABLE','INVALID_CHANGE',
      'TREE_ENTRY_INVALID','TREE_LIMIT_EXCEEDED','TREE_COVERAGE_MISMATCH']);
    const reason = bounded.has(error?.message) ? error.message : 'DOCUMENTARY_OBSERVATION_UNVERIFIED';
    report = {schemaVersion:1,repository:REPO,headSha,status:'DOCUMENTARY_CLOSURE_BLOCKED',
      closureAttested:false,technicalDeploymentIndependent:true,coverage:{complete:false},
      reasons:[reason],nextAction:'REOBSERVE_AND_RESOLVE_BLOCKERS',mutationPerformed:false};
  }
  const reportBytes=JSON.stringify({...report,observedAt:new Date().toISOString()},null,2)+'\n';
  writeFileSync(env.DOCUMENTARY_REPORT_FILE,reportBytes,{mode:0o600});
  appendFileSync(env.GITHUB_STEP_SUMMARY, '\n### Documentary closure: '+report.status+'\n\n'
    +'Technical deployment and documentary closure are independent. Global closure is NOT attested.\n\n'
    +'Reasons: '+report.reasons.join(', ')+'\n\n'
    +(report.corpusObservation ? 'Tracked Git objects: '+report.corpusObservation.trackedCount+'; documentary candidates: '+report.corpusObservation.candidateCount+'; structural reads: '+report.corpusObservation.structuralReadCount+'; identity only: '+report.corpusObservation.identityOnlyCount+'; unverified content: '+report.corpusObservation.structuralUnverifiedCount+'\n\n' : '')
    +(report.corpusObservation ? 'Historical preservation obligations: '+report.corpusObservation.historicalPreservedCount+' verified byte-preservation; '+report.corpusObservation.historicalUnverifiedCount+' unverified. Historical contents are not certified.\n\n' : '')
    +(report.liveAuthorities ? 'Exact authority comparisons: '+report.liveAuthorities.matchedCount+'/'+report.liveAuthorities.checks.length+'; runtime families still unverified: '+report.liveAuthorities.unresolvedRuntime.length+'\n\n' : '')
    +(report.hierarchicalPlan ? 'Common documentary plan: '+report.hierarchicalPlan.status+'; scopes '+report.hierarchicalPlan.coverage.scopeCount+'; obligations/issues '+report.hierarchicalPlan.issues.length+'; candidates '+report.hierarchicalPlan.coverage.plannedCount+'/'+report.hierarchicalPlan.coverage.candidateCount+'; impact reviews '+report.hierarchicalPlan.coverage.impactReviewCount+'\n\n' : '')
    +(report.loopbackCandidate ? 'Loopback checkpoint candidate: '+report.loopbackCandidate.status+'; '+(report.loopbackCandidate.reason??'exact-content proposal')+'; no publication authorized by this report.\n\n' : '')
    +(report.g1ReasonCodes?.length ? 'G1 diagnostics: '+report.g1ReasonCodes.join(', ')+'\n\n' : '')
    +'Next action: '+report.nextAction+'\n\n'
    +'See the documentary-closure artifact for paths, differences and coverage.\n');
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT,'closure-status='+report.status+'\nreport-digest='+createHash('sha256').update(reportBytes).digest('hex')+'\n');
  return report;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if(process.argv[2]==='--plan'){
    if(process.argv.length<4||process.argv.length>5)throw Error('DOCUMENTARY_PLAN_ARGUMENTS_INVALID');
    const plan=observeCommonPlanAtCheckout(process.argv[3],process.argv[4]??process.argv[3]);
    console.log(JSON.stringify(plan,null,2));
    // Successful observation != semantic certification. Exit status is the
    // structural planning gate; semantic verdict remains in the envelope.
    if(plan.status==='BLOCKED_OR_UNVERIFIED')process.exitCode=2;
  }else main();
}
