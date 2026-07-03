import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from '../config/env.js';
import { runGuardedCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';
import {
  assertScopedWriteToolsEnabled,
  assertSelectOnlyQuery,
  assertSafeScriptArgs,
  assertWriteFlag,
  scriptArgsRequireWriteApproval
} from '../ssh/writeSafety.js';

const ProjectKeySchema = z.enum(['api_opcv', 'front_end_opcvm', 'brvmchainsolution']);
type ProjectKey = z.infer<typeof ProjectKeySchema>;

const AllowedScriptSchema = z.enum([
  'scripts/diag/diag_classement_ratios.js',
  'scripts/scraper/indref_admin.js',
  'scripts/scraper/fix_index_tail.js',
  'scripts/scraper/propagate_indref_range.js',
  'scripts/scraper/scrape_indices_daily.js',
  'scripts/recalc/recalc_eur_usd_daily_rate.js',
  'scripts/repair-ost.ts',
  'scripts/align-dividend-years.ts',
  'scripts/repair-dividends.ts'
]);
type AllowedScript = z.infer<typeof AllowedScriptSchema>;

const projects: Record<ProjectKey, { label: string; path: string; note: string }> = {
  api_opcv: {
    label: 'API OPCVM / FundAfrica',
    path: '/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/api',
    note: 'Backend OPCVM autorisé pour diagnostics, scripts whitelistés et mise à jour Git contrôlée.'
  },
  front_end_opcvm: {
    label: 'Frontend OPCVM / FundAfrica',
    path: '/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr',
    note: 'Frontend OPCVM autorisé pour statut Git, pull contrôlé et build contrôlé.'
  },
  brvmchainsolution: {
    label: 'BRVM Chain Solution',
    path: '/opt/apps/brvmchain/BRVMCHAINSOLUTION',
    note: 'Projet BRVM autorisé pour statut Git, pull contrôlé et déploiement Docker Compose contrôlé.'
  }
};


const scriptProjectMap: Record<AllowedScript, ProjectKey> = {
  'scripts/diag/diag_classement_ratios.js': 'api_opcv',
  'scripts/scraper/indref_admin.js': 'api_opcv',
  'scripts/scraper/fix_index_tail.js': 'api_opcv',
  'scripts/scraper/propagate_indref_range.js': 'api_opcv',
  'scripts/scraper/scrape_indices_daily.js': 'api_opcv',
  'scripts/recalc/recalc_eur_usd_daily_rate.js': 'api_opcv',
  'scripts/repair-ost.ts': 'brvmchainsolution',
  'scripts/align-dividend-years.ts': 'brvmchainsolution',
  'scripts/repair-dividends.ts': 'brvmchainsolution'
};

const scriptsRequiringWriteApproval = new Set<AllowedScript>([
  'scripts/scraper/fix_index_tail.js',
  'scripts/scraper/propagate_indref_range.js',
  'scripts/scraper/scrape_indices_daily.js',
  'scripts/recalc/recalc_eur_usd_daily_rate.js',
  'scripts/repair-ost.ts',
  'scripts/align-dividend-years.ts',
  'scripts/repair-dividends.ts'
]);

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function projectFor(project: ProjectKey) {
  return projects[project];
}

function formatProjectCatalog(): string {
  return Object.entries(projects)
    .map(([key, value]) => `${key}: ${value.label}\n  path: ${value.path}\n  note: ${value.note}`)
    .join('\n\n');
}

async function runS2(command: string, intent: string, timeoutMs = 30_000) {
  const result = await runGuardedCommand('s2', command, {
    intent,
    timeoutMs,
    maxOutputBytes: 200_000
  });
  return asText(commandResultToText(result));
}

function buildGitStatusCommand(project: ProjectKey): string {
  const config = projectFor(project);
  return `set -euo pipefail
cd ${shellQuote(config.path)}
printf 'Projet: ${config.label}\nChemin: ${config.path}\n\n'
test -d .git
git status -sb
echo
echo 'Branche courante:'
git branch --show-current
echo
echo 'Dernier commit:'
git log -1 --oneline
echo
echo 'Remote:'
git remote -v`;
}

function buildGitPullCommand(project: ProjectKey): string {
  const config = projectFor(project);
  return `set -euo pipefail
cd ${shellQuote(config.path)}
mkdir -p .mcp_logs
LOG_FILE=".mcp_logs/mcp-autonomy-$(date +%Y%m%d).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "════════════════════════════════════════"
echo "MCP AUTONOMY — GIT UPDATE"
echo "Projet: ${config.label}"
echo "Chemin: ${config.path}"
echo "Date: $(date -Is)"
echo "════════════════════════════════════════"

test -d .git
git status -sb

CURRENT_BRANCH="$(git branch --show-current)"
echo "Branche courante: $CURRENT_BRANCH"

case "$CURRENT_BRANCH" in
  claude/*|main|master|server|production)
    echo "Branche autorisée: $CURRENT_BRANCH"
    ;;
  *)
    echo "ERREUR: branche non autorisée pour autonomie MCP: $CURRENT_BRANCH"
    exit 13
    ;;
esac

STASH_CREATED=0
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Changements suivis détectés: stash automatique avant rebase."
  git stash push -m "mcp-autostash-${config.label}-$(date +%Y%m%d_%H%M%S)"
  STASH_CREATED=1
else
  echo "Aucun changement suivi local à stasher."
fi

git fetch origin --prune
git pull --rebase origin "$CURRENT_BRANCH"

if [ "$STASH_CREATED" = "1" ]; then
  echo "Restauration du stash MCP."
  git stash pop || {
    echo "ERREUR: conflit pendant stash pop. Intervention nécessaire."
    git status -sb
    exit 14
  }
fi

echo
echo "Nouveau dernier commit:"
git log -1 --oneline

echo
echo "État Git final:"
git status -sb`;
}

function buildDeployCommand(project: ProjectKey): string {
  const config = projectFor(project);
  const common = buildGitPullCommand(project);

  if (project === 'brvmchainsolution') {
    return `${common}
echo
echo 'Déploiement BRVM contrôlé'
if [ -f package.json ]; then
  npm install
  npm run build --if-present
fi
if [ -f docker-compose.yml ] || [ -f compose.yml ]; then
  docker compose up -d --build
else
  echo 'Aucun fichier compose détecté: étape Docker ignorée.'
fi
echo
echo 'Conteneurs Docker:'
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo
echo 'Health public BRVM:'
curl -I --max-time 20 https://brvm.chainsolutions.fr/ || true`;
  }

  if (project === 'api_opcv') {
    return `${common}
echo
echo 'Déploiement API OPCVM contrôlé'
if [ -f package.json ]; then
  npm install --omit=dev
  npm run build --if-present
fi
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe api-monolith >/dev/null 2>&1; then
    pm2 restart api-monolith --update-env
  else
    echo 'Aucun process PM2 api-monolith trouvé: redémarrage PM2 ignoré.'
    pm2 list || true
  fi
else
  echo 'PM2 non disponible: redémarrage applicatif ignoré.'
fi`;
  }

  return `${common}
echo
echo 'Déploiement Frontend OPCVM contrôlé'
if [ -f package.json ]; then
  npm install
  npm run build --if-present
else
  echo 'Aucun package.json détecté: build ignoré.'
fi`;
}

export function registerScopedWriteTools(server: McpServer): void {
  server.tool('get_write_tools_context', 'Liste les projets et opérations d’écriture contrôlées disponibles. Aucun secret n’est exposé.', {}, async () => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    return asText(JSON.stringify({
      mode: 'scoped-write-tools',
      free_shell: false,
      run_command_s1: false,
      run_command_s2: false,
      sql: 'SELECT uniquement',
      projects: formatProjectCatalog()
    }, null, 2));
  });

  server.tool('run_sql_readonly_s2', 'Exécute une requête SQL SELECT uniquement sur la base OPCVM S2.', {
    query: z.string().min(8).max(20_000)
  }, async ({ query }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    assertSelectOnlyQuery(query);
    const command = `set -euo pipefail
mysql -N -B ${shellQuote(env.OPCVM_DB_NAME)} -e ${shellQuote(query.trim())}`;
    return runS2(command, 'run_sql_readonly_s2', 30_000);
  });

  server.tool('exec_repo_script_s2', 'Exécute uniquement un script autorisé du dépôt API OPCVM sur S2.', {
    script: AllowedScriptSchema,
    args: z.array(z.string()).default([]),
    allow_write: z.boolean().default(false)
  }, async ({ script, args, allow_write }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    assertSafeScriptArgs(args);
    // Mode autonomie projet : pas de validation manuelle allow_write.
    // Les scripts restent limités aux projets et chemins déclarés dans scriptProjectMap.
    const scriptProject = scriptProjectMap[script];
    const scriptProjectConfig = projectFor(scriptProject);
    const quotedArgs = args.map(shellQuote).join(' ');
    const command = scriptProject === 'brvmchainsolution'
      ? `set -euo pipefail
cd ${shellQuote(scriptProjectConfig.path)}
test -f ${shellQuote(script)}
printf 'Projet: ${scriptProjectConfig.label}\nScript autorisé: ${script}\nChemin: ${scriptProjectConfig.path}\nArguments: ${args.join(' ')}\n\n'
git status -sb
DOCKER_API_VERSION=1.44 docker ps --format '{{.Names}}' | grep -qx brvm_app
DOCKER_API_VERSION=1.44 docker exec -w /app brvm_app npx tsx ${shellQuote(script)} ${quotedArgs}`
      : `set -euo pipefail
cd ${shellQuote(scriptProjectConfig.path)}
test -f ${shellQuote(script)}
printf 'Projet: ${scriptProjectConfig.label}\nScript autorisé: ${script}\nChemin: ${scriptProjectConfig.path}\nArguments: ${args.join(' ')}\n\n'
git status -sb
node ${shellQuote(script)} ${quotedArgs}`;
    return runS2(command, `exec_repo_script_s2:${script}`, 900_000);
  });

  server.tool('git_status_project_s2', 'Affiche l’état Git d’un projet autorisé sur S2.', {
    project: ProjectKeySchema
  }, async ({ project }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    return runS2(buildGitStatusCommand(project), `git_status_project_s2:${project}`, 30_000);
  });

  server.tool('git_pull_project_s2', 'Met à jour automatiquement un projet autorisé sur S2 avec stash, pull --rebase et restauration du stash.', {
    project: ProjectKeySchema
  }, async ({ project }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    return runS2(buildGitPullCommand(project), `git_pull_project_s2:${project}`, 300_000);
  });

  server.tool('deploy_project_s2', 'Déploie automatiquement un projet autorisé sur S2 avec logs, stash, rebase et recette projet.', {
    project: ProjectKeySchema
  }, async ({ project }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    return runS2(buildDeployCommand(project), `deploy_project_s2:${project}`, 900_000);
  });

  server.tool('deploy_brvm_s2', 'Déploie automatiquement BRVMCHAINSOLUTION sur S2 avec logs, stash, rebase et recette BRVM.', {}, async () => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    return runS2(buildDeployCommand('brvmchainsolution'), 'deploy_brvm_s2', 900_000);
  });
}
