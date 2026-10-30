/**
 * GD-U E2 — reusable declarative target consistency check for GitHub→hosting.
 *
 * The existing source repository manifest is authoritative about its declared
 * target, but NOT about its permissions. An operator mandate and a manifest
 * disagreement must fail closed, not silently provision an alternate host.
 * No new runner, registry, shell command, issuer or runtime grant.
 */
export type UniversalDeploymentTarget = Readonly<{
  repository:string;
  branch:string;
  server:'s1'|'s2';
  host:string;
  urlPath:string;
  applicationBasePath:string;
}>;
export type ManifestTargetAssessment = Readonly<{
  status:'TARGET_MATCHED_NOT_ADMITTED'|'BLOCKED';
  reason:'EXACT_DECLARATIVE_TARGET_MATCH'|'TARGET_INVALID'|
    'MANIFEST_MISSING_OR_INVALID'|'SOURCE_REPOSITORY_MISMATCH'|
    'SOURCE_BRANCH_MISMATCH'|'SERVER_MISMATCH'|'HOST_MISMATCH'|
    'URL_PATH_MISMATCH'|'APPLICATION_BASEPATH_MISMATCH'|
    'DEPLOYMENT_MODE_MISMATCH'|'AUTO_PROVISIONING_NOT_DISABLED'|
    'DECLARED_SECURITY_GATES_INCOMPLETE'|
    'DESTINATION_URL_MISMATCH'|'SOURCE_MANIFEST_READ_UNAVAILABLE'|
    'SOURCE_MANIFEST_INVALID';
  runtimeWriteAuthorized:false;
  manifestMutated:false;
  operationExecuted:false;
}>;
const ACCOUNT=/^[a-z0-9](?:[a-z0-9-]{0,38})$/i;
const REPONAME=/^[A-Za-z0-9_.-]{1,100}$/;
const BRANCH=/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const HOST=/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const SUBPATH=/^\/(?:[a-z0-9][a-z0-9_-]{0,63}(?:\/[a-z0-9][a-z0-9_-]{0,63})*)?$/;
const OBJ=(v:unknown):Record<string,unknown>|null=>v!==null
  &&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
const block=(reason:ManifestTargetAssessment['reason']):ManifestTargetAssessment=>({
  status:'BLOCKED',reason,runtimeWriteAuthorized:false,
  manifestMutated:false,operationExecuted:false
});
function validTarget(t:UniversalDeploymentTarget):boolean{
  if(!t||typeof t.repository!=='string'||typeof t.branch!=='string'
    ||typeof t.host!=='string'||typeof t.urlPath!=='string'
    ||typeof t.applicationBasePath!=='string')return false;
  const p=t.repository.split('/');
  return p.length===2&&ACCOUNT.test(p[0]!)&&REPONAME.test(p[1]!)
    &&p[1]!=='.'&&p[1]!=='..'
    &&BRANCH.test(t.branch)&&!t.branch.includes('..')
    &&(t.server==='s1'||t.server==='s2')
    &&HOST.test(t.host)&&t.host===t.host.toLowerCase()
    &&SUBPATH.test(t.urlPath)&&SUBPATH.test(t.applicationBasePath);
}
export function assessDeploymentManifestTarget(
  target:UniversalDeploymentTarget,
  rawManifest:unknown
):ManifestTargetAssessment{
  if(!validTarget(target))return block('TARGET_INVALID');
  const m=OBJ(rawManifest),source=OBJ(m?.source),destination=OBJ(m?.destination);
  const app=OBJ(m?.application),safety=OBJ(m?.safety);
  if(!m||m.schemaVersion!==1||m.kind!=='mcp-governed-deployment-target'
    ||!source||!destination||!app||!safety)
    return block('MANIFEST_MISSING_OR_INVALID');
  if(source.repository!==target.repository)return block('SOURCE_REPOSITORY_MISMATCH');
  if(source.branch!==target.branch)return block('SOURCE_BRANCH_MISMATCH');
  if(destination.server!==target.server)return block('SERVER_MISMATCH');
  if(destination.host!==target.host)return block('HOST_MISMATCH');
  if(destination.urlPath!==target.urlPath)return block('URL_PATH_MISMATCH');
  if(app.basePath!==target.applicationBasePath)
    return block('APPLICATION_BASEPATH_MISMATCH');
  // A path mounted under an existing vhost must never be rewritten to a new
  // subdomain by a discovery or provisioning adapter.
  if(target.urlPath!=='/'&&(OBJ(destination.subdomain)!==null
    ||app.basePathMode==='root-on-dedicated-subdomain'))
    return block('DEPLOYMENT_MODE_MISMATCH');
  if(safety.allowAutomaticProvisioning!==false)
    return block('AUTO_PROVISIONING_NOT_DISABLED');
  const requiredSafety=['requireServerSideAllowlist','requireFreshPreflight',
    'requireGovernedClaimAndLock','requireExactCommitSha','requireHealthAndRollback',
    'forbidSecretsInRepository','forbidOtherVhostChanges'] as const;
  if(requiredSafety.some(field=>safety[field]!==true))
    return block('DECLARED_SECURITY_GATES_INCOMPLETE');
  try{
    if(typeof destination.url!=='string')return block('DESTINATION_URL_MISMATCH');
    const u=new URL(destination.url);
    if(u.protocol!=='https:'||u.host!==target.host||u.username||u.password
      ||u.search||u.hash||u.port
      ||(u.pathname!==target.urlPath
        &&u.pathname!==target.urlPath+'/'))
      return block('DESTINATION_URL_MISMATCH');
  }catch{return block('DESTINATION_URL_MISMATCH');}
  // A matched request is still just an input to the EXISTING admission gates.
  return {
    status:'TARGET_MATCHED_NOT_ADMITTED',reason:'EXACT_DECLARATIVE_TARGET_MATCH',
    runtimeWriteAuthorized:false,manifestMutated:false,operationExecuted:false
  };
}

