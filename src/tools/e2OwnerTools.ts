import {z} from 'zod';
import {env} from '../config/env.js';
import {assertScopedWriteToolsEnabled} from '../ssh/writeSafety.js';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {asText} from './format.js';
import {routeE2OwnerChoice,type E2OwnerChoice,type E2OwnerPort,
 defaultE2OwnerPort} from '../governance/e2OwnerLifecycle.js';
import {type E2JournalPort,defaultE2JournalPort} from '../governance/e2EntryJournal.js';
import {recoverE2FromGitHubIssueComments}
 from '../governance/e2GitHubEvidence.js';
import {discoverE2CanonicalRoots} from '../governance/e2CanonicalDiscovery.js';

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
export function registerE2ContinuityReadTools(
 server:McpServer,
 journal:E2ReadPort=defaultE2JournalPort
):void{
 server.tool(
  'mcp_e2_list_continuities',
  'E2 G2 : AVANT la question NEW/RESUME, decouvrir toutes les racines canoniques prouvees par les issues, commentaires et journal GitHub ; PARTIAL si exploration incomplete.',
  {entry_profile:z.literal('EXTERNAL_GOVERNED_RECOVERY'),
   e2_explicitly_selected:z.literal(true)},
  async ()=>{
   try{
    const discovery=await discoverE2CanonicalRoots(journal);
    return asText(JSON.stringify({
      status:discovery.status,continuities:discovery.continuities,
      ...(discovery.reason?{reason:discovery.reason}:{}),
      grantsPermission:false,
      warning:discovery.status==='READY'
        ?'Couverture des declarations canoniques explicitement publiees; les historiques et sous-continuites doivent etre controles a la reprise.'
        :'G2 incomplet : aucun choix G3 ne doit etre autorise.'
    }));
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
    // Reuse exactly the G2 canonical root index. An adopted root in issue
    // comments is valid even when the issue's initial body predates the ID.
    const discovered=await discoverE2CanonicalRoots(journal);
    if(discovered.status!=='READY')return asText(JSON.stringify({
      status:discovered.status,reason:'E2_G2_DISCOVERY_INCOMPLETE',
      continuityId:continuity_id,grantsPermission:false
    }));
    const root=discovered.continuities.find(x=>x.continuityId===continuity_id);
    if(!root)return asText(JSON.stringify({
      status:'NOT_FOUND',continuityId:continuity_id,
      reason:'E2_CONTINUITY_CANONICAL_ISSUE_NOT_FOUND',
      note:'Ne pas creer une deuxieme continuite.'
    }));
    const n=root.issueNumber;
    const issue=await journal.request('/repos/Patricked-code/MCP/issues/'+n);
    if(!issue.ok||issue.status!==200||!issue.json||typeof issue.json!=='object'
      ||Array.isArray(issue.json)
      ||(issue.json as Record<string,unknown>).number!==n
      ||(issue.json as Record<string,unknown>).pull_request)
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
