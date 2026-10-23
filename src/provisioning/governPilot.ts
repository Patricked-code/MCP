import { chmod, lstat, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

/**
 * Read-only, pinned GRT snapshot pilot. Not a second governance service.
 * The archive is stored privately in /app/data/gouvern, never extracted or
 * exposed as static files, and no script from the repository is executed.
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

function archiveName(): string { return 'source-' + GOUVERN_SHA + '.tar.gz'; }

export async function readGovernPilot(root:string):Promise<Snapshot|null> {
  try {
    if (basename(root) !== 'gouvern') return null;
    const directory = await lstat(root);
    if (!directory.isDirectory() || directory.isSymbolicLink()) return null;
    const marker = await lstat(join(root, MARKER));
    const archive = await lstat(join(root, archiveName()));
    if (marker.isSymbolicLink() || archive.isSymbolicLink() || !archive.isFile()) return null;
    const parsed:unknown = JSON.parse(await readFile(join(root, MARKER), 'utf8'));
    if (!parsed || typeof parsed !== 'object') return null;
    const v = parsed as Record<string,unknown>;
    if (v.revision !== GOUVERN_SHA || typeof v.sha256 !== 'string' || !DIGEST.test(v.sha256)
      || typeof v.bytes !== 'number' || !Number.isSafeInteger(v.bytes)
      || v.bytes < 1 || v.bytes > MAX_ARCHIVE_BYTES || archive.size !== v.bytes) return null;
    return {revision:GOUVERN_SHA,sha256:v.sha256,bytes:v.bytes};
  } catch { return null; }
}

export async function stageGovernPilot(
  input:{ root:string; approved:boolean; revision:string }, download:PilotDownload
):Promise<PilotStage> {
  if (input.approved !== true || input.revision !== GOUVERN_SHA || basename(input.root) !== 'gouvern') {
    return {status:'BLOCKED',reason:'PILOT_TARGET_OR_CONSENT_INVALID'};
  }

  // Existing snapshots are strictly immutable; no rewrite or implicit upgrade.
  const existing = await readGovernPilot(input.root);
  if (existing) return {status:'NO_OP',reason:'PINNED_SNAPSHOT_ALREADY_PRESENT',revision:GOUVERN_SHA};
  try {
    await mkdir(input.root, {recursive:false,mode:0o700});
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') {
      return {status:'FAILED',reason:'PILOT_DIRECTORY_UNAVAILABLE'};
    }
  }
  try {
    const dir = await lstat(input.root);
    if (!dir.isDirectory() || dir.isSymbolicLink()) return {status:'BLOCKED',reason:'PILOT_UNSAFE_DIRECTORY'};
    const contents = await readdir(input.root);
    if (contents.length !== 0) return {status:'BLOCKED',reason:'PILOT_UNOWNED_EXISTING_DATA'};

    const destination = join(input.root, archiveName());
    const result = await download({
      repositoryId:'github:'+GOUVERN_SOURCE,
      revision:GOUVERN_SHA,
      destination,
      maxBytes:MAX_ARCHIVE_BYTES
    });
    if (!result.ok || !DIGEST.test(result.sha256) || !Number.isSafeInteger(result.bytes)
      || result.bytes < 1 || result.bytes > MAX_ARCHIVE_BYTES) {
      await unlink(destination).catch(()=>undefined);
      return {status:'FAILED',reason:result.ok?'PILOT_ARCHIVE_INVALID':result.reasonCode};
    }
    const info=await lstat(destination);
    if (!info.isFile() || info.isSymbolicLink() || info.size !== result.bytes) {
      await unlink(destination).catch(()=>undefined);
      return {status:'FAILED',reason:'PILOT_ARCHIVE_SIZE_MISMATCH'};
    }
    await chmod(destination,0o600);
    const markerTmp=join(input.root,MARKER+'.new');
    try {
      await writeFile(markerTmp, JSON.stringify({
        schemaVersion:1,repository:GOUVERN_SOURCE,revision:GOUVERN_SHA,
        sha256:result.sha256,bytes:result.bytes
      })+'\n',{flag:'wx',mode:0o600});
      await rename(markerTmp,join(input.root,MARKER));
    } catch {
      await unlink(markerTmp).catch(()=>undefined);
      await unlink(destination).catch(()=>undefined);
      return {status:'FAILED',reason:'PILOT_MARKER_UNAVAILABLE'};
    }
    return {status:'STAGED',reason:'PRIVATE_GITHUB_SNAPSHOT_READY',revision:GOUVERN_SHA};
  } catch {
    return {status:'FAILED',reason:'PILOT_STORAGE_UNAVAILABLE'};
  }
}
