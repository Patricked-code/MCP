import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildGithubPrAuthorizationSummary } from '../github/authorizationDiagnostics.js';
import { asText } from './format.js';
import { registerLiveStateReadOnlyTools } from './liveState.js';

const OwnerSchema = z.string().min(1).max(120).regex(/^[A-Za-z0-9_.-]+$/);
const RepoSchema = z.string().min(1).max(120).regex(/^[A-Za-z0-9_.-]+$/);

export function registerGithubAuthorizationReadOnlyTools(server: McpServer): void {
  server.tool(
    'github_pr_authorization_diagnostic',
    'Teste en lecture seule l’authentification GitHub, la visibilité du dépôt et la lecture des pull requests avec le credential du serveur MCP. Aucun token n’est affiché.',
    {
      owner: OwnerSchema,
      repo: RepoSchema,
      pullRequestNumber: z.number().int().min(1).optional()
    },
    async ({ owner, repo, pullRequestNumber }) => asText(await buildGithubPrAuthorizationSummary({
      owner,
      repo,
      pullRequestNumber: pullRequestNumber ?? null
    }))
  );

  registerLiveStateReadOnlyTools(server);
}
