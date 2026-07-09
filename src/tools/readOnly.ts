import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { managedServers, type ServerId } from '../config/servers.js';
import { runReadOnlyCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';
import { registerMcpSelfReadOnlyTools } from './selfManagement.js';
import { registerGithubInventoryReadOnlyTools } from './githubInventory.js';
import {
  githubAuditPermissionsTool,
  githubListActionsTool,
  githubListOrgsTool,
  githubListPrsTool,
  githubListReposTool,
  githubRepoStatusTool,
  githubStatusTool,
  publicSafeError
} from '../github/mcpTools.js';

async function run(serverId: ServerId, command: string) {
  const result = await runReadOnlyCommand(serverId, command);
  return asText(commandResultToText(result));
}

function asJson(value: unknown) {
  return asText(JSON.stringify(value, null, 2));
}

async function safeGithubTool(action: () => Promise<unknown>) {
  try {
    return asJson(await action());
  } catch (error) {
    return asJson(publicSafeError(error));
  }
}

export function registerReadOnlyTools(server: McpServer): void {
  server.tool('ping', 'Vérifie que le MCP WealthTech SSH Bridge répond.', {}, async () => asText('wealthtech_ssh_bridge_ok'));

  server.tool('get_project_context', 'Retourne le contexte projet, les serveurs et les domaines protégés.', {}, async () => asText(JSON.stringify({
    name: 'wealthtech_ssh_bridge',
    mode: 'read-only-first',
    servers: managedServers
  }, null, 2)));

  server.tool('check_disk_s1', 'Affiche df -h sur S1.', {}, async () => run('s1', 'df -h'));
  server.tool('check_disk_s2', 'Affiche df -h sur S2.', {}, async () => run('s2', 'df -h'));

  server.tool('pm2_status_s1', 'Affiche pm2 list sur S1.', {}, async () => run('s1', 'pm2 list'));
  server.tool('pm2_status_s2', 'Affiche pm2 list sur S2.', {}, async () => run('s2', 'pm2 list'));

  server.tool('docker_status_s1', 'Liste les conteneurs Docker actifs sur S1.', {}, async () => run('s1', 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'));
  server.tool('docker_status_s2', 'Liste les conteneurs Docker actifs sur S2.', {}, async () => run('s2', 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'));

  server.tool('list_domains_s1', 'Inventaire read-only des domaines Plesk/vhosts S1.', {}, async () => run('s1', 'find /var/www/vhosts -maxdepth 2 -type d -printf "%TY-%Tm-%Td %TH:%TM %p\\n" 2>/dev/null | sort | head -300'));
  server.tool('list_domains_s2', 'Inventaire read-only des domaines Plesk/vhosts S2.', {}, async () => run('s2', 'find /var/www/vhosts -maxdepth 2 -type d -printf "%TY-%Tm-%Td %TH:%TM %p\\n" 2>/dev/null | sort | head -300'));

  server.tool('list_large_files_s1', 'Liste les fichiers volumineux sur S1 sans suppression.', {}, async () => run('s1', 'find /var/www/vhosts /var/lib/psa/dumps -type f -size +100M -printf "%s %TY-%Tm-%Td %p\\n" 2>/dev/null | sort -nr | head -200'));
  server.tool('list_large_files_s2', 'Liste les fichiers volumineux sur S2 sans suppression.', {}, async () => run('s2', 'find /var/www/vhosts /var/lib/psa/dumps -type f -size +100M -printf "%s %TY-%Tm-%Td %p\\n" 2>/dev/null | sort -nr | head -200'));

  server.tool('list_backups_s1', 'Liste les sauvegardes potentielles sur S1 sans suppression.', {}, async () => run('s1', 'find /var/lib/psa/dumps /var/www/vhosts -type f \\( -name "*.zip" -o -name "*.tar" -o -name "*.tar.gz" -o -name "*.tgz" -o -name "*.gz" -o -name "*.bak" -o -name "*.old" -o -name "*.sql" -o -name "*.dump" \\) -printf "%s %TY-%Tm-%Td %p\\n" 2>/dev/null | sort -nr | head -200'));
  server.tool('list_backups_s2', 'Liste les sauvegardes potentielles sur S2 sans suppression.', {}, async () => run('s2', 'find /var/lib/psa/dumps /var/www/vhosts -type f \\( -name "*.zip" -o -name "*.tar" -o -name "*.tar.gz" -o -name "*.tgz" -o -name "*.gz" -o -name "*.bak" -o -name "*.old" -o -name "*.sql" -o -name "*.dump" \\) -printf "%s %TY-%Tm-%Td %p\\n" 2>/dev/null | sort -nr | head -200'));

  server.tool('curl_domain', 'Exécute un curl -I HTTPS sur un domaine fourni depuis S1.', { domain: z.string().min(3).max(255).regex(/^[a-zA-Z0-9.-]+$/) }, async ({ domain }) => run('s1', `curl -I --max-time 15 https://${domain}`));

  server.tool('github_status', 'Retourne le statut GitHub public-safe du MCP sans exposer de token.', {}, async () => safeGithubTool(() => githubStatusTool()));
  server.tool('github_list_orgs', 'Liste les organisations GitHub visibles par le token MCP, sans exposer de secret.', {}, async () => safeGithubTool(() => githubListOrgsTool()));
  server.tool('github_list_repos', 'Liste les repositories visibles pour une organisation GitHub.', {
    owner: z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/).optional()
  }, async ({ owner }) => safeGithubTool(() => githubListReposTool(owner)));
  server.tool('github_repo_status', 'Retourne le statut public-safe d’un repository et ses fichiers de gouvernance MCP manquants.', {
    owner: z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/),
    repo: z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/)
  }, async ({ owner, repo }) => safeGithubTool(() => githubRepoStatusTool(owner, repo)));
  server.tool('github_list_prs', 'Liste les pull requests public-safe d’un repository.', {
    owner: z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/),
    repo: z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/),
    state: z.enum(['open', 'closed', 'all']).default('open'),
    limit: z.number().int().min(1).max(100).default(20)
  }, async ({ owner, repo, state, limit }) => safeGithubTool(() => githubListPrsTool(owner, repo, state, limit)));
  server.tool('github_list_actions', 'Liste les derniers runs GitHub Actions public-safe d’un repository.', {
    owner: z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/),
    repo: z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/),
    limit: z.number().int().min(1).max(100).default(20)
  }, async ({ owner, repo, limit }) => safeGithubTool(() => githubListActionsTool(owner, repo, limit)));
  server.tool('github_audit_permissions', 'Audite les permissions GitHub public-safe d’un repository et rappelle la politique branch/PR-only.', {
    owner: z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/),
    repo: z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/)
  }, async ({ owner, repo }) => safeGithubTool(() => githubAuditPermissionsTool(owner, repo)));

  registerGithubInventoryReadOnlyTools(server);
  registerMcpSelfReadOnlyTools(server);
}
