import type { GitRegistryProjectEvidence } from '../github/registry.js';
import type { ServerTargetConfiguration } from '../liveState/targetProject.js';
import { evaluateComposeSafety, provisioningLabelsOverride, type ComposeSafetyFinding } from './composePolicy.js';
import {
  PROVISIONING_LABEL_REPOSITORY,
  PROVISIONING_MARKER_FILE,
  governedRuntimePath,
  planProjectRuntimeProvisioning,
  provisioningInventoryTargets,
  type ProjectRuntimeExecutionMode,
  type ProjectRuntimeReasonCode,
  type ProjectRuntimeTarget,
  type ProvisionedRuntimeInventory,
  type ProvisioningInventoryTarget,
  type ProvisioningMarker
} from './projectRuntime.js';

export { PROVISIONING_MARKER_FILE } from './projectRuntime.js';

/**
 * F.2 (TB-W3-F-03), increment 2: the target-bounded executor of the
 * PROJECT_RUNTIME contract. Right before any write it re-reads the target,
 * the registry and the runtime inventory and re-plans: only a READY plan
 * runs, with write mode on and one provisioning at a time. Creation fetches
 * the exact revision, stages it beside the target, checks the compose model,
 * then promotes it and writes the marker; activation, under its own consent,
 * labels and starts the compose project and waits for its health. A failure
 * stops the project without its volumes and moves files to quarantine:
 * nothing is deleted. Every run that reaches a job is attested.
 */
export const PROVISIONING_DATA_ROOT_CONTAINER = '/app/data/provisioning';
export const PROVISIONING_DATA_ROOT_HOST = '/opt/apps/wealthtech-mcp-ssh-bridge/data/provisioning';
export const PROVISIONING_QUARANTINE_ROOT = '/opt/apps/mcp-provisioning-quarantine';
const LABELS_FILE = '.mcp-provisioning.labels.json';
const JOB_ID_PATTERN = /^prov-\d{8}T\d{6}Z-[0-9a-f]{8}$/;
const COMPOSE_PROJECT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/;
const REPOSITORY_ID_PATTERN = /^github:[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]{1,100}$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const COMPOSE_FILES = new Set(['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml']);
const MAX_COMPOSE_CONFIG_BYTES = 200_000;
const CLEAN_ENV = 'env -i PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin HOME="$HOME"';
// Compose keys that read host files outside the project at load time.
const FORBIDDEN_COMPOSE_KEYS = '^[[:space:]-]*(env_file|extends|include|label_file)[[:space:]]*:';

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function assertJobId(jobId: string): void {
  if (!JOB_ID_PATTERN.test(jobId)) throw new Error('PROVISIONING_JOB_ID_INVALID');
}

function assertTarget(target: ProjectRuntimeTarget): void {
  if (
    governedRuntimePath(target.serverPath) !== target.serverPath
    || !COMPOSE_PROJECT_PATTERN.test(target.composeProject)
    || !REPOSITORY_ID_PATTERN.test(target.repositoryId)
    || !SHA_PATTERN.test(target.revision)
  ) {
    throw new Error('PROVISIONING_TARGET_INVALID');
  }
}

function assertComposeFile(composeFile: string): void {
  if (!COMPOSE_FILES.has(composeFile)) throw new Error('PROVISIONING_COMPOSE_FILE_INVALID');
}

/** The staging directory of a job: a sibling of the target under the governed root. */
export function stagingPath(serverPath: string, jobId: string): string {
  assertJobId(jobId);
  const path = governedRuntimePath(`${serverPath}.mcp-staging-${jobId}`);
  if (!path) throw new Error('PROVISIONING_TARGET_INVALID');
  return path;
}

export function provisioningJobId(now: Date, randomHex: string): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const jobId = `prov-${stamp}-${randomHex}`;
  assertJobId(jobId);
  return jobId;
}

