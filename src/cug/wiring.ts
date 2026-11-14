import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { z } from 'zod';
import { env } from '../config/env.js';
import { inspectOauthAccessToken, oauthIssuer } from '../oauth.js';
import { probeGithubAppReadOnlyRepository } from '../github/installationLiveReadiness.js';
import { CUG_APP_ID, createCugAdmission, type CugConfig } from './admission.js';

const login = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/);
const configSchema=z.object({
  clientId:z.string().min(1).max(256),
  subject:z.string().min(1).max(256),
  identityKey:z.string().regex(/^[0-9a-f]{64}$/),
  accounts:z.array(z.object({
    login,installationId:z.number().int().positive(),
    probeRepository:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/)
  }).strict()).min(1).max(10)
}).strict().superRefine(({accounts},ctx)=>{
  const names=new Set<string>(), installs=new Set<number>();
  for(const a of accounts){
    const name=a.login.toLowerCase();
    if(names.has(name)||installs.has(a.installationId)||!a.probeRepository.toLowerCase().startsWith(name+'/')
        ||a.probeRepository.includes('..')||a.probeRepository.endsWith('/.')){
      ctx.addIssue({code:'custom',message:'CUG_ACCOUNT_CONFIGURATION_INVALID'});return;
    }
    names.add(name);installs.add(a.installationId);
  }
});

async function readProtected(file:string, max:number) {
  const handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try{
    const st=await handle.stat();
    if(!st.isFile()||(st.mode&0o777)!==0o600||st.size<1||st.size>max)throw Error('CUG_CONFIGURATION_UNAVAILABLE');
    const buffer=Buffer.alloc(max+1);
    let offset=0;
    while(offset<buffer.length){
      const {bytesRead}=await handle.read(buffer,offset,buffer.length-offset,null);
      if(bytesRead===0)break;
      offset+=bytesRead;
    }
    if(offset<1||offset>max)throw Error('CUG_CONFIGURATION_UNAVAILABLE');
    return buffer.subarray(0,offset).toString('utf8');
  }finally{await handle.close();}
}
async function getConfig():Promise<CugConfig|null> {
  if(!env.MCP_CUG_ADMISSION_ENABLED)return null;
  try {
    const parsed=configSchema.safeParse(JSON.parse(await readProtected('/app/secrets/cug-admission.json',16_384)));
    return parsed.success?parsed.data:null;
  }catch{return null;}
}
export function cugOrigin():string {
  try{
    const base=new URL(oauthIssuer());
    return base.protocol==='https:'?base.origin:'';
  }catch{return '';}
}
export const cugEnabled=()=>env.MCP_CUG_ADMISSION_ENABLED && cugOrigin()!=='';
export const cugAdmission=createCugAdmission({
  origin:cugOrigin(),
  getConfig,
  inspect:token=>inspectOauthAccessToken(token,'mcp:read'),
  probe:async account=>{
    const result=await probeGithubAppReadOnlyRepository({
      installation:{appId:CUG_APP_ID,installationId:account.installationId,accountLogin:account.login},
      repository:account.probeRepository
    },{
      readPrivateKey:()=>readProtected('/app/secrets/cug-app-private.pem',16_384),
      fetchImpl:(input,init)=>fetch(input,{...init,redirect:'error'}),
      now:()=>new Date()
    });
    return result.status==='PERMISSION_OBSERVED';
  }
});
