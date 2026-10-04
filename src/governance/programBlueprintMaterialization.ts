import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ReconcileIntentInput } from '../operationalMemory/taskQueue.js';

/**
 * DISPATCH-01 (intake #222): a planning-READY Program Backlog blueprint can be
 * materialized into exactly one runtime task through the existing Governed
 * Task Queue. Readiness is recomputed here, from the projection shipped with
 * the deployed revision, with the repository's own readiness library: the
 * projection stays planning-only and never creates a task by itself.
 */
const PROJECTION_PATH = path.join('docs', 'governance', 'program-backlog-convergence.json');
const READINESS_LIBRARY_PATH = path.join('scripts', 'program-backlog-convergence-lib.mjs');
const MAX_PROJECTION_BYTES = 4 * 1024 * 1024;
/** Program Backlog V2 is the MCP repository's own program. */
export const PROGRAM_REPOSITORY = 'Patricked-code/MCP';
const INTENT_KEY_PATTERN = /^[a-z0-9][a-z0-9:._/-]+$/;

export type ProgramProjectionSnapshot = {
  projection: unknown;
  digest: string;
};

export type ProgramBlueprintBinding = {
  blueprintId: string;
  derivedState: 'READY';
  programProjectionDigest: string;
};

type ReadinessLibrary = {
  deriveProgramReadiness(projection: unknown): {
    blueprints: Array<{ id: string; currentState: string; derivedState: string }>;
  };
};

type BlueprintRecord = {
  id?: unknown;
  lotId?: unknown;
  title?: unknown;
  objective?: unknown;
  collisionDomains?: unknown;
  materialization?: { createsRuntimeTask?: unknown; runtimeAuthority?: unknown };
};

function fail(code: string): never {
  throw new Error(code);
}

export async function loadProgramProjection(root = process.cwd()): Promise<ProgramProjectionSnapshot> {
  const raw = await readFile(path.join(root, PROJECTION_PATH));
  if (raw.byteLength > MAX_PROJECTION_BYTES) fail('PROGRAM_PROJECTION_TOO_LARGE');
  return {
    projection: JSON.parse(raw.toString('utf8')) as unknown,
    digest: createHash('sha256').update(raw).digest('hex')
  };
}

let readinessLibrary: Promise<ReadinessLibrary> | null = null;

export function loadReadinessLibrary(root = process.cwd()): Promise<ReadinessLibrary> {
  readinessLibrary ??= (import(pathToFileURL(path.join(root, READINESS_LIBRARY_PATH)).href) as Promise<ReadinessLibrary>)
    .catch((error: unknown) => {
      readinessLibrary = null;
      throw error;
    });
  return readinessLibrary;
}

export function blueprintIntentKey(blueprintId: string): string {
  return `program:${blueprintId.toLowerCase()}`;
}

function bounded(value: string, max: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}

export function buildProgramBlueprintIntent(
  snapshot: ProgramProjectionSnapshot,
  blueprintId: string,
  library: ReadinessLibrary
): { intent: ReconcileIntentInput; binding: ProgramBlueprintBinding } {
  const blueprints = (snapshot.projection as { taskBlueprints?: unknown } | null)?.taskBlueprints;
  if (!Array.isArray(blueprints)) fail('PROGRAM_PROJECTION_UNAVAILABLE');
  const blueprint = (blueprints as BlueprintRecord[]).find((entry) => entry?.id === blueprintId);
  if (!blueprint) fail('PROGRAM_BLUEPRINT_UNKNOWN');

  const derived = library.deriveProgramReadiness(snapshot.projection).blueprints
    .find((entry) => entry.id === blueprintId);
  if (!derived || derived.currentState !== 'READY' || derived.derivedState !== 'READY') {
    fail('PROGRAM_BLUEPRINT_NOT_READY');
  }
  if (
    blueprint.materialization?.createsRuntimeTask !== false
    || blueprint.materialization?.runtimeAuthority !== 'Governed Task Queue'
    || typeof blueprint.title !== 'string'
    || typeof blueprint.objective !== 'string'
  ) fail('PROGRAM_BLUEPRINT_INVALID');

  const domains = Array.isArray(blueprint.collisionDomains) ? blueprint.collisionDomains : [];
  const resourceScopes = [...new Set(domains.filter(
    (domain): domain is string => typeof domain === 'string' && domain.trim().length >= 3 && domain.length <= 256
  ))].sort();
  if (resourceScopes.length === 0 || resourceScopes.length > 64) fail('PROGRAM_BLUEPRINT_COLLISION_DOMAINS_MISSING');

  const intentKey = blueprintIntentKey(blueprintId);
  if (intentKey.length > 160 || !INTENT_KEY_PATTERN.test(intentKey)) fail('PROGRAM_BLUEPRINT_INVALID');
  const lot = typeof blueprint.lotId === 'string' ? `${blueprint.lotId} — ` : '';

  return {
    intent: {
      repository: PROGRAM_REPOSITORY,
      intentKey,
      title: bounded(`${lot}${blueprint.title}`, 160),
      summary: bounded(
        `Program blueprint ${blueprintId} @ program sha256:${snapshot.digest.slice(0, 12)} — ${blueprint.objective}`,
        500
      ),
      priority: 50,
      dependencies: [],
      resourceScopes,
      equivalence: 'EXACT_ACTIVE_SCOPE_SET'
    },
    binding: {
      blueprintId,
      derivedState: 'READY',
      programProjectionDigest: snapshot.digest
    }
  };
}
