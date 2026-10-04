import { z } from 'zod';

import {
  RuntimeComponentSchema,
  RuntimeObservationSchema,
  RuntimeResolutionInputSchema,
  resolveRuntime,
  type RuntimeComponent,
  type RuntimeFreshness,
  type RuntimeObservation,
  type RuntimeResolution,
  type RuntimeResolutionReasonCode
} from '../governedWorkflow/resolvers/runtime.js';
import type { ServerResolution } from '../governedWorkflow/resolvers/server.js';
import type { GithubProjectResolution } from './projectResolution.js';
import type { GitRegistryProjectEvidence } from './registry.js';

/**
 * C4 (TB-W3-C4-01): the GWC runtime resolver (GW-08) composed after the C3
 * server resolution. OD-04: server observation stays the runtime truth; only
 * bounded observations from an existing observation authority are bound, by
 * repository, to the project's GitRegistry components. GitRegistry V2 declares
 * no runtime, so nothing is cross-checked or invented, and port/reverse-proxy
 * bindings have no runtime observation authority. Missing evidence stays
 * UNVERIFIED, never NO_RUNTIME. Read-only: no SSH, restart, rebuild or store.
 */
const MAX_OBSERVATIONS = 50;

/** An observed runtime of a server, not yet bound to a project component. */
export const ServerRuntimeObservationSchema = RuntimeObservationSchema
  .omit({ componentId: true, componentRole: true })
  .extend({ provenance: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/) })
  .strict();
export type ServerRuntimeObservation = z.infer<typeof ServerRuntimeObservationSchema>;

export type ProjectRuntimeResolutionSource = {
  server: ServerResolution;
  project: GithubProjectResolution;
  registry: GitRegistryProjectEvidence;
  /** Observations of the runtime observation authorities; null when unreadable. */
  observations: readonly unknown[] | null;
  observedAt: string;
};

function sameRepository(left: string, right: string): boolean {
  const normalize = (value: string) => value.replace(/^github:/i, '').toLowerCase();
  return normalize(left) === normalize(right);
}

type ComponentEvidence = { components: RuntimeComponent[]; provenance: string };

function componentEvidence(
  project: GithubProjectResolution,
  registry: GitRegistryProjectEvidence
): ComponentEvidence | null {
  const mapping = project.selectedMapping;
  if (project.status !== 'RESOLVED' || !mapping) return null;
  const projectId = project.selectedProject?.projectId ?? mapping.projectId;
  const registered = registry.projects.filter((entry) => entry.projectId === projectId);
  if (registered.length > 1) return null;
  const components = registered.length === 1
    ? registered[0]!.repositoryComponents.map((component) => ({
        componentId: component.mappingId,
        repositoryId: component.repositoryId,
        componentRole: component.role
      }))
    : mapping.componentRole
      ? [{ componentId: mapping.mappingId, repositoryId: mapping.repositoryId, componentRole: mapping.componentRole }]
      : [];
  if (components.length === 0) return null;
  const parsed = z.array(RuntimeComponentSchema).max(500).safeParse(components);
  if (!parsed.success) return null;
  return {
    components: parsed.data,
    provenance: registered.length === 1 ? 'git_registry_project_components' : 'git_registry_mapping_component'
  };
}

/**
 * The project's components as GitRegistry declares them: the repository
 * components of its registered project, or the selected mapping alone when it
 * declares its role. Null when the relation cannot be proven.
 */
export function projectRuntimeComponents(
  project: GithubProjectResolution,
  registry: GitRegistryProjectEvidence
): RuntimeComponent[] | null {
  return componentEvidence(project, registry)?.components ?? null;
}

