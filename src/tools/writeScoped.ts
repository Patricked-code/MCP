import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from '../config/env.js';
import { runGuardedCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';
import { registerMcpSelfWriteTools } from './selfManagement.js';
import { registerLegacyVhostsScopedTools } from './legacyVhostsScoped.js';
import { registerAmfRegistryTools } from './amfRegistry.js';
import { registerSadiaafScopedTools } from './sadiaafScoped.js';
import {
  assertScopedWriteToolsEnabled,
  assertSelectOnlyQuery,
  assertSafeScriptArgs
} from '../ssh/writeSafety.js';

const ProjectKeySchema = z.enum([
  'api_opcv',
  'front_end_opcvm',
  'legacy_funds_frontend',
  'legacy_funds_api',
  'brvmchainsolution'
]);
type ProjectKey = z.infer<typeof ProjectKeySchema>;

const AllowedScriptSchema = z.string()
  .regex(/^scripts\/[A-Za-z0-9_./-]+\.(js|ts)$/, 'Script autorisé uniquement sous scripts/ avec extension .js ou .ts')
  .refine((value) => !value.includes('..') && !value.startsWith('/'), 'Script path interdit hors dépôt');

type AllowedScript = z.infer<typeof AllowedScriptSchema>;

const projects: Record<ProjectKey, { label: string; path: string; note: string }> = {
  api_opcv: {
    label: 'API OPCVM / FundAfrica',
    path: '/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/api',
    note: 'Backend OPCVM autorisé pour diagnostics, scripts whitelistés et mise à jour Git contrôlée.'
  },
  front_end_opcvm: {
    label: 'Frontend OPCVM / FundAfrica',
    path: '/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/frontend',
    note: 'Frontend OPCVM autorisé pour statut Git, pull contrôlé et build contrôlé.'
  },
  legacy_funds_frontend: {
    label: 'Frontend historique Funds ChainSolutions',
    path: '/var/www/vhosts/chainsolutions.fr/Funds.chainsolutions.fr',
    note: 'Frontend historique autorisé pour audit Git, scripts contrôlés, modifications versionnées, build et redémarrage Passenger.'
  },
  legacy_funds_api: {
    label: 'API historique Funds ChainSolutions',
    path: '/var/www/vhosts/chainsolutions.fr/api.funds.chainsolutions.fr',
    note: 'API historique autorisée pour audit Git, scripts contrôlés, modifications versionnées, tests, build et redémarrage Passenger.'
  },
  brvmchainsolution: {
    label: 'BRVM Chain Solution',
    path: '/opt/apps/brvmchain/BRVMCHAINSOLUTION',
    note: 'Projet BRVM autorisé pour statut Git, pull contrôlé et déploiement Docker Compose contrôlé.'
  }
};

function inferScriptProject(script: AllowedScript): ProjectKey {
  if (
    script.includes('repair-ost') ||
    script.includes('align-dividend-years') ||
    script.includes('repair-dividends')
  ) {
    return 'brvmchainsolution';
  }

  return 'api_opcv';
}

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

  if (project === 'legacy_funds_api') {
    return `${common}
echo
echo 'Déploiement contrôlé de l API historique Funds'
test -f package.json
npm install
npm run typecheck --if-present
npm test --if-present
npm run build --if-present

mkdir -p tmp
touch tmp/restart.txt

echo
echo 'Redémarrage Passenger demandé via tmp/restart.txt'
curl -I --max-time 20 https://api.funds.chainsolutions.fr/ || true`;
  }

  if (project === 'legacy_funds_frontend') {
    return `${common}
echo
echo 'Déploiement contrôlé du frontend historique Funds'
test -f package.json
npm install
npm run typecheck --if-present
npm test --if-present
npm run build --if-present

mkdir -p tmp
touch tmp/restart.txt

echo
echo 'Redémarrage Passenger demandé via tmp/restart.txt'
curl -I --max-time 20 https://funds.chainsolutions.fr/ || true`;
  }

  return `${common}
echo
echo 'Déploiement Frontend OPCVM contrôlé'
if [ -f package.json ]; then
  npm install
  npm run build --if-present
else
  echo 'Aucun package.json détecté: build ignoré.'
fi
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe fundafrique-frontend >/dev/null 2>&1; then
    pm2 restart fundafrique-frontend --update-env
  else
    echo 'Aucun process PM2 fundafrique-frontend trouvé: redémarrage PM2 ignoré.'
    pm2 list || true
  fi
else
  echo 'PM2 non disponible: redémarrage frontend ignoré.'
fi`;
}

