/**
 * RG-011/019/023/027/034 — first authenticated MCP entry by Continuity ID.
 * Public canonical repository only until CUG/Project Binding proves access
 * to more repositories. No storage, admission, claim, lock or write.
 * This adapter reuses the existing federated continuity read projection.
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { githubJsonRequestWithServerCredential } from '../github/connection.js';
import { liveStateEngine } from '../liveState/engine.js';
import { PROGRAM_REPOSITORY } from '../governance/programBlueprintMaterialization.js';
import {
  buildMissionContinuityReadProjection,
  type ContinuityDocument,
  type ContinuityEvidence,
  type ContinuityEvent
} from '../registryFederation/missionContinuityReadProjection.js';

const REPOSITORY = PROGRAM_REPOSITORY;
const REPO_ID = 1285534440;
const BASE = '/repos/' + REPOSITORY;
const INVENTORY = 'docs/governance/markdown-inventory.json';
const SHA = /^[a-f0-9]{40}$/i;
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{5,120}$/;
const MAX_FILES = 20;
const MAX_FILE_BYTES = 180_000;
const MAX_EVENTS = 400;
const DEFAULT_PAGE_SIZE = 30;

export type GithubContinuityJson = Readonly<{
  ok: boolean;
  status: number | null;
  json: unknown;
}>;
export type GithubContinuityReader = (endpoint: string) => Promise<GithubContinuityJson>;

type GithubFileResponse = {
  type?: unknown; encoding?: unknown; content?: unknown; size?: unknown;
  sha?: unknown; path?: unknown;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function statusCode(status: number | null): string {
  return status === 403 ? 'INACCESSIBLE' : status === 404 ? 'NOT_FOUND'
    : status === 401 ? 'AUTH_REQUIRED' : 'SOURCE_UNAVAILABLE';
}
function sourceUrl(sha: string, path: string): string {
  return 'https://github.com/' + REPOSITORY + '/blob/' + sha
    + '/' + path.split('/').map(encodeURIComponent).join('/');
}
async function fetchJson(read: GithubContinuityReader, endpoint: string): Promise<Record<string, unknown>> {
  const result = await read(endpoint);
  if (!result.ok) throw new Error('CONTINUITY_GITHUB_' + statusCode(result.status));
  const data = record(result.json);
  if (!data) throw new Error('CONTINUITY_GITHUB_RESPONSE_INVALID');
  return data;
}
async function fetchText(read: GithubContinuityReader, path: string, sha: string):
  Promise<{text: string; blobSha: string}> {
  const payload = await fetchJson(read, BASE + '/contents/' +
    path.split('/').map(encodeURIComponent).join('/') + '?ref=' + sha);
  const file = payload as GithubFileResponse;
  if (file.type !== 'file' || file.encoding !== 'base64'
    || typeof file.content !== 'string' || typeof file.sha !== 'string'
    || typeof file.size !== 'number' || file.size < 0 || file.size > MAX_FILE_BYTES) {
    throw new Error('CONTINUITY_DOCUMENT_INVALID');
  }
  const buffer = Buffer.from(file.content.replace(/\s/g, ''), 'base64');
  if (buffer.length !== file.size || buffer.length > MAX_FILE_BYTES) {
    throw new Error('CONTINUITY_DOCUMENT_SIZE_MISMATCH');
  }
  return {text: buffer.toString('utf8'), blobSha: file.sha};
}
function missionPath(path: string, id: string): {
  projectUid: string; parentContinuityId: string | null; type: string
} | null {
  const pieces = path.split('/');
  if (pieces.length < 6 || pieces[0] !== 'docs' || pieces[1] !== 'projects'
    || !pieces[2] || pieces[3] !== 'chantiers') return null;
  const filename = pieces[pieces.length - 1]!;
  if (!filename.startsWith(id + '__') || !filename.endsWith('.md')) return null;
  const type = filename.slice(id.length + 2, -3);
  if (!type || !/^[A-Za-z0-9_]+$/.test(type)) return null;
  if (pieces.length === 6 && pieces[4] === id) {
    return {projectUid: pieces[2]!, parentContinuityId: null, type};
  }
  if (pieces.length === 8 && pieces[5] === 'subchantiers' && pieces[6] === id) {
    return {projectUid: pieces[2]!, parentContinuityId: pieces[4]!, type};
  }
  return null;
}

const DATE_DDMMYYYY = /^(\d{2})\/(\d{2})\/(\d{4})$/;
function dateFromHeading(line: string): string | null {
  const m = line.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
  if (!m) return null;
  const parsed = DATE_DDMMYYYY.exec(m[1]!);
  if (!parsed) return null;
  const day = Number(parsed[1]), month = Number(parsed[2]), year = Number(parsed[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day ? date.toISOString() : null;
}
export type MissionDocumentObservation = Readonly<{
  path: string; type: string; blobSha: string; text: string;
}>;
function decisionReferences(
  id: string, sha: string, observedAt: string, observations: readonly MissionDocumentObservation[]
): ContinuityEvent[] {
  const events: ContinuityEvent[] = [];
  for (const observation of observations) {
    if (observation.type !== 'DECISIONS' && observation.type !== 'CONTINUITY'
      && observation.type !== 'INTENTIONS') continue;
    const lines = observation.text.split(/\r?\n/);
    for (let i = 0; i < lines.length && events.length < MAX_EVENTS; i++) {
      const line = lines[i]!.trim();
      const decision = observation.type === 'DECISIONS'
        ? /^#{2,4}\s+(D\d{1,4})\b[^\n]*/i.exec(line) : null;
      const intent = observation.type === 'INTENTIONS'
        ? /^\|\s*(REG-INT-\d{1,4})\s*\|/.exec(line) : null;
      // Events without explicit dates cannot be promoted to historical chronology.
      if (!decision && !intent) continue;
      const occurredAt = dateFromHeading(line);
      if (!occurredAt || Date.parse(occurredAt) > Date.parse(observedAt)) continue;
      const evtId = (decision?.[1] ?? intent?.[1])!;
      const location = sourceUrl(sha, observation.path) + '#L' + (i + 1);
      events.push({
        eventId: evtId, ownerContinuityId: id,
        kind: decision ? 'DECISION' : 'INTENTION',
        occurredAt, description: line.slice(0, 500),
        predecessorId: null, evidence: {
          authority: 'GITHUB', reference: location,
          observedAt, sourceCommitSha: sha, verification: 'VERIFIED'
        }
      });
    }
  }
  return events;
}


