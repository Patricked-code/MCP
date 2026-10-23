import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { env } from '../config/env.js';
import { runReadOnlyCommand, runGuardedCommand } from '../ssh/client.js';
import { asText } from './format.js';
import { observePleskSubdomain, createPleskSubdomainOnServer } from '../provisioning/pleskSshAdapter.js';
import type { PleskSubdomainInput, PleskServerId } from '../provisioning/pleskSite.js';
import type { PleskRemotePort, PleskPolicy } from '../provisioning/pleskSshAdapter.js';

const SubdomainRequest = {
  serverId: z.enum(['s1','s2']),
  parentDomain: z.string().min(4).max(253),
  label: z.string().min(1).max(63),
  documentRoot: z.string().min(2).max(150)
};

/** RED: strict config parser will be implemented without changing existing server map. */
export function parseAllowedPleskParents(raw: string): PleskPolicy['allowedParents'] {
  const result: Record<PleskServerId, string[]> = { s1: [], s2: [] };
  if (raw === '') return result;
  if (raw.length > 2048) throw new Error('PLESK_ALLOWED_PARENTS_INVALID');
  for (const entry of raw.split(',')) {
    const components = entry.split(':');
    if (components.length !== 2) throw new Error('PLESK_ALLOWED_PARENTS_INVALID');
    const [serverId, domain] = components;
    if ((serverId !== 's1' && serverId !== 's2')
      || typeof domain !== 'string'
      || !/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/.test(domain)
      || result[serverId].includes(domain)) {
      throw new Error('PLESK_ALLOWED_PARENTS_INVALID');
    }
    result[serverId].push(domain);
  }
  return result;
}

const port: PleskRemotePort = {
  readonly: async (server, command) => {
    const r = await runReadOnlyCommand(server, command);
    return { code: r.code, stdout: r.stdout, stderr: r.stderr };
  },
  guarded: async (server, command) => {
    const r = await runGuardedCommand(server, command, {
      intent: 'plesk_create_subdomain',
      timeoutMs: 120_000, maxOutputBytes: 16_384
    });
    return { code: r.code, stdout: r.stdout, stderr: r.stderr };
  }
};

function policy(): PleskPolicy {
  return {
    enabled: env.MCP_PLESK_PROVISIONING_ENABLED,
    allowedParents: parseAllowedPleskParents(env.MCP_PLESK_ALLOWED_PARENTS)
  };
}
function request(input: {
  serverId: PleskServerId;
  parentDomain: string;
  label: string;
  documentRoot: string;
}): PleskSubdomainInput {
  return { ...input, evidence: {
    parentExists: null, targetExists: null, documentRootExists: null,
    subscriptionAuthorized: null, documentRootSafe: null, targetOwnedByProvisioner: null
  } };
}

export function registerPleskPreviewTool(server: McpServer): void {
  server.tool('plesk_subdomain_preview_s1s2',
    'Prévisualise sans écriture la création Plesk d’un sous-domaine S1/S2 dans une subscription explicitement autorisée.',
    SubdomainRequest,
    async (args) => asText(JSON.stringify({
      serverId: args.serverId,
      fqdn: args.label + '.' + args.parentDomain,
      evidence: await observePleskSubdomain(request(args), policy(), port)
    }))
  );
}

export function registerPleskCreateTool(server: McpServer): void {
  server.tool('plesk_subdomain_create_s1s2',
    'Crée un sous-domaine Plesk autorisé avec préflight frais, consentement fqdn, et vérification post-création. Désactivé par défaut.',
    {
      ...SubdomainRequest,
      allowWrite: z.literal(true),
      confirmFqdn: z.string().min(4).max(320)
    },
    async (args) => {
      const input = request(args);
      const fqdn = input.label + '.' + input.parentDomain;
      const admitted = env.ENABLE_WRITE_TOOLS && env.MCP_PLESK_PROVISIONING_ENABLED
        && args.allowWrite === true && args.confirmFqdn === fqdn;
      const result = await createPleskSubdomainOnServer(input, policy(), admitted, port);
      return asText(JSON.stringify({ fqdn, serverId: input.serverId, ...result }));
    }
  );
}
