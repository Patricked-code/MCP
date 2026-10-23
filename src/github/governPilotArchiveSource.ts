import { GOUVERN_SHA, GOUVERN_SOURCE } from '../provisioning/governPilot.js';
import type { ArchiveDownloadResult } from '../provisioning/sourceArchive.js';

/** Selects the original server credential unless a verified App is opted in. */
export type PilotArchiveRequest = {
  repositoryId: string; revision: string; destination: string; maxBytes: number
};
export type PilotAppConfig = {
  appId: string; installationId: number; privateKeyFile: string
};
export type PilotArchiveDeps = {
  legacy: (request: PilotArchiveRequest) => Promise<ArchiveDownloadResult>;
  mint: (request:{appId:string;installationId:number;repository:string}) => Promise<string>;
  download: (request:PilotArchiveRequest&{token:string}) => Promise<ArchiveDownloadResult>;
};

/**
 * No downgrade on App auth errors: configured Apps exclusively control their
 * scoped target. Non-configured S1 preserves the working legacy credential.
 * No key or token is persisted by this dispatcher.
 */
export async function downloadGovernPilotArchive(
  request:PilotArchiveRequest,
  app:PilotAppConfig|null,
  deps:PilotArchiveDeps
):Promise<ArchiveDownloadResult> {
  if (request.repositoryId !== 'github:'+GOUVERN_SOURCE || request.revision !== GOUVERN_SHA
    || request.maxBytes < 1 || request.maxBytes > 50_000_000) {
    return {ok:false,reasonCode:'PILOT_GITHUB_TARGET_INVALID'};
  }
  if (!app) return deps.legacy(request);
  if (!/^[0-9]{1,20}$/.test(app.appId)
    || !Number.isSafeInteger(app.installationId)
    || app.installationId <= 0
    || !app.privateKeyFile.startsWith('/app/secrets/')) {
    return {ok:false,reasonCode:'PILOT_GITHUB_APP_CONFIGURATION_INVALID'};
  }
  let token:string;
  try {
    token=await deps.mint({
      appId:app.appId,
      installationId:app.installationId,
      repository:GOUVERN_SOURCE
    });
  } catch {
    return {ok:false,reasonCode:'PILOT_APP_TOKEN_UNAVAILABLE'};
  }
  if (!token) return {ok:false,reasonCode:'PILOT_APP_TOKEN_UNAVAILABLE'};
  try {
    return await deps.download({...request,token});
  } catch {
    return {ok:false,reasonCode:'PILOT_GITHUB_ARCHIVE_UNAVAILABLE'};
  }
}