/** All D-numbered headings remain discoverable even without a dated event. */

function decisionIndex(
  sha: string, observations: readonly MissionDocumentObservation[]
): Array<{id:string;heading:string;source:string}> {
  type Entry={id:string;heading:string;source:string;kind:'HEADING'|'BULLET'};
  const entries=new Map<string,Entry>();
  for(const doc of observations) {
    if(doc.type!=='DECISIONS')continue;
    const lines=doc.text.split(/\r?\n/);
    for(let i=0;i<lines.length;i++){
      const line=lines[i]!.trim();
      const heading=/^#{2,4}\s+(D\d{1,4}|A\d{1,4}-\d{1,4})(?:\s*[–-]\s*(D\d{1,4}))?\b/i.exec(line);
      const bullet=/^-\s+(?:\*\*)?(D\d{1,4}|A\d{1,4}-\d{1,4})\b/i.exec(line);
      if(!heading&&!bullet)continue;
      const firstId=(bullet??heading)![1]!.toUpperCase();
      const parent=/^D(\d+)$/.exec(firstId);
      const start=parent?Number(parent[1]):0;
      const end=parent&&heading?.[2]?Number(heading[2]):start;
      if(end<start||end-start>10)throw new Error('CONTINUITY_DECISION_RANGE_INVALID');
      const ref=sourceUrl(sha,doc.path)+'#L'+(i+1);
      for(let n=start;n<=end;n++){
        const id=parent?'D'+String(n).padStart(2,'0'):firstId;
        const kind=bullet?'BULLET' as const:'HEADING' as const;
        const item:Entry={id,heading:line.slice(0,500),source:ref,kind};
        const old=entries.get(id);
        if(old?.kind==='BULLET'&&kind==='HEADING')continue;
        if(old?.kind==='BULLET'&&kind==='BULLET'&&old.heading!==item.heading)
          throw new Error('CONTINUITY_DECISION_ID_CONFLICT');
        entries.set(id,item);
      }
    }
  }
  return [...entries.values()].sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}))
    .map(({id,heading,source})=>({id,heading,source}));
}


