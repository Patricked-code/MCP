/**
 * RG-011/019/023/027/034 — first authenticated MCP entry by Continuity ID.
 * Public canonical repository only until CUG/Project Binding proves access
 * to more repositories. No storage, admission, claim, lock or write.
 * This adapter reuses the existing federated continuity read projection.
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { githubJsonRequestWithServerCredential } from '../github/connection.js';
import {
  buildMissionContinuityReadProjection,
  type ContinuityDocument,
  type ContinuityEvidence,
  type ContinuityEvent
} from '../registryFederation/missionContinuityReadProjection.js';

const REPOSITORY = 'Patricked-code/MCP';
const REPO_ID = 1285534440;
const BASE = '/repos/Patricked-code/MCP';
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
  const results: Array<{id:string;heading:string;source:string}> = [];
  const seen = new Map<string,string>();
  for (const observation of observations) {
    if (observation.type !== 'DECISIONS') continue;
    const lines = observation.text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const m = /^#{2,4}\s+(D\d{1,4})\b[^\n]*/i.exec(lines[i]!.trim());
      if (!m) continue;
      const id = m[1]!.toUpperCase();
      const heading = lines[i]!.trim().slice(0,500);
      const source = sourceUrl(sha, observation.path) + '#L' + (i + 1);
      if (seen.has(id) && seen.get(id) !== heading) {
        throw new Error('CONTINUITY_DECISION_ID_CONFLICT');
      }
      if (!seen.has(id)) {
        seen.set(id, heading);
        results.push({id,heading,source});
      }
    }
  }
  return results.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
}
function documentedWork(
  sha: string, observations: readonly MissionDocumentObservation[]
): Array<{id:string;source:string;classification:'DOCUMENTARY_ONLY'}> {
  const result: Array<{id:string;source:string;classification:'DOCUMENTARY_ONLY'}> = [];
  const seen = new Set<string>();
  for (const observation of observations) {
    if (observation.type !== 'TASKS') continue;
    const lines = observation.text.split(/\r?\n/);
    for(let i=0;i<lines.length;i++){
      const match = /^\|\s*\x60?(REG-WP-\d{2})\x60?\s*\|/.exec(lines[i]!);
      if (!match || seen.has(match[1]!)) continue;
      seen.add(match[1]!);
      result.push({
        id:match[1]!,source:sourceUrl(sha,observation.path)+'#L'+(i+1),
        classification:'DOCUMENTARY_ONLY'
      });
    }
  }
  return result;
}

export type MissionColdReadResult = Readonly<{
  schemaVersion: 1;
  status: 'PARTIAL' | 'UNVERIFIED' | 'NOT_FOUND' | 'BLOCKED';
  continuityId: string;
  sourceRepository: string;
  sourceCommitSha: string | null;
  observedAt: string;
  projectUid: string | null;
  parentContinuityId: string | null;
  documentationIndex: readonly Readonly<{
    type: string; path: string; url: string; blobSha: string;
    verification: 'VERIFIED';
  }>[];
  historicalDecisions: readonly Readonly<{
    id: string; heading: string; source: string;
  }>[];
  historyNextOffset: number | null;
  workPackages: readonly Readonly<{id:string;source:string;classification:'DOCUMENTARY_ONLY'}>[];
  documentaryNextAction: Readonly<{text: string; source: string; verification: 'DECLARED'}> | null;
  liveState: null;
  projectId: null;
  realTaskIds: readonly string[];
  missingAuthorities: readonly string[];
  blockers: readonly string[];
  suggestedNextRead: readonly string[];
  automaticExecutionAuthorized: false;
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
  const continuity = observations.find(x=>x.type==='SUIVI')
    ?? observations.find(x=>x.type==='CONTINUITY');
  let documentaryNextAction: MissionColdReadResult['documentaryNextAction'] = null;
  if (continuity) {
    const lines = continuity.text.split(/\r?\n/);
    let latest = -1;
    for(let i=0;i<lines.length;i++) {
      if (/NEXT_ACTION_CURRENT|NEXT_ACTION\s*:|prochaine action/i.test(lines[i]!)) latest=i;
    }
    if (latest>=0) {
      documentaryNextAction = {
        text: lines.slice(latest,Math.min(lines.length,latest+5)).join('\n').slice(0,1000),
        source: sourceUrl(sha,continuity.path)+'#L'+(latest+1),
        verification:'DECLARED'
      };
    }
  }
  const required = ['MISSION','DECISIONS','CONTINUITY','ROADMAP','IMPLEMENTATION_PLAN',
    'SOURCE_OF_TRUTH','DOCUMENT_AUTHORITIES','AGENTS','MEMORY','INTENTIONS',
    'SUIVI','TASKS','TODO','EVIDENCE_INDEX'];
  for (const item of required) {
    if (!observations.some(x=>x.type===item)) missing.push('DOCUMENT_MISSING:'+item);
  }
  missing.push('PROJECT_BINDING_NOT_ATTESTED','CUG_INSTALLATION_NOT_ATTESTED',
    'TASK_SCOPE_BINDINGS_NOT_ATTESTED','LIVE_STATE_NOT_OBSERVED');
  const blockers = [...new Set([...projection.blockers,...missing])].sort();
  return {
    schemaVersion:1, status: observations.length ? 'PARTIAL' : 'BLOCKED',
    continuityId, sourceRepository:REPOSITORY, sourceCommitSha:sha, observedAt,
    projectUid:projectUids[0]!, parentContinuityId:parents[0]||null,
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
      return {content:[{type:'text' as const,text:JSON.stringify(result)}]};
    } catch(error) {
      const code=error instanceof Error && /^[A-Z_]{6,80}$/.test(error.message)
        ? error.message : 'CONTINUITY_RECOVERY_UNAVAILABLE';
      return {isError:true,content:[{type:'text' as const,text:JSON.stringify({ok:false,code})}]};
    }
  });
}
