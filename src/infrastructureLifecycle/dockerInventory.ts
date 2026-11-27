import type { Host, ReadOnlyTransport } from './capacityProbe.js';

export type DockerReferenceObservation =
  | {status:'UNVERIFIED';reason:string;writesPerformed:false}
  | {status:'OBSERVED';observedAtMs:number;uniqueImageIds:number;taggedReferences:number;
      imagesWithMultipleTags:number;additionalTagReferences:number;untaggedImageIds:number;
      physicalReclaimableBytes:null;deletionAllowed:false;writesPerformed:false};
const COMMAND="docker image ls --all --no-trunc --format '{{.ID}}\\t{{.Repository}}\\t{{.Tag}}'";
const unknown=(reason:string):DockerReferenceObservation=>({status:'UNVERIFIED',reason,writesPerformed:false});
/** Group Docker reference aliases only. Shared layers, container use and rollback
 * protection are not inferred; an extra tag is not an extra physical image. */
export function parseDockerReferenceInventory(stdout:string,observedAtMs:number):DockerReferenceObservation {
  if(typeof stdout!=='string'||Buffer.byteLength(stdout,'utf8')>100_000||
     stdout.includes('sortie plafonnée')||stdout.includes('\0')||
     !Number.isSafeInteger(observedAtMs)||observedAtMs<0)return unknown('INVENTORY_UNVERIFIED');
  const rows=stdout.trimEnd()===''?[]:stdout.trimEnd().split(/\r?\n/);
  if(rows.length>1500)return unknown('INVENTORY_UNVERIFIED');
  const byId=new Map<string,Set<string>>(), owners=new Map<string,string>();
  for(const row of rows){
    const parts=row.split('\t');
    if(parts.length!==3)return unknown('INVENTORY_UNVERIFIED');
    const [id,repo,tag]=parts;
    if(!id||!/^sha256:[a-f0-9]{64}$/.test(id)||!repo||!tag)return unknown('INVENTORY_UNVERIFIED');
    if(!byId.has(id))byId.set(id,new Set());
    if(repo==='<none>'&&tag==='<none>')continue;
    if(!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,255}$/.test(repo)||
       !/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$/.test(tag))return unknown('INVENTORY_UNVERIFIED');
    const ref=repo+':'+tag;
    if(owners.has(ref)&&owners.get(ref)!==id)return unknown('REFERENCE_CONFLICT');
    owners.set(ref,id);byId.get(id)!.add(ref);
  }
  const counts=[...byId.values()].map(x=>x.size);
  return {status:'OBSERVED',observedAtMs,uniqueImageIds:byId.size,taggedReferences:owners.size,
    imagesWithMultipleTags:counts.filter(n=>n>1).length,
    additionalTagReferences:counts.reduce((sum,n)=>sum+Math.max(0,n-1),0),
    untaggedImageIds:counts.filter(n=>n===0).length,
    physicalReclaimableBytes:null,deletionAllowed:false,writesPerformed:false};
}
export async function collectDockerReferences(host:Host,read:ReadOnlyTransport,now:()=>number=Date.now):Promise<DockerReferenceObservation>{
  if(host!=='s1'&&host!=='s2')return unknown('INVALID_HOST');
  try{
    const started=now();
    const result=await read(host,COMMAND,15_000,100_000);
    const ended=now();
    if(result.code!==0||result.stderr.trim()!==''||!Number.isSafeInteger(ended)||ended<started||ended-started>15_000)
      return unknown('DOCKER_INVENTORY_UNAVAILABLE');
    return parseDockerReferenceInventory(result.stdout,started);
  }catch{return unknown('DOCKER_INVENTORY_UNAVAILABLE');}
}
export async function observeDockerReferences(host:Host):Promise<DockerReferenceObservation>{
  try{const {runReadOnlyCommand}=await import('../ssh/client.js');return await collectDockerReferences(host,runReadOnlyCommand);}
  catch{return unknown('DOCKER_INVENTORY_UNAVAILABLE');}
}
