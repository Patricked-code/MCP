import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  readGitRegistryProjectEvidence,
  type GitRegistryProjectEvidence
} from '../github/registry.js';
import { deriveTargetContext, type TargetContext } from '../operationalMemory/targetScope.js';
import type { LiveStateTargetSelection } from './types.js';

/**
 * B3.2 / owner decision #220: an operator names, in the versioned server map,
 * the registered GitRegistry V2 project this MCP server targets. Live State
 * stays the observation authority and derives the singular TargetContext from
 * it. The list shape keeps the MULTI_PROJECT_LIVE_STATE extension additive;
 * V1 resolves at most one project.
 */
export const SERVER_TARGET_SERVER_ID = 'S1';

const MAX_SERVER_MAP_BYTES = 64 * 1024;
const MAX_CONFIGURED_TARGETS = 20;
const PROJECT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

export type ServerTargetConfiguration =
  | { status: 'NOT_CONFIGURED' }
  | { status: 'CONFIGURED'; projectIds: string[] }
  | { status: 'INVALID'; reasonCode: 'TARGET_PROJECT_CONFIGURATION_INVALID' | 'TARGET_PROJECT_CONFIGURATION_UNREADABLE' };

export type TargetProjectObservation = {
  targetSelection?: LiveStateTargetSelection;
  targetContext?: TargetContext;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function parseServerTargetConfiguration(
  serverMap: unknown,
  serverId = SERVER_TARGET_SERVER_ID
): ServerTargetConfiguration {
  if (serverMap === null || serverMap === undefined) return { status: 'NOT_CONFIGURED' };
  const invalid = { status: 'INVALID', reasonCode: 'TARGET_PROJECT_CONFIGURATION_INVALID' } as const;
  const servers = record(record(serverMap)?.servers);
  if (!servers) return invalid;
  const server = servers[serverId];
  if (server === undefined) return { status: 'NOT_CONFIGURED' };
  const entry = record(server);
  if (!entry) return invalid;
  const configured = entry.targetProjectIds;
  if (configured === undefined) return { status: 'NOT_CONFIGURED' };
  if (!Array.isArray(configured) || configured.length > MAX_CONFIGURED_TARGETS) return invalid;
  if (!configured.every((value) => typeof value === 'string' && PROJECT_ID_PATTERN.test(value))) {
    return invalid;
  }
  const projectIds = [...new Set(configured as string[])];
  return projectIds.length === 0
    ? { status: 'NOT_CONFIGURED' }
    : { status: 'CONFIGURED', projectIds };
}

function unresolved(projectIds: string[], reasonCode: string): TargetProjectObservation {
  return {
    targetSelection: {
      source: 'server_map',
      serverId: SERVER_TARGET_SERVER_ID,
      status: 'UNRESOLVED',
      projectIds,
      reasonCodes: [reasonCode]
    }
  };
}

export function resolveServerTargetProject(input: {
  configuration: ServerTargetConfiguration;
  registry: GitRegistryProjectEvidence;
  observedAt: string;
}): TargetProjectObservation {
  const { configuration } = input;
  if (configuration.status === 'NOT_CONFIGURED') return {};
  if (configuration.status === 'INVALID') return unresolved([], configuration.reasonCode);
  const { projectIds } = configuration;
  if (projectIds.length !== 1) return unresolved(projectIds, 'TARGET_PROJECT_MULTIPLE_NOT_SUPPORTED');
  if (!input.registry.available) return unresolved(projectIds, 'TARGET_PROJECT_REGISTRY_UNAVAILABLE');

  const matches = input.registry.projects.filter((project) => project.projectId === projectIds[0]);
  if (matches.length !== 1) return unresolved(projectIds, 'TARGET_PROJECT_NOT_REGISTERED');
  const project = matches[0]!;

  let targetContext: TargetContext;
  try {
    targetContext = deriveTargetContext({
      project: {
        projectId: project.projectId,
        projectUid: project.projectUid,
        globalCheckpointRepositoryId: project.globalCheckpointRepositoryId,
        centralGovernanceRepositoryId: project.centralGovernanceRepositoryId,
        repositoryComponents: project.repositoryComponents
      },
      // V1 observes no target component yet: each stays UNVERIFIED until a
      // resolver (C3/C4) contributes exact-head evidence.
      observations: [],
      observedAt: input.observedAt
    });
  } catch {
    return unresolved(projectIds, 'TARGET_PROJECT_REGISTRY_INCOMPLETE');
  }

  return {
    targetSelection: {
      source: 'server_map',
      serverId: SERVER_TARGET_SERVER_ID,
      status: 'RESOLVED',
      projectIds,
      reasonCodes: []
    },
    targetContext
  };
}

function serverMapPath(): string {
  return process.env.MCP_SERVER_MAP_FILE || path.join(process.cwd(), '.mcp', 'server-map.json');
}

/** Missing file: null (not configured). Unreadable, oversized or malformed: throws. */
export async function readServerMapConfiguration(filePath = serverMapPath()): Promise<unknown | null> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
    throw error;
  }
  if (Buffer.byteLength(raw, 'utf8') > MAX_SERVER_MAP_BYTES) throw new Error('SERVER_MAP_TOO_LARGE');
  return JSON.parse(raw) as unknown;
}

export async function collectTargetProjectObservation(dependencies: {
  readServerMap?: () => Promise<unknown | null>;
  readRegistry?: () => Promise<GitRegistryProjectEvidence>;
  now?: () => Date;
} = {}): Promise<TargetProjectObservation> {
  const readServerMap = dependencies.readServerMap ?? (() => readServerMapConfiguration());
  const readRegistry = dependencies.readRegistry ?? readGitRegistryProjectEvidence;
  const now = dependencies.now ?? (() => new Date());

  let configuration: ServerTargetConfiguration;
  try {
    configuration = parseServerTargetConfiguration(await readServerMap());
  } catch {
    configuration = { status: 'INVALID', reasonCode: 'TARGET_PROJECT_CONFIGURATION_UNREADABLE' };
  }
  if (configuration.status === 'NOT_CONFIGURED') return {};

  const registry = configuration.status === 'CONFIGURED'
    ? await readRegistry()
    : { available: false, sourceSchemaVersion: null, digest: null, candidateDigest: null, mappings: [], projects: [], activationReadiness: [] } satisfies GitRegistryProjectEvidence;
  return resolveServerTargetProject({
    configuration,
    registry,
    observedAt: now().toISOString()
  });
}
