import type { ReadOnlyTransport } from './capacityProbe.js';
const UNITS=['freebox-s2-offsite.timer','freebox-s2-volumes.timer'] as const;
type Unit=typeof UNITS[number];
type TimerObservation={unit:Unit;loadState:string;activeState:string;unitFileState:string;
  lastTrigger:string|null;nextTrigger:string|null;automaticBackupCertified:false};
export type BackupAutomationObservation=
  | {status:'UNVERIFIED';reason:string;writesPerformed:false}
  | {status:'OBSERVED';observedAtMs:number;timers:TimerObservation[];writesPerformed:false;automationModified:false};
const fail=(reason:string):BackupAutomationObservation=>({status:'UNVERIFIED',reason,writesPerformed:false});
const allowed=new Set(['Id','LoadState','ActiveState','UnitFileState','LastTriggerUSec','NextElapseUSecRealtime']);
const states=/^[a-z][a-z-]{0,39}$/;
function timestamp(value:string|undefined):string|null {
  return value&&value!=='n/a'&&value.length<=80&&/^[A-Za-z0-9 :+.-]+$/.test(value)?value:null;
}
/** Observes the existing producer timers only; enabled/active is not proof of
 * a successful backup and missing timer output never becomes a new schedule. */
export function parseBackupTimerOutput(stdout:string,observedAtMs:number):BackupAutomationObservation {
  if(typeof stdout!=='string'||stdout.length>12000||stdout.includes('sortie plafonnée')||stdout.includes('\0')||
    !Number.isSafeInteger(observedAtMs)||observedAtMs<0)return fail('TIMER_OUTPUT_UNVERIFIED');
  const blocks=stdout.trim().split(/\r?\n\s*\r?\n/),timers:TimerObservation[]=[];
  if(blocks.length!==UNITS.length)return fail('TIMER_OUTPUT_UNVERIFIED');
  for(const block of blocks){
    const map=new Map<string,string>();
    for(const line of block.split(/\r?\n/)){
      const i=line.indexOf('='),key=line.slice(0,i);
      if(i<1||!allowed.has(key)||map.has(key))return fail('TIMER_OUTPUT_UNVERIFIED');
      map.set(key,line.slice(i+1));
    }
    const unit=map.get('Id') as Unit,load=map.get('LoadState')??'',active=map.get('ActiveState')??'',file=map.get('UnitFileState')??'';
    if(!UNITS.includes(unit)||timers.some(x=>x.unit===unit)||!states.test(load)||!states.test(active)||!states.test(file))
      return fail('TIMER_OUTPUT_UNVERIFIED');
    timers.push({unit,loadState:load,activeState:active,unitFileState:file,lastTrigger:timestamp(map.get('LastTriggerUSec')),
      nextTrigger:timestamp(map.get('NextElapseUSecRealtime')),automaticBackupCertified:false});
  }
  return {status:'OBSERVED',observedAtMs,timers,writesPerformed:false,automationModified:false};
}
export async function collectBackupAutomation(read:ReadOnlyTransport,now:()=>number=Date.now):Promise<BackupAutomationObservation>{
  try{
    const started=now();
    const result=await read('s2','LC_ALL=C systemctl show --no-pager --property=Id,LoadState,ActiveState,UnitFileState,LastTriggerUSec,NextElapseUSecRealtime '+UNITS.join(' '),15_000,12_000);
    const ended=now();
    if(result.code!==0||result.stderr.trim()!==''||!Number.isSafeInteger(ended)||ended<started||ended-started>15_000)
      return fail('TIMER_PROBE_UNAVAILABLE');
    return parseBackupTimerOutput(result.stdout,started);
  }catch{return fail('TIMER_PROBE_UNAVAILABLE');}
}
export async function observeBackupAutomation():Promise<BackupAutomationObservation>{
  try{const {runReadOnlyCommand}=await import('../ssh/client.js');return await collectBackupAutomation(runReadOnlyCommand);}
  catch{return fail('TIMER_PROBE_UNAVAILABLE');}
}