export function provisioningMarker(input: {
  jobId: string;
  target: ProjectRuntimeTarget;
  composeFile: string;
  createdAt: string;
}): ProvisioningMarker {
  assertJobId(input.jobId);
  assertTarget(input.target);
  assertComposeFile(input.composeFile);
  return Object.freeze({
    schemaVersion: 1 as const,
    jobId: input.jobId,
    projectId: input.target.projectId,
    mappingId: input.target.mappingId,
    repositoryId: input.target.repositoryId,
    revision: input.target.revision,
    composeProject: input.target.composeProject,
    composeFile: input.composeFile,
    createdAt: input.createdAt
  });
}

function header(phase: string): string[] {
  return [
    `# mcp-provisioning:${phase}`,
    'set -u',
    'umask 022',
    `fail() { printf 'result=failed\\nreason=%s\\n' "$1"; exit 0; }`
  ];
}

// Prints every link given after the base whose resolution leaves the base; POSIX sh, any file name.
const SYMLINK_CHECK = 'base="$1"; shift; for l do r="$(readlink -m -- "$l")" || { printf "%s\\n" "$l"; continue; }; case "$r" in "$base"/*) ;; *) printf "%s\\n" "$l" ;; esac; done';

function symlinkGuard(directory: string): string {
  // A link resolving outside the project would let a bind mount escape it; an unreadable tree blocks.
  return `outside="$(find ${shellQuote(directory)} -type l -exec sh -c ${shellQuote(SYMLINK_CHECK)} symlink-guard ${shellQuote(directory)} {} +)" || fail symlink_check`;
}

function composeConfigLines(directory: string, project: string, file: string, done: string): string[] {
  return [
    `if grep -Eq ${shellQuote(FORBIDDEN_COMPOSE_KEYS)} ${shellQuote(`${directory}/${file}`)}; then fail compose_feature_forbidden; fi`,
    symlinkGuard(directory),
    '[ -z "$outside" ] || fail symlink_outside',
    `config="$(cd ${shellQuote(directory)} && ${CLEAN_ENV} docker compose -p ${shellQuote(project)} -f ${shellQuote(file)} config --format json 2>/dev/null)" || fail compose_invalid`,
    `printf 'result=${done}\\n'`,
    `printf 'compose_file=%s\\n' ${shellQuote(file)}`,
    `printf 'compose_config_b64=%s\\n' "$(printf '%s' "$config" | head -c ${MAX_COMPOSE_CONFIG_BYTES} | base64 | tr -d '\\n')"`
  ];
}

