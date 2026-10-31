import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {env} from '../config/env.js';
import {liveStateEngine} from '../liveState/engine.js';
import type {LiveStateSnapshot} from '../liveState/types.js';
import {activateE2WithAutomaticReconciliation,type E2ActivationPorts,
  type E2RepairResult} from '../governance/e2AutoActivation.js';
import {buildMcpReconcileS1ToMainCommand}
  from './mcpReconcileS1ToMain.js';
import {runGuardedCommand} from '../ssh/client.js';
import {assertScopedWriteToolsEnabled,assertWriteFlag}
  from '../ssh/writeSafety.js';
import {asText} from './format.js';
import {appendE2Journal,newE2EntryId,type E2JournalEvent} from '../governance/e2EntryJournal.js';

const SHA=/^[a-f0-9]{40}$/;
const FETCH='git@github.com-mcp-patricked-ro:Patricked-code/MCP.git';
const PUSH='disabled://mcp-s1-read-only';
type E2ActivateDeps=Readonly<{
 observe:()=>Promise<LiveStateSnapshot>;
 reconcile:(snapshot:LiveStateSnapshot,allowWrite:boolean)=>Promise<E2RepairResult>;
 record?:(event:E2JournalEvent)=>Promise<{status:'RECORDED'|'BLOCKED';commentUrl:string|null;reason:string|null}>;
}>;
/**
 * Only the current E2 activation may request corrective writes.
 * This is not a scheduler and is never invoked by the default E1 lifecycle.
 */
async function defaultReconcile(snapshot:LiveStateSnapshot,allowWrite:boolean):Promise<E2RepairResult>{
 const s1=snapshot.s1,github=snapshot.github;
 const missing=()=>({outcome:'BLOCKED',reason:'E2_SHA_OR_SOURCE_NOT_VERIFIED'} as const);
 if(!SHA.test(s1.head??'')||!SHA.test(github.head??'')
   ||s1.fetchRemote!==FETCH||s1.pushRemote!==PUSH
   ||s1.branch!=='main'||github.branch!=='main')
   return missing();
 // The normal main -> S1 deploy stays under the EXISTING Governed Deploy.
 if(s1.workingTreeClean===true){
   if(s1.head!==github.head||snapshot.runtime.revision!==github.head)
     return {outcome:'GOVERNED_DEPLOY_PENDING',reason:'USE_EXISTING_MCP_GOVERNED_DEPLOY'};
   return {outcome:'BLOCKED',reason:'E2_DOCUMENTATION_OR_UNVERIFIED_STATE_DRIFT'};
 }
 // A local edit at an equal SHA has not yet been reviewed on GitHub.
 if(s1.head===github.head)
   return {outcome:'GITHUB_PROPOSAL_REQUIRED',reason:'UNPUBLISHED_S1_FILE_DIFFERENCE'};
 if(s1.originMain!==s1.head||s1.diffEmpty!==false)
   return {outcome:'BLOCKED',reason:'E2_UNEXPECTED_LOCAL_GIT_STATE'};
 // One owner-approved activation may request an automatic narrow operation.
 // The underlying command checks EVERY local Git diff and GitHub's exact SHA,
 // verifies each blob, backups all files and refuses everything else.
 if(!allowWrite)
   return {outcome:'AWAITING_AUTHORITY',reason:'E2_SCOPED_WRITE_NOT_AUTHORIZED'};
 try{
   assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
   assertWriteFlag(allowWrite,'mcp_e2_activate');
   const command=buildMcpReconcileS1ToMainCommand(
     s1.head!,github.head!,'EXTERNAL_GOVERNED_RECOVERY',true);
   const result=await runGuardedCommand('s1',command,{
     intent:'mcp_reconcile_s1_to_main:E2_EXPLICIT_ONLY',
     timeoutMs:120_000,maxOutputBytes:16_384
   });
   if(result.code===0&&result.stdout.includes('E2_GIT_CONVERGED=YES'))
     return {outcome:'S1_GIT_RECONCILED',reason:'E2_APPROVED_CONTENT_GIT_CONVERGED_REATTEST_RUNTIME'};
   if(result.code===85||result.code===84)
     return {outcome:'GITHUB_PROPOSAL_REQUIRED',reason:'S1_CONTENT_NOT_PRESENT_IN_APPROVED_MAIN'};
   return {outcome:'BLOCKED',reason:'E2_GUARDED_GIT_RECONCILIATION_REFUSED'};
 }catch{
   return {outcome:'BLOCKED',reason:'E2_GUARDED_S1_OPERATION_UNAVAILABLE'};
 }
}

