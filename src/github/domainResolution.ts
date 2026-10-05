import {
  DomainResolutionInputSchema,
  resolveDomain,
  type DomainResolution,
  type DomainResolutionInput,
  type DomainResolutionReasonCode
} from '../governedWorkflow/resolvers/domain.js';
import type { ServerResolution } from '../governedWorkflow/resolvers/server.js';
import type { GithubProjectResolution } from './projectResolution.js';
import type { GitRegistryProjectEvidence } from './registry.js';

/**
 * C5 (TB-W3-C5-01): the GWC domain resolver (GW-09) composed after the C2
 * project and C3 server resolutions. GitRegistry project and mapping domains
 * are declarations; only a current observation of what the resolved server
 * serves proves a domain. No such observation authority exists in the runtime
 * yet, so the surface stays UNVERIFIED, never NONE. Protected-domain safety
 * lists are never the domain model. Read-only: no probe, store or vhost change.
 */
const UNRESOLVED_SERVER = 'unresolved';

export type ProjectDomainResolutionSource = {
  project: GithubProjectResolution;
  server: ServerResolution;
  registry: GitRegistryProjectEvidence;
  /** Current domain observation of the resolved server; null when no authority answers. */
  observation: unknown;
  observedAt: string;
};

/** The absence of a domain observation, bound to the server it would observe. */
export function unavailableDomainObservation(
  serverId: string,
  observedAt: string
): DomainResolutionInput['observation'] {
  return { available: false, freshness: 'UNKNOWN', observedAt, serverId, domains: [] };
}

/** A bounded UNVERIFIED domain resolution for evidence the resolver cannot evaluate. */
export function unverifiedDomainResolution(input: {
  observedAt: string;
  reasonCode: DomainResolutionReasonCode;
  provenance: readonly string[];
  registryDigest?: string | null;
  candidateDigest?: string | null;
}): DomainResolution {
  return Object.freeze({
    status: 'UNVERIFIED' as const,
    observedAt: input.observedAt,
    projectId: null,
    serverId: null,
    surface: Object.freeze([]),
    excludedHistoricalVhosts: Object.freeze([]),
    freshness: 'UNKNOWN' as const,
    provenance: Object.freeze([...input.provenance]),
    reasonCodes: Object.freeze([input.reasonCode]),
    registryDigest: input.registryDigest ?? null,
    candidateDigest: input.candidateDigest ?? null,
    authorizationInferred: false as const,
    mutationPerformed: false as const,
    vhostMutationPerformed: false as const
  });
}

export function resolveProjectDomain(source: ProjectDomainResolutionSource): DomainResolution {
  const { registry, observedAt } = source;
  const shape = DomainResolutionInputSchema.shape;
  const declared = registry.domainEvidence;
  const available = registry.available && declared !== undefined;
  const declarations = shape.registry.safeParse({
    available,
    freshness: available ? 'CURRENT' : 'UNKNOWN',
    digest: registry.digest,
    candidateDigest: registry.candidateDigest,
    projects: declared?.projects ?? [],
    mappings: declared?.mappings ?? []
  });
  // Invalid declarations make the registry unavailable (fail closed).
  const registryEvidence: DomainResolutionInput['registry'] = declarations.success
    ? declarations.data
    : { available: false, freshness: 'UNKNOWN', digest: null, candidateDigest: null, projects: [], mappings: [] };

  // Missing or malformed observation evidence is an unavailable observation.
  const observed = source.observation === null ? null : shape.observation.safeParse(source.observation);
  const observation = observed?.success
    ? observed.data
    : unavailableDomainObservation(source.server.selectedServer?.serverId ?? UNRESOLVED_SERVER, observedAt);

  const input = DomainResolutionInputSchema.safeParse({
    project: source.project,
    server: source.server,
    registry: registryEvidence,
    observation,
    observedAt
  });
  if (!input.success) {
    return unverifiedDomainResolution({
      observedAt,
      reasonCode: 'DOMAIN_PROJECT_UNVERIFIED',
      provenance: ['project_resolution', 'server_resolution'],
      registryDigest: registry.digest,
      candidateDigest: registry.candidateDigest
    });
  }
  const resolution = resolveDomain(input.data);
  // A V1 registry is migrated in memory: its V2 domain declarations are a candidate.
  return registry.sourceSchemaVersion === 1 && resolution.provenance.includes('git_registry_domain_data')
    ? Object.freeze({
        ...resolution,
        provenance: Object.freeze([...resolution.provenance, 'git_registry_v2_candidate_from_v1'])
      })
    : resolution;
}
