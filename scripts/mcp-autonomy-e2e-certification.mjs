/**
 * C27 — independent read-only CERTIFIER of a completed autonomous code cycle.
 *
 * The caller MUST inject REAL, authorized GitHub, MCP, agent-host and
 * checkpoint readers. A local JSON fixture, planning READY or successful
 * workflow alone is never evidence of a live autonomous execution.
 *
 * No execution, permission, queue, session, claim or status mutation occurs.
 */
import { createHash } from 'node:crypto';

const SHA=/^[a-f0-9]{40}$/;
const TASK=/^TASK-[0-9]{8}-[0-9]{3,}$/;
const RUN=/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{2,127}$/;
const REPOSITORY='Patricked-code/MCP';
const READERS=['readAgentRun','readSession','readTask','readPullRequest',
  'readPrChecks','readMainChecks','readGovernedDeploy','readLiveState',
  'readCheckpoint','readNextWork'];
const MAX_FRESH_MS=60_000;
function object(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
function ms(x){const n=Date.parse(x??'');return Number.isFinite(n)?n:NaN;}
function ordered(...times){const a=times.map(ms);return a.every(Number.isFinite)&&a.every((v,i)=>i===0||v>=a[i-1]);}
function reason(status,why,stage='UNVERIFIED'){
  return Object.freeze({status,reason:why,stage,
    authorizesExecution:false,createsRuntimeTask:false,
    grantsClaim:false,globalMcpComplete:false});
}
function validSelector(x){
  return object(x)&&x.repository===REPOSITORY
    &&x.mandateIssue===235&&TASK.test(x.taskId??'')
    &&typeof x.governedSessionId==='string'&&/^[a-f0-9-]{36}$/.test(x.governedSessionId)
    &&RUN.test(x.agentRunId??'')
    &&Number.isSafeInteger(x.pullRequestNumber)&&x.pullRequestNumber>0
    &&SHA.test(x.expectedMergeSha??'')
    &&RUN.test(x.checkpointId??'')
    &&Number.isFinite(ms(x.observedAt));
}
function ensure(cond,code){if(!cond)throw new Error(code);}
function attest(x,source){
  ensure(object(x)&&x.source===source,source+'_SOURCE_UNATTESTED');
}
function noOwnerDrift(agent,session,task,selector){
  ensure(session.governedSessionId===selector.governedSessionId
    &&session.repository===REPOSITORY
    &&typeof session.ownerPrincipalId==='string'
    &&session.ownerPrincipalId.startsWith('oauth:')
    &&Number.isSafeInteger(session.lastAcknowledgedStateVersion)
    &&session.lastAcknowledgedStateVersion>0,
  'SESSION_IDENTITY_OR_BOOTSTRAP_UNATTESTED');
  ensure(task.taskId===selector.taskId
    &&task.repository===REPOSITORY
    &&task.ownerGovernedSessionId===selector.governedSessionId
    &&task.status==='DONE'
    &&Number.isSafeInteger(task.taskRevision)&&task.taskRevision>0,
  'CANONICAL_P2_TASK_NOT_COMPLETED_BY_OWNER');
  ensure(agent.taskId===selector.taskId
    &&agent.governedSessionId===selector.governedSessionId
    &&agent.executorRunId===selector.agentRunId
    &&agent.repository===REPOSITORY,
  'AGENT_TASK_SESSION_BINDING_MISMATCH');
}
function checkCodeAndTests(pr,selector){
  ensure(pr.number===selector.pullRequestNumber
    &&pr.repository===REPOSITORY
    &&pr.baseRef==='main'
    &&pr.merged===true
    &&pr.mergeCommitSha===selector.expectedMergeSha
    &&SHA.test(pr.headSha??'')
    &&Array.isArray(pr.changedPaths)
    &&pr.changedPaths.length>0,'PROTECTED_PR_MERGE_NOT_ATTESTED');
  const code=pr.changedPaths.some(p=>/^src\/.+\.(?:ts|js|mjs)$|^scripts\/.+\.(?:ts|js|mjs)$/.test(p));
  const tests=pr.changedPaths.some(p=>/^tests\/.+\.test\.(?:ts|js|mjs)$/.test(p));
  ensure(code&&tests,'CODE_AND_REGRESSION_TEST_NOT_ATTESTED');
}
function checks(ok,sha,source){
  attest(ok,source);
  ensure(ok.headSha===sha
    &&ok.conclusion==='success'
    &&ok.requiredChecksPassed===true
    &&Number.isSafeInteger(ok.runId)&&ok.runId>0,
  source+'_EXACT_HEAD_CI_UNATTESTED');
}
function liveNow(s,selector){
  attest(s,'MCP_LIVE_STATE');
  ensure(s.freshness==='CURRENT'
    &&Number.isFinite(ms(s.observedAt))
    &&ms(selector.observedAt)>=ms(s.observedAt)
    &&ms(selector.observedAt)-ms(s.observedAt)<=MAX_FRESH_MS,
  'LIVE_STATE_NOT_FRESH');
  ensure(s.globalAlignment==='FULLY_ALIGNED'
    &&s.githubSha===selector.expectedMergeSha
    &&s.s1Sha===selector.expectedMergeSha
    &&s.runtimeSha===selector.expectedMergeSha
    &&s.s1Clean===true&&s.containerHealth==='healthy'
    &&s.documentationDrift===false,
  'MAIN_S1_RUNTIME_DOCUMENTATION_NOT_ATTESTED');
}
/**
 * Each reader is a read-only adapter to an existing authority. In a test,
 * fake readers prove ONLY the contract. In production, record the actual
 * source/URL/run ID and reobserve on every execution.
 */
export async function certifyC27AutonomousCycle(selector,ports={}){
  if(!validSelector(selector))return reason('UNVERIFIED','INVALID_C27_SELECTOR','INPUT');
  if(READERS.some(n=>typeof ports[n]!=='function')){
    return reason('UNVERIFIED','REQUIRED_LIVE_EVIDENCE_PORTS_MISSING','SOURCES');
  }
  let evidence;
  try{
    const values=await Promise.all(READERS.map(n=>ports[n](Object.freeze({...selector}))));
    evidence=Object.fromEntries(READERS.map((n,i)=>[n,values[i]]));
  }catch{return reason('UNVERIFIED','LIVE_EVIDENCE_READ_FAILED','SOURCES');}
  const {
    readAgentRun:agent,readSession:session,readTask:task,
    readPullRequest:pr,readPrChecks:prChecks,
    readMainChecks:mainChecks,readGovernedDeploy:deploy,
    readLiveState:live,readCheckpoint:checkpoint,
    readNextWork:next
  }=evidence;
  try{
    attest(agent,'VERIFIED_EXISTING_AGENT_HOST');
    ensure(agent.provider==='ChatGPT'||agent.provider==='Claude',
      'UNSUPPORTED_OR_UNATTESTED_CODE_AGENT');
    ensure(agent.triggerKind==='SCHEDULED'||agent.triggerKind==='EVENT',
      'AUTONOMOUS_WAKE_NOT_OBSERVED');
    ensure(agent.hostRunVerified===true&&agent.durable===true
      &&agent.status==='COMPLETED'
      &&RUN.test(agent.wakeReceiptId??''),
    'AUTONOMOUS_WAKE_RECEIPT_UNATTESTED');
    attest(session,'GOVERNED_SESSIONS');
    attest(task,'GOVERNED_TASK_QUEUE');
    noOwnerDrift(agent,session,task,selector);
    attest(pr,'GITHUB_PULL_REQUEST');
    checkCodeAndTests(pr,selector);
    checks(prChecks,pr.headSha,'GITHUB_PR_CHECKS');
    checks(mainChecks,selector.expectedMergeSha,'GITHUB_MAIN_CHECKS');
    ensure(prChecks.requiredReviewThreadsResolved===true
      &&prChecks.branchProtectionSatisfied===true,
      'REVIEW_OR_MAIN_PROTECTION_UNATTESTED');
    attest(deploy,'MCP_GOVERNED_DEPLOY');
    ensure(deploy.headSha===selector.expectedMergeSha
      &&deploy.conclusion==='success'
      &&deploy.actualExactShaDeployStepSucceeded===true
      &&Number.isSafeInteger(deploy.runId)&&deploy.runId>0,
      'GOVERNED_DEPLOY_EXACT_SHA_UNATTESTED');
    liveNow(live,selector);
    attest(checkpoint,'GITHUB_ISSUE_COMMENT');
    ensure(checkpoint.issueNumber===235
      &&checkpoint.checkpointId===selector.checkpointId
      &&checkpoint.taskId===selector.taskId
      &&checkpoint.agentRunId===selector.agentRunId
      &&checkpoint.pullRequestNumber===selector.pullRequestNumber
      &&checkpoint.mergeSha===selector.expectedMergeSha
      &&typeof checkpoint.nextAction==='string'&&checkpoint.nextAction.length>=8,
      'CANONICAL_DURABLE_CHECKPOINT_MISSING');
    attest(next,'PROGRAM_BACKLOG_V2');
    ensure(next.repository===REPOSITORY
      &&next.observedMainSha===selector.expectedMergeSha
      &&next.readinessRecomputed===true
      &&next.runtimeClaimGrantedByRead===false
      &&typeof next.nextAction==='string'&&next.nextAction.length>=8,
      'NEXT_WORK_NOT_REOBSERVED');
    ensure(ordered(agent.startedAt,prChecks.completedAt,pr.mergedAt,
      mainChecks.completedAt,deploy.completedAt,live.observedAt,
      checkpoint.createdAt,next.observedAt),
    'C27_CAUSAL_ORDER_UNATTESTED');
    ensure(ms(selector.observedAt)>=ms(next.observedAt),'CHECKPOINT_FUTURE_TO_OBSERVATION');
    const proof={
      repository:REPOSITORY,mandateIssue:235,
      taskId:selector.taskId,governedSessionId:selector.governedSessionId,
      agentRunId:selector.agentRunId,provider:agent.provider,
      triggerKind:agent.triggerKind,pullRequestNumber:selector.pullRequestNumber,
      prHeadSha:pr.headSha,mergeSha:selector.expectedMergeSha,
      prCiRunId:prChecks.runId,mainCiRunId:mainChecks.runId,
      governedDeployRunId:deploy.runId,checkpointId:selector.checkpointId,
      nextObservedAt:next.observedAt
    };
    const digest=createHash('sha256').update(JSON.stringify(proof)).digest('hex');
    return Object.freeze({
      status:'CERTIFIED_C27_AUTONOMOUS_CODE_CYCLE',
      proofDigest:digest,proof,
      nextAction:next.nextAction,
      authorizesExecution:false,createsRuntimeTask:false,
      grantsClaim:false,globalMcpComplete:false
    });
  }catch(e){
    const code=e instanceof Error?e.message:'UNVERIFIED_EVIDENCE';
    return reason('UNVERIFIED',/^[A-Z0-9_]{5,100}$/.test(code)?code:'UNVERIFIED_EVIDENCE',
      'C27_ACCEPTANCE');
  }
}