function documentedWork(
  sha:string,observations:readonly MissionDocumentObservation[]
):Array<{id:string;source:string;classification:'DOCUMENTARY_ONLY'}>{
  const result:Array<{id:string;source:string;classification:'DOCUMENTARY_ONLY'}>=[];
  const seen=new Set<string>();
  for(const doc of observations){
    if(doc.type!=='TASKS')continue;
    const lines=doc.text.split(/\r?\n/);
    for(let i=0;i<lines.length;i++){
      const line=lines[i]!;
      const match=/^\|\s*\x60?([A-Z][A-Z0-9_-]{4,80})\x60?\s*\|/.exec(line);
      if(!match||!/\bRG-\d{3}\b/.test(line))continue;
      const id=match[1]!;
      if(!/^REG-WP-\d{2}$/.test(id)&&!/^[A-Z][A-Z_]+$/.test(id))continue;
      if(seen.has(id))continue;
      seen.add(id);
      result.push({id,source:sourceUrl(sha,doc.path)+'#L'+(i+1),classification:'DOCUMENTARY_ONLY'});
    }
  }
  return result;
}

type InheritedDocument=Readonly<{
  type:string;path:string;url:string;blobSha:string;
  ownerContinuityId:string;inherited:true;verification:'VERIFIED';
}>;

export type EvidencedCheckpoint=Readonly<{
  id:string;source:string;createdAt:string;author:string;
  sourceVerification:'VERIFIED';claimsVerification:'DECLARED';
  documentaryNextAction:string|null;
}>;

function findCurrentAction(
  sha:string,observations:readonly MissionDocumentObservation[]
):MissionColdReadResult['documentaryNextAction']{
  for(const type of ['SUIVI','CONTINUITY']){
    const doc=observations.find(x=>x.type===type);
    if(!doc)continue;
    const lines=doc.text.split(/\r?\n/);
    let found:{line:number;text:string}|null=null;
    for(let i=0;i<lines.length;i++){
      const raw=lines[i]!.trim();
      const heading=/^#{1,6}\s+NEXT_ACTION(?:_CURRENT)?\b/i.test(raw);
      const inline=/^(?:[-*]\s+)?(?:\*\*)?NEXT_ACTION(?:_CURRENT)?(?:\*\*)?\s*[:：]\s*/i.test(raw);
      if(!heading&&!inline)continue;
      const selected=[raw];
      for(let j=i+1;j<lines.length&&selected.length<5;j++){
        const next=lines[j]!.trim();
        if(!next||/^\|/.test(next)||/^#{1,6}\s/.test(next)
          ||/^(?:\*\*)?NEXT_ACTION(?:_CURRENT)?\b/i.test(next))break;
        selected.push(next);
      }
      found={line:i+1,text:selected.join('\n').slice(0,1000)};
    }
    if(found)return {text:found.text,source:sourceUrl(sha,doc.path)+'#L'+found.line,
      verification:'DECLARED'};
  }
  return null;
}

async function readCanonicalCheckpoints(
  read:GithubContinuityReader,continuityId:string,observedAt:string
):Promise<{items:EvidencedCheckpoint[];error:string|null}>{
  const items:EvidencedCheckpoint[]=[];
  const seen=new Set<number>();
  try{
    for(let page=1;page<=4;page++){
      const response=await read(BASE+'/issues/430/comments?per_page=100&page='+page);
      if(!response.ok)return {items,error:'CHECKPOINT_SOURCE_'+statusCode(response.status)};
      if(!Array.isArray(response.json))return {items,error:'CHECKPOINT_SOURCE_INVALID'};
      for(const raw of response.json){
        const c=record(raw),u=record(c?.user);
        if(!c||u?.login!=='Patricked-code')continue;
        const id=c.id,at=c.created_at,body=c.body;
        if(typeof id!=='number'||!Number.isSafeInteger(id)||id<=0||seen.has(id)
          ||typeof at!=='string'||typeof body!=='string'
          ||!Number.isFinite(Date.parse(at))||Date.parse(at)>Date.parse(observedAt))continue;
        // PR parent references never confer child checkpoint ownership.
        if(!body.slice(0,900).includes(continuityId)
          ||!/\bcheckpoint\b/i.test(body.slice(0,250)))continue;
        seen.add(id);
        const action=body.split(/\r?\n/).find(line=>
          /^\s*\*{0,2}NEXT_ACTION_CURRENT\*{0,2}\s*:/i.test(line));
        items.push({id:String(id),source:'https://github.com/'+REPOSITORY+
          '/pull/430#issuecomment-'+id,createdAt:at,author:'Patricked-code',
          sourceVerification:'VERIFIED',claimsVerification:'DECLARED',
          documentaryNextAction:action?action.trim().slice(0,1000):null});
      }
      if(response.json.length<100)break;
      if(page===4)return {items,error:'CHECKPOINT_HISTORY_TRUNCATED'};
    }
  }catch{return {items,error:'CHECKPOINT_SOURCE_UNAVAILABLE'};}
  items.sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)||Number(a.id)-Number(b.id));
  return {items,error:null};
}


