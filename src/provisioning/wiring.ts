import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import type { GitRegistryProjectEvidence } from '../github/registry.js';
import { observeProvisionedRuntimes } from '../liveState/provisionedRuntime.js';
import { parseServerTargetConfiguration, type ServerTargetConfiguration } from '../liveState/targetProject.js';
import { assertNoCatastrophicCommand } from '../ssh/writeSafety.js';
import { provisioningInventoryTargets, type ProjectRuntimeProvisioningPlan } from './projectRuntime.js';
import { admitProvisioningRevision, type GithubRead } from './revisionAdmission.js';
import {
  PROVISIONING_DATA_ROOT_CONTAINER,
  previewProjectRuntimeProvisioning,
  type ProjectRuntimeExecutionDependencies,
  type ProvisioningCoordination
} from './runtimeExecutor.js';
import type { ArchiveDownloadResult } from './sourceArchive.js';

/**
 * F.2 (TB-W3-F-03), increment 3: the production wiring of the executor. The
 * inventory is read-only on S1; every write goes through the guarded S1
 * channel under its phase intent, and a command the catastrophic-command
 * policy refuses never reaches the host; the source is the bounded archive of
 * the exact revision; job files stay in the data volume and are never
 * overwritten. Write mode stays the server switch, never a consent. The
 * caller supplies the I/O, so nothing here holds a credential.
 */
export const PROVISIONING_MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;

const UNAVAILABLE_REGISTRY = {
  available: false,
  sourceSchemaVersion: null,
  digest: null,
  candidateDigest: null,
  mappings: [],
  projects: [],
  activationReadiness: []
} satisfies GitRegistryProjectEvidence;

export type ProjectRuntimeProvisioningIo = {
  writeEnabled: () => boolean;
  readServerMap: () => Promise<unknown | null>;
  readRegistry: () => Promise<GitRegistryProjectEvidence>;
  runReadOnly: (command: string) => Promise<{ code: number | null; stdout: string }>;
  runGuarded: (
    command: string,
    options: { intent: string; timeoutMs: number; maxOutputBytes: number }
  ) => Promise<{ code: number | null; stdout: string; stderr?: string }>;
  downloadArchive: (input: {
    repositoryId: string;
    revision: string;
    destination: string;
    maxBytes: number;
  }) => Promise<ArchiveDownloadResult>;
  githubRequest: GithubRead;
  /** The Governed Task Queue and Lock Service, read afresh; null when they cannot be read. */
  readCoordination: () => Promise<ProvisioningCoordination | null>;
  now?: () => Date;
};

/** A component the surface can provision: its project is a configured target and its path is governed. */
export type ProjectRuntimeProvisioningTarget = Readonly<{
  projectId: string;
  mappingId: string;
  repositoryId: string;
  serverPath: string;
  composeProject: string;
}>;

export type ProjectRuntimeProvisioningDependencies = ProjectRuntimeExecutionDependencies & {
  listTargets: () => Promise<ProjectRuntimeProvisioningTarget[]>;
  preview: (request: unknown) => Promise<ProjectRuntimeProvisioningPlan>;
};

/** Writes a job file once, inside the provisioning data root only. */
export async function writeProvisioningJobFile(
  path: string,
  content: string,
  root = PROVISIONING_DATA_ROOT_CONTAINER
): Promise<void> {
  const base = resolve(root);
  const target = resolve(path);
  if (!target.startsWith(`${base}${sep}`)) throw new Error('PROVISIONING_JOB_FILE_OUTSIDE_DATA_ROOT');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, { flag: 'wx', mode: 0o644 });
}

export function createProjectRuntimeExecutionDependencies(
  io: ProjectRuntimeProvisioningIo
): ProjectRuntimeProvisioningDependencies {
  const now = io.now ?? (() => new Date());
  const readServerTarget = async (): Promise<ServerTargetConfiguration> => {
    try {
      return parseServerTargetConfiguration(await io.readServerMap());
    } catch {
      return { status: 'INVALID', reasonCode: 'TARGET_PROJECT_CONFIGURATION_UNREADABLE' };
    }
  };
  const readRegistry = async (): Promise<GitRegistryProjectEvidence> => {
    try {
      return await io.readRegistry();
    } catch {
      return UNAVAILABLE_REGISTRY;
    }
  };
  const deps: ProjectRuntimeProvisioningDependencies = {
    writeEnabled: () => io.writeEnabled(),
    now,
    randomHex: () => randomBytes(4).toString('hex'),
    readServerTarget,
    readRegistry,
    observe: (targets) => observeProvisionedRuntimes(targets, io.runReadOnly, now().toISOString()),
    readCoordination: () => io.readCoordination(),
    admitRevision: (input) => admitProvisioningRevision(input, io.githubRequest),
    fetchSource: (input) => io.downloadArchive({
      repositoryId: input.repositoryId,
      revision: input.revision,
      destination: input.destination,
      maxBytes: PROVISIONING_MAX_ARCHIVE_BYTES
    }),
    writeJobFile: (path, content) => writeProvisioningJobFile(path, content),
    runWrite: async (command, options) => {
      try {
        assertNoCatastrophicCommand(command);
      } catch {
        return { code: 0, stdout: 'result=failed\nreason=command_policy\n', stderr: '' };
      }
      return io.runGuarded(command, {
        intent: `provision-project-runtime:${options.phase}`,
        timeoutMs: options.timeoutMs,
        maxOutputBytes: options.maxOutputBytes
      });
    },
    listTargets: async () => {
      const configuration = await readServerTarget();
      if (configuration.status === 'NOT_CONFIGURED') return [];
      // An unreadable configuration or registry leaves the targets unknown, never absent.
      if (configuration.status !== 'CONFIGURED') throw new Error('PROVISIONING_TARGETS_UNKNOWN');
      const registry = await readRegistry();
      if (!registry.available) throw new Error('PROVISIONING_TARGETS_UNKNOWN');
      return configuration.projectIds.flatMap((projectId) => provisioningInventoryTargets(registry, projectId)
        .map((target) => Object.freeze({ projectId, ...target })));
    },
    preview: (request) => previewProjectRuntimeProvisioning(request, deps)
  };
  return deps;
}
