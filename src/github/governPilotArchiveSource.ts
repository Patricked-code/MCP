import type { ArchiveDownloadResult } from '../provisioning/sourceArchive.js';
export type PilotArchiveRequest = { repositoryId:string; revision:string; destination:string; maxBytes:number };
export type PilotAppConfig = { appId:string; installationId:number; privateKeyFile:string };
export type PilotArchiveDeps = {
 legacy: (request:PilotArchiveRequest)=>Promise<ArchiveDownloadResult>;
 mint: (request:{appId:string;installationId:number;repository:string})=>Promise<string>;
 download: (request:PilotArchiveRequest&{token:string})=>Promise<ArchiveDownloadResult>;
};
export async function downloadGovernPilotArchive(_request:PilotArchiveRequest,_app:PilotAppConfig|null,_deps:PilotArchiveDeps):Promise<ArchiveDownloadResult>{
 return {ok:false,reasonCode:'GITHUB_APP_SOURCE_NOT_IMPLEMENTED'};
}
