import { parseDocument } from 'yaml';

import {
  PROVISIONING_LABEL_PROJECT,
  PROVISIONING_LABEL_REPOSITORY,
  PROVISIONING_LABEL_REVISION
} from './projectRuntime.js';

/**
 * F.2 (TB-W3-F-03), increment 2: what a provisioned Docker Compose model may
 * ask of the host, checked on the normalized model `docker compose config
 * --format json` prints for the project directory (with `--no-env-resolution`
 * where Compose knows it).
 * Everything stays inside the project: only reviewed Compose keys, so a key
 * that loads a host file, hands the engine to a container, runs a host
 * program or hook or reaches the host another way never runs, a key Compose
 * adds later included; no privileged mode, added capability, device, host
 * namespace, shared network or loosened confinement; published ports bound to
 * the loopback only; bind mounts, build contexts, Dockerfiles and file-based
 * secrets inside the project; no external or foreign-named network or volume,
 * no external link or fixed container name; the engine's local logging only.
 * Named volumes and networks keep their default drivers without options: a
 * driver option can bind a host path or attach to the host network.
 * Any doubt fails closed. Pure.
 */
export type ComposeSafetyCode =
  | 'COMPOSE_CONFIG_INVALID'
  | 'COMPOSE_SOURCE_INVALID'
  | 'COMPOSE_SERVICES_INVALID'
  | 'COMPOSE_KEY_UNSUPPORTED'
  | 'COMPOSE_PRIVILEGED'
  | 'COMPOSE_CAPABILITY_ADDED'
  | 'COMPOSE_DEVICE'
  | 'COMPOSE_HOST_NAMESPACE'
  | 'COMPOSE_SHARED_NETWORK'
  | 'COMPOSE_SECURITY_OPT_UNCONFINED'
  | 'COMPOSE_LOGGING_DRIVER'
  | 'COMPOSE_PORT_NOT_LOCAL'
  | 'COMPOSE_BIND_OUTSIDE_PROJECT'
  | 'COMPOSE_BUILD_OUTSIDE_PROJECT'
  | 'COMPOSE_BUILD_SSH'
  | 'COMPOSE_BUILD_TAG'
  | 'COMPOSE_IMAGE_UNPINNED'
  | 'COMPOSE_REPLICAS'
  | 'COMPOSE_RESOURCES_UNBOUNDED'
  | 'COMPOSE_BUILD_PULL'
  | 'COMPOSE_BUILD_ARG_RESERVED'
  | 'DOCKERFILE_INVALID'
  | 'DOCKERFILE_IMAGE_UNPINNED'
  | 'DOCKERFILE_FRONTEND_UNPINNED'
  | 'DOCKERFILE_FRONTEND_UNSUPPORTED'
  | 'COMPOSE_CONTAINER_NAME'
  | 'COMPOSE_EXTERNAL_RESOURCE'
  | 'COMPOSE_FILE_SOURCE_OUTSIDE_PROJECT'
  | 'COMPOSE_VOLUME_DRIVER'
  | 'COMPOSE_NETWORK_DRIVER';

/** A finding names the key it refuses, as the repository wrote it, when there is one. */
export type ComposeSafetyFinding = Readonly<{ code: ComposeSafetyCode; service: string | null; key: string | null }>;

export type ComposeDockerfile = Readonly<{ service: string; path: string | null; inline: string | null; contexts: readonly string[] }>;

export type ComposeSafety = Readonly<{
  ok: boolean;
  services: readonly string[];
  /** The containers each service runs (its replicas): activation and no-op count them. */
  replicas: Readonly<Record<string, number>>;
  /** Bind sources, relative to the project: they must exist in the checkout, so Docker never creates one after the digest. */
  bindSources: readonly string[];
  /** The Dockerfile of each built service: a path relative to the project, or the inline text, and its named contexts. */
  dockerfiles: readonly ComposeDockerfile[];
  findings: readonly ComposeSafetyFinding[];
}>;

/** The largest compose file the host prints and the parse reads. */
export const COMPOSE_SOURCE_MAX_BYTES = 100_000;

