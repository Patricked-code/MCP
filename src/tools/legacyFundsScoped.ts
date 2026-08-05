import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from '../config/env.js';
import { runGuardedCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';
import { assertScopedWriteToolsEnabled, assertWriteFlag } from '../ssh/writeSafety.js';

type Key = 'front' | 'api';
const cfg = {
  front: {
    label: 'Frontend Funds',
    path: '/var/www/vhosts/chainsolutions.fr/Funds.chainsolutions.fr',
    domain: 'funds.chainsolutions.fr',
    urls: ['https://funds.chainsolutions.fr/', 'https://funds.chainsolutions.fr/accueil'],
    logs: '/var/www/vhosts/system/funds.chainsolutions.fr/logs'
  },
  api: {
    label: 'API Funds',
    path: '/var/www/vhosts/chainsolutions.fr/api.funds.chainsolutions.fr',
    domain: 'api.funds.chainsolutions.fr',
    urls: ['https://api.funds.chainsolutions.fr/', 'https://api.funds.chainsolutions.fr/health'],
    logs: '/var/www/vhosts/system/api.funds.chainsolutions.fr/logs'
  }
} as const;

const q = (v: string) => `'${v.replace(/'/g, `'\"'\"'`)}'`;
async function run(command: string, intent: string, timeoutMs = 60_000) {
  const result = await runGuardedCommand('s2', command, { intent, timeoutMs, maxOutputBytes: 250_000 });
  return asText(commandResultToText(result));
}
function checks(key: Key) {
  return cfg[key].urls.map((u) =>
    `printf '%s -> ' ${q(u)}; curl -sS -L --max-redirs 3 --max-time 25 -o /dev/null -w 'HTTP %{http_code} | %{time_total}s | %{url_effective}\\n' ${q(u)} || true`
  ).join('\n');
}
function status(key: Key) {
  const c = cfg[key];
  return `set -euo pipefail
APP=${q(c.path)}
cd "$APP"
echo 'Projet: ${c.label}'
echo 'Domaine: ${c.domain}'
echo "Date: $(date -Is)"
echo
printf 'package.json: '; test -f package.json && echo présent || echo absent
printf 'node_modules: '; test -d node_modules && echo présent || echo absent
printf 'restart.txt: '; test -f tmp/restart.txt && stat -c '%y' tmp/restart.txt || echo absent
node --version 2>/dev/null || true
npm --version 2>/dev/null || true
if [ -f package.json ]; then node -e "const p=require('./package.json');console.log(JSON.stringify({name:p.name||null,version:p.version||null,main:p.main||null,scripts:Object.keys(p.scripts||{}).sort()},null,2))"; fi
if [ -d .git ]; then git status -sb; git log -1 --oneline; fi
echo
${checks(key)}`;
}
function quality(key: Key, install: boolean) {
  const c = cfg[key];
  const dep = install
    ? `if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi`
    : `echo 'Dépendances existantes conservées.'`;
  return `set -euo pipefail
cd ${q(c.path)}
test -f package.json
${dep}
npm run typecheck --if-present
npm run lint --if-present
npm test --if-present
npm run build --if-present
if [ -d .git ]; then git status -sb; fi`;
}
function restart(key: Key) {
  const c = cfg[key];
  return `set -euo pipefail
cd ${q(c.path)}
test -f package.json
mkdir -p tmp
touch tmp/restart.txt
echo 'Relance Passenger demandée pour ${c.label}.'
stat -c '%y | %s octets' tmp/restart.txt
sleep 3
${checks(key)}`;
}
function logs(key: Key, lines: number, contains?: string) {
  const c = cfg[key];
  const filter = contains ? ` | { grep -i -F -- ${q(contains)} || true; }` : '';
  return `set -euo pipefail
DIR=${q(c.logs)}
test -d "$DIR"
FOUND=0
for FILE in "$DIR/error_log" "$DIR/proxy_error_log"; do
  if [ -f "$FILE" ]; then
    FOUND=1
    echo "===== $FILE ====="
    tail -n ${lines} "$FILE" 2>&1${filter} | sed -E -e 's#(mongodb|mysql|postgres|postgresql)://[^[:space:]]+#\\1://***MASKED***#Ig' -e 's#([?&](token|key|secret|password|auth)=)[^&[:space:]]+#\\1***MASKED***#Ig' -e 's#(PASSWORD|PASS|SECRET|TOKEN|API_KEY|APIKEY)[=:][^[:space:]]+#\\1=***MASKED***#Ig'
  fi
done
if [ "$FOUND" = 0 ]; then echo 'Aucun journal d erreur trouvé.'; fi`;
}

export function registerLegacyFundsScopedTools(server: McpServer): void {
  const enabled = () => assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
  const mut = { allow_write: z.boolean().default(false), install_dependencies: z.boolean().default(false) };
  const restartArgs = { allow_write: z.boolean().default(false) };
  const logArgs = {
    lines: z.number().int().min(20).max(500).default(150),
    contains: z.string().min(2).max(80).regex(/^[A-Za-z0-9_.:/\[\] ()-]+$/).optional()
  };

  server.tool('legacy_funds_frontend_status_s2', 'Contrôle le frontend Funds sur S2 et ses URL publiques.', {}, async () => { return run(status('front'), 'legacy_funds_frontend_status_s2'); });
  server.tool('legacy_funds_api_status_s2', 'Contrôle l API Funds sur S2 et ses URL publiques.', {}, async () => { return run(status('api'), 'legacy_funds_api_status_s2'); });

  server.tool('legacy_funds_frontend_build_s2', 'Teste et compile le frontend Funds sur S2.', mut, async ({ allow_write, install_dependencies }) => {
    enabled(); assertWriteFlag(allow_write, 'legacy_funds_frontend_build_s2');
    return run(quality('front', install_dependencies), 'legacy_funds_frontend_build_s2', 900_000);
  });
  server.tool('legacy_funds_api_test_s2', 'Teste et compile l API Funds sur S2.', mut, async ({ allow_write, install_dependencies }) => {
    enabled(); assertWriteFlag(allow_write, 'legacy_funds_api_test_s2');
    return run(quality('api', install_dependencies), 'legacy_funds_api_test_s2', 900_000);
  });

  server.tool('restart_legacy_funds_frontend_s2', 'Relance le frontend Funds via Passenger.', restartArgs, async ({ allow_write }) => {
    enabled(); assertWriteFlag(allow_write, 'restart_legacy_funds_frontend_s2');
    return run(restart('front'), 'restart_legacy_funds_frontend_s2', 120_000);
  });
  server.tool('restart_legacy_funds_api_s2', 'Relance l API Funds via Passenger.', restartArgs, async ({ allow_write }) => {
    enabled(); assertWriteFlag(allow_write, 'restart_legacy_funds_api_s2');
    return run(restart('api'), 'restart_legacy_funds_api_s2', 120_000);
  });

  server.tool('logs_legacy_funds_frontend_s2', 'Lit les logs Plesk Passenger du frontend Funds avec masquage des secrets.', logArgs, async ({ lines, contains }) => {
    return run(logs('front', lines, contains), 'logs_legacy_funds_frontend_s2');
  });
  server.tool('logs_legacy_funds_api_s2', 'Lit les logs Plesk Passenger de l API Funds avec masquage des secrets.', logArgs, async ({ lines, contains }) => {
    return run(logs('api', lines, contains), 'logs_legacy_funds_api_s2');
  });
}
