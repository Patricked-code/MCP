import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { managedServers, type ServerId } from '../config/servers.js';
import { runReadOnlyCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';
import { registerMcpSelfReadOnlyTools } from './selfManagement.js';
import { registerGithubInventoryReadOnlyTools } from './githubInventory.js';
import { registerGithubAuthorizationReadOnlyTools } from './githubAuthorization.js';
import { registerDurableAccountReadOnlyTools } from './durableAccounts.js';
import { registerSadiaafTools } from './sadiaafDeploy.js';
import { registerLegacyFundsScopedTools } from './legacyFundsScoped.js';
import { registerNigeriaScopedTools } from './nigeriaScoped.js';
import { registerGitRegistryV2ReadOnlyTools } from './githubRegistryV2.js';
import { registerScopedReadOnlyTools } from './writeScoped.js';
import { registerRuntimeAttestationReadOnlyTools } from './runtimeAttestation.js';
import { registerGovernedSessionTools } from './governedSessions.js';
import { registerGovernedContextTools } from './governedContext.js';
import { registerE2PreflightReadOnlyTool } from './e2Entry.js';
import { registerE2ContinuityReadTools } from './e2OwnerTools.js';
import { registerCurrentStateTools } from './currentState.js';
import { registerGithubControlPlaneReadTools } from './githubControlPlaneRead.js';
import { registerGithubLifecycleReadTools } from './githubLifecycle.js';
import { getCurrentToolCatalog } from '../currentState/toolCatalog.js';
import { extendProjectContextWithUniversalCapabilities } from '../provisioning/universalCapabilityDiscovery.js';
import { probeExistingAdminReadCapabilities } from '../provisioning/universalAdminLiveProbe.js';
import { EXTERNAL_GOVERNED_RECOVERY_FULL_NAME } from '../governedContext/githubFirstOperationalContinuity.js';

async function run(serverId: ServerId, command: string) {
  const result = await runReadOnlyCommand(serverId, command);
  return asText(commandResultToText(result));
}

export function registerReadOnlyTools(server: McpServer): void {
  server.tool('ping', 'Vérifie que le MCP WealthTech SSH Bridge répond.', {}, async () => asText('wealthtech_ssh_bridge_ok'));

  server.tool('get_project_context', 'Retourne le contexte projet, les serveurs et les domaines protégés.', {}, async () => {
    const registered = getCurrentToolCatalog().tools;
    // Actual bounded GitHub API and SSH reads; no privileged commands, no tokens in responses.
    // Failed providers are reported as BLOCKED without changing legacy project fields.
    const liveEvidence = await probeExistingAdminReadCapabilities();
    const project = extendProjectContextWithUniversalCapabilities({
      name: 'wealthtech_ssh_bridge',
      mode: 'read-only-first',
      servers: managedServers
    }, registered.map(tool => tool.name), registered, liveEvidence);
    return asText(JSON.stringify({
      ...project,
      selectableMaintenanceMethod: {
        id: 'EXTERNAL_GOVERNED_RECOVERY',
        fullName: EXTERNAL_GOVERNED_RECOVERY_FULL_NAME,
        scope: 'MCP_GLOBAL_ALL_WORKSTREAMS',
        selectedByDefault: false,
        agentSelectableViaGithub: true,
        runtimeAutomaticExecution: false,
        automaticReconciliationOnExplicitActivation: true,
        activationTool: 'mcp_e2_activate',
        noDivergenceNextStep: 'DISCOVER_EXISTING_WORK',
        divergenceNextStep: 'MCP_RECONCILE_S1_TO_MAIN',
        neverContinueWithUnresolvedDivergence: true,
        requiresInternalTaskClaimForGithubOnlyOperations: false,
        entryModel: 'ONE_COMMON_ENGINEERING_LIFECYCLE_TWO_WORK_INTAKES',
        thisEntry: 'EXTERNAL_GOVERNED_RECOVERY',
        otherEntry: 'INITIAL_GOVERNED_ENTRY',
        intakeRole: 'EXTERNAL_GITHUB_FIRST_WORK_INTAKE',
        workSelectionSources: ['OWNER_DIRECTLY_REQUESTED_WORK', 'AGENT_IDENTIFIED_WORK_WITHIN_EXISTING_OWNER_MANDATE'],
        sameEngineeringValidationAndDeployPipeline: true,
        internalMcpAvailabilityNotRequiredForGithubWork: true,
        noTaskQueueAssignmentCreatedBySelection: true,
        requiresCurrentGithubPermissionAndCollisionEvidence: true,
        requiresGovernedDeployAdmission: true,
        runbook: 'docs/runbooks/GITHUB_FIRST_GOVERNED_RECOVERY.md',
        advisoryOnly: true
      }
    }, null, 2));
  });

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

  registerGithubInventoryReadOnlyTools(server);
  registerGithubControlPlaneReadTools(server);
  registerGithubLifecycleReadTools(server);
  registerGithubAuthorizationReadOnlyTools(server);
  registerDurableAccountReadOnlyTools(server);
  registerGitRegistryV2ReadOnlyTools(server);
  registerRuntimeAttestationReadOnlyTools(server);
  registerGovernedSessionTools(server);
  registerGovernedContextTools(server);
  registerE2PreflightReadOnlyTool(server);
  registerE2ContinuityReadTools(server);
  registerCurrentStateTools(server);
  registerMcpSelfReadOnlyTools(server);
  registerSadiaafTools(server);
  registerLegacyFundsScopedTools(server);
  registerNigeriaScopedTools(server);
  registerScopedReadOnlyTools(server);
}
