/**
 * GD-U-02D B3j — bounded Plesk subscription read observation.
 * Provider identity and an accessible subscription info query are NOT proof
 * of admin write rights. No dynamic shell and no mutation are permitted.
 */
type ServerId='s1'|'s2';
type ReadResult=Readonly<{code:number|null;stdout:string;stderr?:string}>;
export type PleskSubscriptionReadObservation=Readonly<{
  serverId:ServerId;
  parentDomain:string;
  status:'SUBSCRIPTION_READABLE'|'SUBSCRIPTION_READ_DENIED_OR_UNVERIFIED';
  readPermissionObserved:boolean;
  pleskAdminWritePermissionVerified:false;
  mutationExecuted:false;
}>;
const DOMAIN=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
export async function probeAllowlistedPleskSubscriptionRead(
  parents:Readonly<Partial<Record<ServerId,readonly string[]>>>,
  read:(server:ServerId,command:`plesk bin subscription --info '${string}'`)=>Promise<ReadResult>
):Promise<readonly PleskSubscriptionReadObservation[]>{
  if(!parents||typeof parents!=='object'||typeof read!=='function')
    throw Error('PLESK_READ_PROBE_INVALID');
  const selected:Array<{serverId:ServerId;domain:string}>=[];
  for(const serverId of ['s1','s2'] as const){
    const domains=parents[serverId]??[];
    if(!Array.isArray(domains)||domains.length>4)
      throw Error('PLESK_READ_PROBE_TARGETS_INVALID');
    for(const domain of domains){
      if(typeof domain!=='string'||!DOMAIN.test(domain)
        ||selected.some(x=>x.serverId===serverId&&x.domain===domain))
        throw Error('PLESK_READ_PROBE_TARGETS_INVALID');
      selected.push({serverId,domain});
    }
  }
  // Invalid input is rejected before ANY SSH call.
  return Promise.all(selected.map(async ({serverId,domain})=>{
    let readable=false;
    try{
      const r=await read(serverId,`plesk bin subscription --info '${domain}'`);
      readable=r?.code===0&&typeof r.stdout==='string'&&r.stdout.trim().length>0;
    }catch{ /* Never return SSH output, errors or secrets. */ }
    return {
      serverId,parentDomain:domain,
      status:readable?'SUBSCRIPTION_READABLE' as const:
        'SUBSCRIPTION_READ_DENIED_OR_UNVERIFIED' as const,
      readPermissionObserved:readable,
      pleskAdminWritePermissionVerified:false as const,
      mutationExecuted:false as const
    };
  }));
}
