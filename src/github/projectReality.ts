import type { DomainResolution } from '../governedWorkflow/resolvers/domain.js';
import type { RuntimeResolution } from '../governedWorkflow/resolvers/runtime.js';
import type { ServerResolution } from '../governedWorkflow/resolvers/server.js';
import type { GithubProjectResolution } from './projectResolution.js';
import type { GithubRepositoryResolution } from './repositoryResolution.js';

/**
 * C345-02 (TB-W3-C345-02): the project reality composed from the repository
 * (GW-05), project (GW-06), server (GW-07), runtime (GW-08) and domain (GW-09)
 * resolutions, with the domain -> reverse proxy -> port -> runtime ingress link
 * between runtime and domain. Each layer keeps its resolver's evidence. A layer
 * is VERIFIED only when its resolution is current, every layer it composes on
 * is VERIFIED and it is bound to them. Contradictions are never normalized:
 * they make the reality CONFLICT. No ingress observation authority exists, so
 * ingress stays UNVERIFIED unless the public surface is confirmed absent.
 * Pure and read-only: no probe, store or authorization is derived.
 */
export const PROJECT_REALITY_LAYERS = [
  'REPOSITORY',
  'PROJECT',
  'SERVER',
  'RUNTIME',
  'INGRESS',
  'DOMAIN'
] as const;
export type ProjectRealityLayerId = typeof PROJECT_REALITY_LAYERS[number];
export type ProjectRealityState = 'VERIFIED' | 'UNVERIFIED' | 'STALE' | 'AMBIGUOUS' | 'CONFLICT' | 'NONE';
export type ProjectRealityReasonCode =
  | 'PROJECT_REALITY_LAYER_UNAVAILABLE'
  | 'PROJECT_REALITY_UPSTREAM_UNVERIFIED'
  | 'PROJECT_REALITY_REPOSITORY_BINDING_MISMATCH'
  | 'PROJECT_REALITY_PROJECT_BINDING_MISMATCH'
  | 'PROJECT_REALITY_SERVER_BINDING_MISMATCH'
  | 'PROJECT_REALITY_DOMAIN_BINDING_MISMATCH'
  | 'INGRESS_OBSERVATION_UNAVAILABLE'
  | 'INGRESS_NONE_WITHOUT_DOMAIN';

export type ProjectRealityLayer = Readonly<{
  layer: ProjectRealityLayerId;
  /** GWC contract of the layer's resolver; null for ingress, which has none. */
  contract: 'GW-05' | 'GW-06' | 'GW-07' | 'GW-08' | 'GW-09' | null;
  state: ProjectRealityState;
  /** Status reported by the layer's resolver; null when no resolution exists. */
  resolutionStatus: 'RESOLVED' | 'NONE' | 'AMBIGUOUS' | 'UNVERIFIED' | null;
  freshness: 'CURRENT' | 'STALE' | 'UNKNOWN';
  observedAt: string | null;
  reasonCodes: readonly string[];
  provenance: readonly string[];
}>;

export type ProjectRealityContradiction = Readonly<{
  layer: ProjectRealityLayerId;
  reasonCode: string;
}>;

export type ProjectReality = Readonly<{
  status: ProjectRealityState;
  observedAt: string;
  /** Identifiers come from VERIFIED layers only. */
  repositoryId: string | null;
  projectId: string | null;
  serverId: string | null;
  layers: readonly ProjectRealityLayer[];
  firstBlockingLayer: ProjectRealityLayerId | null;
  contradictions: readonly ProjectRealityContradiction[];
  authorizationInferred: false;
  mutationPerformed: false;
}>;

export type ProjectRealitySource = {
  repository?: GithubRepositoryResolution | null;
  project?: GithubProjectResolution | null;
  server?: ServerResolution | null;
  runtime?: RuntimeResolution | null;
  domain?: DomainResolution | null;
  observedAt: string;
};

