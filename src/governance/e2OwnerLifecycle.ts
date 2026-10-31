/**
 * Owner-first E2 routing: ask NEW vs RESUME only AFTER verified convergence.
 * No GWC task, claim or lock. Persist every owner decision on the canonical
 * E2 GitHub journal and create an issue/continuity only after duplicate review.
 */
import {randomUUID} from 'node:crypto';
import {githubJsonRequestWithServerCredential} from '../github/connection.js';
import {liveStateEngine} from '../liveState/engine.js';
import {assessE2LivePreflight} from './e2LivePreflight.js';
import {appendE2Journal,loadE2Journal,recoverE2JournalEntry,
  findE2ContinuityInJournal,type E2JournalEvent,type E2JournalPort,
  defaultE2JournalPort} from './e2EntryJournal.js';
import type {LiveStateSnapshot} from '../liveState/types.js';

const SHA=/^[0-9a-f]{40}$/;
const ID=/^[A-Z][A-Z0-9-]{5,110}$/;
const ROOT='/repos/Patricked-code/MCP';
const SAFE_TEXT=/^[^\x00-\x1F]{8,500}$/;
export type E2OwnerChoice=Readonly<{
 entryId:string;
 kind:'NEW'|'RESUME';
 mandate?:string;
 continuityId?:string;
}>;
export type E2OwnerResult=Readonly<{
 status:'READY_NEW'|'READY_RESUME'|'RECOVERY_PARTIAL'|'DUPLICATE_FOUND'|'BLOCKED';
 continuityId:string|null;
 issueNumber:number|null;
 issueUrl:string|null;
 reason:string|null;
 grantsPermission:false;
}>;
export type E2OwnerPort=Readonly<{
 journal:E2JournalPort;
 observe:()=>Promise<LiveStateSnapshot>;
}>;
export const defaultE2OwnerPort:E2OwnerPort={
 journal:defaultE2JournalPort,
 observe:()=>liveStateEngine.reconcileNow()
};
const refused=(reason:string):E2OwnerResult=>({
 status:'BLOCKED',continuityId:null,issueNumber:null,issueUrl:null,
 reason,grantsPermission:false
});
const validMandate=(x:unknown):x is string=>
 typeof x==='string'&&SAFE_TEXT.test(x)&&!/(?:gh[pousr]_|github_pat_|sk-proj-|-----BEGIN|password\s*[:=]|secret\s*[:=])/i.test(x);
export function proposeE2ContinuityId(at:Date=new Date(),uuid:string=randomUUID()):string{
 const date=at.toISOString().slice(0,10).replace(/-/g,'');
 const suffix=uuid.slice(0,12).replace(/-/g,'').toUpperCase();
 if(!/^[A-F0-9]{9,12}$/.test(suffix))throw new Error('E2_CONTINUITY_SOURCE_INVALID');
 return 'MCP-E2-CONT-'+date+'-'+suffix;
}
function recordFor(entryId:string,stage:E2JournalEvent['stage'],
  snapshot:LiveStateSnapshot,continuityId:string|null,issueNumber:number|null):E2JournalEvent{
 return {
  schemaVersion:1,entryId,profile:'EXTERNAL_GOVERNED_RECOVERY',
  observedAt:new Date().toISOString(),stage,
  githubMainSha:snapshot.github.head,s1HeadSha:snapshot.s1.head,
  runtimeSha:snapshot.runtime.revision,continuityId,issueNumber,
  reasonCode:null
 };
}
function asObject(x:unknown):Record<string,unknown>|null{
 return x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:null;
}
async function findExactDuplicate(
  mandate:string,port:E2JournalPort
):Promise<{status:'CLEAR'|'FOUND'|'BLOCKED';issueNumber:number|null}>{
 const desired=mandate.toLowerCase().trim().replace(/\s+/g,' ');
 for(let page=1;page<=30;page++){
  const response=await port.request(ROOT+'/issues?state=all&per_page=100&page='+page);
  if(!response.ok||!Array.isArray(response.json))
   return {status:'BLOCKED',issueNumber:null};
  for(const entry of response.json){
   const item=asObject(entry);
   const title=item?.title;
   if(item?.pull_request||typeof title!=='string')continue;
   if(title.toLowerCase().trim().replace(/\s+/g,' ')===desired)
    return {status:'FOUND',issueNumber:Number(item?.number)||null};
  }
  if(response.json.length<100)return {status:'CLEAR',issueNumber:null};
 }
 return {status:'BLOCKED',issueNumber:null};
}
/**
 * E2 NEW: duplicate detection -> new GitHub issue with canonical ID -> journal.
 * RESUME: continuity ID -> durable journal registry -> existing issue, no writes.
 * Both choices require the activation and READY_FOR_OWNER receipts to exist.
 */
