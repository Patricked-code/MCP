import { z } from 'zod';

import type { GithubProjectResolution } from '../../github/projectResolution.js';
import type {
  GovernedContractSubstrate,
  GovernedStepId
} from '../contractSubstrate.js';

const BoundedId = z.string().trim().min(1).max(300);
const BoundedServerId = z.string().trim().min(1).max(100);
const BoundedPath = z.string().trim().min(1).max(1_000).refine(
  (value) => value.startsWith('/'),
  'SERVER_PATH_MUST_BE_ABSOLUTE'
);
const Sha256 = z.string().regex(/^[0-9a-f]{64}$/);

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

const ServerBindingSchema = z.object({
  mappingId: BoundedId,
  repositoryId: BoundedId,
  projectId: BoundedId,
  projectUid: z.string().trim().min(1).max(200).nullable(),
  componentRole: z.string().trim().min(1).max(100).nullable(),
  serverId: BoundedServerId,
  serverPath: BoundedPath,
  realPath: BoundedPath.nullable(),
  realPathVerified: z.boolean(),
  environment: z.enum(['development', 'staging', 'production'])
}).strict();

const ServerRegistryEvidenceSchema = z.object({
  available: z.boolean(),
  freshness: z.enum(['CURRENT', 'STALE', 'UNKNOWN']),
  digest: Sha256.nullable(),
  candidateDigest: Sha256.nullable(),
  mappings: z.array(ServerBindingSchema).max(1_000)
}).strict();

export const ServerResolutionInputSchema = z.object({
  project: ProjectProjectionSchema,
  registry: ServerRegistryEvidenceSchema,
  canonicalServerIds: z.array(BoundedServerId).min(1).max(100),
  serverHint: BoundedServerId.nullable(),
  observedAt: z.string().datetime({ offset: true })
}).strict();
export type ServerResolutionInput = Omit<
  z.infer<typeof ServerResolutionInputSchema>,
  'project'
> & { project: GithubProjectResolution };

export type ServerResolutionStatus = 'RESOLVED' | 'NONE' | 'AMBIGUOUS' | 'UNVERIFIED';
export type ServerResolutionFreshness = 'CURRENT' | 'STALE' | 'UNKNOWN';

export type ServerResolutionReasonCode =
  | 'SERVER_PROJECT_AMBIGUOUS'
  | 'SERVER_PROJECT_NONE'
  | 'SERVER_PROJECT_UNVERIFIED'
  | 'SERVER_REGISTRY_UNAVAILABLE'
  | 'SERVER_EVIDENCE_STALE'
  | 'SERVER_REGISTRY_MISMATCH'
  | 'SERVER_PROJECT_MAPPING_MISMATCH'
  | 'SERVER_CANONICAL_ID_SET_INVALID'
  | 'SERVER_ID_UNVERIFIED'
  | 'SERVER_HINT_UNVERIFIED'
  | 'SERVER_HINT_NOT_BOUND'
  | 'SERVER_BINDING_AMBIGUOUS';

export type ServerBindingEvidence = Readonly<{
  mappingId: string;
  repositoryId: string;
  projectId: string;
  projectUid: string | null;
  componentRole: string | null;
  rawServerId: string;
  serverPath: string;
  realPath: string | null;
  realPathVerified: boolean;
  environment: 'development' | 'staging' | 'production';
}>;

export type ResolvedServerCandidate = Readonly<{
  serverId: string;
  rawServerIds: readonly string[];
  environment: 'development' | 'staging' | 'production';
  bindings: readonly ServerBindingEvidence[];
}>;

export type ServerResolution = Readonly<{
  status: ServerResolutionStatus;
  observedAt: string;
  projectId: string | null;
  selectedServer: ResolvedServerCandidate | null;
  candidates: readonly ResolvedServerCandidate[];
  candidateCount: number;
  freshness: ServerResolutionFreshness;
  provenance: readonly string[];
  reasonCodes: readonly ServerResolutionReasonCode[];
  registryDigest: string | null;
  candidateDigest: string | null;
  projectMappingId: string | null;
  canonicalServerIds: readonly string[];
  authorizationInferred: false;
  mutationPerformed: false;
  sshMutationPerformed: false;
}>;

export type ServerResolverContractResult = Readonly<{
  contract: Readonly<{
    stepId: GovernedStepId;
    contractVersion: number;
  }>;
  status: ServerResolutionStatus;
  observedAt: string;
  freshness: ServerResolutionFreshness;
  provenance: readonly string[];
  reasonCodes: readonly ServerResolutionReasonCode[];
  payload: ServerResolution;
  authorizationInferred: false;
  mutationPerformed: false;
  sshMutationPerformed: false;
  replayModel: 'READ_ONLY';
}>;

