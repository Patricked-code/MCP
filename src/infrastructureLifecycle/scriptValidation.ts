import { spawn } from 'node:child_process';
import { validateMaintenanceScriptRevision,type MaintenanceScriptCandidate } from './scriptRevision.js';
import type { GithubRead } from '../provisioning/revisionAdmission.js';

const MAX_BYTES=256*1024;
const MAX_CONFIG=4096;
const operations=['PRC17A','PRC17B'] as const;
type Operation=typeof operations[number];
type Item={operation:Operation;status:'SOURCE_AND_SYNTAX_VERIFIED'|'UNVERIFIED';reason:string|null};
export type ScriptValidationObservation={status:'OBSERVED'|'UNVERIFIED';reason:string|null;items:Item[];
  effectAuthorized:false;installationAuthorized:false;executionAuthorized:false;writesPerformed:false};
const fail=(reason:string):ScriptValidationObservation=>({status:'UNVERIFIED',reason,items:[],
  effectAuthorized:false,installationAuthorized:false,executionAuthorized:false,writesPerformed:false});

/** Actual Bash parser, NOT execution or a sandbox certification. No profile,
 * inherited environment, shell interpolation, filesystem path, or output
 * from script parsing is supplied to callers. */
export function checkBashSyntax(bytes:Buffer):Promise<boolean>{
  if(!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>MAX_BYTES||
     bytes.includes(0)||!Buffer.from(bytes.toString('utf8'),'utf8').equals(bytes))return Promise.resolve(false);
  return new Promise(resolve=>{
    let done=false;
    const finish=(ok:boolean)=>{if(!done){done=true;clearTimeout(timer);resolve(ok);}};
    const child=spawn('/bin/bash',['--noprofile','--norc','-n','-s'],{
      shell:false,env:{PATH:'/usr/bin:/bin',LC_ALL:'C'},stdio:['pipe','ignore','ignore']
    });
    const timer=setTimeout(()=>{child.kill('SIGKILL');finish(false);},5000);
    child.once('error',()=>finish(false));
    child.once('close',(code,signal)=>finish(code===0&&signal===null));
    child.stdin.on('error',()=>{child.kill('SIGKILL');finish(false);});
    child.stdin.end(bytes);
  });
}
/** Private deployment configuration supplies exact candidate references, not
 * an admission or an arbitrary client script. Original private scripts must
 * remain private; absent a versioned admissible source, status is UNVERIFIED. */
export async function collectScriptValidation(raw:string,read:GithubRead,syntax=checkBashSyntax):Promise<ScriptValidationObservation>{
  if(typeof raw!=='string'||raw.length===0||raw.length>MAX_CONFIG)return fail('SCRIPT_CANDIDATE_CONFIGURATION_REQUIRED');
  let config:Record<Operation,MaintenanceScriptCandidate>;
  try{
    const x=JSON.parse(raw);
    if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join(',')!==operations.join(','))return fail('SCRIPT_CANDIDATE_CONFIGURATION_INVALID');
    for(const op of operations){
      const c=x[op];
      if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).sort().join(',')!=='revision,sha256,sourcePath'||
        typeof c.revision!=='string'||!/^[a-f0-9]{40}$/.test(c.revision)||typeof c.sha256!=='string'||!/^[a-f0-9]{64}$/.test(c.sha256)||
        typeof c.sourcePath!=='string'||c.sourcePath.length>200||!c.sourcePath.startsWith('scripts/')||
        !c.sourcePath.endsWith('.sh')||!c.sourcePath.split('/').every((s:string)=>/^[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}$/.test(s)))
        return fail('SCRIPT_CANDIDATE_CONFIGURATION_INVALID');
    }
    config=x;
  }catch{return fail('SCRIPT_CANDIDATE_CONFIGURATION_INVALID');}
  const items:Item[]=[];
  for(const operation of operations){
    const checked=await validateMaintenanceScriptRevision(config[operation],read,syntax);
    items.push({operation,status:checked.status==='SOURCE_VERIFIED'?'SOURCE_AND_SYNTAX_VERIFIED':'UNVERIFIED',
      reason:checked.status==='UNVERIFIED'?checked.reason:null});
  }
  return {status:'OBSERVED',reason:null,items,effectAuthorized:false,installationAuthorized:false,executionAuthorized:false,writesPerformed:false};
}
export async function observeScriptValidation():Promise<ScriptValidationObservation>{
  try{
    const {githubJsonRequestWithServerCredential}=await import('../github/connection.js');
    return await collectScriptValidation(process.env.MCP_AILM_SCRIPT_CANDIDATES??'',githubJsonRequestWithServerCredential);
  }catch{return fail('SCRIPT_VALIDATION_UNAVAILABLE');}
}
