import { z } from 'zod';

import type {
  GovernedContractSubstrate,
  GovernedStepId
} from '../contractSubstrate.js';

const BoundedId = z.string().trim().min(1).max(300);
const GitSha = z.string().regex(/^[0-9a-f]{40}$/i);

export const RuntimeKindSchema = z.enum([
  'NO_RUNTIME',
  'CHECKOUT_ONLY',
  'DOCKER',
  'DOCKER_COMPOSE',
  'SYSTEMD',
  'PROCESS_MANAGER',
  'PASSENGER'
]);
export type RuntimeKind = z.infer<typeof RuntimeKindSchema>;

const ServerProjectionSchema = z.object({
  status: z.enum(['RESOLVED', 'NONE', 'AMBIGUOUS', 'UNVERIFIED']),
  observedAt: z.string().datetime({ offset: true }),
  selectedServer: z.object({
    serverId: BoundedId
  }).passthrough().nullable(),
  freshness: z.enum(['CURRENT', 'STALE', 'UNKNOWN'])
}).passthrough();

export const RuntimeComponentSchema = z.object({
  componentId: BoundedId,
  repositoryId: BoundedId,
  componentRole: BoundedId
}).strict();
export type RuntimeComponent = z.infer<typeof RuntimeComponentSchema>;

export const RuntimeObservationSchema = z.object({
  status: z.enum(['CURRENT', 'STALE', 'UNAVAILABLE']),
  observedAt: z.string().datetime({ offset: true }),
  freshness: z.enum(['CURRENT', 'STALE', 'UNKNOWN']),
  serverId: BoundedId,
  componentId: BoundedId,
  repositoryId: BoundedId,
  componentRole: BoundedId,
  runtimeKind: RuntimeKindSchema,
  runtimeId: BoundedId.nullable(),
  revision: GitSha.nullable(),
  evidenceRef: BoundedId
}).strict();
export type RuntimeObservation = z.infer<typeof RuntimeObservationSchema>;

export const RuntimeDeclarationSchema = z.object({
  serverId: BoundedId,
  componentId: BoundedId,
  repositoryId: BoundedId,
  runtimeKind: RuntimeKindSchema,
  runtimeId: BoundedId.nullable()
}).strict();
export type RuntimeDeclaration = z.infer<typeof RuntimeDeclarationSchema>;

export const RuntimeHintSchema = z.object({
  componentId: BoundedId.optional(),
  runtimeId: BoundedId.nullable().optional()
}).strict().nullable();

export const RuntimeResolutionInputSchema = z.object({
  server: ServerProjectionSchema,
  components: z.array(RuntimeComponentSchema).max(500),
  observations: z.array(RuntimeObservationSchema).max(1_000),
  declarations: z.array(RuntimeDeclarationSchema).max(1_000),
  runtimeHint: RuntimeHintSchema,
  observedAt: z.string().datetime({ offset: true })
}).strict();
export type RuntimeResolutionInput = z.infer<typeof RuntimeResolutionInputSchema>;

export type RuntimeResolutionStatus = 'RESOLVED' | 'AMBIGUOUS' | 'UNVERIFIED';
export type RuntimeCardinality = 'NO_RUNTIME' | 'SINGLE_RUNTIME' | 'MULTI_RUNTIME' | 'UNKNOWN';
export type RuntimeFreshness = 'CURRENT' | 'STALE' | 'UNKNOWN';

export type RuntimeResolutionReasonCode =
  | 'RUNTIME_SERVER_UNVERIFIED'
  | 'RUNTIME_OBSERVATION_MISSING'
  | 'RUNTIME_OBSERVATION_UNAVAILABLE'
  | 'RUNTIME_EVIDENCE_STALE'
  | 'RUNTIME_SERVER_MISMATCH'
  | 'RUNTIME_COMPONENT_UNVERIFIED'
  | 'RUNTIME_BINDING_INVALID'
  | 'RUNTIME_DECLARATION_CONFLICT'
  | 'RUNTIME_NONE_CONFLICT'
  | 'RUNTIME_HINT_NOT_BOUND';

export type RuntimeBinding = Readonly<{
  serverId: string;
  componentId: string;
  repositoryId: string;
  componentRole: string;
  runtimeKind: RuntimeKind;
  runtimeId: string | null;
  revision: string | null;
  observedAt: string;
  freshness: 'CURRENT';
  evidenceRef: string;
}>;

