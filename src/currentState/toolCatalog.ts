import { createHash } from 'node:crypto';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export type RegistrationSurface = 'read' | 'operational-write' | 'scoped-write';

export type CurrentToolContract = {
  name: string;
  title: string | null;
  description: string | null;
  surface: RegistrationSurface;
  annotations: {
    readOnlyHint: boolean | null;
    destructiveHint: boolean | null;
  };
  inputSchema: Record<string, unknown>;
  contractDigest: string;
};

export type CurrentResourceContract = {
  name: string;
  uri: string;
  title: string | null;
  description: string | null;
  mimeType: string | null;
  audience: string[];
  priority: number | null;
  surface: RegistrationSurface;
  contractDigest: string;
};

export type CurrentToolCatalog = {
  schemaVersion: 1;
  catalogueVersion: 1;
  generatedAt: string;
  counts: {
    tools: number;
    resources: number;
    read: number;
    operationalWrite: number;
    scopedWrite: number;
  };
  catalogueDigest: string;
  catalogDigest: string;
  registeredToolCount: number;
  readOnlyToolCount: number;
  operationalWriteToolCount: number;
  writeToolCount: number;
  resourceCount: number;
  tools: CurrentToolContract[];
  resources: CurrentResourceContract[];
};

type JsonObject = Record<string, unknown>;

const tools = new Map<string, CurrentToolContract>();
const resources = new Map<string, CurrentResourceContract>();
let observedAt: string | null = null;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as JsonObject)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function digest(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function objectOrEmpty(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function isRawShape(value: unknown): value is z.ZodRawShape {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => entry instanceof z.ZodType);
}

function inputSchemaToJson(value: unknown): JsonObject {
  if (isRawShape(value)) return z.toJSONSchema(z.object(value)) as JsonObject;
  if (value instanceof z.ZodType) return z.toJSONSchema(value) as JsonObject;
  return z.toJSONSchema(z.object({})) as JsonObject;
}

function toolAnnotations(value: unknown): CurrentToolContract['annotations'] {
  const annotations = objectOrEmpty(value);
  return {
    readOnlyHint: booleanOrNull(annotations.readOnlyHint),
    destructiveHint: booleanOrNull(annotations.destructiveHint)
  };
}

function withToolDigest(value: Omit<CurrentToolContract, 'contractDigest'>): CurrentToolContract {
  return { ...value, contractDigest: digest(value) };
}

function withResourceDigest(value: Omit<CurrentResourceContract, 'contractDigest'>): CurrentResourceContract {
  return { ...value, contractDigest: digest(value) };
}

function record<T extends { name: string; contractDigest: string }>(
  target: Map<string, T>,
  value: T,
  conflictPrefix: string
): void {
  const current = target.get(value.name);
  if (current?.contractDigest === value.contractDigest) return;
  if (current) throw new Error(`${conflictPrefix}:${value.name}`);
  target.set(value.name, value);
  observedAt ??= new Date().toISOString();
}

function captureLegacyTool(registrationArgs: unknown[], surface: RegistrationSurface): void {
  const [nameValue, ...rest] = registrationArgs;
  const name = String(nameValue);
  const description = typeof rest[0] === 'string' ? String(rest.shift()) : null;
  rest.pop();
  const rawShape = rest.find(isRawShape);
  const annotations = rest.find((value) => {
    const object = objectOrEmpty(value);
    return 'readOnlyHint' in object || 'destructiveHint' in object;
  });
  record(tools, withToolDigest({
    name,
    title: null,
    description,
    surface,
    annotations: toolAnnotations(annotations),
    inputSchema: inputSchemaToJson(rawShape)
  }), 'CURRENT_TOOL_CATALOG_CONFLICT');
}

function captureRegisteredTool(registrationArgs: unknown[], surface: RegistrationSurface): void {
  const name = String(registrationArgs[0]);
  const config = objectOrEmpty(registrationArgs[1]);
  record(tools, withToolDigest({
    name,
    title: stringOrNull(config.title),
    description: stringOrNull(config.description),
    surface,
    annotations: toolAnnotations(config.annotations),
    inputSchema: inputSchemaToJson(config.inputSchema)
  }), 'CURRENT_TOOL_CATALOG_CONFLICT');
}

function captureRegisteredResource(registrationArgs: unknown[], surface: RegistrationSurface): void {
  const name = String(registrationArgs[0]);
  const uri = typeof registrationArgs[1] === 'string'
    ? registrationArgs[1]
    : String((registrationArgs[1] as { uri?: unknown } | undefined)?.uri ?? registrationArgs[1] ?? '');
  const config = objectOrEmpty(registrationArgs[2]);
  const annotations = objectOrEmpty(config.annotations);
  const audience = Array.isArray(annotations.audience)
    ? annotations.audience.filter((entry): entry is string => typeof entry === 'string').sort()
    : [];
  record(resources, withResourceDigest({
    name,
    uri,
    title: stringOrNull(config.title),
    description: stringOrNull(config.description),
    mimeType: stringOrNull(config.mimeType),
    audience,
    priority: numberOrNull(annotations.priority),
    surface
  }), 'CURRENT_RESOURCE_CATALOG_CONFLICT');
}

export function decorateRegistrationCatalogServer(
  server: McpServer,
  surface: RegistrationSurface
): McpServer {
  return new Proxy(server, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (
        (property === 'tool' || property === 'registerTool' || property === 'registerResource')
        && typeof value === 'function'
      ) {
        return (...registrationArgs: unknown[]) => {
          const result = Reflect.apply(value, target, registrationArgs);
          if (property === 'tool') captureLegacyTool(registrationArgs, surface);
          else if (property === 'registerTool') captureRegisteredTool(registrationArgs, surface);
          else captureRegisteredResource(registrationArgs, surface);
          return result;
        };
      }
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

export function getCurrentToolCatalog(): CurrentToolCatalog {
  const sortedTools = [...tools.values()].sort((left, right) => left.name.localeCompare(right.name));
  const sortedResources = [...resources.values()].sort((left, right) => (
    left.name.localeCompare(right.name) || left.uri.localeCompare(right.uri)
  ));
  const counts = {
    tools: sortedTools.length,
    resources: sortedResources.length,
    read: sortedTools.filter(({ surface }) => surface === 'read').length,
    operationalWrite: sortedTools.filter(({ surface }) => surface === 'operational-write').length,
    scopedWrite: sortedTools.filter(({ surface }) => surface === 'scoped-write').length
  };
  const semantic = {
    schemaVersion: 1 as const,
    catalogueVersion: 1 as const,
    tools: sortedTools,
    resources: sortedResources
  };
  const catalogueDigest = digest(semantic);
  return {
    schemaVersion: 1,
    catalogueVersion: 1,
    generatedAt: observedAt ?? new Date(0).toISOString(),
    counts,
    catalogueDigest,
    catalogDigest: catalogueDigest,
    registeredToolCount: counts.tools,
    readOnlyToolCount: counts.read,
    operationalWriteToolCount: counts.operationalWrite,
    writeToolCount: counts.operationalWrite + counts.scopedWrite,
    resourceCount: counts.resources,
    tools: sortedTools,
    resources: sortedResources
  };
}

export function resetToolCatalogForTests(): void {
  tools.clear();
  resources.clear();
  observedAt = null;
}
