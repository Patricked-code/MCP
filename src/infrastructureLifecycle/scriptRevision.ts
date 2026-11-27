import { createHash } from 'node:crypto';
import { admitProvisioningRevision, type GithubRead } from '../provisioning/revisionAdmission.js';

/**
 * AILM-05: verify the exact versioned source of a script candidate using
 * the existing GitHub revision admission reader. No script is executed,
 * installed, returned to the caller, or admitted to runtime by this module.
 * Manifest provenance and runtime authority are separately mandatory.
 */
export type MaintenanceScriptCandidate = Readonly<{
  revision: string;
  sourcePath: string;
  sha256: string;
}>;
export type ScriptRevisionResult =
  | { status: 'UNVERIFIED'; reason: string; effectAuthorized: false }
  | { status: 'SOURCE_VERIFIED'; revision: string; sourcePath: string;
      sha256: string; bytes: number; effectAuthorized: false };
const MAX_BYTES = 256 * 1024;
const sha40 = /^[a-f0-9]{40}$/;
const sha256 = /^[a-f0-9]{64}$/;
const base = '/repos/Patricked-code/MCP';

export async function verifyMaintenanceScriptRevision(
  candidate: MaintenanceScriptCandidate, read: GithubRead
): Promise<ScriptRevisionResult> {
  const fail = (reason: string): ScriptRevisionResult =>
    ({status:'UNVERIFIED',reason,effectAuthorized:false});
  if (!candidate || typeof candidate.sourcePath !== 'string' ||
      candidate.sourcePath.length > 200 ||
      !candidate.sourcePath.startsWith('scripts/') ||
      !candidate.sourcePath.endsWith('.sh') ||
      !candidate.sourcePath.split('/').every(s=>/^[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}$/.test(s)) ||
      typeof candidate.revision !== 'string' || !sha40.test(candidate.revision) ||
      typeof candidate.sha256 !== 'string' || !sha256.test(candidate.sha256))
    return fail('INVALID_SCRIPT_CANDIDATE');
  try {
    // Reuse the official main revision gate; no manual-consent fallback.
    const admitted = await admitProvisioningRevision({
      repositoryId:'github:Patricked-code/MCP', revision:candidate.revision, branch:'main'
    },read);
    if (!admitted.admitted || admitted.kind !== 'CI_GATE')
      return fail('SCRIPT_REVISION_CI_NOT_ATTESTED');
    // Provisioning accepts neutral/skipped checks. Script source verification
    // additionally requires the exact, successful MCP validate check.
    const checks=await read(base+'/commits/'+candidate.revision+'/check-runs?per_page=100');
    const data=checks.json as {total_count?:unknown;check_runs?:unknown};
    if (!checks.ok || !data || !Array.isArray(data.check_runs) ||
        typeof data.total_count!=='number' || !Number.isSafeInteger(data.total_count) ||
        data.total_count!==data.check_runs.length || data.total_count>100)
      return fail('SCRIPT_REQUIRED_CHECK_UNVERIFIED');
    const validation=data.check_runs.filter(x=>x && x.name==='validate');
    if(validation.length!==1 || validation[0].head_sha!==candidate.revision ||
        validation[0].status!=='completed' || validation[0].conclusion!=='success')
      return fail('SCRIPT_REQUIRED_CHECK_UNVERIFIED');
    const path=candidate.sourcePath.split('/').map(encodeURIComponent).join('/');
    const response=await read(base+'/contents/'+path+'?ref='+candidate.revision);
    const value=response.json as {type?:unknown;path?:unknown;encoding?:unknown;
      size?:unknown;content?:unknown;sha?:unknown;target?:unknown};
    if(!response.ok || !value || value.type!=='file' || value.path!==candidate.sourcePath ||
        value.encoding!=='base64' || value.target!==undefined ||
        typeof value.size!=='number' || !Number.isSafeInteger(value.size) ||
        value.size<1 || value.size>MAX_BYTES || typeof value.content!=='string' ||
        value.content.length>Math.ceil(MAX_BYTES/3)*4+MAX_BYTES/10 ||
        typeof value.sha!=='string' || !sha40.test(value.sha))
      return fail('SCRIPT_SOURCE_UNVERIFIED');
    const encoded=value.content.replace(/[\r\n]/g,'');
    if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
      return fail('SCRIPT_SOURCE_UNVERIFIED');
    const bytes=Buffer.from(encoded,'base64');
    if(bytes.length!==value.size || bytes.toString('base64')!==encoded)
      return fail('SCRIPT_SOURCE_UNVERIFIED');
    const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    const digest=createHash('sha256').update(bytes).digest('hex');
    if(blob!==value.sha || digest!==candidate.sha256)
      return fail('SCRIPT_SOURCE_DIGEST_MISMATCH');
    return {status:'SOURCE_VERIFIED',revision:candidate.revision,sourcePath:candidate.sourcePath,
      sha256:digest,bytes:bytes.length,effectAuthorized:false};
  } catch {
    return fail('SCRIPT_SOURCE_UNAVAILABLE');
  }
}
