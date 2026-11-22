import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  githubJsonRequestWithServerCredential,
  type GitHubJsonRequestOptions,
  type GitHubJsonResponse
} from '../github/connection.js';
import { getCurrentToolCatalog } from '../currentState/toolCatalog.js';
import { asText } from './format.js';
import {
  inspectWorkersProject4Access,
  WORKERS_PROJECT4,
  type WorkersProject4AccessResult
} from './githubProjectAccess.js';

/**
 * WORKERS Project 4: read-only workflows over GitHub's own Projects GraphQL API.
 * The GitHub Project is a PUBLIC projection, never the private canonical-memory store.
 * New functions compose existing identity/client/catalogue authorities; no second queue.
 */
export const WORKERS_STRUCTURE_QUERY = `query WorkersProject4Structure($owner: String!, $number: Int!) {
  viewer { login }
  user(login: $owner) {
    projectV2(number: $number) {
      id number public url
      fields(first: 50) {
        pageInfo { hasNextPage }
        nodes { ... on ProjectV2FieldCommon { id name } }
      }
      views(first: 50) {
        pageInfo { hasNextPage }
        nodes { id name layout }
      }
      items(first: 1) { totalCount }
    }
  }
}`;

/** Public cockpit only. The private corpus, decisions and traceable sources live elsewhere. */
export const PUBLIC_MEMORY_PROJECTION = Object.freeze({
  fields: ['Memoire_ID', 'Nature', 'Volet', 'Autorite', 'Source_Ref', 'Revision', 'Publication'],
  views: ['Memoire', 'Decisions', 'Sources', 'Continuite']
});

export const WORKERS_WORKFLOW_CONTRACTS = Object.freeze([
  { id: 'ACCESS_PREFLIGHT', status: 'READ_ONLY_AVAILABLE', steps: ['github_project_access_preflight'], output: 'access_receipt' },
  { id: 'PROJECT_INVENTORY', status: 'READ_ONLY_AVAILABLE', steps: ['github_project_access_preflight', 'github_project_v2_inventory'], output: 'project_structure_receipt' },
  { id: 'CANONICAL_MEMORY_PREVIEW', status: 'READ_ONLY_AVAILABLE', steps: ['github_project_access_preflight', 'github_project_v2_inventory', 'compare_public_projection'], output: 'public_projection_diff' },
  { id: 'PROJECT_RECONCILE_PREVIEW', status: 'READ_ONLY_AVAILABLE', steps: ['github_project_access_preflight', 'github_project_v2_inventory', 'compare_public_projection'], output: 'reconciliation_proposal' },
  { id: 'CANONICAL_MEMORY_INGEST', status: 'BLOCKED_SOURCE_ACQUISITION', steps: ['inventory_chat_sources', 'archive_originals_private', 'classify', 'verify_exhaustiveness'], output: 'verified_private_memory' },
  { id: 'PROJECT_BOOTSTRAP_APPLY', status: 'BLOCKED_WRITE_ADAPTER', steps: ['identity_preflight', 'governance_admission', 'read_before_write', 'idempotent_graphql_mutations', 'attest'], output: 'project_bootstrap_attestation' },
  { id: 'PROJECT_SYNC_APPLY', status: 'BLOCKED_WRITE_ADAPTER', steps: ['verified_memory', 'publication_approval', 'governed_graphql_write', 'reconcile'], output: 'public_projection_attestation' },
  { id: 'PROJECT_GOVERNED_DEPLOY', status: 'EXISTING_DEPLOY_PIPELINE_REUSE', steps: ['mcp_ci', 'main_merge_by_governance', 'existing_governed_deploy', 'runtime_sha_attestation'], output: 'deploy_attestation' }
] as const);

type Response = (endpoint: string, options?: GitHubJsonRequestOptions) => Promise<GitHubJsonResponse>;
type RecordValue = Record<string, unknown>;
const object = (v: unknown): RecordValue | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : null;
const str = (v: unknown): string | null => typeof v === 'string' && v.length > 0 ? v : null;
const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const WorkflowSchema = z.enum(['ACCESS_PREFLIGHT', 'PROJECT_INVENTORY', 'CANONICAL_MEMORY_PREVIEW', 'PROJECT_RECONCILE_PREVIEW']);
type Workflow = z.infer<typeof WorkflowSchema>;

