export type GovernedStepId = `GW-${string}`;

export type ContractSubstrateReasonCode =
  | 'INVALID_CONTRACT_PROJECTION'
  | 'INVALID_GRAPH_PROJECTION'
  | 'UNSUPPORTED_CONTRACT_SCHEMA_VERSION'
  | 'UNSUPPORTED_GRAPH_SCHEMA_VERSION'
  | 'CONTRACT_REGISTRY_DIGEST_MISMATCH'
  | 'GRAPH_REGISTRY_DIGEST_MISMATCH'
  | 'CONTRACT_ID_SET_INVALID'
  | 'RUNTIME_MEMBERSHIP_INVALID'
  | 'GRAPH_BOUNDARY_INVALID'
  | 'GRAPH_REFERENCES_UNKNOWN_STEP'
  | 'UNKNOWN_STEP_ID';

export type GovernedContractDefinition = Readonly<{
  stepId: GovernedStepId;
  canonicalName: string;
  family: string;
  familyName: string;
  contractVersion: number;
  profiles: readonly string[];
  executionSemantics: string;
  integrationClassification: string;
  actionKinds: readonly string[];
  canonicalOutput: string;
  replayModel: string;
  runtimeGraphMember: boolean;
  blueprintRef: string;
}>;

export type GovernedContractEvaluation =
  | Readonly<{
      status: 'PASS';
      reasonCode: null;
      stepId: GovernedStepId;
      contractVersion: number;
      contractRegistryDigest: string;
      graphRegistryDigest: string;
    }>
  | Readonly<{
      status: 'FAIL';
      reasonCode: 'UNKNOWN_STEP_ID';
      stepId: string;
      contractVersion: null;
      contractRegistryDigest: string;
      graphRegistryDigest: string;
    }>;

export type GovernedContractSubstrate = Readonly<{
  schemaVersion: number;
  revision: string;
  contractRegistryDigest: string;
  graphRegistryDigest: string;
  contractCount: number;
  entry: GovernedStepId;
  runtimeTerminal: GovernedStepId;
  outOfRuntimeStepIds: readonly GovernedStepId[];
  contractIds: readonly GovernedStepId[];
  resolve(stepId: string): GovernedContractDefinition | null;
  evaluate(stepId: string): GovernedContractEvaluation;
}>;

export type CreateGovernedContractSubstrateInput = Readonly<{
  contractsProjection: unknown;
  graphProjection: unknown;
  expectedSchemaVersion: number;
  expectedContractRegistryDigest: string;
  expectedGraphRegistryDigest: string;
}>;

export class GovernedContractSubstrateError extends Error {
  readonly reasonCode: Exclude<ContractSubstrateReasonCode, 'UNKNOWN_STEP_ID'>;

  constructor(
    reasonCode: Exclude<ContractSubstrateReasonCode, 'UNKNOWN_STEP_ID'>,
    message: string = reasonCode
  ) {
    super(message);
    this.name = 'GovernedContractSubstrateError';
    this.reasonCode = reasonCode;
  }
}

type JsonObject = Record<string, unknown>;

const EXPECTED_STEP_IDS = Object.freeze(
  Array.from({ length: 73 }, (_, index) =>
    `GW-${String(index + 1).padStart(2, '0')}` as GovernedStepId
  )
);
const EXPECTED_STEP_ID_SET = new Set<string>(EXPECTED_STEP_IDS);
const EXPECTED_RUNTIME_IDS = new Set<string>(EXPECTED_STEP_IDS.slice(0, 72));
const SHA256 = /^[0-9a-f]{64}$/i;

