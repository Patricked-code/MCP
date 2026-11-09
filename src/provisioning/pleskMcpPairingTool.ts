/**
 * B3i: non-executable, bearer-bound OAuth MCP transport pairing tool.
 * The authenticated SDK ToolExtra is the ONLY source of transport identity.
 * It returns a short-lived secret for a human to enter on the existing
 * signed E3 Plesk web form; it never grants SSH or Plesk permissions.
 */
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {sessionRequestFromToolExtra} from '../tools/governedSessions.js';
import type {PleskWebTransportPairing} from './pleskWebTransportPairing.js';

export function registerPleskWebMcpPairingTool(
  server:McpServer,pairing:PleskWebTransportPairing
):void{
  server.tool('mcp_issue_plesk_web_pairing_proof',
    'Émet une preuve E3 temporaire pour une session OAuth MCP réellement liée; aucune opération Plesk.',
    {
      serverId:z.enum(['s1','s2']),
      parentDomain:z.string().min(4).max(253),
      label:z.string().min(1).max(63),
      documentRoot:z.string().min(2).max(150)
    },
    async(input,extra)=>{
      try{
        if(!extra.authInfo?.scopes?.includes('mcp:write'))throw Error('SCOPE_DENIED');
        const transport=sessionRequestFromToolExtra(extra);
        const oauthToken=extra.authInfo.token;
        const result=pairing.issue({transport,oauthToken,target:input});
        return {content:[{type:'text' as const,text:JSON.stringify(result)}]};
      }catch{
        return {isError:true,content:[{
          type:'text' as const,text:JSON.stringify({
            status:'BLOCKED',reason:'AUTHENTICATED_TRANSPORT_REQUIRED',
            runtimeWriteAuthorized:false
          })
        }]};
      }
    }
  );
}
