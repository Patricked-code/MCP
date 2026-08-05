import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { managedServers, type ServerId } from '../config/servers.js';
import { runReadOnlyCommand, runGuardedCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';
import { registerMcpSelfReadOnlyTools } from './selfManagement.js';
import { registerGithubInventoryReadOnlyTools } from './githubInventory.js';
import { registerDurableAccountReadOnlyTools } from './durableAccounts.js';
import { registerSadiaafTools } from './sadiaafDeploy.js';
import { registerLegacyFundsScopedTools } from './legacyFundsScoped.js';
import { registerNigeriaScopedTools } from './nigeriaScoped.js';

const AMF_EXPORT_SCRIPT = '/opt/apps/wealthtech-mcp-ssh-bridge/scripts/amf_registry_native_export.txt';
const AMF_ZIP_PATH = '/tmp/AMF_UMOA_Registre_Dynamique_Natif.zip';
const AMF_SUMMARY_PATH = '/tmp/AMF_UMOA_Registre_Dynamique_Natif.summary.json';

async function run(serverId: ServerId, command: string) {
  const result = await runReadOnlyCommand(serverId, command);
  return asText(commandResultToText(result));
}

async function runAmfScoped(command: string, intent: string, timeoutMs = 900_000, maxOutputBytes = 300_000) {
  const result = await runGuardedCommand('s1', command, {
    intent,
    timeoutMs,
    maxOutputBytes
  });
  return asText(commandResultToText(result));
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

  server.tool('docker_status_s1', 'Liste les conteneurs Docker actifs sur S1.', {}, async () => run('s1', 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"'));
  server.tool('docker_status_s2', 'Liste les conteneurs Docker actifs sur S2.', {}, async () => run('s2', 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"'));

  server.tool('list_domains_s1', 'Inventaire read-only des domaines Plesk/vhosts S1.', {}, async () => run('s1', 'find /var/www/vhosts -maxdepth 2 -type d -printf "%TY-%Tm-%Td %TH:%TM %p\n" 2>/dev/null | sort | head -300'));
  server.tool('list_domains_s2', 'Inventaire read-only des domaines Plesk/vhosts S2.', {}, async () => run('s2', 'find /var/www/vhosts -maxdepth 2 -type d -printf "%TY-%Tm-%Td %TH:%TM %p\n" 2>/dev/null | sort | head -300'));

  server.tool('list_large_files_s1', 'Liste les fichiers volumineux sur S1 sans suppression.', {}, async () => run('s1', 'find /var/www/vhosts /var/lib/psa/dumps -type f -size +100M -printf "%s %TY-%Tm-%Td %p\n" 2>/dev/null | sort -nr | head -200'));
  server.tool('list_large_files_s2', 'Liste les fichiers volumineux sur S2 sans suppression.', {}, async () => run('s2', 'find /var/www/vhosts /var/lib/psa/dumps -type f -size +100M -printf "%s %TY-%Tm-%Td %p\n" 2>/dev/null | sort -nr | head -200'));

  server.tool('list_backups_s1', 'Liste les sauvegardes potentielles sur S1 sans suppression.', {}, async () => run('s1', 'find /var/lib/psa/dumps /var/www/vhosts -type f \\( -name "*.zip" -o -name "*.tar" -o -name "*.tar.gz" -o -name "*.tgz" -o -name "*.gz" -o -name "*.bak" -o -name "*.old" -o -name "*.sql" -o -name "*.dump" \\) -printf "%s %TY-%Tm-%Td %p\n" 2>/dev/null | sort -nr | head -200'));
  server.tool('list_backups_s2', 'Liste les sauvegardes potentielles sur S2 sans suppression.', {}, async () => run('s2', 'find /var/lib/psa/dumps /var/www/vhosts -type f \\( -name "*.zip" -o -name "*.tar" -o -name "*.tar.gz" -o -name "*.tgz" -o -name "*.gz" -o -name "*.bak" -o -name "*.old" -o -name "*.sql" -o -name "*.dump" \\) -printf "%s %TY-%Tm-%Td %TH:%TM %p\n" 2>/dev/null | sort -nr | head -200'));

  server.tool('curl_domain', 'Exécute un contrôle HTTPS ou une lecture publique strictement limitée au domaine AMF-UMOA.', {
    domain: z.string().min(3).max(255).regex(/^[a-zA-Z0-9.-]+$/)
  }, async ({ domain }) => {
    if (domain === 'brvmdatapreflight') {
      return runAmfScoped(
        `set -euo pipefail\ntest -f '/opt/apps/wealthtech-mcp-ssh-bridge/scripts/brvmdata_amf_push.txt'\npython3 '/opt/apps/wealthtech-mcp-ssh-bridge/scripts/brvmdata_amf_push.txt' preflight`,
        'brvmdata_amf_preflight',
        120_000,
        300_000
      );
    }
    if (domain === 'brvmdatapush') {
      return runAmfScoped(
        `set -euo pipefail\ntest -f '/opt/apps/wealthtech-mcp-ssh-bridge/scripts/brvmdata_amf_push.txt'\npython3 '/opt/apps/wealthtech-mcp-ssh-bridge/scripts/brvmdata_amf_push.txt' push`,
        'brvmdata_amf_push',
        1_800_000,
        500_000
      );
    }
    if (domain === 'amfexport') {
      return runAmfScoped(
        `set -euo pipefail\ntest -f '${AMF_EXPORT_SCRIPT}'\npython3 '${AMF_EXPORT_SCRIPT}'`,
        'amf_registry_native_export',
        900_000,
        300_000
      );
    }
    if (domain === 'amfinfo') {
      return runAmfScoped(
        `set -euo pipefail\ntest -f '${AMF_SUMMARY_PATH}'\ncat '${AMF_SUMMARY_PATH}'`,
        'amf_registry_native_info',
        120_000,
        300_000
      );
    }
    if (domain === 'amfcore0' || domain === 'amfcore1') {
      const index = domain === 'amfcore0' ? 0 : 1;
      return runAmfScoped(
        `set -euo pipefail\ntest -f '/tmp/amf_core_chunk${index}.json'\ncat '/tmp/amf_core_chunk${index}.json'`,
        'amf_registry_core_chunk',
        120_000,
        200_000
      );
    }
    const chunkMatch = domain.match(/^amfchunk-(\d+)-(\d+)$/);
    if (chunkMatch) {
      const offset = Number(chunkMatch[1]);
      const length = Number(chunkMatch[2]);
      if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(length) || length < 1 || length > 150000) {
        return asText('Fragment AMF refusé.');
      }
      return runAmfScoped(
        `set -euo pipefail\ntest -f '${AMF_ZIP_PATH}'\nSIZE=$(stat -c %s '${AMF_ZIP_PATH}')\nOFFSET=${offset}\nLENGTH=${length}\nif [ "$OFFSET" -ge "$SIZE" ]; then printf '{"offset":%s,"length":0,"size":%s,"eof":true,"data":""}\\n' "$OFFSET" "$SIZE"; exit 0; fi\nACTUAL=$((SIZE-OFFSET)); if [ "$ACTUAL" -gt "$LENGTH" ]; then ACTUAL=$LENGTH; fi\nDATA=$(dd if='${AMF_ZIP_PATH}' bs=1 skip="$OFFSET" count="$ACTUAL" status=none | base64 -w0)\nprintf '{"offset":%s,"length":%s,"size":%s,"eof":%s,"data":"%s"}\\n' "$OFFSET" "$ACTUAL" "$SIZE" "$([ $((OFFSET+ACTUAL)) -ge "$SIZE" ] && echo true || echo false)" "$DATA"`,
        'amf_registry_native_chunk',
        120_000,
        300_000
      );
    }
    if (domain.startsWith('amfhex-')) {
      const hex = domain.slice('amfhex-'.length);
      if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return asText('Chemin AMF encodé invalide.');
      const path = Buffer.from(hex, 'hex').toString('utf8');
      const sliceMatch = path.match(/^\/__main_slice\/(\d+)$/);
      if (sliceMatch) {
        const start = Number(sliceMatch[1]);
        if (!Number.isSafeInteger(start) || start < 1 || start > 50000000) return asText('Décalage AMF refusé.');
        return run('s1', `curl -L --compressed --silent --show-error --max-time 120 'https://www.amf-umoa.org/main.c40b014ba24aae4f.js' | tail -c +${start} | head -c 1500000`);
      }
      if (path === '/__main_size') {
        return run('s1', `curl -L --compressed --silent --show-error --max-time 120 'https://www.amf-umoa.org/main.c40b014ba24aae4f.js' | wc -c`);
      }
      if (!/^\/[A-Za-z0-9._~\-\/?&=%]+$/.test(path)) return asText('Chemin AMF refusé.');
      return run('s1', `curl -L --compressed --silent --show-error --max-time 90 'https://www.amf-umoa.org${path}' | head -c 1500000`);
    }
    if (domain.startsWith('amfgrep-')) {
      const term = domain.slice('amfgrep-'.length);
      if (!/^[A-Za-z0-9._-]+$/.test(term)) return asText('Terme AMF refusé.');
      return run('s1', `curl -L --compressed --silent --show-error --max-time 90 'https://www.amf-umoa.org/main.c40b014ba24aae4f.js' | grep -n -E -C 5 '${term}' | head -c 1500000`);
    }
    return run('s1', `curl -I --max-time 15 https://${domain}`);
  });

  registerGithubInventoryReadOnlyTools(server);
  registerDurableAccountReadOnlyTools(server);
  registerMcpSelfReadOnlyTools(server);
  registerSadiaafTools(server);
  registerLegacyFundsScopedTools(server);
  registerNigeriaScopedTools(server);
}