/** Re-proves absence on the host, verifies the archive, extracts it beside the target and prints its compose model. */
export function buildStageScript(input: { jobId: string; target: ProjectRuntimeTarget; archiveSha256: string }): string {
  assertJobId(input.jobId);
  assertTarget(input.target);
  if (!SHA256_PATTERN.test(input.archiveSha256)) throw new Error('PROVISIONING_ARCHIVE_DIGEST_INVALID');
  const staging = stagingPath(input.target.serverPath, input.jobId);
  const archive = `${PROVISIONING_DATA_ROOT_HOST}/${input.jobId}/source.tar.gz`;
  return [
    ...header('stage'),
    `[ ! -e ${shellQuote(input.target.serverPath)} ] || fail target_present`,
    `[ ! -e ${shellQuote(staging)} ] || fail staging_present`,
    `c="$(docker ps -aq --filter ${shellQuote(`label=${PROVISIONING_LABEL_REPOSITORY}=${input.target.repositoryId}`)} 2>/dev/null)" || fail docker_unavailable`,
    '[ -z "$c" ] || fail runtime_present',
    `c="$(docker ps -aq --filter ${shellQuote(`label=com.docker.compose.project=${input.target.composeProject}`)} 2>/dev/null)" || fail docker_unavailable`,
    '[ -z "$c" ] || fail compose_project_present',
    `[ -f ${shellQuote(archive)} ] || fail archive_missing`,
    `[ "$(sha256sum ${shellQuote(archive)} | cut -d' ' -f1)" = ${shellQuote(input.archiveSha256)} ] || fail archive_digest`,
    `mkdir -p ${shellQuote(staging)} || fail extract`,
    `tar -xzf ${shellQuote(archive)} -C ${shellQuote(staging)} --strip-components=1 --no-same-owner --no-same-permissions || fail extract`,
    "file=''",
    'for candidate in compose.yaml compose.yml docker-compose.yaml docker-compose.yml; do',
    `  if [ -f ${shellQuote(staging)}/"$candidate" ]; then file="$candidate"; break; fi`,
    'done',
    '[ -n "$file" ] || fail compose_missing',
    `if grep -Eq ${shellQuote(FORBIDDEN_COMPOSE_KEYS)} ${shellQuote(staging)}/"$file"; then fail compose_feature_forbidden; fi`,
    symlinkGuard(staging),
    '[ -z "$outside" ] || fail symlink_outside',
    `config="$(cd ${shellQuote(staging)} && ${CLEAN_ENV} docker compose -p ${shellQuote(input.target.composeProject)} -f "$file" config --format json 2>/dev/null)" || fail compose_invalid`,
    "printf 'result=staged\\n'",
    `printf 'compose_file=%s\\n' "$file"`,
    `printf 'compose_config_b64=%s\\n' "$(printf '%s' "$config" | head -c ${MAX_COMPOSE_CONFIG_BYTES} | base64 | tr -d '\\n')"`
  ].join('\n');
}

/** Promotes the staging directory to the target and writes the marker; a failed marker undoes the promotion. */
export function buildCreateScript(input: { jobId: string; target: ProjectRuntimeTarget; composeFile: string; createdAt: string }): string {
  const marker = provisioningMarker(input);
  const staging = stagingPath(input.target.serverPath, input.jobId);
  const target = shellQuote(input.target.serverPath);
  return [
    ...header('create'),
    `[ -d ${shellQuote(staging)} ] || fail staging_missing`,
    `[ ! -e ${target} ] || fail target_present`,
    `mv ${shellQuote(staging)} ${target} || fail promote`,
    `if ! printf '%s\\n' ${shellQuote(JSON.stringify(marker))} > ${shellQuote(`${input.target.serverPath}/${PROVISIONING_MARKER_FILE}`)}; then mv ${target} ${shellQuote(staging)}; fail marker; fi`,
    "printf 'result=created\\n'"
  ].join('\n');
}

/** Prints the compose model of an already created runtime, after the same file and link checks. */
export function buildComposeConfigScript(input: { target: ProjectRuntimeTarget; composeFile: string }): string {
  assertTarget(input.target);
  assertComposeFile(input.composeFile);
  return [
    ...header('config'),
    `[ -f ${shellQuote(`${input.target.serverPath}/${input.composeFile}`)} ] || fail compose_missing`,
    ...composeConfigLines(input.target.serverPath, input.target.composeProject, input.composeFile, 'configured')
  ].join('\n');
}

