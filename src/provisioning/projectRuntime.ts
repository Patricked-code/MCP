import { createHash } from 'node:crypto';

import { z } from 'zod';

import type { GitRegistryProjectEvidence } from '../github/registry.js';
import type { ServerRuntimeObservation } from '../github/runtimeResolution.js';
import type { ServerTargetConfiguration } from '../liveState/targetProject.js';

/**
 * F.2 (TB-W3-F-03), increment 1: the absence proof and the plan of the
 * PROJECT_RUNTIME contract of `.mcp/provisioning-contracts.json`. A component
 * is provisioned at the path GitRegistry declares for it on the target server,
 * only under the governed root and outside the MCP checkout. A bounded
 * read-only inventory of that path and of the provisioned Docker namespace
 * (containers labelled with the repository) yields its runtime observation:
 * the runtime found, or a positive NO_RUNTIME only when both are empty. A
 * present path without a provisioned runtime, an unreadable Docker or a
 * malformed answer proves nothing. The plan never infers consent and never
 * overwrites: the same revision is a no-op, anything else existing blocks.
 * Pure: no SSH, store, GitHub call or write.
 */
export const PROVISIONING_SERVER_ID = 's1';
export const PROVISIONING_SERVER_MAP_ID = 'S1';
export const GOVERNED_RUNTIME_ROOT = '/opt/apps';
export const PROVISIONING_LABEL_REPOSITORY = 'com.wealthtech.mcp.provisioning.repository';
export const PROVISIONING_LABEL_REVISION = 'com.wealthtech.mcp.provisioning.revision';
export const PROVISIONING_LABEL_PROJECT = 'com.wealthtech.mcp.provisioning.project';
/** Written at the root of a created runtime; read back to recognize it. */
export const PROVISIONING_MARKER_FILE = '.mcp-provisioning.json';
export const PROVISIONED_RUNTIME_PROVENANCE = 'live_state_provisioned_runtime_inventory';

const MCP_ROOT = '/opt/apps/wealthtech-mcp-ssh-bridge';
const COMPOSE_PROJECT_LABEL = 'com.docker.compose.project';
const MAX_TARGETS = 20;
const MAX_CONTAINERS = 20;
const UNAVAILABLE_SENTINEL = '__unavailable__';
const MAX_MARKER_BYTES = 4096;
const COMPOSE_FILES = new Set(['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml']);
const JOB_ID_PATTERN = /^prov-\d{8}T\d{6}Z-[0-9a-f]{8}$/;
const REPOSITORY_ID_PATTERN = /^github:[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]{1,100}$/;
const PATH_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const CONTAINER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const COMPOSE_PROJECT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const CONTAINER_STATES = new Set(['created', 'restarting', 'running', 'removing', 'paused', 'exited', 'dead']);

/** The contract step ids of PROJECT_RUNTIME, in order. */
export const PROJECT_RUNTIME_STEP_IDS = [
  'observe-runtime',
  'bind-target',
  'backup',
  'create-runtime',
  'activate',
  'health',
  'rollback'
] as const;

export type ProvisioningInventoryTarget = Readonly<{
  mappingId: string;
  repositoryId: string;
  serverPath: string;
}>;

export type ProvisionedContainer = Readonly<{
  name: string;
  state: string;
  composeProject: string | null;
  revision: string | null;
}>;

/** The marker of a runtime created by provisioning, as written at its root. */
export type ProvisioningMarker = Readonly<{
  schemaVersion: 1;
  jobId: string;
  projectId: string;
  mappingId: string;
  repositoryId: string;
  revision: string;
  composeProject: string;
  composeFile: string;
  createdAt: string;
}>;

export type ProvisionedComponentFacts = Readonly<{
  mappingId: string;
  repositoryId: string;
  serverPath: string;
  readable: boolean;
  pathPresent: boolean | null;
  containers: readonly ProvisionedContainer[];
  /** The marker of a created runtime; null when absent or unreadable. */
  marker: ProvisioningMarker | null;
}>;

export type ProvisionedRuntimeInventory = Readonly<{
  status: 'CURRENT' | 'UNAVAILABLE';
  observedAt: string;
  serverId: typeof PROVISIONING_SERVER_ID;
  dockerAvailable: boolean;
  components: readonly ProvisionedComponentFacts[];
}>;

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

