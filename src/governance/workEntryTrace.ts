/**
 * PILOT-E2-01: an inspectable GitHub checkpoint for the two EXISTING work entries.
 *
 * An entry record is untrusted evidence, NOT an admission, runtime session,
 * GitHub permission, task assignment or deployment authorization.
 * No second dispatcher, Task Queue or deployment pipeline is introduced.
 */
export type WorkEntryProfile='INITIAL_GOVERNED_ENTRY'|'EXTERNAL_GOVERNED_RECOVERY';
export type WorkSelection='INTERNAL_MCP_TASK_ASSIGNMENT'
  |'OWNER_DIRECTLY_REQUESTED_WORK'
  |'AGENT_IDENTIFIED_WORK_WITHIN_EXISTING_OWNER_MANDATE';
export type WorkEntryStage='ISSUE_OPENED'|'PR_OPENED'|'MAIN_MERGED'|'S1_ATTESTED';

export type GovernedWorkEntryTrace=Readonly<{
  schemaVersion:1;
  continuityId:string;
  repository:'Patricked-code/MCP';
  entryProfile:WorkEntryProfile;
  workSelection:WorkSelection;
  /** Must be explicitly chosen; the agent never infers E2 from MCP failure. */
  explicitOwnerSelection:boolean;
  instructions:Readonly<{
    summary:string;
    sourceUrl:string;
  }>;
  responsible:Readonly<{
    /** Verified GitHub actor for the GitHub operations; not the runtime task owner. */
    githubActor:string|null;
    /** Optional existing MCP task reference for entry 1 only, NOT a claim. */
    internalTaskId:string|null;
  }>;
  github:Readonly<{
    issueNumber:number;
    branch:string|null;
    pullRequestNumber:number|null;
    headSha:string|null;
    mergeSha:string|null;
  }>;
  checkpoint:Readonly<{
    url:string|null;
    nextAction:string;
  }>;
  deployment:Readonly<{
    workflowRunUrl:string|null;
    runtimeRevisionSha:string|null;
  }>;
  stage:WorkEntryStage;
}>;

