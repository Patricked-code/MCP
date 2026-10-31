import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {liveStateEngine,type LiveStateEngine} from '../liveState/engine.js';
import {assessE2LivePreflight} from '../governance/e2LivePreflight.js';
import {asText} from './format.js';

/**
 * Owner-selected E2 read-only preflight, available regardless of GWC sessions,
 * claims, Task Queue, or operational-memory feature flags.
 * E1 registration and its default bootstrap instructions remain unchanged.
 */
export function registerE2PreflightReadOnlyTool(
 server:McpServer,engine:Pick<LiveStateEngine,'reconcileNow'>=liveStateEngine
):void{
 server.tool(
  'mcp_e2_reconcile_preflight',
  'EXTERNAL_GOVERNED_RECOVERY explicit only: read-only S1 then GitHub main, runtime and documentation alignment; returns BLOCKED on any mismatch. No GWC task or write.',
  {
   entry_profile:z.literal('EXTERNAL_GOVERNED_RECOVERY'),
   e2_explicitly_selected:z.literal(true)
  },
  async ({entry_profile,e2_explicitly_selected})=>{
   if(entry_profile!=='EXTERNAL_GOVERNED_RECOVERY'||e2_explicitly_selected!==true)
    return {...asText(JSON.stringify({ok:false,code:'E2_EXPLICIT_SELECTION_REQUIRED'})),isError:true};
   try{
    const snapshot=await engine.reconcileNow();
    return asText(JSON.stringify(assessE2LivePreflight(snapshot)));
   }catch{
    return {...asText(JSON.stringify({ok:false,code:'E2_LIVE_RECONCILIATION_UNAVAILABLE'})),isError:true};
   }
  }
 );
}