const SERVICE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/;
const MAX_SERVICES = 20;
const MAX_ALIASES = 100;
const MAX_KEY_LENGTH = 100;
const LOOPBACK = new Set(['127.0.0.1', '::1']);
const NAMESPACE_KEYS = ['pid', 'ipc', 'userns_mode', 'cgroup', 'uts'] as const;

// The reviewed Compose keys, as the compose specification names them. Anything else is unsupported,
// a key Compose adds later included: `include`, `extends`, `env_file` and `label_file` load other
// files, `use_api_socket` hands the engine to the container, `provider` and the lifecycle hooks run
// programs, and `net`, `log_driver`, `volume_driver`, `runtime`, `cgroup_parent`, `gpus` or `models`
// reach the host past the checks below. Extension fields (`x-`) are ignored by Compose.
const TOP_LEVEL_KEYS: ReadonlySet<string> = new Set(['version', 'name', 'services', 'networks', 'volumes', 'secrets', 'configs']);
const SERVICE_KEYS: ReadonlySet<string> = new Set([
  'annotations', 'attach', 'build', 'cap_add', 'cap_drop', 'cgroup', 'command', 'configs', 'container_name',
  'cpu_count', 'cpu_percent', 'cpu_period', 'cpu_quota', 'cpu_shares', 'cpus', 'cpuset', 'depends_on', 'deploy',
  'develop', 'device_cgroup_rules', 'devices', 'dns', 'dns_opt', 'dns_search', 'domainname', 'entrypoint',
  'environment', 'expose', 'external_links', 'extra_hosts', 'group_add', 'healthcheck', 'hostname', 'image', 'init',
  'ipc', 'labels', 'links', 'logging', 'mac_address', 'mem_limit', 'mem_reservation', 'mem_swappiness',
  'memswap_limit', 'network_mode', 'networks', 'pid', 'pids_limit', 'platform', 'ports', 'privileged', 'profiles',
  'pull_policy', 'read_only', 'restart', 'scale', 'secrets', 'security_opt', 'shm_size', 'stdin_open',
  'stop_grace_period', 'stop_signal', 'sysctls', 'tmpfs', 'tty', 'ulimits', 'user', 'userns_mode', 'uts', 'volumes',
  'volumes_from', 'working_dir'
]);
// A build never gets privileges or entitlements, a cache read from or written to a host path, nor extra
// tags: a built image only takes the project's default name, never one another workload runs.
const BUILD_KEYS: ReadonlySet<string> = new Set([
  'additional_contexts', 'args', 'context', 'dockerfile', 'dockerfile_inline', 'extra_hosts', 'labels', 'network',
  'no_cache', 'no_cache_filter', 'platforms', 'pull', 'secrets', 'shm_size', 'ssh', 'target', 'ulimits'
]);
// A seccomp profile file, an AppArmor profile or an SELinux type can lift the confinement as surely as "unconfined".
const IMAGE_DIGEST = /@sha256:[0-9a-f]{64}$/;
const MAX_CONTAINERS = 20;
const SECURITY_OPTION = /^no-new-privileges([:=](true|false))?$/;
// Any other logging driver sends from the engine, on the host network.
const LOGGING_DRIVERS: ReadonlySet<string> = new Set(['json-file', 'local', 'none']);

type Add = (code: ComposeSafetyCode, service: string | null, key?: string | null) => void;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonEmpty(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return record(value) !== null ? Object.keys(value as object).length > 0 : Boolean(value);
}

/** True when an absolute, normalized path lies in the project directory. */
const BIND_SEGMENT = /^[A-Za-z0-9._@+-]{1,100}$/;

function insideProject(path: unknown, projectDir: string): boolean {
  if (typeof path !== 'string' || !path.startsWith('/')) return false;
  if (path.split('/').some((segment) => segment === '..' || segment === '.')) return false;
  const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  return normalized === projectDir || normalized.startsWith(`${projectDir}/`);
}

function collector(): { findings: ComposeSafetyFinding[]; add: Add } {
  const findings: ComposeSafetyFinding[] = [];
  const add: Add = (code, service, key = null) => {
    const bounded = key === null ? null : key.slice(0, MAX_KEY_LENGTH);
    if (!findings.some((finding) => finding.code === code && finding.service === service && finding.key === bounded)) {
      findings.push(Object.freeze({ code, service, key: bounded }));
    }
  };
  return { findings, add };
}

