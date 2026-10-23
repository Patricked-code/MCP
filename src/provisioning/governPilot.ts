export const GOUVERN_SOURCE = 'chainsolutions-wealthtech/Governed-Repository-Template';
export const GOUVERN_SHA = 'eb74f16b6c8bbe63658666095f6c97fb32aaa303';
export const GOUVERN_RUNTIME_ROOT = '/app/data/gouvern';
export type PilotDownload = (input: { repositoryId:string; revision:string; destination:string; maxBytes:number }) => Promise<{ok:true;sha256:string;bytes:number}|{ok:false;reasonCode:string}>;
export type PilotStage = { status:'STAGED'|'NO_OP'|'BLOCKED'|'FAILED'; reason:string; revision?:string };
export async function stageGovernPilot(_input:{ root:string; approved:boolean; revision:string },_download:PilotDownload):Promise<PilotStage>{
  return {status:'BLOCKED',reason:'NOT_IMPLEMENTED'};
}
export async function readGovernPilot(_root:string):Promise<{revision:string;sha256:string;bytes:number}|null>{return null;}