/**
 * The normalized path of a provisioned runtime: absolute, under the governed
 * root, made of plain segments and outside the MCP checkout; null otherwise.
 */
export function governedRuntimePath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 300 || !value.startsWith('/')) return null;
  const trimmed = value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
  const segments = trimmed.slice(1).split('/');
  if (segments.length < 3 || segments[0] !== 'opt' || segments[1] !== 'apps') return null;
  if (!segments.slice(2).every((segment) => PATH_SEGMENT_PATTERN.test(segment))) return null;
  const normalized = `/${segments.join('/')}`;
  if (normalized === MCP_ROOT || normalized.startsWith(`${MCP_ROOT}/`)) return null;
  return normalized;
}

function validTarget(target: ProvisioningInventoryTarget): boolean {
  return REPOSITORY_ID_PATTERN.test(target.repositoryId)
    && governedRuntimePath(target.serverPath) === target.serverPath
    && typeof target.mappingId === 'string'
    && target.mappingId.length > 0
    && target.mappingId.length <= 300;
}

/** The read-only inventory command of the declared paths and the provisioned namespace. */
export function buildProvisionedRuntimeInventoryCommand(targets: readonly ProvisioningInventoryTarget[]): string {
  if (targets.length === 0 || targets.length > MAX_TARGETS || !targets.every(validTarget)) {
    throw new Error('PROVISIONING_INVENTORY_TARGETS_INVALID');
  }
  const format = `{{.Names}}|{{.State}}|{{.Label "${COMPOSE_PROJECT_LABEL}"}}|{{.Label "${PROVISIONING_LABEL_REVISION}"}}`;
  const lines = [
    'set -u',
    `if docker info --format '{{.ServerVersion}}' >/dev/null 2>&1; then printf 'docker=ok\\n'; else printf 'docker=unavailable\\n'; fi`
  ];
  targets.forEach((target, index) => {
    lines.push(
      `if [ -e ${shellQuote(target.serverPath)} ]; then printf 'component.${index}.path=present\\n'; else printf 'component.${index}.path=absent\\n'; fi`,
      `c="$(docker ps -a --filter ${shellQuote(`label=${PROVISIONING_LABEL_REPOSITORY}=${target.repositoryId}`)} --format ${shellQuote(format)} 2>/dev/null)" || c=${shellQuote(UNAVAILABLE_SENTINEL)}`,
      `printf 'component.${index}.containers=%s\\n' "$(printf '%s\\n' "$c" | head -n ${MAX_CONTAINERS + 1} | paste -sd, -)"`,
      `if [ -f ${shellQuote(`${target.serverPath}/${PROVISIONING_MARKER_FILE}`)} ]; then printf 'component.${index}.marker=%s\\n' "$(head -c ${MAX_MARKER_BYTES} ${shellQuote(`${target.serverPath}/${PROVISIONING_MARKER_FILE}`)} | base64 | tr -d '\\n')"; fi`
    );
  });
  return lines.join('\n');
}

function keyValues(output: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of output.split('\n')) {
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    values.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return values;
}

function parseContainers(value: string | undefined): ProvisionedContainer[] | null {
  if (value === undefined || value === UNAVAILABLE_SENTINEL) return null;
  if (value === '') return [];
  const entries = value.split(',');
  if (entries.length > MAX_CONTAINERS) return null;
  const containers: ProvisionedContainer[] = [];
  for (const entry of entries) {
    const [name, state, composeProject, revision, ...rest] = entry.split('|');
    if (rest.length > 0 || !name || !CONTAINER_NAME_PATTERN.test(name) || !state || !CONTAINER_STATES.has(state)) return null;
    if (composeProject && !COMPOSE_PROJECT_PATTERN.test(composeProject)) return null;
    if (revision && !SHA_PATTERN.test(revision)) return null;
    containers.push(Object.freeze({
      name,
      state,
      composeProject: composeProject || null,
      revision: revision || null
    }));
  }
  return containers;
}

/** A marker read back from a created runtime, valid only for its own component. */
export function parseProvisioningMarker(
  encoded: string | undefined,
  target: ProvisioningInventoryTarget
): ProvisioningMarker | null {
  if (!encoded || encoded.length > MAX_MARKER_BYTES * 2) return null;
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
  const parsed = MarkerSchema.safeParse(value);
  if (!parsed.success) return null;
  const marker = parsed.data;
  if (marker.mappingId !== target.mappingId || marker.repositoryId !== target.repositoryId) return null;
  return Object.freeze(marker);
}

