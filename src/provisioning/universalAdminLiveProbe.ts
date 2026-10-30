/**
 * GD-U-02 LIVE PORTS — real read-only provider calls on demand, not simulated
 * admin capability. This never executes a write, mints tokens, issues shell
 * expressions from inputs, or considers uid 0 sufficient runtime admission.
 *
 * Existing guarded GitHub request and SSH transports are reused. The result
 * discloses only typed status/identity; never remote output or credentials.
 */
import { readFile } from 'node:fs/promises';
import {
  probeDelegatedGithubRepositoryPermissions,
  type GithubRepositoryPermissionEvidence
} from '../github/delegatedRepositoryPermissions.js';
import type { GitHubJsonResponse } from '../github/connection.js';
import {
  probeAllowlistedPleskSubscriptionRead,
  type PleskSubscriptionReadObservation
} from './pleskSubscriptionReadProbe.js';

type ServerId = 's1'|'s2';
type Response = Pick<GitHubJsonResponse,'ok'|'status'|'json'>;
type ReadResult = Readonly<{code:number|null;stdout:string;stderr:string}>;

export type DelegatedLiveProbeDependencies = Readonly<{
  now:()=>Date;
  githubGet:(endpoint:string)=>Promise<Response>;
  remoteRead:(server:ServerId,command:'id -u'|'plesk version'|`plesk bin subscription --info '${string}'`)=>Promise<ReadResult>;
  canonicalRepository?:()=>Promise<string|null>;
  /** Exact Plesk parent-domain allowlist from the existing server configuration. */
  allowedParents?:()=>Promise<Readonly<Partial<Record<ServerId,readonly string[]>>>>;
}>;

export type DelegatedLiveProviderResult = Readonly<{
  observedAt:string;
  liveProviderCallsExecuted:true;
  allowedCommands:readonly ['id -u','plesk version'];
  /** Repository-scoped provider permissions when a canonical target can be resolved. */
  githubRepository:GithubRepositoryPermissionEvidence|null;
  pleskSubscriptions:Readonly<{
    status:'CHECKED'|'NOT_CONFIGURED'|'BLOCKED';
    observations:readonly PleskSubscriptionReadObservation[];
    pleskAdminWritePermissionVerified:false;
    mutationExecuted:false;
  }>;
  github:Readonly<{
    status:'AUTHENTICATED'|'BLOCKED';
    principal:string|null;
    readOnly:true;
    httpStatus:number|null;
    repositoryWritePermissionVerified:false;
  }>;
  servers:Readonly<Record<ServerId,Readonly<{
    status:'REACHABLE'|'BLOCKED';
    readOnly:true;
    userIsRootObserved:boolean;
    pleskCliAvailable:boolean;
    pleskAdminDelegationVerified:false;
    privilegedServerWriteAdmitted:false;
  }>>>;
  mutationExecuted:false;
  adminWriteAuthorized:false;
}>;
const LOGIN=/^[a-z0-9](?:[a-z0-9-]{0,38})$/i;
const TOOLS= ['id -u','plesk version'] as const;

/** Read the canonical manifest from either src/ or Docker dist/src/ layout.
 * The Docker image copies package.json to /app/package.json, not /app/dist.
 * Absence or malformed evidence must fail closed rather than infer a repo.
 */
export async function readCanonicalRepositoryFromModuleManifest(moduleUrl: string):Promise<string|null>{
  for(const relative of ['../../package.json','../../../package.json']){
    try{
      const raw=JSON.parse(await readFile(new URL(relative,moduleUrl),'utf8')) as {
        mcpValidationProfile?:{repository?:unknown}
      };
      const repo=raw.mcpValidationProfile?.repository;
      return typeof repo==='string' && /^[A-Za-z0-9-]+[/][A-Za-z0-9_.-]+$/.test(repo)
        ?repo:null;
    }catch(e){
      if(e && typeof e==='object' && 'code' in e && e.code==='ENOENT')continue;
      return null;
    }
  }
  return null;
}

