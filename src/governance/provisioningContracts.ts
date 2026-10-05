import { z } from 'zod';

/**
 * F.0 (TB-W3-F-01): the provisioning capability decomposition. The versioned
 * policy `.mcp/provisioning-contracts.json` classifies every registered write
 * primitive, mutating HTTP route and workflow, and defines per resource type
 * the contract a provisioning flow satisfies before any primitive is added:
 * exact target, absence proven by an existing resolver, idempotent behaviour
 * on an existing resource, the E3 explicit consent, bounded steps, health and
 * a non-destructive rollback. A step without a composable primitive is a gap
 * carried by an open program blueprint, never improvised. Pure and free of
 * configuration: nothing is called, created, authorized or activated here.
 */
export const PROVISIONING_RESOURCE_TYPES = ['REPOSITORY', 'PROJECT_RUNTIME', 'DOMAIN_BINDING'] as const;

export const PROVISIONING_PRIMITIVE_CLASSES = [
  'COMPOSABLE',
  'OBSERVE',
  'PROJECT_BOUND',
  'SELF_MANAGEMENT',
  'DESTRUCTIVE',
  'NOT_PROVISIONING'
] as const;

/** Invariants every provisioning policy declares; a missing one fails closed. */
export const REQUIRED_PROVISIONING_INVARIANTS = [
  'NO_SHELL_FREEFORM_PROVISIONING',
  'NO_RESOURCE_CREATION_WITHOUT_EXPLICIT_CONSENT',
  'NO_IMPLICIT_ACTIVATION',
  'NO_IMPLICIT_SIDE_EFFECTS',
  'EXACT_TARGET_REQUIRED',
  'ABSENCE_PROVEN_NEVER_ASSUMED',
  'EXISTING_MATCHING_RESOURCE_IS_NO_OP',
  'EXISTING_CONFLICTING_RESOURCE_BLOCKS',
  'NO_AUTOMATIC_DESTRUCTIVE_ROLLBACK',
  'GAPS_CARRIED_NEVER_IMPROVISED',
  'NO_PARALLEL_AUTHORITY'
] as const;

const OBSERVATION_ACTIONS = new Set(['OBSERVE', 'HEALTH', 'VERIFY']);
/** Provisioning that changes a running system keeps a health check and a rollback. */
const RUNNING_RESOURCE_TYPES = new Set(['PROJECT_RUNTIME', 'DOMAIN_BINDING']);

const Text = (max: number) => z.string().trim().min(1).max(max);
const ResourceTypeSchema = z.enum(PROVISIONING_RESOURCE_TYPES);
const PrimitiveClassSchema = z.enum(PROVISIONING_PRIMITIVE_CLASSES);
const BlueprintIdSchema = z.string().regex(/^TB-W\d-[A-Z0-9][A-Z0-9-]{0,60}$/);
const ConstantSchema = z.string().regex(/^[A-Z][A-Z0-9_]{2,80}$/);

const PrimitiveSchema = z.object({
  name: Text(160),
  kind: z.enum(['MCP_TOOL', 'HTTP_ROUTE', 'WORKFLOW']),
  class: PrimitiveClassSchema,
  resourceTypes: z.array(ResourceTypeSchema).min(1).max(PROVISIONING_RESOURCE_TYPES.length).optional(),
  guards: z.array(Text(200)).min(1).max(10).optional(),
  note: Text(300).optional()
}).strict();

const StepSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,40}$/),
  action: z.enum([
    'OBSERVE', 'CREATE', 'RECORD', 'INITIALIZE', 'PROTECT', 'BIND_TARGET', 'BACKUP',
    'BIND', 'CERTIFICATE', 'ACTIVATE', 'HEALTH', 'ROLLBACK', 'VERIFY'
  ]),
  required: z.boolean(),
  mutates: z.boolean(),
  consent: z.enum(['NONE', 'CONTRACT', 'OWN', 'GOVERNED_PULL_REQUEST']),
  consentValue: ConstantSchema.optional(),
  when: z.literal('ON_FAILURE').optional(),
  primitives: z.array(Text(160)).min(1).max(12).optional(),
  gap: z.object({
    carriedBy: z.array(BlueprintIdSchema).min(1).max(4),
    reason: Text(400),
    reuse: Text(300).optional()
  }).strict().optional(),
  note: Text(300).optional()
}).strict();

