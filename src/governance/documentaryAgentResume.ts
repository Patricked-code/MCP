/** Resolve an existing documentary agent. This function has no runtime effects. */
export interface DocumentaryAgent {
  agentId?: string; name?: string; aliases?: string[];
  identityScope?: string; permissionAuthority?: string; clientBinding?: string;
  continuity?: {repository?: string; anchorIssueUrl?: string; canonicalCheckpointUrl?: string; latestCheckpointResolution?: string};
}
export interface DocumentaryRegistry {agents?: DocumentaryAgent[]}
export type DocumentaryResumeStatus = 'FOUND_DOCUMENTARY_ONLY'|'NOT_FOUND'|'AMBIGUOUS'|'UNVERIFIED';
export interface DocumentaryResumeResult {
 status: DocumentaryResumeStatus; agentId: string|null; anchorIssueUrl: string|null; canonicalCheckpointUrl: string|null;
 nextStep: 'REOBSERVE_CHECKPOINTS_AND_RUNTIME_AUTHORITIES'|'STOP_NO_AUTHORITY';
 governedSessionId: null; runtimeAuthorized: false; mayClaimTask: false; mayDeploy: false;
}
const deny=(status: DocumentaryResumeStatus):DocumentaryResumeResult=>({
 status,agentId:null,anchorIssueUrl:null,canonicalCheckpointUrl:null,nextStep:'STOP_NO_AUTHORITY',
 governedSessionId:null,runtimeAuthorized:false,mayClaimTask:false,mayDeploy:false,
});
export function resolveDocumentaryAgentResume(registry:DocumentaryRegistry, requestedId:string, repository:string):DocumentaryResumeResult {
 if(!requestedId || !repository || !Array.isArray(registry?.agents)) return deny('UNVERIFIED');
 const matches=registry.agents.filter(a=>a.agentId===requestedId || a.name===requestedId || a.aliases?.includes(requestedId));
 if(matches.length===0)return deny('NOT_FOUND');
 if(matches.length!==1)return deny('AMBIGUOUS');
 const a=matches[0]!, c=a.continuity;
 if(!a.agentId || a.identityScope!=='VERSIONED_DOCUMENTARY_PROFILE_ONLY' ||
 a.permissionAuthority!=='GITHUB_AND_EXISTING_GOVERNED_RUNTIME_AUTHORITIES' ||
 a.clientBinding!=='UNATTESTED_RESOLVE_PER_REQUEST' || c?.repository!==repository ||
 c.anchorIssueUrl!=='https://github.com/Patricked-code/MCP/issues/313' ||
 c.canonicalCheckpointUrl!=='https://github.com/Patricked-code/MCP/issues/313#issuecomment-6275857601' ||
 c.latestCheckpointResolution!=='REOBSERVE_ISSUE_313_APPEND_ONLY_COMMENT_CHAIN') return deny('UNVERIFIED');
 return {status:'FOUND_DOCUMENTARY_ONLY',agentId:a.agentId,anchorIssueUrl:c.anchorIssueUrl,
 canonicalCheckpointUrl:c.canonicalCheckpointUrl,nextStep:'REOBSERVE_CHECKPOINTS_AND_RUNTIME_AUTHORITIES',
 governedSessionId:null,runtimeAuthorized:false,mayClaimTask:false,mayDeploy:false};
}