function object(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function string(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function stringArray(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) return null;
  return Object.freeze([...value]);
}

function assertDigest(
  actual: unknown,
  expected: string,
  reasonCode: 'CONTRACT_REGISTRY_DIGEST_MISMATCH' | 'GRAPH_REGISTRY_DIGEST_MISMATCH'
): string {
  if (!SHA256.test(expected)) {
    throw new GovernedContractSubstrateError(reasonCode, `${reasonCode}: expected digest malformed`);
  }
  if (typeof actual !== 'string' || actual.toLowerCase() !== expected.toLowerCase()) {
    throw new GovernedContractSubstrateError(reasonCode);
  }
  return actual.toLowerCase();
}

function parseContract(value: unknown): GovernedContractDefinition {
  const raw = object(value);
  if (!raw) throw new GovernedContractSubstrateError('INVALID_CONTRACT_PROJECTION');

  const stepId = string(raw.stepId);
  const canonicalName = string(raw.canonicalName);
  const family = string(raw.family);
  const familyName = string(raw.familyName);
  const contractVersion = integer(raw.contractVersion);
  const profiles = stringArray(raw.profiles);
  const executionSemantics = string(raw.executionSemantics);
  const integrationClassification = string(raw.integrationClassification);
  const actionKinds = stringArray(raw.actionKinds);
  const canonicalOutput = string(raw.canonicalOutput);
  const replayModel = string(raw.replayModel);
  const runtimeGraphMember = typeof raw.runtimeGraphMember === 'boolean'
    ? raw.runtimeGraphMember
    : null;
  const blueprintRef = string(raw.blueprintRef);

  if (
    !stepId
    || !EXPECTED_STEP_ID_SET.has(stepId)
    || !canonicalName
    || !family
    || !familyName
    || contractVersion === null
    || contractVersion < 1
    || !profiles
    || !executionSemantics
    || !integrationClassification
    || !actionKinds
    || !canonicalOutput
    || !replayModel
    || runtimeGraphMember === null
    || !blueprintRef
  ) {
    throw new GovernedContractSubstrateError('INVALID_CONTRACT_PROJECTION');
  }

  return Object.freeze({
    stepId: stepId as GovernedStepId,
    canonicalName,
    family,
    familyName,
    contractVersion,
    profiles,
    executionSemantics,
    integrationClassification,
    actionKinds,
    canonicalOutput,
    replayModel,
    runtimeGraphMember,
    blueprintRef
  });
}

function exactExpectedIdSet(contracts: readonly GovernedContractDefinition[]): boolean {
  if (contracts.length !== EXPECTED_STEP_IDS.length) return false;
  const observed = new Set(contracts.map(({ stepId }) => stepId));
  return observed.size === EXPECTED_STEP_IDS.length
    && EXPECTED_STEP_IDS.every((stepId) => observed.has(stepId));
}

function validateRuntimeMembership(contracts: readonly GovernedContractDefinition[]): void {
  for (const contract of contracts) {
    const expectedRuntime = EXPECTED_RUNTIME_IDS.has(contract.stepId);
    if (contract.runtimeGraphMember !== expectedRuntime) {
      throw new GovernedContractSubstrateError('RUNTIME_MEMBERSHIP_INVALID');
    }
  }
}

export function createGovernedContractSubstrate(
  input: CreateGovernedContractSubstrateInput
): GovernedContractSubstrate {
  const contractsRoot = object(input.contractsProjection);
  if (!contractsRoot) {
    throw new GovernedContractSubstrateError('INVALID_CONTRACT_PROJECTION');
  }
  const graphRoot = object(input.graphProjection);
  if (!graphRoot) {
    throw new GovernedContractSubstrateError('INVALID_GRAPH_PROJECTION');
  }

  if (integer(contractsRoot.schemaVersion) !== input.expectedSchemaVersion) {
    throw new GovernedContractSubstrateError('UNSUPPORTED_CONTRACT_SCHEMA_VERSION');
  }
  if (integer(graphRoot.schemaVersion) !== input.expectedSchemaVersion) {
    throw new GovernedContractSubstrateError('UNSUPPORTED_GRAPH_SCHEMA_VERSION');
  }

  const contractRegistryDigest = assertDigest(
    contractsRoot.registryDigest,
    input.expectedContractRegistryDigest,
    'CONTRACT_REGISTRY_DIGEST_MISMATCH'
  );
  const graphRegistryDigest = assertDigest(
    graphRoot.registryDigest,
    input.expectedGraphRegistryDigest,
    'GRAPH_REGISTRY_DIGEST_MISMATCH'
  );

  if (!Array.isArray(contractsRoot.contracts)) {
    throw new GovernedContractSubstrateError('INVALID_CONTRACT_PROJECTION');
  }
  const contracts = Object.freeze(contractsRoot.contracts.map(parseContract));
  if (!exactExpectedIdSet(contracts)) {
    throw new GovernedContractSubstrateError('CONTRACT_ID_SET_INVALID');
  }
  validateRuntimeMembership(contracts);

  const entry = string(graphRoot.entry);
  const runtimeTerminal = string(graphRoot.runtimeTerminal);
  const outOfRuntime = Array.isArray(graphRoot.outOfRuntimeGraph)
    ? graphRoot.outOfRuntimeGraph
    : null;
  if (!entry || !runtimeTerminal || !outOfRuntime) {
    throw new GovernedContractSubstrateError('INVALID_GRAPH_PROJECTION');
  }

  const outOfRuntimeStepIds = Object.freeze(outOfRuntime.map((value) => {
    const stepId = string(object(value)?.stepId);
    if (!stepId || !EXPECTED_STEP_ID_SET.has(stepId)) {
      throw new GovernedContractSubstrateError('GRAPH_BOUNDARY_INVALID');
    }
    return stepId as GovernedStepId;
  }));

  if (
    entry !== 'GW-01'
    || runtimeTerminal !== 'GW-72'
    || outOfRuntimeStepIds.length !== 1
    || outOfRuntimeStepIds[0] !== 'GW-73'
  ) {
    throw new GovernedContractSubstrateError('GRAPH_BOUNDARY_INVALID');
  }

  if (!Array.isArray(graphRoot.edges)) {
    throw new GovernedContractSubstrateError('INVALID_GRAPH_PROJECTION');
  }
  for (const value of graphRoot.edges) {
    const edge = object(value);
    const from = string(edge?.from);
    const to = string(edge?.to);
    if (!from || !to || !EXPECTED_RUNTIME_IDS.has(from) || !EXPECTED_RUNTIME_IDS.has(to)) {
      throw new GovernedContractSubstrateError('GRAPH_REFERENCES_UNKNOWN_STEP');
    }
  }

  const byId = new Map<GovernedStepId, GovernedContractDefinition>(
    contracts.map((contract) => [contract.stepId, contract])
  );
  const contractIds = Object.freeze([...EXPECTED_STEP_IDS]);
  const revision = string(contractsRoot.revision) ?? 'UNKNOWN';

  const substrate: GovernedContractSubstrate = {
    schemaVersion: input.expectedSchemaVersion,
    revision,
    contractRegistryDigest,
    graphRegistryDigest,
    contractCount: contracts.length,
    entry: entry as GovernedStepId,
    runtimeTerminal: runtimeTerminal as GovernedStepId,
    outOfRuntimeStepIds,
    contractIds,
    resolve(stepId: string) {
      return byId.get(stepId as GovernedStepId) ?? null;
    },
    evaluate(stepId: string) {
      const contract = byId.get(stepId as GovernedStepId);
      if (!contract) {
        return Object.freeze({
          status: 'FAIL' as const,
          reasonCode: 'UNKNOWN_STEP_ID' as const,
          stepId,
          contractVersion: null,
          contractRegistryDigest,
          graphRegistryDigest
        });
      }
      return Object.freeze({
        status: 'PASS' as const,
        reasonCode: null,
        stepId: contract.stepId,
        contractVersion: contract.contractVersion,
        contractRegistryDigest,
        graphRegistryDigest
      });
    }
  };

  return Object.freeze(substrate);
}
