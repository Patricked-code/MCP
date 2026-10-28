/**
 * GD-U-02 LIVE PORTS — real read-only provider calls on demand, not simulated
 * admin capability. This never executes a write, mints tokens, issues shell
 * expressions from inputs, or considers uid 0 sufficient runtime admission.
 *
 * Existing guarded GitHub request and SSH transports are reused. The result
 * discloses only typed status/identity; never remote output or credentials.
 */
import {
  githubJsonRequestWithServerCredential,
  type GitHubJsonResponse
} from '../github/connection.js';
import { runReadOnlyCommand } from '../ssh/client.js';

type ServerId = 's1'|'s2';
type Response = Pick<GitHubJsonResponse,'ok'|'status'|'json'>;
type ReadResult = Readonly<{code:number|null;stdout:string;stderr:string}>;

export type DelegatedLiveProbeDependencies = Readonly<{
  now:()=>Date;
  githubGet:(endpoint:string)=>Promise<Response>;
  remoteRead:(server:ServerId,command:'id -u'|'plesk version')=>Promise<ReadResult>;
}>;

export type DelegatedLiveProviderResult = Readonly<{
  observedAt:string;
  liveProviderCallsExecuted:true;
  allowedCommands:readonly ['id -u','plesk version'];
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

export function defaultDelegatedLiveProbeDependencies():DelegatedLiveProbeDependencies {
  return {
    now:()=>new Date(),
    githubGet:async endpoint=>githubJsonRequestWithServerCredential(endpoint,{
      method:'GET',timeoutMs:2_500
    }),
    remoteRead:async (server,command)=>runReadOnlyCommand(server,command,2_500,2_048)
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
    deps.remoteRead('s2','plesk version')
  ]);
  const good=<T>(index:number):T|null=>{
    const result=attempts[index];
    return result?.status==='fulfilled' ? result.value as T : null;
  };
  const user=good<Response>(0);
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