export type RuntimeResolution = Readonly<{
  status: RuntimeResolutionStatus;
  observedAt: string;
  serverId: string | null;
  cardinality: RuntimeCardinality;
  bindings: readonly RuntimeBinding[];
  freshness: RuntimeFreshness;
  provenance: readonly string[];
  reasonCodes: readonly RuntimeResolutionReasonCode[];
  authorizationInferred: false;
  mutationPerformed: false;
  runtimeMutationPerformed: false;
}>;

export type RuntimeResolverContractResult = Readonly<{
  contract: Readonly<{
    stepId: GovernedStepId;
    contractVersion: number;
  }>;
  status: RuntimeResolutionStatus;
  observedAt: string;
  freshness: RuntimeFreshness;
  provenance: readonly string[];
  reasonCodes: readonly RuntimeResolutionReasonCode[];
  payload: RuntimeResolution;
  authorizationInferred: false;
  mutationPerformed: false;
  runtimeMutationPerformed: false;
  replayModel: 'READ_ONLY';
}>;

type ParsedInput = z.infer<typeof RuntimeResolutionInputSchema>;

function immutableBindings(bindings: RuntimeBinding[]): readonly RuntimeBinding[] {
  return Object.freeze(bindings.map((binding) => Object.freeze({ ...binding })));
}

function unresolved(
  input: ParsedInput,
  status: Exclude<RuntimeResolutionStatus, 'RESOLVED'>,
  reasonCode: RuntimeResolutionReasonCode,
  options: {
    freshness?: RuntimeFreshness;
    serverId?: string | null;
    bindings?: RuntimeBinding[];
    provenance?: string[];
    cardinality?: RuntimeCardinality;
  } = {}
): RuntimeResolution {
  return Object.freeze({
    status,
    observedAt: input.observedAt,
    serverId: options.serverId ?? input.server.selectedServer?.serverId ?? null,
    cardinality: options.cardinality ?? 'UNKNOWN',
    bindings: immutableBindings(options.bindings ?? []),
    freshness: options.freshness
      ?? (input.server.freshness === 'STALE' ? 'STALE' : 'UNKNOWN'),
    provenance: Object.freeze([
      'server_resolution',
      ...(options.provenance ?? [])
    ]),
    reasonCodes: Object.freeze([reasonCode]),
    authorizationInferred: false as const,
    mutationPerformed: false as const,
    runtimeMutationPerformed: false as const
  });
}

function bindingIsValid(observation: RuntimeObservation): boolean {
  if (observation.runtimeKind === 'NO_RUNTIME') {
    return observation.runtimeId === null && observation.revision === null;
  }
  if (observation.runtimeKind === 'CHECKOUT_ONLY') {
    return observation.runtimeId === null;
  }
  return observation.runtimeId !== null;
}

function sameBinding(
  declaration: RuntimeDeclaration,
  observation: RuntimeObservation
): boolean {
  return declaration.serverId === observation.serverId
    && declaration.componentId === observation.componentId
    && declaration.repositoryId === observation.repositoryId
    && declaration.runtimeKind === observation.runtimeKind
    && declaration.runtimeId === observation.runtimeId;
}

function sortBindings(bindings: RuntimeBinding[]): RuntimeBinding[] {
  return [...bindings].sort((left, right) => (
    left.componentId.localeCompare(right.componentId)
    || left.repositoryId.localeCompare(right.repositoryId)
    || left.runtimeKind.localeCompare(right.runtimeKind)
    || (left.runtimeId ?? '').localeCompare(right.runtimeId ?? '')
  ));
}

