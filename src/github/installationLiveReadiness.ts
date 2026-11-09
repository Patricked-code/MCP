/**
 * GD-U-E2-NEXT-01: real, read-only GitHub App *repository* preflight.
 *
 * Reuses the existing repo-scoped GitHub App token issuer rather than inventing
 * a second App/credential store. A freshly minted contents:read token is used
 * only for two authenticated GETs, then discarded. Never promotes this
 * observation to Task/Session/Claim/Lock/E3 authority or an admin permission.
 */
import {
  mintGithubAppRepoToken,
  type GithubAppInstallation,
  type GithubAppTokenDeps
} from './appInstallationToken.js';
import {
  assessGithubInstallationCapability,
  type GithubCapabilityAssessment
} from './installationCapabilityReadiness.js';

export type GithubAppReadOnlyProbeInput=Readonly<{
  installation:GithubAppInstallation;
  repository:string;
}>;
export type GithubAppReadOnlyProbeResult=Readonly<{
  status:'PERMISSION_OBSERVED'|'BLOCKED';
  repository:string;
  installationId:number|null;
  reason:'VERIFIED_READ_ONLY'|'INVALID_TARGET_OR_CREDENTIAL'|'PROVIDER_UNAVAILABLE'
    |'REPOSITORY_SCOPE_MISMATCH'|'REPOSITORY_READ_NOT_ATTESTED';
  assessment:GithubCapabilityAssessment|null;
  /** An installation read token never proves administrative/write authority. */
  runtimeWriteAuthorized:false;
  adminPermissionAttested:false;
  tokenExposed:false;
  mutationExecuted:false;
}>;
type ProviderResponse=Readonly<{status:number;ok:boolean;json:unknown}>;
const REPO=/^[A-Za-z0-9][A-Za-z0-9-]{0,38}[/][A-Za-z0-9_.-]{1,100}$/;
function object(x:unknown):Record<string,unknown>|null{
  return x!==null&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:null;
}
const blocked=(repository:string,reason:GithubAppReadOnlyProbeResult['reason']):
  GithubAppReadOnlyProbeResult=>({
    status:'BLOCKED',repository,installationId:null,reason,assessment:null,
    runtimeWriteAuthorized:false,adminPermissionAttested:false,
    tokenExposed:false,mutationExecuted:false
  });

/** Read-only provider requests with the exact token minted for this repository.
 * All responses are verified fail-closed; none of the token or raw response is returned.
 */
export async function probeGithubAppReadOnlyRepository(
  input:GithubAppReadOnlyProbeInput,
  deps:GithubAppTokenDeps
):Promise<GithubAppReadOnlyProbeResult>{
  const repo=input?.repository;
  const install=input?.installation;
  if(typeof repo!=='string'||!REPO.test(repo)||repo.includes('..')
    ||!install||repo.split('/')[0]!.toLowerCase()!==install.accountLogin?.toLowerCase()
    ||!Number.isSafeInteger(install.installationId)||install.installationId<=0
    ||typeof install.appId!=='string'||!/^[0-9]{1,20}$/.test(install.appId)){
    return blocked(typeof repo==='string'?repo:'','INVALID_TARGET_OR_CREDENTIAL');
  }
  let token:string;
  try{
    // Existing protected server-side App key and GitHub API enforce a single
    // repository plus contents:read. Never request contents:write/admin.
    const grant=await mintGithubAppRepoToken({
      installation:install,repository:repo,contentsPermission:'read'
    },deps);
    token=grant.token;
  }catch{return blocked(repo,'INVALID_TARGET_OR_CREDENTIAL');}
  const headers={
    Authorization:'Bearer '+token,
    Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'
  };
  const get=async(url:string):Promise<ProviderResponse|null>=>{
    try{
      const r=await deps.fetchImpl(url,{method:'GET',headers,signal:AbortSignal.timeout(15000)});
      if(r.status!==200)return null;
      return {status:r.status,ok:r.ok,json:await r.json() as unknown};
    }catch{return null;}
  };
  // A single-repository installation token must not reveal any other repo.
  const membership=await get('https://api.github.com/installation/repositories?per_page=100');
  const membershipJson=object(membership?.json);
  const entries=membershipJson?.repositories;
  if(!membership?.ok||membershipJson?.total_count!==1
    ||!Array.isArray(entries)||entries.length!==1
    ||typeof object(entries[0])?.full_name!=='string'
    ||(object(entries[0])!.full_name as string).toLowerCase()!==repo.toLowerCase()){
    return blocked(repo,membership?'REPOSITORY_SCOPE_MISMATCH':'PROVIDER_UNAVAILABLE');
  }
  const repository=await get('https://api.github.com/repos/'+
    repo.split('/').map(encodeURIComponent).join('/'));
  const repositoryJson=object(repository?.json);
  const permissions=object(repositoryJson?.permissions);
  if(!repository?.ok||typeof repositoryJson?.full_name!=='string'
    ||repositoryJson.full_name.toLowerCase()!==repo.toLowerCase()
    ||permissions?.pull!==true){
    return blocked(repo,'REPOSITORY_READ_NOT_ATTESTED');
  }
  let now:string;
  try{now=deps.now().toISOString();}catch{return blocked(repo,'PROVIDER_UNAVAILABLE');}
  const assessment=assessGithubInstallationCapability({
    repository:repo,operation:'repository.read',now
  },{
    source:'GITHUB_API',installationId:install.installationId,
    accountLogin:install.accountLogin,repository:repo,
    repositorySelection:'selected',repositoryIncluded:true,
    repositoryAccessible:true,permissions:{contents:'read'},observedAt:now
  });
  if(assessment.status!=='PERMISSION_OBSERVED'){
    return blocked(repo,'REPOSITORY_READ_NOT_ATTESTED');
  }
  return {
    status:'PERMISSION_OBSERVED',repository:repo,installationId:install.installationId,
    reason:'VERIFIED_READ_ONLY',assessment,runtimeWriteAuthorized:false,
    adminPermissionAttested:false,tokenExposed:false,mutationExecuted:false
  };
}
