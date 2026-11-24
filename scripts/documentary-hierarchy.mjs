// One read-only documentary plan for every entry channel. No store, admission,
// permissions, task creation, or document writes. Derived from the exact Git
// tree and existing documentary authorities. Structural reads are not proof
// of semantic currency, nor proof that an external agent read a document.
import { createHash } from 'node:crypto';
import { posix } from 'node:path';

export const FOUNDATION_SOURCE='memory/LOOP_ENGINEERING_INSTRUCTIONS_DOCX_EXTRACT_20260702.md';
export const FOUNDATION_DOCUMENTS=Object.freeze([
  'GPT.md','SUIVI.md','README.md','README_DEV.md','ROADMAP.md','TODO.md','TASKS.md',
  'CODE_REVIEW.md','CHANGELOG.md','DEPLOYMENT_PRODUCTION.md','ARCHITECTURE.md',
  'DATABASE.md','DOCKER.md','KUBERNETES_FUTURE.md','SECURITY.md','MONITORING.md',
  'BACKUP_RESTORE.md','MIGRATION.md','AGENTS_ARCHITECTURE.md','AI_SKILLS.md'
]);
export const ORIGINAL_READING_ORDER=Object.freeze([
  ...FOUNDATION_DOCUMENTS.slice(0,12),'MIGRATION.md','DOCKER.md','SECURITY.md',
  'AGENTS_ARCHITECTURE.md','AI_SKILLS.md'
]);
const CURRENT_INTAKE=Object.freeze(['README.md','AGENTS.md','CLAUDE.md','SUIVI.md',
  'docs/governance/README.md','SOURCE_OF_TRUTH.md','NO_REGRESSION_POLICY.md',
  '.mcp/github-first-operational-policy.json']);
const ROOT_EXTRA=Object.freeze(['PROJECT_BRIEF.md','PROJECT_SCOPE.md','PROJECT_RULES.md',
  'LOOP_ENGINEERING.md','DECISIONS_LOG.md','ACTIVITY_LOG.md','MCP_REPO_INVENTORY.md',
  'MCP_FUNCTIONAL_CARTOGRAPHY.md','MCP_FUNCTIONS_AND_TOOLS_MANUAL.md','MCP_SERVER_MAPPING.md',
  'MCP_SERVER_REGISTRY.md','MCP_ANTI_DISPERSION_GOVERNANCE.md','MCP_ONBOARDING_ENGINE.md',
  'MCP_CONNECTION_IDENTITY_MODEL.md','MCP_PERMISSIONS_MODEL.md','PRODUCTION_STATE.json',
  'data/mcp-git-registry.json','data/github-accounts.json','memory/manifest.json',
  'docs/governance/markdown-inventory.json']);
export const LOOPBACK_SOURCES=Object.freeze([
  'LOOP_ENGINEERING.md','memory/README.md','memory/SUIVI_MEMORY.md',
  'memory/INDEX_MEMOIRE_WEALTHTECH_20260701.md','memory/LOOPBACK_WEALTHTECH_CURRENT.md',
  'memory/LOOP_ENGINEERING_WEALTHTECH_20260701.md',
  'memory/LOOP_ENGINEERING_WEALTHTECH_MASTER_PLAN_20260702.md',
  'memory/LOOP_ENGINEERING_WEALTHTECH_PLAYBOOK_COMPLET_20260702.md',
  'memory/MATRICE_TRACABILITE_SOURCES_EXIGENCES_TRACKS_20260702.md'
]);
const MISSION_TYPES=Object.freeze(['SOURCE_OF_TRUTH','DOCUMENT_AUTHORITIES','MISSION','DECISIONS',
  'CONTINUITY','MEMORY','INTENTIONS','ROADMAP','SUIVI','TASKS','TODO','IMPLEMENTATION_PLAN',
  'EVIDENCE_INDEX','AGENTS']);
// Existing mission reader requires the fourteen types above. Extending this
// baseline to project/subproject/subworkstream is the new target policy; a
// missing local file may be an unresolved equivalent, never an instruction to
// fabricate a second authority. Architecture/cartography may be equivalents.
const LOCAL_TYPES=Object.freeze([...MISSION_TYPES,'ARCHITECTURE','CARTOGRAPHY']);
const SHA=/^[a-f0-9]{40}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const TYPE=/^[A-Z][A-Z0-9_]{0,127}$/;
const LIMIT=20000;
const ROOT='REPOSITORY_ROOT';
const sha256=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const uniq=a=>[...new Set(a)];
const safePath=p=>typeof p==='string'&&p.length>0&&p.length<=1024&&
  !/[\x00-\x1f\x7f\\]/.test(p)&&!p.startsWith('/')&&!p.split('/').some(x=>!x||x==='.'||x==='..');
const sensitive=p=>/(^|\/)(?:\.env(?:\.|$)|secrets?|credentials?)(?:\/|$)/iu.test(p);
const textKind=p=>/\.(?:md|json|txt|csv|tsv|xml|ya?ml|toml|ini|rst|adoc)$/i.test(p);

