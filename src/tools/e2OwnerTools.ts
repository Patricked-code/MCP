import {z} from 'zod';
import {env} from '../config/env.js';
import {assertScopedWriteToolsEnabled} from '../ssh/writeSafety.js';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {asText} from './format.js';
import {routeE2OwnerChoice,type E2OwnerChoice,type E2OwnerPort,
 defaultE2OwnerPort} from '../governance/e2OwnerLifecycle.js';
import {findE2ContinuityInJournal,loadE2Journal,type E2JournalPort,
 defaultE2JournalPort} from '../governance/e2EntryJournal.js';
import {recoverE2FromGitHubIssueComments}
 from '../governance/e2GitHubEvidence.js';

export function registerE2OwnerTools(
 server:McpServer,
 deps:E2OwnerPort=defaultE2OwnerPort
):void{
 server.tool(
  'mcp_e2_select_chantier',
  'E2 uniquement : apres reconciliation et question du proprietaire, creer un nouveau chantier avec Continuity ID et enregistrement GitHub, ou reprendre la Continuity ID choisie. Aucun GWC requis.',
  {
   entry_profile:z.literal('EXTERNAL_GOVERNED_RECOVERY'),
   e2_explicitly_selected:z.literal(true),
   entry_id:z.string().regex(/^E2-[A-F0-9-]{36}$/),
   decision:z.enum(['NEW','RESUME']),
   owner_authorized_github_write:z.literal(true),
   mandate:z.string().max(500).optional(),
   continuity_id:z.string().max(110).optional()
  },
  async ({entry_profile,e2_explicitly_selected,entry_id,decision,mandate,continuity_id,owner_authorized_github_write})=>{
   if(entry_profile!=='EXTERNAL_GOVERNED_RECOVERY'||e2_explicitly_selected!==true
     ||owner_authorized_github_write!==true)
    return {...asText(JSON.stringify({status:'BLOCKED',reason:'E2_EXPLICIT_SELECTION_REQUIRED'})),isError:true};
   // The owner switch is not a server-side permission grant.
   try{assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);}
   catch{return {...asText(JSON.stringify({status:'BLOCKED',
      reason:'E2_SERVER_WRITE_GATE_DISABLED'})),isError:true};}
   const choice:E2OwnerChoice={entryId:entry_id,kind:decision,
    ...(mandate!==undefined?{mandate}:{}),
    ...(continuity_id!==undefined?{continuityId:continuity_id}:{})};
   try{
    const result=await routeE2OwnerChoice(choice,deps);
    return asText(JSON.stringify(result));
   }catch{
    return {...asText(JSON.stringify({status:'BLOCKED',reason:'E2_OWNER_ROUTING_UNAVAILABLE'})),isError:true};
   }
  }
 );
}
type E2ReadPort=Pick<E2JournalPort,'request'>;
/** Historical pre-V1 issue discovery: exact body match, no fabricated registry. */
async function findHistoricE2Issue(
 journal:E2ReadPort,continuityId:string
):Promise<{status:'READY'|'NOT_FOUND'|'CONFLICT'|'BLOCKED';issueNumber:number|null}>{
 const q=encodeURIComponent('repo:Patricked-code/MCP is:issue "'+continuityId+'"');
 const response=await journal.request('/search/issues?q='+q+'&per_page=100');
 if(!response.ok||!response.json||typeof response.json!=='object'
   ||Array.isArray(response.json))return {status:'BLOCKED',issueNumber:null};
 const list=(response.json as {items?:unknown}).items;
 if(!Array.isArray(list))return {status:'BLOCKED',issueNumber:null};
 const matches=list.filter(x=>{
   if(!x||typeof x!=='object'||Array.isArray(x)
     ||typeof x.body!=='string'||!Number.isSafeInteger(x.number)
     ||x.number<1||!x.body.includes('EXTERNAL_GOVERNED_RECOVERY'))return false;
   const id=/\*\*Continuity ID(?: canonique)?\s*:\*\*\s*`([A-Z][A-Z0-9-]{5,110})`/.exec(x.body)?.[1];
   return id===continuityId;
 }).map(x=>x.number as number);
 const unique=[...new Set(matches)];
 if(unique.length>1)return {status:'CONFLICT',issueNumber:null};
 return {status:unique.length===1?'READY':'NOT_FOUND',issueNumber:unique[0]??null};
}
export function registerE2ContinuityReadTools(
 server:McpServer,
 journal:E2ReadPort=defaultE2JournalPort
):void{
 server.tool(
  'mcp_e2_list_continuities',
  'E2 : apres le choix REPRISE du proprietaire, presente les Continuity IDs verifies par le registre GitHub, sans en creer aucun.',
  {entry_profile:z.literal('EXTERNAL_GOVERNED_RECOVERY'),
   e2_explicitly_selected:z.literal(true)},
  async ()=>{
   try{
    const history=await loadE2Journal(journal);
    if(history.status!=='READY')return asText(JSON.stringify({
      status:'BLOCKED',reason:'E2_CONTINUITY_REGISTRY_UNAVAILABLE'
    }));
    const entries=new Map<string,{continuityId:string;issueNumber:number;
      source:'E2_GITHUB_JOURNAL'|'HISTORICAL_GITHUB_ISSUE'}>();
    for(const event of history.entries){
     if(event.stage==='CONTINUITY_REGISTERED'&&event.continuityId&&event.issueNumber){
      const previous=entries.get(event.continuityId);
      if(previous&&previous.issueNumber!==event.issueNumber)
       return asText(JSON.stringify({status:'BLOCKED',reason:'E2_CONTINUITY_ID_CONFLICT'}));
      entries.set(event.continuityId,{
       continuityId:event.continuityId,issueNumber:event.issueNumber,source:'E2_GITHUB_JOURNAL'});
     }
    }
    // Historical E2 issues predate the append-only V1 register. Discover their
    // explicit canonical ID in the original issue body; never infer from titles.
    const query=encodeURIComponent('repo:Patricked-code/MCP is:issue "Continuity ID"');
    for(let page=1;page<=10;page++){
      const response=await journal.request('/search/issues?q='+query
        +'&per_page=100&page='+page);
      const raw=response.json&&typeof response.json==='object'
        &&!Array.isArray(response.json)
        ?response.json as Record<string,unknown>:null;
      const list=raw?.items;
      if(!response.ok||!Array.isArray(list))
       return asText(JSON.stringify({status:'PARTIAL',continuities:[...entries.values()],
        reason:'E2_HISTORIC_ISSUE_SEARCH_INCOMPLETE'}));
      for(const source of list){
       if(!source||typeof source!=='object'||Array.isArray(source))continue;
       const item=source as Record<string,unknown>;
       if(!Number.isSafeInteger(item.number)||Number(item.number)<1
         ||typeof item.body!=='string'
         ||!item.body.includes('EXTERNAL_GOVERNED_RECOVERY'))continue;
       const id=/\*\*Continuity ID(?: canonique)?\s*:\*\*\s*`([A-Z][A-Z0-9-]{5,110})`/.exec(item.body)?.[1];
       if(!id)continue;
       const previous=entries.get(id);
       if(previous&&previous.issueNumber!==item.number)
        return asText(JSON.stringify({status:'CONFLICT',reason:'E2_HISTORICAL_ID_COLLISION'}));
       if(!previous)entries.set(id,{
        continuityId:id,issueNumber:Number(item.number),source:'HISTORICAL_GITHUB_ISSUE'});
      }
      if(list.length<100)break;
      if(page===10)return asText(JSON.stringify({
        status:'PARTIAL',continuities:[...entries.values()],
        reason:'E2_HISTORICAL_SEARCH_PAGE_LIMIT'
      }));
    }
    return asText(JSON.stringify({status:'READY',continuities:[...entries.values()]
      .sort((a,b)=>a.continuityId.localeCompare(b.continuityId)),
      warning:'Ancrages historiques retrouves : leur historique complet doit etre reconstitue et controle individuellement avant reprise.'}));
   }catch{
    return {...asText(JSON.stringify({status:'BLOCKED',reason:'E2_CONTINUITY_INDEX_UNAVAILABLE'})),isError:true};
   }
  }
 );
 server.tool(
  'mcp_e2_recover_continuity',
  'E2 : recupere automatiquement un chantier depuis son Continuity ID, son issue et ses checkpoints, en distinguant preuve complete et historique partiel.',
  {
    entry_profile:z.literal('EXTERNAL_GOVERNED_RECOVERY'),
    e2_explicitly_selected:z.literal(true),
    continuity_id:z.string().regex(/^[A-Z][A-Z0-9-]{5,110}$/)
  },
  async ({continuity_id})=>{
   try{
    const journalResult=await loadE2Journal(journal);
    const found=findE2ContinuityInJournal(journalResult,continuity_id);
    const historic=found.status==='NOT_FOUND'
      ?await findHistoricE2Issue(journal,continuity_id):null;
    const effective=historic??found;
    if(effective.status!=='READY'||!effective.issueNumber){
      return asText(JSON.stringify({
       status:effective.status==='CONFLICT'?'CONFLICT'
        :effective.status==='BLOCKED'?'BLOCKED':'NOT_FOUND',
       continuityId:continuity_id,reason:'E2_CONTINUITY_CANONICAL_ISSUE_NOT_FOUND',
       note:'Aucun historique suppose ; ne pas creer une deuxieme continuite.'
      }));
    }
    const n=effective.issueNumber;
    const issue=await journal.request('/repos/Patricked-code/MCP/issues/'+n);
    if(!issue.ok||!issue.json||typeof issue.json!=='object'
      ||Array.isArray(issue.json)
      ||(issue.json as Record<string,unknown>).number!==n
      ||!String((issue.json as Record<string,unknown>).body??'').includes(continuity_id))
      return asText(JSON.stringify({status:'CONFLICT',reason:'E2_CONTINUITY_ISSUE_MISMATCH'}));
    const comments=[] as any[];
    for(let page=1;page<=50;page++){
      const response=await journal.request('/repos/Patricked-code/MCP/issues/'+n+
        '/comments?per_page=100&page='+page);
      if(!response.ok||!Array.isArray(response.json))
       return asText(JSON.stringify({status:'PARTIAL',reason:'E2_COMMENT_COLLECTION_INCOMPLETE'}));
      comments.push(...response.json);
      if(response.json.length<100)break;
      if(page===50)return asText(JSON.stringify({status:'PARTIAL',reason:'E2_COMMENT_PAGINATION_LIMIT'}));
    }
    const recovered=recoverE2FromGitHubIssueComments({
     issueNumber:n,allPagesFetched:true,comments
    },continuity_id);
    return asText(JSON.stringify({
      status:recovered.status==='READY'?'READY':'PARTIAL',
      continuityId:continuity_id,issueNumber:n,
      issueUrl:'https://github.com/Patricked-code/MCP/issues/'+n,
      issueTitle:(issue.json as Record<string,unknown>).title,
      checkpointCount:recovered.history.length,
      latestCheckpoint:recovered.latest?.url??null,
      lastStage:recovered.latest?.trace.stage??'ISSUE_OPENED',
      blockers:recovered.blockers,
      validatedRecovery:recovered.status==='READY',
      note:'La reprise documentaire ne cree jamais de permission, de claim ou de deploiement.'
    }));
   }catch{
    return {...asText(JSON.stringify({status:'BLOCKED',reason:'E2_CONTINUITY_RECOVERY_FAILED'})),isError:true};
   }
  }
 );
}
