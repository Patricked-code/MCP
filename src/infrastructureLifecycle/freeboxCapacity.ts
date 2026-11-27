import type { ReadOnlyTransport } from './capacityProbe.js';
export type FreeboxCapacityObservation=
  | {status:'UNVERIFIED';reason:string;writesPerformed:false}
  | {status:'OBSERVED';observedAtMs:number;totalBytes:number;usedBytes:number;availableBytes:number;
     destinationIdentity:'CONFIGURED_PARTITION';writesPerformed:false};
const fail=(reason:string):FreeboxCapacityObservation=>({status:'UNVERIFIED',reason,writesPerformed:false});
const configPath=/^\/etc\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+){0,4}\/[a-zA-Z0-9_-]+\.json$/;
const quote=(s:string)=>"'"+s.replace(/'/g,"'\\''")+"'";
/** Fixed FreeboxOS storage reader via the existing S2 WireGuard route.
 * Only ephemeral API authentication is performed; no storage mutation.
 * Private configuration and token are read on S2, not passed to SSH or UI.
 * API v4 contract: https://dev.freebox.fr/sdk/os/login/ and /sdk/os/storage/.
 * Version, device UID and exact mounted partition are independently bound
 * by private operator configuration; no auto-enrolment or TLS fallback.
 */
const PY=String.raw`import os,sys,stat,json,ssl,http.client,socket,ipaddress,subprocess,re,hmac,hashlib,base64
def config(path):
    flags=os.O_RDONLY|os.O_NOFOLLOW
    fd=os.open("/",flags|os.O_DIRECTORY)
    try:
        parts=path.split("/")[1:]
        for part in parts[:-1]:
            new=os.open(part,flags|os.O_DIRECTORY,dir_fd=fd)
            os.close(fd)
            fd=new
            s=os.fstat(fd)
            if s.st_uid!=0 or s.st_mode&0o022: raise ValueError()
        f=os.open(parts[-1],flags|os.O_NONBLOCK,dir_fd=fd)
        try:
            s=os.fstat(f)
            if not stat.S_ISREG(s.st_mode) or s.st_uid!=0 or stat.S_IMODE(s.st_mode)!=0o600 or s.st_nlink!=1 or not 1<=s.st_size<=65536: raise ValueError()
            with os.fdopen(os.dup(f),"rb") as stream: raw=stream.read(65537)
            e=os.fstat(f)
            if len(raw)!=s.st_size or (s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns)!=(e.st_ino,e.st_size,e.st_mtime_ns,e.st_ctime_ns): raise ValueError()
            return json.loads(raw)
        finally: os.close(f)
    finally: os.close(fd)
def run():
    c=config(sys.argv[1])
    if set(c)!={"host","ip","port","uid","api_major","app_id","app_token","ca_pem","partition_id","disk_id","mount_path"}: raise ValueError()
    host=c["host"]; ip=ipaddress.IPv4Address(c["ip"]); port=c["port"]
    if not isinstance(host,str) or not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9.-]{1,253}",host) or not (ip in ipaddress.IPv4Network("10.0.0.0/8") or ip in ipaddress.IPv4Network("172.16.0.0/12") or ip in ipaddress.IPv4Network("192.168.0.0/16")): raise ValueError()
    if type(port)!=int or not 1<=port<=65535 or type(c["api_major"])!=int or not 4<=c["api_major"]<=99: raise ValueError()
    if not isinstance(c["uid"],str) or not re.fullmatch(r"[a-fA-F0-9]{32}",c["uid"]): raise ValueError()
    if not isinstance(c["app_id"],str) or not re.fullmatch(r"[a-zA-Z0-9._-]{1,128}",c["app_id"]): raise ValueError()
    if not isinstance(c["app_token"],str) or not 16<=len(c["app_token"])<=1024 or not isinstance(c["ca_pem"],str) or not 1<=len(c["ca_pem"])<=50000: raise ValueError()
    if any(type(c[k])!=int or not 0<=c[k]<=2147483647 for k in ("partition_id","disk_id")): raise ValueError()
    path=c["mount_path"]
    if not isinstance(path,str) or not path.startswith("/") or len(path)>512 or any(x in ("",".","..") for x in path[1:].split("/")): raise ValueError()
    route=subprocess.run(["ip","-4","route","get",str(ip)],capture_output=True,timeout=3,check=True)
    if not re.search(rb"\bdev wg-freebox\b",route.stdout) or route.stderr: raise ValueError()
    ctx=ssl.create_default_context(cadata=c["ca_pem"])
    ctx.minimum_version=ssl.TLSVersion.TLSv1_2
    class BoundHTTPS(http.client.HTTPSConnection):
        def connect(self):
            raw=socket.create_connection((str(ip),port),timeout=self.timeout)
            try: self.sock=ctx.wrap_socket(raw,server_hostname=host)
            except BaseException:
                raw.close()
                raise
    def request(method,url,body=None,token=None):
        headers={"Accept":"application/json","Connection":"close"}
        data=None
        if body is not None:
            data=json.dumps(body).encode("utf-8")
            headers["Content-Type"]="application/json"
        if token is not None: headers["X-Fbx-App-Auth"]=token
        conn=BoundHTTPS(host,port,timeout=4,context=ctx)
        try:
            conn.request(method,url,body=data,headers=headers)
            res=conn.getresponse()
            if res.status!=200: raise ValueError()
            raw=res.read(65537)
            if len(raw)>65536: raise ValueError()
            return json.loads(raw)
        finally: conn.close()
    def result(response):
        if not isinstance(response,dict) or response.get("success") is not True: raise ValueError()
        return response.get("result")
    version=request("GET","/api_version")
    if version.get("uid")!=c["uid"] or version.get("api_base_url")!="/api/" or version.get("https_available") is not True or not re.fullmatch(str(c["api_major"])+r"\.[0-9]+",str(version.get("api_version"))): raise ValueError()
    base="/api/v"+str(c["api_major"])+"/"
    challenge=result(request("GET",base+"login/")).get("challenge")
    if not isinstance(challenge,str) or not 1<=len(challenge)<=512: raise ValueError()
    password=hmac.new(c["app_token"].encode("utf-8"),challenge.encode("utf-8"),hashlib.sha1).hexdigest()
    session=result(request("POST",base+"login/session/",{"app_id":c["app_id"],"password":password}))
    token=session.get("session_token")
    if not isinstance(token,str) or not re.fullmatch(r"[A-Za-z0-9+/=_-]{1,1024}",token): raise ValueError()
    try:
        partitions=result(request("GET",base+"storage/partition/",token=token))
        if not isinstance(partitions,list) or len(partitions)>256: raise ValueError()
        matching=[p for p in partitions if isinstance(p,dict) and p.get("id")==c["partition_id"]]
        if len(matching)!=1: raise ValueError()
        p=matching[0]
        if p.get("disk_id")!=c["disk_id"] or p.get("state")!="mounted" or p.get("path")!=base64.b64encode(path.encode("utf-8")).decode("ascii"): raise ValueError()
        total,used,free=(p.get(k) for k in ("total_bytes","used_bytes","free_bytes"))
        if any(type(v)!=int or not 0<=v<=9007199254740991 for v in (total,used,free)) or total<1 or used+free>total: raise ValueError()
        measured={"totalBytes":total,"usedBytes":used,"availableBytes":free}
    finally:
        if request("POST",base+"login/logout/",token=token).get("success") is not True: raise ValueError()
    print(json.dumps(measured,separators=(",",":")))
try: run()
except Exception: sys.exit(1)`;
export function parseFreeboxCapacity(stdout:string,observedAtMs:number):FreeboxCapacityObservation{
  if(typeof stdout!=='string'||stdout.length>1024||!Number.isSafeInteger(observedAtMs)||observedAtMs<0)
    return fail('FREEBOX_CAPACITY_UNVERIFIED');
  try{
    const x=JSON.parse(stdout);
    if(!x||Object.keys(x).sort().join(',')!=='availableBytes,totalBytes,usedBytes'||
      ![x.totalBytes,x.usedBytes,x.availableBytes].every(v=>Number.isSafeInteger(v)&&v>=0)||
      x.totalBytes<1||x.usedBytes>x.totalBytes||x.availableBytes>x.totalBytes-x.usedBytes)
      return fail('FREEBOX_CAPACITY_UNVERIFIED');
    return {status:'OBSERVED',observedAtMs,totalBytes:x.totalBytes,usedBytes:x.usedBytes,availableBytes:x.availableBytes,
      destinationIdentity:'CONFIGURED_PARTITION',writesPerformed:false};
  }catch{return fail('FREEBOX_CAPACITY_UNVERIFIED');}
}
export async function collectFreeboxCapacity(read:ReadOnlyTransport,path:string,now:()=>number=Date.now):Promise<FreeboxCapacityObservation>{
  if(typeof path!=='string'||path.length>200||!configPath.test(path))return fail('FREEBOX_PRIVATE_CONFIGURATION_REQUIRED');
  try{
    const started=now();
    if(!Number.isSafeInteger(started)||started<0)return fail('FREEBOX_CAPACITY_UNVERIFIED');
    const r=await read('s2','python3 -I -c '+quote(PY)+' '+quote(path),30_000,1024);
    const ended=now();
    if(r.code!==0||r.stderr.trim()!==''||!Number.isSafeInteger(ended)||ended<started||ended-started>30_000)
      return fail('FREEBOX_API_UNAVAILABLE_OR_NOT_ADMITTED');
    return parseFreeboxCapacity(r.stdout,started);
  }catch{return fail('FREEBOX_API_UNAVAILABLE_OR_NOT_ADMITTED');}
}
export async function observeFreeboxCapacity():Promise<FreeboxCapacityObservation>{
  try{const {runReadOnlyCommand}=await import('../ssh/client.js');
    return await collectFreeboxCapacity(runReadOnlyCommand,process.env.MCP_AILM_FREEBOX_CONFIG_PATH??'');}
  catch{return fail('FREEBOX_API_UNAVAILABLE_OR_NOT_ADMITTED');}
}
