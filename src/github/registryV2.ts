import { createHash } from 'node:crypto';
import { z } from 'zod';

const IsoDateSchema = z.string().min(10);

const LegacyAccountSchema = z.object({
  id: z.string().min(1),
  login: z.string().min(1),
  org: z.string().nullable().optional(),
  accountType: z.string().optional(),
  authMode: z.string().optional(),
  requestedMode: z.string().optional(),
  connectedAt: IsoDateSchema.optional(),
  lastCheckedAt: IsoDateSchema.optional(),
  status: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  enabledOnPublicMcpDomain: z.boolean().optional()
}).passthrough();

const LegacyMappingSchema = z.object({
  id: z.string().min(1),
  githubOwner: z.string().min(1),
  githubRepo: z.string().min(1),
  projectKey: z.string().min(1),
  serverId: z.string().min(1),
  serverPath: z.string().min(1),
  officialBranch: z.string().min(1),
  allowedAccess: z.enum(['read', 'write', 'admin', 'org_admin']),
  deployEnabled: z.boolean(),
  createdAt: IsoDateSchema.optional(),
  updatedAt: IsoDateSchema.optional()
}).passthrough();

const LegacyAuditEventSchema = z.object({
  id: z.string().min(1),
  at: IsoDateSchema,
  type: z.string().min(1),
  actor: z.string().min(1),
  message: z.string().min(1),
  metadata: z.unknown().optional()
}).passthrough();

export const GitRegistryV1Schema = z.object({
  version: z.literal(1),
  updatedAt: IsoDateSchema,
  accounts: z.array(LegacyAccountSchema),
  repoMappings: z.array(LegacyMappingSchema),
  auditEvents: z.array(LegacyAuditEventSchema)
}).passthrough();

export const RegistryCapabilitiesSchema = z.object({
  inventory: z.boolean(),
  readFiles: z.boolean(),
  searchCode: z.boolean(),
  readLogs: z.boolean(),
  gitStatus: z.boolean(),
  writeFiles: z.boolean(),
  createBranch: z.boolean(),
  commit: z.boolean(),
  pushBranch: z.boolean(),
  build: z.boolean(),
  deploy: z.boolean(),
  rollback: z.boolean(),
  quarantine: z.boolean(),
  purge: z.boolean()
});

const RegistryConnectionSchema = z.object({
  connectionId: z.string().min(1),
  provider: z.literal('github'),
  accountLogin: z.string().min(1),
  accountType: z.enum(['organization', 'user', 'unknown']),
  role: z.enum(['source', 'target', 'secondary', 'unknown']),
  configuredStatus: z.enum(['configured', 'validated', 'warning', 'error', 'pending']),
  durable: z.literal(true),
  credentialRef: z.string().nullable(),
  credentialsInRegistry: z.literal(false),
  connectedAt: IsoDateSchema.nullable(),
  lastValidatedAt: IsoDateSchema.nullable(),
  enabledOnPublicMcpDomain: z.boolean(),
  autoRestoreContext: z.literal(true),
  warnings: z.array(z.string())
});

const RegistryRepositorySchema = z.object({
  repositoryId: z.string().min(1),
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(3),
  visibility: z.enum(['unknown', 'public', 'private', 'internal']),
  defaultBranch: z.string().min(1),
  archived: z.boolean(),
  fork: z.boolean(),
  discoveryStatus: z.enum(['discovered', 'ignored', 'recognized', 'archived']),
  discoveredAt: IsoDateSchema.nullable(),
  lastSeenAt: IsoDateSchema.nullable()
});

const RegistryMappingSchema = z.object({
  mappingId: z.string().min(1),
  projectId: z.string().min(1),
  repositoryId: z.string().min(1),
  sourceRepositoryId: z.string().nullable(),
  targetRepositoryId: z.string().nullable(),
  activeRepositoryId: z.string().nullable(),
  serverId: z.string().min(1),
  serverPath: z.string().min(1),
  realPath: z.string().nullable(),
  realPathVerified: z.boolean(),
  remoteVerified: z.boolean(),
  domain: z.string().nullable(),
  domainVerified: z.boolean(),
  environment: z.enum(['development', 'staging', 'production']),
  officialBranch: z.string().min(1),
  allowedBranchPrefixes: z.array(z.string().min(1)),
  directMainPush: z.literal(false),
  status: z.enum([
    'proposed',
    'path_verified',
    'validated',
    'active',
    'suspended',
    'migration_pending',
    'migration_completed',
    'archived'
  ]),
  capabilities: RegistryCapabilitiesSchema,
  backupRequired: z.boolean(),
  healthChecks: z.array(z.string()),
  rollbackMethod: z.string().nullable(),
  createdAt: IsoDateSchema.nullable(),
  validatedAt: IsoDateSchema.nullable(),
  activatedAt: IsoDateSchema.nullable(),
  updatedAt: IsoDateSchema.nullable()
});

