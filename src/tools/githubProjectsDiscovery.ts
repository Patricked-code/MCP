import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  githubJsonRequestWithPersonalProjectsCredential,
  type GitHubJsonRequestOptions, type GitHubJsonResponse
} from '../github/connection.js';
import { asText } from './format.js';

/** Additive read-only discovery. Existing GitRegistry remains the authority. */
export const OWNER_KINDS = {
  'Patricked-code': 'user',
  'Wealthtechinnovations': 'user',
  'chainsolutions-wealthtech': 'organization'
} as const;
export const OwnerSchema = z.enum(['Patricked-code', 'Wealthtechinnovations', 'chainsolutions-wealthtech']);
export type Owner = z.infer<typeof OwnerSchema>;
type Request = (endpoint: string, options?: GitHubJsonRequestOptions) => Promise<GitHubJsonResponse>;
type Rec = Record<string, unknown>;
const obj = (v: unknown): Rec | null => v && typeof v === 'object' && !Array.isArray(v) ? v as Rec : null;
const str = (v: unknown): string | null => typeof v === 'string' && v.length > 0 ? v : null;
const num = (v: unknown): number | null => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null;
const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const targetUrl = (owner: Owner, n: number) => 'https://github.com/' +
  (OWNER_KINDS[owner] === 'user' ? 'users/' : 'orgs/') + owner + '/projects/' + n;

/** Named queries are deliberately static. User input is sent only as GraphQL variables. */
export const DISCOVER_QUERIES = {
  user: 'query WorkersProjectsDiscoverUser($owner: String!, $first: Int!, $after: String) { viewer { login } user(login: $owner) { login projectsV2(first: $first, after: $after) { totalCount pageInfo { hasNextPage endCursor } nodes { id number title url public closed } } } }',
  organization: 'query WorkersProjectsDiscoverOrganization($owner: String!, $first: Int!, $after: String) { viewer { login } organization(login: $owner) { login projectsV2(first: $first, after: $after) { totalCount pageInfo { hasNextPage endCursor } nodes { id number title url public closed } } } }'
} as const;
export const INSPECT_QUERIES = {
  user: 'query WorkersProjectsInspectUser($owner: String!, $number: Int!) { viewer { login } user(login: $owner) { login projectV2(number: $number) { id number title url public closed viewerCanUpdate fields(first: 50) { pageInfo { hasNextPage } nodes { ... on ProjectV2FieldCommon { id name } } } views(first: 50) { pageInfo { hasNextPage } nodes { id name layout } } items(first: 1) { totalCount } } } }',
  organization: 'query WorkersProjectsInspectOrganization($owner: String!, $number: Int!) { viewer { login } organization(login: $owner) { login projectV2(number: $number) { id number title url public closed viewerCanUpdate fields(first: 50) { pageInfo { hasNextPage } nodes { ... on ProjectV2FieldCommon { id name } } } views(first: 50) { pageInfo { hasNextPage } nodes { id name layout } } items(first: 1) { totalCount } } } }'
} as const;

export type Project = {id: string; number: number; title: string; url: string; public: boolean; closed: boolean};
const normalizeProject = (v: unknown, owner: Owner): Project | null => {
  const p = obj(v), n = num(p?.number), id = str(p?.id), title = str(p?.title), url = str(p?.url);
  if (!n || !id || !title || !url || typeof p?.public !== 'boolean' || typeof p?.closed !== 'boolean' ||
      url.replace(/\/$/, '').toLowerCase() !== targetUrl(owner, n).toLowerCase()) return null;
  return {id, number: n, title, url: targetUrl(owner, n), public: p.public, closed: p.closed};
};
const requestGraphql = async (query: string, variables: Rec, request: Request) => {
  try { return await request('/graphql', {method: 'POST', jsonBody: {query, variables}}); }
  catch { return null; }
};
const unwrap = (response: GitHubJsonResponse | null, kind: 'user' | 'organization', owner: Owner) => {
  if (!response || !response.ok || response.status !== 200) return {error: 'GITHUB_REQUEST_FAILED'} as const;
  const body = obj(response.json);
  if (!body || arr(body.errors).length) return {error: 'GRAPHQL_REJECTED'} as const;
  const data = obj(body.data), viewer = str(obj(data?.viewer)?.login);
  if (!viewer) return {error: 'VIEWER_UNVERIFIED'} as const;
  if (owner === 'Patricked-code' && viewer.toLowerCase() !== owner.toLowerCase()) {
    return {error: 'GITHUB_PRINCIPAL_MISMATCH'} as const;
  }
  const principal = obj(data?.[kind]);
  if (!principal || str(principal.login)?.toLowerCase() !== owner.toLowerCase()) {
    return {error: 'OWNER_UNAVAILABLE_OR_UNAUTHORIZED'} as const;
  }
  return {principal, viewer} as const;
};

