import { createHmac } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resumeRepositoryCreation } from '../../capsules/grt-repository-creation/src/resume.mjs';
import { projectGrgsInventory } from './grgsInventoryProjection.js';
import { CUG_APP_ID, type CugConfig, type CugEvidenceScope } from './admission.js';
import { GRT_CONTROL_REPOSITORY, grtContinuityId, readGrtResumeState } from './questionnaire.js';
import { mintGithubAppRepoToken, type GithubAppTokenDeps } from '../github/appInstallationToken.js';

type Config = CugConfig & {grt?:{allowedTarget:string}};
type Actor = {subject:string;clientId:string;scopes:string[];expiresAt:number};
type Deps = GithubAppTokenDeps & {
  getConfig:()=>Promise<Config|null>;
  inspect:(token:string)=>Actor|null;
};
const unavailable = {status:'UNAVAILABLE'} as const;
const api='https://api.github.com';
const issueSchema=z.object({
  number:z.number().int().positive(), title:z.string(), body:z.string().max(100_000),
  user:z.object({login:z.literal('github-actions[bot]'),id:z.literal(41898282)}),
  pull_request:z.never().optional()
});
const repositorySchema=z.object({id:z.number().int().positive(),full_name:z.string(),archived:z.literal(false)});
const receiptFile=z.object({
  type:z.literal('file'),path:z.literal('.governance/local-entry/receipt.json'),
  encoding:z.literal('base64'),content:z.string().max(48_000)
});
const gitSha=z.string().regex(/^[0-9a-f]{40}$/);
const localState=z.object({
  status:z.string(),expected_head_sha:gitSha,
  handoff:z.object({baseline_commit_sha:gitSha}).nullish()
});
const commitSchema=z.object({
  sha:gitSha,parents:z.tuple([z.object({sha:gitSha})]),tree:z.object({sha:gitSha})
});
const treeSchema=z.object({
  sha:gitSha,truncated:z.literal(false),
  tree:z.array(z.object({path:z.string(),type:z.enum(['blob','tree','commit'])})).max(10_000)
});
type DocumentationReader=()=>Promise<Record<string,unknown>>;
const sameRepo=(a:string,b:string)=>a.toLowerCase()===b.toLowerCase();

