import {
  ServerResolutionInputSchema,
  resolveServer,
  type ServerResolution,
  type ServerResolutionInput,
  type ServerResolutionReasonCode
} from '../governedWorkflow/resolvers/server.js';
import type { GithubProjectResolution } from './projectResolution.js';
import type { GitRegistryProjectEvidence } from './registry.js';

/**
 * C3 (TB-W3-C3-01): the GWC server resolver (GW-07) composed at runtime after
 * the C2 project resolution, from existing authorities only: GitRegistry V2
 * server bindings, the managed server identities of this runtime and the
 * versioned `.mcp/server-map.json`. Resolution is read-only: it never guesses
 * a server, never calls SSH and never exposes connection material. Declared
 * paths stay declared; only GitRegistry `realPathVerified` marks a verified one.
 */
const SERVER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const MAX_DECLARED_SERVERS = 100;

export type ProjectServerResolutionSource = {
  project: GithubProjectResolution;
  registry: GitRegistryProjectEvidence;
  /** Parsed `.mcp/server-map.json`; null when absent or unreadable. */
  serverMap: unknown;
  /** Server identities managed by this runtime configuration. */
  managedServerIds: readonly string[];
  observedAt: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/**
 * Canonical identities are the managed server ids that the server map also
 * declares (case-insensitive), spelled as managed: stored ids such as `s1`
 * resolve to themselves. A server only one source knows is never canonical.
 */
export function canonicalServerIdentities(
  serverMap: unknown,
  managedServerIds: readonly string[]
): string[] {
  const servers = record(record(serverMap)?.servers);
  if (!servers) return [];
  const declared = Object.keys(servers);
  if (declared.length > MAX_DECLARED_SERVERS || !declared.every((id) => SERVER_ID_PATTERN.test(id))) return [];
  const declaredKeys = new Set(declared.map((id) => id.toLowerCase()));
  return [...new Set(managedServerIds)]
    .filter((id) => SERVER_ID_PATTERN.test(id) && declaredKeys.has(id.toLowerCase()))
    .sort();
}

/** A bounded UNVERIFIED resolution for evidence the resolver cannot evaluate. */
export function unverifiedServerResolution(input: {
  observedAt: string;
  reasonCode: ServerResolutionReasonCode;
  provenance: readonly string[];
  registryDigest?: string | null;
  candidateDigest?: string | null;
}): ServerResolution {
  return Object.freeze({
    status: 'UNVERIFIED' as const,
    observedAt: input.observedAt,
    projectId: null,
    selectedServer: null,
    candidates: Object.freeze([]),
    candidateCount: 0,
    freshness: 'UNKNOWN' as const,
    provenance: Object.freeze([...input.provenance]),
    reasonCodes: Object.freeze([input.reasonCode]),
    registryDigest: input.registryDigest ?? null,
    candidateDigest: input.candidateDigest ?? null,
    projectMappingId: null,
    canonicalServerIds: Object.freeze([]),
    authorizationInferred: false as const,
    mutationPerformed: false as const,
    sshMutationPerformed: false as const
  });
}

export function resolveProjectServer(source: ProjectServerResolutionSource): ServerResolution {
  const bindings = Array.isArray(source.registry.serverBindings) ? source.registry.serverBindings : null;
  const base = {
    project: source.project,
    canonicalServerIds: canonicalServerIdentities(source.serverMap, source.managedServerIds),
    serverHint: null,
    observedAt: source.observedAt
  };
  const available = source.registry.available && bindings !== null;
  const withRegistry: ServerResolutionInput = {
    ...base,
    registry: {
      available,
      freshness: available ? 'CURRENT' : 'UNKNOWN',
      digest: source.registry.digest,
      candidateDigest: source.registry.candidateDigest,
      mappings: bindings ?? []
    }
  };
  // Invalid server evidence makes the registry unavailable (fail closed).
  const withoutRegistry: ServerResolutionInput = {
    ...base,
    registry: { available: false, freshness: 'UNKNOWN', digest: null, candidateDigest: null, mappings: [] }
  };
  const input = [withRegistry, withoutRegistry]
    .find((candidate) => ServerResolutionInputSchema.safeParse(candidate).success);
  if (!input) {
    return unverifiedServerResolution({
      observedAt: source.observedAt,
      reasonCode: 'SERVER_PROJECT_UNVERIFIED',
      provenance: ['github_project_resolution'],
      registryDigest: source.registry.digest,
      candidateDigest: source.registry.candidateDigest
    });
  }
  const resolution = resolveServer(input);
  // A V1 registry is migrated in memory: its V2 server evidence is a candidate.
  return source.registry.sourceSchemaVersion === 1 && resolution.provenance.includes('git_registry_server_binding')
    ? Object.freeze({
        ...resolution,
        provenance: Object.freeze([...resolution.provenance, 'git_registry_v2_candidate_from_v1'])
      })
    : resolution;
}
