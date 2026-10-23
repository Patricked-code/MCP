import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { chmod, lstat, mkdir, readFile, readdir, rename, rmdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

/**
 * Isolated, private, pinned GRT archive pilot. No GRT script is executed
 * and no repository file is exposed through HTTP. It is not a governance agent.
 */
export const GOUVERN_SOURCE = 'chainsolutions-wealthtech/Governed-Repository-Template';
export const GOUVERN_SHA = 'eb74f16b6c8bbe63658666095f6c97fb32aaa303';
export const GOUVERN_RUNTIME_ROOT = '/app/data/gouvern';
const MAX_ARCHIVE_BYTES = 50_000_000;
const MARKER = '.govern-pilot-v1.json';
const DIGEST = /^[0-9a-f]{64}$/;

export type PilotDownload = (input: {
  repositoryId: string; revision: string; destination: string; maxBytes: number
}) => Promise<{ok:true;sha256:string;bytes:number}|{ok:false;reasonCode:string}>;
export type PilotStage = { status:'STAGED'|'NO_OP'|'BLOCKED'|'FAILED'; reason:string; revision?:string };
type Snapshot = { revision:string; sha256:string; bytes:number };

function archiveName():string { return 'source-'+GOUVERN_SHA+'.tar.gz'; }
function trustedDirectory(info:Awaited<ReturnType<typeof lstat>>):boolean {
  return info.isDirectory() && !info.isSymbolicLink()
    && info.uid === process.getuid?.()
    && (info.mode & 0o077) === 0;
}
async function digestFile(path:string, maxBytes:number):Promise<{sha256:string;bytes:number}> {
  const hash=createHash('sha256');
  let bytes=0;
  for await(const chunk of createReadStream(path,{flags:'r'})) {
    bytes+=(chunk as Buffer).byteLength;
    if(bytes>maxBytes) throw new Error('PILOT_ARCHIVE_OVERSIZE');
    hash.update(chunk as Buffer);
  }
  return {sha256:hash.digest('hex'),bytes};
}

/** A manifest is trusted only when the private archive bytes still match. */
export async function readGovernPilot(root:string):Promise<Snapshot|null> {
  try {
    if(basename(root)!=='gouvern') return null;
    const directory=await lstat(root);
    if(!trustedDirectory(directory)) return null;
    const marker=await lstat(join(root,MARKER));
    const archive=await lstat(join(root,archiveName()));
    if(marker.isSymbolicLink() || !marker.isFile() || (marker.mode&0o077)!==0
      || archive.isSymbolicLink() || !archive.isFile() || (archive.mode&0o077)!==0) return null;
    const parsed:unknown=JSON.parse(await readFile(join(root,MARKER),'utf8'));
    if(!parsed || typeof parsed!=='object') return null;
    const value=parsed as Record<string,unknown>;
    if(value.revision!==GOUVERN_SHA || value.repository!==GOUVERN_SOURCE
      || typeof value.sha256!=='string' || !DIGEST.test(value.sha256)
      || typeof value.bytes!=='number' || !Number.isSafeInteger(value.bytes)
      || value.bytes<1 || value.bytes>MAX_ARCHIVE_BYTES || archive.size!==value.bytes) return null;
    const current=await digestFile(join(root,archiveName()),MAX_ARCHIVE_BYTES);
    if(current.sha256!==value.sha256 || current.bytes!==value.bytes) return null;
    return {revision:GOUVERN_SHA,sha256:value.sha256,bytes:value.bytes};
  } catch { return null; }
}

/**
 * mkdir of sibling lock is atomic on the local S1 filesystem. A stale lock
 * fails closed for operator investigation; never unlink another attempt's
 * archive or a directory not created by this invocation.
 */
export async function stageGovernPilot(
  input:{root:string;approved:boolean;revision:string},download:PilotDownload
):Promise<PilotStage> {
  if(input.approved!==true || input.revision!==GOUVERN_SHA || basename(input.root)!=='gouvern') {
    return {status:'BLOCKED',reason:'PILOT_TARGET_OR_CONSENT_INVALID'};
  }
  if(await readGovernPilot(input.root)) {
    return {status:'NO_OP',reason:'PINNED_SNAPSHOT_ALREADY_PRESENT',revision:GOUVERN_SHA};
  }
  const lock=input.root+'.stage-lock';
  try { await mkdir(lock,{mode:0o700}); }
  catch { return {status:'BLOCKED',reason:'PILOT_STAGING_IN_PROGRESS_OR_UNTRUSTED_LOCK'}; }

  let createdRoot=false;
  let ownedArchive=false;
  let ownedMarker=false;
  const destination=join(input.root,archiveName());
  const marker=join(input.root,MARKER);
  try {
    // Fail closed on any existing unverified pilot directory, even if empty.
    try { await mkdir(input.root,{recursive:false,mode:0o700});createdRoot=true; }
    catch (error) {
      if((error as NodeJS.ErrnoException).code==='EEXIST') {
        return {status:'BLOCKED',reason:'PILOT_UNOWNED_EXISTING_DATA'};
      }
      return {status:'FAILED',reason:'PILOT_DIRECTORY_UNAVAILABLE'};
    }
    const dir=await lstat(input.root);
    if(!trustedDirectory(dir) || (await readdir(input.root)).length!==0) {
      return {status:'BLOCKED',reason:'PILOT_UNSAFE_DIRECTORY'};
    }
    // The stage owns the newly-created 0700 directory, hence any archive it
    // creates inside remains private even while the downloader uses mode 0644.
    const transfer=await download({
      repositoryId:'github:'+GOUVERN_SOURCE,
      revision:GOUVERN_SHA,
      destination,
      maxBytes:MAX_ARCHIVE_BYTES
    });
    ownedArchive=true;
    if(!transfer.ok || !DIGEST.test(transfer.sha256)
      || !Number.isSafeInteger(transfer.bytes)
      || transfer.bytes<1 || transfer.bytes>MAX_ARCHIVE_BYTES) {
      return {status:'FAILED',reason:transfer.ok?'PILOT_ARCHIVE_INVALID':transfer.reasonCode};
    }
    const archive=await lstat(destination);
    if(!archive.isFile() || archive.isSymbolicLink() || archive.size!==transfer.bytes) {
      return {status:'FAILED',reason:'PILOT_ARCHIVE_SIZE_MISMATCH'};
    }
    await chmod(destination,0o600);
    const observed=await digestFile(destination,MAX_ARCHIVE_BYTES);
    if(observed.sha256!==transfer.sha256 || observed.bytes!==transfer.bytes) {
      return {status:'FAILED',reason:'PILOT_ARCHIVE_DIGEST_MISMATCH'};
    }
    const markerTmp=marker+'.new';
    try {
      await writeFile(markerTmp,JSON.stringify({
        schemaVersion:1,repository:GOUVERN_SOURCE,revision:GOUVERN_SHA,
        sha256:observed.sha256,bytes:observed.bytes
      })+'\n',{flag:'wx',mode:0o600});
      await rename(markerTmp,marker);
      ownedMarker=true;
    } finally {
      await unlink(markerTmp).catch(()=>undefined);
    }
    if(!await readGovernPilot(input.root)) {
      return {status:'FAILED',reason:'PILOT_FINAL_ATTESTATION_FAILED'};
    }
    return {status:'STAGED',reason:'PRIVATE_GITHUB_SNAPSHOT_READY',revision:GOUVERN_SHA};
  } catch {
    return {status:'FAILED',reason:'PILOT_STORAGE_UNAVAILABLE'};
  } finally {
    // An archive is only removed in this branch if this attempt created
    // its new 0700 root. No shared directory or other attempt is touched.
    if(createdRoot && !ownedMarker) {
      if(ownedArchive) await unlink(destination).catch(()=>undefined);
      await rmdir(input.root).catch(()=>undefined);
    }
    await rmdir(lock).catch(()=>undefined);
  }
}