const ContractSchema = z.object({
  resourceType: ResourceTypeSchema,
  owningAuthorities: z.array(Text(200)).min(1).max(6),
  exactTarget: z.array(Text(200)).min(1).max(6),
  absenceProof: z.object({
    provenBy: Text(400),
    neverAbsentWhen: z.array(ConstantSchema).min(1).max(12)
  }).strict(),
  existingResource: z.object({
    matching: z.literal('NO_OP'),
    conflicting: z.literal('BLOCKED'),
    matchingMeans: Text(300)
  }).strict(),
  consent: z.object({
    purpose: z.string().regex(/^provision-[a-z][a-z-]{0,40}$/),
    value: ConstantSchema,
    names: z.array(Text(160)).min(2).max(6)
  }).strict(),
  steps: z.array(StepSchema).min(2).max(16),
  rollback: z.object({
    mode: z.enum(['RESTORE_BACKUP', 'NO_AUTOMATIC_DESTRUCTIVE_ROLLBACK']),
    detail: Text(400)
  }).strict(),
  neverImplicit: z.array(Text(160)).min(1).max(12)
}).strict();

export const ProvisioningPolicySchema = z.object({
  schemaVersion: z.literal(1),
  policyId: z.literal('provisioning-contracts-v1'),
  blueprintId: z.literal('TB-W3-F-01'),
  workItemId: z.literal('PB-F'),
  observedMainSha: z.string().regex(/^[0-9a-f]{40}$/),
  generatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
  authority: z.object({
    kind: z.literal('DERIVED_CONTRACT_PROJECTION'),
    grantsPermission: z.literal(false),
    createsRuntimeTasks: z.literal(false),
    addsPrimitive: z.literal(false),
    replacesExistingAuthorities: z.literal(false)
  }).strict(),
  invariants: z.array(ConstantSchema).min(1).max(24),
  consent: z.object({
    mechanism: Text(400),
    requires: z.array(ConstantSchema).min(1).max(6),
    neverConsent: z.array(ConstantSchema).min(1).max(12)
  }).strict(),
  classes: z.record(PrimitiveClassSchema, Text(400)),
  primitives: z.array(PrimitiveSchema).min(1).max(200),
  contracts: z.array(ContractSchema).min(1).max(PROVISIONING_RESOURCE_TYPES.length)
}).strict();

export type ProvisioningPolicy = z.infer<typeof ProvisioningPolicySchema>;
export type ProvisioningResourceType = (typeof PROVISIONING_RESOURCE_TYPES)[number];
type ProvisioningPrimitive = ProvisioningPolicy['primitives'][number];

export type ProvisioningFindingCode =
  | 'POLICY_INVALID'
  | 'INVARIANT_MISSING'
  | 'PRIMITIVE_DUPLICATE'
  | 'PRIMITIVE_UNREGISTERED'
  | 'PRIMITIVE_CLASS_MISMATCH'
  | 'WRITE_PRIMITIVE_UNCLASSIFIED'
  | 'MUTATING_ROUTE_UNCLASSIFIED'
  | 'WORKFLOW_UNCLASSIFIED'
  | 'CONTRACT_MISSING'
  | 'CONTRACT_DUPLICATE'
  | 'CONSENT_PURPOSE_DUPLICATE'
  | 'ABSENCE_NOT_OBSERVED_FIRST'
  | 'STEP_DUPLICATE'
  | 'STEP_UNRESOLVED'
  | 'STEP_PRIMITIVE_UNKNOWN'
  | 'STEP_PRIMITIVE_NOT_COMPOSABLE'
  | 'OBSERVE_MUTATES'
  | 'MUTATION_UNDECLARED'
  | 'CONSENT_MISSING'
  | 'ACTIVATION_IMPLICIT'
  | 'GAP_CARRIER_UNKNOWN'
  | 'GAP_CARRIER_DONE'
  | 'HEALTH_MISSING'
  | 'ROLLBACK_MISSING'
  | 'BACKUP_MISSING';

export type ProvisioningFinding = Readonly<{ code: ProvisioningFindingCode; subject: string }>;

export type ProvisioningValidation = Readonly<{
  ok: boolean;
  findings: readonly ProvisioningFinding[];
}>;

/** The registered surfaces the policy is checked against. */
export type ProvisioningCatalogue = {
  /** Registered MCP tools; every write-capable one must be classified. */
  tools: ReadonlyArray<{ name: string; writeCapable: boolean }>;
  /** Registered mutating HTTP routes, as `METHOD /path`. */
  mutatingRoutes: readonly string[];
  /** Workflow files of `.github/workflows`. */
  workflows: readonly string[];
  /** Program Backlog blueprints with their readiness state. */
  blueprints: ReadonlyArray<{ id: string; state: string }>;
};

