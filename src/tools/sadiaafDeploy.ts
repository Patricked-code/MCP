import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from '../config/env.js';
import { runGuardedCommand, runReadOnlyCommand } from '../ssh/client.js';
import { assertScopedWriteToolsEnabled, assertWriteFlag } from '../ssh/writeSafety.js';
import { asText, commandResultToText } from './format.js';

const MCP_ROOT = '/opt/apps/wealthtech-mcp-ssh-bridge';
const BUNDLE_B64 = `${MCP_ROOT}/data/sadiaaf-market-data-pipeline-s1-v0.2.tar.gz.b64.txt`;
const BUNDLE_SHA256 = '76488fff273aee0e7784a8160f7a6ae51dc945f9c947edea0fa330eecafa84f3';
const FRONT_DOMAIN = 'sadiaaf.wealthtechinnovations.com';
const API_DOMAIN = 'api.sadiaaf.wealthtechinnovations.com';
const APP_ROOT = '/opt/apps/sadiaaf-market-data';
const BACKUP_ROOT = '/var/backups/sadiaaf';

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

async function runRead(command: string) {
  const result = await runReadOnlyCommand('s1', command);
  return asText(commandResultToText(result));
}

async function runWrite(command: string, intent: string, timeoutMs = 30_000) {
  const result = await runGuardedCommand('s1', command, {
    intent,
    timeoutMs,
    maxOutputBytes: 300_000,
  });
  return asText(commandResultToText(result));
}

function statusCommand(): string {
  return `set -euo pipefail
printf '=== Domaines SadiaAF ===\\n'
for domain in ${shellQuote(FRONT_DOMAIN)} ${shellQuote(API_DOMAIN)}; do
  printf '\\n-- %s --\\n' "$domain"
  test -d "/var/www/vhosts/wealthtechinnovations.com/$domain" && du -sh "/var/www/vhosts/wealthtechinnovations.com/$domain" || true
  curl -I --max-time 15 "https://$domain" | sed -n '1,12p' || true
done
printf '\\n=== Stack Docker ===\\n'
docker ps --filter 'name=sadiaaf' --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}' || true
printf '\\n=== Etat de déploiement ===\\n'
if test -f ${shellQuote(`${APP_ROOT}/DEPLOYMENT_STATE.json`)}; then
  cat ${shellQuote(`${APP_ROOT}/DEPLOYMENT_STATE.json`)}
else
  echo 'Aucun DEPLOYMENT_STATE.json'
fi
printf '\\n=== Sauvegardes récentes ===\\n'
find ${shellQuote(BACKUP_ROOT)} -mindepth 1 -maxdepth 1 -type d -printf '%TY-%Tm-%Td %TH:%TM %p\\n' 2>/dev/null | sort -r | head -20 || true`;
}

export function registerSadiaafTools(server: McpServer): void {
  server.tool(
    'inspect_sadiaaf_s1',
    'Inspecte en lecture seule les deux domaines SadiaAF, le stack Docker et les sauvegardes sur S1.',
    {},
    async () => runRead(statusCommand()),
  );

  server.tool(
    'deploy_sadiaaf_s1',
    'Sauvegarde les deux anciennes applications SadiaAF puis déploie le pipeline AfricaFunds sur S1 avec API, dashboard, PostgreSQL, cron et rollback.',
    { allow_write: z.boolean().default(false) },
    async ({ allow_write }) => {
      assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
      assertWriteFlag(allow_write, 'deploy_sadiaaf_s1');

      const command = `set -euo pipefail
BUNDLE_B64=${shellQuote(BUNDLE_B64)}
EXPECTED_SHA=${shellQuote(BUNDLE_SHA256)}
test -f "$BUNDLE_B64"
WORKDIR="$(mktemp -d /tmp/sadiaaf-deploy.XXXXXX)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT
base64 -d "$BUNDLE_B64" > "$WORKDIR/bundle.tar.gz"
ACTUAL_SHA="$(sha256sum "$WORKDIR/bundle.tar.gz" | awk '{print $1}')"
test "$ACTUAL_SHA" = "$EXPECTED_SHA"
tar -xzf "$WORKDIR/bundle.tar.gz" -C "$WORKDIR"
PROJECT="$WORKDIR/africafunds-market-data-pipeline"
test -x "$PROJECT/deploy/s1/deploy.sh"
cd "$PROJECT"
./deploy/s1/deploy.sh
printf '\\n=== Vérification finale ===\\n'
curl -fsS --max-time 20 https://${API_DOMAIN}/health
printf '\\n'
curl -fsS --max-time 20 https://${FRONT_DOMAIN}/health
printf '\\n'`;

      return runWrite(command, 'deploy_sadiaaf_s1', 1_800_000);
    },
  );

  server.tool(
    'rollback_sadiaaf_s1',
    'Restaure une sauvegarde SadiaAF créée par le déploiement contrôlé.',
    {
      backup_dir: z.string().regex(/^\/var\/backups\/sadiaaf\/\d{8}_\d{6}$/),
      allow_write: z.boolean().default(false),
    },
    async ({ backup_dir, allow_write }) => {
      assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
      assertWriteFlag(allow_write, 'rollback_sadiaaf_s1');

      const command = `set -euo pipefail
BACKUP=${shellQuote(backup_dir)}
test -d "$BACKUP"
ROLLBACK=${shellQuote(`${APP_ROOT}/current/deploy/s1/rollback.sh`)}
test -x "$ROLLBACK"
"$ROLLBACK" "$BACKUP"`;
      return runWrite(command, 'rollback_sadiaaf_s1', 600_000);
    },
  );

  server.tool(
    'sadiaaf_status_s1',
    'Vérifie les domaines, les conteneurs, l’état de déploiement et les sauvegardes SadiaAF sur S1.',
    {},
    async () => runRead(statusCommand()),
  );
}