export type ProjectInventory = {
  target: string;
  status: 'READ_ACCESS_VERIFIED' | 'BLOCKED' | 'UNVERIFIED' | 'PARTIAL';
  reasonCode?: string;
  projectNodeId?: string;
  fields?: { id: string; name: string }[];
  views?: { id: string; name: string; layout: string | null }[];
  itemsTotalCount?: number;
  paginationIncomplete?: boolean;
  noMutation: true;
};

export async function inspectProjectStructure(
  request: Response = githubJsonRequestWithServerCredential
): Promise<ProjectInventory> {
  const base = { target: WORKERS_PROJECT4.url, noMutation: true as const };
  let response: GitHubJsonResponse;
  try {
    response = await request('/graphql', {
      method: 'POST',
      jsonBody: { query: WORKERS_STRUCTURE_QUERY, variables: { owner: WORKERS_PROJECT4.owner, number: WORKERS_PROJECT4.number } }
    });
  } catch {
    return { ...base, status: 'UNVERIFIED', reasonCode: 'TRANSPORT_UNAVAILABLE' };
  }
  if (!response.ok || response.status !== 200) return { ...base, status: 'UNVERIFIED', reasonCode: 'GITHUB_REQUEST_FAILED' };
  const envelope = object(response.json);
  if (!envelope || arr(envelope.errors).length > 0) return { ...base, status: 'UNVERIFIED', reasonCode: 'GRAPHQL_REJECTED' };
  const data = object(envelope.data);
  const viewer = object(data?.viewer);
  if (str(viewer?.login)?.toLowerCase() !== WORKERS_PROJECT4.owner.toLowerCase()) {
    return { ...base, status: 'BLOCKED', reasonCode: 'GITHUB_PRINCIPAL_MISMATCH' };
  }
  const project = object(object(data?.user)?.projectV2);
  if (!project || str(project.id) === null || project.number !== WORKERS_PROJECT4.number ||
      project.public !== true || str(project.url)?.toLowerCase() !== WORKERS_PROJECT4.url.toLowerCase()) {
    return { ...base, status: 'BLOCKED', reasonCode: 'PROJECT_UNAVAILABLE_OR_IDENTITY_MISMATCH' };
  }
  const fieldConnection = object(project.fields);
  const viewConnection = object(project.views);
  const items = object(project.items);
  if (!fieldConnection || !viewConnection || !items) return { ...base, status: 'UNVERIFIED', reasonCode: 'INVENTORY_INCOMPLETE' };
  const fields = arr(fieldConnection.nodes).map(object).map(v => ({
    id: str(v?.id) ?? '', name: str(v?.name) ?? ''
  }));
  const views = arr(viewConnection.nodes).map(object).map(v => ({
    id: str(v?.id) ?? '', name: str(v?.name) ?? '', layout: str(v?.layout)
  }));
  if (fields.some(f => !f.id || !f.name) || views.some(v => !v.id || !v.name) ||
      !Number.isSafeInteger(items.totalCount) || Number(items.totalCount) < 0 ||
      typeof object(fieldConnection.pageInfo)?.hasNextPage !== 'boolean' ||
      typeof object(viewConnection.pageInfo)?.hasNextPage !== 'boolean') {
    return { ...base, status: 'UNVERIFIED', reasonCode: 'INVENTORY_INVALID' };
  }
  const paginationIncomplete = object(fieldConnection.pageInfo)?.hasNextPage === true ||
    object(viewConnection.pageInfo)?.hasNextPage === true;
  return {
    ...base,
    status: paginationIncomplete ? 'PARTIAL' : 'READ_ACCESS_VERIFIED',
    projectNodeId: str(project.id)!,
    fields,
    views,
    itemsTotalCount: Number(items.totalCount),
    paginationIncomplete
  };
}

export type WorkflowResult = {
  workflow: Workflow;
  target: string;
  status: 'SUCCESS_READ_ONLY' | 'BLOCKED' | 'UNVERIFIED';
  noMutation: true;
  steps: string[];
  access?: WorkersProject4AccessResult;
  inventory?: ProjectInventory;
  proposal?: { missingFields: string[]; missingViews: string[]; requiresApproval: true; noMutation: true };
  reasonCode?: string;
};

