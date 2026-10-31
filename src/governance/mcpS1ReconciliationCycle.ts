/**
 * Asynchronous E2 core engine. It composes existing authorized GitHub and S1
 * connectors through injected ports, with no new token, credential, session
 * authority, scheduler, branch protection bypass or direct push from S1.
 *
 * Runtime adapters MUST provide freshness/secret-scan/collision evidence.
 */
import {assessMcpS1ToMainReconciliation} from './mcpS1ToMainPolicy.js';
import type {McpReconcileObservation,McpReconcileDecision}
 from './mcpS1ToMainPolicy.js';

export type E2AutoReconcileAuthority=Readonly<{
  scopedS1WriteApproved:boolean;
  githubProposalApproved:boolean;
  governedDeployApproved:boolean;
}>;
export type E2AutoReconcilePorts=Readonly<{
  /**
   * Existing GitHub App workflow: create or return an existing branch/PR;
   * content MUST be sanitized upstream, scoped to MCP and never pushed to main.
   */
  proposeGitHubReview:(observation:McpReconcileObservation)=>Promise<Readonly<{
    issueOrPrUrl:string;proposalSha:string;created:boolean;
  }>>;
  /**
   * Existing guarded MCP SSH runner: only an exact approved-main byte match
   * can update Git refs after snapshot + backup, never overwrite contents.
   */
  convergeApprovedS1Files:(observation:McpReconcileObservation)=>Promise<Readonly<{
    observedGitHead:string;backupEvidence:string;
  }>>;
  /** Existing Governed Deploy workflow with independent CI/branch gates. */
  requestGovernedDeploy:(mainSha:string)=>Promise<Readonly<{
    jobUrl:string;accepted:boolean;
  }>>;
}>;
export type E2AutoReconcileResult=Readonly<{
  disposition:'READY_FOR_OWNER'|'PROPOSAL_OPENED'|'S1_GIT_CONVERGED'|
    'DEPLOY_REQUESTED'|'AWAITING_AUTHORITY'|'BLOCKED'|'OPERATION_FAILED';
  decision:McpReconcileDecision;
  evidenceUrl:string|null;
  reason:string|null;
  mayEnterNormalE2:boolean;
}>;
/** One idempotent, bounded reconciliation attempt; no background execution implied. */
export async function executeMcpS1ReconciliationCycle(
  snapshot:McpReconcileObservation,
  authority:E2AutoReconcileAuthority,
  ports:E2AutoReconcilePorts
):Promise<E2AutoReconcileResult>{
  const decision=assessMcpS1ToMainReconciliation(snapshot);
  const out=(disposition:E2AutoReconcileResult['disposition'],
    reason:string|null=null,evidenceUrl:string|null=null):E2AutoReconcileResult=>({
    disposition,decision,reason,evidenceUrl,mayEnterNormalE2:disposition==='READY_FOR_OWNER'
  });
  if(decision.status==='BLOCKED')return out('BLOCKED',decision.blockers.join(','));
  if(decision.status==='FULLY_ALIGNED')return out('READY_FOR_OWNER');
  try{
    if(decision.status==='S1_TO_GITHUB_REVIEW_REQUIRED'){
      if(!authority.githubProposalApproved)return out('AWAITING_AUTHORITY','GITHUB_PR_AUTHORITY_REQUIRED');
      const proposal=await ports.proposeGitHubReview(snapshot);
      if(!/^https:\/\/github\.com\/Patricked-code\/MCP\/(?:issues|pull)\/\d+(?:[/?#].*)?$/.test(proposal.issueOrPrUrl)
        ||!/^[a-f0-9]{40}$/.test(proposal.proposalSha))
        return out('OPERATION_FAILED','UNVERIFIED_GITHUB_PROPOSAL');
      return out('PROPOSAL_OPENED',null,proposal.issueOrPrUrl);
    }
    if(decision.status==='APPROVED_LOCAL_CONTENT_CANDIDATE'){
      if(!authority.scopedS1WriteApproved)return out('AWAITING_AUTHORITY','SCOPED_S1_AUTHORITY_REQUIRED');
      const result=await ports.convergeApprovedS1Files(snapshot);
      if(result.observedGitHead!==snapshot.githubMainHead||!result.backupEvidence)
        return out('OPERATION_FAILED','GIT_CONVERGENCE_UNATTESTED');
      return out('S1_GIT_CONVERGED',null,result.backupEvidence);
    }
    if(decision.status==='FAST_FORWARD_CANDIDATE'||decision.status==='RUNTIME_REDEPLOY_CANDIDATE'){
      if(!authority.governedDeployApproved)return out('AWAITING_AUTHORITY','GOVERNED_DEPLOY_AUTHORITY_REQUIRED');
      const result=await ports.requestGovernedDeploy(snapshot.githubMainHead!);
      if(!result.accepted||!/^https:\/\//.test(result.jobUrl))
        return out('OPERATION_FAILED','DEPLOY_NOT_ACCEPTED');
      return out('DEPLOY_REQUESTED',null,result.jobUrl);
    }
    return out('BLOCKED','UNSUPPORTED_TRANSITION');
  }catch{
    // Do not leak credential, SSH or upstream contents through an exception.
    return out('OPERATION_FAILED','E2_CONNECTOR_FAILURE');
  }
}