type ParsedInput = z.infer<typeof ServerResolutionInputSchema>;

function normalizeKey(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function canonicalServerMap(
  values: readonly string[]
): Map<string, string> | null {
  const map = new Map<string, string>();
  for (const raw of values) {
    const key = normalizeKey(raw);
    const previous = map.get(key);
    if (previous !== undefined && previous !== raw) return null;
    map.set(key, raw);
  }
  return map;
}

function unresolved(
  input: ParsedInput,
  status: Exclude<ServerResolutionStatus, 'RESOLVED'>,
  reasonCode: ServerResolutionReasonCode,
  options: {
    projectId?: string | null;
    freshness?: ServerResolutionFreshness;
    candidates?: readonly ResolvedServerCandidate[];
    provenance?: readonly string[];
    canonicalServerIds?: readonly string[];
  } = {}
): ServerResolution {
  const candidates = options.candidates ?? [];
  return Object.freeze({
    status,
    observedAt: input.observedAt,
    projectId: options.projectId ?? input.project.selectedProject?.projectId
      ?? input.project.selectedMapping?.projectId
      ?? null,
    selectedServer: null,
    candidates: Object.freeze([...candidates]),
    candidateCount: candidates.length,
    freshness: options.freshness
      ?? (input.project.freshness === 'STALE' || input.registry.freshness === 'STALE'
        ? 'STALE'
        : 'UNKNOWN'),
    provenance: Object.freeze([
      'github_project_resolution',
      ...(input.registry.available ? ['git_registry_server_binding'] : []),
      ...(options.provenance ?? [])
    ]),
    reasonCodes: Object.freeze([reasonCode]),
    registryDigest: input.registry.digest,
    candidateDigest: input.registry.candidateDigest,
    projectMappingId: input.project.selectedMapping?.mappingId ?? null,
    canonicalServerIds: Object.freeze([...(options.canonicalServerIds ?? input.canonicalServerIds)]),
    authorizationInferred: false as const,
    mutationPerformed: false as const,
    sshMutationPerformed: false as const
  });
}

function freezeCandidate(
  serverId: string,
  environment: ResolvedServerCandidate['environment'],
  bindings: ServerBindingEvidence[]
): ResolvedServerCandidate {
  const orderedBindings = [...bindings].sort((left, right) => (
    left.mappingId.localeCompare(right.mappingId)
    || left.repositoryId.localeCompare(right.repositoryId)
    || left.serverPath.localeCompare(right.serverPath)
  ));
  return Object.freeze({
    serverId,
    rawServerIds: Object.freeze(uniqueSorted(orderedBindings.map((entry) => entry.rawServerId))),
    environment,
    bindings: Object.freeze(orderedBindings.map((entry) => Object.freeze({ ...entry })))
  });
}

export function resolveServer(rawInput: ServerResolutionInput): ServerResolution {
  const input = ServerResolutionInputSchema.parse(rawInput) as ParsedInput;

  if (input.project.status === 'AMBIGUOUS') {
    return unresolved(input, 'AMBIGUOUS', 'SERVER_PROJECT_AMBIGUOUS');
  }
  if (input.project.status === 'NONE') {
    return unresolved(input, 'NONE', 'SERVER_PROJECT_NONE');
  }
  if (
    input.project.status !== 'RESOLVED'
    || input.project.freshness !== 'CURRENT'
    || !input.project.selectedMapping
  ) {
    return unresolved(input, 'UNVERIFIED', 'SERVER_PROJECT_UNVERIFIED');
  }
  if (
    !input.registry.available
    || input.registry.digest === null
    || input.registry.candidateDigest === null
  ) {
    return unresolved(input, 'UNVERIFIED', 'SERVER_REGISTRY_UNAVAILABLE');
  }
  if (input.registry.freshness !== 'CURRENT') {
    return unresolved(input, 'UNVERIFIED', 'SERVER_EVIDENCE_STALE', {
      freshness: input.registry.freshness
    });
  }
  const canonicalMap = canonicalServerMap(input.canonicalServerIds);
  if (!canonicalMap) {
    return unresolved(input, 'UNVERIFIED', 'SERVER_CANONICAL_ID_SET_INVALID');
  }
  const canonicalServerIds = [...canonicalMap.values()].sort((left, right) => left.localeCompare(right));
  const projectId = input.project.selectedProject?.projectId
    ?? input.project.selectedMapping.projectId;
  const projectBindings = input.registry.mappings.filter(
    (mapping) => mapping.projectId === projectId
  );

  if (!projectBindings.some(
    (mapping) => mapping.mappingId === input.project.selectedMapping!.mappingId
  )) {
    return unresolved(input, 'UNVERIFIED', 'SERVER_PROJECT_MAPPING_MISMATCH', {
      projectId,
      canonicalServerIds
    });
  }

  const projected: Array<{
    canonicalServerId: string;
    evidence: ServerBindingEvidence;
  }> = [];
  for (const mapping of projectBindings) {
    const canonicalServerId = canonicalMap.get(normalizeKey(mapping.serverId));
    if (!canonicalServerId) {
      return unresolved(input, 'UNVERIFIED', 'SERVER_ID_UNVERIFIED', {
        projectId,
        canonicalServerIds
      });
    }
    projected.push({
      canonicalServerId,
      evidence: Object.freeze({
        mappingId: mapping.mappingId,
        repositoryId: mapping.repositoryId,
        projectId: mapping.projectId,
        projectUid: mapping.projectUid,
        componentRole: mapping.componentRole,
        rawServerId: mapping.serverId,
        serverPath: mapping.serverPath,
        realPath: mapping.realPath,
        realPathVerified: mapping.realPathVerified,
        environment: mapping.environment
      })
    });
  }

  let hintedServerId: string | null = null;
  if (input.serverHint !== null) {
    hintedServerId = canonicalMap.get(normalizeKey(input.serverHint)) ?? null;
    if (!hintedServerId) {
      return unresolved(input, 'UNVERIFIED', 'SERVER_HINT_UNVERIFIED', {
        projectId,
        canonicalServerIds,
        provenance: ['explicit_server_hint']
      });
    }
  }

  const grouped = new Map<string, {
    serverId: string;
    environment: ResolvedServerCandidate['environment'];
    bindings: ServerBindingEvidence[];
  }>();
  for (const entry of projected) {
    if (hintedServerId !== null && entry.canonicalServerId !== hintedServerId) continue;
    const key = `${entry.canonicalServerId}\u0000${entry.evidence.environment}`;
    const group = grouped.get(key) ?? {
      serverId: entry.canonicalServerId,
      environment: entry.evidence.environment,
      bindings: []
    };
    if (!group.bindings.some((binding) => binding.mappingId === entry.evidence.mappingId)) {
      group.bindings.push(entry.evidence);
    }
    grouped.set(key, group);
  }

  const candidates = [...grouped.values()]
    .map((group) => freezeCandidate(group.serverId, group.environment, group.bindings))
    .sort((left, right) => (
      left.serverId.localeCompare(right.serverId)
      || left.environment.localeCompare(right.environment)
    ));

  if (hintedServerId !== null && candidates.length === 0) {
    return unresolved(input, 'NONE', 'SERVER_HINT_NOT_BOUND', {
      projectId,
      canonicalServerIds,
      provenance: ['explicit_server_hint']
    });
  }
  if (candidates.length === 0) {
    return unresolved(input, 'NONE', 'SERVER_HINT_NOT_BOUND', {
      projectId,
      canonicalServerIds
    });
  }
  if (candidates.length > 1) {
    return unresolved(input, 'AMBIGUOUS', 'SERVER_BINDING_AMBIGUOUS', {
      projectId,
      candidates,
      freshness: 'CURRENT',
      canonicalServerIds,
      provenance: hintedServerId !== null ? ['explicit_server_hint'] : []
    });
  }

  const selectedServer = candidates[0]!;
  return Object.freeze({
    status: 'RESOLVED' as const,
    observedAt: input.observedAt,
    projectId,
    selectedServer,
    candidates: Object.freeze(candidates),
    candidateCount: 1,
    freshness: 'CURRENT' as const,
    provenance: Object.freeze([
      'github_project_resolution',
      'git_registry_server_binding',
      'canonical_server_identity_set',
      ...(hintedServerId !== null ? ['explicit_server_hint'] : [])
    ]),
    reasonCodes: Object.freeze([]),
    registryDigest: input.registry.digest,
    candidateDigest: input.registry.candidateDigest,
    projectMappingId: input.project.selectedMapping.mappingId,
    canonicalServerIds: Object.freeze(canonicalServerIds),
    authorizationInferred: false as const,
    mutationPerformed: false as const,
    sshMutationPerformed: false as const
  });
}

export function resolveGw07Server(
  input: ServerResolutionInput,
  substrate: GovernedContractSubstrate
): ServerResolverContractResult {
  const payload = resolveServer(input);
  const contract = substrate.resolve('GW-07');
  if (!contract) throw new Error('GWC_RESOLVER_CONTRACT_MISSING:GW-07');

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
    sshMutationPerformed: false as const,
    replayModel: 'READ_ONLY' as const
  });
}