export async function discoverProjects(
  owner: Owner, first = 50, after: string | null = null,
  request: Request = githubJsonRequestWithPersonalProjectsCredential
) {
  const base = {owner, noMutation: true as const};
  const kind = OWNER_KINDS[owner];
  if (!kind || !Number.isSafeInteger(first) || first < 1 || first > 100 ||
      (after !== null && (!str(after) || after.length > 1024))) {
    return {...base, status: 'BLOCKED', reasonCode: 'INVALID_INPUT'};
  }
  const result = unwrap(await requestGraphql(DISCOVER_QUERIES[kind], {owner, first, after}, request), kind, owner);
  if ('error' in result) return {...base, status: 'UNVERIFIED', reasonCode: result.error};
  const connection = obj(result.principal.projectsV2), page = obj(connection?.pageInfo);
  const totalCount = num(connection?.totalCount);
  if (!connection || !page || totalCount === null || typeof page.hasNextPage !== 'boolean' ||
      (page.hasNextPage && !str(page.endCursor))) {
    return {...base, status: 'UNVERIFIED', reasonCode: 'INVALID_PROJECT_PAGE'};
  }
  const parsed = arr(connection.nodes).map(v => normalizeProject(v, owner));
  if (parsed.some(v => !v) || new Set(parsed.map(v => v!.id)).size !== parsed.length) {
    return {...base, status: 'UNVERIFIED', reasonCode: 'PROJECT_IDENTITY_INVALID'};
  }
  return {...base, status: 'SUCCESS_READ_ONLY', authenticatedLogin: result.viewer, totalCount,
    projects: parsed as Project[], hasNextPage: page.hasNextPage,
    nextCursor: page.hasNextPage ? str(page.endCursor) : null};
}

export async function inventoryProjects(
  owner: Owner, maxPages = 5,
  request: Request = githubJsonRequestWithPersonalProjectsCredential
) {
  const base = {owner, noMutation: true as const, projects: [] as Project[], complete: false};
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 20) {
    return {...base, status: 'BLOCKED', reasonCode: 'INVALID_PAGE_LIMIT'};
  }
  const projects: Project[] = [], ids = new Set<string>(), cursors = new Set<string>();
  let cursor: string | null = null, count: number | null = null;
  for (let i = 0; i < maxPages; i++) {
    const page = await discoverProjects(owner, 100, cursor, request);
    if (page.status !== 'SUCCESS_READ_ONLY' || !page.projects || page.totalCount === undefined) {
      return {...base, status: 'UNVERIFIED', projects, discovered: projects.length,
        pagesRead: i, reasonCode: page.reasonCode ?? 'PROJECT_PAGE_FAILED'};
    }
    count ??= page.totalCount;
    if (count !== page.totalCount || page.projects.some(p => ids.has(p.id))) {
      return {...base, status: 'UNVERIFIED', projects, discovered: projects.length,
        pagesRead: i + 1, reasonCode: 'PAGINATION_DRIFT'};
    }
    for (const p of page.projects) { ids.add(p.id); projects.push(p); }
    if (!page.hasNextPage) {
      if (projects.length !== count) return {...base, status: 'UNVERIFIED', projects,
        discovered: projects.length, pagesRead: i + 1, reasonCode: 'PROJECT_TOTAL_MISMATCH'};
      return {...base, status: 'SUCCESS_READ_ONLY', projects, discovered: projects.length,
        counted: count, pagesRead: i + 1, complete: true, nextCursor: null};
    }
    if (!page.nextCursor || cursors.has(page.nextCursor)) return {...base, status: 'UNVERIFIED',
      projects, discovered: projects.length, pagesRead: i + 1, reasonCode: 'CURSOR_STALLED'};
    cursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  return {...base, status: 'PARTIAL', projects, discovered: projects.length,
    counted: count, pagesRead: maxPages, nextCursor: cursor};
}

