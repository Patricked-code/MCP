import { createHash } from 'node:crypto';

import type { GitRegistryProjectEvidence } from '../github/registry.js';
import { scopeCoversProjectComponent } from '../governedWorkflow/governance/projectInheritance.js';
import type { ServerTargetConfiguration } from '../liveState/targetProject.js';
import {
  COMPOSE_SOURCE_MAX_BYTES,
  evaluateComposeSafety,
  evaluateComposeSource,
  provisioningLabelsOverride,
  type ComposeDockerfile,
  type ComposeSafetyFinding
} from './composePolicy.js';
import { DOCKERFILE_MAX_BYTES, evaluateDockerfile } from './dockerfilePolicy.js';
import {
  PROVISIONING_LABELS_FILE,
  PROVISIONING_MARKER_FILE,
  PROVISIONING_TREE_DIGEST_SHELL,
  governedRuntimePath,
  planProjectRuntimeProvisioning,
  provisioningInventoryTargets,
  type ProjectRuntimeExecutionMode,
  type ProjectRuntimeProvisioningPlan,
  type ProjectRuntimeReasonCode,
  type ProjectRuntimeTarget,
  type ProvisionedRuntimeInventory,
  type ProvisioningInventoryTarget,
  type ProvisioningMarker
} from './projectRuntime.js';
import type { RevisionAdmission, RevisionAdmissionReasonCode } from './revisionAdmission.js';

export { PROVISIONING_MARKER_FILE, PROVISIONING_TREE_DIGEST_SHELL } from './projectRuntime.js';

/**
 * F.2 (TB-W3-F-03), increment 2: the target-bounded executor of the
 * PROJECT_RUNTIME contract. Right before any write it re-reads the target,
 * the registry and the runtime inventory and re-plans: only a READY plan
 * runs, with write mode on and one provisioning at a time. The revision is
 * then admitted afresh (increment 3): reviewed default-branch history and a
 * non-failing CI gate. Creation fetches the exact revision, stages it beside
 * the target, parses its compose file before Compose loads anything, has
 * Compose build the model from that exact file and checks it, then promotes
 * it and writes the marker; activation, under its own consent, parses the
 * file again, labels and starts the compose project and waits for its
 * health. A failure stops the project without its
 * volumes and moves files to quarantine: nothing is deleted. Every run that
 * reaches a job is attested.
 */
export const PROVISIONING_DATA_ROOT_CONTAINER = '/app/data/provisioning';
export const PROVISIONING_DATA_ROOT_HOST = '/opt/apps/wealthtech-mcp-ssh-bridge/data/provisioning';
export const PROVISIONING_QUARANTINE_ROOT = '/opt/apps/mcp-provisioning-quarantine';
const LABELS_FILE = PROVISIONING_LABELS_FILE;
const MAX_QUARANTINED = 20;
// Room for the largest expanded archive (1 GiB) twice over, and its entries.
const MIN_FREE_KIB = 2 * 1024 * 1024;
const MIN_FREE_INODES = 200_000;
const JOB_ID_PATTERN = /^prov-\d{8}T\d{6}Z-[0-9a-f]{8}$/;
const COMPOSE_PROJECT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/;
const REPOSITORY_ID_PATTERN = /^github:[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]{1,100}$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const COMPOSE_FILES = new Set(['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml']);
const MAX_COMPOSE_CONFIG_BYTES = 200_000;
const CLEAN_ENV = 'env -i PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin HOME="$HOME"';
// Compose keys that read host files outside the project at load time. The parsed source refuses them
// whatever their spelling (evaluateComposeSource); this line match stays a second guard on the host.
const FORBIDDEN_COMPOSE_KEYS = '^[[:space:]-]*(env_file|extends|include|label_file)[[:space:]]*:';



const GOVERNED_ROOT = '/opt/apps';
// Room Docker keeps for a build before activation starts it.
const MIN_DOCKER_FREE_KIB = 10 * 1024 * 1024;

/**
 * Resolves the target's parent on the host and fails unless it lies exactly
 * where its path says below the governed root: the root itself may be a link
 * on the host, nothing below it may redirect a write elsewhere.
 */
export function buildParentGuardLines(target: string, root = GOVERNED_ROOT, onFail = 'fail target_parent_outside'): string[] {
  const parent = target.slice(0, target.lastIndexOf('/'));
  if (!target.startsWith(`${root}/`) || (parent !== root && !parent.startsWith(`${root}/`))) throw new Error('PROVISIONING_TARGET_INVALID');
  return [
    `real_root="$(readlink -f -- ${shellQuote(root)})" && real_parent="$(readlink -f -- ${shellQuote(parent)})" && [ "$real_parent" = "$real_root"${shellQuote(parent.slice(root.length))} ] || ${onFail}`
  ];
}

/**
 * The capacity floors, held on every filesystem a job writes: the target's
 * resolved parent, where the archive is extracted, and the quarantine, where a
 * move across filesystems copies. A directory not created yet is measured on
 * its nearest existing ancestor. Runs after the parent guard sets real_parent.
 */
export function buildCapacityLines(quarantineRoot = PROVISIONING_QUARANTINE_ROOT, others: readonly string[] = []): string[] {
  if ([quarantineRoot, ...others].some((root) => !/^\/[A-Za-z0-9._/-]{1,300}$/.test(root) || root.split('/').includes('..'))) {
    throw new Error('PROVISIONING_QUARANTINE_ROOT_INVALID');
  }
  return [
    'existing_dir() { d="$1"; while [ ! -d "$d" ]; do d="$(dirname "$d")"; done; printf \'%s\' "$d"; }',
    `for fs in "$(existing_dir "$real_parent")" "$(existing_dir ${shellQuote(quarantineRoot)})"${others.map((root) => ` "$(existing_dir ${shellQuote(root)})"`).join('')}; do`,
    `  avail="$(df -Pk "$fs" | awk 'NR==2 {print $4}')"`,
    `  [ "$avail" -ge ${MIN_FREE_KIB} ] 2>/dev/null || fail host_capacity`,
    `  inodes="$(df -Pi "$fs" | awk 'NR==2 {print $4}')"`,
    `  [ "$inodes" -ge ${MIN_FREE_INODES} ] 2>/dev/null || fail host_inodes`,
    'done'
  ];
}

/** Each bind source must already exist in the checkout: Docker would create a missing one after the digest. */
function bindSourceLines(directory: string, bindSources: readonly string[] = []): string[] {
  return bindSources.map((source) => {
    if (!source.split('/').every((segment) => /^[A-Za-z0-9._@+-]{1,100}$/.test(segment) && segment !== '..' && segment !== '.')) {
      throw new Error('PROVISIONING_BIND_SOURCE_INVALID');
    }
    const path = shellQuote(`${directory}/${source}`);
    return `{ [ -e ${path} ] || [ -L ${path} ]; } || fail bind_source_missing`;
  });
}

