/**
 * Bounded, read-only capacity collector for the existing MCP SSH adapter.
 * No client-supplied path, command, argument or execution permission.
 * Filesystem aliases must not be added as independent physical storage.
 */
export type Host = 's1' | 's2';
export type CapacityTarget = 'ROOT' | 'RELAY_STORAGE' | 'DOCKER_STORAGE';
export type CapacityKind = 'BYTES' | 'INODES';
export type CapacityMeasurement = Readonly<{
  filesystem: string; mount: string; total: number; used: number;
  available: number; usedPercent: number;
}>;
export type CapacityObservation =
  | { status: 'OBSERVED'; host: Host; target: CapacityTarget; kind: CapacityKind;
      observedAtMs: number; measurement: CapacityMeasurement; writesPerformed: false }
  | { status: 'UNVERIFIED'; host: Host; target: CapacityTarget; kind: CapacityKind;
      reason: string; writesPerformed: false };
type ReadResult = { stdout: string; stderr: string; code: number | null };
export type ReadOnlyTransport = (
  host: Host, command: string, timeoutMs: number, maxOutputBytes: number
) => Promise<ReadResult>;

const COMMANDS: Readonly<Record<CapacityTarget, Readonly<Record<CapacityKind,string>>>> =
  Object.freeze({
    ROOT:Object.freeze({BYTES:'LC_ALL=C df -P -B1 /',INODES:'LC_ALL=C df -P -i /'}),
    RELAY_STORAGE:Object.freeze({BYTES:'LC_ALL=C df -P -B1 /var/lib',INODES:'LC_ALL=C df -P -i /var/lib'}),
    DOCKER_STORAGE:Object.freeze({BYTES:'LC_ALL=C df -P -B1 /var/lib/docker',INODES:'LC_ALL=C df -P -i /var/lib/docker'})
  });
const safeNumber = (v: string) => /^[0-9]+$/.test(v) && Number.isSafeInteger(Number(v));

/** Strict single-target POSIX/GNU df parser, not a filesystem traversal. */
export function parseCapacityOutput(stdout: string, kind: CapacityKind): CapacityMeasurement | null {
  if (typeof stdout !== 'string' || stdout.length > 10_000 ||
      stdout.includes('sortie plafonnée') || stdout.includes('\0')) return null;
  const lines=stdout.trim().split(/\r?\n/);
  if (lines.length !== 2) return null;
  const header = lines[0]?.trim() ?? '';
  const row = lines[1]?.trim() ?? '';
  if (kind === 'BYTES') {
    if (!/^Filesystem\s+1-blocks\s+Used\s+Available\s+Capacity\s+Mounted on$/.test(header)) return null;
  } else if (kind === 'INODES') {
    if (!/^Filesystem\s+Inodes\s+IUsed\s+IFree\s+IUse%\s+Mounted on$/.test(header) &&
        !/^Filesystem\s+Inodes\s+IUsed\s+IFree\s+ICapacity\s+Mounted on$/.test(header)) return null;
  } else return null;
  const parts=row.split(/\s+/);
  if(parts.length!==6) return null;
  const [filesystem,total,used,available,percent,mount]=parts;
  if(!filesystem || !mount || !mount.startsWith('/') || !total || !used ||
      !available || !percent || !safeNumber(total) || !safeNumber(used) ||
      !safeNumber(available) || !/^[0-9]{1,3}%$/.test(percent)) return null;
  const n=Number(total),u=Number(used),a=Number(available),p=Number(percent.slice(0,-1));
  if(n<=0 || u>n || a>n || a>n-u || p>100) return null;
  // GNU df uses used/(used+available), rounded up, not used/total.
  const denominator=u+a;
  if(denominator===0 || Math.ceil(100*(u/denominator))!==p) return null;
  return {filesystem,mount,total:n,used:u,available:a,usedPercent:p};
}

/** Uses only a fixed observation command through the existing read-only bridge. */
export async function collectCapacity(
  transport: ReadOnlyTransport, host: Host, target: CapacityTarget,
  kind: CapacityKind, now: () => number = Date.now
): Promise<CapacityObservation> {
  const unknown=(reason:string):CapacityObservation=>
    ({status:'UNVERIFIED',host,target,kind,reason,writesPerformed:false});
  if ((host!=='s1' && host!=='s2') ||
      !Object.prototype.hasOwnProperty.call(COMMANDS,target) ||
      (kind!=='BYTES' && kind!=='INODES')) return unknown('INVALID_TARGET');
  try {
    const started=now();
    if(!Number.isSafeInteger(started)||started<0) return unknown('INVALID_CLOCK');
    const result=await transport(host,COMMANDS[target][kind],15_000,10_000);
    const ended=now();
    if (!Number.isSafeInteger(ended)||ended<started||ended-started>15_000)
      return unknown('OBSERVATION_TIME_INVALID');
    if(result.code!==0||result.stderr.trim()!=='') return unknown('PROBE_FAILED');
    const measurement=parseCapacityOutput(result.stdout,kind);
    if(!measurement) return unknown('OUTPUT_UNVERIFIED');
    return {status:'OBSERVED',host,target,kind,observedAtMs:started,measurement,writesPerformed:false};
  } catch {
    return unknown('TRANSPORT_UNAVAILABLE');
  }
}

/** Real adapter: reused MCP SSH transport, not a new command execution surface. */
export async function observeMcpCapacity(host: Host, target: CapacityTarget, kind: CapacityKind) {
  const {runReadOnlyCommand}=await import('../ssh/client.js');
  return collectCapacity(runReadOnlyCommand,host,target,kind);
}

/** Same mount/device is evidence of aliases; differing labels alone do not prove independent storage. */
export function sameObservedFilesystem(a: CapacityObservation,b: CapacityObservation): boolean {
  return a.status==='OBSERVED' && b.status==='OBSERVED' && a.host===b.host &&
    a.kind===b.kind && a.measurement.filesystem===b.measurement.filesystem &&
    a.measurement.mount===b.measurement.mount;
}
