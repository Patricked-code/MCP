import type { ServerMapping } from './types.js';

export function createServerMappingTemplate(input: {
  projectName: string;
  owner: string;
  repo: string;
  defaultBranch?: string;
  serverPath?: string;
  environment?: string;
  publicDomain?: string | null;
  dockerService?: string | null;
}, at = new Date().toISOString()): ServerMapping {
  return {
    projectName: input.projectName,
    owner: input.owner,
    repo: input.repo,
    defaultBranch: input.defaultBranch ?? 'main',
    serverPath: input.serverPath ?? 'to-be-confirmed',
    environment: input.environment ?? 'to-be-confirmed',
    publicDomain: input.publicDomain ?? null,
    dockerService: input.dockerService ?? null,
    deploymentFiles: [],
    criticalScripts: [],
    syncStatus: 'needs_review',
    lastCheckedAt: at,
    auditNotes: ['Generated template only; review before committing to a project repo.']
  };
}

export function renderServerMapJson(mapping: ServerMapping): string {
  return `${JSON.stringify({
    version: 1,
    projectName: mapping.projectName,
    github: {
      owner: mapping.owner,
      repo: mapping.repo,
      defaultBranch: mapping.defaultBranch
    },
    server: {
      path: mapping.serverPath,
      environment: mapping.environment,
      publicDomain: mapping.publicDomain,
      dockerService: mapping.dockerService
    },
    deploymentFiles: mapping.deploymentFiles,
    criticalScripts: mapping.criticalScripts,
    syncStatus: mapping.syncStatus,
    lastCheckedAt: mapping.lastCheckedAt,
    auditNotes: mapping.auditNotes
  }, null, 2)}\n`;
}