export function observeFoundationContract(body) {
  if(typeof body!=='string'||body.includes('\uFFFD')||body.includes('\u0000'))
    return {status:'UNVERIFIED',reason:'FOUNDATION_SOURCE_UNREADABLE'};
  const lines=body.split(/\r?\n/);
  const a=lines.findIndex(l=>/^5\. Fichiers de mémoire persistante obligatoires\s*$/.test(l));
  const b=lines.findIndex(l=>/^6\. Ordre obligatoire de lecture avant toute action\s*$/.test(l));
  const c=lines.findIndex(l=>/^7\. Boucle principale de Loop Engineering\s*$/.test(l));
  if(a<0||b<=a||c<=b)return {status:'UNVERIFIED',reason:'FOUNDATION_SECTIONS_UNRESOLVED'};
  const files=xs=>xs.map(x=>x.trim()).filter(x=>/^[A-Z][A-Z0-9_]*\.md$/.test(x));
  // Section 5 repeats SUIVI as the central file; do not count that as an
  // extra founding document.
  const required=uniq(files(lines.slice(a+1,b)));
  const reading=files(lines.slice(b+1,c));
  const checkpoint=lines.slice(b+1,c).some(l=>l.trim()==='# POINT DE REPRISE COURANT');
  const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  if(!same(required,FOUNDATION_DOCUMENTS)||!same(reading,ORIGINAL_READING_ORDER)||!checkpoint)
    return {status:'CONFLICT',reason:'FOUNDATION_READING_CONTRACT_CHANGED',required,reading,checkpoint};
  return {status:'MATCHED',reason:null,required,reading,checkpoint:true};
}

const SEGMENTS=new Map([
  ['sous-projets','SUBPROJECT'],['subprojects','SUBPROJECT'],['subprojets','SUBPROJECT'],
  ['chantiers','WORKSTREAM'],['missions','WORKSTREAM'],
  ['subchantiers','SUBWORKSTREAM'],['sous-chantiers','SUBWORKSTREAM']
]);
const LEVEL={PROJECT:2,SUBPROJECT:3,WORKSTREAM:4,SUBWORKSTREAM:5};
// Only the declared directory convention is recognized. Lexical identity is
// not a runtime Project Binding. An unknown path remains unresolved.
export function parseDocumentScope(path) {
  if(!safePath(path)||!path.startsWith('docs/projects/'))return null;
  const parts=path.split('/');
  const id=parts[2];
  if(!ID.test(id??'')||parts.length<4)return null;
  const chain=[{id,kind:'PROJECT',level:2,key:parts.slice(0,3).join('/'),parentKey:ROOT}];
  let i=3;
  while(i<parts.length-1&&SEGMENTS.has(parts[i])){
    const kind=SEGMENTS.get(parts[i]),child=parts[i+1],parent=chain.at(-1);
    if(!ID.test(child??'')||i+2>=parts.length||
      (kind==='SUBPROJECT'&&!['PROJECT','SUBPROJECT'].includes(parent.kind))||
      (kind==='WORKSTREAM'&&!['PROJECT','SUBPROJECT'].includes(parent.kind))||
      (kind==='SUBWORKSTREAM'&&!['WORKSTREAM','SUBWORKSTREAM'].includes(parent.kind)))return null;
    chain.push({id:child,kind,level:LEVEL[kind],key:parts.slice(0,i+2).join('/'),parentKey:parent.key});
    i+=2;
    if(chain.length>16)return null;
  }
  if(i!==parts.length-1)return null;
  const owner=chain.at(-1),file=parts[i];
  if(!file.startsWith(owner.id+'__')||!file.endsWith('.md'))return null;
  const type=file.slice(owner.id.length+2,-3);
  if(!TYPE.test(type))return null;
  return {chain,scopeKey:owner.key,type};
}

const IMPACT_TYPES=Object.freeze({
  INTENTIONS:['MEMORY','DECISIONS','MISSION','ARCHITECTURE','ROADMAP','IMPLEMENTATION_PLAN','TASKS','TODO','SUIVI','CONTINUITY'],
  DECISIONS:['MEMORY','MISSION','AGENTS','SOURCE_OF_TRUTH','ARCHITECTURE','CARTOGRAPHY','ROADMAP','IMPLEMENTATION_PLAN','TASKS','TODO','SUIVI','CONTINUITY'],
  MISSION:['INTENTIONS','ARCHITECTURE','CARTOGRAPHY','ROADMAP','IMPLEMENTATION_PLAN','TASKS','TODO','SUIVI','CONTINUITY'],
  ARCHITECTURE:['CARTOGRAPHY','IMPLEMENTATION_PLAN','ROADMAP','TASKS','TODO','EVIDENCE_INDEX','SUIVI','CONTINUITY'],
  CARTOGRAPHY:['ARCHITECTURE','IMPLEMENTATION_PLAN','TASKS','TODO','SUIVI'],
  ROADMAP:['IMPLEMENTATION_PLAN','TASKS','TODO','SUIVI','CONTINUITY'],
  IMPLEMENTATION_PLAN:['TASKS','TODO','SUIVI','EVIDENCE_INDEX','CONTINUITY'],
  TASKS:['TODO','SUIVI','EVIDENCE_INDEX','CONTINUITY'],
  EVIDENCE_INDEX:['TASKS','TODO','SUIVI','CONTINUITY'],
  SOURCE_OF_TRUTH:['DOCUMENT_AUTHORITIES','AGENTS','MEMORY','CONTINUITY'],
  DOCUMENT_AUTHORITIES:['SOURCE_OF_TRUTH','AGENTS','MEMORY','CONTINUITY'],
  AGENTS:['CONTINUITY','MEMORY']
});
const ROOT_TYPE={
  'PROJECT_BRIEF.md':'MISSION','PROJECT_SCOPE.md':'MISSION','DECISIONS_LOG.md':'DECISIONS',
  'AGENTS.md':'AGENTS','CLAUDE.md':'AGENTS','GPT.md':'AGENTS','SOURCE_OF_TRUTH.md':'SOURCE_OF_TRUTH',
  'ARCHITECTURE.md':'ARCHITECTURE','MCP_FUNCTIONAL_CARTOGRAPHY.md':'CARTOGRAPHY',
  'ROADMAP.md':'ROADMAP','TASKS.md':'TASKS','TODO.md':'TODO','SUIVI.md':'SUIVI',
  'PRODUCTION_STATE.json':'EVIDENCE_INDEX','DEPLOYMENT_PRODUCTION.md':'EVIDENCE_INDEX',
  'docs/governance/markdown-inventory.json':'DOCUMENT_AUTHORITIES',
  '.mcp/function-cartography.json':'CARTOGRAPHY'
};
const LOCAL_ALIASES={MANDATE:'MISSION',PROJECT_BRIEF:'MISSION'};
const statusRead=(path,byPath,readText)=>{
  if(!byPath.has(path))return 'MISSING_OR_EQUIVALENT_UNVERIFIED';
  if(sensitive(path)||!textKind(path))return 'CONTENT_UNVERIFIED';
  const e=byPath.get(path);
  if(e.type!=='blob'||!['100644','100755'].includes(e.mode))return 'CONTENT_UNVERIFIED';
  try {
    const body=readText(path);
    if(typeof body!=='string'||!body.trim()||body.includes('\uFFFD')||body.includes('\u0000'))return 'CONTENT_UNVERIFIED';
    if(path.endsWith('.json'))JSON.parse(body);
    return 'CONTENT_READ';
  } catch {return 'CONTENT_UNVERIFIED';}
};