/** Resolver reason codes that report contradicting evidence, not missing evidence. */
const CONTRADICTION_CODES: ReadonlySet<string> = new Set([
  'GITHUB_REPOSITORY_ACCOUNT_CONTEXT_MISMATCH',
  'GITHUB_PROJECT_REGISTRY_MISMATCH',
  'GITHUB_PROJECT_REFERENCE_UNVERIFIED',
  'SERVER_REGISTRY_MISMATCH',
  'RUNTIME_SERVER_MISMATCH',
  'RUNTIME_DECLARATION_CONFLICT',
  'RUNTIME_NONE_CONFLICT',
  'DOMAIN_REGISTRY_MISMATCH',
  'DOMAIN_SERVER_MISMATCH',
  'DOMAIN_PROJECT_REFERENCE_UNVERIFIED',
  'DOMAIN_HISTORICAL_DECLARATION_CONFLICT',
  'DOMAIN_OBSERVATION_UNDECLARED',
  'DOMAIN_DECLARATION_UNOBSERVED'
]);

/** A proven absence the reality accepts: no runtime, no ingress, no public surface. */
const ACCEPTED_NONE: ReadonlySet<ProjectRealityLayerId> = new Set(['RUNTIME', 'INGRESS', 'DOMAIN']);
const MAX_ENTRIES = 20;

type LayerEvidence = Readonly<{
  status: 'RESOLVED' | 'NONE' | 'AMBIGUOUS' | 'UNVERIFIED';
  freshness: 'CURRENT' | 'STALE' | 'UNKNOWN';
  observedAt: string;
  reasonCodes: readonly string[];
  provenance: readonly string[];
}>;

function bounded(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].slice(0, MAX_ENTRIES));
}

function sameRepository(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalize = (value: string) => value.trim().replace(/^github:/i, '').toLowerCase();
  return typeof left === 'string' && typeof right === 'string' && normalize(left) === normalize(right);
}

function sameServer(left: string | null | undefined, right: string | null | undefined): boolean {
  return typeof left === 'string' && typeof right === 'string'
    && left.trim().toLowerCase() === right.trim().toLowerCase();
}

function projectIdOf(project: GithubProjectResolution | null | undefined): string | null {
  return project?.selectedProject?.projectId ?? project?.selectedMapping?.projectId ?? null;
}

function baseState(evidence: LayerEvidence, provenAbsent: boolean): ProjectRealityState {
  if (evidence.reasonCodes.some((code) => CONTRADICTION_CODES.has(code))) return 'CONFLICT';
  if (evidence.freshness === 'STALE') return 'STALE';
  if (evidence.status === 'AMBIGUOUS') return 'AMBIGUOUS';
  if (evidence.status === 'NONE') return 'NONE';
  if (evidence.status === 'RESOLVED' && evidence.freshness === 'CURRENT') {
    return provenAbsent ? 'NONE' : 'VERIFIED';
  }
  return 'UNVERIFIED';
}