/** Existing authenticated GitHub GET provider, supplied by the MCP server.
 * The exact commit SHA prevents branch-head TOCTOU during planning.
 * This reader is a preflight only; it cannot grant or perform a deployment.
 */
export async function assessGithubDeploymentManifestAtRevision(
 target:UniversalDeploymentTarget,
 revision:string,
 githubGet:(endpoint:string)=>Promise<{ok:boolean;status:number;json:unknown}>
):Promise<ManifestTargetAssessment>{
 if(!validTarget(target)||typeof revision!=='string'||!/^[a-f0-9]{40}$/.test(revision))
   return block('TARGET_INVALID');
 const [owner,repo]=target.repository.split('/');
 const endpoint='/repos/'+encodeURIComponent(owner!)+'/'+encodeURIComponent(repo!)
   +'/contents/deploy/mcp-target.json?ref='+revision;
 let response:{ok:boolean;status:number;json:unknown};
 try{response=await githubGet(endpoint);}
 catch{return block('SOURCE_MANIFEST_READ_UNAVAILABLE');}
 if(!response||!response.ok||response.status!==200)
   return block('SOURCE_MANIFEST_READ_UNAVAILABLE');
 const body=OBJ(response.json);
 if(!body||body.type!=='file'||body.path!=='deploy/mcp-target.json'
   ||body.encoding!=='base64'||typeof body.size!=='number'
   ||!Number.isSafeInteger(body.size)||body.size<1||body.size>16_384
   ||typeof body.content!=='string'||body.content.length>24_000)
   return block('SOURCE_MANIFEST_INVALID');
 const encoded=body.content.replace(/\s+/g,'');
 if(encoded.length===0||encoded.length%4!==0
   ||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))
   return block('SOURCE_MANIFEST_INVALID');
 try{
   const bytes=Buffer.from(encoded,'base64');
   if(bytes.byteLength!==body.size)return block('SOURCE_MANIFEST_INVALID');
   const raw=JSON.parse(bytes.toString('utf8')) as unknown;
   return assessDeploymentManifestTarget(target,raw);
 }catch{return block('SOURCE_MANIFEST_INVALID');}
}

/** Actual MCP server GitHub read transport; imports the existing protected
 * credential port on demand. Never installs or grants a new credential.
 * Kept separate from admission/executor: a matching manifest is NOT a release.
 */
export async function inspectDeploymentManifestThroughExistingGithubPort(
  target:UniversalDeploymentTarget,
  revision:string
):Promise<ManifestTargetAssessment>{
  try{
    const {githubJsonRequestWithServerCredential}=await import('../github/connection.js');
    return assessGithubDeploymentManifestAtRevision(target,revision,
      endpoint=>githubJsonRequestWithServerCredential(endpoint,{
        method:'GET',timeoutMs:2_500
      }));
  }catch{return block('SOURCE_MANIFEST_READ_UNAVAILABLE');}
}
