import { readFile } from 'node:fs/promises';
import { z } from 'zod';

/**
 * Documentary MCP_SELF entry, bundled with the exact-SHA runtime image.
 * This is NOT an operative GitRegistry binding or an authorization decision.
 * The canonical record and effective credentials remain in their existing
 * authorities. Never read a user-supplied file path from a tool request.
 */
const CanonicalProjectEntrySchema = z.object({
  schemaVersion: z.literal(1),
  recordType: z.literal('MCP_SELF_CANONICAL_PROJECT_ENTRY_PROJECTION'),
  status: z.literal('CANDIDATE_DOCUMENTARY_BINDING'),
  projectUid: z.literal('WT-PROJECT-MCP-001'),
  projectKind: z.literal('MCP_SELF'),
  repository: z.literal('Patricked-code/MCP'),
  officialBranch: z.literal('main'),
  runtimeProduct: z.literal('wealthtech_ssh_bridge'),
  serverId: z.literal('s1'),
  serverRoot: z.literal('/opt/apps/wealthtech-mcp-ssh-bridge'),
  sourceAuthority: z.string().min(10).max(300),
  documentationRoot: z.literal('docs/governance/canonical-project/README.md'),
  historicalSource: z.string().min(10).max(240),
  historicalMasterPlan: z.string().min(10).max(240),
  historicalPlaybook: z.string().min(10).max(240),
  historicalTraceability: z.string().min(10).max(240),
  originalDocumentOrder: z.array(z.string().min(3).max(100)).length(17),
  requiredAdditionalHistoricalDocuments: z.array(z.string().min(3).max(100)).length(3),
  entryWorkflow: z.array(z.string().min(8).max(120)).min(8).max(16),
  registryReferences: z.array(z.object({
    id: z.string().min(2).max(50),
    path: z.string().min(3).max(250),
    authority: z.string().min(3).max(80),
    classification: z.enum(['ACTIVE_DOCUMENT','DOCUMENTARY_CANDIDATE','LIVE_EVIDENCE_REQUIRED'])
  }).strict()).min(3).max(30),
  discoveryTools: z.array(z.string().min(3).max(90)).min(3).max(30),
  operationCatalog: z.array(z.object({
    operation: z.string().min(3).max(70),
    classification: z.string().min(5).max(110),
    granted: z.literal(false)
  }).strict()).min(1).max(30),
  authorizationGranted: z.literal(false),
  runtimeBindingVerified: z.literal(false),
  sessionOrTaskCreated: z.literal(false),
  liveStateAttested: z.literal(false),
  applicationDeployScope: z.literal(false)
}).strict();

export type CanonicalProjectEntry = z.infer<typeof CanonicalProjectEntrySchema>;

export type CanonicalProjectEntryResult =
  | Readonly<{
    status: 'DOCUMENTARY_CANDIDATE';
    loadedFromBundledManifest: true;
    mutationPerformed: false;
    effectivePermissionInferred: false;
    identity: CanonicalProjectEntry;
  }>
  | Readonly<{
    status: 'UNAVAILABLE';
    reasonCode: 'CANONICAL_ENTRY_UNAVAILABLE';
    loadedFromBundledManifest: false;
    mutationPerformed: false;
    effectivePermissionInferred: false;
    identity: null;
  }>;

const DEFAULT_PROJECT_ENTRY_FILE = '/app/.mcp/canonical-project-entry.json';

/** Pure read-only adapter; no GitRegistry, Task, Session, or Lock mutation. */
export async function loadCanonicalMcpProjectEntry(
  manifestPath = DEFAULT_PROJECT_ENTRY_FILE
): Promise<CanonicalProjectEntryResult> {
  try {
    const source = await readFile(manifestPath, 'utf8');
    const parsed: unknown = JSON.parse(source);
    const identity = CanonicalProjectEntrySchema.parse(parsed);
    if (new Set(identity.originalDocumentOrder).size !== identity.originalDocumentOrder.length
      || new Set(identity.discoveryTools).size !== identity.discoveryTools.length
      || new Set(identity.registryReferences.map(x => x.id)).size !== identity.registryReferences.length) {
      throw new Error('CANONICAL_PROJECT_REFERENCES_NOT_UNIQUE');
    }
    return {
      status: 'DOCUMENTARY_CANDIDATE',
      loadedFromBundledManifest: true,
      mutationPerformed: false,
      effectivePermissionInferred: false,
      identity
    };
  } catch {
    // Fail closed. Missing or invalid image asset must never produce a fake binding.
    return {
      status: 'UNAVAILABLE',
      reasonCode: 'CANONICAL_ENTRY_UNAVAILABLE',
      loadedFromBundledManifest: false,
      mutationPerformed: false,
      effectivePermissionInferred: false,
      identity: null
    };
  }
}