export type ProvisioningCapability = Readonly<{
  resourceType: ProvisioningResourceType;
  state: 'PROVISIONABLE' | 'BLOCKED_BY_GAPS';
  consentPurpose: string;
  /** Steps an existing primitive already covers. */
  composableSteps: readonly string[];
  gaps: ReadonlyArray<Readonly<{ step: string; required: boolean; carriedBy: readonly string[] }>>;
  authorizationInferred: false;
  mutationPerformed: false;
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/**
 * The tools of the versioned function cartography with their write capability:
 * a write surface, or an `allow_write` flag even on the read surface. A tool
 * without a known surface is treated as write-capable, so it must be classified.
 */
export function toolCatalogueFromCartography(
  cartography: unknown
): ReadonlyArray<Readonly<{ name: string; writeCapable: boolean }>> {
  const tools = record(cartography)?.tools;
  if (!Array.isArray(tools)) return Object.freeze([]);
  const catalogue: Array<Readonly<{ name: string; writeCapable: boolean }>> = [];
  for (const entry of tools) {
    const tool = record(entry);
    if (typeof tool?.name !== 'string') continue;
    const properties = record(record(tool.inputSchema)?.properties) ?? {};
    catalogue.push(Object.freeze({
      name: tool.name,
      writeCapable: tool.surface !== 'read' || Object.prototype.hasOwnProperty.call(properties, 'allow_write')
    }));
  }
  return Object.freeze(catalogue);
}

function freezeValidation(findings: ProvisioningFinding[]): ProvisioningValidation {
  return Object.freeze({ ok: findings.length === 0, findings: Object.freeze(findings) });
}

/** Checks the policy against the registered surfaces and the program; any drift fails closed. */
export function validateProvisioningContracts(
  raw: unknown,
  catalogue: ProvisioningCatalogue
): ProvisioningValidation {
  const parsed = ProvisioningPolicySchema.safeParse(raw);
  if (!parsed.success) {
    return freezeValidation([Object.freeze({ code: 'POLICY_INVALID', subject: 'policy' })]);
  }
  const policy = parsed.data;
  const findings: ProvisioningFinding[] = [];
  const add = (code: ProvisioningFindingCode, subject: string) => {
    findings.push(Object.freeze({ code, subject }));
  };

  for (const invariant of REQUIRED_PROVISIONING_INVARIANTS) {
    if (!policy.invariants.includes(invariant)) add('INVARIANT_MISSING', invariant);
  }

  // The inventory follows the registered surfaces: nothing writes unclassified, nothing stale stays.
  const inventory = new Map<string, ProvisioningPrimitive>();
  for (const primitive of policy.primitives) {
    if (inventory.has(primitive.name)) add('PRIMITIVE_DUPLICATE', primitive.name);
    inventory.set(primitive.name, primitive);
  }
  const tools = new Map(catalogue.tools.map((tool) => [tool.name, tool.writeCapable]));
  const routes = new Set(catalogue.mutatingRoutes);
  const workflows = new Set(catalogue.workflows);
  for (const primitive of inventory.values()) {
    const registered = primitive.kind === 'MCP_TOOL'
      ? tools.has(primitive.name)
      : primitive.kind === 'HTTP_ROUTE' ? routes.has(primitive.name) : workflows.has(primitive.name);
    if (!registered) {
      add('PRIMITIVE_UNREGISTERED', primitive.name);
      continue;
    }
    // A composable tool writes; an observation never does.
    const writeCapable = tools.get(primitive.name);
    if (
      primitive.kind === 'MCP_TOOL'
      && ((primitive.class === 'COMPOSABLE' && !writeCapable) || (primitive.class === 'OBSERVE' && writeCapable))
    ) {
      add('PRIMITIVE_CLASS_MISMATCH', primitive.name);
    }
  }
  for (const tool of catalogue.tools) {
    if (tool.writeCapable && inventory.get(tool.name)?.kind !== 'MCP_TOOL') {
      add('WRITE_PRIMITIVE_UNCLASSIFIED', tool.name);
    }
  }
  for (const route of catalogue.mutatingRoutes) {
    if (inventory.get(route)?.kind !== 'HTTP_ROUTE') add('MUTATING_ROUTE_UNCLASSIFIED', route);
  }
  for (const workflow of catalogue.workflows) {
    if (inventory.get(workflow)?.kind !== 'WORKFLOW') add('WORKFLOW_UNCLASSIFIED', workflow);
  }

  const blueprints = new Map(catalogue.blueprints.map((entry) => [entry.id, entry.state]));
  const resourceTypes = new Set<string>();
  const purposes = new Set<string>();
  for (const contract of policy.contracts) {
    const scope = contract.resourceType;
    if (resourceTypes.has(scope)) add('CONTRACT_DUPLICATE', scope);
    resourceTypes.add(scope);
    if (purposes.has(contract.consent.purpose)) add('CONSENT_PURPOSE_DUPLICATE', contract.consent.purpose);
    purposes.add(contract.consent.purpose);
    // Absence is proven before anything else happens.
    if (contract.steps[0]?.action !== 'OBSERVE') add('ABSENCE_NOT_OBSERVED_FIRST', scope);

    const stepIds = new Set<string>();
    for (const step of contract.steps) {
      const subject = `${scope}/${step.id}`;
      if (stepIds.has(step.id)) add('STEP_DUPLICATE', subject);
      stepIds.add(step.id);
      const observation = OBSERVATION_ACTIONS.has(step.action);
      if (observation && step.mutates) add('OBSERVE_MUTATES', subject);
      if (!observation && !step.mutates) add('MUTATION_UNDECLARED', subject);
      if (step.mutates && step.consent === 'NONE') add('CONSENT_MISSING', subject);
      // An activation carries its own consent, distinct from the creation consent.
      if (step.action === 'ACTIVATE' && step.consent !== 'OWN') add('ACTIVATION_IMPLICIT', subject);
      if (step.consent === 'OWN' && (!step.consentValue || step.consentValue === contract.consent.value)) {
        add('CONSENT_MISSING', subject);
      }

      if (Boolean(step.primitives) === Boolean(step.gap)) {
        add('STEP_UNRESOLVED', subject);
        continue;
      }
      for (const name of step.primitives ?? []) {
        const primitive = inventory.get(name);
        if (!primitive) {
          add('STEP_PRIMITIVE_UNKNOWN', `${subject}:${name}`);
          continue;
        }
        const allowed = (observation ? primitive.class === 'OBSERVE' : primitive.class === 'COMPOSABLE')
          && (!primitive.resourceTypes || primitive.resourceTypes.includes(scope));
        if (!allowed) add('STEP_PRIMITIVE_NOT_COMPOSABLE', `${subject}:${name}`);
      }
      // A gap stays carried by an open blueprint until its primitive exists.
      for (const carrier of step.gap?.carriedBy ?? []) {
        const state = blueprints.get(carrier);
        if (state === undefined) add('GAP_CARRIER_UNKNOWN', `${subject}:${carrier}`);
        else if (state === 'DONE') add('GAP_CARRIER_DONE', `${subject}:${carrier}`);
      }
    }

    const actions = new Set(contract.steps.map((step) => step.action));
    if (RUNNING_RESOURCE_TYPES.has(scope)) {
      if (!actions.has('HEALTH')) add('HEALTH_MISSING', scope);
      if (!actions.has('ROLLBACK')) add('ROLLBACK_MISSING', scope);
    }
    if (contract.rollback.mode === 'RESTORE_BACKUP' && !actions.has('BACKUP')) add('BACKUP_MISSING', scope);
  }
  for (const resourceType of PROVISIONING_RESOURCE_TYPES) {
    if (!resourceTypes.has(resourceType)) add('CONTRACT_MISSING', resourceType);
  }
  return freezeValidation(findings);
}

/**
 * What each resource type can be provisioned with today: the steps existing
 * primitives cover and the gaps, with the blueprints that carry them. A
 * resource type is provisionable only when no required step is a gap. An
 * invalid policy projects nothing. Read-only: no permission is inferred.
 */
export function deriveProvisioningCapabilities(raw: unknown): readonly ProvisioningCapability[] {
  const parsed = ProvisioningPolicySchema.safeParse(raw);
  if (!parsed.success) return Object.freeze([]);
  return Object.freeze(parsed.data.contracts.map((contract) => {
    const gaps = contract.steps
      .filter((step) => step.gap)
      .map((step) => Object.freeze({
        step: step.id,
        required: step.required,
        carriedBy: Object.freeze([...(step.gap?.carriedBy ?? [])])
      }));
    return Object.freeze({
      resourceType: contract.resourceType,
      state: gaps.some((gap) => gap.required) ? 'BLOCKED_BY_GAPS' as const : 'PROVISIONABLE' as const,
      consentPurpose: contract.consent.purpose,
      composableSteps: Object.freeze(contract.steps.filter((step) => step.primitives).map((step) => step.id)),
      gaps: Object.freeze(gaps),
      authorizationInferred: false as const,
      mutationPerformed: false as const
    });
  }));
}
