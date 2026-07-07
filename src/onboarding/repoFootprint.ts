import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { GitHubConnectionStatus } from '../github/connection.js';
import type { GitRegistry } from '../github/registry.js';
import type { RepoFootprint, RepoFootprintStatus } from './types.js';

export const REQUIRED_MCP_FILES = [
  '.mcp/manifest.json',
  '.mcp/permissions.json',
  '.mcp/agents.json',
  '.mcp/server-map.json',
  '.mcp/onboarding.json',
  'MCP_PROJECT.md',
  'MCP_AGENT_RULES.md',
  'MCP_REPO_INVENTORY.md',
  'MCP_SERVER_MAPPING.md',
  'README.md',
  'SUIVI.md',
  'DEPLOYMENT.md',
  'SECURITY.md'
] as const;

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function footprintStatus(presentFiles: string[], missingFiles: string[]): RepoFootprintStatus {
  if (missingFiles.length === 0) return 'ready';
  if (presentFiles.length === 0) return 'not_configured';
  if (missingFiles.includes('SECURITY.md') || missingFiles.includes('.mcp/permissions.json')) return 'needs_review';
  return 'partial';
}

function recommendations(status: RepoFootprintStatus, missingFiles: string[]): string[] {
  if (status === 'ready') {
    return ['Repo MCP footprint is complete; keep future updates on a dedicated branch and PR.'];
  }

  const next = ['Create branch mcp/onboarding-setup before adding any missing governance file.'];
  if (missingFiles.includes('.mcp/permissions.json')) next.push('Add .mcp/permissions.json before allowing any agent write workflow.');
  if (missingFiles.includes('.mcp/server-map.json')) next.push('Add .mcp/server-map.json with sanitized server mapping only.');
  if (missingFiles.includes('SECURITY.md')) next.push('Add SECURITY.md before exposing this repo in a public organization.');
  return next;
}

export function assessRepoFootprint(input: {
  owner: string;
  name: string;
  defaultBranch?: string;
  visibility?: RepoFootprint['visibility'];
  presentFiles: string[];
  permissions?: RepoFootprint['permissions'];
  canCreateOnboardingBranch?: boolean;
}): RepoFootprint {
  const required = [...REQUIRED_MCP_FILES];
  const present = required.filter((file) => input.presentFiles.includes(file));
  const missing = required.filter((file) => !input.presentFiles.includes(file));
  const status = footprintStatus(present, missing);

  return {
    owner: input.owner,
    name: input.name,
    defaultBranch: input.defaultBranch ?? 'main',
    visibility: input.visibility ?? 'unknown',
    permissions: input.permissions ?? { canRead: true, canWrite: false, canAdmin: false },
    presentFiles: present,
    missingFiles: missing,
    status,
    recommendations: recommendations(status, missing),
    canCreateOnboardingBranch: Boolean(input.canCreateOnboardingBranch)
  };
}

export async function inspectLocalRepoFootprint(rootDir = process.cwd()): Promise<RepoFootprint> {
  const checks = await Promise.all(REQUIRED_MCP_FILES.map(async (file) => ({ file, exists: await fileExists(join(rootDir, file)) })));
  const presentFiles = checks.filter((check) => check.exists).map((check) => check.file);
  return assessRepoFootprint({
    owner: 'Patricked-code',
    name: 'MCP',
    defaultBranch: 'main',
    visibility: 'unknown',
    presentFiles,
    permissions: { canRead: true, canWrite: true, canAdmin: false },
    canCreateOnboardingBranch: true
  });
}

export function buildRegistryRepoFootprints(
  status: GitHubConnectionStatus,
  registry: GitRegistry,
  localRepo: RepoFootprint
): RepoFootprint[] {
  const mapped = registry.repoMappings.map((mapping) => assessRepoFootprint({
    owner: mapping.githubOwner,
    name: mapping.githubRepo,
    defaultBranch: mapping.officialBranch,
    visibility: 'unknown',
    presentFiles: [],
    permissions: {
      canRead: status.canReadReposHint,
      canWrite: status.canWriteReposHint,
      canAdmin: status.canAdminOrgHint
    },
    canCreateOnboardingBranch: status.canWriteReposHint
  }));

  const hasLocal = mapped.some((repo) => repo.owner === localRepo.owner && repo.name === localRepo.name);
  return hasLocal ? mapped : [localRepo, ...mapped];
}
