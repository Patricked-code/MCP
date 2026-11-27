import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { asText } from './format.js';
import { AILM_TOOL, AILM_SCOPES, AILM_OPERATIONS, runInfrastructureLifecycle } from '../infrastructureLifecycle/service.js';

export function registerInfrastructureLifecycleTool(server:McpServer):void {
  server.registerTool(AILM_TOOL,{
    title:'AILM — Infrastructure & maintenance',
    description:'Parcours AILM en lecture seule : statut, capacités et plans de nettoyage S1/S2. Freebox, exécution et programmation restent non raccordées ; aucune suppression.',
    inputSchema:{scope:z.enum(AILM_SCOPES),operation:z.enum(AILM_OPERATIONS)},
    annotations:{readOnlyHint:true,destructiveHint:false}
  },async ({scope,operation})=>asText(JSON.stringify(await runInfrastructureLifecycle(scope,operation),null,2)));
}
