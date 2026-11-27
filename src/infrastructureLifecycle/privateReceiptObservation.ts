import { createHash } from 'node:crypto';
import type { ReadOnlyTransport } from './capacityProbe.js';
import { parseDockerReceipt, verifyDockerReceiptPair, projectRetentionStage, type DockerReceiptScope } from './backupReceipt.js';
import type { Stage } from './maintenancePlan.js';

const sha=/^[a-f0-9]{64}$/;
const prefixPattern=/^\/var\/lib\/[a-z][a-z0-9-]{2,79}-$/;
type Settings=Readonly<{stagePrefix:string;planDigest:string}>;
type FileRecord={size:number;sha256:string;content?:string};
type Projection=Readonly<{
  status:'OBSERVED';observedAtMs:number;stage:Stage;
  receiptStructure:'NONE'|'OFFSITE_STRUCTURE_VERIFIED'|'PAIR_STRUCTURE_VERIFIED'|'UNVERIFIED';
  independentlyVerified:false;completionCertified:false;effectAuthorized:false;writesPerformed:false;
}>;
export type PrivateReceiptObservation=Projection|Readonly<{
  status:'UNVERIFIED';reason:string;effectAuthorized:false;writesPerformed:false;
}>;
const fail=(reason:string):PrivateReceiptObservation=>({status:'UNVERIFIED',reason,effectAuthorized:false,writesPerformed:false});
const files=['plan.json','remote-verified.txt','verified.txt','archive.tar.gz.gpg','retention-started','retention-result.txt'] as const;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const validSettings=(s:Settings)=>prefixPattern.test(s.stagePrefix)&&sha.test(s.planDigest);
const quote=(s:string)=>"'"+s.replace(/'/g,"'\\''")+"'";
/** Fixed read-only remote program. No caller path, shell or receipt is accepted.
 * Check root-owned directory and regular files using no-follow descriptors;
 * do not read archive data, logs, manifests or secrets. Only bounded receipt
 * bytes leave S2 for internal parsing; never return those bytes to callers.
 */
const PY=String.raw`import os,sys,stat,json,hashlib,base64,re
root="/var/lib"
prefix=sys.argv[1].rsplit("/",1)[1]
flags=os.O_RDONLY|os.O_NOFOLLOW
parent=os.open(root,flags|os.O_DIRECTORY)
try:
    if os.fstat(parent).st_uid != 0: raise ValueError()
    def scan():
        found=[]
        with os.scandir(parent) as entries:
            for i,entry in enumerate(entries):
                if i>=10000: raise ValueError()
                if entry.name.startswith(prefix):
                    if not re.fullmatch(re.escape(prefix)+r"[A-Za-z0-9]{8}",entry.name): raise ValueError()
                    found.append(entry.name)
                    if len(found)>1: raise ValueError()
        return found
    names=scan()
    if not names:
        if scan()!=names: raise ValueError()
        print(json.dumps({"count":0,"files":{}},separators=(",",":")))
    else:
        d=os.open(names[0],flags|os.O_DIRECTORY,dir_fd=parent)
        try:
            def stamp(s): return (s.st_dev,s.st_ino,s.st_mode,s.st_uid,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
            ds=os.fstat(d)
            if ds.st_uid!=0 or stat.S_IMODE(ds.st_mode)!=0o700: raise ValueError()
            records={}
            snapshots={}
            keys=("plan.json","remote-verified.txt","verified.txt","archive.tar.gz.gpg","retention-started","retention-result.txt")
            for key in keys:
                try: st=os.stat(key,dir_fd=d,follow_symlinks=False)
                except FileNotFoundError:
                    snapshots[key]=None
                    continue
                if not stat.S_ISREG(st.st_mode) or st.st_uid!=0 or stat.S_IMODE(st.st_mode)!=0o600 or st.st_nlink!=1: raise ValueError()
                snapshots[key]=stamp(st)
                if key=="archive.tar.gz.gpg":
                    records[key]={"size":st.st_size,"sha256":""}
                    continue
                if key in ("retention-started","retention-result.txt"):
                    records[key]={"size":st.st_size,"sha256":""}
                    continue
                limit=262144 if key=="plan.json" else 16384
                if st.st_size<1 or st.st_size>limit: raise ValueError()
                f=os.open(key,flags|os.O_NONBLOCK,dir_fd=d)
                try:
                    if stamp(os.fstat(f))!=snapshots[key]: raise ValueError()
                    chunks=[]
                    remaining=limit+1
                    while remaining:
                        chunk=os.read(f,min(65536,remaining))
                        if not chunk: break
                        chunks.append(chunk)
                        remaining-=len(chunk)
                    raw=b"".join(chunks)
                    if len(raw)!=st.st_size or stamp(os.fstat(f))!=snapshots[key]: raise ValueError()
                    record={"size":len(raw),"sha256":hashlib.sha256(raw).hexdigest()}
                    if key!="plan.json": record["content"]=base64.b64encode(raw).decode("ascii")
                    records[key]=record
                finally: os.close(f)
            for key in keys:
                try: current=stamp(os.stat(key,dir_fd=d,follow_symlinks=False))
                except FileNotFoundError: current=None
                if snapshots[key]!=current: raise ValueError()
            if stamp(os.fstat(d))!=stamp(ds) or scan()!=names or stamp(os.stat(names[0],dir_fd=parent,follow_symlinks=False))!=stamp(ds): raise ValueError()
            print(json.dumps({"count":1,"files":records},separators=(",",":")))
        finally: os.close(d)
finally: os.close(parent)`;

/** The digests are observations from the same private source, NOT independent
 * attestations. No remote archive readback or restored-reference certification
 * follows from this projection, even if the historical receipts match. */
export function projectPrivateReceiptOutput(stdout:string,settings:Settings,observedAtMs:number):PrivateReceiptObservation{
  if(!validSettings(settings)||!Number.isSafeInteger(observedAtMs)||observedAtMs<0||
    typeof stdout!=='string'||Buffer.byteLength(stdout)>60_000||stdout.includes('sortie plafonnée'))
    return fail('PRIVATE_EVIDENCE_UNVERIFIED');
  try{
    const x=JSON.parse(stdout) as {count:unknown;files:Record<string,FileRecord>};
    if(!x||!x.files||typeof x.files!=='object'||Array.isArray(x.files)||
      Object.keys(x).sort().join(',')!=='count,files'||(x.count!==0&&x.count!==1))
      return fail('PRIVATE_EVIDENCE_UNVERIFIED');
    for(const [key,f] of Object.entries(x.files)){
      if(!(files as readonly string[]).includes(key)||!f||!Number.isSafeInteger(f.size)||f.size<0||
        typeof f.sha256!=='string'||(f.content!==undefined&&typeof f.content!=='string'))
        return fail('PRIVATE_EVIDENCE_UNVERIFIED');
    }
    const observed=(stage:Stage,receiptStructure:Projection['receiptStructure']):Projection=>({
      status:'OBSERVED',observedAtMs,stage,receiptStructure,independentlyVerified:false,completionCertified:false,effectAuthorized:false,writesPerformed:false
    });
    if(x.count===0)return Object.keys(x.files).length===0?observed('EMPTY','NONE'):fail('PRIVATE_EVIDENCE_UNVERIFIED');
    const f=x.files;
    // A prior retention marker/result always prevents a new effect; completion
    // must be reconciled independently, even if the local result looks valid.
    if(f['retention-started'])return observed('RETENTION_STARTED','UNVERIFIED');
    if(f['retention-result.txt'])return observed('PARTIAL','UNVERIFIED');
    const plan=f['plan.json'],archive=f['archive.tar.gz.gpg'];
    if(!plan||plan.sha256!==settings.planDigest||!archive||archive.size<1)
      return observed('PARTIAL','UNVERIFIED');
    const scope:DockerReceiptScope={mission:'PLESK-FREEBOX-BACKUP-20261120-01',checkpoint:'PRC-20261126-17A-docker',planDigest:settings.planDigest,imageCount:79,tagCount:160};
    const decode=(record:FileRecord|undefined,kind:'OFFSITE'|'RESTORE')=>{
      if(!record||!record.content||!sha.test(record.sha256)||record.size<1||record.size>16384||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(record.content))return null;
      const bytes=Buffer.from(record.content,'base64');
      if(bytes.length!==record.size||bytes.toString('base64')!==record.content)return null;
      const receipt=bytes.toString('utf8');
      if(!Buffer.from(receipt).equals(bytes)||hash(receipt)!==record.sha256)return null;
      return {receipt,expectedReceiptDigest:record.sha256,observedPlanDigest:plan.sha256,scope,kind};
    };
    const offsite=decode(f['remote-verified.txt'],'OFFSITE');
    if(!offsite)return observed('PARTIAL','UNVERIFIED');
    const checked=parseDockerReceipt(offsite);
    if(checked.status!=='STRUCTURE_VERIFIED'||checked.encryptedArchiveBytes!==archive.size)
      return observed('PARTIAL','UNVERIFIED');
    const restore=decode(f['verified.txt'],'RESTORE');
    if(!f['verified.txt'])return observed(projectRetentionStage({startMarkerPresent:false,verifiedCompletionReceipt:false,
      restoreReceiptPresent:false,offsiteReceiptPresent:true,partialTransitPresent:true}),'OFFSITE_STRUCTURE_VERIFIED');
    if(!restore||verifyDockerReceiptPair(offsite,restore).status!=='PAIR_STRUCTURE_VERIFIED')
      return observed('PARTIAL','UNVERIFIED');
    return observed(projectRetentionStage({startMarkerPresent:false,verifiedCompletionReceipt:false,
      restoreReceiptPresent:true,offsiteReceiptPresent:true,partialTransitPresent:true}),'PAIR_STRUCTURE_VERIFIED');
  }catch{return fail('PRIVATE_EVIDENCE_UNVERIFIED');}
}
export async function collectPrivateReceiptObservation(read:ReadOnlyTransport,settings:Settings,now:()=>number=Date.now):Promise<PrivateReceiptObservation>{
  if(!validSettings(settings))return fail('PRIVATE_EVIDENCE_CONFIGURATION_REQUIRED');
  try{
    const started=now();
    if(!Number.isSafeInteger(started)||started<0)return fail('PRIVATE_EVIDENCE_CLOCK_INVALID');
    const result=await read('s2','python3 -I -c '+quote(PY)+' '+quote(settings.stagePrefix),15_000,60_000);
    const ended=now();
    if(result.code!==0||result.stderr.trim()!==''||!Number.isSafeInteger(ended)||ended<started||ended-started>15_000)
      return fail('PRIVATE_EVIDENCE_PROBE_UNAVAILABLE');
    return projectPrivateReceiptOutput(result.stdout,settings,started);
  }catch{return fail('PRIVATE_EVIDENCE_PROBE_UNAVAILABLE');}
}
export async function observePrivateReceipts():Promise<PrivateReceiptObservation>{
  // Server-owned private configuration only. No path, plan or raw receipt in
  // public Git, MCP input schema, cockpit or logs from this module.
  const settings={stagePrefix:process.env.MCP_AILM_PRC17_STAGE_PREFIX??'',planDigest:process.env.MCP_AILM_PRC17_PLAN_SHA256??''};
  try{const {runReadOnlyCommand}=await import('../ssh/client.js');return await collectPrivateReceiptObservation(runReadOnlyCommand,settings);}
  catch{return fail('PRIVATE_EVIDENCE_PROBE_UNAVAILABLE');}
}
