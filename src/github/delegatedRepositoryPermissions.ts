/**
 * GD-U-02B: real scoped GitHub repository permission observation.
 * Uses the existing authenticated GitHub API request port. Never assumes
 * OAuth scope => repository permissions, or admin flag => runtime mandate.
 */
export type GithubRepoRequestResponse = Readonly<{ok:boolean;status:number|null;json:unknown}>;
export type GithubRepoReadPort = (endpoint:string)=>Promise<GithubRepoRequestResponse>;
export type GithubRepositoryPermissionEvidence = Readonly<{
  repository:string;
  status:'VERIFIED_REPOSITORY_PERMISSIONS'|'BLOCKED';
  httpStatus:number|null;
  readObserved:boolean;
  writeObserved:boolean;
  adminObserved:boolean;
  source:'GITHUB_REPOSITORY_API';
  tokenExposed:false;
  runtimeWriteAuthorized:false;
}>;
const OWNER=/^[a-z0-9](?:[a-z0-9-]{0,38})$/i;
const REPO=/^[a-z0-9_.-]{1,100}$/i;
function validateRepository(repository:string):readonly [string,string] {
  const parts=typeof repository==='string'?repository.split('/'):[];
  if(parts.length!==2 || !OWNER.test(parts[0]!) || !REPO.test(parts[1]!)
      || parts[1]==='.' || parts[1]==='..') {
    throw new Error('GITHUB_PERMISSION_TARGET_INVALID');
  }
  return [parts[0]!,parts[1]!] as const;
}
export async function probeDelegatedGithubRepositoryPermissions(
  repository:string, request:GithubRepoReadPort
):Promise<GithubRepositoryPermissionEvidence> {
  const [owner,name]=validateRepository(repository);
  const endpoint='/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(name);
  let result:GithubRepoRequestResponse|null=null;
  try{result=await request(endpoint);}catch{ /* fail closed, no raw errors */ }
  const obj=result?.json && typeof result.json==='object' && !Array.isArray(result.json)
    ? result.json as Record<string,unknown>:null;
  const permissions=obj?.permissions && typeof obj.permissions==='object'
    && !Array.isArray(obj.permissions)?obj.permissions as Record<string,unknown>:null;
  const exactName=typeof obj?.full_name==='string'
    && obj.full_name.toLowerCase()===repository.toLowerCase();
  // Require explicit booleans from authenticated /repos response.
  const verified=result?.ok===true && result.status===200 && exactName
    && permissions !== null
    && typeof permissions.pull==='boolean'
    && typeof permissions.push==='boolean'
    && typeof permissions.admin==='boolean';
  return {
    repository,
    status:verified?'VERIFIED_REPOSITORY_PERMISSIONS':'BLOCKED',
    httpStatus:result?.status??null,
    readObserved:verified && (permissions!.pull===true||permissions!.push===true||permissions!.admin===true),
    writeObserved:verified && (permissions!.push===true||permissions!.admin===true),
    adminObserved:verified && permissions!.admin===true,
    source:'GITHUB_REPOSITORY_API',
    tokenExposed:false,
    runtimeWriteAuthorized:false
  };
}
