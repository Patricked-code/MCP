import { z } from 'zod';

import type {
  GovernedContractSubstrate,
  GovernedStepId
} from '../contractSubstrate.js';

const BoundedId = z.string().trim().min(1).max(300);
const BoundedDomain = z.string().trim().min(1).max(253);
const BoundedEvidenceRef = z.string().trim().min(1).max(500);
const Sha256 = z.string().regex(/^[0-9a-f]{64}$/i);

const ProjectProjectionSchema = z.object({
  status: z.enum(['RESOLVED', 'NONE', 'AMBIGUOUS', 'UNVERIFIED']),
  observedAt: z.string().datetime({ offset: true }),
  freshness: z.enum(['CURRENT', 'STALE', 'UNKNOWN']),
  selectedMapping: z.object({
    mappingId: BoundedId,
    repositoryId: BoundedId,
    projectId: BoundedId
  }).passthrough().nullable(),
  selectedProject: z.object({
    projectId: BoundedId
  }).passthrough().nullable(),
  registryDigest: z.string().min(1).max(256).nullable(),
  candidateDigest: z.string().min(1).max(256).nullable()
}).passthrough();

const ServerProjectionSchema = z.object({
  status: z.enum(['RESOLVED', 'NONE', 'AMBIGUOUS', 'UNVERIFIED']),
  observedAt: z.string().datetime({ offset: true }),
  projectId: BoundedId.nullable(),
  selectedServer: z.object({
    serverId: BoundedId
  }).passthrough().nullable(),
  freshness: z.enum(['CURRENT', 'STALE', 'UNKNOWN'])
}).passthrough();

const HistoricalVhostSchema = z.object({
  historicalVhostId: BoundedId,
  classification: z.literal('HISTORICAL_VHOST'),
  serverId: BoundedId,
  serverPath: z.string().trim().min(1).max(1_000),
  domain: BoundedDomain,
  repositoryId: z.null(),
  current: z.literal(false),
  deploymentSource: z.literal(false)
}).passthrough();

const RegistryProjectDomainSchema = z.object({
  projectId: BoundedId,
  publicDomain: BoundedDomain.nullable(),
  publicApi: z.string().url().max(1_000).nullable(),
  historicalVhosts: z.array(HistoricalVhostSchema).max(100)
}).passthrough();

const RegistryMappingDomainSchema = z.object({
  mappingId: BoundedId,
  repositoryId: BoundedId,
  projectId: BoundedId,
  componentRole: z.string().trim().min(1).max(100).nullable(),
  serverId: BoundedId,
  domain: BoundedDomain.nullable(),
  domainVerified: z.boolean()
}).passthrough();

const RegistryDomainEvidenceSchema = z.object({
  available: z.boolean(),
  freshness: z.enum(['CURRENT', 'STALE', 'UNKNOWN']),
  digest: Sha256.nullable(),
  candidateDigest: Sha256.nullable(),
  projects: z.array(RegistryProjectDomainSchema).max(200),
  mappings: z.array(RegistryMappingDomainSchema).max(1_000)
}).strict();

const DomainObservationEntrySchema = z.object({
  domain: BoundedDomain,
  verified: z.boolean(),
  evidenceRef: BoundedEvidenceRef
}).strict();

const DomainObservationSchema = z.object({
  available: z.boolean(),
  freshness: z.enum(['CURRENT', 'STALE', 'UNKNOWN']),
  observedAt: z.string().datetime({ offset: true }),
  serverId: BoundedId,
  domains: z.array(DomainObservationEntrySchema).max(1_000)
}).strict();

export const DomainResolutionInputSchema = z.object({
  project: ProjectProjectionSchema,
  server: ServerProjectionSchema,
  registry: RegistryDomainEvidenceSchema,
  observation: DomainObservationSchema,
  observedAt: z.string().datetime({ offset: true })
}).strict();
export type DomainResolutionInput = z.infer<typeof DomainResolutionInputSchema>;

export type DomainResolutionStatus = 'RESOLVED' | 'NONE' | 'AMBIGUOUS' | 'UNVERIFIED';
export type DomainResolutionFreshness = 'CURRENT' | 'STALE' | 'UNKNOWN';
export type DomainRole = 'API' | 'FRONTEND' | 'OTHER';