/** Bounds of an archive's expanded content, checked before any extraction. */
export const PROVISIONING_ARCHIVE_LIMITS = Object.freeze({ maxEntries: 100_000, maxBytes: 1024 * 1024 * 1024 });

/**
 * Lists an archive without extracting it and fails when its entry count or
 * expanded size exceeds the bounds: a small compressed archive never fills
 * the host. A listing that reads nothing fails too.
 */
export function buildArchiveBoundsLines(archive: string, limits: { maxEntries: number; maxBytes: number }): string[] {
  if (!/^\/[A-Za-z0-9._/-]{1,300}$/.test(archive) || archive.split('/').includes('..')) {
    throw new Error('PROVISIONING_ARCHIVE_PATH_INVALID');
  }
  const maxEntries = Math.trunc(limits.maxEntries);
  const maxBytes = Math.trunc(limits.maxBytes);
  if (!(maxEntries > 0) || !(maxBytes > 0)) throw new Error('PROVISIONING_ARCHIVE_LIMITS_INVALID');
  return [
    `bounds="$(tar -tvzf ${shellQuote(archive)} 2>/dev/null | awk '{ n++; s += $3 } END { printf "%d %.0f", n, s }')"`,
    'entries="${bounds% *}"; expanded="${bounds#* }"',
    '[ -n "$bounds" ] && [ "$entries" -gt 0 ] 2>/dev/null || fail archive_listing',
    `[ "$entries" -le ${maxEntries} ] 2>/dev/null || fail archive_too_many_entries`,
    `[ "$expanded" -le ${maxBytes} ] 2>/dev/null || fail archive_expanded_too_large`
  ];
}

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

function assertTreeDigest(treeDigest: string): void {
  if (!SHA256_PATTERN.test(treeDigest)) throw new Error('PROVISIONING_TREE_DIGEST_INVALID');
}

