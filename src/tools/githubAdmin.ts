import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { env } from '../config/env.js';
import {
  createGithubOrganizationRepository,
  type CreateGithubOrganizationRepositoryInput,
  type GithubRepositoryCreationResult
} from '../github/repositoryAdmin.js';
import {
  getDefaultScopedWriteGateDependencies,
  type ScopedWriteGateDependencies,
  type ShadowWriteDecision
} from '../governance/scopedWriteGate.js';
import { assertScopedWriteToolsEnabled } from '../ssh/writeSafety.js';
import { asText } from './format.js';

const OrganizationSchema = z.string().min(1).max(120).regex(/^[A-Za-z0-9_.-]+$/);
const RepositoryNameSchema = z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/);
const DescriptionSchema = z.string().max(350).optional();

type GovernanceExtra = Parameters<ScopedWriteGateDependencies['evaluate']>[0];

export type GithubAdminToolDependencies = {
  writeEnabled(): boolean;
  evaluateGovernance(extra: GovernanceExtra): Promise<ShadowWriteDecision>;
  createRepository(
    input: CreateGithubOrganizationRepositoryInput
  ): Promise<GithubRepositoryCreationResult>;
};

function defaultDependencies(): GithubAdminToolDependencies {
  const gate = getDefaultScopedWriteGateDependencies();
  return {
    writeEnabled: () => env.ENABLE_WRITE_TOOLS,
    evaluateGovernance: (extra) => gate.evaluate(extra),
    createRepository: (input) => createGithubOrganizationRepository(input)
  };
}

export function registerGithubAdminTools(
  server: McpServer,
  dependencies: GithubAdminToolDependencies = defaultDependencies()
): void {
  server.tool(
    'github_create_repository',
    'Crée de façon gouvernée un dépôt GitHub privé et vide dans l’organisation GitHub configurée du MCP. Refuse toute autre organisation, tout dépôt public et toute mutation si la session, la Task, le Live State, le receipt ou les locks ne sont pas prêts.',
    {
      organization: OrganizationSchema,
      name: RepositoryNameSchema,
      description: DescriptionSchema
    },
    async ({ organization, name, description }, extra) => {
      assertScopedWriteToolsEnabled(dependencies.writeEnabled());

      const decision = await dependencies.evaluateGovernance(extra);
      if (
        decision.mode !== 'shadow'
        || decision.verdict !== 'shadow_ready'
        || decision.wouldBlock
      ) {
        throw new Error(`GITHUB_ADMIN_GOVERNANCE_BLOCKED:${decision.verdict}`);
      }

      const result = await dependencies.createRepository({
        organization,
        name,
        ...(description === undefined ? {} : { description })
      });

      return asText(JSON.stringify(result, null, 2));
    }
  );
}