export type DomainResolutionReasonCode =
  | 'DOMAIN_PROJECT_AMBIGUOUS'
  | 'DOMAIN_PROJECT_NONE'
  | 'DOMAIN_PROJECT_UNVERIFIED'
  | 'DOMAIN_SERVER_UNVERIFIED'
  | 'DOMAIN_REGISTRY_UNAVAILABLE'
  | 'DOMAIN_REGISTRY_MISMATCH'
  | 'DOMAIN_EVIDENCE_STALE'
  | 'DOMAIN_OBSERVATION_UNAVAILABLE'
  | 'DOMAIN_SERVER_MISMATCH'
  | 'DOMAIN_PROJECT_REFERENCE_UNVERIFIED'
  | 'DOMAIN_OBSERVATION_UNVERIFIED'
  | 'DOMAIN_HISTORICAL_DECLARATION_CONFLICT'
  | 'DOMAIN_ROLE_AMBIGUOUS'
  | 'DOMAIN_OBSERVATION_UNDECLARED'
  | 'DOMAIN_DECLARATION_UNOBSERVED'
  | 'DOMAIN_DECLARATION_MISSING'
  | 'DOMAIN_NONE_CONFIRMED';

export type ResolvedDomainSurface = Readonly<{
  role: DomainRole;
  domain: string;
  endpoint: string;
  verified: true;
  evidenceRefs: readonly string[];
}>;

export type DomainResolution = Readonly<{
  status: DomainResolutionStatus;
  observedAt: string;
  projectId: string | null;
  serverId: string | null;
  surface: readonly ResolvedDomainSurface[];
  excludedHistoricalVhosts: readonly string[];
  freshness: DomainResolutionFreshness;
  provenance: readonly string[];
  reasonCodes: readonly DomainResolutionReasonCode[];
  registryDigest: string | null;
  candidateDigest: string | null;
  authorizationInferred: false;
  mutationPerformed: false;
  vhostMutationPerformed: false;
}>;

export type DomainResolverContractResult = Readonly<{
  contract: Readonly<{
    stepId: GovernedStepId;
    contractVersion: number;
  }>;
  status: DomainResolutionStatus;
  observedAt: string;
  freshness: DomainResolutionFreshness;
  provenance: readonly string[];
  reasonCodes: readonly DomainResolutionReasonCode[];
  payload: DomainResolution;
  authorizationInferred: false;
  mutationPerformed: false;
  vhostMutationPerformed: false;
  replayModel: 'READ_ONLY';
}>;

type ParsedInput = z.infer<typeof DomainResolutionInputSchema>;

type DomainDeclaration = {
  role: DomainRole;
  domain: string;
  endpoint: string;
  evidenceRefs: string[];
};

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, '');
}

function sameId(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function roleFromComponentRole(value: string | null): DomainRole {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'API') return 'API';
  if (normalized === 'FRONTEND') return 'FRONTEND';
  return 'OTHER';
}