export async function inspectProject(
  owner: Owner, number: number,
  request: Request = githubJsonRequestWithPersonalProjectsCredential
) {
  const base = {owner, number, noMutation: true as const};
  const kind = OWNER_KINDS[owner];
  if (!kind || !Number.isSafeInteger(number) || number < 1 || number > 1000000) {
    return {...base, status: 'BLOCKED', reasonCode: 'INVALID_INPUT'};
  }
  const result = unwrap(await requestGraphql(INSPECT_QUERIES[kind], {owner, number}, request), kind, owner);
  if ('error' in result) return {...base, status: 'UNVERIFIED', reasonCode: result.error};
  const p = obj(result.principal.projectV2), project = normalizeProject(p, owner);
  if (!project || project.number !== number) return {...base, status: 'BLOCKED',
    reasonCode: 'PROJECT_UNAVAILABLE_OR_IDENTITY_MISMATCH'};
  const fc = obj(p?.fields), vc = obj(p?.views), count = num(obj(p?.items)?.totalCount);
  if (!fc || !vc || count === null ||
      typeof obj(fc.pageInfo)?.hasNextPage !== 'boolean' ||
      typeof obj(vc.pageInfo)?.hasNextPage !== 'boolean') {
    return {...base, status: 'UNVERIFIED', reasonCode: 'INVALID_PROJECT_STRUCTURE'};
  }
  const fields = arr(fc.nodes).map(x => {
    const v = obj(x); return str(v?.id) && str(v?.name) ? {id: str(v?.id)!, name: str(v?.name)!} : null;
  });
  const views = arr(vc.nodes).map(x => {
    const v = obj(x);
    return str(v?.id) && str(v?.name) && str(v?.layout)
      ? {id: str(v?.id)!, name: str(v?.name)!, layout: str(v?.layout)!} : null;
  });
  if (fields.some(x => !x) || views.some(x => !x)) {
    return {...base, status: 'UNVERIFIED', reasonCode: 'INVALID_PROJECT_STRUCTURE'};
  }
  const partial = obj(fc.pageInfo)?.hasNextPage === true || obj(vc.pageInfo)?.hasNextPage === true;
  return {...base, status: partial ? 'PARTIAL' : 'SUCCESS_READ_ONLY', project,
    itemCount: count, viewerCanUpdate: p?.viewerCanUpdate === true,
    fields, views};
}

export async function reconcileProjects(
  owner: Owner, maxPages = 5,
  request: Request = githubJsonRequestWithPersonalProjectsCredential
) {
  const inventory = await inventoryProjects(owner, maxPages, request);
  const workersProject = owner === 'Patricked-code'
    ? inventory.projects.find(p => p.number === 4) ?? null : null;
  return {owner, status: inventory.status, noMutation: true,
    inventoryComplete: inventory.complete, discovered: inventory.projects.length,
    knownWorkersProject4: workersProject,
    knownWorkersProject4VerifiedAbsent: owner === 'Patricked-code' &&
      inventory.complete && inventory.status === 'SUCCESS_READ_ONLY' && workersProject === null,
    joinCandidates: inventory.projects.map(p => ({id: p.id, number: p.number, url: p.url})),
    registrationApplied: false, requiresExistingGitRegistryJoin: true,
    requiresApproval: true, reasonCode: 'READ_ONLY_PREVIEW_NOT_PERSISTED'};
}

export function registerGithubProjectsDiscoveryReadTools(server: McpServer): void {
  const pageSize = z.number().int().min(1).max(100).default(50);
  const maxPages = z.number().int().min(1).max(20).default(5);
  const after = z.string().min(1).max(1024).optional();
  server.tool('github_projects_discover',
    'Découvre une page de Projects V2 accessibles à un compte configuré, sans écriture.',
    {owner: OwnerSchema, pageSize, after},
    async ({owner, pageSize, after}) => asText(JSON.stringify(
      await discoverProjects(owner, pageSize, after ?? null), null, 2)));
  server.tool('github_projects_inventory',
    'Inventorie les Projects V2 par pages avec preuve de complétude.',
    {owner: OwnerSchema, maxPages},
    async ({owner, maxPages}) => asText(JSON.stringify(
      await inventoryProjects(owner, maxPages), null, 2)));
  server.tool('github_project_inspect',
    'Inspecte un Project V2 sélectionné par propriétaire et numéro, en lecture seule.',
    {owner: OwnerSchema, number: z.number().int().min(1).max(1000000)},
    async ({owner, number}) => asText(JSON.stringify(
      await inspectProject(owner, number), null, 2)));
  server.tool('github_projects_reconcile',
    'Prépare les jointures GitRegistry existantes sans rien créer ou modifier.',
    {owner: OwnerSchema, maxPages},
    async ({owner, maxPages}) => asText(JSON.stringify(
      await reconcileProjects(owner, maxPages), null, 2)));
}