/** Labels and starts the compose project of a created runtime, then waits for every container to be healthy. */
export function buildActivateScript(input: {
  jobId: string;
  target: ProjectRuntimeTarget;
  composeFile: string;
  labelsOverride: string;
  healthTimeoutSeconds: number;
}): string {
  assertJobId(input.jobId);
  assertTarget(input.target);
  assertComposeFile(input.composeFile);
  JSON.parse(input.labelsOverride);
  const timeout = Math.max(30, Math.min(900, Math.trunc(input.healthTimeoutSeconds)));
  const directory = shellQuote(input.target.serverPath);
  const marker = shellQuote(`${input.target.serverPath}/${PROVISIONING_MARKER_FILE}`);
  const labels = shellQuote(`${input.target.serverPath}/${LABELS_FILE}`);
  const compose = `${CLEAN_ENV} docker compose -p ${shellQuote(input.target.composeProject)} -f ${shellQuote(input.composeFile)} -f ${labels}`;
  return [
    ...header('activate'),
    `[ -f ${marker} ] || fail marker_missing`,
    `grep -q ${shellQuote(`"revision":"${input.target.revision}"`)} ${marker} || fail marker_mismatch`,
    `grep -q ${shellQuote(`"composeProject":"${input.target.composeProject}"`)} ${marker} || fail marker_mismatch`,
    `printf '%s\\n' ${shellQuote(input.labelsOverride)} > ${labels} || fail labels`,
    `cd ${directory} || fail target_missing`,
    `if ! ${compose} up -d --build >/dev/null 2>&1; then printf 'result=unhealthy\\nhealth=start_failed\\n'; exit 0; fi`,
    `deadline=$(( $(date +%s) + ${timeout} ))`,
    'health=starting',
    'while [ "$(date +%s)" -lt "$deadline" ]; do',
    `  states="$(${compose} ps --all --format '{{.State}}|{{.Health}}' 2>/dev/null)" || { health=unknown; break; }`,
    '  if [ -z "$states" ]; then health=absent; break; fi',
    `  if printf '%s\\n' "$states" | grep -Eq '^(exited|dead|removing|restarting)[|]|[|]unhealthy$'; then health=unhealthy; break; fi`,
    `  if printf '%s\\n' "$states" | grep -Evq '^running[|](healthy)?$'; then sleep 3; continue; fi`,
    '  health=healthy; break',
    'done',
    `if [ "$health" = healthy ]; then printf 'result=activated\\n'; else printf 'result=unhealthy\\n'; fi`,
    `printf 'health=%s\\n' "$health"`
  ].join('\n');
}

/**
 * Stops the job's compose project without its volumes; a target created by
 * this job moves to quarantine, an earlier one keeps its files.
 */
export function buildRollbackScript(input: {
  jobId: string;
  target: ProjectRuntimeTarget;
  composeFile: string;
  createdInThisJob: boolean;
}): string {
  assertJobId(input.jobId);
  assertTarget(input.target);
  assertComposeFile(input.composeFile);
  const directory = shellQuote(input.target.serverPath);
  const lines = [
    ...header('rollback'),
    'status=rolled_back',
    `if [ -d ${directory} ]; then`,
    `  (cd ${directory} && ${CLEAN_ENV} docker compose -p ${shellQuote(input.target.composeProject)} -f ${shellQuote(input.composeFile)} down --remove-orphans >/dev/null 2>&1) || status=failed`,
    'fi'
  ];
  if (input.createdInThisJob) {
    lines.push(
      `mkdir -p ${shellQuote(PROVISIONING_QUARANTINE_ROOT)} || status=failed`,
      `if [ -e ${directory} ]; then mv ${directory} ${shellQuote(`${PROVISIONING_QUARANTINE_ROOT}/${input.jobId}`)} || status=failed; fi`
    );
  }
  lines.push(`printf 'result=%s\\n' "$status"`);
  return lines.join('\n');
}

/** Moves a staging directory left by a failed job to quarantine. */
export function buildDiscardStagingScript(input: { jobId: string; target: ProjectRuntimeTarget }): string {
  assertTarget(input.target);
  const staging = shellQuote(stagingPath(input.target.serverPath, input.jobId));
  return [
    ...header('discard'),
    `if [ -e ${staging} ]; then`,
    `  mkdir -p ${shellQuote(PROVISIONING_QUARANTINE_ROOT)} && mv ${staging} ${shellQuote(`${PROVISIONING_QUARANTINE_ROOT}/${input.jobId}-staging`)} || fail discard`,
    'fi',
    "printf 'result=discarded\\n'"
  ].join('\n');
}

