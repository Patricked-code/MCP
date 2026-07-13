import type { ServerMappingCandidate } from './types.js';

export function createServerMappingCandidate(input: Partial<ServerMappingCandidate> & {
  githubOwner: string;
  githubRepo: string;
}): ServerMappingCandidate {
  return {
    projectKey: input.projectKey ?? input.githubRepo.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    githubOwner: input.githubOwner,
    githubRepo: input.githubRepo,
    officialBranch: input.officialBranch ?? 'main',
    serverId: input.serverId ?? 'S1',
    serverName: input.serverName ?? 'unknown',
    serverPath: input.serverPath ?? '',
    environment: input.environment ?? 'unknown',
    publicDomain: input.publicDomain ?? null,
    runtime: input.runtime ?? 'unknown',
    serviceName: input.serviceName ?? null,
    requiresHumanApprovalForDeploy: input.requiresHumanApprovalForDeploy ?? true,
    status: input.status ?? 'candidate',
    notes: input.notes ?? []
  };
}

export function isServerMappingComplete(mapping: ServerMappingCandidate): boolean {
  return Boolean(mapping.githubOwner && mapping.githubRepo && mapping.serverId && mapping.serverPath && mapping.officialBranch);
}