// Only the explicitly designated active checkpoint is interpreted. Other
// historical NEXT_ACTION entries and free-form SHAs remain historical.
export function observeLoopbackCheckpoint(body) {
  const fail=reason=>({status:'UNVERIFIED',reason,declared:null});
  if(typeof body!=='string'||body.includes('\uFFFD')||body.includes('\u0000'))return fail('CHECKPOINT_UNREADABLE');
  const lines=body.split(/\r?\n/);
  const fence=String.fromCharCode(96).repeat(3);
  const marker=fence+'loopback-checkpoint';
  // Interpret headings and contract blocks only outside Markdown code fences.
  // Archived examples must never become an active navigation checkpoint.
  const headings=[],blocks=[];
  let open=null;
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    const token=/^ {0,3}(\x60{3,}|~{3,})(.*)$/.exec(line);
    if(open){
      if(token&&token[1][0]===open.char&&token[1].length>=open.length&&/^[ \t]*$/.test(token[2])){
        if(open.contract)blocks.push({start:open.start,end:i});
        open=null;
      }
      continue;
    }
    if(token&&(token[1][0]!=='\x60'||!token[2].includes('\x60'))){
      open={char:token[1][0],length:token[1].length,start:i,contract:line===marker};
      continue;
    }
    const h=/^(#{1,6})\s+(.+)$/.exec(line);
    if(h)headings.push({index:i,level:h[1].length,active:/^POINT DE REPRISE COURANT\s*$/i.test(h[2])});
  }
  if(open?.contract)blocks.push({start:open.start,end:null});
  const active=headings.filter(h=>h.active);
  if(active.length!==1)return fail(active.length?'CHECKPOINT_AMBIGUOUS':'CHECKPOINT_MISSING');
  const {index:from,level}=active[0];
  const end=headings.find(h=>h.index>from&&h.level<=level)?.index??lines.length;
  const scoped=blocks.filter(b=>b.start>from&&b.start<end);
  if(scoped.length!==1)return fail('CHECKPOINT_CONTRACT_MISSING_OR_AMBIGUOUS');
  const block=scoped[0];
  if(block.end===null||block.end>=end)return fail('CHECKPOINT_CONTRACT_INVALID');
  const raw=lines.slice(block.start+1,block.end).join('\n');
  if(raw.length>4096)return fail('CHECKPOINT_CONTRACT_INVALID');
  try{
    const p=JSON.parse(raw);
    const keys=['schemaVersion','scope','observedAt','observedMainSha','continuityId','proofIssue','observationStatus','nextAction'];
    if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).length!==keys.length||
      keys.some(k=>!Object.hasOwn(p,k))||p.schemaVersion!==1||p.scope!=='REPOSITORY_NAVIGATION'||
      typeof p.observedAt!=='string'||!Number.isFinite(Date.parse(p.observedAt))||!SHA.test(p.observedMainSha??'')||
      !ID.test(p.continuityId??'')||!Number.isSafeInteger(p.proofIssue)||p.proofIssue<1||
      p.observationStatus!=='REOBSERVE_REQUIRED'||p.nextAction!=='REOBSERVE_GITHUB_S1_RUNTIME_AND_CONTINUITY')
      return fail('CHECKPOINT_CONTRACT_INVALID');
    return {status:'PRESENT',reason:null,declared:p,proofStatus:'DECLARED_REOBSERVE_REQUIRED',closureAttested:false};
  }catch{return fail('CHECKPOINT_CONTRACT_INVALID');}
}

