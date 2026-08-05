import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { dryRunGitRegistryV2 } from '../github/registryV2.js';
import { asText } from './format.js';

const DEFAULT_REGISTRY_FILE = '/app/data/mcp-git-registry.json';

export function registerGitRegistryV2ReadOnlyTools(server: McpServer): void {
  server.tool(
    'github_registry_v2_dry_run',
    'Valide le registre Git actuel et prépare en mémoire un candidat GitRegistry v2. Aucun fichier n’est écrit.',
    {
      include_candidate: z.boolean().default(false)
    },
    async ({ include_candidate }) => {
      const file = process.env.MCP_GIT_REGISTRY_FILE || DEFAULT_REGISTRY_FILE;
      const source = JSON.parse(await readFile(file, 'utf8')) as unknown;
      const { candidate, report } = dryRunGitRegistryV2(source);

      return asText(JSON.stringify({
        readOnly: true,
        sourceFile: file,
        written: false,
        report,
        candidate: include_candidate ? candidate : undefined
      }, null, 2));
    }
  );
}