const RegistryMigrationSchema = z.object({
  migrationId: z.string().min(1),
  mappingId: z.string().min(1),
  domain: z.string().nullable(),
  currentRepositoryId: z.string().min(1),
  replacementRepositoryId: z.string().min(1),
  activeRepositoryId: z.string().min(1),
  status: z.enum([
    'inventory_pending',
    'source_verified',
    'replacement_verified',
    'staging_ready',
    'backup_ready',
    'deployment_ready',
    'deployed',
    'validated',
    'rollback',
    'quarantine_retention',
    'migration_pending',
    'migration_completed'
  ]),
  preserve: z.array(z.string()),
  purgeAllowed: z.literal(false),
  backupManifestId: z.string().nullable(),
  rollbackReleaseId: z.string().nullable(),
  healthChecks: z.array(z.string()),
  createdAt: IsoDateSchema.nullable(),
  updatedAt: IsoDateSchema.nullable()
});

const RegistryAuditEventV2Schema = z.object({
  eventId: z.string().min(1),
  at: IsoDateSchema,
  actor: z.string().min(1),
  tool: z.string().nullable(),
  type: z.string().min(1),
  objectId: z.string().nullable(),
  reason: z.string().min(1),
  risk: z.enum(['low', 'medium', 'high', 'critical']),
  beforeHash: z.string().nullable(),
  afterHash: z.string().nullable(),
  result: z.enum(['success', 'rejected', 'failed']),
  metadata: z.unknown().optional(),
  legacySchemaVersion: z.literal(1).optional()
});

export const GitRegistryV2Schema = z.object({
  schemaVersion: z.literal(2),
  updatedAt: IsoDateSchema,
  connections: z.array(RegistryConnectionSchema),
  repositories: z.array(RegistryRepositorySchema),
  mappings: z.array(RegistryMappingSchema),
  migrations: z.array(RegistryMigrationSchema),
  auditEvents: z.array(RegistryAuditEventV2Schema),
  activeContext: z.null()
});

export type GitRegistryV1 = z.infer<typeof GitRegistryV1Schema>;
export type GitRegistryV2 = z.infer<typeof GitRegistryV2Schema>;
export type RegistryCapabilities = z.infer<typeof RegistryCapabilitiesSchema>;

export type GitRegistryV2DryRunReport = {
  sourceSchemaVersion: 1 | 2;
  targetSchemaVersion: 2;
  sourceHash: string;
  candidateHash: string;
  alreadyV2: boolean;
  counts: {
    connections: number;
    repositories: number;
    mappings: number;
    migrations: number;
    auditEvents: number;
  };
  warnings: string[];
};

const repositoryId = (owner: string, repo: string) => `github:${owner}/${repo}`;

function defaultCapabilities(): RegistryCapabilities {
  return {
    inventory: true,
    readFiles: true,
    searchCode: true,
    readLogs: false,
    gitStatus: true,
    writeFiles: false,
    createBranch: false,
    commit: false,
    pushBranch: false,
    build: false,
    deploy: false,
    rollback: false,
    quarantine: false,
    purge: false
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)])
  );
}

