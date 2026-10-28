/**
 * GD-U-EXPOSE: additive discovery of *target* capabilities alongside the
 * already registered MCP tool surface. This does not register 165 pretend
 * executors, change an existing tool schema or grant administrative rights.
 *
 * Runtime mutations remain in the original registered tools and existing
 * Task Queue / session / claim / locks / consent / exact-HEAD authorities.
 */
import {
  UNIVERSAL_ADMIN_CAPABILITIES,
  type AdminPlane,
  type AdminRisk
} from './universalAdminCapabilityCatalog.js';

export type UniversalCapabilityDiscoveryInput = Readonly<{
  existingToolNames: readonly string[];
  plane?: AdminPlane;
  offset: number;
  limit: number;
}>;

export const UNIVERSAL_CAPABILITY_DELIVERY_METHOD = {
  canonicalParentIssue: 349,
  canonicalPullRequest: 355,
  deployBeforeCi: false,
  principles: [
    {
      id:'GITHUB_FIRST',
      mandatory:true,
      contract:'All code changes use a dedicated GitHub branch, PR, exact-HEAD CI, review and governed deployment. No direct production code patches.'
    },
    {
      id:'NO_REGRESSION',
      mandatory:true,
      contract:'Preserve all registered MCP capabilities and existing governance. Add, compose and test rather than silently replace or delete.'
    },
    {
      id:'INDEPENDENT_SLICES',
      mandatory:true,
      contract:'Each slice has a distinct owner, isolated files, dependency graph, acceptance gates, proofs and durable handoff.'
    },
    {
      id:'RED_GREEN_REGRESSION',
      mandatory:true,
      contract:'Prove missing behavior RED, implement GREEN, run existing regression suite and independently review exact HEAD before merger.'
    }
  ]
} as const;

export type UniversalDiscoveredCapability = Readonly<{
  id: string;
  plane: AdminPlane;
  risk: AdminRisk;
  implementationHint: 'existing' | 'adapter';
  exposure: 'TARGET_ONLY_NOT_REGISTERED_TOOL';
  executionReady: false;
  requiresEffectiveDelegation: true;
  runtimeWriteAuthorized: false;
}>;

export type UniversalCapabilityDiscovery = Readonly<{
  schemaVersion: 1;
  disposition: 'READ_ONLY_CAPABILITY_DISCOVERY';
  counts: Readonly<{
    registeredTools: number;
    additionalTargetCapabilities: number;
    filteredTargets: number;
  }>;
  existingRegisteredToolNames: readonly string[];
  capabilities: readonly UniversalDiscoveredCapability[];
  nextOffset: number | null;
  method: typeof UNIVERSAL_CAPABILITY_DELIVERY_METHOD;
  privilegesGrantedByDiscovery: false;
  runtimeWriteAuthorized: false;
  operationsExecuted: false;
}>;

const PLANES: readonly AdminPlane[] = ['github','plesk','server','intelligence'];
const TOOL_NAME = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;

/**
 * Only tool names actually observed from the existing runtime registry are
 * marked "registered". Newly catalogued functions are always TARGET_ONLY.
 */
export function buildUniversalCapabilityDiscovery(
  input: UniversalCapabilityDiscoveryInput
): UniversalCapabilityDiscovery {
  if (!Array.isArray(input.existingToolNames)
      || input.existingToolNames.some(n=>typeof n!=='string'||!TOOL_NAME.test(n))
      || new Set(input.existingToolNames).size!==input.existingToolNames.length) {
    throw new Error('CAPABILITY_DISCOVERY_REGISTERED_TOOLS_INVALID');
  }
  if (input.plane!==undefined && !PLANES.includes(input.plane)) {
    throw new Error('CAPABILITY_DISCOVERY_PLANE_INVALID');
  }
  if (!Number.isSafeInteger(input.offset) || input.offset<0
      || !Number.isSafeInteger(input.limit) || input.limit<1 || input.limit>200) {
    throw new Error('CAPABILITY_DISCOVERY_PAGE_INVALID');
  }
  const filtered = input.plane
    ? UNIVERSAL_ADMIN_CAPABILITIES.filter(c=>c.plane===input.plane)
    : UNIVERSAL_ADMIN_CAPABILITIES;
  const page = filtered.slice(input.offset,input.offset+input.limit);
  return {
    schemaVersion:1,
    disposition:'READ_ONLY_CAPABILITY_DISCOVERY',
    counts: {
      registeredTools:input.existingToolNames.length,
      additionalTargetCapabilities:UNIVERSAL_ADMIN_CAPABILITIES.length,
      filteredTargets:filtered.length
    },
    existingRegisteredToolNames:[...input.existingToolNames],
    capabilities:page.map(c=>({
      id:c.id,plane:c.plane,risk:c.risk,implementationHint:c.existing,
      exposure:'TARGET_ONLY_NOT_REGISTERED_TOOL',
      executionReady:false,requiresEffectiveDelegation:true,
      runtimeWriteAuthorized:false
    })),
    nextOffset:input.offset+input.limit<filtered.length
      ? input.offset+input.limit:null,
    method:UNIVERSAL_CAPABILITY_DELIVERY_METHOD,
    privilegesGrantedByDiscovery:false,
    runtimeWriteAuthorized:false,
    operationsExecuted:false
  };
}

/**
 * Preserve historical get_project_context fields byte-for-byte as values.
 * Additional targets are a new property, never a replacement for the MCP
 * runtime tool catalogue or existing project/servers metadata.
 */
export function extendProjectContextWithUniversalCapabilities<T extends Record<string, unknown>>(
  existingContext: T,
  registeredToolNames: readonly string[]
): T & { universalCapabilities: UniversalCapabilityDiscovery } {
  if (Object.prototype.hasOwnProperty.call(existingContext,'universalCapabilities')) {
    throw new Error('CAPABILITY_DISCOVERY_CONTEXT_COLLISION');
  }
  return {
    ...existingContext,
    universalCapabilities: buildUniversalCapabilityDiscovery({
      existingToolNames: registeredToolNames,offset:0,limit:200
    })
  };
}