export function defaultDelegatedLiveProbeDependencies():DelegatedLiveProbeDependencies {
  return {
    now:()=>new Date(),
    githubGet:async endpoint=>{
      // Import only when actually making an authenticated provider call;
      // isolated pure tests must not require production SSH env secrets.
      const {githubJsonRequestWithServerCredential}=await import('../github/connection.js');
      return githubJsonRequestWithServerCredential(endpoint,{method:'GET',timeoutMs:2_500});
    },
    remoteRead:async (server,command)=>{
      const {runReadOnlyCommand}=await import('../ssh/client.js');
      return runReadOnlyCommand(server,command,2_500,2_048);
    },
    canonicalRepository:()=>readCanonicalRepositoryFromModuleManifest(import.meta.url),
    allowedParents:async()=>{
      const [{parseAllowedPleskParents},{env}]=await Promise.all([
        import('../tools/pleskProvisioning.js'),import('../config/env.js')
      ]);
      return parseAllowedPleskParents(env.MCP_PLESK_ALLOWED_PARENTS);
    }
  };
}

/**
 * A successful call proves only the corresponding read actually executed.
 * Plesk CLI presence and uid=0 are observations, never grants for writes.
 */
export async function probeExistingAdminReadCapabilities(
  deps:DelegatedLiveProbeDependencies=defaultDelegatedLiveProbeDependencies()
):Promise<DelegatedLiveProviderResult> {
  const at=deps.now().toISOString();
  const attempts=await Promise.allSettled([
    deps.githubGet('/user'),
    deps.remoteRead('s1','id -u'),
    deps.remoteRead('s1','plesk version'),
    deps.remoteRead('s2','id -u'),
    deps.remoteRead('s2','plesk version'),
    deps.canonicalRepository ? deps.canonicalRepository():Promise.resolve(null)
  ]);
  const good=<T>(index:number):T|null=>{
    const result=attempts[index];
    return result?.status==='fulfilled' ? result.value as T : null;
  };
  const user=good<Response>(0);
  const canonicalRepository=good<string|null>(5);
  let githubRepository:GithubRepositoryPermissionEvidence|null=null;
  if(canonicalRepository){
    try{
      githubRepository=await probeDelegatedGithubRepositoryPermissions(
        canonicalRepository,deps.githubGet
      );
    }catch{ /* No guessing cross-account repository authority. */ }
  }
  let pleskSubscriptions:DelegatedLiveProviderResult['pleskSubscriptions']={
    status:'NOT_CONFIGURED',observations:[],
    pleskAdminWritePermissionVerified:false,mutationExecuted:false
  };
  if(deps.allowedParents){
    try{
      const allowed=await deps.allowedParents();
      const observations=await probeAllowlistedPleskSubscriptionRead(allowed,deps.remoteRead);
      pleskSubscriptions={
        status:observations.length?'CHECKED':'NOT_CONFIGURED',
        observations,pleskAdminWritePermissionVerified:false,mutationExecuted:false
      };
    }catch{pleskSubscriptions={status:'BLOCKED',observations:[],
      pleskAdminWritePermissionVerified:false,mutationExecuted:false};}
  }
  const obj=user?.json && typeof user.json==='object' && !Array.isArray(user.json)
    ? user.json as Record<string,unknown>:null;
  const login=typeof obj?.login==='string' && LOGIN.test(obj.login)?obj.login:null;
  const authenticated=Boolean(user?.ok && user.status===200 && login);
  const serverResult=(index:number)=>{
    const userId=good<ReadResult>(index);
    const plesk=good<ReadResult>(index+1);
    const reachable=userId!==null && userId.code===0;
    return {
      status:(reachable?'REACHABLE':'BLOCKED') as 'REACHABLE'|'BLOCKED',
      readOnly:true as const,
      userIsRootObserved:reachable && userId?.stdout.trim()==='0',
      pleskCliAvailable:plesk?.code===0,
      pleskAdminDelegationVerified:false as const,
      privilegedServerWriteAdmitted:false as const
    };
  };
  return {
    observedAt:at,
    liveProviderCallsExecuted:true,
    allowedCommands:TOOLS,
    githubRepository,
    pleskSubscriptions,
    github:{
      status:authenticated?'AUTHENTICATED':'BLOCKED',
      principal:authenticated?login:null,
      readOnly:true,
      httpStatus:user?.status??null,
      repositoryWritePermissionVerified:false
    },
    servers:{s1:serverResult(1),s2:serverResult(3)},
    mutationExecuted:false,
    adminWriteAuthorized:false
  };
}