export async function routeE2OwnerChoice(
 choice:E2OwnerChoice,port:E2OwnerPort=defaultE2OwnerPort
):Promise<E2OwnerResult>{
 if(!/^E2-[A-F0-9-]{36}$/.test(choice.entryId))return refused('E2_ENTRY_ID_INVALID');
 const journal=await loadE2Journal(port.journal);
 const entry=recoverE2JournalEntry(journal,choice.entryId);
 if(entry.status!=='READY'||!['READY_FOR_OWNER','CONTINUITY_REGISTERED'].includes(entry.latest?.stage??'')
   ||entry.history[0]?.stage!=='ACTIVATED')
   return refused('E2_READY_ENTRY_RECEIPT_NOT_FOUND');
 const snapshot=await port.observe();
 const gate=assessE2LivePreflight(snapshot);
 if(gate.gate!=='DISCOVER_GITHUB_CONTINUITIES')return refused('E2_ALIGNMENT_NO_LONGER_CURRENT');
 if(!SHA.test(snapshot.github.head??''))return refused('E2_MAIN_SHA_INVALID');
 // After a lost registry readback, the registered event may already be durable.
 // Resolve the exact issue and owner choice idempotently; never create a second issue.
 if(entry.latest?.stage==='CONTINUITY_REGISTERED'){
  if(choice.kind!=='NEW'||!validMandate(choice.mandate))
   return refused('E2_REPLAY_OWNER_CHOICE_MISMATCH');
  const registrations=entry.history.filter(e=>e.stage==='CONTINUITY_REGISTERED');
  if(new Set(registrations.map(e=>e.continuityId+':'+e.issueNumber)).size!==1)
   return refused('E2_REPLAY_REGISTRATION_CONFLICT');
  const receipt=registrations[0];
  if(!receipt?.continuityId||!receipt.issueNumber)
   return refused('E2_REPLAY_REGISTRATION_INVALID');
  const response=await port.journal.request(ROOT+'/issues/'+receipt.issueNumber);
  const issue=asObject(response.json),body=issue?.body;
  const bt=String.fromCharCode(96);
  if(!response.ok||response.status!==200
    ||issue?.number!==receipt.issueNumber
    ||typeof issue.title!=='string'||issue.title.trim()!==choice.mandate.trim()
    ||typeof body!=='string'
    ||!body.includes('- **E2 entry :** '+bt+choice.entryId+bt)
    ||!body.includes('- **Continuity ID :** '+bt+receipt.continuityId+bt)
    ||!body.includes('EXTERNAL_GOVERNED_RECOVERY'))
   return refused('E2_REPLAY_GITHUB_ISSUE_NOT_ATTESTED');
  return {status:'READY_NEW',continuityId:receipt.continuityId,
   issueNumber:receipt.issueNumber,
   issueUrl:'https://github.com/Patricked-code/MCP/issues/'+receipt.issueNumber,
   reason:null,grantsPermission:false};
 }
 if(choice.kind==='RESUME'){
  if(!ID.test(choice.continuityId??''))return refused('E2_CONTINUITY_ID_REQUIRED');
  const match=findE2ContinuityInJournal(journal,choice.continuityId!);
  let issueNumber=match.issueNumber;
  let historical=false;
  if(match.status==='NOT_FOUND'){
   const q=encodeURIComponent('repo:Patricked-code/MCP is:issue "'+choice.continuityId!+'"');
   const search=await port.journal.request('/search/issues?q='+q+'&per_page=100');
   const response=asObject(search.json);
   const items=response?.items;
   if(!search.ok||!Array.isArray(items))
    return refused('E2_HISTORICAL_SEARCH_INCOMPLETE');
   const matches=items.map(asObject).filter((x):x is Record<string,unknown>=>{
    if(!x||typeof x.body!=='string'||!Number.isSafeInteger(x.number)
      ||Number(x.number)<1||!x.body.includes('EXTERNAL_GOVERNED_RECOVERY'))
      return false;
    const id=/\*\*Continuity ID(?: canonique)?\s*:\*\*\s*`([A-Z][A-Z0-9-]{5,110})`/.exec(x.body)?.[1];
    return id===choice.continuityId;
   });
   if(matches.length>1)return refused('E2_HISTORICAL_ID_CONFLICT');
   issueNumber=matches.length===1?Number(matches[0]?.number):null;
   historical=issueNumber!==null;
  }else if(match.status!=='READY')
   return refused('E2_CONTINUITY_REGISTRY_CONFLICT');
  if(!issueNumber)return refused('E2_CONTINUITY_ID_NOT_INDEXED');
  const issue=await port.journal.request(ROOT+'/issues/'+issueNumber);
  const item=asObject(issue.json);
  if(!issue.ok||item?.number!==issueNumber
    ||typeof item?.body!=='string'||!item.body.includes(choice.continuityId!))
    return refused('E2_CONTINUITY_ISSUE_NOT_ATTESTED');
  const receipt=await appendE2Journal(
   recordFor(choice.entryId,'OWNER_RESUME',snapshot,choice.continuityId!,issueNumber),
   port.journal);
  if(receipt.status!=='RECORDED')return refused('E2_RESUME_JOURNAL_FAILED');
  return {status:historical?'RECOVERY_PARTIAL':'READY_RESUME',
   continuityId:choice.continuityId!,issueNumber,
   issueUrl:'https://github.com/Patricked-code/MCP/issues/'+issueNumber,
   reason:historical?'E2_HISTORICAL_CHECKPOINTS_REQUIRE_VERIFICATION':null,
   grantsPermission:false};
 }
 if(!validMandate(choice.mandate))return refused('E2_NEW_MANDATE_MISSING_OR_SENSITIVE');
 const duplicate=await findExactDuplicate(choice.mandate,port.journal);
 if(duplicate.status==='BLOCKED')return refused('E2_DUPLICATE_SCREEN_INCOMPLETE');
 if(duplicate.status==='FOUND'){
  // Crash recovery: GitHub issue may have been created before its registry
  // receipt was acknowledged. Never open a second issue for the same E2 entry.
  if(duplicate.issueNumber){
   const response=await port.journal.request(ROOT+'/issues/'+duplicate.issueNumber);
   const issue=asObject(response.json);
   const body=typeof issue?.body==='string'?issue.body:'';
   const sameEntry=body.includes('- **E2 entry :** \`'+choice.entryId+'\`');
   const id=/\*\*Continuity ID\s*:\*\*\s*\`([A-Z][A-Z0-9-]{5,110})\`/.exec(body)?.[1];
   if(response.ok&&issue?.number===duplicate.issueNumber&&sameEntry&&id){
    const receipt=await appendE2Journal(
     recordFor(choice.entryId,'CONTINUITY_REGISTERED',snapshot,id,duplicate.issueNumber),
     port.journal);
    if(receipt.status!=='RECORDED')
     return refused('E2_EXISTING_ISSUE_REGISTRY_RECOVERY_FAILED');
    return {status:'READY_NEW',continuityId:id,issueNumber:duplicate.issueNumber,
     issueUrl:'https://github.com/Patricked-code/MCP/issues/'+duplicate.issueNumber,
     reason:null,grantsPermission:false};
   }
  }
  return {status:'DUPLICATE_FOUND',continuityId:null,
   issueNumber:duplicate.issueNumber,
   issueUrl:duplicate.issueNumber
    ?'https://github.com/Patricked-code/MCP/issues/'+duplicate.issueNumber:null,
   reason:'E2_EXISTING_ISSUE_REQUIRES_OWNER_DECISION',grantsPermission:false};
 }
 const continuityId=proposeE2ContinuityId();
 const body='## Entrée E2 — nouveau chantier gouverné\n\n'
  +'- **Continuity ID :** `'+continuityId+'`\n'
  +'- **Origine :** `EXTERNAL_GOVERNED_RECOVERY`\n'
  +'- **E2 entry :** `'+choice.entryId+'`\n'
  +'- **Mandat :** '+choice.mandate+'\n'
  +'- **GitHub main observé :** `'+snapshot.github.head+'`\n'
  +'- **Étape :** `ISSUE_OPENED`\n'
  +'- **GWC interne :** NON REQUIS\n'
  +'- **Prochaine étape :** instructions, branche de travail, CI, revue, fusion et déploiement gouvernés.\n'
  +'**Pas de création de tâche GWC ni de permission implicite.**\n';
 const created=await port.journal.request(ROOT+'/issues',{method:'POST',jsonBody:{
  title:choice.mandate.trim(),body,labels:[]
 }});
 const issue=asObject(created.json);
 const issueNumber=issue?.number;
 if(!created.ok||created.status!==201||!Number.isSafeInteger(issueNumber)
  ||Number(issueNumber)<1)
  return refused('E2_NEW_ISSUE_CREATION_FAILED');
 const checked=await port.journal.request(ROOT+'/issues/'+issueNumber);
 const proof=asObject(checked.json);
 if(!checked.ok||checked.status!==200||proof?.body!==body||proof?.number!==issueNumber)
  return refused('E2_NEW_ISSUE_READBACK_FAILED');
 const receipt=await appendE2Journal(
  recordFor(choice.entryId,'CONTINUITY_REGISTERED',snapshot,continuityId,Number(issueNumber)),
  port.journal);
 if(receipt.status!=='RECORDED')
  return refused('E2_ISSUE_CREATED_BUT_REGISTRY_PENDING_RECOVERY');
 return {status:'READY_NEW',continuityId,issueNumber:Number(issueNumber),
  issueUrl:'https://github.com/Patricked-code/MCP/issues/'+issueNumber,
  reason:null,grantsPermission:false};
}
