/**
 * GD-U-02D-B3d: single-use *consumption* of the EXISTING signed web E3
 * ticket. Not a new issuer, E3 policy, Task Queue, Session or admin grant.
 *
 * The server-owned receipt directory is durable and an exclusive-create file
 * protects a given ticket against replay across processes/restarts on one
 * shared local filesystem. Fail closed on storage uncertainty. A consumed E3
 * ticket is necessary, never sufficient for an SSH/Plesk write.
 */
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

const PURPOSE = 'plesk-create-subdomain';
const E3_TTL_MS = 10 * 60 * 1000;
const FQDN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TASK = /^TASK-[0-9]{8}-[0-9]{3,}$/;
const PRINCIPAL = /^oauth:[A-Za-z0-9._:@-]{1,200}$/;
const HASH = (s:string):string=>createHash('sha256').update(s).digest('hex');

export type PleskE3ConsumptionInput=Readonly<{
  ticket:string;
  /** From the existing server-validated web session, NEVER request body. */
  binding:string;
  scope:string;
  /** From existing authenticated governed identity/Task/Session. */
  principalId:string;
  governedSessionId:string;
  taskId:string;
}>;
export type PleskE3ConsumptionPorts=Readonly<{
  /** Configured privately by the server, not user-provided or per-request. */
  directory:string;
  /** Existing verifyWebConsentTicket cryptographic verifier. */
  verifyTicket:(purpose:string,ticket:string,binding:string,now:number)=>boolean;
  now:()=>number;
  /** Trusted Task/Session/Lock/transport/CI pre-admission; if supplied, cannot be skipped. */
  verifyPreAdmission:()=>Promise<boolean>;
}>;
export type PleskE3ConsumptionResult=Readonly<{
  status:'CONSUMED'|'BLOCKED';
  reason:'CONSUMED_ATOMICALLY'|'ALREADY_CONSUMED'
    |'INVALID_TARGET_OR_TICKET'|'GOVERNED_ADMISSION_NOT_ATTESTED'
    |'CONSUMPTION_STORAGE_UNAVAILABLE';
  /** Not a Plesk operation; no tool or root permission is granted. */
  runtimeWriteAuthorized:false;
  operationExecuted:false;
}>;
const blocked=(reason:PleskE3ConsumptionResult['reason']):PleskE3ConsumptionResult=>({
  status:'BLOCKED',reason,runtimeWriteAuthorized:false,operationExecuted:false
});

function validTarget(input:PleskE3ConsumptionInput):boolean{
  if(typeof input.binding!=='string'||input.binding.length<6||input.binding.length>3000
    ||!PRINCIPAL.test(input.principalId)
    ||!UUID.test(input.governedSessionId)
    ||!TASK.test(input.taskId)
    ||typeof input.scope!=='string')return false;
  let tuple:unknown;
  try{tuple=JSON.parse(input.binding);}catch{return false;}
  if(!Array.isArray(tuple)||tuple.length!==5)return false;
  const [session,server,parent,label,root]=tuple;
  return typeof session==='string'&&session.length>0&&session.length<=2048
    &&(server==='s1'||server==='s2')
    &&typeof parent==='string'&&FQDN.test(parent)
    &&typeof label==='string'&&LABEL.test(label)
    &&root==='/'+label
    &&input.scope==='resource:plesk:'+server+':'+parent;
}

/**
 * 'wx' (O_EXCL) is the only transition from unused to consumed. Two
 * simultaneous requests sharing the same ticket can never both create it.
 * A crash after creation conservatively burns the ticket; never delete a
 * partial receipt to retry an unknown mutation.
 */
export async function consumeSignedPleskE3Once(
  input:PleskE3ConsumptionInput,ports:PleskE3ConsumptionPorts
):Promise<PleskE3ConsumptionResult>{
  if(!input||!ports||!validTarget(input)
    ||typeof input.ticket!=='string'||input.ticket.length>500
    ||!/^\d{13}\.[a-fA-F0-9]{12,}$/.test(input.ticket)
       &&!/^\d{13}\.signed-test-opaque$/.test(input.ticket)){
    return blocked('INVALID_TARGET_OR_TICKET');
  }
  const [expiryRaw]=input.ticket.split('.');
  const now=ports.now();
  const expiry=Number(expiryRaw);
  if(!Number.isSafeInteger(now)||!Number.isSafeInteger(expiry)
    ||expiry<=now||expiry>now+E3_TTL_MS)return blocked('INVALID_TARGET_OR_TICKET');
  try{
    if(!ports.verifyTicket(PURPOSE,input.ticket,input.binding,now))
      return blocked('INVALID_TARGET_OR_TICKET');
  }catch{return blocked('INVALID_TARGET_OR_TICKET');}
  if(typeof ports.verifyPreAdmission!=='function')
    return blocked('GOVERNED_ADMISSION_NOT_ATTESTED');
  try{
    if(!await ports.verifyPreAdmission())
      return blocked('GOVERNED_ADMISSION_NOT_ATTESTED');
  }catch{return blocked('GOVERNED_ADMISSION_NOT_ATTESTED');}
  const directory=ports.directory;
  if(typeof directory!=='string'||directory.length<3
    ||directory.length>512||!isAbsolute(directory)||directory==='/'||directory.includes('\0')){
    return blocked('CONSUMPTION_STORAGE_UNAVAILABLE');
  }
  // Hash only the ticket, not the user-supplied scope or principal, so
  // even a later forged context cannot reuse an already consumed ticket.
  const digest=HASH('wealthtech-mcp-plesk-e3-consumed-v1\n'+input.ticket);
  try{
    await mkdir(directory,{recursive:true,mode:0o700});
    const dir=await lstat(directory);
    if(!dir.isDirectory()||(dir.mode&0o077)!==0)
      return blocked('CONSUMPTION_STORAGE_UNAVAILABLE');
    const path=join(directory,digest+'.json');
    let fd;
    try{
      fd=await open(path,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);
    }catch(e){
      if(e&&typeof e==='object'&&'code' in e&&e.code==='EEXIST')
        return blocked('ALREADY_CONSUMED');
      return blocked('CONSUMPTION_STORAGE_UNAVAILABLE');
    }
    try{
      await fd.writeFile(JSON.stringify({
        schemaVersion:1,
        consumedAt:new Date(now).toISOString(),
        expiresAt:new Date(expiry).toISOString(),
        targetDigest:HASH(input.scope)
      })+'\n',{encoding:'utf8'});
      await fd.sync();
    }catch{
      // Conservatively leave any existing receipt, even if partially written.
      return blocked('CONSUMPTION_STORAGE_UNAVAILABLE');
    }finally{await fd.close().catch(()=>undefined);}
    return {status:'CONSUMED',reason:'CONSUMED_ATOMICALLY',
      runtimeWriteAuthorized:false,operationExecuted:false};
  }catch{return blocked('CONSUMPTION_STORAGE_UNAVAILABLE');}
}