export function registerScopedReadOnlyTools(server: McpServer): void {
  server.tool('get_write_tools_context', 'Liste les projets et opérations d’écriture contrôlées disponibles. Aucun secret n’est exposé.', {}, async () => asText(JSON.stringify({
    mode: 'scoped-write-tools',
    free_shell: false,
    run_command_s1: false,
    run_command_s2: false,
    sql: 'SELECT uniquement',
    projects: formatProjectCatalog()
  }, null, 2)));

  server.tool('run_sql_readonly_s2', 'Exécute une requête SQL SELECT uniquement sur la base OPCVM S2.', {
    query: z.string().min(8).max(20_000)
  }, async ({ query }) => {
    assertSelectOnlyQuery(query);
    const command = `set -euo pipefail
mysql -N -B ${shellQuote(env.OPCVM_DB_NAME)} -e ${shellQuote(query.trim())}`;
    return runS2(command, 'run_sql_readonly_s2', 30_000);
  });

  server.tool('git_status_project_s2', 'Affiche l’état Git d’un projet autorisé sur S2.', {
    project: ProjectKeySchema
  }, async ({ project }) => runS2(
    buildGitStatusCommand(project),
    `git_status_project_s2:${project}`,
    30_000
  ));
}

export function registerScopedWriteTools(server: McpServer): void {

  // Lecture seule PostgreSQL du projet BRVM.
  // Le conteneur cible est strictement limité à brvm_db.
  server.tool(
    'brvm_run_sql_readonly_s2',
    'Exécute une requête SQL SELECT uniquement sur la base PostgreSQL BRVM (conteneur brvm_db) sur S2.',
    {
      query: z.string().min(8).max(20_000)
    },
    async ({ query }) => {
      assertScopedWriteToolsEnabled(
        env.ENABLE_WRITE_TOOLS
      );

      assertSelectOnlyQuery(query);

      const command = `set -euo pipefail
DOCKER_API_VERSION=1.44 docker ps --format '{{.Names}}' | grep -qx brvm_db
printf '%s' ${shellQuote(query.trim())} | DOCKER_API_VERSION=1.44 docker exec -i brvm_db sh -lc 'psql -X -A -F "|" --pset=footer=off -v ON_ERROR_STOP=1 -U "\${POSTGRES_USER:-postgres}" -d "\${POSTGRES_DB:-postgres}" -f -'`;

      return runS2(
        command,
        'brvm_run_sql_readonly_s2',
        60_000
      );
    }
  );

  // Lecture tronquée et masquée des logs du conteneur BRVM.
  server.tool(
    'brvm_container_logs_s2',
    'Affiche les dernières lignes de logs Docker du conteneur brvm_app sur S2 (secrets masqués).',
    {
      lines: z
        .number()
        .int()
        .min(20)
        .max(500)
        .default(150),

      contains: z
        .string()
        .min(2)
        .max(60)
        .regex(
          /^[A-Za-z0-9_.:\/\[\] -]+$/,
          'Filtre limité aux caractères alphanumériques simples'
        )
        .optional()
    },
    async ({ lines, contains }) => {
      assertScopedWriteToolsEnabled(
        env.ENABLE_WRITE_TOOLS
      );

      const filter = contains
        ? ` | { grep -i -F -- ${shellQuote(contains)} || true; }`
        : '';

      const command = `set -euo pipefail
DOCKER_API_VERSION=1.44 docker ps --format '{{.Names}}' | grep -qx brvm_app
DOCKER_API_VERSION=1.44 docker logs --tail ${lines} brvm_app 2>&1${filter} | sed -E -e 's#(postgres|postgresql)://[^ ]+#\\1://***MASKED***#Ig' -e 's/(PASSWORD|PASS|SECRET|TOKEN|API_KEY|APIKEY)[^ ]*/\\1=***MASKED***/Ig'`;

      return runS2(
        command,
        'brvm_container_logs_s2',
        60_000
      );
    }
  );

  server.tool('exec_repo_script_s2', 'Exécute uniquement un script autorisé du dépôt API OPCVM ou BRVM sur S2. Le paramètre project force le dépôt cible.', {
    script: AllowedScriptSchema,
    args: z.array(z.string()).default([]),
    project: ProjectKeySchema.optional()
  }, async ({ script, args, project }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    assertSafeScriptArgs(args);
    const scriptProject = project ?? inferScriptProject(script);
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

  registerSadiaafScopedTools(server);
  registerLegacyVhostsScopedTools(server);
  registerAmfRegistryTools(server);
  registerMcpSelfWriteTools(server);
}