// Resolve only explicit declarations in the existing owner's document.
// Never infer identity from a similar filename or make a child a runtime
// project. The resulting evidence is a declared documentary equivalence.
export function parseRootDocumentaryEquivalences(body,scopeKey) {
  if(typeof body!=='string'||typeof scopeKey!=='string'||!/^docs\/projects\/[A-Za-z0-9_.-]+$/.test(scopeKey))
    return {status:'UNVERIFIED',rows:[]};
  const fence=String.fromCharCode(96).repeat(3);
  const marker=fence+'documentary-authority-equivalence';
  const blocks=body.split('\n').filter(l=>l===marker);
  if(blocks.length!==1)return {status:blocks.length?'CONFLICT':'UNVERIFIED',rows:[]};
  const start=body.indexOf(marker+'\n'),end=body.indexOf('\n'+fence,start+marker.length+1);
  if(start<0||end<0||end-start>16384)return {status:'UNVERIFIED',rows:[]};
  try{
    const data=JSON.parse(body.slice(start+marker.length+1,end));
    if(data?.schemaVersion!==1||data.scopeKey!==scopeKey||data.identityStatus!=='DOCUMENTARY_CANDIDATE'||
      !Array.isArray(data.equivalences)||data.equivalences.length>LOCAL_TYPES.length||
      new Set(data.equivalences.map(r=>r.type)).size!==data.equivalences.length||
      data.equivalences.some(r=>!LOCAL_TYPES.includes(r.type)||!Array.isArray(r.paths)||!r.paths.length||
        r.paths.length>12||new Set(r.paths).size!==r.paths.length||r.paths.some(p=>!safePath(p)||sensitive(p)||
          !(p.endsWith('.md')||p.endsWith('.json'))||p.startsWith('docs/projects/')||
          !(!p.includes('/')||p.startsWith('memory/')||p.startsWith('docs/governance/')||p.startsWith('.mcp/')))))
      return {status:'CONFLICT',rows:[]};
    return {status:'DECLARED',rows:data.equivalences.map(({type,paths})=>({type,paths,sourcePath:'SOURCE_OF_TRUTH.md'}))};
  }catch{return {status:'UNVERIFIED',rows:[]};}
}
export function parseLocalDocumentaryEquivalences(body,scope) {
  if(typeof body!=='string'||!scope?.id||!scope?.key)return [];
  // Existing authority map uses an explicit Markdown table. Parse only its
  // architecture and cartography rows, not arbitrary prose or links.
  const section=body.split('## Référentiel de types et autorité de la mission')[1]?.split(/\n## /)[0];
  if(!section)return [];
  const rows=[];
  const families=new Map([['AUDIT / CARTOGRAPHY','CARTOGRAPHY'],['ARCHITECTURE / CONVERGENCE','ARCHITECTURE']]);
  for(const line of section.split('\n')){
    const cells=line.split('|').map(s=>s.trim());
    const type=families.get(cells[1]);
    if(!type)continue;
    const paths=[...cells[2].matchAll(/\x60(__[A-Z0-9_]+\.md)\x60/g)].map(m=>scope.key+'/'+scope.id+m[1]);
    if(paths.length&&new Set(paths).size===paths.length&&paths.every(safePath))rows.push({type,paths,sourcePath:scope.key+'/'+scope.id+'__DOCUMENT_AUTHORITIES.md'});
  }
  return new Set(rows.map(r=>r.type)).size===rows.length?rows:[];
}

// Local SOURCE_OF_TRUTH may explicitly carry several documentary functions.
// Only exact paths in the SAME lexical scope are admissible. No authority,
// admission, runtime identity or content attestation is inferred. Other
// scopes keep their own source maps; parent plans are referenced in prose.
export function parseScopedDocumentaryEquivalences(body,scope) {
  const none=status=>({status,rows:[]});
  if(typeof body!=='string'||!scope?.id||!scope?.key)return none('UNVERIFIED');
  const sourcePath=scope.key+'/'+scope.id+'__SOURCE_OF_TRUTH.md';
  if(parseDocumentScope(sourcePath)?.scopeKey!==scope.key)return none('UNVERIFIED');
  const lines=body.split(/\r?\n/), marker='\x60\x60\x60scoped-documentary-equivalence';
  let open=null;const blocks=[];
  for(let i=0;i<lines.length;i++){
    const token=/^ {0,3}(\x60{3,}|~{3,})(.*)$/.exec(lines[i]);
    if(open){
      if(token&&token[1][0]===open.char&&token[1].length>=open.length&&/^[ \t]*$/.test(token[2])){
        if(open.contract)blocks.push(lines.slice(open.start+1,i).join('\n'));
        open=null;
      }
      continue;
    }
    if(token&&(token[1][0]!=='\x60'||!token[2].includes('\x60')))
      open={char:token[1][0],length:token[1].length,start:i,contract:lines[i]===marker};
  }
  if(open?.contract)return none('CONFLICT');
  if(!blocks.length)return none('ABSENT');
  if(blocks.length!==1||blocks[0].length>16384)return none('CONFLICT');
  // These roles are compatible documentary forms, not arbitrary aliases.
  // A dedicated authoritative document always wins; a simultaneous local
  // declaration must be surfaced as an ambiguity, not silently preferred.
  const permitted={
    DOCUMENT_AUTHORITIES:['SOURCE_OF_TRUTH'],
    INTENTIONS:['MANDATE','MISSION','MEMORY'],
    IMPLEMENTATION_PLAN:['ROADMAP','TASKS']
  };
  try{
    const data=JSON.parse(blocks[0]);
    if(!data||Object.keys(data).sort().join(',')!=='equivalences,identityStatus,schemaVersion,scopeKey'||
      data.schemaVersion!==1||data.scopeKey!==scope.key||data.identityStatus!=='DOCUMENTARY_CANDIDATE'||
      !Array.isArray(data.equivalences)||data.equivalences.length<1||data.equivalences.length>3||
      new Set(data.equivalences.map(r=>r.type)).size!==data.equivalences.length)return none('CONFLICT');
    for(const r of data.equivalences){
      if(!r||Object.keys(r).sort().join(',')!=='paths,type'||!Object.hasOwn(permitted,r.type)||
        !Array.isArray(r.paths)||!r.paths.length||r.paths.length>3||new Set(r.paths).size!==r.paths.length||
        r.paths.some(path=>{const p=parseDocumentScope(path);return !p||p.scopeKey!==scope.key||
          !permitted[r.type].includes(p.type)||sensitive(path);}))return none('CONFLICT');
      const types=r.paths.map(path=>parseDocumentScope(path).type);
      if(r.type==='INTENTIONS'&&(!types.includes('MEMORY')||!types.some(t=>t==='MISSION'||t==='MANDATE')))return none('CONFLICT');
      if(r.type==='IMPLEMENTATION_PLAN'&&(!types.includes('ROADMAP')||!types.includes('TASKS')))return none('CONFLICT');
    }
    return {status:'DECLARED',rows:data.equivalences.map(({type,paths})=>({type,paths,sourcePath}))};
  }catch{return none('CONFLICT');}
}

export function buildCommonDocumentaryPlan({headSha,entries,candidatePaths,changes=[],readText}) {
  if(!SHA.test(headSha??'')||!Array.isArray(entries)||entries.length>LIMIT||
    !entries.every(e=>safePath(e?.path)&&SHA.test(e.oid??''))||
    !Array.isArray(candidatePaths)||candidatePaths.length>LIMIT||!candidatePaths.every(safePath)||
    !Array.isArray(changes)||changes.length>LIMIT||typeof readText!=='function')
    throw Error('DOCUMENTARY_PLAN_INPUT_INVALID');
  const byPath=new Map(entries.map(e=>[e.path,e]));
  if(byPath.size!==entries.length||new Set(candidatePaths).size!==candidatePaths.length||
    candidatePaths.some(p=>!byPath.has(p)))throw Error('DOCUMENTARY_PLAN_TREE_MISMATCH');
  const scopes=new Map([[ROOT,{key:ROOT,id:null,kind:'REPOSITORY',level:1,parentKey:null,documents:[],types:new Map()}]]);
  const issue=[];
  const rows=[];
  const rowByPath=new Map();
  for(const p of [...candidatePaths].sort()){
    const match=parseDocumentScope(p);
    let owner=ROOT,type=ROOT_TYPE[p]??null,scopeStatus='REPOSITORY_LOCATION_ONLY';
    if(p.startsWith('docs/projects/')){
      if(!match){
        owner=null;type=null;scopeStatus='UNVERIFIED';
        issue.push({code:'SCOPED_PATH_UNRESOLVED',path:p});
      } else {
        for(const n of match.chain)if(!scopes.has(n.key))scopes.set(n.key,{...n,documents:[],types:new Map()});
        owner=match.scopeKey;type=LOCAL_ALIASES[match.type]??match.type;scopeStatus='DOCUMENTARY_PATH_ONLY';
      }
    }
    const row={path:p,oid:byPath.get(p).oid,scopeKey:owner,documentType:type,scopeStatus,
      readStatus:'NOT_READ_BY_PLAN',semanticStatus:'UNVERIFIED',
      action:'VERIFY_CURRENCY_AND_DEPENDENCIES',directChange:false,impactReviewRequired:false};
    rows.push(row);rowByPath.set(p,row);
    if(owner!==null){
      const s=scopes.get(owner);s.documents.push(p);
      if(type){if(!s.types.has(type))s.types.set(type,[]);s.types.get(type).push(p);}
    }
  }
  const scopesById=new Map();
  for(const s of scopes.values())if(s.id!==null){
    if(scopesById.has(s.id))issue.push({code:'DUPLICATE_SCOPE_ID',scopeKey:s.key,otherScopeKey:scopesById.get(s.id)});
    else scopesById.set(s.id,s.key);
  }
  const foundationEntry=byPath.get(FOUNDATION_SOURCE);
  let foundation={status:'UNVERIFIED',reason:'FOUNDATION_SOURCE_MISSING'};
  if(foundationEntry)try{
    if(statusRead(FOUNDATION_SOURCE,byPath,readText)==='CONTENT_READ')foundation=observeFoundationContract(readText(FOUNDATION_SOURCE));
    else foundation={status:'UNVERIFIED',reason:'FOUNDATION_SOURCE_UNREADABLE'};
  }catch{foundation={status:'UNVERIFIED',reason:'FOUNDATION_SOURCE_UNREADABLE'};}
  if(foundation.status!=='MATCHED')issue.push({code:foundation.reason,path:FOUNDATION_SOURCE});
  const observations=new Map();
  function read(path){
    if(!observations.has(path))observations.set(path,statusRead(path,byPath,readText));
    const status=observations.get(path);
    if(rowByPath.has(path))rowByPath.get(path).readStatus=status;
    return {path,oid:byPath.get(path)?.oid??null,status};
  }
  // Preserve the current INTAKE first, and the founding order as a distinct
  // ordered sequence including its explicit checkpoint reread.
  const intake=CURRENT_INTAKE.map(read);
  const foundingSequence=ORIGINAL_READING_ORDER.map(read);
  // Re-read from the same immutable snapshot, not a stale mutable worktree.
  const checkpoint=read('SUIVI.md');
  let checkpointObservation={status:'UNVERIFIED',reason:'CHECKPOINT_UNREADABLE',declared:null};
  if(checkpoint.status==='CONTENT_READ')try{checkpointObservation=observeLoopbackCheckpoint(readText('SUIVI.md'));}catch{}
  if(checkpointObservation.status!=='PRESENT')issue.push({code:'FOUNDATION_CHECKPOINT_UNVERIFIED',path:'SUIVI.md',reason:checkpointObservation.reason});
  const loopbackReads=LOOPBACK_SOURCES.map(read);
  for(const source of loopbackReads)if(source.status!=='CONTENT_READ')issue.push({code:'LOOPBACK_SOURCE_UNVERIFIED',path:source.path});

  const rootRequired=uniq([...CURRENT_INTAKE,...FOUNDATION_DOCUMENTS,...ROOT_EXTRA,...LOOPBACK_SOURCES,
    ...candidatePaths.filter(p=>p.startsWith('.mcp/')&&p.endsWith('.json'))]);
  const scopePlans=[];
  const sortedScopes=[...scopes.values()].sort((a,b)=>a.key===ROOT?-1:b.key===ROOT?1:a.key.split('/').length-b.key.split('/').length||a.key.localeCompare(b.key));
  const explicitEquivalences=[];
  for(const scope of sortedScopes){
    const required=[];
    let equivalences=[];
    if(scope.kind==='PROJECT'&&read('SOURCE_OF_TRUTH.md').status==='CONTENT_READ'){
      try{const r=parseRootDocumentaryEquivalences(readText('SOURCE_OF_TRUTH.md'),scope.key);
        if(r.status==='DECLARED')equivalences=r.rows;
        else if(r.status==='CONFLICT')issue.push({code:'PROJECT_AUTHORITY_EQUIVALENCE_CONFLICT',scopeKey:scope.key});
      }catch{issue.push({code:'PROJECT_AUTHORITY_EQUIVALENCE_UNVERIFIED',scopeKey:scope.key});}
    }
    const truthPaths=scope.types.get('SOURCE_OF_TRUTH')??[];
    if(scope.key!==ROOT&&truthPaths.length===1&&read(truthPaths[0]).status==='CONTENT_READ')try{
      const local=parseScopedDocumentaryEquivalences(readText(truthPaths[0]),scope);
      if(local.status==='DECLARED'){
        for(const eq of local.rows){
          if(scope.types.has(eq.type))issue.push({code:'LOCAL_AUTHORITY_EQUIVALENCE_CONFLICT',scopeKey:scope.key,type:eq.type});
          else equivalences.push(eq);
        }
      }else if(local.status==='CONFLICT')issue.push({code:'LOCAL_AUTHORITY_EQUIVALENCE_CONFLICT',scopeKey:scope.key});
    }catch{issue.push({code:'LOCAL_AUTHORITY_EQUIVALENCE_UNVERIFIED',scopeKey:scope.key});}
    const authorityPaths=scope.types.get('DOCUMENT_AUTHORITIES')??[];
    if(scope.key!==ROOT&&authorityPaths.length===1&&read(authorityPaths[0]).status==='CONTENT_READ')try{
      equivalences.push(...parseLocalDocumentaryEquivalences(readText(authorityPaths[0]),scope));
    }catch{issue.push({code:'LOCAL_AUTHORITY_EQUIVALENCE_UNVERIFIED',scopeKey:scope.key});}

    if(scope.key===ROOT){
      for(const path of rootRequired){
        const observed=read(path);
        required.push({type:ROOT_TYPE[path]??path,paths:[path],status:observed.status});
      }
    }else{
      for(const type of LOCAL_TYPES){
        const paths=scope.types.get(type)??[];
        if(paths.length===0){
          const declared=equivalences.filter(r=>r.type===type);
          if(declared.length===1){
            const eq=declared[0];
            const available=eq.paths.every(p=>rowByPath.has(p)&&read(p).status==='CONTENT_READ');
            const status=available?'DECLARED_EQUIVALENT_READ':'MISSING_OR_EQUIVALENT_UNVERIFIED';
            required.push({type,paths:eq.paths,status,authoritySource:eq.sourcePath,semanticStatus:'UNVERIFIED'});
            explicitEquivalences.push({scopeKey:scope.key,type,paths:eq.paths,sourcePath:eq.sourcePath,status,semanticStatus:'UNVERIFIED'});
            continue;
          }
          if(declared.length>1){required.push({type,paths:[],status:'AUTHORITY_AMBIGUOUS'});continue;}
        }
        const status=paths.length===0?'MISSING_OR_EQUIVALENT_UNVERIFIED':paths.length>1?'AUTHORITY_AMBIGUOUS':read(paths[0]).status;
        required.push({type,paths,status});
      }
    }
    for(const r of required)if(!['CONTENT_READ','DECLARED_EQUIVALENT_READ'].includes(r.status))issue.push({code:'REQUIRED_DOCUMENT_'+r.status,scopeKey:scope.key,type:r.type,paths:r.paths});
    const ordered=uniq([...required.flatMap(r=>r.paths),...scope.documents.sort()]);
    const readSequence=ordered.map(p=>({
      path:p,oid:byPath.get(p)?.oid??null,
      status:byPath.has(p)&&textKind(p)&&!sensitive(p)?read(p).status:'PRESERVATION_OR_AUTHORITY_REVIEW'
    }));
    const inheritedScopes=[];
    let parent=scope.parentKey;
    while(parent){inheritedScopes.unshift(parent);parent=scopes.get(parent)?.parentKey??null;}
    scopePlans.push({scopeKey:scope.key,scopeId:scope.id,kind:scope.kind,level:scope.level,parentKey:scope.parentKey,
      inheritedScopes,identityStatus:scope.key===ROOT?'EXACT_REPOSITORY_TREE':'DOCUMENTARY_PATH_ONLY',
      required,readSequence,authorityMapStatus:scope.key===ROOT?'EXISTING_ROOT_AUTHORITIES_REUSED':
        (required.some(r=>r.type==='DOCUMENT_AUTHORITIES'&&['CONTENT_READ','DECLARED_EQUIVALENT_READ'].includes(r.status))?'DECLARATION_PRESENT_NOT_SEMANTICALLY_VERIFIED':'UNVERIFIED'),
      semanticStatus:'UNVERIFIED'});
  }
  // A change creates review obligations, not an assertion that content must
  // change. Parent/child propagation is scoped; no blanket rewrite.
  const edges=new Map();
  function edge(from,to,kind){
    if(from===to||!rowByPath.has(from)||!rowByPath.has(to))return;
    const key=from+'\0'+to+'\0'+kind;
    if(!edges.has(key))edges.set(key,{from,to,kind,verification:'REVIEW_RULE_NOT_PROVEN_DEPENDENCY'});
    if(edges.size>LIMIT*8)throw Error('DOCUMENTARY_PLAN_EDGE_LIMIT');
  }
  const childrenByParent=new Map();
  for(const scope of scopes.values())if(scope.parentKey){
    if(!childrenByParent.has(scope.parentKey))childrenByParent.set(scope.parentKey,[]);
    childrenByParent.get(scope.parentKey).push(scope);
  }
  for(const scope of scopes.values()){
    for(const [type,paths] of scope.types){
      for(const p of paths){
        for(const targetType of IMPACT_TYPES[type]??[])for(const q of scope.types.get(targetType)??[])edge(p,q,'LOCAL_IMPACT_REVIEW');
        if(scope.parentKey&&['SUIVI','CONTINUITY','EVIDENCE_INDEX','TASKS','ROADMAP'].includes(type)){
          const parent=scopes.get(scope.parentKey);
          for(const k of ['SUIVI','ROADMAP','TASKS','TODO','CONTINUITY','EVIDENCE_INDEX'])
            for(const q of parent?.types.get(k)??[])edge(p,q,'ASCENDING_IMPACT_REVIEW');
        }
        if(['MISSION','DECISIONS','AGENTS','SOURCE_OF_TRUTH','ARCHITECTURE','DOCUMENT_AUTHORITIES'].includes(type)){
          for(const child of childrenByParent.get(scope.key)??[])
            for(const k of ['AGENTS','MISSION','SOURCE_OF_TRUTH','ARCHITECTURE','ROADMAP','TASKS','SUIVI'])
              for(const q of child.types.get(k)??[])edge(p,q,'DESCENDING_IMPACT_REVIEW');
        }
      }
    }
  }
  // A declared equivalence must remain connected to the original sources
  // so later changes in either direction trigger a review, not a rewrite.
  for(const eq of explicitEquivalences)if(eq.status==='DECLARED_EQUIVALENT_READ'){
    for(const path of eq.paths){
      edge(path,eq.sourcePath,'DECLARED_EQUIVALENCE_REVIEW');
      edge(eq.sourcePath,path,'DECLARED_EQUIVALENCE_REVIEW');
      const scope=scopes.get(eq.scopeKey);
      for(const target of IMPACT_TYPES[eq.type]??[])
        for(const q of scope?.types.get(target)??[])edge(path,q,'DECLARED_EQUIVALENCE_IMPACT_REVIEW');
    }
  }
  const rootJoins=[
    ['.mcp/agents.json','AGENTS.md'],['.mcp/permissions.json','MCP_PERMISSIONS_MODEL.md'],
    ['.mcp/identity-policy.json','MCP_CONNECTION_IDENTITY_MODEL.md'],
    ['.mcp/onboarding.json','MCP_ONBOARDING_ENGINE.md'],['.mcp/branch-governance.json','MCP_GITHUB_GOVERNANCE.md'],
    ['.mcp/server-map.json','MCP_SERVER_MAPPING.md'],['data/mcp-git-registry.json','MCP_SERVER_REGISTRY.md'],
    ['.mcp/function-cartography.json','MCP_FUNCTIONAL_CARTOGRAPHY.md'],
    ['.mcp/function-cartography.json','MCP_FUNCTIONS_AND_TOOLS_MANUAL.md'],
    ['.mcp/task-registry.json','TASKS.md'],['.mcp/autodeploy-policy.json','DEPLOYMENT_PRODUCTION.md'],
    ['docs/governance/program-backlog-convergence.json','ROADMAP.md'],
    ['PRODUCTION_STATE.json','DEPLOYMENT_PRODUCTION.md']
  ];
  for(const [a,b] of rootJoins){edge(a,b,'AUTHORITY_JOIN_REVIEW');edge(b,a,'AUTHORITY_JOIN_REVIEW');}
  for(const p of LOOPBACK_SOURCES){edge(p,'SUIVI.md','LOOPBACK_REVIEW');edge('SUIVI.md',p,'LOOPBACK_REVIEW');}
  // Existing explicit local Markdown links provide a cross-scope reference
  // to review, not a declaration that two scopes share an authority.
  // Never fetch URL targets or traverse outside the observed tree.
  for(const row of rows){
    if(row.scopeKey===null||row.readStatus!=='CONTENT_READ'||!row.path.endsWith('.md'))continue;
    try {
      const body=readText(row.path);
      if(typeof body!=='string')continue;
      let count=0;
      for(const link of body.matchAll(/\]\(([^)\s]+)\)/g)){
        if(++count>2000){issue.push({code:'DOCUMENT_LINK_REVIEW_LIMIT',path:row.path});break;}
        const raw=link[1].split('#')[0];
        if(!raw||raw.startsWith('/')||/[:%\\?]/.test(raw))continue;
        const target=posix.normalize(posix.join(posix.dirname(row.path),raw));
        const linked=rowByPath.get(target);
        if(linked&&linked.scopeKey!==null&&linked.scopeKey!==row.scopeKey&&safePath(target))
          edge(target,row.path,'EXPLICIT_CROSS_SCOPE_REFERENCE_REVIEW');
      }
    }catch{issue.push({code:'DOCUMENT_LINK_REVIEW_UNVERIFIED',path:row.path});}
  }
  for(const eq of explicitEquivalences)if(eq.status==='DECLARED_EQUIVALENT_READ'){
    for(const p of eq.paths){edge(eq.sourcePath,p,'DECLARED_AUTHORITY_EQUIVALENCE_REVIEW');edge(p,eq.sourcePath,'DECLARED_AUTHORITY_EQUIVALENCE_REVIEW');}
  }
  const changed=uniq(changes.flatMap(c=>[c?.path,c?.previousPath].filter(x=>x!==null&&x!==undefined)));
  if(!changed.every(safePath))throw Error('DOCUMENTARY_PLAN_CHANGE_INVALID');
  const outgoing=new Map();
  for(const e of edges.values()){if(!outgoing.has(e.from))outgoing.set(e.from,[]);outgoing.get(e.from).push(e.to);}
  const impacted=new Set(),queue=[];
  const knownImplementationImpacts=new Map([
    ['scripts/documentary-hierarchy.mjs',['LOOP_ENGINEERING.md','AGENTS.md','GPT.md','SUIVI.md','SOURCE_OF_TRUTH.md']],
    ['scripts/mcp-documentary-closure.mjs',['LOOP_ENGINEERING.md','DEPLOYMENT_PRODUCTION.md','SUIVI.md','SOURCE_OF_TRUTH.md']],
    ['tests/documentaryHierarchy.test.ts',['TESTS.md','CODE_REVIEW.md','SUIVI.md']]
  ]);
  for(const path of changed){
    const row=rowByPath.get(path);
    if(row){row.directChange=true;impacted.add(path);queue.push(path);}
    else if(knownImplementationImpacts.has(path)&&byPath.has(path)){
      for(const target of knownImplementationImpacts.get(path))if(rowByPath.has(target)&&!impacted.has(target)){impacted.add(target);queue.push(target);}
    }else issue.push({code:'CHANGE_IMPACT_UNRESOLVED',path});
  }
  for(let i=0;i<queue.length;i++)for(const to of outgoing.get(queue[i])??[])if(!impacted.has(to)){
    impacted.add(to);queue.push(to);
  }
  for(const row of rows){
    row.impactReviewRequired=impacted.has(row.path);
    if(row.scopeKey===null)row.action='RESOLVE_DOCUMENT_OWNER';
    else if(row.directChange)row.action='VERIFY_CHANGED_CONTENT_AND_AUTHORITIES';
    else if(row.impactReviewRequired)row.action='REVIEW_PROPAGATED_IMPACT';
    else if(row.readStatus==='CONTENT_UNVERIFIED')row.action='REOBSERVE_CONTENT';
    else if(row.readStatus!=='CONTENT_READ')row.action='QUALIFY_PRESERVATION_OR_AUTHORITY';
  }
  // Unmapped lateral dependencies cannot be proven absent merely because no
  // edge was found. All remaining documents retain an explicit review duty.
  const projection={schemaVersion:1,headSha,planId:'COMMON_HIERARCHICAL_DOCUMENTARY_PLAN_V1',
    entryIndependent:true,mutationPerformed:false,automaticExecutionAuthorized:false,
    foundation:{level:0,sourcePath:FOUNDATION_SOURCE,sourceOid:foundationEntry?.oid??null,...foundation,
      intake,originalReadingSequence:foundingSequence,checkpoint:{path:'SUIVI.md',heading:'POINT DE REPRISE COURANT',...checkpointObservation},loopbackReads},
    scopes:scopePlans,documents:rows,dependencies:[...edges.values()],explicitEquivalences,issues:issue,
    coverage:{candidateCount:candidatePaths.length,plannedCount:rows.length,scopeCount:scopePlans.length,
      contentReadCount:rows.filter(r=>r.readStatus==='CONTENT_READ').length,
      unresolvedScopeCount:rows.filter(r=>r.scopeKey===null).length,
      declaredEquivalencesReadCount:explicitEquivalences.filter(e=>e.status==='DECLARED_EQUIVALENT_READ').length,
      directChangeCount:changed.length,impactReviewCount:impacted.size,
      allCandidatesAccountedFor:rows.length===candidatePaths.length,
      runtimeTaskAndSessionScopeStatus:'RESOLVE_FROM_EXISTING_RUNTIME_AUTHORITIES',runtimeScopeLevel:6,
      semanticCoverageComplete:false,transversalDependencyCoverageComplete:false},
    status:issue.length?'BLOCKED_OR_UNVERIFIED':'PLAN_READY_SEMANTIC_REVIEW_PENDING',
    closureAttested:false};
  return {...projection,planDigest:sha256(projection)};
}