export function deriveProjectReality(source: ProjectRealitySource): ProjectReality {
  const { repository, project, server, runtime, domain } = source;
  const layers = new Map<ProjectRealityLayerId, ProjectRealityLayer>();
  const contradictions: ProjectRealityContradiction[] = [];
  const stateOf = (id: ProjectRealityLayerId) => layers.get(id)?.state;

  function record(
    layer: ProjectRealityLayerId,
    contract: ProjectRealityLayer['contract'],
    state: ProjectRealityState,
    evidence: LayerEvidence | null,
    reasonCodes: readonly string[]
  ): void {
    layers.set(layer, Object.freeze({
      layer,
      contract,
      state,
      resolutionStatus: evidence?.status ?? null,
      freshness: evidence?.freshness ?? 'UNKNOWN',
      observedAt: evidence?.observedAt ?? null,
      reasonCodes: bounded(reasonCodes),
      provenance: bounded(evidence?.provenance ?? [])
    }));
  }

  function settle(
    layer: ProjectRealityLayerId,
    contract: Exclude<ProjectRealityLayer['contract'], null>,
    evidence: LayerEvidence | null | undefined,
    upstream: readonly ProjectRealityLayerId[],
    bound: () => boolean,
    mismatch: ProjectRealityReasonCode,
    provenAbsent = false
  ): void {
    if (!evidence) {
      record(layer, contract, 'UNVERIFIED', null, ['PROJECT_REALITY_LAYER_UNAVAILABLE']);
      return;
    }
    const reasonCodes = [...evidence.reasonCodes];
    for (const code of evidence.reasonCodes) {
      if (CONTRADICTION_CODES.has(code)) contradictions.push(Object.freeze({ layer, reasonCode: code }));
    }
    let state = baseState(evidence, provenAbsent);
    if (state === 'VERIFIED' || state === 'NONE') {
      if (!upstream.every((id) => stateOf(id) === 'VERIFIED')) {
        // A layer never verifies, or proves absent, past a layer it composes on.
        state = 'UNVERIFIED';
        reasonCodes.push('PROJECT_REALITY_UPSTREAM_UNVERIFIED');
      } else if (!bound()) {
        state = 'CONFLICT';
        reasonCodes.push(mismatch);
        contradictions.push(Object.freeze({ layer, reasonCode: mismatch }));
      }
    }
    record(layer, contract, state, evidence, reasonCodes);
  }

  const selectedServerId = server?.selectedServer?.serverId ?? null;
  settle('REPOSITORY', 'GW-05', repository, [], () => true, 'PROJECT_REALITY_REPOSITORY_BINDING_MISMATCH');
  settle('PROJECT', 'GW-06', project, ['REPOSITORY'], () => {
    const repositoryId = repository?.selectedRepository?.repositoryId;
    const mappingRepositoryId = project?.selectedMapping?.repositoryId;
    return sameRepository(project?.repositoryId, repositoryId)
      && (mappingRepositoryId === undefined || sameRepository(mappingRepositoryId, repositoryId));
  }, 'PROJECT_REALITY_REPOSITORY_BINDING_MISMATCH');
  settle('SERVER', 'GW-07', server, ['PROJECT'], () => (
    server?.projectId === projectIdOf(project)
    && (server?.projectMappingId === null || server?.projectMappingId === project?.selectedMapping?.mappingId)
  ), 'PROJECT_REALITY_PROJECT_BINDING_MISMATCH');
  settle('RUNTIME', 'GW-08', runtime, ['SERVER'], () => (
    sameServer(runtime?.serverId, selectedServerId)
    && (runtime?.bindings ?? []).every((binding) => sameServer(binding.serverId, selectedServerId))
  ), 'PROJECT_REALITY_SERVER_BINDING_MISMATCH', runtime?.cardinality === 'NO_RUNTIME');
  settle('DOMAIN', 'GW-09', domain, ['PROJECT', 'SERVER'], () => (
    domain?.projectId === projectIdOf(project) && sameServer(domain?.serverId, selectedServerId)
  ), 'PROJECT_REALITY_DOMAIN_BINDING_MISMATCH');

  // The ingress link has no observation authority: only a confirmed absence of
  // public surface leaves no ingress to prove.
  const domainLayer = layers.get('DOMAIN');
  if (domainLayer?.state === 'NONE') {
    layers.set('INGRESS', Object.freeze({
      layer: 'INGRESS',
      contract: null,
      state: 'NONE',
      resolutionStatus: null,
      freshness: domainLayer.freshness,
      observedAt: domainLayer.observedAt,
      reasonCodes: bounded(['INGRESS_NONE_WITHOUT_DOMAIN']),
      provenance: bounded(['domain_resolution'])
    }));
  } else {
    record('INGRESS', null, 'UNVERIFIED', null, ['INGRESS_OBSERVATION_UNAVAILABLE']);
  }

  const ordered = PROJECT_REALITY_LAYERS.map((id) => layers.get(id)!);
  const blocking = ordered.find((entry) => (
    entry.state !== 'VERIFIED' && !(entry.state === 'NONE' && ACCEPTED_NONE.has(entry.layer))
  )) ?? null;
  const verified = (id: ProjectRealityLayerId) => stateOf(id) === 'VERIFIED';
  const rank = (id: ProjectRealityLayerId) => PROJECT_REALITY_LAYERS.indexOf(id);

  return Object.freeze({
    status: contradictions.length > 0 ? 'CONFLICT' : blocking?.state ?? 'VERIFIED',
    observedAt: source.observedAt,
    repositoryId: verified('REPOSITORY') ? repository?.selectedRepository?.repositoryId ?? null : null,
    projectId: verified('PROJECT') ? projectIdOf(project) : null,
    serverId: verified('SERVER') ? selectedServerId : null,
    layers: Object.freeze(ordered),
    firstBlockingLayer: blocking?.layer ?? null,
    contradictions: Object.freeze(
      [...contradictions].sort((left, right) => rank(left.layer) - rank(right.layer)).slice(0, MAX_ENTRIES)
    ),
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}
