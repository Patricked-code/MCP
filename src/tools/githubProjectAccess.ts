import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  githubJsonRequestWithServerCredential,
  type GitHubJsonResponse,
  type GitHubJsonRequestOptions
} from '../github/connection.js';
import { asText } from './format.js';

/**
 * WORKERS bootstrap P0: query exactly one personal-account ProjectV2.
 * Uses the existing server credential and allowlisted GitHub GraphQL client.
 * No PAT creation, no scope escalation, no mutation, no repository writes.
 */
export const WORKERS_PROJECT4 = Object.freeze({
  owner: 'Patricked-code',
  number: 4,
  url: 'https://github.com/users/Patricked-code/projects/4'
});

export const WORKERS_PROJECT4_QUERY = `query WorkersProject4Read($owner: String!, $number: Int!) {
  viewer { login }
  user(login: $owner) {
    projectV2(number: $number) {
      id
      number
      title
      public
      url
      viewerCanUpdate
    }
  }
}`;

type Request = (endpoint: string, options?: GitHubJsonRequestOptions) => Promise<GitHubJsonResponse>;
type JsonRecord = Record<string, unknown>;
function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord : null;
}
function string(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export type WorkersProject4AccessResult = {
  target: string;
  noMutation: true;
  status: string;
  httpStatus?: number | null;
  authenticatedLogin?: string | null;
  projectNodeId?: string;
  projectNumber?: number;
  title?: string | null;
  public?: boolean;
  viewerCanUpdate?: boolean;
  notice?: string;
};

/** Result intentionally excludes token, HTTP headers, and GraphQL error messages. */
export async function inspectWorkersProject4Access(
  request: Request = githubJsonRequestWithServerCredential
): Promise<WorkersProject4AccessResult> {
  const base: WorkersProject4AccessResult = {
    target: WORKERS_PROJECT4.url, noMutation: true, status: 'NOT_VERIFIED'
  };

  let response: GitHubJsonResponse;
  try {
    response = await request('/graphql', {
      method: 'POST',
      jsonBody: {
        query: WORKERS_PROJECT4_QUERY,
        variables: { owner: WORKERS_PROJECT4.owner, number: WORKERS_PROJECT4.number }
      }
    });
  } catch {
    return { ...base, status: 'GITHUB_REQUEST_UNAVAILABLE' };
  }

  if (!response.ok || response.status !== 200) {
    return {
      ...base, status: 'GITHUB_REQUEST_UNAVAILABLE',
      httpStatus: response.status
    };
  }
  const envelope = record(response.json);
  if (!envelope) return { ...base, status: 'GITHUB_RESPONSE_INVALID' };
  if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
    return { ...base, status: 'GITHUB_GRAPHQL_REJECTED' };
  }
  const data = record(envelope.data);
  const viewer = record(data?.viewer);
  const authenticatedLogin = string(viewer?.login);
  if (!authenticatedLogin || authenticatedLogin.toLowerCase() !== WORKERS_PROJECT4.owner.toLowerCase()) {
    return { ...base, status: 'GITHUB_PRINCIPAL_MISMATCH', authenticatedLogin };
  }
  const user = record(data?.user);
  const project = record(user?.projectV2);
  if (!project) {
    return { ...base, status: 'PROJECT_UNAVAILABLE_OR_UNAUTHORIZED', authenticatedLogin };
  }
  const projectNodeId = string(project.id);
  const url = string(project.url);
  if (
    !projectNodeId ||
    project.number !== WORKERS_PROJECT4.number ||
    project.public !== true ||
    !url ||
    url.toLowerCase() !== WORKERS_PROJECT4.url.toLowerCase()
  ) {
    return { ...base, status: 'PROJECT_IDENTITY_MISMATCH', authenticatedLogin };
  }
  if (typeof project.viewerCanUpdate !== 'boolean') {
    return { ...base, status: 'PROJECT_PERMISSION_HINT_INVALID', authenticatedLogin };
  }
  return {
    ...base,
    status: 'READ_ACCESS_VERIFIED',
    authenticatedLogin,
    projectNodeId,
    projectNumber: WORKERS_PROJECT4.number,
    title: string(project.title),
    public: true,
    viewerCanUpdate: project.viewerCanUpdate,
    notice: 'viewerCanUpdate is informational and does not authorize a mutation.'
  };
}

export function registerWorkersProject4AccessReadTool(server: McpServer): void {
  server.tool(
    'github_project_access_preflight',
    'Vérifie en lecture seule le Project personnel Patricked-code/4 avec le jeton GitHub MCP déjà configuré. Aucune mutation ni secret révélé.',
    {},
    async () => asText(JSON.stringify(await inspectWorkersProject4Access(), null, 2))
  );
}
