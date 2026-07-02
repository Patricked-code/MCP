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
  'scripts/recalc/recalc_eur_usd_daily_rate.js'
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

const scriptsRequiringWriteApproval = new Set<AllowedScript>([
  'scripts/scraper/fix_index_tail.js',
  'scripts/scraper/propagate_indref_range.js',
  'scripts/scraper/scrape_indices_daily.js',
  'scripts/recalc/recalc_eur_usd_daily_rate.js'
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
printf 'Projet: ${config.label}\nChemin: ${config.path}\n\n'
test -d .git
git status -sb
if [ -n "$(git status --porcelain)" ]; then
  echo 'ERREUR: arbre Git non propre. Pull refusé pour éviter d’écraser des changements locaux.'
  git status --short
  exit 12
fi
git fetch origin --prune
UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
if [ -z "$UPSTREAM" ]; then
  echo 'ERREUR: aucune branche upstream configurée. Pull refusé.'
  exit 13
fi
git pull --ff-only
echo
echo 'Nouveau dernier commit:'
git log -1 --oneline`;
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
  if pm2 describe api_opcv >/dev/null 2>&1; then
    pm2 restart api_opcv --update-env
  elif pm2 describe africafunds-api >/dev/null 2>&1; then
    pm2 restart africafunds-api --update-env
  else
    echo 'Aucun process PM2 connu api_opcv/africafunds-api trouvé: redémarrage PM2 ignoré.'
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
    if (scriptArgsRequireWriteApproval(args) || scriptsRequiringWriteApproval.has(script)) {
      assertWriteFlag(allow_write, `exec_repo_script_s2:${script}`);
    }
    const apiProject = projectFor('api_opcv');
    const quotedArgs = args.map(shellQuote).join(' ');
    const command = `set -euo pipefail
cd ${shellQuote(apiProject.path)}
test -f ${shellQuote(script)}
printf 'Script autorisé: ${script}\nChemin: ${apiProject.path}\nArguments: ${args.join(' ')}\n\n'
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

  server.tool('git_pull_project_s2', 'Met à jour un projet autorisé sur S2 par git pull --ff-only, uniquement si l’arbre Git est propre.', {
    project: ProjectKeySchema,
    allow_write: z.boolean().default(false)
  }, async ({ project, allow_write }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    assertWriteFlag(allow_write, `git_pull_project_s2:${project}`);
    return runS2(buildGitPullCommand(project), `git_pull_project_s2:${project}`, 120_000);
  });

  server.tool('deploy_project_s2', 'Déploie un projet autorisé sur S2 avec une recette contrôlée, sans commande libre.', {
    project: ProjectKeySchema,
    allow_write: z.boolean().default(false)
  }, async ({ project, allow_write }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    assertWriteFlag(allow_write, `deploy_project_s2:${project}`);
    return runS2(buildDeployCommand(project), `deploy_project_s2:${project}`, 900_000);
  });

  server.tool('deploy_brvm_s2', 'Alias sécurisé pour déployer uniquement BRVMCHAINSOLUTION sur S2.', {
    allow_write: z.boolean().default(false)
  }, async ({ allow_write }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    assertWriteFlag(allow_write, 'deploy_brvm_s2');
    return runS2(buildDeployCommand('brvmchainsolution'), 'deploy_brvm_s2', 900_000);
  });
}