export async function runProjectWorkflowReadOnly(
  workflow: Workflow,
  request: Response = githubJsonRequestWithServerCredential
): Promise<WorkflowResult> {
  const base = { workflow, target: WORKERS_PROJECT4.url, noMutation: true as const };
  const access = await inspectWorkersProject4Access(request);
  if (access.status !== 'READ_ACCESS_VERIFIED') {
    return { ...base, status: 'BLOCKED', steps: ['access_preflight'], access, reasonCode: access.status };
  }
  if (workflow === 'ACCESS_PREFLIGHT') {
    return { ...base, status: 'SUCCESS_READ_ONLY', steps: ['access_preflight'], access };
  }
  const inventory = await inspectProjectStructure(request);
  if (inventory.status !== 'READ_ACCESS_VERIFIED') {
    return { ...base, status: inventory.status === 'UNVERIFIED' ? 'UNVERIFIED' : 'BLOCKED',
      steps: ['access_preflight', 'project_inventory'], access, inventory,
      reasonCode: inventory.reasonCode ?? inventory.status };
  }
  if (inventory.projectNodeId !== access.projectNodeId) {
    return { ...base, status: 'BLOCKED', steps: ['access_preflight', 'project_inventory'],
      access, inventory, reasonCode: 'PROJECT_NODE_DRIFT' };
  }
  if (workflow === 'PROJECT_INVENTORY') {
    return { ...base, status: 'SUCCESS_READ_ONLY', steps: ['access_preflight', 'project_inventory'], access, inventory };
  }
  // An exact diff against a public-only candidate. No canonical source ingestion occurs here.
  const existingFields = new Set((inventory.fields ?? []).map(f => f.name.toLowerCase()));
  const existingViews = new Set((inventory.views ?? []).map(v => v.name.toLowerCase()));
  const proposal = {
    missingFields: PUBLIC_MEMORY_PROJECTION.fields.filter(name => !existingFields.has(name.toLowerCase())),
    missingViews: PUBLIC_MEMORY_PROJECTION.views.filter(name => !existingViews.has(name.toLowerCase())),
    requiresApproval: true as const,
    noMutation: true as const
  };
  return { ...base, status: 'SUCCESS_READ_ONLY',
    steps: ['access_preflight', 'project_inventory', 'public_projection_diff'],
    access, inventory, proposal };
}

export function registerWorkersProjectWorkflowsReadTools(server: McpServer): void {
  server.tool(
    'github_project_v2_workflow_catalogue',
    'Répertorie les workflows GitHub Projects WORKERS réalisables ou explicitement bloqués, sans prétendre exécuter la mémoire privée.',
    {},
    async () => {
      const registered = new Set(getCurrentToolCatalog().tools.map(item => item.name));
      return asText(JSON.stringify({
        target: WORKERS_PROJECT4.url,
        noMutation: true,
        workflows: WORKERS_WORKFLOW_CONTRACTS,
        exposedMcpFunctions: ['github_project_access_preflight', 'github_project_v2_inventory',
          'github_project_v2_workflow_catalogue', 'github_project_v2_workflow_preflight',
          'github_project_v2_workflow_run_readonly'].map(name => ({ name, registered: registered.has(name) }))
      }, null, 2));
    }
  );

  server.tool(
    'github_project_v2_inventory',
    'Inventorie en lecture seule les champs, vues et compteurs du Project personnel Patricked-code/4.',
    {},
    async () => asText(JSON.stringify(await inspectProjectStructure(), null, 2))
  );

  server.tool(
    'github_project_v2_workflow_preflight',
    'Vérifie les préconditions de workflow de WORKERS via GitHub GraphQL sans modification.',
    { workflow: WorkflowSchema },
    async ({ workflow }) => {
      const result = await runProjectWorkflowReadOnly(workflow);
      return asText(JSON.stringify({
        workflow, target: result.target, preflightStatus: result.status,
        steps: result.steps, reasonCode: result.reasonCode ?? null,
        publicationGate: 'PRIVATE_SOURCE_NEVER_AUTOPUBLISHED',
        mutationAuthorized: false, noMutation: true
      }, null, 2));
    }
  );

  server.tool(
    'github_project_v2_workflow_run_readonly',
    'Exécute une chaîne de vérifications GitHub Projects (accès, inventaire, comparaison) sans mutation.',
    { workflow: WorkflowSchema },
    async ({ workflow }) => asText(JSON.stringify(await runProjectWorkflowReadOnly(workflow), null, 2))
  );
}