export type MissionColdReadResult=Readonly<{
  schemaVersion:1;status:'PARTIAL'|'UNVERIFIED'|'NOT_FOUND'|'BLOCKED';
  continuityId:string;sourceRepository:string;sourceCommitSha:string|null;
  observedAt:string;projectUid:string|null;parentContinuityId:string|null;
  documentationIndex:readonly Readonly<{type:string;path:string;url:string;blobSha:string;verification:'VERIFIED'}>[];
  inheritedDocumentationIndex:readonly InheritedDocument[];
  historicalDecisions:readonly Readonly<{id:string;heading:string;source:string}>[];
  historyNextOffset:number|null;
  workPackages:readonly Readonly<{id:string;source:string;classification:'DOCUMENTARY_ONLY'}>[];
  documentaryNextAction:Readonly<{text:string;source:string;verification:'DECLARED'}>|null;
  checkpointHistory:readonly EvidencedCheckpoint[];
  latestVerifiedCheckpoint:EvidencedCheckpoint|null;
  liveState:null;projectId:null;realTaskIds:readonly string[];
  missingAuthorities:readonly string[];blockers:readonly string[];
  suggestedNextRead:readonly string[];automaticExecutionAuthorized:false;
}>;

export async function recoverMissionFromGithub(
  continuityId: string, read: GithubContinuityReader,
  options: {historyOffset?: number; historyLimit?: number; observedAt?: string} = {}
): Promise<MissionColdReadResult> {
  if (!ID.test(continuityId)) throw new Error('CONTINUITY_ID_INVALID');
  const offset = options.historyOffset ?? 0;
  const limit = options.historyLimit ?? DEFAULT_PAGE_SIZE;
  if (!Number.isSafeInteger(offset) || offset < 0
    || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('CONTINUITY_HISTORY_PAGE_INVALID');
  }
  const observedAt = options.observedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(observedAt))) throw new Error('CONTINUITY_OBSERVED_AT_INVALID');
  const meta = await fetchJson(read, BASE);
  // This first transport adapter must not accidentally return private
  // repository content to arbitrary OAuth clients via a shared server PAT.
  if (meta.private !== false || meta.id !== REPO_ID || meta.full_name !== REPOSITORY) {
    throw new Error('CONTINUITY_REPOSITORY_AUTHORITY_UNVERIFIED');
  }
  const ref = await fetchJson(read, BASE + '/git/ref/heads/main');
  const gitRef = record(ref.object);
  const sha = gitRef?.sha;
  if (typeof sha !== 'string' || !SHA.test(sha)) {
    throw new Error('CONTINUITY_MAIN_SHA_UNVERIFIED');
  }
  const index = await fetchText(read, INVENTORY, sha);
  let inventory: unknown;
  try {inventory = JSON.parse(index.text);} catch {throw new Error('CONTINUITY_INDEX_INVALID');}
  const parsed = record(inventory);
  const entries = parsed?.entries;
  if (!Array.isArray(entries)) throw new Error('CONTINUITY_INDEX_INVALID');

  const found = entries.flatMap(entry => {
    const path = record(entry)?.path;
    if (typeof path !== 'string') return [];
    const match = missionPath(path, continuityId);
    return match ? [{...match, path}] : [];
  }).sort((a,b)=>a.path.localeCompare(b.path));
  if (!found.length) return {
    schemaVersion: 1, status: 'NOT_FOUND', continuityId,
    sourceRepository: REPOSITORY, sourceCommitSha: sha,
    observedAt, projectUid: null, parentContinuityId: null,
    documentationIndex: [], historicalDecisions: [], workPackages: [],
    historyNextOffset: null, documentaryNextAction: null, liveState: null,
    inheritedDocumentationIndex: [], checkpointHistory: [], latestVerifiedCheckpoint: null,
    projectId: null, realTaskIds: [],
    missingAuthorities: ['CONTINUITY_ID_NOT_INDEXED_IN_CANONICAL_REPOSITORY'],
    blockers: ['PROJECT_BINDING_NOT_ATTESTED'], suggestedNextRead: [],
    automaticExecutionAuthorized: false
  };
  const projectUids = [...new Set(found.map(x => x.projectUid))];
  const parents = [...new Set(found.map(x=>x.parentContinuityId ?? ''))];
  if (projectUids.length !== 1 || parents.length !== 1 || found.length > MAX_FILES) {
    throw new Error('CONTINUITY_DOCUMENT_IDENTITY_CONFLICT');
  }

  const observations: MissionDocumentObservation[] = [];
  const missing: string[] = [];
  for (const item of found) {
    try {
      const source = await fetchText(read, item.path, sha);
      observations.push({path: item.path, type: item.type, blobSha: source.blobSha, text: source.text});
    } catch {
      missing.push('DOCUMENT_UNAVAILABLE:' + item.type);
    }
  }
  const docs: ContinuityDocument[] = observations.map(item=>({
    ownerContinuityId: continuityId, documentType: item.type, path: item.path,
    inherited: false,
    evidence: {authority: 'GITHUB', reference: sourceUrl(sha, item.path),
      observedAt, sourceCommitSha: sha, verification: 'VERIFIED'}
  }));

  // Child authorities are local; explicit inherited links retain parent ownership.
  const inheritedDocumentationIndex:InheritedDocument[]=[];
  if(parents[0]){
    const owner=parents[0]!;
    for(const type of ['MISSION','IMPLEMENTATION_PLAN','DOCUMENT_AUTHORITIES']){
      const path='docs/projects/'+projectUids[0]+'/chantiers/'+owner+'/'+owner+'__'+type+'.md';
      const indexed=entries.some(item=>record(item)?.path===path&&Boolean(missionPath(path,owner)));
      if(!indexed){missing.push('INHERITED_DOCUMENT_UNINDEXED:'+type);continue;}
      try{
        const file=await fetchText(read,path,sha);
        inheritedDocumentationIndex.push({type,path,url:sourceUrl(sha,path),
          blobSha:file.blobSha,ownerContinuityId:owner,
          inherited:true,verification:'VERIFIED'});
      }catch{missing.push('INHERITED_DOCUMENT_UNAVAILABLE:'+type);}
    }
  }
  const rawEvents = decisionReferences(continuityId, sha, observedAt, observations);
  const projection = buildMissionContinuityReadProjection({
    continuityId, parentContinuityId: parents[0] || null,
    projectUid: projectUids[0]!, repositoryId: 'github:' + REPOSITORY,
    ownerScope: continuityId, observedAt, sourceCommitSha: sha,
    identityCrosswalk: null, federation: null, documents: docs,
    timeline: rawEvents, workPackages: [], taskBindings: [], candidateActions: [],
    historyOffset: offset, historyPageSize: limit
  });

  const sortedDecisions = decisionIndex(sha, observations);
  const workPackages = documentedWork(sha, observations);
  const selected = sortedDecisions.slice(offset,offset+limit);

  const required=parents[0]
    ? ['MANDATE','DECISIONS','CONTINUITY','ROADMAP','SOURCE_OF_TRUTH',
      'AGENTS','MEMORY','SUIVI','TASKS','TODO','EVIDENCE_INDEX','ARCHITECTURE','CARTOGRAPHY']
    : ['MISSION','DECISIONS','CONTINUITY','ROADMAP','IMPLEMENTATION_PLAN',
      'SOURCE_OF_TRUTH','DOCUMENT_AUTHORITIES','AGENTS','MEMORY','INTENTIONS',
      'SUIVI','TASKS','TODO','EVIDENCE_INDEX'];
  for(const item of required){
    if(!observations.some(x=>x.type===item))missing.push('DOCUMENT_MISSING:'+item);
  }
  // GitHub verifies existence/author/date, not claims within comments.
  // The parent journal is not a checkpoint authority for the child.
  const checkpointRead=parents[0]?{items:[] as EvidencedCheckpoint[],error:null}
    :await readCanonicalCheckpoints(read,continuityId,observedAt);
  const latestVerifiedCheckpoint=checkpointRead.items.at(-1)??null;
  let documentaryNextAction=findCurrentAction(sha,observations);
  if(latestVerifiedCheckpoint?.documentaryNextAction){
    documentaryNextAction={text:latestVerifiedCheckpoint.documentaryNextAction,
      source:latestVerifiedCheckpoint.source,verification:'DECLARED'};
  }

  missing.push('PROJECT_BINDING_NOT_ATTESTED','CUG_INSTALLATION_NOT_ATTESTED',
    'TASK_SCOPE_BINDINGS_NOT_ATTESTED','LIVE_STATE_NOT_OBSERVED');
  const blockers=[...new Set([
    ...projection.blockers.filter(x=>x!=='VERIFIED_CHECKPOINT_MISSING'||!latestVerifiedCheckpoint),
    ...missing,...(checkpointRead.error?[checkpointRead.error]:[])
  ])].sort();
  return {
    schemaVersion:1, status: observations.length ? 'PARTIAL' : 'BLOCKED',
    continuityId, sourceRepository:REPOSITORY, sourceCommitSha:sha, observedAt,
    projectUid:projectUids[0]!, parentContinuityId:parents[0]||null,
    inheritedDocumentationIndex, checkpointHistory:checkpointRead.items,
    latestVerifiedCheckpoint,
    documentationIndex:observations.map(x=>({
      type:x.type,path:x.path,url:sourceUrl(sha,x.path),
      blobSha:x.blobSha,verification:'VERIFIED' as const
    })),
    historicalDecisions:selected,
    workPackages,
    historyNextOffset:offset+limit<sortedDecisions.length ? offset+limit : null,
    documentaryNextAction, liveState:null, projectId:null, realTaskIds:[],
    missingAuthorities:missing, blockers,
    suggestedNextRead: docs.map(x=>x.evidence.reference),
    automaticExecutionAuthorized:false
  };
}