export type ProjectRuntimeExecutionResult = 'SUCCEEDED' | 'NO_OP' | 'REFUSED' | 'BLOCKED' | 'FAILED' | 'ROLLED_BACK';

export type ProjectRuntimeExecution = Readonly<{
  result: ProjectRuntimeExecutionResult;
  jobId: string | null;
  mode: ProjectRuntimeExecutionMode | null;
  target: ProjectRuntimeTarget | null;
  reasonCodes: readonly string[];
  findings: readonly ComposeSafetyFinding[];
  rollback: 'NOT_NEEDED' | 'SUCCEEDED' | 'FAILED';
  authorizationInferred: false;
}>;

type HostResult = { code: number | null; stdout: string; stderr?: string };

export type ProjectRuntimeExecutionDependencies = {
  writeEnabled: () => boolean;
  now: () => Date;
  randomHex: () => string;
  readServerTarget: () => Promise<ServerTargetConfiguration>;
  readRegistry: () => Promise<GitRegistryProjectEvidence>;
  /** A fresh read-only inventory of the targets, never a cached snapshot. */
  observe: (targets: ProvisioningInventoryTarget[]) => Promise<ProvisionedRuntimeInventory>;
  fetchSource: (input: { repositoryId: string; revision: string; destination: string }) => Promise<
    { ok: boolean; sha256?: string | null; bytes?: number }
  >;
  writeJobFile: (path: string, content: string) => Promise<void>;
  runWrite: (command: string, options: { phase: string; timeoutMs: number; maxOutputBytes: number }) => Promise<HostResult>;
};

const PHASE_LIMITS: Record<string, { timeoutMs: number; maxOutputBytes: number }> = {
  stage: { timeoutMs: 300_000, maxOutputBytes: 400_000 },
  create: { timeoutMs: 60_000, maxOutputBytes: 8_192 },
  config: { timeoutMs: 120_000, maxOutputBytes: 400_000 },
  activate: { timeoutMs: 1_200_000, maxOutputBytes: 8_192 },
  rollback: { timeoutMs: 300_000, maxOutputBytes: 8_192 },
  discard: { timeoutMs: 60_000, maxOutputBytes: 8_192 }
};

function keyValues(output: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of output.split('\n')) {
    const separator = line.indexOf('=');
    if (separator > 0) values.set(line.slice(0, separator), line.slice(separator + 1).trim());
  }
  return values;
}

