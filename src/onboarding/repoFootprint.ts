import type { RepoFootprintReport, RepoFootprintStatus } from './types.js';

export const requiredMcpJsonFiles = [
  '.mcp/manifest.json',
  '.mcp/permissions.json',
  '.mcp/agents.json',
  '.mcp/server-map.json',
  '.mcp/onboarding.json'
] as const;

export const requiredMcpMarkdownFiles = [
  'MCP_PROJECT.md',
  'MCP_AGENT_RULES.md',
  'MCP_REPO_INVENTORY.md',
  'MCP_SERVER_MAPPING.md'
] as const;

export const standardProjectFiles = ['README.md', 'DEPLOYMENT.md', 'SECURITY.md'] as const;

export const alternativeTrackingFiles = ['SUIVI.md', 'TASKS.md'] as const;

export const requiredRepoFootprintFiles = [
  ...requiredMcpJsonFiles,
  ...requiredMcpMarkdownFiles,
  ...standardProjectFiles
] as const;

function statusFromCounts(present: number, missing: number): RepoFootprintStatus {
  if (present === 0) return 'not_configured';
  if (missing === 0) return 'ready';
  return present >= missing ? 'needs_review' : 'partial';
}

export function buildRepoFootprintReport(input: {
  owner: string;
  repo: string;
  defaultBranch?: string;
  visibility?: 'public' | 'private' | 'internal' | 'unknown';
  permissions?: { pull?: boolean; push?: boolean; admin?: boolean };
  presentFiles?: string[];
}): RepoFootprintReport {
  const presentFiles = new Set(input.presentFiles ?? []);
  const trackingPresent = alternativeTrackingFiles.some((file) => presentFiles.has(file));
  const expectedFiles = [...requiredRepoFootprintFiles, ...(trackingPresent ? [] : ['SUIVI.md or TASKS.md'])];
  const missingFiles = expectedFiles.filter((file) => {
    if (file === 'SUIVI.md or TASKS.md') return !trackingPresent;
    return !presentFiles.has(file);
  });
  const presentCount = expectedFiles.length - missingFiles.length;
  const mcpStatus = statusFromCounts(presentCount, missingFiles.length);
  const canBootstrapOnBranch = Boolean(input.permissions?.push);
  const recommendations: string[] = [];

  if (missingFiles.length > 0) {
    recommendations.push('Créer les fichiers manquants sur une branche MCP dédiée.');
  }
  if (!canBootstrapOnBranch) {
    recommendations.push('Écriture non confirmée : préparer les contenus sans écrire.');
  }
  if (mcpStatus === 'ready') {
    recommendations.push('Repo prêt : maintenir les fichiers MCP à jour.');
  }

  return {
    owner: input.owner,
    repo: input.repo,
    defaultBranch: input.defaultBranch ?? 'main',
    visibility: input.visibility ?? 'unknown',
    permissions: {
      pull: Boolean(input.permissions?.pull),
      push: Boolean(input.permissions?.push),
      admin: Boolean(input.permissions?.admin)
    },
    presentFiles: [...presentFiles].sort(),
    missingFiles,
    mcpStatus,
    recommendations,
    canBootstrapOnBranch
  };
}