function verdict(
  services: readonly string[],
  findings: ComposeSafetyFinding[],
  replicas: Record<string, number> = {},
  bindSources: readonly string[] = [],
  dockerfiles: readonly ComposeDockerfile[] = []
): ComposeSafety {
  return Object.freeze({
    ok: findings.length === 0,
    services: Object.freeze([...services].sort()),
    replicas: Object.freeze({ ...replicas }),
    bindSources: Object.freeze([...new Set(bindSources)].sort()),
    dockerfiles: Object.freeze([...dockerfiles]),
    findings: Object.freeze(findings)
  });
}

function rejected(code: ComposeSafetyCode): ComposeSafety {
  return Object.freeze({ ok: false, services: Object.freeze([]), replicas: Object.freeze({}), bindSources: Object.freeze([]), dockerfiles: Object.freeze([]), findings: Object.freeze([Object.freeze({ code, service: null, key: null })]) });
}

function checkKeys(keys: Iterable<string>, allowed: ReadonlySet<string>, service: string | null, prefix: string, add: Add): void {
  for (const key of keys) {
    if (!allowed.has(key) && !key.startsWith('x-')) add('COMPOSE_KEY_UNSUPPORTED', service, `${prefix}${key}`);
  }
}

function validServiceNames(names: readonly unknown[]): names is string[] {
  return names.length > 0 && names.length <= MAX_SERVICES
    && names.every((name) => typeof name === 'string' && SERVICE_NAME_PATTERN.test(name));
}