function composeModel(values: Map<string, string>): unknown {
  try {
    return JSON.parse(Buffer.from(values.get('compose_config_b64') ?? '', 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

let inFlight = false;

function refused(reasonCodes: readonly string[], result: ProjectRuntimeExecutionResult = 'REFUSED', target: ProjectRuntimeTarget | null = null): ProjectRuntimeExecution {
  return Object.freeze({
    result,
    jobId: null,
    mode: null,
    target,
    reasonCodes: Object.freeze([...reasonCodes]),
    findings: Object.freeze([]),
    rollback: 'NOT_NEEDED' as const,
    authorizationInferred: false as const
  });
}

/**
 * Executes a READY plan of one component runtime. Consents are decided
 * server-side by the caller (E3) and never inferred here.
 */
export async function executeProjectRuntimeProvisioning(
  input: { request: unknown; consent: { creation: boolean; activation: boolean } },
  deps: ProjectRuntimeExecutionDependencies
): Promise<ProjectRuntimeExecution> {
  if (!deps.writeEnabled()) return refused(['WRITE_TOOLS_DISABLED']);
  if (inFlight) return refused(['PROVISIONING_IN_PROGRESS']);
  inFlight = true;
  try {
    return await execute(input, deps);
  } finally {
    inFlight = false;
  }
}

async function execute(
  input: { request: unknown; consent: { creation: boolean; activation: boolean } },
  deps: ProjectRuntimeExecutionDependencies
): Promise<ProjectRuntimeExecution> {
  const consent = { creation: input.consent.creation === true, activation: input.consent.activation === true };
  const [serverTarget, registry] = await Promise.all([deps.readServerTarget(), deps.readRegistry()]);
  const request = input.request && typeof input.request === 'object' ? input.request as Record<string, unknown> : {};
  const targets = typeof request.projectId === 'string' ? provisioningInventoryTargets(registry, request.projectId) : [];
  const mappingTargets = targets.filter((entry) => entry.mappingId === request.mappingId);
  const inventory = mappingTargets.length === 1 ? await deps.observe(mappingTargets) : null;
  const plan = planProjectRuntimeProvisioning({ request: input.request, serverTarget, registry, inventory, consent });
  if (plan.decision === 'NO_OP') return refused(plan.reasonCodes, 'NO_OP', plan.target);
  if (plan.decision !== 'READY' || !plan.target || !plan.mode) return refused(plan.reasonCodes, 'REFUSED', plan.target);

  const target = plan.target;
  const mode = plan.mode;
  const startedAt = deps.now().toISOString();
  const jobId = provisioningJobId(deps.now(), deps.randomHex());
  const steps: Array<{ id: string; status: string }> = [];
  let archiveSha256: string | null = null;
  let findings: readonly ComposeSafetyFinding[] = [];
  let rollback: ProjectRuntimeExecution['rollback'] = 'NOT_NEEDED';

  const host = async (phase: string, command: string): Promise<Map<string, string>> => {
    try {
      const result = await deps.runWrite(command, { phase, ...PHASE_LIMITS[phase]! });
      if (result.code !== 0) return new Map([['result', 'failed'], ['reason', 'host_exit']]);
      return keyValues(result.stdout);
    } catch {
      return new Map([['result', 'failed'], ['reason', 'host_unavailable']]);
    }
  };

  const finish = async (result: ProjectRuntimeExecutionResult, reasonCodes: string[]): Promise<ProjectRuntimeExecution> => {
    const execution = Object.freeze({
      result,
      jobId,
      mode,
      target,
      reasonCodes: Object.freeze(reasonCodes),
      findings: Object.freeze([...findings]),
      rollback,
      authorizationInferred: false as const
    });
    const attestation = {
      schemaVersion: 1,
      jobId,
      mode,
      target,
      consent,
      planReasonCodes: plan.reasonCodes,
      governance: plan.governance,
      steps,
      archiveSha256,
      composeFindings: findings,
      result,
      reasonCodes,
      rollback,
      startedAt,
      endedAt: deps.now().toISOString(),
      authorizationInferred: false
    };
    try {
      await deps.writeJobFile(`${PROVISIONING_DATA_ROOT_CONTAINER}/${jobId}/attestation.json`, `${JSON.stringify(attestation, null, 2)}\n`);
    } catch {
      return Object.freeze({ ...execution, reasonCodes: Object.freeze([...reasonCodes, 'ATTESTATION_UNWRITTEN']) });
    }
    return execution;
  };

  const discard = async () => {
    const values = await host('discard', buildDiscardStagingScript({ jobId, target }));
    steps.push({ id: 'discard-staging', status: values.get('result') === 'discarded' ? 'DONE' : 'FAILED' });
  };

  let composeFile: string;
  let services: readonly string[];
  if (mode === 'CREATE' || mode === 'CREATE_AND_ACTIVATE') {
    const fetched = await deps.fetchSource({
      repositoryId: target.repositoryId,
      revision: target.revision,
      destination: `${PROVISIONING_DATA_ROOT_CONTAINER}/${jobId}/source.tar.gz`
    }).catch(() => ({ ok: false, sha256: null }));
    if (!fetched.ok || typeof fetched.sha256 !== 'string' || !SHA256_PATTERN.test(fetched.sha256)) {
      steps.push({ id: 'fetch-source', status: 'FAILED' });
      return finish('FAILED', ['SOURCE_UNAVAILABLE']);
    }
    archiveSha256 = fetched.sha256;
    steps.push({ id: 'fetch-source', status: 'DONE' });

    const staged = await host('stage', buildStageScript({ jobId, target, archiveSha256 }));
    if (staged.get('result') !== 'staged') {
      steps.push({ id: 'backup', status: 'FAILED' });
      await discard();
      return finish('FAILED', [`STAGE_${(staged.get('reason') ?? 'failed').toUpperCase().replace(/[^A-Z_]/g, '_')}`]);
    }
    // The pre-state is proven empty on the host: the backup records that absence.
    steps.push({ id: 'backup', status: 'DONE' });
    const file = staged.get('compose_file') ?? '';
    const safety = COMPOSE_FILES.has(file)
      ? evaluateComposeSafety(composeModel(staged), stagingPath(target.serverPath, jobId))
      : evaluateComposeSafety(null, target.serverPath);
    findings = safety.findings;
    if (!safety.ok) {
      steps.push({ id: 'compose-policy', status: 'BLOCKED' });
      await discard();
      return finish('BLOCKED', ['COMPOSE_UNSAFE']);
    }
    steps.push({ id: 'compose-policy', status: 'DONE' });
    composeFile = file;
    services = safety.services;

    const created = await host('create', buildCreateScript({ jobId, target, composeFile, createdAt: deps.now().toISOString() }));
    if (created.get('result') !== 'created') {
      steps.push({ id: 'create-runtime', status: 'FAILED' });
      await discard();
      return finish('FAILED', ['CREATE_FAILED']);
    }
    steps.push({ id: 'create-runtime', status: 'DONE' });
    if (mode === 'CREATE') return finish('SUCCEEDED', []);
  } else {
    const marker = inventory?.components[0]?.marker;
    if (!marker) return finish('FAILED', ['MARKER_UNAVAILABLE']);
    composeFile = marker.composeFile;
    const configured = await host('config', buildComposeConfigScript({ target, composeFile }));
    const safety = configured.get('result') === 'configured'
      ? evaluateComposeSafety(composeModel(configured), target.serverPath)
      : evaluateComposeSafety(null, target.serverPath);
    findings = safety.findings;
    if (!safety.ok) {
      steps.push({ id: 'compose-policy', status: 'BLOCKED' });
      return finish('BLOCKED', ['COMPOSE_UNSAFE']);
    }
    steps.push({ id: 'compose-policy', status: 'DONE' });
    services = safety.services;
  }

  const labelsOverride = provisioningLabelsOverride(services, {
    repositoryId: target.repositoryId,
    revision: target.revision,
    projectId: target.projectId
  });
  const activated = await host('activate', buildActivateScript({ jobId, target, composeFile, labelsOverride, healthTimeoutSeconds: 180 }));
  if (activated.get('result') === 'activated' && activated.get('health') === 'healthy') {
    steps.push({ id: 'activate', status: 'DONE' }, { id: 'health', status: 'DONE' });
    return finish('SUCCEEDED', []);
  }
  steps.push({ id: 'activate', status: 'FAILED' }, { id: 'health', status: activated.get('health') ?? 'unknown' });
  const rolledBack = await host('rollback', buildRollbackScript({
    jobId,
    target,
    composeFile,
    createdInThisJob: mode === 'CREATE_AND_ACTIVATE'
  }));
  rollback = rolledBack.get('result') === 'rolled_back' ? 'SUCCEEDED' : 'FAILED';
  steps.push({ id: 'rollback', status: rollback });
  return finish(rollback === 'SUCCEEDED' ? 'ROLLED_BACK' : 'FAILED', ['HEALTH_CHECK_FAILED']);
}

/** The reason codes of a plan that does not run, as the executor reports them. */
export type ProjectRuntimeRefusalCode = ProjectRuntimeReasonCode | 'WRITE_TOOLS_DISABLED' | 'PROVISIONING_IN_PROGRESS';