function endpointForDomain(domain: string): string {
  return `https://${domain}`;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function immutableSurface(entries: ResolvedDomainSurface[]): readonly ResolvedDomainSurface[] {
  return Object.freeze(entries.map((entry) => Object.freeze({
    ...entry,
    evidenceRefs: Object.freeze([...entry.evidenceRefs])
  })));
}

function unresolved(
  input: ParsedInput,
  status: Exclude<DomainResolutionStatus, 'RESOLVED'>,
  reasonCode: DomainResolutionReasonCode,
  options: {
    freshness?: DomainResolutionFreshness;
    projectId?: string | null;
    serverId?: string | null;
    surface?: ResolvedDomainSurface[];
    historical?: string[];
    provenance?: string[];
  } = {}
): DomainResolution {
  return Object.freeze({
    status,
    observedAt: input.observedAt,
    projectId: options.projectId
      ?? input.project.selectedProject?.projectId
      ?? input.project.selectedMapping?.projectId
      ?? null,
    serverId: options.serverId ?? input.server.selectedServer?.serverId ?? null,
    surface: immutableSurface(options.surface ?? []),
    excludedHistoricalVhosts: Object.freeze(uniqueSorted(options.historical ?? [])),
    freshness: options.freshness
      ?? (input.project.freshness === 'STALE'
        || input.server.freshness === 'STALE'
        || input.registry.freshness === 'STALE'
        || input.observation.freshness === 'STALE'
        ? 'STALE'
        : 'UNKNOWN'),
    provenance: Object.freeze([
      'project_resolution',
      'server_resolution',
      ...(input.registry.available ? ['git_registry_domain_data'] : []),
      ...(input.observation.available ? ['domain_observation'] : []),
      ...(options.provenance ?? [])
    ]),
    reasonCodes: Object.freeze([reasonCode]),
    registryDigest: input.registry.digest,
    candidateDigest: input.registry.candidateDigest,
    authorizationInferred: false as const,
    mutationPerformed: false as const,
    vhostMutationPerformed: false as const
  });
}

function addDeclaration(
  declarations: DomainDeclaration[],
  role: DomainRole,
  rawDomain: string,
  endpoint: string,
  evidenceRef: string
): void {
  const domain = normalizeDomain(rawDomain);
  const existing = declarations.find((entry) => entry.role === role && entry.domain === domain);
  if (existing) {
    if (!existing.evidenceRefs.includes(evidenceRef)) existing.evidenceRefs.push(evidenceRef);
    if (existing.endpoint === endpointForDomain(domain) && endpoint !== existing.endpoint) {
      existing.endpoint = endpoint;
    }
    return;
  }
  declarations.push({
    role,
    domain,
    endpoint,
    evidenceRefs: [evidenceRef]
  });
}

function sortSurface(entries: ResolvedDomainSurface[]): ResolvedDomainSurface[] {
  return [...entries].sort((left, right) => (
    left.role.localeCompare(right.role)
    || left.domain.localeCompare(right.domain)
    || left.endpoint.localeCompare(right.endpoint)
  ));
}

export function resolveDomain(rawInput: DomainResolutionInput): DomainResolution {
  const input = DomainResolutionInputSchema.parse(rawInput) as ParsedInput;

  if (input.project.status === 'AMBIGUOUS') {
    return unresolved(input, 'AMBIGUOUS', 'DOMAIN_PROJECT_AMBIGUOUS');
  }
  if (input.project.status === 'NONE') {
    return unresolved(input, 'NONE', 'DOMAIN_PROJECT_NONE', {
      freshness: input.project.freshness === 'CURRENT' ? 'CURRENT' : 'UNKNOWN'
    });
  }
  if (
    input.project.status !== 'RESOLVED'
    || input.project.freshness !== 'CURRENT'
    || !input.project.selectedProject
  ) {
    return unresolved(input, 'UNVERIFIED', 'DOMAIN_PROJECT_UNVERIFIED');
  }
  if (
    input.server.status !== 'RESOLVED'
    || input.server.freshness !== 'CURRENT'
    || !input.server.selectedServer
  ) {
    return unresolved(input, 'UNVERIFIED', 'DOMAIN_SERVER_UNVERIFIED');
  }
  if (!input.registry.available || input.registry.freshness === 'UNKNOWN') {
    return unresolved(input, 'UNVERIFIED', 'DOMAIN_REGISTRY_UNAVAILABLE');
  }
  if (
    input.registry.freshness === 'STALE'
    || input.observation.freshness === 'STALE'
  ) {
    return unresolved(input, 'UNVERIFIED', 'DOMAIN_EVIDENCE_STALE', {
      freshness: 'STALE'
    });
  }
  if (
    input.project.registryDigest !== null
    && input.registry.digest !== null
    && input.project.registryDigest !== input.registry.digest
  ) {
    return unresolved(input, 'UNVERIFIED', 'DOMAIN_REGISTRY_MISMATCH');
  }
  if (!input.observation.available || input.observation.freshness === 'UNKNOWN') {
    return unresolved(input, 'UNVERIFIED', 'DOMAIN_OBSERVATION_UNAVAILABLE');
  }

  const projectId = input.project.selectedProject.projectId;
  const serverId = input.server.selectedServer.serverId;
  if (!sameId(input.observation.serverId, serverId)) {
    return unresolved(input, 'UNVERIFIED', 'DOMAIN_SERVER_MISMATCH', {
      projectId,
      serverId
    });
  }

  const matchingProjects = input.registry.projects.filter(
    (project) => project.projectId === projectId
  );
  if (matchingProjects.length > 1) {
    return unresolved(input, 'UNVERIFIED', 'DOMAIN_PROJECT_REFERENCE_UNVERIFIED', {
      projectId,
      serverId
    });
  }
  const projectRecord = matchingProjects[0] ?? null;

  const projectMappings = input.registry.mappings.filter((mapping) => (
    mapping.projectId === projectId && sameId(mapping.serverId, serverId)
  ));

  const historical = projectRecord
    ? projectRecord.historicalVhosts
      .filter((entry) => sameId(entry.serverId, serverId))
      .map((entry) => normalizeDomain(entry.domain))
    : [];
  const historicalSet = new Set(historical);

  const declarations: DomainDeclaration[] = [];
  if (projectRecord?.publicDomain) {
    const domain = normalizeDomain(projectRecord.publicDomain);
    addDeclaration(
      declarations,
      'FRONTEND',
      domain,
      endpointForDomain(domain),
      'project.publicDomain'
    );
  }
  if (projectRecord?.publicApi) {
    const api = new URL(projectRecord.publicApi);
    const domain = normalizeDomain(api.hostname);
    addDeclaration(
      declarations,
      'API',
      domain,
      projectRecord.publicApi,
      'project.publicApi'
    );
  }

  for (const mapping of projectMappings) {
    if (!mapping.domain) continue;
    const domain = normalizeDomain(mapping.domain);
    addDeclaration(
      declarations,
      roleFromComponentRole(mapping.componentRole),
      domain,
      endpointForDomain(domain),
      `mapping:${mapping.mappingId}`
    );
  }

  if (declarations.some((entry) => historicalSet.has(entry.domain))) {
    return unresolved(input, 'UNVERIFIED', 'DOMAIN_HISTORICAL_DECLARATION_CONFLICT', {
      projectId,
      serverId,
      historical
    });
  }

  const byRole = new Map<DomainRole, Set<string>>();
  for (const declaration of declarations) {
    const domains = byRole.get(declaration.role) ?? new Set<string>();
    domains.add(declaration.domain);
    byRole.set(declaration.role, domains);
  }
  if ([...byRole.values()].some((domains) => domains.size > 1)) {
    return unresolved(input, 'AMBIGUOUS', 'DOMAIN_ROLE_AMBIGUOUS', {
      projectId,
      serverId,
      freshness: 'CURRENT',
      historical
    });
  }

  if (input.observation.domains.some((entry) => !entry.verified)) {
    return unresolved(input, 'UNVERIFIED', 'DOMAIN_OBSERVATION_UNVERIFIED', {
      projectId,
      serverId,
      historical
    });
  }

  const observedEntries = input.observation.domains.map((entry) => ({
    domain: normalizeDomain(entry.domain),
    evidenceRef: entry.evidenceRef
  }));
  const observedActive = observedEntries.filter((entry) => !historicalSet.has(entry.domain));
  const observedActiveSet = new Set(observedActive.map((entry) => entry.domain));
  const declaredSet = new Set(declarations.map((entry) => entry.domain));

  const explicitNoPublicSurface = projectRecord !== null
    && projectRecord.publicDomain === null
    && projectRecord.publicApi === null
    && projectMappings.every((mapping) => mapping.domain === null);

  if (declarations.length === 0) {
    if (observedActive.length > 0) {
      return unresolved(input, 'UNVERIFIED', 'DOMAIN_OBSERVATION_UNDECLARED', {
        projectId,
        serverId,
        freshness: 'CURRENT',
        historical
      });
    }
    if (!explicitNoPublicSurface) {
      return unresolved(input, 'UNVERIFIED', 'DOMAIN_DECLARATION_MISSING', {
        projectId,
        serverId,
        freshness: 'CURRENT',
        historical
      });
    }
    return unresolved(input, 'NONE', 'DOMAIN_NONE_CONFIRMED', {
      projectId,
      serverId,
      freshness: 'CURRENT',
      historical
    });
  }

  if (observedActive.some((entry) => !declaredSet.has(entry.domain))) {
    return unresolved(input, 'UNVERIFIED', 'DOMAIN_OBSERVATION_UNDECLARED', {
      projectId,
      serverId,
      freshness: 'CURRENT',
      historical
    });
  }
  if (declarations.some((entry) => !observedActiveSet.has(entry.domain))) {
    return unresolved(input, 'UNVERIFIED', 'DOMAIN_DECLARATION_UNOBSERVED', {
      projectId,
      serverId,
      freshness: 'CURRENT',
      historical
    });
  }

  const surface = sortSurface(declarations.map((declaration) => Object.freeze({
    role: declaration.role,
    domain: declaration.domain,
    endpoint: declaration.endpoint,
    verified: true as const,
    evidenceRefs: Object.freeze(uniqueSorted([
      ...declaration.evidenceRefs,
      ...observedActive
        .filter((entry) => entry.domain === declaration.domain)
        .map((entry) => entry.evidenceRef)
    ]))
  })));

  return Object.freeze({
    status: 'RESOLVED' as const,
    observedAt: input.observedAt,
    projectId,
    serverId,
    surface: immutableSurface(surface),
    excludedHistoricalVhosts: Object.freeze(uniqueSorted(historical)),
    freshness: 'CURRENT' as const,
    provenance: Object.freeze([
      'project_resolution',
      'server_resolution',
      'git_registry_domain_data',
      'domain_observation'
    ]),
    reasonCodes: Object.freeze([]),
    registryDigest: input.registry.digest,
    candidateDigest: input.registry.candidateDigest,
    authorizationInferred: false as const,
    mutationPerformed: false as const,
    vhostMutationPerformed: false as const
  });
}

export function resolveGw09Domain(
  input: DomainResolutionInput,
  substrate: GovernedContractSubstrate
): DomainResolverContractResult {
  const payload = resolveDomain(input);
  const contract = substrate.resolve('GW-09');
  if (!contract) throw new Error('GWC_RESOLVER_CONTRACT_MISSING:GW-09');

  return Object.freeze({
    contract: Object.freeze({
      stepId: contract.stepId,
      contractVersion: contract.contractVersion
    }),
    status: payload.status,
    observedAt: payload.observedAt,
    freshness: payload.freshness,
    provenance: Object.freeze([...payload.provenance]),
    reasonCodes: Object.freeze([...payload.reasonCodes]),
    payload,
    authorizationInferred: false as const,
    mutationPerformed: false as const,
    vhostMutationPerformed: false as const,
    replayModel: 'READ_ONLY' as const
  });
}