/** An inventory that observed nothing: every component stays unproven. */
export function unavailableProvisionedRuntimeInventory(
  targets: readonly ProvisioningInventoryTarget[],
  observedAt: string
): ProvisionedRuntimeInventory {
  return Object.freeze({
    status: 'UNAVAILABLE' as const,
    observedAt,
    serverId: PROVISIONING_SERVER_ID,
    dockerAvailable: false,
    components: Object.freeze(targets.map((target) => Object.freeze({
      ...target,
      readable: false,
      pathPresent: null,
      containers: Object.freeze([]),
      marker: null
    })))
  });
}

export function parseProvisionedRuntimeInventory(
  output: string,
  targets: readonly ProvisioningInventoryTarget[],
  observedAt: string
): ProvisionedRuntimeInventory {
  const values = keyValues(output);
  const docker = values.get('docker');
  if (docker !== 'ok' && docker !== 'unavailable') return unavailableProvisionedRuntimeInventory(targets, observedAt);
  return Object.freeze({
    status: 'CURRENT' as const,
    observedAt,
    serverId: PROVISIONING_SERVER_ID,
    dockerAvailable: docker === 'ok',
    components: Object.freeze(targets.map((target, index) => {
      const path = values.get(`component.${index}.path`);
      const containers = parseContainers(values.get(`component.${index}.containers`));
      const pathPresent = path === 'present' ? true : path === 'absent' ? false : null;
      return Object.freeze({
        ...target,
        readable: docker === 'ok' && pathPresent !== null && containers !== null,
        pathPresent,
        containers: Object.freeze(containers ?? []),
        marker: pathPresent ? parseProvisioningMarker(values.get(`component.${index}.marker`), target) : null
      });
    }))
  });
}

function unique<T>(values: readonly T[]): T | null {
  return values.length > 0 && values.every((value) => value === values[0]) ? values[0]! : null;
}

/**
 * The runtime observations an inventory proves, one per component: the
 * provisioned runtime found, a positive NO_RUNTIME, or an unavailable one.
 */
export function provisionedRuntimeObservations(
  inventory: ProvisionedRuntimeInventory,
  freshness: 'CURRENT' | 'STALE',
  evidenceRef: string
): ServerRuntimeObservation[] {
  const observations: ServerRuntimeObservation[] = [];
  for (const component of inventory.components) {
    const base = {
      observedAt: inventory.observedAt,
      serverId: inventory.serverId,
      repositoryId: component.repositoryId,
      evidenceRef,
      provenance: PROVISIONED_RUNTIME_PROVENANCE
    };
    if (inventory.status !== 'CURRENT' || !inventory.dockerAvailable || !component.readable) {
      observations.push(Object.freeze({
        ...base,
        status: 'UNAVAILABLE' as const,
        freshness: 'UNKNOWN' as const,
        runtimeKind: 'DOCKER_COMPOSE' as const,
        runtimeId: null,
        revision: null
      }));
      continue;
    }
    if (component.containers.length > 0) {
      observations.push(Object.freeze({
        ...base,
        status: freshness,
        freshness,
        runtimeKind: 'DOCKER_COMPOSE' as const,
        runtimeId: unique(component.containers.map((container) => container.composeProject))
          ?? component.containers[0]!.name,
        revision: unique(component.containers.map((container) => container.revision))
      }));
      continue;
    }
    if (component.pathPresent === false) {
      observations.push(Object.freeze({
        ...base,
        status: freshness,
        freshness,
        runtimeKind: 'NO_RUNTIME' as const,
        runtimeId: null,
        revision: null
      }));
      continue;
    }
    if (component.marker) {
      observations.push(Object.freeze({
        ...base,
        status: freshness,
        freshness,
        runtimeKind: 'CHECKOUT_ONLY' as const,
        runtimeId: component.marker.composeProject,
        revision: component.marker.revision
      }));
    }
  }
  return observations;
}

