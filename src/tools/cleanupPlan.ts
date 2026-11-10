import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { managedServers, type ServerId } from '../config/servers.js';
import { runReadOnlyCommand } from '../ssh/client.js';
import { asText } from './format.js';

// Historical review lists, NOT permissions to delete. Source:
// Migration/02_PLAN_MIGRATION_ET_SECURITE.md
const S2_DOMAIN_REVIEW = [
  'api.pccet.wealthtechinnovations.ci',
  'api.wealthtechinnovations.ci',
  'evote.wealthtechinnovations.ci',
  'pccet.wealthtechinnovations.ci',
  'wealthtechinnovations.ci',
  'opcvm.chainsolutions.fr'
] as const;

const S2_BACKUP_REVIEW = [
  'fantokenafrica.club',
  'api.fantokenafrica.club',
  'lysfc.fantokenafrica.club',
  'iso20022.chainsolutions.fr',
  'mutualfunds.chainsolutions.fr',
  'opcvm.chainsolutions.fr',
  'robot.funds.chainsolutions.fr',
  'api-mutualfunds.chainsolutions.fr'
] as const;

const DOMAIN_NAME = /^[a-z0-9-]+(?:\\.[a-z0-9-]+)+$/;
const REQUIRED_GATES = [
  'LIVE_EXACT_PATH_AND_PLESK_MAPPING',
  'DEPENDENCY_AND_RUNNING_SERVICE_AUDIT',
  'PROTECTED_DOMAIN_AND_SHARED_SUBSCRIPTION_CHECK',
  'BACKUP_MANIFEST_AND_RESTORE_TEST',
  'ROLLBACK_PROOF_AND_QUARANTINE_PLAN',
  'GOVERNED_SESSION_TASK_CLAIM_AND_LOCKS',
  'OWNER_APPROVAL_AND_EXACT_TARGET_CONSENT',
  'POST_ACTION_HEALTHCHECK_AND_CHECKPOINT'
] as const;

/**
 * Classifies observations for human review only. A matching basename does NOT
 * prove a vhost mapping, an unused directory, or eligibility for removal.
 */
export function buildServerCleanupPlan(
  serverId: ServerId,
  observedDirectoryBasenames: readonly string[],
  diskUsage: string
) {
  const protectedDomains = [...new Set(
    managedServers[serverId].protectedDomains.map(value => value.toLowerCase())
  )].sort();
  const protectedSet = new Set(protectedDomains);
  const directoryNames = new Set(
    observedDirectoryBasenames
      .map(value => value.trim().toLowerCase())
      .filter(value => DOMAIN_NAME.test(value))
  );

  return {
    schemaVersion: 1,
    repository: 'Patricked-code/MCP',
    server: serverId,
    status: 'READ_ONLY_REVIEW',
    writesPerformed: false,
    deletionAllowed: false,
    quarantineAllowed: false,
    observationType: 'DIRECTORY_BASENAME_ONLY_NOT_VHOST_PROOF',
    diskUsage,
    protectedDomains,
    domainCandidates: serverId === 's2'
      ? S2_DOMAIN_REVIEW.map(domain => ({
          domain,
          seenAsDirectoryBasename: directoryNames.has(domain),
          disposition: protectedSet.has(domain)
            ? 'BLOCKED_PROTECTED'
            : 'REVIEW_ONLY_NOT_AUTHORIZED'
        }))
      : [...directoryNames]
          .filter(domain => !protectedSet.has(domain))
          .sort()
          .map(domain => ({
            domain,
            seenAsDirectoryBasename: true,
            disposition: 'DISCOVER_ONLY_NOT_AUTHORIZED'
          })),
    backupReferencesToReview: serverId === 's2'
      ? S2_BACKUP_REVIEW.map(domain => ({
          domain,
          backupPresenceVerified: false,
          disposition: 'SEARCH_AND_CLASSIFY_ONLY'
        }))
      : [],
    stablecoinS2OriginalsMustRemain: serverId === 's2',
    requiredBeforeAnyDestructiveOperation: REQUIRED_GATES,
    nextAction: 'Verify each exact real path, runtime ownership, backup and rollback in a separate governed authorization. Do not delete, empty, migrate or restart.'
  };
}

async function cleanupPlan(serverId: ServerId) {
  // No user-supplied path, free shell, file content read, deletion or mutation.
  const fixedInventoryCommand =
    "find /var/www/vhosts -mindepth 1 -maxdepth 2 -type d -printf '%f\\n'";
  try {
    const inventory = await runReadOnlyCommand(serverId, fixedInventoryCommand, 30_000, 100_000);
    if (inventory.code !== 0 || inventory.stdout.includes('...[sortie plafonnée par le MCP]')) {
      return asText(JSON.stringify({
        server: serverId,
        status: 'UNVERIFIED',
        deletionAllowed: false,
        reasonCode: 'INVENTORY_FAILED_OR_TRUNCATED'
      }));
    }
    const disk = await runReadOnlyCommand(serverId, 'df -P -h /var/www/vhosts', 15_000, 10_000);
    if (disk.code !== 0) {
      return asText(JSON.stringify({
        server: serverId,
        status: 'UNVERIFIED',
        deletionAllowed: false,
        reasonCode: 'DISK_OBSERVATION_FAILED'
      }));
    }
    return asText(JSON.stringify(buildServerCleanupPlan(
      serverId,
      inventory.stdout.split(/\\r?\\n/),
      disk.stdout.trim()
    ), null, 2));
  } catch {
    return asText(JSON.stringify({
      server: serverId,
      status: 'UNVERIFIED',
      deletionAllowed: false,
      reasonCode: 'SSH_OBSERVATION_UNAVAILABLE'
    }));
  }
}

export function registerCleanupPlanReadOnlyTools(server: McpServer): void {
  server.tool(
    'cleanup_plan_s1',
    'Prépare un plan de nettoyage S1 en lecture seule, avec protections, inventaire et prérequis; aucune suppression.',
    {},
    async () => cleanupPlan('s1')
  );
  server.tool(
    'cleanup_plan_s2',
    'Prépare un plan de nettoyage S2 en lecture seule, avec cibles historiques et protections; aucune suppression.',
    {},
    async () => cleanupPlan('s2')
  );
}
