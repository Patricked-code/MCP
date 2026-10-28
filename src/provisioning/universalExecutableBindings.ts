/**
 * GD-U-02: explicit binding of an *existing* registered MCP handler to a
 * targeted capability. This is an adapter inventory, NOT a new tool registrar.
 *
 * "runtimeRegistered" proves only that a real handler was registered.
 * It does not prove underlying provider privileges, deployment, full coverage
 * of a broad feature, or current task/session/claim/lock/E3 admission.
 */
import {
  findUniversalAdminCapability,
  UNIVERSAL_ADMIN_CAPABILITY_COUNT
} from './universalAdminCapabilityCatalog.js';

type Surface = 'read' | 'scoped-write' | 'operational-write';
type Mode = 'READ_ONLY' | 'GOVERNED_WRITE' | 'PREFLIGHT_ONLY';
type BindingSpec = Readonly<{
  id: string;
  toolName: string;
  surface: Surface;
  executionMode: Mode;
  /** SCOPED: handler implements only its documented target/operation subset. */
  coverage: 'SCOPED';
}>;

// Verified against the existing runtime registration cartography, not guessed.
// No mapping to a tool from PR #354 that has not been merged into main.
const EXISTING_BINDINGS: readonly BindingSpec[] = [
  {id:'github.repository.inspect',toolName:'github_get_repository_state',surface:'read',executionMode:'READ_ONLY',coverage:'SCOPED'},
  {id:'github.git.compare',toolName:'github_compare_refs',surface:'read',executionMode:'READ_ONLY',coverage:'SCOPED'},
  {id:'github.branch.create',toolName:'github_create_branch',surface:'scoped-write',executionMode:'GOVERNED_WRITE',coverage:'SCOPED'},
  {id:'github.git.commit',toolName:'github_create_commit',surface:'scoped-write',executionMode:'GOVERNED_WRITE',coverage:'SCOPED'},
  {id:'github.git.file.update',toolName:'github_create_or_update_file',surface:'scoped-write',executionMode:'GOVERNED_WRITE',coverage:'SCOPED'},
  {id:'github.pull_request.create',toolName:'github_create_pull_request',surface:'scoped-write',executionMode:'GOVERNED_WRITE',coverage:'SCOPED'},
  {id:'github.pull_request.merge',toolName:'github_merge_pull_request',surface:'scoped-write',executionMode:'GOVERNED_WRITE',coverage:'SCOPED'},
  {id:'github.actions.runs.read',toolName:'github_get_workflow_runs',surface:'read',executionMode:'READ_ONLY',coverage:'SCOPED'},
  {id:'plesk.subdomain.create',toolName:'plesk_subdomain_preview_s1s2',surface:'read',executionMode:'PREFLIGHT_ONLY',coverage:'SCOPED'},
  {id:'plesk.domain.inspect',toolName:'list_domains_s1',surface:'read',executionMode:'READ_ONLY',coverage:'SCOPED'},
  {id:'server.inventory.read',toolName:'check_disk_s1',surface:'read',executionMode:'READ_ONLY',coverage:'SCOPED'},
  {id:'server.docker.inspect',toolName:'docker_status_s1',surface:'read',executionMode:'READ_ONLY',coverage:'SCOPED'},
  {id:'intelligence.capabilities.discover',toolName:'mcp_get_current_state_inventory',surface:'read',executionMode:'READ_ONLY',coverage:'SCOPED'}
];

export type RegisteredToolWitness = Readonly<{name:string;surface:string}>;
export type ExecutableUniversalBinding = Readonly<{
  id:string;
  toolName:string;
  executionMode:Mode;
  coverage:'SCOPED';
  runtimeRegistered:true;
  /** Read-only tools can be called, but provider may still deny access. */
  permissionAttested:false;
  authorizedNow:false;
}>;
export type ExecutableUniversalBindings = Readonly<{
  kind:'RUNTIME_REGISTERED_EXECUTORS';
  catalogueTotal:number;
  bindings:readonly ExecutableUniversalBinding[];
  runtimeWriteAuthorized:false;
  anyAdminRightGranted:false;
}>;

export function resolveExecutableUniversalBindings(
  tools:readonly RegisteredToolWitness[]
):ExecutableUniversalBindings {
  const found=new Map<string,RegisteredToolWitness>();
  for(const t of tools) {
    if(!/^[A-Za-z0-9][A-Za-z0-9_]{0,159}$/.test(t.name) || found.has(t.name)) {
      throw new Error('EXECUTABLE_BINDING_DUPLICATE_OR_INVALID_TOOL');
    }
    found.set(t.name,t);
  }
  const bindings:ExecutableUniversalBinding[]=[];
  for(const spec of EXISTING_BINDINGS) {
    if(!findUniversalAdminCapability(spec.id)) throw new Error('EXECUTABLE_BINDING_UNKNOWN_CAPABILITY');
    const actual=found.get(spec.toolName);
    if(!actual) continue;
    if(actual.surface!==spec.surface) throw new Error('EXECUTABLE_BINDING_SURFACE_MISMATCH');
    bindings.push({
      id:spec.id,toolName:spec.toolName,executionMode:spec.executionMode,coverage:spec.coverage,
      runtimeRegistered:true,permissionAttested:false,authorizedNow:false
    });
  }
  return {
    kind:'RUNTIME_REGISTERED_EXECUTORS',
    catalogueTotal:UNIVERSAL_ADMIN_CAPABILITY_COUNT,
    bindings,
    runtimeWriteAuthorized:false,
    anyAdminRightGranted:false
  };
}