function s1Bindings(registry: GitRegistryProjectEvidence, mappingId: string): string[] {
  return [...new Set((registry.serverBindings ?? [])
    .filter((binding) => binding.mappingId === mappingId && binding.serverId.toLowerCase() === PROVISIONING_SERVER_ID)
    .map((binding) => binding.serverPath))];
}

/** The components of a project that have a single, governed declared path on the target server. */
export function provisioningInventoryTargets(
  registry: GitRegistryProjectEvidence,
  projectId: string
): ProvisioningInventoryTarget[] {
  if (!registry.available) return [];
  const projects = registry.projects.filter((project) => project.projectId === projectId);
  if (projects.length !== 1) return [];
  const targets: ProvisioningInventoryTarget[] = [];
  for (const component of projects[0]!.repositoryComponents) {
    const paths = s1Bindings(registry, component.mappingId);
    const serverPath = paths.length === 1 ? governedRuntimePath(paths[0]) : null;
    if (!serverPath || !REPOSITORY_ID_PATTERN.test(component.repositoryId)) continue;
    targets.push(Object.freeze({ mappingId: component.mappingId, repositoryId: component.repositoryId, serverPath }));
  }
  return targets.slice(0, MAX_TARGETS);
}

const MarkerSchema = z.object({
  schemaVersion: z.literal(1),
  jobId: z.string().regex(JOB_ID_PATTERN),
  projectId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/),
  mappingId: z.string().min(1).max(300),
  repositoryId: z.string().regex(REPOSITORY_ID_PATTERN),
  revision: z.string().regex(SHA_PATTERN),
  composeProject: z.string().regex(COMPOSE_PROJECT_PATTERN),
  composeFile: z.string().refine((value) => COMPOSE_FILES.has(value)),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/)
}).strict();

const RequestSchema = z.object({
  serverId: z.string().min(1).max(20),
  projectId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/),
  mappingId: z.string().min(1).max(300),
  revision: z.string().regex(SHA_PATTERN)
}).strict();

export type ProjectRuntimeReasonCode =
  | 'PROVISIONING_REQUEST_INVALID'
  | 'PROVISIONING_SERVER_UNSUPPORTED'
  | 'TARGET_NOT_CONFIGURED'
  | 'TARGET_CONFIGURATION_INVALID'
  | 'TARGET_PROJECT_NOT_CONFIGURED'
  | 'REGISTRY_UNAVAILABLE'
  | 'TARGET_PROJECT_NOT_REGISTERED'
  | 'TARGET_COMPONENT_UNKNOWN'
  | 'TARGET_PATH_UNDECLARED'
  | 'TARGET_PATH_AMBIGUOUS'
  | 'TARGET_PATH_OUTSIDE_GOVERNED_ROOT'
  | 'RUNTIME_ABSENCE_UNPROVEN'
  | 'EXISTING_RUNTIME_MATCHING'
  | 'EXISTING_RUNTIME_CONFLICT'
  | 'TARGET_PATH_PRESENT'
  | 'CREATION_CONSENT_REQUIRED'
  | 'ACTIVATION_CONSENT_REQUIRED'
  | 'RUNTIME_CREATED_NOT_ACTIVATED';

export type ProjectRuntimeStepState =
  | 'DONE'
  | 'PENDING'
  | 'CONSENT_REQUIRED'
  | 'OWN_CONSENT_REQUIRED'
  | 'BLOCKED'
  | 'NOT_APPLICABLE'
  | 'ON_FAILURE';

export type ProjectRuntimeTarget = Readonly<{
  serverId: typeof PROVISIONING_SERVER_MAP_ID;
  projectId: string;
  mappingId: string;
  repositoryId: string;
  componentRole: string | null;
  serverPath: string;
  composeProject: string;
  revision: string;
}>;

export type ProjectRuntimeExecutionMode = 'CREATE' | 'CREATE_AND_ACTIVATE' | 'ACTIVATE';

export type ProjectRuntimeProvisioningPlan = Readonly<{
  decision: 'BLOCKED' | 'NO_OP' | 'CONSENT_REQUIRED' | 'READY';
  /** What a READY plan executes; null otherwise. */
  mode: ProjectRuntimeExecutionMode | null;
  reasonCodes: readonly ProjectRuntimeReasonCode[];
  target: ProjectRuntimeTarget | null;
  governance: Readonly<{ backupRequired: boolean; rollbackMethod: string | null }> | null;
  steps: ReadonlyArray<Readonly<{ id: (typeof PROJECT_RUNTIME_STEP_IDS)[number]; state: ProjectRuntimeStepState }>>;
  authorizationInferred: false;
  mutationPerformed: false;
}>;