export function registerE2AutomaticActivationTool(
  server:McpServer,
  deps:E2ActivateDeps={
    observe:()=>liveStateEngine.reconcileNow(),
    reconcile:defaultReconcile,
    record:appendE2Journal
  }
):void{
  server.tool(
    'mcp_e2_activate',
    'E2 EXTERNAL_GOVERNED_RECOVERY : automatiquement observer S1/GitHub; si divergence, demarrer mcp_reconcile_s1_to_main dans les limites de la gouvernance; si tout est aligne, poursuivre E2. Aucun effet E1.',
    {
      entry_profile:z.literal('EXTERNAL_GOVERNED_RECOVERY'),
      e2_explicitly_selected:z.literal(true),
      allow_write:z.boolean().default(false)
    },
    async ({entry_profile,e2_explicitly_selected,allow_write})=>{
      try{
        const entryId=newE2EntryId();
        const record=deps.record??appendE2Journal;
        const startedAt=new Date().toISOString();
        const base={
          schemaVersion:1 as const,entryId,observedAt:startedAt,
          profile:'EXTERNAL_GOVERNED_RECOVERY' as const,
          githubMainSha:null,s1HeadSha:null,runtimeSha:null,
          continuityId:null,issueNumber:null
        };
        // Every E2 attempt is persisted BEFORE observation, even if it fails.
        const first=await record({...base,stage:'ACTIVATED',reasonCode:null});
        if(first.status!=='RECORDED')return {...asText(JSON.stringify({
          status:'RECONCILIATION_BLOCKED',code:'E2_ENTRY_JOURNAL_UNAVAILABLE',
          entryId,nextStep:'RECONCILE_BEFORE_WORK'
        })),isError:true};
        const ports:E2ActivationPorts={
          observe:deps.observe,
          reconcile:(snapshot)=>deps.reconcile(snapshot,allow_write)
        };
        const result=await activateE2WithAutomaticReconciliation({
          entryProfile:entry_profile,explicitlySelected:e2_explicitly_selected
        },ports);
        const stage=result.status==='CONTINUE_E2'
          ?'READY_FOR_OWNER' as const
          :result.status==='RECONCILIATION_PENDING'
            ?'RECONCILIATION_PENDING' as const:'RECONCILIATION_BLOCKED' as const;
        const event:E2JournalEvent={
          ...base,observedAt:new Date().toISOString(),stage,
          githubMainSha:result.initial.githubMainSha,
          s1HeadSha:result.initial.s1HeadSha,
          runtimeSha:result.initial.runtimeSha,
          reasonCode:result.repair?.reason?.replace(/[^A-Z0-9_:-]/g,'_').slice(0,120)
            ||(result.initial.blockers[0]??null)
        };
        const done=await record(event);
        if(done.status!=='RECORDED')return {...asText(JSON.stringify({
          status:'RECONCILIATION_BLOCKED',code:'E2_FINAL_JOURNAL_UNAVAILABLE',
          entryId,initialJournalUrl:first.commentUrl,
          nextStep:'RECONCILE_BEFORE_WORK'
        })),isError:true};
        return asText(JSON.stringify({
          ...result,entryId,entryJournalUrl:first.commentUrl,
          checkpointUrl:done.commentUrl,
          ownerQuestion:result.status==='CONTINUE_E2'
            ?'Nouveau chantier ou reprise d un chantier existant ?':null,
          nextStep:result.status==='CONTINUE_E2'
            ?'ASK_NEW_OR_RESUME':result.nextStep
        }));
      }catch{
        return {...asText(JSON.stringify({
          status:'RECONCILIATION_BLOCKED',code:'E2_ACTIVATION_UNAVAILABLE',
          nextStep:'RECONCILE_BEFORE_WORK'
        })),isError:true};
      }
    }
  );
}