export type WorkEntryTraceAssessment=Readonly<{
  status:'EVIDENCE_STRUCTURALLY_VALID'|'INVALID_OR_INCOMPLETE_TRACE';
  blockers:readonly string[];
  sameEngineeringLifecycle:true;
  /** Hard invariants: metadata cannot turn into operational authorization. */
  runtimeTaskCreated:false;
  runtimeClaimOrLockCreated:false;
  githubWriteGranted:false;
  serverWriteGranted:false;
  deployGranted:false;
}>;
const SHA=/^[0-9a-f]{40}$/;
const LOGIN=/^[A-Za-z0-9-]{1,39}$/;
const BRANCH=/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,180}$/;
const CONTINUITY=/^[A-Z][A-Z0-9-]{5,110}$/;
const ISSUE_BASE='https://github.com/Patricked-code/MCP/issues/';
const PR_BASE='https://github.com/Patricked-code/MCP/pull/';
function validGithubBranch(branch:string):boolean{
  return BRANCH.test(branch)&&branch!=='main'
    &&!branch.includes('..')&&!branch.includes('//')
    &&!branch.endsWith('/')&&!branch.endsWith('.');
}
function positiveNumber(x:unknown):x is number{
  return Number.isSafeInteger(x)&&Number(x)>0;
}
function validUrl(x:string|null,base:string):boolean{
  return typeof x==='string'&&x.startsWith(base)
    &&/^https:\/\/github\.com\/Patricked-code\/MCP\/(?:issues|pull)\/\d+(?:#issuecomment-\d+)?$/.test(x);
}
function plainText(x:unknown,max:number):x is string{
  return typeof x==='string'&&x.trim().length>=8
    &&x.length<=max&&!/[\x00-\x08\x0B-\x1F]/.test(x);
}
function shaOrNull(x:unknown):boolean{return x===null||(typeof x==='string'&&SHA.test(x));}

/** Pure structural assessment: never calls GitHub, queues or runtime authorities. */
export function assessGovernedWorkEntryTrace(trace:GovernedWorkEntryTrace):WorkEntryTraceAssessment{
  const blockers:string[]=[];
  if(!trace||typeof trace!=='object'){
    return {status:'INVALID_OR_INCOMPLETE_TRACE',blockers:['INVALID_RECORD'],
      sameEngineeringLifecycle:true,runtimeTaskCreated:false,
      runtimeClaimOrLockCreated:false,githubWriteGranted:false,
      serverWriteGranted:false,deployGranted:false};
  }
  if(trace.schemaVersion!==1||trace.repository!=='Patricked-code/MCP'
    ||!CONTINUITY.test(trace.continuityId))blockers.push('INVALID_CANONICAL_SCOPE');
  const entry=trace.entryProfile;
  if(entry!=='INITIAL_GOVERNED_ENTRY'&&entry!=='EXTERNAL_GOVERNED_RECOVERY'){
    blockers.push('UNKNOWN_WORK_ENTRY');
  }
  const selection=trace.workSelection;
  if(entry==='INITIAL_GOVERNED_ENTRY'){
    if(selection!=='INTERNAL_MCP_TASK_ASSIGNMENT'
      ||typeof trace.responsible?.internalTaskId!=='string'
      ||!/^TASK-[A-Za-z0-9-]{3,96}$/.test(trace.responsible.internalTaskId))
      blockers.push('INITIAL_TASK_REFERENCE_REQUIRED');
  }else if(entry==='EXTERNAL_GOVERNED_RECOVERY'){
    if(trace.explicitOwnerSelection!==true
      ||!['OWNER_DIRECTLY_REQUESTED_WORK','AGENT_IDENTIFIED_WORK_WITHIN_EXISTING_OWNER_MANDATE'].includes(selection)
      ||trace.responsible?.internalTaskId!==null)
      blockers.push('E2_EXPLICIT_SELECTION_AND_NO_INTERNAL_TASK');
  }
  if(!plainText(trace.instructions?.summary,800)
    ||!positiveNumber(trace.github?.issueNumber)
    ||trace.instructions?.sourceUrl!==ISSUE_BASE+trace.github?.issueNumber)
    blockers.push('INSTRUCTION_PROVENANCE_NOT_ATTESTED');
  if(trace.responsible?.githubActor!==null
    &&(typeof trace.responsible?.githubActor!=='string'
      ||!LOGIN.test(trace.responsible.githubActor)))
    blockers.push('INVALID_GITHUB_ACTOR');
  if(!plainText(trace.checkpoint?.nextAction,500)
    ||(trace.checkpoint?.url!==null
      &&!validUrl(trace.checkpoint?.url,ISSUE_BASE)
      &&!validUrl(trace.checkpoint?.url,PR_BASE)))
    blockers.push('INVALID_CHECKPOINT');
  const github=trace.github;
  if(!github||!shaOrNull(github.headSha)||!shaOrNull(github.mergeSha)
    ||(github.branch!==null&&(!validGithubBranch(github.branch)))
    ||(github.pullRequestNumber!==null&&!positiveNumber(github.pullRequestNumber)))
    blockers.push('INVALID_GITHUB_REFERENCE');
  if(!['ISSUE_OPENED','PR_OPENED','MAIN_MERGED','S1_ATTESTED'].includes(trace.stage)){
    blockers.push('INVALID_STAGE');
  }
  if(trace.stage!=='ISSUE_OPENED'&&(!github?.branch||!positiveNumber(github?.pullRequestNumber)
    ||!github?.headSha))blockers.push('PR_EXACT_HEAD_REQUIRED');
  if(['MAIN_MERGED','S1_ATTESTED'].includes(trace.stage)&&!github?.mergeSha)
    blockers.push('MERGE_SHA_REQUIRED');
  if(trace.stage==='S1_ATTESTED'
    &&(!trace.deployment?.workflowRunUrl
      ||!/^https:\/\/github\.com\/Patricked-code\/MCP\/actions\/runs\/\d+$/.test(trace.deployment.workflowRunUrl)
      ||trace.deployment.runtimeRevisionSha!==github?.mergeSha))
    blockers.push('EXACT_RUNTIME_ATTESTATION_REQUIRED');
  if(!trace.deployment||!shaOrNull(trace.deployment.runtimeRevisionSha))
    blockers.push('INVALID_DEPLOYMENT_REFERENCE');
  return {
    status:blockers.length?'INVALID_OR_INCOMPLETE_TRACE':'EVIDENCE_STRUCTURALLY_VALID',
    blockers,
    sameEngineeringLifecycle:true,
    runtimeTaskCreated:false,
    runtimeClaimOrLockCreated:false,
    githubWriteGranted:false,
    serverWriteGranted:false,
    deployGranted:false
  };
}

/** Append in the existing issue/PR checkpoint, never replace history or dispatch work. */
export function renderGovernedWorkEntryCheckpoint(trace:GovernedWorkEntryTrace):string{
  const observation=assessGovernedWorkEntryTrace(trace);
  if(observation.status!=='EVIDENCE_STRUCTURALLY_VALID'){
    throw new Error('WORK_ENTRY_TRACE_INVALID:'+observation.blockers.join(','));
  }
  const clean=(s:string)=>s.replace(/[\r\n<>|]/g,' ').trim();
  return [
    '<!-- MCP_GOVERNED_WORK_ENTRY_TRACE_V1:'+trace.continuityId+' -->',
    '### Parcours choisi — checkpoint GitHub (preuve non exécutoire)',
    '- **Continuity ID :** `'+trace.continuityId+'`',
    '- **Entrée :** `'+trace.entryProfile+'`',
    '- **Source :** `'+trace.workSelection+'`',
    '- **Instructions :** '+clean(trace.instructions.summary),
    '- **Origine :** '+trace.instructions.sourceUrl,
    '- **Acteur GitHub observé :** '+(trace.responsible.githubActor??'NON_ATTESTÉ'),
    '- **Tâche interne référencée (entrée 1 seulement) :** '+(trace.responsible.internalTaskId??'AUCUNE'),
    '- **Issue :** #'+trace.github.issueNumber,
    '- **Branche :** '+(trace.github.branch??'NON_CRÉÉE'),
    '- **PR :** '+(trace.github.pullRequestNumber===null?'NON_CRÉÉE':'#'+trace.github.pullRequestNumber),
    '- **HEAD :** '+(trace.github.headSha??'NON_ATTESTÉ'),
    '- **Merge SHA :** '+(trace.github.mergeSha??'NON_FUSIONNÉ'),
    '- **Run Governed Deploy :** '+(trace.deployment.workflowRunUrl??'NON_ATTESTÉ'),
    '- **Révision runtime S1 :** '+(trace.deployment.runtimeRevisionSha??'NON_ATTESTÉ'),
    '- **Étape :** `'+trace.stage+'`',
    '- **Checkpoint antérieur :** '+(trace.checkpoint.url??'AUCUN'),
    '- **NEXT_ACTION :** '+clean(trace.checkpoint.nextAction),
    '',
    '**Limite :** entrée et métadonnées non autoritaires ; aucune Task, claim, lock,',
    'permission GitHub/serveur ni admission au Governed Deploy n’est créée.',
    'Le cycle de développement, CI, revue, merge et déploiement reste commun.',
    '<!-- MCP_GOVERNED_WORK_ENTRY_DATA_V1:'+
      Buffer.from(JSON.stringify(trace),'utf8').toString('base64url')+' -->'
  ].join('\n');
}