export type ProjectRuntimeProvisioningInput = {
  request: unknown;
  serverTarget: ServerTargetConfiguration;
  registry: GitRegistryProjectEvidence;
  inventory: ProvisionedRuntimeInventory | null;
  /** Consents decided server-side by the E3 mechanism; never inferred here. */
  consent: { creation: boolean; activation: boolean };
};

/** The Docker Compose project of a provisioned component: stable, unique and compose-safe. */
export function provisionedComposeProject(projectId: string, mappingId: string, repositoryId: string): string {
  const repository = repositoryId.split('/').pop() ?? '';
  const slug = repository.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'runtime';
  const digest = createHash('sha256').update(`${projectId}\n${mappingId}`).digest('hex').slice(0, 12);
  return `mcp-${slug.replace(/-+$/, '')}-${digest}`;
}

function freezePlan(
  decision: ProjectRuntimeProvisioningPlan['decision'],
  reasonCodes: ProjectRuntimeReasonCode[],
  target: ProjectRuntimeTarget | null,
  governance: ProjectRuntimeProvisioningPlan['governance'],
  states: Record<(typeof PROJECT_RUNTIME_STEP_IDS)[number], ProjectRuntimeStepState>,
  mode: ProjectRuntimeExecutionMode | null = null
): ProjectRuntimeProvisioningPlan {
  return Object.freeze({
    decision,
    mode: decision === 'READY' ? mode : null,
    reasonCodes: Object.freeze(reasonCodes),
    target,
    governance,
    steps: Object.freeze(PROJECT_RUNTIME_STEP_IDS.map((id) => Object.freeze({ id, state: states[id] }))),
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}

function everyStep(state: ProjectRuntimeStepState): Record<(typeof PROJECT_RUNTIME_STEP_IDS)[number], ProjectRuntimeStepState> {
  return Object.fromEntries(PROJECT_RUNTIME_STEP_IDS.map((id) => [id, state])) as Record<
    (typeof PROJECT_RUNTIME_STEP_IDS)[number], ProjectRuntimeStepState
  >;
}

/**
 * The provisioning plan of one component runtime on the target server:
 * BLOCKED with its first failed gate, NO_OP when the same revision already
 * runs, CONSENT_REQUIRED until the creation consent, READY otherwise; the
 * activation keeps its own consent. Nothing is executed or authorized here.
 */
export function planProjectRuntimeProvisioning(input: ProjectRuntimeProvisioningInput): ProjectRuntimeProvisioningPlan {
  const block = (
    reasonCode: ProjectRuntimeReasonCode,
    target: ProjectRuntimeTarget | null = null,
    governance: ProjectRuntimeProvisioningPlan['governance'] = null
  ) => freezePlan('BLOCKED', [reasonCode], target, governance, everyStep('BLOCKED'));

  const parsed = RequestSchema.safeParse(input.request);
  if (!parsed.success) return block('PROVISIONING_REQUEST_INVALID');
  const request = parsed.data;
  if (request.serverId !== PROVISIONING_SERVER_MAP_ID) return block('PROVISIONING_SERVER_UNSUPPORTED');

  const configuration = input.serverTarget;
  if (configuration.status === 'NOT_CONFIGURED') return block('TARGET_NOT_CONFIGURED');
  if (configuration.status === 'INVALID') return block('TARGET_CONFIGURATION_INVALID');
  if (!configuration.projectIds.includes(request.projectId)) return block('TARGET_PROJECT_NOT_CONFIGURED');

  const registry = input.registry;
  if (!registry.available) return block('REGISTRY_UNAVAILABLE');
  const projects = registry.projects.filter((project) => project.projectId === request.projectId);
  if (projects.length !== 1) return block('TARGET_PROJECT_NOT_REGISTERED');
  const components = projects[0]!.repositoryComponents.filter((component) => component.mappingId === request.mappingId);
  if (components.length !== 1) return block('TARGET_COMPONENT_UNKNOWN');
  const component = components[0]!;

  const paths = s1Bindings(registry, component.mappingId);
  if (paths.length === 0) return block('TARGET_PATH_UNDECLARED');
  if (paths.length > 1) return block('TARGET_PATH_AMBIGUOUS');
  const serverPath = governedRuntimePath(paths[0]);
  if (!serverPath) return block('TARGET_PATH_OUTSIDE_GOVERNED_ROOT');

  const target: ProjectRuntimeTarget = Object.freeze({
    serverId: PROVISIONING_SERVER_MAP_ID,
    projectId: request.projectId,
    mappingId: component.mappingId,
    repositoryId: component.repositoryId,
    componentRole: component.role || null,
    serverPath,
    composeProject: provisionedComposeProject(request.projectId, component.mappingId, component.repositoryId),
    revision: request.revision
  });
  const declared = (registry.governanceEvidence?.mappings ?? []).find((entry) => entry.mappingId === component.mappingId);
  // The contract always backs up before a creation; D1 can only add its rollback method.
  const governance = Object.freeze({
    backupRequired: declared?.backupRequired ?? true,
    rollbackMethod: declared?.rollbackMethod ?? null
  });

  const inventory = input.inventory;
  const facts = inventory?.components.find((entry) => entry.mappingId === component.mappingId);
  if (
    !inventory
    || inventory.status !== 'CURRENT'
    || !inventory.dockerAvailable
    || !facts
    || !facts.readable
    || facts.repositoryId !== component.repositoryId
    || facts.serverPath !== serverPath
  ) {
    return block('RUNTIME_ABSENCE_UNPROVEN', target, governance);
  }
  if (facts.containers.length > 0) {
    const matching = facts.containers.every((container) => (
      container.revision === request.revision && container.state === 'running'
    ));
    if (!matching) return block('EXISTING_RUNTIME_CONFLICT', target, governance);
    return freezePlan('NO_OP', ['EXISTING_RUNTIME_MATCHING'], target, governance, {
      ...everyStep('NOT_APPLICABLE'),
      'observe-runtime': 'DONE',
      'bind-target': 'DONE'
    });
  }
  if (facts.pathPresent !== false) {
    const marker = facts.marker;
    // Only the marker this provisioning wrote makes a present path a created runtime.
    if (!marker) return block('TARGET_PATH_PRESENT', target, governance);
    if (marker.revision !== request.revision || marker.composeProject !== target.composeProject) {
      return block('EXISTING_RUNTIME_CONFLICT', target, governance);
    }
    const created = {
      'observe-runtime': 'DONE', 'bind-target': 'DONE', backup: 'DONE', 'create-runtime': 'DONE', rollback: 'ON_FAILURE'
    } as const;
    if (!input.consent.activation) {
      return freezePlan('CONSENT_REQUIRED', ['RUNTIME_CREATED_NOT_ACTIVATED', 'ACTIVATION_CONSENT_REQUIRED'], target, governance, {
        ...created,
        activate: 'OWN_CONSENT_REQUIRED',
        health: 'NOT_APPLICABLE'
      });
    }
    return freezePlan('READY', ['RUNTIME_CREATED_NOT_ACTIVATED'], target, governance, {
      ...created,
      activate: 'PENDING',
      health: 'PENDING'
    }, 'ACTIVATE');
  }

  const observed = { 'observe-runtime': 'DONE', 'bind-target': 'DONE', rollback: 'ON_FAILURE' } as const;
  if (!input.consent.creation) {
    return freezePlan('CONSENT_REQUIRED', ['CREATION_CONSENT_REQUIRED'], target, governance, {
      ...observed,
      backup: 'CONSENT_REQUIRED',
      'create-runtime': 'CONSENT_REQUIRED',
      activate: 'OWN_CONSENT_REQUIRED',
      health: 'NOT_APPLICABLE'
    });
  }
  const activation = input.consent.activation;
  return freezePlan('READY', activation ? [] : ['ACTIVATION_CONSENT_REQUIRED'], target, governance, {
    ...observed,
    backup: 'PENDING',
    'create-runtime': 'PENDING',
    activate: activation ? 'PENDING' : 'OWN_CONSENT_REQUIRED',
    health: activation ? 'PENDING' : 'NOT_APPLICABLE'
  }, activation ? 'CREATE_AND_ACTIVATE' : 'CREATE');
}
