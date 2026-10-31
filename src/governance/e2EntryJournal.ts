/**
 * E2 only: append-only, GitHub issue-anchored history of EVERY activation.
 * Neither a journal receipt nor its continuity reference authorizes GitHub,
 * GWC, SSH, merge, deployment or a new work mandate.
 */
import {createHash,randomUUID} from 'node:crypto';
import {githubJsonRequestWithServerCredential} from '../github/connection.js';

export const E2_JOURNAL_ISSUE=359;
const ROOT='/repos/Patricked-code/MCP/issues/359/comments';
const PREFIX='MCP_E2_ENTRY_EVENT_V1:';
const ID=/^[A-Z][A-Z0-9-]{5,110}$/;
export type E2JournalStage='ACTIVATED'|'RECONCILIATION_BLOCKED'|
 'RECONCILIATION_PENDING'|'READY_FOR_OWNER'|'OWNER_NEW'|'OWNER_RESUME'|
 'CONTINUITY_REGISTERED';
export type E2JournalEvent=Readonly<{
 schemaVersion:1;
 entryId:string;
 observedAt:string;
 profile:'EXTERNAL_GOVERNED_RECOVERY';
 stage:E2JournalStage;
 githubMainSha:string|null;
 s1HeadSha:string|null;
 runtimeSha:string|null;
 continuityId:string|null;
 issueNumber:number|null;
 reasonCode:string|null;
}>;
export type E2JournalComment=Readonly<{
 id:number;body:string;created_at:string;html_url:string;
}>;
export type E2JournalResult=Readonly<{
 status:'READY'|'UNAVAILABLE'|'INCOMPLETE'|'CONFLICT'|'NOT_FOUND';
 entries:readonly E2JournalEvent[];
 blockers:readonly string[];
}>;
export type E2JournalPort=Readonly<{
 request:(endpoint:string,options?:{method?:'GET'|'POST';jsonBody?:unknown})=>
  Promise<{ok:boolean;status:number|null;json:unknown}>;
}>;
export const defaultE2JournalPort:E2JournalPort={
 request:(endpoint,options)=>githubJsonRequestWithServerCredential(endpoint,options)
};
const digest=(v:string)=>createHash('sha256').update(v,'utf8').digest('hex');
const shaOrNull=(v:string|null)=>v===null||/^[0-9a-f]{40}$/.test(v);
export function newE2EntryId():string{
 return 'E2-'+randomUUID().toUpperCase();
}
function valid(event:E2JournalEvent):boolean{
 return !!event&&event.schemaVersion===1&&event.profile==='EXTERNAL_GOVERNED_RECOVERY'
  &&/^E2-[A-F0-9-]{36}$/.test(event.entryId)
  &&Number.isFinite(Date.parse(event.observedAt))
  &&['ACTIVATED','RECONCILIATION_BLOCKED','RECONCILIATION_PENDING',
    'READY_FOR_OWNER','OWNER_NEW','OWNER_RESUME','CONTINUITY_REGISTERED'].includes(event.stage)
  &&shaOrNull(event.githubMainSha)&&shaOrNull(event.s1HeadSha)
  &&shaOrNull(event.runtimeSha)
  &&(event.continuityId===null||ID.test(event.continuityId))
  &&(event.issueNumber===null||(Number.isSafeInteger(event.issueNumber)&&event.issueNumber>0))
  &&(event.reasonCode===null||/^[A-Z0-9_:-]{4,120}$/.test(event.reasonCode))
  &&(event.stage!=='CONTINUITY_REGISTERED'
    ||(event.continuityId!==null&&event.issueNumber!==null));
}
export function serializeE2Journal(event:E2JournalEvent):string{
 if(!valid(event))throw new Error('E2_JOURNAL_EVENT_INVALID');
 const payload=Buffer.from(JSON.stringify(event),'utf8').toString('base64url');
 const checksum=digest(payload);
 return '<!-- '+PREFIX+payload+':'+checksum+' -->\n'
   +'### E2 — trace append-only vérifiable\n'
   +'- Entrée : `'+event.entryId+'`\n'
   +'- Étape : `'+event.stage+'`\n'
   +'- Horodatage : `'+event.observedAt+'`\n'
   +'- Continuité : `'+(event.continuityId??'NON_SÉLECTIONNÉE')+'`\n'
   +'- Issue : '+(event.issueNumber??'AUCUNE')+'\n'
   +'- Prochain motif : `'+(event.reasonCode??'AUCUN')+'`\n'
   +'- **Nature :** preuve documentaire ; aucune autorisation opérationnelle créée.';
}
export function parseE2Journal(body:string):E2JournalEvent|null{
 const matches=[...body.matchAll(/<!-- MCP_E2_ENTRY_EVENT_V1:([A-Za-z0-9_-]{40,2500}):([0-9a-f]{64}) -->/g)];
 if(matches.length!==1||!matches[0]||digest(matches[0][1]!)!==matches[0][2])
  return null;
 try{
  const encoded=matches[0][1]!;
  const bytes=Buffer.from(encoded,'base64url');
  if(bytes.toString('base64url')!==encoded)return null;
  const value=JSON.parse(bytes.toString('utf8')) as E2JournalEvent;
  return valid(value)?value:null;
 }catch{return null;}
}
const asComment=(x:unknown):E2JournalComment|null=>{
 if(!x||typeof x!=='object')return null;
 const c=x as Record<string,unknown>;
 if(!Number.isSafeInteger(c.id)||Number(c.id)<1
  ||typeof c.body!=='string'||typeof c.created_at!=='string'
  ||typeof c.html_url!=='string')return null;
 return {id:Number(c.id),body:c.body,created_at:c.created_at,html_url:c.html_url};
};
export async function loadE2Journal(port:E2JournalPort=defaultE2JournalPort):Promise<E2JournalResult>{
 const entries:E2JournalEvent[]=[],blockers:string[]=[];
 const seen=new Set<number>();
 for(let page=1;page<=50;page++){
  const response=await port.request(ROOT+'?per_page=100&page='+page);
  if(!response.ok||!Array.isArray(response.json))
   return {status:'UNAVAILABLE',entries:[],blockers:['E2_GITHUB_JOURNAL_UNAVAILABLE']};
  for(const raw of response.json){
   const item=asComment(raw);
   if(!item||seen.has(item.id))
    return {status:'CONFLICT',entries:[],blockers:['E2_JOURNAL_COMMENT_INVALID_OR_DUPLICATE']};
   seen.add(item.id);
   if(!item.body.includes(PREFIX))continue;
   if(item.html_url!=='https://github.com/Patricked-code/MCP/issues/359#issuecomment-'+item.id)
    return {status:'CONFLICT',entries:[],blockers:['E2_JOURNAL_URL_INVALID']};
   const event=parseE2Journal(item.body);
   if(!event)
    return {status:'CONFLICT',entries:[],blockers:['E2_JOURNAL_ENTRY_INVALID']};
   entries.push(event);
  }
  if(response.json.length<100)
   return {status:'READY',entries,blockers};
 }
 return {status:'INCOMPLETE',entries:[],blockers:['E2_GITHUB_JOURNAL_PAGINATION_LIMIT']};
}
export async function appendE2Journal(event:E2JournalEvent,
 port:E2JournalPort=defaultE2JournalPort):Promise<{status:'RECORDED'|'BLOCKED';commentUrl:string|null;reason:string|null}>{
 const body=serializeE2Journal(event);
 const response=await port.request(ROOT,{method:'POST',jsonBody:{body}});
 const comment=asComment(response.json);
 if(!response.ok||response.status!==201||!comment||comment.body!==body
  ||comment.html_url!=='https://github.com/Patricked-code/MCP/issues/359#issuecomment-'+comment.id)
   return {status:'BLOCKED',commentUrl:null,reason:'E2_JOURNAL_WRITE_NOT_ATTESTED'};
 // Read-after-write: a successful API response alone is not durable proof.
 const check=await port.request(ROOT+'/'+comment.id);
 const persisted=asComment(check.json);
 if(!check.ok||check.status!==200||!persisted||persisted.body!==body
  ||persisted.id!==comment.id)
  return {status:'BLOCKED',commentUrl:null,reason:'E2_JOURNAL_READBACK_MISMATCH'};
 return {status:'RECORDED',commentUrl:comment.html_url,reason:null};
}
export function recoverE2JournalEntry(
 journal:E2JournalResult,entryId:string
):Readonly<{status:'READY'|'NOT_FOUND'|'BLOCKED';history:readonly E2JournalEvent[];latest:E2JournalEvent|null}>{
 if(journal.status!=='READY')return {status:'BLOCKED',history:[],latest:null};
 const history=journal.entries.filter(x=>x.entryId===entryId);
 return {status:history.length?'READY':'NOT_FOUND',history,latest:history.at(-1)??null};
}
export function findE2ContinuityInJournal(
 journal:E2JournalResult,continuityId:string
):Readonly<{status:'READY'|'NOT_FOUND'|'CONFLICT'|'BLOCKED';issueNumber:number|null}>{
 if(journal.status!=='READY')return {status:'BLOCKED',issueNumber:null};
 if(!ID.test(continuityId))return {status:'NOT_FOUND',issueNumber:null};
 const matches=journal.entries.filter(x=>x.stage==='CONTINUITY_REGISTERED'
   &&x.continuityId===continuityId);
 const issues=[...new Set(matches.map(x=>x.issueNumber))];
 if(issues.length>1)return {status:'CONFLICT',issueNumber:null};
 return {status:issues.length?'READY':'NOT_FOUND',issueNumber:issues[0]??null};
}
