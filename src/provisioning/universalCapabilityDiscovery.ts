/**
 * GD-U-EXPOSE: additive discovery of *target* capabilities alongside the
 * already registered MCP tool surface. This does not register 165 pretend
 * executors, change an existing tool schema or grant administrative rights.
 *
 * Runtime mutations remain in the original registered tools and existing
 * Task Queue / session / claim / locks / consent / exact-HEAD authorities.
 */
import {
  resolveExecutableUniversalBindings,
  type RegisteredToolWitness,
  type ExecutableUniversalBindings
} from './universalExecutableBindings.js';
import type { DelegatedLiveProviderResult } from './universalAdminLiveProbe.js';
import {
  UNIVERSAL_ADMIN_CAPABILITIES,
  type AdminPlane,
  type AdminRisk
} from './universalAdminCapabilityCatalog.js';

export type UniversalCapabilityDiscoveryInput = Readonly<{
  existingToolNames: readonly string[];
  registeredTools?: readonly RegisteredToolWitness[];
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
  exposure: 'TARGET_ONLY_NOT_REGISTERED_TOOL' | 'REGISTERED_READ_ONLY'
    | 'REGISTERED_GOVERNED_WRITE' | 'REGISTERED_PREFLIGHT_ONLY';
  /** A real tool handler exists in the CURRENT runtime cartography. */
  registeredToolName: string | null;
  /** Callable handler; write authority remains distinct and unverified. */
  runtimeHandlerRegistered: boolean;
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
  executableBindings: ExecutableUniversalBindings;
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
  // Reconcile the actual runtime registration names/surfaces. Never infer
  // that a catalog target is callable from its string description alone.
  const actualTools = input.registeredTools ?? [];
  if (actualTools.some(t=>!input.existingToolNames.includes(t.name))) {
    throw new Error('CAPABILITY_DISCOVERY_UNRECONCILED_REGISTRY');
  }
  const executableBindings = resolveExecutableUniversalBindings(actualTools);
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
    executableBindings,
    capabilities:page.map(c=>{
      const binding=executableBindings.bindings.find(b=>b.id===c.id);
      const exposure = !binding ? 'TARGET_ONLY_NOT_REGISTERED_TOOL'
        : binding.executionMode==='READ_ONLY' ? 'REGISTERED_READ_ONLY'
        : binding.executionMode==='GOVERNED_WRITE' ? 'REGISTERED_GOVERNED_WRITE'
        : 'REGISTERED_PREFLIGHT_ONLY';
      return {
        id:c.id,plane:c.plane,risk:c.risk,implementationHint:c.existing,
        exposure,
        registeredToolName:binding?.toolName??null,
        runtimeHandlerRegistered:Boolean(binding),
        // "Handler registered" NEVER means effective provider rights or E3 admission.
        executionReady:false,requiresEffectiveDelegation:true,
        runtimeWriteAuthorized:false
      };
    }),
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
  registeredToolNames: readonly string[],
  registeredToolContracts: readonly RegisteredToolWitness[] = [],
  liveEvidence?: DelegatedLiveProviderResult
): T & {
  universalCapabilities: UniversalCapabilityDiscovery;
  delegatedProviderProbes?: DelegatedLiveProviderResult
} {
  if (Object.prototype.hasOwnProperty.call(existingContext,'universalCapabilities')) {
    throw new Error('CAPABILITY_DISCOVERY_CONTEXT_COLLISION');
  }
  return {
    ...existingContext,
    universalCapabilities: buildUniversalCapabilityDiscovery({
      existingToolNames: registeredToolNames,registeredTools:registeredToolContracts,
      offset:0,limit:200
    }),
    ...(liveEvidence ? { delegatedProviderProbes: liveEvidence } : {})
  };
}