export function resolveRuntime(rawInput: RuntimeResolutionInput): RuntimeResolution {
  const input = RuntimeResolutionInputSchema.parse(rawInput) as ParsedInput;

  if (
    input.server.status !== 'RESOLVED'
    || input.server.freshness !== 'CURRENT'
    || !input.server.selectedServer
  ) {
    return unresolved(input, 'UNVERIFIED', 'RUNTIME_SERVER_UNVERIFIED');
  }

  const serverId = input.server.selectedServer.serverId;
  if (input.observations.length === 0) {
    return unresolved(input, 'UNVERIFIED', 'RUNTIME_OBSERVATION_MISSING', {
      serverId,
      provenance: ['runtime_observation']
    });
  }

  if (input.observations.some((observation) => (
    observation.status === 'UNAVAILABLE' || observation.freshness === 'UNKNOWN'
  ))) {
    return unresolved(input, 'UNVERIFIED', 'RUNTIME_OBSERVATION_UNAVAILABLE', {
      serverId,
      provenance: ['runtime_observation']
    });
  }

  if (input.observations.some((observation) => (
    observation.status === 'STALE' || observation.freshness === 'STALE'
  ))) {
    return unresolved(input, 'UNVERIFIED', 'RUNTIME_EVIDENCE_STALE', {
      serverId,
      freshness: 'STALE',
      provenance: ['runtime_observation']
    });
  }

  if (input.observations.some((observation) => observation.serverId !== serverId)) {
    return unresolved(input, 'UNVERIFIED', 'RUNTIME_SERVER_MISMATCH', {
      serverId,
      provenance: ['runtime_observation']
    });
  }

  const components = new Map(
    input.components.map((component) => [component.componentId, component] as const)
  );
  for (const observation of input.observations) {
    const component = components.get(observation.componentId);
    if (
      !component
      || component.repositoryId !== observation.repositoryId
      || component.componentRole !== observation.componentRole
    ) {
      return unresolved(input, 'UNVERIFIED', 'RUNTIME_COMPONENT_UNVERIFIED', {
        serverId,
        provenance: ['runtime_observation']
      });
    }
    if (!bindingIsValid(observation)) {
      return unresolved(input, 'UNVERIFIED', 'RUNTIME_BINDING_INVALID', {
        serverId,
        provenance: ['runtime_observation']
      });
    }
  }

  for (const declaration of input.declarations) {
    const matchingObservation = input.observations.find((observation) => (
      observation.serverId === declaration.serverId
      && observation.componentId === declaration.componentId
      && observation.repositoryId === declaration.repositoryId
    ));
    if (matchingObservation && !sameBinding(declaration, matchingObservation)) {
      return unresolved(input, 'UNVERIFIED', 'RUNTIME_DECLARATION_CONFLICT', {
        serverId,
        provenance: ['runtime_observation', 'runtime_declaration_cross_check']
      });
    }
  }

  let observations = [...input.observations];
  if (input.runtimeHint) {
    observations = observations.filter((observation) => (
      (input.runtimeHint?.componentId === undefined
        || observation.componentId === input.runtimeHint.componentId)
      && (input.runtimeHint?.runtimeId === undefined
        || observation.runtimeId === input.runtimeHint.runtimeId)
    ));
    if (observations.length === 0) {
      return unresolved(input, 'UNVERIFIED', 'RUNTIME_HINT_NOT_BOUND', {
        serverId,
        provenance: ['runtime_observation', 'explicit_runtime_hint']
      });
    }
  }

  const hasNoRuntime = observations.some((observation) => observation.runtimeKind === 'NO_RUNTIME');
  if (hasNoRuntime && observations.some((observation) => observation.runtimeKind !== 'NO_RUNTIME')) {
    return unresolved(input, 'AMBIGUOUS', 'RUNTIME_NONE_CONFLICT', {
      serverId,
      freshness: 'CURRENT',
      provenance: ['runtime_observation'],
      cardinality: 'UNKNOWN'
    });
  }

  const bindings = sortBindings(observations.map((observation) => Object.freeze({
    serverId: observation.serverId,
    componentId: observation.componentId,
    repositoryId: observation.repositoryId,
    componentRole: observation.componentRole,
    runtimeKind: observation.runtimeKind,
    runtimeId: observation.runtimeId,
    revision: observation.revision,
    observedAt: observation.observedAt,
    freshness: 'CURRENT' as const,
    evidenceRef: observation.evidenceRef
  })));

  const cardinality: RuntimeCardinality = hasNoRuntime
    ? 'NO_RUNTIME'
    : bindings.length === 1
      ? 'SINGLE_RUNTIME'
      : 'MULTI_RUNTIME';

  return Object.freeze({
    status: 'RESOLVED' as const,
    observedAt: input.observedAt,
    serverId,
    cardinality,
    bindings: immutableBindings(bindings),
    freshness: 'CURRENT' as const,
    provenance: Object.freeze([
      'server_resolution',
      'runtime_observation',
      ...(input.declarations.length > 0 ? ['runtime_declaration_cross_check'] : []),
      ...(input.runtimeHint ? ['explicit_runtime_hint'] : [])
    ]),
    reasonCodes: Object.freeze([]),
    authorizationInferred: false as const,
    mutationPerformed: false as const,
    runtimeMutationPerformed: false as const
  });
}

export function resolveGw08Runtime(
  input: RuntimeResolutionInput,
  substrate: GovernedContractSubstrate
): RuntimeResolverContractResult {
  const payload = resolveRuntime(input);
  const contract = substrate.resolve('GW-08');
  if (!contract) throw new Error('GWC_RESOLVER_CONTRACT_MISSING:GW-08');

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
    runtimeMutationPerformed: false as const,
    replayModel: 'READ_ONLY' as const
  });
}
