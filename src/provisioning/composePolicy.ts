import {
  PROVISIONING_LABEL_PROJECT,
  PROVISIONING_LABEL_REPOSITORY,
  PROVISIONING_LABEL_REVISION
} from './projectRuntime.js';

/**
 * F.2 (TB-W3-F-03), increment 2: what a provisioned Docker Compose model may
 * ask of the host, checked on the normalized model `docker compose config
 * --format json` prints for the project directory. Everything stays inside
 * the project: no privileged mode, added capability, device, host namespace
 * or unconfined profile; published ports bound to the loopback only; bind
 * mounts, build contexts, Dockerfiles and file-based secrets inside the
 * project; no external network, volume or link and no fixed container name.
 * Any doubt fails closed. Pure.
 */
export type ComposeSafetyCode =
  | 'COMPOSE_CONFIG_INVALID'
  | 'COMPOSE_SERVICES_INVALID'
  | 'COMPOSE_PRIVILEGED'
  | 'COMPOSE_CAPABILITY_ADDED'
  | 'COMPOSE_DEVICE'
  | 'COMPOSE_HOST_NAMESPACE'
  | 'COMPOSE_SECURITY_OPT_UNCONFINED'
  | 'COMPOSE_PORT_NOT_LOCAL'
  | 'COMPOSE_BIND_OUTSIDE_PROJECT'
  | 'COMPOSE_BUILD_OUTSIDE_PROJECT'
  | 'COMPOSE_BUILD_SSH'
  | 'COMPOSE_CONTAINER_NAME'
  | 'COMPOSE_EXTERNAL_RESOURCE'
  | 'COMPOSE_FILE_SOURCE_OUTSIDE_PROJECT';

export type ComposeSafetyFinding = Readonly<{ code: ComposeSafetyCode; service: string | null }>;

export type ComposeSafety = Readonly<{
  ok: boolean;
  services: readonly string[];
  findings: readonly ComposeSafetyFinding[];
}>;

const SERVICE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/;
const MAX_SERVICES = 20;
const LOOPBACK = new Set(['127.0.0.1', '::1']);
const NAMESPACE_KEYS = ['pid', 'ipc', 'userns_mode', 'cgroup', 'uts'] as const;

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
function insideProject(path: unknown, projectDir: string): boolean {
  if (typeof path !== 'string' || !path.startsWith('/')) return false;
  if (path.split('/').some((segment) => segment === '..' || segment === '.')) return false;
  const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  return normalized === projectDir || normalized.startsWith(`${projectDir}/`);
}

function checkService(
  name: string,
  service: Record<string, unknown>,
  services: ReadonlySet<string>,
  projectDir: string,
  add: (code: ComposeSafetyCode, service: string | null) => void
): void {
  if (service.privileged === true) add('COMPOSE_PRIVILEGED', name);
  if (nonEmpty(service.cap_add)) add('COMPOSE_CAPABILITY_ADDED', name);
  if (nonEmpty(service.devices) || nonEmpty(service.device_cgroup_rules)) add('COMPOSE_DEVICE', name);
  if (service.container_name !== undefined) add('COMPOSE_CONTAINER_NAME', name);
  if (nonEmpty(service.external_links)) add('COMPOSE_EXTERNAL_RESOURCE', name);

  const networkMode = service.network_mode;
  if (networkMode !== undefined) {
    const allowed = networkMode === 'bridge' || networkMode === 'none' || networkMode === 'default'
      || (typeof networkMode === 'string' && networkMode.startsWith('service:') && services.has(networkMode.slice(8)));
    if (!allowed) add('COMPOSE_HOST_NAMESPACE', name);
  }
  for (const key of NAMESPACE_KEYS) {
    const value = service[key];
    if (value === undefined) continue;
    const allowed = typeof value === 'string' && value !== 'host' && !value.startsWith('container:')
      && (!value.startsWith('service:') || services.has(value.slice(8)));
    if (!allowed) add('COMPOSE_HOST_NAMESPACE', name);
  }
  const securityOptions = Array.isArray(service.security_opt) ? service.security_opt : service.security_opt === undefined ? [] : null;
  if (securityOptions === null || securityOptions.some((option) => (
    typeof option !== 'string' || /unconfined|label[:=]disable/i.test(option)
  ))) {
    add('COMPOSE_SECURITY_OPT_UNCONFINED', name);
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
    if (type === 'bind' && insideProject(volume?.source, projectDir)) continue;
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
  }
}

function checkTopLevel(
  config: Record<string, unknown>,
  projectDir: string,
  add: (code: ComposeSafetyCode, service: string | null) => void
): void {
  for (const key of ['networks', 'volumes'] as const) {
    const entries = record(config[key]);
    if (config[key] !== undefined && !entries) add('COMPOSE_CONFIG_INVALID', null);
    for (const entry of Object.values(entries ?? {})) {
      if (record(entry)?.external) add('COMPOSE_EXTERNAL_RESOURCE', null);
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
  const findings: ComposeSafetyFinding[] = [];
  const add = (code: ComposeSafetyCode, service: string | null) => {
    if (!findings.some((finding) => finding.code === code && finding.service === service)) {
      findings.push(Object.freeze({ code, service }));
    }
  };
  const root = record(config);
  const serviceEntries = record(root?.services);
  if (!root || !serviceEntries) {
    return Object.freeze({ ok: false, services: Object.freeze([]), findings: Object.freeze([{ code: 'COMPOSE_CONFIG_INVALID' as const, service: null }]) });
  }
  const names = Object.keys(serviceEntries);
  if (names.length === 0 || names.length > MAX_SERVICES || !names.every((name) => SERVICE_NAME_PATTERN.test(name))) {
    return Object.freeze({ ok: false, services: Object.freeze([]), findings: Object.freeze([{ code: 'COMPOSE_SERVICES_INVALID' as const, service: null }]) });
  }
  const services = new Set(names);
  for (const name of names) {
    const service = record(serviceEntries[name]);
    if (!service) {
      add('COMPOSE_SERVICES_INVALID', name);
      continue;
    }
    checkService(name, service, services, projectDir, add);
  }
  checkTopLevel(root, projectDir, add);
  return Object.freeze({
    ok: findings.length === 0,
    services: Object.freeze([...names].sort()),
    findings: Object.freeze(findings)
  });
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
