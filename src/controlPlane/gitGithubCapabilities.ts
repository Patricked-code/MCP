export type GitGithubPlatform = 'git' | 'github';
export type GitGithubEffect =
  | 'read'
  | 'write'
  | 'admin'
  | 'security_sensitive'
  | 'production_effect'
  | 'forbidden';
export type GitGithubImplementationStatus = 'existing' | 'candidate' | 'planned' | 'forbidden';

export type GitGithubCapability = {
  id: string;
  toolName: string | null;
  platform: GitGithubPlatform;
  family: string;
  effect: GitGithubEffect;
  implementationStatus: GitGithubImplementationStatus;
  risk: string;
};

export type GitGithubCapabilityManifest = {
  schemaVersion: 1;
  program: 'GIT_GITHUB_CONTROL_PLANE';
  objective: string;
  generatedAt: string;
  invariants: string[];
  existingLegacySurfaces: string[];
  capabilities: GitGithubCapability[];
};

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string' && entry.length > 0)) {
    throw new Error(`GIT_GITHUB_MANIFEST_INVALID:${field}`);
  }
  return value;
}

export function parseGitGithubCapabilityManifest(value: unknown): GitGithubCapabilityManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('GIT_GITHUB_MANIFEST_INVALID:root');
  }
  const root = value as Record<string, unknown>;
  if (root.schemaVersion !== 1 || root.program !== 'GIT_GITHUB_CONTROL_PLANE') {
    throw new Error('GIT_GITHUB_MANIFEST_INVALID:identity');
  }
  if (!Array.isArray(root.capabilities)) {
    throw new Error('GIT_GITHUB_MANIFEST_INVALID:capabilities');
  }

  const capabilities = root.capabilities.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`GIT_GITHUB_MANIFEST_INVALID:capability:${index}`);
    }
    const item = raw as Record<string, unknown>;
    const platform = item.platform;
    const effect = item.effect;
    const implementationStatus = item.implementationStatus;
    if (
      typeof item.id !== 'string' || item.id.length < 3
      || !(item.toolName === null || typeof item.toolName === 'string')
      || (platform !== 'git' && platform !== 'github')
      || typeof item.family !== 'string' || item.family.length === 0
      || !['read','write','admin','security_sensitive','production_effect','forbidden'].includes(String(effect))
      || !['existing','candidate','planned','forbidden'].includes(String(implementationStatus))
      || typeof item.risk !== 'string'
    ) {
      throw new Error(`GIT_GITHUB_MANIFEST_INVALID:capability:${index}`);
    }
    return {
      id: item.id,
      toolName: item.toolName,
      platform,
      family: item.family,
      effect,
      implementationStatus,
      risk: item.risk
    } as GitGithubCapability;
  });

  const ids = new Set<string>();
  const toolNames = new Set<string>();
  for (const entry of capabilities) {
    if (ids.has(entry.id)) throw new Error(`GIT_GITHUB_MANIFEST_DUPLICATE_ID:${entry.id}`);
    ids.add(entry.id);
    if (entry.toolName) {
      if (toolNames.has(entry.toolName)) {
        throw new Error(`GIT_GITHUB_MANIFEST_DUPLICATE_TOOL:${entry.toolName}`);
      }
      toolNames.add(entry.toolName);
    }
    if (entry.effect === 'forbidden' && (entry.toolName !== null || entry.implementationStatus !== 'forbidden')) {
      throw new Error(`GIT_GITHUB_MANIFEST_FORBIDDEN_INVALID:${entry.id}`);
    }
  }

  return {
    schemaVersion: 1,
    program: 'GIT_GITHUB_CONTROL_PLANE',
    objective: typeof root.objective === 'string' ? root.objective : '',
    generatedAt: typeof root.generatedAt === 'string' ? root.generatedAt : '',
    invariants: stringArray(root.invariants, 'invariants'),
    existingLegacySurfaces: stringArray(root.existingLegacySurfaces, 'existingLegacySurfaces'),
    capabilities
  };
}