/** A bounded UNVERIFIED runtime resolution for evidence the resolver cannot evaluate. */
export function unverifiedRuntimeResolution(input: {
  observedAt: string;
  reasonCode: RuntimeResolutionReasonCode;
  provenance: readonly string[];
  serverId?: string | null;
  freshness?: RuntimeFreshness;
}): RuntimeResolution {
  return Object.freeze({
    status: 'UNVERIFIED' as const,
    observedAt: input.observedAt,
    serverId: input.serverId ?? null,
    cardinality: 'UNKNOWN' as const,
    bindings: Object.freeze([]),
    freshness: input.freshness ?? 'UNKNOWN',
    provenance: Object.freeze([...input.provenance]),
    reasonCodes: Object.freeze([input.reasonCode]),
    authorizationInferred: false as const,
    mutationPerformed: false as const,
    runtimeMutationPerformed: false as const
  });
}

function withProvenance(resolution: RuntimeResolution, extra: readonly string[]): RuntimeResolution {
  return Object.freeze({
    ...resolution,
    provenance: Object.freeze([...new Set([...resolution.provenance, ...extra])])
  });
}

export function resolveProjectRuntime(source: ProjectRuntimeResolutionSource): RuntimeResolution {
  const { server, observedAt } = source;
  const serverReady = server.status === 'RESOLVED' && server.freshness === 'CURRENT' && server.selectedServer !== null;
  const evaluate = (components: RuntimeComponent[], observations: RuntimeObservation[]): RuntimeResolution => {
    const input = RuntimeResolutionInputSchema.safeParse({
      server,
      components,
      observations,
      declarations: [],
      runtimeHint: null,
      observedAt
    });
    return input.success
      ? resolveRuntime(input.data)
      : unverifiedRuntimeResolution({
          observedAt,
          reasonCode: serverReady ? 'RUNTIME_BINDING_INVALID' : 'RUNTIME_SERVER_UNVERIFIED',
          provenance: ['server_resolution', 'runtime_observation'],
          serverId: server.selectedServer?.serverId ?? null
        });
  };

  // GW-08 refuses an unresolved, stale or missing server before anything else.
  if (!serverReady || !server.selectedServer) return evaluate([], []);
  const serverId = server.selectedServer.serverId;
  const unverified = (reasonCode: RuntimeResolutionReasonCode, provenance: string[]) =>
    unverifiedRuntimeResolution({ observedAt, reasonCode, provenance, serverId });

  const evidence = componentEvidence(source.project, source.registry);
  if (evidence === null) {
    return unverified('RUNTIME_COMPONENT_UNVERIFIED', ['server_resolution', 'git_registry_project_components']);
  }
  const { components } = evidence;
  const componentProvenance = [
    evidence.provenance,
    // A V1 registry is migrated in memory: its V2 components are a candidate.
    ...(source.registry.sourceSchemaVersion === 1 ? ['git_registry_v2_candidate_from_v1'] : [])
  ];

  // Malformed or unreadable observation evidence makes the authority unavailable.
  const parsed = source.observations === null
    ? null
    : z.array(ServerRuntimeObservationSchema).max(MAX_OBSERVATIONS).safeParse(source.observations);
  if (!parsed?.success) {
    return unverified('RUNTIME_OBSERVATION_UNAVAILABLE', ['server_resolution', 'runtime_observation', ...componentProvenance]);
  }

  const bound: RuntimeObservation[] = [];
  const observationProvenance: string[] = [];
  for (const { provenance, ...observation } of parsed.data) {
    const matches = components.filter((component) => sameRepository(component.repositoryId, observation.repositoryId));
    if (matches.length === 0) continue; // another repository's runtime, not this project's
    if (matches.length > 1) {
      return unverified('RUNTIME_COMPONENT_UNVERIFIED', ['server_resolution', 'runtime_observation', ...componentProvenance]);
    }
    const component = matches[0]!;
    bound.push({
      ...observation,
      componentId: component.componentId,
      repositoryId: component.repositoryId,
      componentRole: component.componentRole
    });
    observationProvenance.push(provenance);
  }

  return withProvenance(evaluate(components, bound), [...componentProvenance, ...observationProvenance]);
}
