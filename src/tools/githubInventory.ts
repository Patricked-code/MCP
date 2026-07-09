import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { asText } from './format.js';
import { buildGithubInventorySummary } from '../github/inventory.js';

const OwnerSchema = z.string().min(1).max(120).regex(/^[A-Za-z0-9_.-]+$/).optional();

export function registerGithubInventoryReadOnlyTools(server: McpServer): void {
  server.tool(
    'github_org_inventory',
    'Liste les dépôts GitHub visibles pour l’organisation configurée ou fournie, sans écrire, sans cloner et sans supprimer.',
    {
      owner: OwnerSchema,
      includeArchived: z.boolean().default(true),
      includeForks: z.boolean().default(true),
      maxPages: z.number().int().min(1).max(100).default(20)
    },
    async ({ owner, includeArchived, includeForks, maxPages }) => asText(await buildGithubInventorySummary({
      owner,
      includeArchived,
      includeForks,
      maxPages,
      actor: 'mcp-tool:github_org_inventory'
    }))
  );

  server.tool(
    'github_account_inventory',
    'Liste les dépôts GitHub visibles pour le compte authentifié par le token MCP, sans écrire, sans cloner et sans supprimer.',
    {
      includeArchived: z.boolean().default(true),
      includeForks: z.boolean().default(true),
      maxPages: z.number().int().min(1).max(100).default(20)
    },
    async ({ includeArchived, includeForks, maxPages }) => asText(await buildGithubInventorySummary({
      includeArchived,
      includeForks,
      maxPages,
      forceAuthenticatedAccount: true,
      actor: 'mcp-tool:github_account_inventory'
    }))
  );
}