export function registerMissionContinuityReadTools(
  server: McpServer, read: GithubContinuityReader = githubJsonRequestWithServerCredential
): void {
  server.registerTool('mcp_rejoin_continuity', {
    title:'Rejoin Mission by Continuity ID (Read Only)',
    description:'From a Continuity ID only, recover the mission documents and evidenced history from the canonical public MCP GitHub repository. Reports missing Project Binding, CUG, Task Queue and runtime authorities without guessing them; NEVER claims a task or writes. Requires an authenticated MCP connection.',
    inputSchema: {
      continuityId: z.string().regex(ID).min(6).max(121),
      historyOffset: z.number().int().nonnegative().optional(),
      historyLimit: z.number().int().min(1).max(100).optional()
    },
    annotations:{readOnlyHint:true,destructiveHint:false}
  }, async ({continuityId,historyOffset,historyLimit}) => {
    try {
      const result=await recoverMissionFromGithub(continuityId,read,{historyOffset,historyLimit});
      // Existing S1/G1 runtime authority: read its safe summary only.
      // A stale cached state is not a new deployment attestation.
      const current=await liveStateEngine.getCurrent().catch(()=>null);
      const liveState=current ? {
        stateVersion:current.stateVersion, observedAt:current.generatedAt,
        freshness:current.freshness, alignment:current.alignment.global,
        githubHead:current.github.head, s1Head:current.s1.head,
        runtimeRevision:current.runtime.revision,
        runtimeHealth:current.runtime.health
      } : null;
      const blockers=liveState
        ? [...result.blockers.filter(x=>x!=='LIVE_STATE_NOT_OBSERVED'),
          ...(liveState.githubHead===result.sourceCommitSha ? [] : ['GITHUB_LIVE_SHA_MISMATCH']),
          ...(liveState.freshness==='CURRENT' ? [] : ['LIVE_STATE_STALE'])]
        : result.blockers;
      return {content:[{type:'text' as const,text:JSON.stringify({
        ...result,liveState,blockers,
        automaticExecutionAuthorized:false
      })}]};
    } catch(error) {
      const code=error instanceof Error && /^[A-Z_]{6,80}$/.test(error.message)
        ? error.message : 'CONTINUITY_RECOVERY_UNAVAILABLE';
      return {isError:true,content:[{type:'text' as const,text:JSON.stringify({ok:false,code})}]};
    }
  });
}