function checkService(
  name: string,
  service: Record<string, unknown>,
  services: ReadonlySet<string>,
  projectDir: string,
  add: Add,
  bindSources?: string[],
  dockerfiles?: ComposeDockerfile[]
): void {
  checkKeys(Object.keys(service), SERVICE_KEYS, name, '', add);
  if (service.privileged === true) add('COMPOSE_PRIVILEGED', name);
  if (nonEmpty(service.cap_add)) add('COMPOSE_CAPABILITY_ADDED', name);
  if (nonEmpty(service.devices) || nonEmpty(service.device_cgroup_rules)) add('COMPOSE_DEVICE', name);
  // A device reservation (a GPU) reaches the host devices as surely as `devices`.
  if (nonEmpty(record(record(record(service.deploy)?.resources)?.reservations)?.devices)) add('COMPOSE_DEVICE', name);
  if (service.container_name !== undefined) add('COMPOSE_CONTAINER_NAME', name);
  if (nonEmpty(service.external_links)) add('COMPOSE_EXTERNAL_RESOURCE', name);

  const networkMode = service.network_mode;
  if (networkMode === 'bridge' || networkMode === 'default') {
    // The engine's default bridge is shared with every container of the host, outside the project.
    add('COMPOSE_SHARED_NETWORK', name);
  } else if (
    networkMode !== undefined && networkMode !== 'none'
    && !(typeof networkMode === 'string' && networkMode.startsWith('service:') && services.has(networkMode.slice(8)))
  ) {
    add('COMPOSE_HOST_NAMESPACE', name);
  }
  for (const key of NAMESPACE_KEYS) {
    const value = service[key];
    if (value === undefined) continue;
    const allowed = typeof value === 'string' && value !== 'host' && !value.startsWith('container:')
      && (!value.startsWith('service:') || services.has(value.slice(8)));
    if (!allowed) add('COMPOSE_HOST_NAMESPACE', name);
  }
  const securityOptions = Array.isArray(service.security_opt) ? service.security_opt : service.security_opt === undefined ? [] : null;
  if (securityOptions === null || securityOptions.some((option) => typeof option !== 'string' || !SECURITY_OPTION.test(option))) {
    add('COMPOSE_SECURITY_OPT_UNCONFINED', name);
  }
  const logging = service.logging === undefined ? {} : record(service.logging);
  if (!logging || (logging.driver !== undefined && !LOGGING_DRIVERS.has(String(logging.driver)))) {
    add('COMPOSE_LOGGING_DRIVER', name);
  }

  // Memory, CPU and process ceilings on every service: an unbounded container could exhaust the host before any health gate.
  const limits = record(record(record(service.deploy)?.resources)?.limits);
  const bounded = (value: unknown) => (typeof value === 'number' || (typeof value === 'string' && /^[0-9.]+$/.test(value)))
    && Number.isFinite(Number(value)) && Number(value) > 0;
  if (!bounded(service.mem_limit ?? limits?.memory) || !bounded(service.cpus ?? limits?.cpus) || !bounded(service.pids_limit ?? limits?.pids)) {
    add('COMPOSE_RESOURCES_UNBOUNDED', name);
  }

  const ports = service.ports === undefined ? [] : Array.isArray(service.ports) ? service.ports : null;
  if (ports === null || ports.some((port) => !LOOPBACK.has(String(record(port)?.host_ip ?? '')))) {
    add('COMPOSE_PORT_NOT_LOCAL', name);
  }

  const volumes = service.volumes === undefined ? [] : Array.isArray(service.volumes) ? service.volumes : null;
  for (const entry of volumes ?? [null]) {
    const volume = record(entry);
    const type = volume?.type;
    if (type === 'volume' || type === 'tmpfs') continue;
    if (type === 'bind' && insideProject(volume?.source, projectDir)) {
      const relative = String(volume!.source).slice(projectDir.length).replace(/^\//, '').replace(/\/$/, '');
      // Plain names only: the host checks each source exists before anything starts.
      if (relative === '' || relative.split('/').every((segment) => BIND_SEGMENT.test(segment))) {
        if (relative !== '') bindSources?.push(relative);
        continue;
      }
    }
    add('COMPOSE_BIND_OUTSIDE_PROJECT', name);
  }
  if (nonEmpty(service.volumes_from)) {
    const sources = Array.isArray(service.volumes_from) ? service.volumes_from : [];
    if (sources.length === 0 || sources.some((source) => (
      typeof source !== 'string' || !services.has(source.replace(/:(ro|rw)$/, ''))
    ))) {
      add('COMPOSE_EXTERNAL_RESOURCE', name);
    }
  }

  if (service.build !== undefined) {
    const build = record(service.build);
    if (build) checkKeys(Object.keys(build), BUILD_KEYS, name, 'build.', add);
    if (!build || !insideProject(build.context, projectDir)) add('COMPOSE_BUILD_OUTSIDE_PROJECT', name);
    const dockerfile = build?.dockerfile;
    if (
      dockerfile !== undefined
      && (typeof dockerfile !== 'string'
        || (dockerfile.startsWith('/') ? !insideProject(dockerfile, projectDir) : dockerfile.split('/').includes('..')))
    ) {
      add('COMPOSE_BUILD_OUTSIDE_PROJECT', name);
    }
    const contexts = record(build?.additional_contexts);
    if (contexts && Object.values(contexts).some((context) => !insideProject(context, projectDir))) {
      add('COMPOSE_BUILD_OUTSIDE_PROJECT', name);
    }
    if (build?.network !== undefined && build.network !== 'default' && build.network !== 'none') {
      add('COMPOSE_HOST_NAMESPACE', name);
    }
    if (nonEmpty(build?.ssh)) add('COMPOSE_BUILD_SSH', name);
    // Owner decision on PR #261: a build pulls only pinned images, so a refreshed pull and BuildKit's own arguments are refused.
    if (build?.pull === true || build?.pull === 'true') add('COMPOSE_BUILD_PULL', name);
    const args = record(build?.args);
    for (const key of Object.keys(args ?? {})) if (/^BUILDKIT_/i.test(key)) add('COMPOSE_BUILD_ARG_RESERVED', name, `build.args.${key}`);
    const contextNames = Object.keys(record(build?.additional_contexts) ?? {});
    if (build && typeof build.dockerfile_inline === 'string') {
      dockerfiles?.push(Object.freeze({ service: name, path: null, inline: build.dockerfile_inline, contexts: Object.freeze(contextNames) }));
    } else if (build && typeof build.context === 'string' && insideProject(build.context, projectDir)) {
      const file = typeof build.dockerfile === 'string' ? build.dockerfile : 'Dockerfile';
      const absolute = file.startsWith('/') ? file : `${build.context}/${file}`;
      const relative = absolute.slice(projectDir.length).replace(/^\//, '');
      if (insideProject(absolute, projectDir) && relative !== '' && relative.split('/').every((segment) => BIND_SEGMENT.test(segment))) {
        dockerfiles?.push(Object.freeze({ service: name, path: relative, inline: null, contexts: Object.freeze(contextNames) }));
      } else {
        add('COMPOSE_BUILD_OUTSIDE_PROJECT', name);
      }
    }
    // An image name on a build tags the result host-wide: another workload running that name would run it.
    if (service.image !== undefined) add('COMPOSE_BUILD_TAG', name);
  } else if (typeof service.image !== 'string' || !IMAGE_DIGEST.test(service.image)) {
    // A pulled image is pinned by digest: a tag can serve other bytes at a later activation.
    add('COMPOSE_IMAGE_UNPINNED', name);
  }
}

function checkTopLevel(
  config: Record<string, unknown>,
  projectDir: string,
  add: Add
): void {
  checkKeys(Object.keys(config), TOP_LEVEL_KEYS, null, '', add);
  const project = typeof config.name === 'string' ? config.name : null;
  for (const key of ['networks', 'volumes'] as const) {
    const entries = record(config[key]);
    if (config[key] !== undefined && !entries) add('COMPOSE_CONFIG_INVALID', null);
    // Only the default driver, without options: a `local` volume with bind options mounts any host path.
    const defaultDriver = key === 'volumes' ? 'local' : 'bridge';
    const driverCode = key === 'volumes' ? 'COMPOSE_VOLUME_DRIVER' : 'COMPOSE_NETWORK_DRIVER';
    for (const [entryName, entry] of Object.entries(entries ?? {})) {
      const definition = record(entry);
      if (definition?.external) {
        add('COMPOSE_EXTERNAL_RESOURCE', null, `${key}.${entryName}`);
      } else if (definition?.name !== undefined && definition.name !== `${project}_${entryName}`) {
        // Compose names a project resource `<project>_<key>`: another name joins whatever already carries it.
        add('COMPOSE_EXTERNAL_RESOURCE', null, `${key}.${entryName}`);
      }
      if ((definition?.driver !== undefined && definition.driver !== defaultDriver) || nonEmpty(definition?.driver_opts)) {
        add(driverCode, null);
      }
      // Address management keeps its default driver, without options: a plugin acts on the host.
      const ipam = record(definition?.ipam);
      if (key === 'networks' && ipam && ((ipam.driver !== undefined && ipam.driver !== 'default') || nonEmpty(ipam.options))) {
        add(driverCode, null);
      }
    }
  }
  for (const key of ['secrets', 'configs'] as const) {
    const entries = record(config[key]);
    if (config[key] !== undefined && !entries) add('COMPOSE_CONFIG_INVALID', null);
    for (const entry of Object.values(entries ?? {})) {
      const definition = record(entry);
      if (definition?.external) add('COMPOSE_EXTERNAL_RESOURCE', null);
      else if (definition?.file !== undefined) {
        if (!insideProject(definition.file, projectDir)) add('COMPOSE_FILE_SOURCE_OUTSIDE_PROJECT', null);
      } else if (definition?.content === undefined) {
        // An environment-sourced secret or config reads the host environment.
        add('COMPOSE_FILE_SOURCE_OUTSIDE_PROJECT', null);
      }
    }
  }
}

/** The safety of a normalized compose model for the given project directory. */
export function evaluateComposeSafety(config: unknown, projectDir: string): ComposeSafety {
  const root = record(config);
  const serviceEntries = record(root?.services);
  if (!root || !serviceEntries) return rejected('COMPOSE_CONFIG_INVALID');
  const names = Object.keys(serviceEntries);
  if (!validServiceNames(names)) return rejected('COMPOSE_SERVICES_INVALID');
  const { findings, add } = collector();
  const services = new Set(names);
  const bindSources: string[] = [];
  const dockerfiles: ComposeDockerfile[] = [];
  for (const name of names) {
    const service = record(serviceEntries[name]);
    if (!service) {
      add('COMPOSE_SERVICES_INVALID', name);
      continue;
    }
    checkService(name, service, services, projectDir, add, bindSources, dockerfiles);
  }
  // Every replica is a container of the bounded inventory: past it, the runtime could no longer be observed.
  let containers = 0;
  const replicaCounts: Record<string, number> = {};
  for (const name of names) {
    const service = record(serviceEntries[name]);
    const replicas = service?.deploy !== undefined && record(service.deploy)?.replicas !== undefined ? record(service.deploy)!.replicas : service?.scale ?? 1;
    if (typeof replicas !== 'number' || !Number.isInteger(replicas) || replicas < 0) add('COMPOSE_REPLICAS', name);
    else {
      containers += replicas;
      replicaCounts[name] = replicas;
    }
  }
  if (containers > MAX_CONTAINERS || containers === 0) add('COMPOSE_REPLICAS', null);
  checkTopLevel(root, projectDir, add);
  return verdict(names, findings, replicaCounts, bindSources, dockerfiles);
}

function stringKeyed(value: unknown): value is Map<string, unknown> {
  return value instanceof Map && [...value.keys()].every((key) => typeof key === 'string');
}

/**
 * The keys of the compose file itself, parsed before Compose ever loads it.
 * Compose resolves `include`, `extends`, `env_file` and `label_file` while it
 * loads the project, reading files the normalized model no longer names; a
 * line match misses a key that is quoted, in a flow mapping, escaped, merged
 * or aliased. The parse sees every spelling and the same allowlists refuse
 * them. What it cannot read exactly as Compose would fails closed: an error
 * or a warning (an unknown tag included), several documents, a duplicate or
 * non-string key, too many aliases or an oversized file. Pure.
 */
export function evaluateComposeSource(source: unknown): ComposeSafety {
  if (typeof source !== 'string' || source.length === 0 || Buffer.byteLength(source, 'utf8') > COMPOSE_SOURCE_MAX_BYTES) {
    return rejected('COMPOSE_SOURCE_INVALID');
  }
  let root: unknown;
  try {
    const document = parseDocument(source, { merge: true, uniqueKeys: true, strict: true, prettyErrors: false });
    if (document.errors.length > 0 || document.warnings.length > 0) return rejected('COMPOSE_SOURCE_INVALID');
    root = document.toJS({ mapAsMap: true, maxAliasCount: MAX_ALIASES });
  } catch {
    return rejected('COMPOSE_SOURCE_INVALID');
  }
  if (!stringKeyed(root)) return rejected('COMPOSE_SOURCE_INVALID');
  const serviceEntries = root.get('services');
  if (!stringKeyed(serviceEntries)) return rejected('COMPOSE_SERVICES_INVALID');
  const names = [...serviceEntries.keys()];
  if (!validServiceNames(names)) return rejected('COMPOSE_SERVICES_INVALID');
  const { findings, add } = collector();
  checkKeys(root.keys(), TOP_LEVEL_KEYS, null, '', add);
  for (const name of names) {
    const service = serviceEntries.get(name);
    if (!stringKeyed(service)) {
      add('COMPOSE_SERVICES_INVALID', name);
      continue;
    }
    checkKeys(service.keys(), SERVICE_KEYS, name, '', add);
    const build = service.get('build');
    if (build instanceof Map) {
      if (stringKeyed(build)) checkKeys(build.keys(), BUILD_KEYS, name, 'build.', add);
      else add('COMPOSE_SERVICES_INVALID', name);
    }
  }
  return verdict(names, findings);
}

/** The compose override that labels every service with the provisioned repository, revision and project. */
export function provisioningLabelsOverride(
  services: readonly string[],
  labels: { repositoryId: string; revision: string; projectId: string }
): string {
  if (services.length === 0 || services.length > MAX_SERVICES || !services.every((name) => SERVICE_NAME_PATTERN.test(name))) {
    throw new Error('PROVISIONING_LABELS_SERVICES_INVALID');
  }
  if (!/^github:[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]{1,100}$/.test(labels.repositoryId)
    || !/^[0-9a-f]{40}$/.test(labels.revision)
    || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(labels.projectId)) {
    throw new Error('PROVISIONING_LABELS_INVALID');
  }
  const serviceLabels = {
    [PROVISIONING_LABEL_REPOSITORY]: labels.repositoryId,
    [PROVISIONING_LABEL_REVISION]: labels.revision,
    [PROVISIONING_LABEL_PROJECT]: labels.projectId
  };
  return JSON.stringify({
    services: Object.fromEntries(services.map((name) => [name, { labels: serviceLabels }]))
  });
}