export function canonicalRegistryHash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function assertUniqueIds(values: string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Identifiant dupliqué dans ${label}: ${value}`);
    seen.add(value);
  }
}

function assertNoCredentialMaterial(registry: GitRegistryV2): void {
  const serialized = JSON.stringify(registry);
  if (/ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(serialized)) {
    throw new Error('Le candidat GitRegistry v2 contient un signal de credential interdit.');
  }
}

export function validateGitRegistryV2(input: unknown): GitRegistryV2 {
  const registry = GitRegistryV2Schema.parse(input);
  assertUniqueIds(registry.connections.map((entry) => entry.connectionId), 'connections');
  assertUniqueIds(registry.repositories.map((entry) => entry.repositoryId), 'repositories');
  assertUniqueIds(registry.mappings.map((entry) => entry.mappingId), 'mappings');
  assertUniqueIds(registry.migrations.map((entry) => entry.migrationId), 'migrations');
  assertUniqueIds(registry.auditEvents.map((entry) => entry.eventId), 'auditEvents');
  assertNoCredentialMaterial(registry);
  return registry;
}

function accountType(value: string | undefined): 'organization' | 'user' | 'unknown' {
  if (value === 'organization' || value === 'user') return value;
  return 'unknown';
}

function accountRole(login: string): 'source' | 'target' | 'secondary' | 'unknown' {
  const normalized = login.toLowerCase();
  if (normalized === 'chainsolutions-wealthtech') return 'target';
  if (normalized === 'patricked-code') return 'source';
  if (normalized === 'wealthtechinnovations') return 'secondary';
  return 'unknown';
}

function accountStatus(value: string | undefined): 'configured' | 'validated' | 'warning' | 'error' | 'pending' {
  if (value === 'connected') return 'validated';
  if (value === 'warning' || value === 'error' || value === 'pending') return value;
  return 'configured';
}

function minDate(values: Array<string | undefined>): string | null {
  const present = values.filter((value): value is string => Boolean(value)).sort();
  return present[0] ?? null;
}

function maxDate(values: Array<string | undefined>): string | null {
  const present = values.filter((value): value is string => Boolean(value)).sort();
  return present.at(-1) ?? null;
}

function genericMapping(mapping: z.infer<typeof LegacyMappingSchema>): z.infer<typeof RegistryMappingSchema> {
  const repoId = repositoryId(mapping.githubOwner, mapping.githubRepo);
  return {
    mappingId: mapping.id,
    projectId: mapping.projectKey,
    repositoryId: repoId,
    sourceRepositoryId: null,
    targetRepositoryId: null,
    activeRepositoryId: null,
    serverId: mapping.serverId,
    serverPath: mapping.serverPath,
    realPath: null,
    realPathVerified: false,
    remoteVerified: false,
    domain: null,
    domainVerified: false,
    environment: 'production',
    officialBranch: mapping.officialBranch,
    allowedBranchPrefixes: ['mcp/', 'claude/', 'codex/'],
    directMainPush: false,
    status: 'proposed',
    capabilities: defaultCapabilities(),
    backupRequired: true,
    healthChecks: [],
    rollbackMethod: null,
    createdAt: mapping.createdAt ?? null,
    validatedAt: null,
    activatedAt: null,
    updatedAt: mapping.updatedAt ?? null
  };
}

function buildV2FromV1(legacy: GitRegistryV1): GitRegistryV2 {
  const connections = legacy.accounts.map((account) => ({
    connectionId: `github:${account.login}`,
    provider: 'github' as const,
    accountLogin: account.login,
    accountType: accountType(account.accountType),
    role: accountRole(account.login),
    configuredStatus: accountStatus(account.status),
    durable: true as const,
    credentialRef: null,
    credentialsInRegistry: false as const,
    connectedAt: account.connectedAt ?? null,
    lastValidatedAt: account.lastCheckedAt ?? null,
    enabledOnPublicMcpDomain: account.enabledOnPublicMcpDomain ?? false,
    autoRestoreContext: true as const,
    warnings: account.warnings ?? []
  })).sort((left, right) => left.connectionId.localeCompare(right.connectionId));

  const repositoryMap = new Map<string, z.infer<typeof RegistryRepositorySchema>>();
  for (const mapping of legacy.repoMappings) {
    const id = repositoryId(mapping.githubOwner, mapping.githubRepo);
    const existing = repositoryMap.get(id);
    repositoryMap.set(id, {
      repositoryId: id,
      owner: mapping.githubOwner,
      name: mapping.githubRepo,
      fullName: `${mapping.githubOwner}/${mapping.githubRepo}`,
      visibility: 'unknown',
      defaultBranch: mapping.officialBranch,
      archived: false,
      fork: false,
      discoveryStatus: 'recognized',
      discoveredAt: existing?.discoveredAt ?? mapping.createdAt ?? null,
      lastSeenAt: maxDate([existing?.lastSeenAt ?? undefined, mapping.updatedAt])
    });
  }
  const repositories = [...repositoryMap.values()]
    .sort((left, right) => left.repositoryId.localeCompare(right.repositoryId));

  const mcpSource = legacy.repoMappings.find((mapping) =>
    mapping.githubOwner === 'Patricked-code' && mapping.githubRepo === 'MCP'
  );
  const mcpTarget = legacy.repoMappings.find((mapping) =>
    mapping.githubOwner === 'chainsolutions-wealthtech' && mapping.githubRepo === 'MCP'
  );
  const canCollapseMcp = Boolean(
    mcpSource &&
    mcpTarget &&
    mcpSource.serverId === mcpTarget.serverId &&
    mcpSource.serverPath === mcpTarget.serverPath
  );

  const mappings: Array<z.infer<typeof RegistryMappingSchema>> = [];
  if (canCollapseMcp && mcpSource && mcpTarget) {
    const sourceId = repositoryId(mcpSource.githubOwner, mcpSource.githubRepo);
    const targetId = repositoryId(mcpTarget.githubOwner, mcpTarget.githubRepo);
    mappings.push({
      mappingId: 'mcp-s1-production',
      projectId: 'mcp_bridge',
      repositoryId: sourceId,
      sourceRepositoryId: sourceId,
      targetRepositoryId: targetId,
      activeRepositoryId: sourceId,
      serverId: mcpSource.serverId,
      serverPath: mcpSource.serverPath,
      realPath: null,
      realPathVerified: false,
      remoteVerified: false,
      domain: 'mcp.wealthtechinnovations.com',
      domainVerified: false,
      environment: 'production',
      officialBranch: mcpSource.officialBranch,
      allowedBranchPrefixes: ['mcp/', 'claude/', 'codex/'],
      directMainPush: false,
      status: 'migration_pending',
      capabilities: defaultCapabilities(),
      backupRequired: true,
      healthChecks: ['/health', '/mcp'],
      rollbackMethod: null,
      createdAt: minDate([mcpSource.createdAt, mcpTarget.createdAt]),
      validatedAt: null,
      activatedAt: null,
      updatedAt: maxDate([mcpSource.updatedAt, mcpTarget.updatedAt])
    });
  }

  for (const mapping of legacy.repoMappings) {
    if (canCollapseMcp && (mapping === mcpSource || mapping === mcpTarget)) continue;
    mappings.push(genericMapping(mapping));
  }
  mappings.sort((left, right) => left.mappingId.localeCompare(right.mappingId));

  const migrations: Array<z.infer<typeof RegistryMigrationSchema>> = [];
  if (canCollapseMcp && mcpSource && mcpTarget) {
    const sourceId = repositoryId(mcpSource.githubOwner, mcpSource.githubRepo);
    const targetId = repositoryId(mcpTarget.githubOwner, mcpTarget.githubRepo);
    migrations.push({
      migrationId: 'mcp-patricked-code-to-chainsolutions-wealthtech',
      mappingId: 'mcp-s1-production',
      domain: 'mcp.wealthtechinnovations.com',
      currentRepositoryId: sourceId,
      replacementRepositoryId: targetId,
      activeRepositoryId: sourceId,
      status: 'migration_pending',
      preserve: [
        'runtime_configuration',
        'docker_compose',
        'data_volume',
        'secrets_volume',
        'logs_volume',
        'keys_volume',
        'oauth_configuration',
        'domain',
        'tls',
        'audit_history'
      ],
      purgeAllowed: false,
      backupManifestId: null,
      rollbackReleaseId: null,
      healthChecks: ['/health', '/mcp'],
      createdAt: minDate([mcpSource.createdAt, mcpTarget.createdAt]),
      updatedAt: maxDate([mcpSource.updatedAt, mcpTarget.updatedAt])
    });
  }

  const auditEvents = legacy.auditEvents.map((event) => ({
    eventId: event.id,
    at: event.at,
    actor: event.actor,
    tool: null,
    type: event.type,
    objectId: null,
    reason: event.message,
    risk: 'low' as const,
    beforeHash: null,
    afterHash: null,
    result: 'success' as const,
    metadata: event.metadata,
    legacySchemaVersion: 1 as const
  }));

  return validateGitRegistryV2({
    schemaVersion: 2,
    updatedAt: legacy.updatedAt,
    connections,
    repositories,
    mappings,
    migrations,
    auditEvents,
    activeContext: null
  });
}

export function migrateGitRegistryToV2(input: unknown): GitRegistryV2 {
  if (input && typeof input === 'object' && (input as { schemaVersion?: unknown }).schemaVersion === 2) {
    return validateGitRegistryV2(input);
  }
  return buildV2FromV1(GitRegistryV1Schema.parse(input));
}

export function dryRunGitRegistryV2(input: unknown): {
  candidate: GitRegistryV2;
  report: GitRegistryV2DryRunReport;
} {
  const sourceSchemaVersion = input && typeof input === 'object' && (input as { schemaVersion?: unknown }).schemaVersion === 2
    ? 2
    : 1;
  const candidate = migrateGitRegistryToV2(input);
  const warnings: string[] = [];

  if (candidate.mappings.some((mapping) => mapping.status === 'migration_pending')) {
    warnings.push('Une migration est en attente ; aucun remote ni dépôt actif ne doit être modifié automatiquement.');
  }
  if (candidate.mappings.some((mapping) => !mapping.realPathVerified)) {
    warnings.push('Des chemins restent non vérifiés ; les mappings concernés ne peuvent pas devenir actifs.');
  }
  if (candidate.connections.some((connection) => connection.credentialRef === null)) {
    warnings.push('Les références de credentials doivent être rapprochées séparément de data/github-accounts.json ; aucune valeur secrète n’est copiée.');
  }

  return {
    candidate,
    report: {
      sourceSchemaVersion,
      targetSchemaVersion: 2,
      sourceHash: canonicalRegistryHash(input),
      candidateHash: canonicalRegistryHash(candidate),
      alreadyV2: sourceSchemaVersion === 2,
      counts: {
        connections: candidate.connections.length,
        repositories: candidate.repositories.length,
        mappings: candidate.mappings.length,
        migrations: candidate.migrations.length,
        auditEvents: candidate.auditEvents.length
      },
      warnings
    }
  };
}