export function provisioningMarker(input: {
  jobId: string;
  target: ProjectRuntimeTarget;
  composeFile: string;
  createdAt: string;
  treeDigest: string;
  services: readonly string[];
  /** The containers each service runs; one each when not given. */
  replicas?: Readonly<Record<string, number>>;
}): ProvisioningMarker {
  assertJobId(input.jobId);
  assertTarget(input.target);
  assertComposeFile(input.composeFile);
  assertTreeDigest(input.treeDigest);
  if (
    input.services.length === 0
    || input.services.length > 20
    || !input.services.every((service) => /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/.test(service))
  ) {
    throw new Error('PROVISIONING_SERVICES_INVALID');
  }
  const replicas = input.replicas ?? Object.fromEntries(input.services.map((service) => [service, 1]));
  if (
    Object.keys(replicas).some((service) => !input.services.includes(service))
    || Object.values(replicas).some((count) => !Number.isInteger(count) || count < 0 || count > 20)
  ) {
    throw new Error('PROVISIONING_REPLICAS_INVALID');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    jobId: input.jobId,
    projectId: input.target.projectId,
    mappingId: input.target.mappingId,
    repositoryId: input.target.repositoryId,
    revision: input.target.revision,
    composeProject: input.target.composeProject,
    composeFile: input.composeFile,
    createdAt: input.createdAt,
    treeDigest: input.treeDigest,
    services: Object.freeze([...input.services]),
    replicas: Object.freeze({ ...replicas })
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

// Target names stay in variables: a docker compose line carries only its flags, never a name the
// write guard could misread as one (a path or project such as "api-v" reads like "-v").
function composeNames(project: string, file: string): string[] {
  return [`project=${shellQuote(project)}`, `file=${shellQuote(file)}`];
}

// Reads the compose file "$file" of "$directory", a regular file and never a link to a host file, and
// prints it whole with its digest: Compose has not read it yet, and loads it only once its parse is admitted.
const COMPOSE_SOURCE_LINES = [
  '[ -f "$directory/$file" ] && [ ! -L "$directory/$file" ] || fail compose_not_regular',
  `size="$(wc -c < "$directory/$file" | tr -d ' ')" || fail compose_source`,
  `[ "$size" -le ${COMPOSE_SOURCE_MAX_BYTES} ] 2>/dev/null || fail compose_source_too_large`,
  `encoded="$(base64 < "$directory/$file" | tr -d '\\n')" || fail compose_source`,
  `digest="$(sha256sum < "$directory/$file" | cut -d' ' -f1)" || fail compose_source`
];
const COMPOSE_SOURCE_PRINT_LINES = [
  `printf 'compose_file=%s\\n' "$file"`,
  `printf 'compose_source_b64=%s\\n' "$encoded"`,
  `printf 'compose_source_sha256=%s\\n' "$digest"`
];

/**
 * Read-only checks before anything is downloaded: the target's parents, a bounded quarantine and room on every
 * filesystem the job writes, the data volume that keeps the archive included.
 */
export function buildPreflightScript(input: { target: ProjectRuntimeTarget }): string {
  assertTarget(input.target);
  return [
    ...header('preflight'),
    ...buildParentGuardLines(input.target.serverPath),
    `q="$(ls -A ${shellQuote(PROVISIONING_QUARANTINE_ROOT)} 2>/dev/null | wc -l | tr -d ' ')"`,
    `[ "\${q:-0}" -lt ${MAX_QUARANTINED} ] 2>/dev/null || fail quarantine_full`,
    ...buildCapacityLines(PROVISIONING_QUARANTINE_ROOT, [PROVISIONING_DATA_ROOT_HOST]),
    "printf 'result=ready\\n'"
  ].join('\n');
}

/**
 * Re-proves absence on the host, verifies and bounds the archive, extracts it
 * beside the target and prints its compose file without loading it.
 */
export function buildStageScript(input: { jobId: string; target: ProjectRuntimeTarget; archiveSha256: string }): string {
  assertJobId(input.jobId);
  assertTarget(input.target);
  if (!SHA256_PATTERN.test(input.archiveSha256)) throw new Error('PROVISIONING_ARCHIVE_DIGEST_INVALID');
  const staging = stagingPath(input.target.serverPath, input.jobId);
  const archive = `${PROVISIONING_DATA_ROOT_HOST}/${input.jobId}/source.tar.gz`;
  return [
    ...header('stage'),
    PROVISIONING_TREE_DIGEST_SHELL,
    ...buildParentGuardLines(input.target.serverPath),
    `[ ! -e ${shellQuote(input.target.serverPath)} ] || fail target_present`,
    `[ ! -e ${shellQuote(staging)} ] || fail staging_present`,
    // The component's own compose project: another component of the same repository never blocks it.
    `c="$(docker ps -aq --filter ${shellQuote(`label=com.docker.compose.project=${input.target.composeProject}`)} 2>/dev/null)" || fail docker_unavailable`,
    '[ -z "$c" ] || fail compose_project_present',
    // Volumes kept by an earlier failed job's rollback are existing state: a creation never reattaches them.
    `v="$(docker volume ls -q --filter ${shellQuote(`label=com.docker.compose.project=${input.target.composeProject}`)} 2>/dev/null)" || fail docker_unavailable`,
    '[ -z "$v" ] || fail compose_project_volumes_present',
    // So are networks a rollback could not remove while a foreign container stayed attached.
    `n="$(docker network ls -q --filter ${shellQuote(`label=com.docker.compose.project=${input.target.composeProject}`)} 2>/dev/null)" || fail docker_unavailable`,
    '[ -z "$n" ] || fail compose_project_networks_present',
    // Failed jobs keep their files, never deleted: a bounded quarantine and a capacity floor keep the host whole.
    `q="$(ls -A ${shellQuote(PROVISIONING_QUARANTINE_ROOT)} 2>/dev/null | wc -l | tr -d ' ')"`,
    `[ "\${q:-0}" -lt ${MAX_QUARANTINED} ] 2>/dev/null || fail quarantine_full`,
    ...buildCapacityLines(),
    `[ -f ${shellQuote(archive)} ] || fail archive_missing`,
    `[ "$(sha256sum ${shellQuote(archive)} | cut -d' ' -f1)" = ${shellQuote(input.archiveSha256)} ] || fail archive_digest`,
    ...buildArchiveBoundsLines(archive, PROVISIONING_ARCHIVE_LIMITS),
    `mkdir -p ${shellQuote(staging)} || fail extract`,
    `tar -xzf ${shellQuote(archive)} -C ${shellQuote(staging)} --strip-components=1 --no-same-owner --no-same-permissions || fail extract`,
    `directory=${shellQuote(staging)}`,
    // The repository never ships the files provisioning writes and the digest leaves out.
    `for reserved in ${shellQuote(PROVISIONING_MARKER_FILE)} ${shellQuote(LABELS_FILE)}; do if [ -e "$directory/$reserved" ] || [ -L "$directory/$reserved" ]; then fail reserved_name_present; fi; done`,
    "file=''",
    'for candidate in compose.yaml compose.yml docker-compose.yaml docker-compose.yml; do',
    '  if [ -e "$directory/$candidate" ] || [ -L "$directory/$candidate" ]; then file="$candidate"; break; fi',
    'done',
    '[ -n "$file" ] || fail compose_missing',
    ...COMPOSE_SOURCE_LINES,
    'tree="$(tree_digest "$directory")" || fail tree_digest',
    "printf 'result=staged\\n'",
    ...COMPOSE_SOURCE_PRINT_LINES,
    "printf 'tree_digest=%s\\n' \"$tree\""
  ].join('\n');
}

/** Promotes the staging directory to the target and writes the marker; a failed marker undoes the promotion. */
export function buildCreateScript(input: {
  jobId: string;
  target: ProjectRuntimeTarget;
  composeFile: string;
  createdAt: string;
  treeDigest: string;
  services: readonly string[];
  replicas?: Readonly<Record<string, number>>;
  bindSources?: readonly string[];
}): string {
  const marker = provisioningMarker(input);
  const staging = stagingPath(input.target.serverPath, input.jobId);
  const target = shellQuote(input.target.serverPath);
  return [
    ...header('create'),
    ...buildParentGuardLines(input.target.serverPath),
    `[ -d ${shellQuote(staging)} ] || fail staging_missing`,
    ...bindSourceLines(staging, input.bindSources),
    `[ ! -e ${target} ] || fail target_present`,
    `mv ${shellQuote(staging)} ${target} || fail promote`,
    `if ! printf '%s\\n' ${shellQuote(JSON.stringify(marker))} > ${shellQuote(`${input.target.serverPath}/${PROVISIONING_MARKER_FILE}`)}; then mv ${target} ${shellQuote(staging)}; fail marker; fi`,
    "printf 'result=created\\n'"
  ].join('\n');
}

/** Prints the compose file of a created runtime whose checkout still matches the digest of its creation. */
export function buildComposeSourceScript(input: { target: ProjectRuntimeTarget; composeFile: string; treeDigest: string }): string {
  assertTarget(input.target);
  assertComposeFile(input.composeFile);
  assertTreeDigest(input.treeDigest);
  return [
    ...header('source'),
    PROVISIONING_TREE_DIGEST_SHELL,
    `directory=${shellQuote(input.target.serverPath)}`,
    `file=${shellQuote(input.composeFile)}`,
    'tree="$(tree_digest "$directory")" || fail tree_digest',
    `[ "$tree" = ${shellQuote(input.treeDigest)} ] || fail checkout_modified`,
    ...COMPOSE_SOURCE_LINES,
    "printf 'result=sourced\\n'",
    ...COMPOSE_SOURCE_PRINT_LINES
  ].join('\n');
}

/**
 * Prints the compose model of a checkout, staged by the job or created
 * earlier, built from the exact file whose parsed source was admitted, after
 * the link checks. The parsed source is the control for the keys that load
 * host files. `--no-env-resolution` is a second guard where Compose honours
 * it: Docker Compose v5.1.1 keeps an `env_file` in the model, unread, while
 * v2.38.2 still reads it, so the option is passed when known, never relied on.
 */
export function buildComposeConfigScript(input: {
  target: ProjectRuntimeTarget;
  composeFile: string;
  sourceSha256: string;
  jobId?: string;
}): string {
  assertTarget(input.target);
  assertComposeFile(input.composeFile);
  if (!SHA256_PATTERN.test(input.sourceSha256)) throw new Error('PROVISIONING_COMPOSE_SOURCE_DIGEST_INVALID');
  const directory = input.jobId === undefined ? input.target.serverPath : stagingPath(input.target.serverPath, input.jobId);
  return [
    ...header('config'),
    `directory=${shellQuote(directory)}`,
    ...composeNames(input.target.composeProject, input.composeFile),
    '[ -f "$directory/$file" ] && [ ! -L "$directory/$file" ] || fail compose_missing',
    `[ "$(sha256sum < "$directory/$file" | cut -d' ' -f1)" = ${shellQuote(input.sourceSha256)} ] || fail compose_source_changed`,
    `if grep -Eq ${shellQuote(FORBIDDEN_COMPOSE_KEYS)} "$directory/$file"; then fail compose_feature_forbidden; fi`,
    symlinkGuard(directory),
    '[ -z "$outside" ] || fail symlink_outside',
    "resolution=''",
    `if ${CLEAN_ENV} docker compose config --help 2>/dev/null | grep -q -- --no-env-resolution; then resolution='--no-env-resolution'; fi`,
    `config="$(cd "$directory" && ${CLEAN_ENV} docker compose -p "$project" -f "$file" config $resolution --format json 2>/dev/null)" || fail compose_invalid`,
    "printf 'result=configured\\n'",
    `printf 'compose_file=%s\\n' "$file"`,
    `printf 'compose_config_b64=%s\\n' "$(printf '%s' "$config" | head -c ${MAX_COMPOSE_CONFIG_BYTES} | base64 | tr -d '\\n')"`
  ].join('\n');
}

/**
 * Verifies that the checkout still matches the digest of its creation, then
 * labels and starts the compose project and waits for every container to be
 * healthy.
 */
export function buildActivateScript(input: {
  jobId: string;
  target: ProjectRuntimeTarget;
  composeFile: string;
  labelsOverride: string;
  healthTimeoutSeconds: number;
  treeDigest: string;
  /** The containers the compose model runs: health counts them all. */
  expectedContainers?: number;
  bindSources?: readonly string[];
}): string {
  assertJobId(input.jobId);
  assertTarget(input.target);
  assertComposeFile(input.composeFile);
  assertTreeDigest(input.treeDigest);
  JSON.parse(input.labelsOverride);
  const timeout = Math.max(30, Math.min(900, Math.trunc(input.healthTimeoutSeconds)));
  const expected = Math.max(1, Math.min(20, Math.trunc(input.expectedContainers ?? 1)));
  const directory = shellQuote(input.target.serverPath);
  const marker = shellQuote(`${input.target.serverPath}/${PROVISIONING_MARKER_FILE}`);
  const labels = shellQuote(`${input.target.serverPath}/${LABELS_FILE}`);
  const compose = `${CLEAN_ENV} docker compose -p "$project" -f "$file" -f "$labels"`;
  return [
    ...header('activate'),
    PROVISIONING_TREE_DIGEST_SHELL,
    ...buildParentGuardLines(input.target.serverPath),
    `[ -f ${marker} ] || fail marker_missing`,
    `grep -q ${shellQuote(`"revision":"${input.target.revision}"`)} ${marker} || fail marker_mismatch`,
    `grep -q ${shellQuote(`"composeProject":"${input.target.composeProject}"`)} ${marker} || fail marker_mismatch`,
    `grep -q ${shellQuote(`"treeDigest":"${input.treeDigest}"`)} ${marker} || fail marker_mismatch`,
    `tree="$(tree_digest ${directory})" || fail tree_digest`,
    `[ "$tree" = ${shellQuote(input.treeDigest)} ] || fail checkout_modified`,
    ...bindSourceLines(input.target.serverPath, input.bindSources),
    `printf '%s\\n' ${shellQuote(input.labelsOverride)} > ${labels} || fail labels`,
    ...composeNames(input.target.composeProject, input.composeFile),
    `labels=${labels}`,
    `cd ${directory} || fail target_missing`,
    // A build fills Docker's own storage: it keeps a floor of room before anything is built.
    `docker_root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null)" || fail docker_unavailable`,
    `docker_avail="$(df -Pk "$docker_root" | awk 'NR==2 {print $4}')"`,
    `[ "$docker_avail" -ge ${MIN_DOCKER_FREE_KIB} ] 2>/dev/null || fail docker_capacity`,
    `if ! ${compose} up -d --build >/dev/null 2>&1; then printf 'result=unhealthy\\nhealth=start_failed\\n'; exit 0; fi`,
    `deadline=$(( $(date +%s) + ${timeout} ))`,
    'health=starting',
    'while [ "$(date +%s)" -lt "$deadline" ]; do',
    `  states="$(${compose} ps --all --format '{{.State}}|{{.Health}}' 2>/dev/null)" || { health=unknown; break; }`,
    '  if [ -z "$states" ]; then health=absent; break; fi',
    `  if printf '%s\\n' "$states" | grep -Eq '^(exited|dead|removing|restarting)[|]|[|]unhealthy$'; then health=unhealthy; break; fi`,
    `  if printf '%s\\n' "$states" | grep -Evq '^running[|]healthy$'; then sleep 3; continue; fi`,
    `  if [ "$(printf '%s\\n' "$states" | wc -l | tr -d ' ')" -ne ${expected} ]; then sleep 3; continue; fi`,
    '  health=healthy; break',
    'done',
    // The images the runtime runs, built or pulled, are reported for the attestation.
    // A service that rewrote the checkout while starting never succeeds: it is digested again after the health gate.
    `if [ "$health" = healthy ]; then after="$(tree_digest ${directory})" && [ "$after" = ${shellQuote(input.treeDigest)} ] || health=checkout_modified; fi`,
    // The images the runtime runs are reported for the attestation, one valid ID for every expected container.
    `if [ "$health" = healthy ]; then ids="$(${compose} ps -aq 2>/dev/null)" && all="$(docker inspect --format '{{.Image}}' $ids 2>/dev/null)" || health=images_unknown; fi`,
    `if [ "$health" = healthy ] && { [ "$(printf '%s\\n' "$all" | grep -cE '^sha256:[0-9a-f]{64}$')" -ne ${expected} ] || [ "$(printf '%s\\n' "$all" | wc -l | tr -d ' ')" -ne ${expected} ]; }; then health=images_unknown; fi`,
    `if [ "$health" = healthy ]; then printf 'images=%s\\n' "$(printf '%s\\n' "$all" | sort -u | paste -sd, -)"; fi`,
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
  /** The digest the checkout had when it was validated: Compose loads it again only if unchanged. */
  treeDigest: string;
}): string {
  assertJobId(input.jobId);
  assertTarget(input.target);
  assertComposeFile(input.composeFile);
  assertTreeDigest(input.treeDigest);
  const directory = shellQuote(input.target.serverPath);
  const lines = [
    ...header('rollback'),
    PROVISIONING_TREE_DIGEST_SHELL,
    'status=rolled_back',
    'parent_ok=yes',
    ...buildParentGuardLines(input.target.serverPath, GOVERNED_ROOT, "{ parent_ok=no; status=failed; printf 'warning=target_parent_outside\\n'; }"),
    `directory=${directory}`,
    ...composeNames(input.target.composeProject, input.composeFile),
    // A running service may have rewritten its compose file: Compose loads it only if the checkout is the one validated.
    `if [ "$parent_ok" = yes ] && [ -d "$directory" ] && tree="$(tree_digest "$directory")" && [ "$tree" = ${shellQuote(input.treeDigest)} ]; then`,
    `  (cd "$directory" && ${CLEAN_ENV} docker compose -p "$project" -f "$file" down --remove-orphans >/dev/null 2>&1) || status=failed`,
    'else',
    `  ids="$(docker ps -aq --filter ${shellQuote(`label=com.docker.compose.project=${input.target.composeProject}`)} 2>/dev/null)" || status=failed`,
    // A stopped container keeps its restart policy: cleared first, a daemon restart never brings it back.
    '  if [ -n "$ids" ]; then docker update --restart=no $ids >/dev/null 2>&1 || status=failed; docker stop $ids >/dev/null 2>&1 || status=failed; fi',
    "  printf 'teardown=stopped\\n'",
    'fi'
  ];
  if (input.createdInThisJob) {
    lines.push(
      `if [ "$parent_ok" = yes ]; then mkdir -p ${shellQuote(PROVISIONING_QUARANTINE_ROOT)} || status=failed; fi`,
      `if [ "$parent_ok" = yes ] && [ -e ${directory} ]; then mv ${directory} ${shellQuote(`${PROVISIONING_QUARANTINE_ROOT}/${input.jobId}`)} || status=failed; fi`
    );
  }
  lines.push(`printf 'result=%s\\n' "$status"`);
  return lines.join('\n');
}

/** Prints the Dockerfiles of a checkout whose tree still matches its digest: regular files only, each bounded. */
export function buildDockerfilesScript(input: { directory: string; treeDigest: string; paths: readonly string[] }): string {
  if (governedRuntimePath(input.directory) !== input.directory) throw new Error('PROVISIONING_TARGET_INVALID');
  assertTreeDigest(input.treeDigest);
  if (input.paths.length === 0 || input.paths.length > 20) throw new Error('PROVISIONING_DOCKERFILES_INVALID');
  const lines = [
    ...header('dockerfiles'),
    PROVISIONING_TREE_DIGEST_SHELL,
    `directory=${shellQuote(input.directory)}`,
    'tree="$(tree_digest "$directory")" || fail tree_digest',
    `[ "$tree" = ${shellQuote(input.treeDigest)} ] || fail checkout_modified`
  ];
  input.paths.forEach((path, index) => {
    if (!path.split('/').every((segment) => /^[A-Za-z0-9._@+-]{1,100}$/.test(segment) && segment !== '..' && segment !== '.')) {
      throw new Error('PROVISIONING_DOCKERFILES_INVALID');
    }
    const file = shellQuote(`${input.directory}/${path}`);
    lines.push(
      `{ [ -f ${file} ] && [ ! -L ${file} ]; } || fail dockerfile_missing`,
      `[ "$(wc -c < ${file} | tr -d ' ')" -le ${DOCKERFILE_MAX_BYTES} ] || fail dockerfile_too_large`,
      `printf 'dockerfile.${index}=%s\\n' "$(base64 < ${file} | tr -d '\\n')"`
    );
  });
  lines.push("printf 'result=printed\\n'");
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

/**
 * What the Governed Task Queue and the Governed Lock Service hold: active
 * locks with their scope and target project, active tasks with their resource
 * scopes. Incomplete or unreadable coordination never permits a write.
 */
export type ProvisioningCoordination = Readonly<{
  complete: boolean;
  locks: ReadonlyArray<Readonly<{ scope: string; projectId: string | null }>>;
  tasks: ReadonlyArray<Readonly<{ taskId: string; resourceScopes: readonly string[] }>>;
}>;

export type ProjectRuntimeExecutionDependencies = {
  writeEnabled: () => boolean;
  now: () => Date;
  randomHex: () => string;
  readServerTarget: () => Promise<ServerTargetConfiguration>;
  readRegistry: () => Promise<GitRegistryProjectEvidence>;
  /** A fresh read-only inventory of the targets, never a cached snapshot. */
  observe: (targets: ProvisioningInventoryTarget[]) => Promise<ProvisionedRuntimeInventory>;
  /** The coordination authorities, read afresh before any write; null when they cannot be read. */
  readCoordination: () => Promise<ProvisioningCoordination | null>;
  /** The admission of the exact revision on the mapping's official branch, read afresh from GitHub before any write. */
  admitRevision: (input: { repositoryId: string; revision: string; branch: string }) => Promise<RevisionAdmission>;
  fetchSource: (input: { repositoryId: string; revision: string; destination: string }) => Promise<
    { ok: boolean; sha256?: string | null; bytes?: number }
  >;
  writeJobFile: (path: string, content: string) => Promise<void>;
  /** A job file of the data volume; null when absent or unreadable. */
  readJobFile: (path: string) => Promise<string | null>;
  runWrite: (command: string, options: { phase: string; timeoutMs: number; maxOutputBytes: number }) => Promise<HostResult>;
};

const PHASE_LIMITS: Record<string, { timeoutMs: number; maxOutputBytes: number }> = {
  preflight: { timeoutMs: 60_000, maxOutputBytes: 8_192 },
  stage: { timeoutMs: 300_000, maxOutputBytes: 400_000 },
  source: { timeoutMs: 300_000, maxOutputBytes: 400_000 },
  create: { timeoutMs: 60_000, maxOutputBytes: 8_192 },
  config: { timeoutMs: 120_000, maxOutputBytes: 400_000 },
  dockerfiles: { timeoutMs: 300_000, maxOutputBytes: 3_000_000 },
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

/** The compose file the host printed, only when it arrived whole: bounded, UTF-8 and matching its digest. */
function printedComposeSource(values: Map<string, string>): { source: string; sha256: string } | null {
  const digest = values.get('compose_source_sha256') ?? '';
  const encoded = values.get('compose_source_b64') ?? '';
  if (!SHA256_PATTERN.test(digest) || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length === 0 || bytes.length > COMPOSE_SOURCE_MAX_BYTES) return null;
  if (createHash('sha256').update(bytes).digest('hex') !== digest) return null;
  const source = bytes.toString('utf8');
  return Buffer.from(source, 'utf8').equals(bytes) ? { source, sha256: digest } : null;
}

function hostReason(prefix: string, values: Map<string, string>): string {
  return `${prefix}_${(values.get('reason') ?? 'failed').toUpperCase().replace(/[^A-Z_]/g, '_')}`;
}

type ObservationDependencies = Pick<ProjectRuntimeExecutionDependencies, 'readServerTarget' | 'readRegistry' | 'observe' | 'readJobFile'>;

function markerIdentity(marker: ProvisioningMarker): string {
  return JSON.stringify([
    marker.jobId, marker.mappingId, marker.repositoryId, marker.revision, marker.composeProject, marker.composeFile,
    marker.treeDigest, [...marker.services].sort(), Object.entries(marker.replicas).sort(([a], [b]) => a.localeCompare(b))
  ]);
}

/**
 * The checkout's marker counts only when the job data recorded the same one:
 * a runtime that writes into its own checkout could rewrite the marker, never
 * the record kept in the MCP data volume.
 */
async function withTrustedMarkers(inventory: ProvisionedRuntimeInventory, deps: Pick<ObservationDependencies, 'readJobFile'>): Promise<ProvisionedRuntimeInventory> {
  const components = await Promise.all(inventory.components.map(async (component) => {
    if (!component.marker) return component;
    const recorded = await deps.readJobFile(`${PROVISIONING_DATA_ROOT_CONTAINER}/${component.marker.jobId}/marker.json`).catch(() => null);
    let trusted = false;
    try {
      trusted = recorded !== null && markerIdentity(JSON.parse(recorded) as ProvisioningMarker) === markerIdentity(component.marker);
    } catch {
      trusted = false;
    }
    if (!trusted) return Object.freeze({ ...component, marker: null, treeDigest: null, expectedImages: null });
    const recordedImages = await deps.readJobFile(`${PROVISIONING_DATA_ROOT_CONTAINER}/${component.marker.jobId}/images.json`).catch(() => null);
    let expectedImages: string[] | null = null;
    try {
      const parsed = recordedImages === null ? null : JSON.parse(recordedImages);
      expectedImages = Array.isArray(parsed) && parsed.every((image) => typeof image === 'string' && /^sha256:[0-9a-f]{64}$/.test(image)) ? parsed : null;
    } catch {
      expectedImages = null;
    }
    return Object.freeze({ ...component, expectedImages });
  }));
  return Object.freeze({ ...inventory, components: Object.freeze(components) });
}

/** Reads the target, the registry and the inventory afresh, then plans: the same path for a preview and a run. */
async function observeAndPlan(
  request: unknown,
  consent: { creation: boolean; activation: boolean },
  deps: ObservationDependencies
): Promise<{ plan: ProjectRuntimeProvisioningPlan; inventory: ProvisionedRuntimeInventory | null }> {
  const [serverTarget, registry] = await Promise.all([deps.readServerTarget(), deps.readRegistry()]);
  const fields = request && typeof request === 'object' ? request as Record<string, unknown> : {};
  const targets = typeof fields.projectId === 'string' ? provisioningInventoryTargets(registry, fields.projectId) : [];
  const mappingTargets = targets.filter((entry) => entry.mappingId === fields.mappingId);
  const inventory = mappingTargets.length === 1 ? await withTrustedMarkers(await deps.observe(mappingTargets), deps) : null;
  return { plan: planProjectRuntimeProvisioning({ request, serverTarget, registry, inventory, consent }), inventory };
}

/** The plan of a request on fresh evidence and without any consent: what the surface shows before asking. Read-only. */
export async function previewProjectRuntimeProvisioning(
  request: unknown,
  deps: ObservationDependencies
): Promise<ProjectRuntimeProvisioningPlan> {
  return (await observeAndPlan(request, { creation: false, activation: false }, deps)).plan;
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

/** The resolved target a consent named: a run refuses if the fresh plan resolves another one. */
export type ProvisioningConsentedTarget = Readonly<{ repositoryId: string; serverPath: string; composeProject: string }>;

type CoordinationRefusal = 'COORDINATION_UNAVAILABLE' | 'TARGET_LOCKED' | 'TARGET_CLAIMED_BY_TASK';

export type ProjectRuntimeExecutionInput = {
  request: unknown;
  consent: { creation: boolean; activation: boolean };
  expectedTarget: ProvisioningConsentedTarget | null;
};

/**
 * Executes a READY plan of one component runtime. Consents are decided
 * server-side by the caller (E3) and never inferred here.
 */
export async function executeProjectRuntimeProvisioning(
  input: ProjectRuntimeExecutionInput,
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
  input: ProjectRuntimeExecutionInput,
  deps: ProjectRuntimeExecutionDependencies
): Promise<ProjectRuntimeExecution> {
  const consent = { creation: input.consent.creation === true, activation: input.consent.activation === true };
  const { plan, inventory } = await observeAndPlan(input.request, consent, deps);
  if (plan.decision === 'NO_OP') return refused(plan.reasonCodes, 'NO_OP', plan.target);
  if (plan.decision !== 'READY' || !plan.target || !plan.mode) return refused(plan.reasonCodes, 'REFUSED', plan.target);

  const target = plan.target;
  const mode = plan.mode;
  // The consent named a resolved target: a registry change since then never redirects it.
  const expected = input.expectedTarget;
  if (
    !expected
    || expected.repositoryId !== target.repositoryId
    || expected.serverPath !== target.serverPath
    || expected.composeProject !== target.composeProject
  ) {
    return refused(['TARGET_CHANGED_SINCE_CONSENT'], 'REFUSED', target);
  }
  // Work claimed or locked on this component is never overtaken (UAC): the coordination authorities are
  // read before the job starts and again immediately before every host write, so no GitHub call or download
  // sits between the last read and a write. What cannot be read refuses.
  const component = { repositoryId: target.repositoryId, mappingId: target.mappingId };
  const collision = (read: ProvisioningCoordination | null): CoordinationRefusal | null => {
    if (!read || read.complete !== true) return 'COORDINATION_UNAVAILABLE';
    if (read.locks.some((lock) => scopeCoversProjectComponent(lock.scope, component) || lock.projectId === target.projectId)) {
      return 'TARGET_LOCKED';
    }
    if (read.tasks.some((task) => task.resourceScopes.some((scope) => scopeCoversProjectComponent(scope, component)))) {
      return 'TARGET_CLAIMED_BY_TASK';
    }
    return null;
  };
  const initial = await deps.readCoordination().catch(() => null);
  const initialCollision = collision(initial);
  if (initialCollision || !initial) return refused([initialCollision ?? 'COORDINATION_UNAVAILABLE'], 'REFUSED', target);
  let coordination: ProvisioningCoordination = initial;
  // The revision is admitted afresh before any write, even for a runtime created by an earlier job, and only
  // from the official branch the mapping names.
  const branch = plan.governance?.officialBranch ?? null;
  let admission = branch === null
    ? null
    : await deps.admitRevision({ repositoryId: target.repositoryId, revision: target.revision, branch }).catch(() => null);
  if (!admission?.admitted || (admission.kind !== 'CI_GATE' && admission.kind !== 'MANUAL_CONSENT')) {
    const reasonCode = admission && admission.reasonCode !== 'REVISION_ADMITTED' ? admission.reasonCode : 'REVISION_ADMISSION_UNAVAILABLE';
    return refused([reasonCode], 'REFUSED', target);
  }
  const startedAt = deps.now().toISOString();
  const jobId = provisioningJobId(deps.now(), deps.randomHex());
  const steps: Array<{ id: string; status: string }> = [];
  let archiveSha256: string | null = null;
  let composeSourceSha256: string | null = null;
  let builtImages: string[] = [];
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

  /** The admission read again before a write; the one that authorizes the write is the one attested. */
  const readmit = async (): Promise<string | null> => {
    const readmitted = await deps.admitRevision({ repositoryId: target.repositoryId, revision: target.revision, branch: branch! }).catch(() => null);
    if (readmitted?.admitted && (readmitted.kind === 'CI_GATE' || readmitted.kind === 'MANUAL_CONSENT')) {
      admission = readmitted;
      return null;
    }
    return readmitted && readmitted.reasonCode !== 'REVISION_ADMITTED' ? readmitted.reasonCode : 'REVISION_ADMISSION_UNAVAILABLE';
  };

  /** The last coordination read before a host write; a collision found then blocks that write. */
  const recheck = async (): Promise<CoordinationRefusal | null> => {
    const read = await deps.readCoordination().catch(() => null);
    const found = collision(read);
    if (!found && read) coordination = read;
    return found;
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
      coordination: { locks: coordination.locks.length, tasks: coordination.tasks.length },
      admission,
      steps,
      archiveSha256,
      composeSourceSha256,
      builtImages,
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

  const checkBuildInputs = async (
    dockerfiles: readonly ComposeDockerfile[],
    directory: string,
    digest: string
  ): Promise<{ result: ProjectRuntimeExecutionResult; reasonCodes: string[] } | null> => {
    if (dockerfiles.length === 0) return null;
    const onDisk = dockerfiles.filter((entry) => entry.path !== null);
    const paths = [...new Set(onDisk.map((entry) => entry.path!))];
    let printed = new Map<string, string>();
    if (paths.length > 0) {
      printed = await host('dockerfiles', buildDockerfilesScript({ directory, treeDigest: digest, paths }));
      if (printed.get('result') !== 'printed') {
        steps.push({ id: 'build-inputs', status: 'FAILED' });
        return { result: 'FAILED', reasonCodes: [hostReason('DOCKERFILES', printed)] };
      }
    }
    const found: ComposeSafetyFinding[] = [];
    for (const entry of dockerfiles) {
      let text: string | null = entry.inline;
      if (entry.path !== null) {
        const encoded = printed.get(`dockerfile.${paths.indexOf(entry.path)}`) ?? '';
        const bytes = /^[A-Za-z0-9+/]*={0,2}$/.test(encoded) ? Buffer.from(encoded, 'base64') : null;
        text = bytes && bytes.length <= DOCKERFILE_MAX_BYTES && Buffer.from(bytes.toString('utf8'), 'utf8').equals(bytes) ? bytes.toString('utf8') : null;
      }
      for (const finding of evaluateDockerfile(text ?? '\u0000', entry.contexts)) {
        found.push(Object.freeze({ code: finding.code, service: entry.service, key: finding.key }));
      }
    }
    if (found.length > 0) {
      findings = found;
      steps.push({ id: 'build-inputs', status: 'BLOCKED' });
      return { result: 'BLOCKED', reasonCodes: ['COMPOSE_UNSAFE'] };
    }
    steps.push({ id: 'build-inputs', status: 'DONE' });
    return null;
  };

  type ComposeCheck = { services: readonly string[]; replicas: Readonly<Record<string, number>>; bindSources: readonly string[] } | { result: ProjectRuntimeExecutionResult; reasonCodes: string[] };
  // The compose file is parsed before Compose loads anything: a key that reads a host file, however it is
  // spelled, never runs. Compose then builds the model from that exact file, which is checked in turn.
  const checkCompose = async (printed: Map<string, string>, composeFile: string, unreadable: string, staged: boolean, digest: string): Promise<ComposeCheck> => {
    const source = COMPOSE_FILES.has(composeFile) && printed.get('compose_file') === composeFile ? printedComposeSource(printed) : null;
    if (!source) {
      steps.push({ id: 'compose-source', status: 'FAILED' });
      return { result: 'FAILED', reasonCodes: [unreadable] };
    }
    composeSourceSha256 = source.sha256;
    const parsed = evaluateComposeSource(source.source);
    findings = parsed.findings;
    if (!parsed.ok) {
      steps.push({ id: 'compose-source', status: 'BLOCKED' });
      return { result: 'BLOCKED', reasonCodes: ['COMPOSE_UNSAFE'] };
    }
    steps.push({ id: 'compose-source', status: 'DONE' });
    const configured = await host('config', buildComposeConfigScript({
      target,
      composeFile,
      sourceSha256: source.sha256,
      ...(staged ? { jobId } : {})
    }));
    if (configured.get('result') !== 'configured') {
      steps.push({ id: 'compose-policy', status: 'FAILED' });
      return { result: 'FAILED', reasonCodes: [hostReason('CONFIG', configured)] };
    }
    const safety = evaluateComposeSafety(composeModel(configured), staged ? stagingPath(target.serverPath, jobId) : target.serverPath);
    findings = safety.findings;
    if (!safety.ok) {
      steps.push({ id: 'compose-policy', status: 'BLOCKED' });
      return { result: 'BLOCKED', reasonCodes: ['COMPOSE_UNSAFE'] };
    }
    steps.push({ id: 'compose-policy', status: 'DONE' });
    // Owner decision on PR #261: every image a build pulls is pinned, read from the digested checkout itself.
    const inputs = await checkBuildInputs(safety.dockerfiles, staged ? stagingPath(target.serverPath, jobId) : target.serverPath, digest);
    if (inputs) return inputs;
    return { services: safety.services, replicas: safety.replicas, bindSources: safety.bindSources };
  };

  let composeFile: string;
  let services: readonly string[];
  let replicas: Readonly<Record<string, number>>;
  let bindSources: readonly string[];
  let treeDigest: string;
  if (mode === 'CREATE' || mode === 'CREATE_AND_ACTIVATE') {
    // Nothing is downloaded onto a host without room: the read-only preflight runs first.
    const preflight = await host('preflight', buildPreflightScript({ target }));
    if (preflight.get('result') !== 'ready') {
      steps.push({ id: 'preflight', status: 'FAILED' });
      return finish('FAILED', [hostReason('PREFLIGHT', preflight)]);
    }
    steps.push({ id: 'preflight', status: 'DONE' });
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

    // The admission is read again after the download: a branch or CI change meanwhile never reaches the host.
    const beforeStageAdmission = await readmit();
    if (beforeStageAdmission) {
      steps.push({ id: 'backup', status: 'BLOCKED' });
      return finish('BLOCKED', [beforeStageAdmission]);
    }
    const beforeStage = await recheck();
    if (beforeStage) {
      steps.push({ id: 'backup', status: 'BLOCKED' });
      return finish('BLOCKED', [beforeStage]);
    }
    const staged = await host('stage', buildStageScript({ jobId, target, archiveSha256 }));
    if (staged.get('result') !== 'staged') {
      steps.push({ id: 'backup', status: 'FAILED' });
      await discard();
      return finish('FAILED', [hostReason('STAGE', staged)]);
    }
    const stagedDigest = staged.get('tree_digest') ?? '';
    if (!SHA256_PATTERN.test(stagedDigest)) {
      steps.push({ id: 'backup', status: 'FAILED' });
      await discard();
      return finish('FAILED', ['STAGE_TREE_DIGEST_MISSING']);
    }
    treeDigest = stagedDigest;
    // The pre-state is proven empty on the host: the backup records that absence.
    steps.push({ id: 'backup', status: 'DONE' });
    const file = staged.get('compose_file') ?? '';
    const checked = await checkCompose(staged, file, 'STAGE_SOURCE_UNREADABLE', true, stagedDigest);
    if ('result' in checked) {
      await discard();
      return finish(checked.result, checked.reasonCodes);
    }
    composeFile = file;
    services = checked.services;
    replicas = checked.replicas;
    bindSources = checked.bindSources;

    // The marker is recorded in the job data first: the checkout's own copy counts only when it matches.
    const markerInput = { jobId, target, composeFile, createdAt: deps.now().toISOString(), treeDigest, services, replicas };
    try {
      await deps.writeJobFile(`${PROVISIONING_DATA_ROOT_CONTAINER}/${jobId}/marker.json`, `${JSON.stringify(provisioningMarker(markerInput))}\n`);
    } catch {
      steps.push({ id: 'create-runtime', status: 'FAILED' });
      await discard();
      return finish('FAILED', ['MARKER_RECORD_UNWRITTEN']);
    }
    const beforeCreateAdmission = await readmit();
    if (beforeCreateAdmission) {
      steps.push({ id: 'create-runtime', status: 'BLOCKED' });
      await discard();
      return finish('BLOCKED', [beforeCreateAdmission]);
    }
    const beforeCreate = await recheck();
    if (beforeCreate) {
      // The component is claimed now: nothing more is written, not even the staging's move to quarantine.
      steps.push({ id: 'create-runtime', status: 'BLOCKED' });
      return finish('BLOCKED', [beforeCreate]);
    }
    const created = await host('create', buildCreateScript({ ...markerInput, bindSources }));
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
    treeDigest = marker.treeDigest;
    // The source of a created runtime is parsed again, from the checkout its marker digests.
    const sourced = await host('source', buildComposeSourceScript({ target, composeFile, treeDigest }));
    if (sourced.get('result') !== 'sourced') {
      steps.push({ id: 'compose-source', status: 'FAILED' });
      return finish('FAILED', [hostReason('SOURCE', sourced)]);
    }
    const checked = await checkCompose(sourced, composeFile, 'SOURCE_UNREADABLE', false, treeDigest);
    if ('result' in checked) return finish(checked.result, checked.reasonCodes);
    services = checked.services;
    bindSources = checked.bindSources;
    // The recorded replicas, not those of a model rebuilt now.
    replicas = marker.replicas;
  }

  // A creation stopped here keeps its checkout, as a creation alone leaves it; nothing starts.
  const beforeActivateAdmission = await readmit();
  if (beforeActivateAdmission) {
    steps.push({ id: 'activate', status: 'BLOCKED' });
    return finish('BLOCKED', [beforeActivateAdmission]);
  }
  const beforeActivate = await recheck();
  if (beforeActivate) {
    steps.push({ id: 'activate', status: 'BLOCKED' });
    return finish('BLOCKED', [beforeActivate]);
  }
  const labelsOverride = provisioningLabelsOverride(services, {
    repositoryId: target.repositoryId,
    revision: target.revision,
    projectId: target.projectId
  });
  const activated = await host('activate', buildActivateScript({ jobId, target, composeFile, labelsOverride, healthTimeoutSeconds: 180, treeDigest,
    expectedContainers: Object.values(replicas).reduce((sum, count) => sum + count, 0), bindSources }));
  builtImages = (activated.get('images') ?? '').split(',').filter((image) => /^sha256:[0-9a-f]{64}$/.test(image)).sort();
  if (activated.get('result') === 'activated' && activated.get('health') === 'healthy') {
    steps.push({ id: 'activate', status: 'DONE' }, { id: 'health', status: 'DONE' });
    // The images are recorded once per created runtime, in the job data the runtime cannot reach: NO_OP compares them.
    const recordJob = mode === 'ACTIVATE' ? inventory?.components[0]?.marker?.jobId ?? jobId : jobId;
    try {
      await deps.writeJobFile(`${PROVISIONING_DATA_ROOT_CONTAINER}/${recordJob}/images.json`, `${JSON.stringify(builtImages)}\n`);
    } catch {
      return finish('SUCCEEDED', ['IMAGES_RECORD_UNWRITTEN']);
    }
    return finish('SUCCEEDED', []);
  }
  const failedReason = activated.get('result') === 'failed' ? activated.get('reason') ?? 'failed' : null;
  const reasonCode = failedReason ? `ACTIVATE_${failedReason.toUpperCase().replace(/[^A-Z_]/g, '_')}` : 'HEALTH_CHECK_FAILED';
  // The script refused before starting anything; files created by an earlier job are kept as they are.
  if (mode === 'ACTIVATE' && failedReason && failedReason !== 'host_exit' && failedReason !== 'host_unavailable') {
    steps.push({ id: 'activate', status: 'FAILED' });
    return finish('FAILED', [reasonCode]);
  }
  steps.push({ id: 'activate', status: 'FAILED' }, { id: 'health', status: activated.get('health') ?? 'unknown' });
  // Work claimed while the health check ran owns the component now: the rollback never writes over it.
  const beforeRollback = await recheck();
  if (beforeRollback) {
    rollback = 'FAILED';
    steps.push({ id: 'rollback', status: 'BLOCKED' });
    return finish('FAILED', [reasonCode, beforeRollback]);
  }
  const rolledBack = await host('rollback', buildRollbackScript({
    treeDigest,
    jobId,
    target,
    composeFile,
    createdInThisJob: mode === 'CREATE_AND_ACTIVATE'
  }));
  rollback = rolledBack.get('result') === 'rolled_back' ? 'SUCCEEDED' : 'FAILED';
  steps.push({ id: 'rollback', status: rollback });
  return finish(rollback === 'SUCCEEDED' ? 'ROLLED_BACK' : 'FAILED', [reasonCode]);
}

/** The reason codes of a plan that does not run, as the executor reports them. */
export type ProjectRuntimeRefusalCode =
  | ProjectRuntimeReasonCode
  | Exclude<RevisionAdmissionReasonCode, 'REVISION_ADMITTED'>
  | 'TARGET_CHANGED_SINCE_CONSENT'
  | 'COORDINATION_UNAVAILABLE'
  | 'TARGET_LOCKED'
  | 'TARGET_CLAIMED_BY_TASK'
  | 'WRITE_TOOLS_DISABLED'
  | 'PROVISIONING_IN_PROGRESS';
