import { z } from 'zod';
import { mintGithubAppRepoToken, type GithubAppTokenDeps } from '../github/appInstallationToken.js';

export const GRT_CONTROL_REPOSITORY = 'chainsolutions-wealthtech/Governed-Repository-Template';
const owners = new Map([
  ['chainsolutions-wealthtech', 'chainsolutions-wealthtech'],
  ['wealthtechinnovations', 'Wealthtechinnovations'],
  ['patricked-code', 'Patricked'],
]);
export const grtContinuityId=z.string().regex(/^WT-PROJECT-GRT-1386478935-GR-[0-9]{6,12}$/);
export const cugRepositoryName=z.string().trim().regex(/^[A-Za-z0-9_.-]{1,100}$/).refine(s => s !== '.' && s !== '..');
export const cugAnswers = z.object({
  objective: z.string().trim().min(1).max(800)
    .refine(s => !/[\u0000-\u001f\u007f<>]/u.test(s) && !s.includes('@')),
  repositoryName: cugRepositoryName,
  visibility: z.enum(['public','private']),
  publishToControlPlane: z.literal(true),
  confirmCreateRepository: z.literal(true)
}).strict();

export type CugAnswers = z.infer<typeof cugAnswers>;
export type GrtRequest = Readonly<{
  objective: string;
  creation: Readonly<{owner:string; name:string; visibility:'public'|'private'}>;
}>;
export type DispatchOutcome = 'QUEUED'|'NOT_AVAILABLE'|'DELIVERY_UNKNOWN';

export function prepareGrtRequest(login:string, raw:unknown):GrtRequest|null {
  const owner=owners.get(login.toLowerCase());
  const parsed=cugAnswers.safeParse(raw);
  if(!owner||!parsed.success)return null;
  const {objective,repositoryName,visibility}=parsed.data;
  return {objective,creation:{owner,name:repositoryName,visibility}};
}

/** The Git and MCP entrances converge on the existing, fixed GRT event. No repository is created here. */
export async function submitToGrt(input:GrtRequest, config:{
  appId:string; installationId:number; allowedTarget:string; expectedGrtMain:string;
}, target:string, deps:GithubAppTokenDeps):Promise<DispatchOutcome>{
  if(target.toLowerCase()!==config.allowedTarget.toLowerCase()||!/^[0-9a-f]{40}$/.test(config.expectedGrtMain))
    return 'NOT_AVAILABLE';
  const api='https://api.github.com/repos/'+GRT_CONTROL_REPOSITORY;
  let token:string;
  try{
    token=(await mintGithubAppRepoToken({
      installation:{appId:config.appId,installationId:config.installationId,accountLogin:'chainsolutions-wealthtech'},
      repository:GRT_CONTROL_REPOSITORY,contentsPermission:'write'
    },deps)).token;
    const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    const branch=await deps.fetchImpl(api+'/branches/main',{headers,redirect:'error',signal:AbortSignal.timeout(8000)});
    if(branch.status!==200)return 'NOT_AVAILABLE';
    const state=await branch.json();
    if(state?.commit?.sha!==config.expectedGrtMain)return 'NOT_AVAILABLE';
  }catch{return 'NOT_AVAILABLE';}
  try{
    const response=await deps.fetchImpl(api+'/dispatches',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),
      headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
        'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},
      body:JSON.stringify({event_type:'governed_request_start',client_payload:input})
    });
    if(response.status===204)return 'QUEUED';
    if([400,401,403,404,422].includes(response.status))return 'NOT_AVAILABLE';
    return 'DELIVERY_UNKNOWN';
  }catch{return 'DELIVERY_UNKNOWN';}
}

export type GrtCheckpoint={status:'FOUND';projectContinuityId:string;phase:string;grtState:string;revision:number;issueUrl:string};
const unknown={status:'UNCONFIRMED'} as const;
export async function observeGrtRequest(target:string,config:{allowedTarget:string},
  fetchImpl:typeof fetch, continuityId?:string):Promise<GrtCheckpoint|typeof unknown>{
  if(target.toLowerCase()!==config.allowedTarget.toLowerCase()||(continuityId&&!grtContinuityId.safeParse(continuityId).success))return unknown;
  const api='https://api.github.com/repos/'+GRT_CONTROL_REPOSITORY;
  const marker='<!-- GRT_CUG_CREATE_TARGET:'+target.toLowerCase()+' -->';
  const issueNumber=continuityId?Number(continuityId.split('-').at(-1)):null;
  if(issueNumber!==null&&(!Number.isSafeInteger(issueNumber)||issueNumber<1))return unknown;
  try{
    for(let page=1;page<=(issueNumber===null?4:1);page++){
      const response=await fetchImpl(api+(issueNumber===null?'/issues?state=all&per_page=50&page='+page:'/issues/'+issueNumber),{
        headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
        redirect:'error',signal:AbortSignal.timeout(4500)
      });
      if(response.status!==200)return unknown;
      const raw:unknown=await response.json();
      const entries=issueNumber===null?raw:[raw];
      if(!Array.isArray(entries)||entries.length>50)return unknown;
      const candidates=entries.filter(x=>x&&!x.pull_request&&x.user?.login==='github-actions[bot]'
        &&typeof x.title==='string'&&x.title.startsWith('[Governed Request]')
        &&typeof x.body==='string'&&x.body.length<=100_000&&x.body.split(/\r?\n/).includes(marker));
      if(candidates.length>1)return unknown;
      const issue=candidates[0];
      if(issue){
        if(!Number.isSafeInteger(issue.number)||issue.number<1||(issueNumber!==null&&issue.number!==issueNumber))return unknown;
        const encoded=issue.body.match(/<!-- GOVERNED_REQUEST_STATE:([A-Za-z0-9_-]+) -->\s*$/)?.[1];
        if(!encoded)return unknown;
        const state=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));
        const requestId='GR-'+String(issue.number).padStart(6,'0');
        const projectContinuityId='WT-PROJECT-GRT-1386478935-'+requestId;
        const answers=state?.answers;
        if((continuityId&&continuityId!==projectContinuityId)||state?.schema_version!=='1.0.0'
          ||state.project_continuity_id!==projectContinuityId||state.request_id!==requestId
          ||state.control_plane_repository!==GRT_CONTROL_REPOSITORY||state.credential_provider!=='CUG'
          ||answers?.entry_action!=='CREATE_NEW_REPOSITORY'
          ||owners.get(target.split('/')[0]!.toLowerCase())!==answers.creation_target_owner
          ||typeof answers.repository_name!=='string'||answers.repository_name.toLowerCase()!==target.split('/')[1]?.toLowerCase()
          ||typeof state.phase!=='string'||!/^[A-Z][A-Z0-9_-]{0,79}$/.test(state.phase)
          ||!['REQUEST_CREATED','WAITING_FOR_ANSWER','PLAN_READY','WAITING_FOR_PLAN_APPROVAL','EXECUTING_PREPARATION','HOLD_FOR_REVIEW','HANDOFF_READY','CLOSED'].includes(state.status)
          ||!Number.isSafeInteger(state.revision)||state.revision<1)return unknown;
        return {status:'FOUND',projectContinuityId,phase:state.phase,grtState:state.status,revision:state.revision,
          issueUrl:'https://github.com/'+GRT_CONTROL_REPOSITORY+'/issues/'+issue.number};
      }
      if(entries.length<50)return unknown;
    }
  }catch{return unknown;}
  return unknown;
}