export function createGrtEvidenceReaders(deps:Deps) {
  async function read(projectId:string,resolveActor:()=>Actor|null,scope?:CugEvidenceScope){
    try {
      if(!grtContinuityId.safeParse(projectId).success)return unavailable;
      const config=await deps.getConfig();
      const actor=resolveActor();
      const target=config?.grt?.allowedTarget;
      if(!config||!target||!actor||actor.subject!==config.subject||actor.clientId!==config.clientId
        ||!actor.scopes.includes('mcp:read')||!(actor.expiresAt*1000>deps.now().getTime()))return unavailable;
      const account=config.accounts.find(a=>target.split('/')[0]?.toLowerCase()===a.login.toLowerCase());
      if(!account||scope&&(scope.login.toLowerCase()!==account.login.toLowerCase()
        ||scope.installationId!==account.installationId||scope.target!==undefined&&!sameRepo(scope.target,target)))return unavailable;
      const principalRef=createHmac('sha256',config.identityKey)
        .update(JSON.stringify(['grt-resume',actor.subject,actor.clientId,account.installationId])).digest('hex');
      const centralIssue=Number(projectId.split('-').at(-1));
      const observedAt=()=>deps.now().toISOString();
      const observations:{documentation?:DocumentationReader}={};
      const result=await resumeRepositoryCreation({projectId,principalRef},{
        authorize:async input=>input.projectId===projectId&&input.principalRef===principalRef
          ? {projectId,centralIssue} : null,
        readCentral:async ()=> {
          const state=await readGrtResumeState(target,deps.fetchImpl,projectId);
          return state ? {state,evidence:{repository:GRT_CONTROL_REPOSITORY,issue:centralIssue,observedAt:observedAt()}} : null;
        },
        readLocal:async ({repository})=>{
          if(!sameRepo(repository.name,target))throw Error('GRT_TARGET_MISMATCH');
          if(!(actor.expiresAt*1000>deps.now().getTime()))throw Error('GRT_AUTH_EXPIRED');
          const grant=await mintGithubAppRepoToken({
            installation:{appId:CUG_APP_ID,installationId:account.installationId,accountLogin:account.login},
            repository:target,contentsPermission:'read',issuesRead:true
          },{...deps,fetchImpl:(input,init)=>deps.fetchImpl(input,{...init,redirect:'error'})});
          const deadline=AbortSignal.timeout(10_000);
          const get=(path:string)=>deps.fetchImpl(api+path,{
            redirect:'error',signal:deadline,
            headers:{Authorization:'Bearer '+grant.token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
          });
          const repoPath='/repos/'+target.split('/').map(encodeURIComponent).join('/');
          const scopeResponse=await get('/installation/repositories?per_page=2');
          if(scopeResponse.status!==200)throw Error('GRT_INSTALLATION_UNAVAILABLE');
          const scope=z.object({total_count:z.literal(1),repositories:z.tuple([repositorySchema])})
            .safeParse(await scopeResponse.json());
          if(!scope.success||String(scope.data.repositories[0].id)!==repository.id
            ||!sameRepo(scope.data.repositories[0].full_name,target))throw Error('GRT_INSTALLATION_SCOPE_MISMATCH');
          const marker='<!-- GRT_PROJECT_REQUEST:'+projectId.slice('WT-PROJECT-GRT-1386478935-'.length)+' -->';
          const matches:z.infer<typeof issueSchema>[]=[];
          for(let page=1;page<=5;page++){
            const response=await get(repoPath+'/issues?state=all&per_page=50&page='+page);
            if(response.status!==200)throw Error('GRT_LOCAL_ISSUES_UNAVAILABLE');
            const raw:unknown=await response.json();
            if(!Array.isArray(raw)||raw.length>50)throw Error('GRT_LOCAL_ISSUES_INVALID');
            for(const entry of raw){
              const parsed=issueSchema.safeParse(entry);
              if(parsed.success&&parsed.data.title.startsWith('[Governed Local Entry]')
                &&parsed.data.body.split(/\r?\n/).includes(marker))matches.push(parsed.data);
            }
            if(matches.length>1)throw Error('GRT_LOCAL_AMBIGUOUS');
            if(raw.length<50 || (response.headers.has('link')&&!/rel="next"/.test(response.headers.get('link')??'')))break;
            if(page===5)throw Error('GRT_LOCAL_SCAN_LIMIT');
          }
          const local=matches[0];
          if(!local)return null;
          const encoded=local.body.match(/<!-- GOVERNED_LOCAL_ENTRY_STATE:([A-Za-z0-9_-]+) -->\s*$/)?.[1];
          if(!encoded)throw Error('GRT_LOCAL_STATE_MISSING');
          const state:unknown=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));
          let baselineReceipt:unknown;
          const typed=localState.safeParse(state);
          const h=typed.success&&typed.data.status==='LOCAL_HANDOFF_READY'?typed.data.handoff:undefined;
          if(h&&typed.success){
            const sha=h.baseline_commit_sha;
            try {
              const response=await get(repoPath+'/git/commits/'+sha);
              if(response.status===200){
                const commit=commitSchema.safeParse(await response.json());
                if(commit.success&&commit.data.sha===sha&&commit.data.parents[0].sha===typed.data.expected_head_sha){
                  const response=await get(repoPath+'/contents/.governance/local-entry/receipt.json?ref='+sha);
                  if(response.status===200){
                    const file=receiptFile.safeParse(await response.json());
                    if(file.success)baselineReceipt=JSON.parse(Buffer.from(file.data.content,'base64').toString('utf8'));
                  }
                  // Run the candidate GRGS projection only after the capsule accepts the local handoff.
                  observations.documentation=async()=>{
                    const treeRef=commit.data.tree.sha;
                    const res=await get(repoPath+'/git/trees/'+treeRef+'?recursive=1');
                    if(res.status!==200)throw Error('GRGS_TREE_UNAVAILABLE');
                    const tree=treeSchema.parse(await res.json());
                    if(tree.sha!==treeRef)throw Error('GRGS_TREE_MISMATCH');
                    const inventory=projectGrgsInventory({installationId:account.installationId,
                      repositoryId:Number(repository.id),repositoryFullName:target,observedCommit:sha,
                      paths:tree.tree.filter(item=>item.type==='blob'&&item.path.toLowerCase().endsWith('.md')).map(item=>item.path)});
                    const counts:Record<string,number>={};
                    for(const row of inventory.documents)counts[row.classification]=(counts[row.classification]??0)+1;
                    return {status:'CLASSIFIED',policyId:inventory.policyId,policyVersion:inventory.policyVersion,
                      observedCommit:sha,evidenceDigest:inventory.evidenceDigest,counts,automaticMutation:false};
                  };
                }
              }
            }catch{ /* An unavailable proof does not establish an attestation. */ }
          }
          return {state,baselineReceipt,evidence:{
            repository:target,repositoryId:repository.id,issue:local.number,observedAt:observedAt()
          }};
        }
      });
      if(!(actor.expiresAt*1000>deps.now().getTime()))return unavailable;
      if(result.status!=='HANDOFF')return result;
      try {
        const documentation=await observations.documentation?.()??{status:'NOT_OBSERVED'};
        return actor.expiresAt*1000>deps.now().getTime()?{...result,documentation}:unavailable;
      }catch{return actor.expiresAt*1000>deps.now().getTime()
        ? {...result,documentation:{status:'NOT_OBSERVED'}} : unavailable;}
    }catch{return unavailable;}
  }
  return {
    forToken: (token:string,projectId:string)=>/^[!-~]{1,8192}$/.test(token)
      ? read(projectId,()=>deps.inspect(token)) : Promise.resolve(unavailable),
    // Only called after the HTTP admission rechecks the selected account and
    // discovers the continuity ID from the server-side central observer.
    forAdmission: (scope:CugEvidenceScope)=>read(scope.projectId,()=>scope.actor,scope)
  };
}

export function createGrtResumeRead(deps:Deps) {
  return createGrtEvidenceReaders(deps).forToken;
}

export function registerGrtResumeTool(server:McpServer,read:ReturnType<typeof createGrtResumeRead>){
  server.registerTool('mcp_resume_grt_repository_creation',{
    description:'Reprend en lecture seule un dossier de création GRT par ID de continuité, sans modifier le dépôt ni démarrer de session.',
    inputSchema:{projectContinuityId:grtContinuityId},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true}
  },async (input,extra)=>{
    const result=await read(extra.authInfo?.token??'',input.projectContinuityId);
    return {structuredContent:result,content:[{type:'text',text:JSON.stringify(result)}],
      isError:result.status==='UNAVAILABLE'||result.status==='BLOCKED'};
  });
}
