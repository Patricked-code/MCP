import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from '../config/env.js';
import { runGuardedCommand } from '../ssh/client.js';
import {
  assertScopedWriteToolsEnabled,
  assertWriteFlag
} from '../ssh/writeSafety.js';
import {
  asText,
  commandResultToText
} from './format.js';

const ProjectSchema = z.enum([
  'sadiaaf_api',
  'sadiaaf_frontend',
  'liquidity_main',
  'liquidity_v1',
  'liquidity_test',
  'liquidity_dapps',
  'liquidity_api_v3'
]);

type ProjectKey = z.infer<typeof ProjectSchema>;

interface ProjectConfig {
  label: string;
  path: string;
  domain: string;
}

const projects: Record<ProjectKey, ProjectConfig> = {
  sadiaaf_api: {
    label: 'SADIAAF API',
    path: '/var/www/vhosts/wealthtechinnovations.com/api.sadiaaf.wealthtechinnovations.com',
    domain: 'api.sadiaaf.wealthtechinnovations.com'
  },

  sadiaaf_frontend: {
    label: 'SADIAAF Frontend',
    path: '/var/www/vhosts/wealthtechinnovations.com/sadiaaf.wealthtechinnovations.com',
    domain: 'sadiaaf.wealthtechinnovations.com'
  },

  liquidity_main: {
    label: 'Liquidity principale',
    path: '/var/www/vhosts/wealthtechinnovations.com/liquidity.wealthtechinnovations.com',
    domain: 'liquidity.wealthtechinnovations.com'
  },

  liquidity_v1: {
    label: 'Liquidity V1',
    path: '/var/www/vhosts/wealthtechinnovations.com/liquidityv1.wealthtechinnovations.com',
    domain: 'liquidityv1.wealthtechinnovations.com'
  },

  liquidity_test: {
    label: 'Liquidity Test',
    path: '/var/www/vhosts/wealthtechinnovations.com/liquidity-test.wealthtechinnovations.com',
    domain: 'liquidity-test.wealthtechinnovations.com'
  },

  liquidity_dapps: {
    label: 'Liquidity DApps',
    path: '/var/www/vhosts/wealthtechinnovations.com/dapps.liquidity.wealthtechinnovations.com',
    domain: 'dapps.liquidity.wealthtechinnovations.com'
  },

  liquidity_api_v3: {
    label: 'Liquidity API V3',
    path: '/var/www/vhosts/wealthtechinnovations.com/apiv3.liquidity.wealthtechinnovations.com',
    domain: 'apiv3.liquidity.wealthtechinnovations.com'
  }
};

const SafeRelativePathSchema = z
  .string()
  .min(1)
  .max(300)
  .regex(
    /^[A-Za-z0-9_./@+\-]+$/,
    'Le chemin contient des caractères non autorisés.'
  )
  .refine(
    (value) =>
      !value.startsWith('/') &&
      !value.split('/').includes('..'),
    'Chemin absolu ou traversal interdit.'
  )
  .refine(
    (value) => {
      const normalized = value.toLowerCase().replace(/^\.\//, '');
      const parts = normalized.split('/');
      const basename = parts.at(-1) ?? '';

      return !(
        normalized === '.env' ||
        normalized.startsWith('.env.') ||
        parts.includes('secrets') ||
        parts.includes('keys') ||
        parts.includes('.ssh') ||
        basename.endsWith('.pem') ||
        basename.endsWith('.key') ||
        basename.endsWith('.p12') ||
        basename.endsWith('.pfx') ||
        basename.endsWith('.crt') ||
        basename.endsWith('.sql') ||
        basename.endsWith('.dump')
      );
    },
    'Fichier secret, clé, certificat ou dump protégé.'
  );

const SearchSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(
    /^[A-Za-z0-9À-ÿ_ .:/@+\-]+$/,
    'La recherche contient des caractères non autorisés.'
  );

const BranchSchema = z
  .string()
  .min(5)
  .max(120)
  .regex(
    /^(mcp|claude|codex|feature|fix)\/[A-Za-z0-9._-]+$/,
    'Branche autorisée : mcp/*, claude/*, codex/*, feature/* ou fix/*.'
  );

const CommitMessageSchema = z
  .string()
  .min(5)
  .max(180)
  .regex(
    /^[A-Za-z0-9À-ÿ _.,:;()[\]#/+\-]+$/,
    'Le message de commit contient des caractères non autorisés.'
  );

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function projectFor(project: ProjectKey): ProjectConfig {
  return projects[project];
}

function enterProject(project: ProjectKey): string {
  const config = projectFor(project);

  return `ROOT=${shellQuote(config.path)}
test -d "$ROOT"
test ! -L "$ROOT"
REAL_ROOT="$(realpath "$ROOT")"
test "$REAL_ROOT" = ${shellQuote(config.path)}
cd "$REAL_ROOT"`;
}

function redactPipeline(): string {
  return `sed -E \
-e 's/(token|secret|password|privateKey|apiKey|accessToken|refreshToken)[[:space:]]*[:=][[:space:]]*[^[:space:]]+/\\1=***MASKED***/Ig' \
-e 's/(Bearer )[A-Za-z0-9._~+\\/=-]+/\\1***MASKED***/g'`;
}

async function runS1(
  command: string,
  intent: string,
  timeoutMs = 30_000
) {
  const result = await runGuardedCommand('s1', command, {
    intent,
    timeoutMs,
    maxOutputBytes: 300_000
  });

  return asText(commandResultToText(result));
}

export function registerLegacyVhostsScopedTools(
  server: McpServer
): void {
  server.tool(
    'legacy_vhosts_context_s1',
    'Liste les applications historiques autorisées sur S1, avec leurs chemins exacts.',
    {},
    async () => {
      assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);

      return asText(JSON.stringify({
        server: 's1',
        mode: 'full-controlled-project-access',
        freeShell: false,
        projects
      }, null, 2));
    }
  );

  server.tool(
    'legacy_vhost_inventory_s1',
    'Inventorie un répertoire historique autorisé sur S1, sans lire les secrets.',
    {
      project: ProjectSchema
    },
    async ({ project }) => {
      const config = projectFor(project);

      const command = `set -euo pipefail
${enterProject(project)}

printf 'Projet : ${config.label}\\n'
printf 'Domaine: ${config.domain}\\n'
printf 'Chemin : ${config.path}\\n\\n'

du -sh "$REAL_ROOT" || true

echo
echo 'Contenu de premier niveau:'
find "$REAL_ROOT" \
  -mindepth 1 \
  -maxdepth 1 \
  -printf '%TY-%Tm-%Td %TH:%TM %y %s %p\\n' |
sort

echo
echo 'Fichiers utiles:'
find "$REAL_ROOT" \
  -maxdepth 6 \
  -path '*/.git' -prune -o \
  -path '*/node_modules' -prune -o \
  -path '*/.next' -prune -o \
  -path '*/dist' -prune -o \
  -path '*/build' -prune -o \
  -path '*/coverage' -prune -o \
  -path '*/logs' -prune -o \
  -path '*/secrets' -prune -o \
  -path '*/keys' -prune -o \
  -type f \
  ! -name '.env' \
  ! -name '.env.*' \
  ! -name '*.pem' \
  ! -name '*.key' \
  ! -name '*.crt' \
  ! -name '*.p12' \
  ! -name '*.pfx' \
  ! -name '*.sql' \
  ! -name '*.dump' \
  -printf '%TY-%Tm-%Td %TH:%TM %s %p\\n' |
sort |
head -1500`;

      return runS1(
        command,
        `legacy_vhost_inventory_s1:${project}`,
        90_000
      );
    }
  );

  server.tool(
    'legacy_vhost_read_file_s1',
    'Lit un fichier texte autorisé dans une application historique S1.',
    {
      project: ProjectSchema,
      path: SafeRelativePathSchema
    },
    async ({ project, path }) => {
      const command = `set -euo pipefail
${enterProject(project)}

FILE="$REAL_ROOT/${path}"
test -f "$FILE"

REAL_FILE="$(realpath "$FILE")"

case "$REAL_FILE" in
  "$REAL_ROOT"/*)
    ;;
  *)
    echo 'Lecture hors projet refusée.'
    exit 51
    ;;
esac

sed -n '1,1600p' "$REAL_FILE" |
${redactPipeline()}`;

      return runS1(
        command,
        `legacy_vhost_read_file_s1:${project}:${path}`,
        60_000
      );
    }
  );

  server.tool(
    'legacy_vhost_search_s1',
    'Recherche un terme dans le code autorisé d’une application historique S1.',
    {
      project: ProjectSchema,
      query: SearchSchema
    },
    async ({ project, query }) => {
      const command = `set -euo pipefail
${enterProject(project)}

grep -RIn -F \
  --exclude-dir=.git \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude-dir=coverage \
  --exclude-dir=logs \
  --exclude-dir=secrets \
  --exclude-dir=keys \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.pem' \
  --exclude='*.key' \
  --exclude='*.crt' \
  --exclude='*.p12' \
  --exclude='*.pfx' \
  --exclude='*.sql' \
  --exclude='*.dump' \
  ${shellQuote(query)} "$REAL_ROOT" 2>/dev/null |
head -800 |
${redactPipeline()}`;

      return runS1(
        command,
        `legacy_vhost_search_s1:${project}:${query}`,
        90_000
      );
    }
  );

  server.tool(
    'legacy_vhost_write_file_s1',
    'Crée ou remplace un fichier autorisé dans une application historique S1.',
    {
      project: ProjectSchema,
      path: SafeRelativePathSchema,

      content_base64: z
        .string()
        .min(1)
        .max(2_000_000)
        .regex(/^[A-Za-z0-9+/=\\r\\n]+$/),

      allow_write: z.boolean().default(false)
    },
    async ({
      project,
      path,
      content_base64,
      allow_write
    }) => {
      assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);

      assertWriteFlag(
        allow_write,
        `legacy_vhost_write_file_s1:${project}:${path}`
      );

      const command = `set -euo pipefail
${enterProject(project)}

FILE="$REAL_ROOT/${path}"
PARENT="$(dirname "$FILE")"

mkdir -p "$PARENT"

REAL_PARENT="$(realpath "$PARENT")"

case "$REAL_PARENT" in
  "$REAL_ROOT"|"$REAL_ROOT"/*)
    ;;
  *)
    echo 'Écriture hors projet refusée.'
    exit 52
    ;;
esac

TMP="$(mktemp "$REAL_PARENT/.mcp-write.XXXXXX")"

printf '%s' ${shellQuote(content_base64)} |
base64 -d > "$TMP"

if [ -e "$FILE" ]; then
  MODE="$(stat -c '%a' "$FILE")"
  OWNER="$(stat -c '%u:%g' "$FILE")"
else
  MODE="0644"
  OWNER="$(stat -c '%u:%g' "$REAL_ROOT")"
fi

chmod "$MODE" "$TMP"
chown "$OWNER" "$TMP"
mv -f "$TMP" "$FILE"

printf 'Fichier écrit : %s\\n' "$FILE"
printf 'Taille        : %s octets\\n' "$(stat -c '%s' "$FILE")"`;

      return runS1(
        command,
        `legacy_vhost_write_file_s1:${project}:${path}`,
        120_000
      );
    }
  );

  server.tool(
    'legacy_vhost_delete_path_s1',
    'Supprime définitivement un fichier ou répertoire relatif autorisé dans une application historique S1.',
    {
      project: ProjectSchema,
      path: SafeRelativePathSchema,
      allow_write: z.boolean().default(false)
    },
    async ({ project, path, allow_write }) => {
      assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);

      assertWriteFlag(
        allow_write,
        `legacy_vhost_delete_path_s1:${project}:${path}`
      );

      const command = `set -euo pipefail
${enterProject(project)}

TARGET="$REAL_ROOT/${path}"
REAL_TARGET="$(realpath -m "$TARGET")"

case "$REAL_TARGET" in
  "$REAL_ROOT"/*)
    ;;
  *)
    echo 'Suppression hors projet refusée.'
    exit 53
    ;;
esac

if [ ! -e "$TARGET" ] && [ ! -L "$TARGET" ]; then
  echo 'Chemin déjà absent.'
  exit 0
fi

rm -rf -- "$TARGET"

test ! -e "$TARGET"
test ! -L "$TARGET"

printf 'Chemin supprimé : %s\\n' "$TARGET"`;

      return runS1(
        command,
        `legacy_vhost_delete_path_s1:${project}:${path}`,
        300_000
      );
    }
  );

  server.tool(
    'legacy_vhost_git_status_s1',
    'Affiche l’état Git d’une application historique S1.',
    {
      project: ProjectSchema
    },
    async ({ project }) => {
      const command = `set -euo pipefail
${enterProject(project)}

if [ ! -d .git ]; then
  echo 'Aucun dépôt Git dans cette racine.'
  exit 0
fi

git status -sb

echo
echo 'Branche:'
git branch --show-current

echo
echo 'Dernier commit:'
git log -1 --oneline

echo
echo 'Remotes:'
git remote -v`;

      return runS1(
        command,
        `legacy_vhost_git_status_s1:${project}`,
        60_000
      );
    }
  );

  server.tool(
    'legacy_vhost_git_init_s1',
    'Initialise un nouveau dépôt Git dans une racine historique vide ou reconstruite.',
    {
      project: ProjectSchema,
      branch: BranchSchema,
      allow_write: z.boolean().default(false)
    },
    async ({ project, branch, allow_write }) => {
      assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);

      assertWriteFlag(
        allow_write,
        `legacy_vhost_git_init_s1:${project}:${branch}`
      );

      const command = `set -euo pipefail
${enterProject(project)}

if [ ! -d .git ]; then
  git init
fi

if git show-ref --verify --quiet refs/heads/${branch}; then
  git switch ${shellQuote(branch)}
else
  git switch -c ${shellQuote(branch)}
fi

git status -sb`;

      return runS1(
        command,
        `legacy_vhost_git_init_s1:${project}:${branch}`,
        60_000
      );
    }
  );

  server.tool(
    'legacy_vhost_commit_push_s1',
    'Committe les modifications sûres et peut pousser une branche de travail autorisée.',
    {
      project: ProjectSchema,
      message: CommitMessageSchema,
      push: z.boolean().default(false),
      allow_write: z.boolean().default(false)
    },
    async ({
      project,
      message,
      push,
      allow_write
    }) => {
      assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);

      assertWriteFlag(
        allow_write,
        `legacy_vhost_commit_push_s1:${project}`
      );

      const pushCommand = push
        ? 'git push -u origin "$BRANCH"'
        : "echo 'Push non demandé.'";

      const command = `set -euo pipefail
${enterProject(project)}

test -d .git

BRANCH="$(git branch --show-current)"

case "$BRANCH" in
  mcp/*|claude/*|codex/*|feature/*|fix/*)
    ;;
  *)
    echo "Branche protégée ou interdite : $BRANCH"
    exit 61
    ;;
esac

git add -A -- . \
  ':(exclude).env' \
  ':(exclude).env.*' \
  ':(exclude)secrets/**' \
  ':(exclude)keys/**' \
  ':(exclude)node_modules/**' \
  ':(exclude).next/**' \
  ':(exclude)dist/**' \
  ':(exclude)build/**' \
  ':(exclude)coverage/**' \
  ':(exclude)logs/**'

if git diff --cached --quiet; then
  echo 'Aucun changement sûr à committer.'
  exit 0
fi

git diff --cached --stat
git commit -m ${shellQuote(message)}

${pushCommand}

git status -sb
git log -1 --oneline`;

      return runS1(
        command,
        `legacy_vhost_commit_push_s1:${project}`,
        300_000
      );
    }
  );

  server.tool(
    'legacy_vhost_quality_s1',
    'Installe les dépendances, exécute lint, typecheck, tests et build.',
    {
      project: ProjectSchema,
      install_dependencies: z.boolean().default(true),
      allow_write: z.boolean().default(false)
    },
    async ({
      project,
      install_dependencies,
      allow_write
    }) => {
      assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);

      assertWriteFlag(
        allow_write,
        `legacy_vhost_quality_s1:${project}`
      );

      const install = install_dependencies
        ? `if [ -f pnpm-lock.yaml ]; then
  corepack pnpm install --frozen-lockfile
elif [ -f yarn.lock ]; then
  corepack yarn install --frozen-lockfile || corepack yarn install
elif [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi`
        : "echo 'Installation des dépendances non demandée.'";

      const command = `set -euo pipefail
${enterProject(project)}

test -f package.json

${install}

npm run lint --if-present
npm run typecheck --if-present
npm run test --if-present
npm run build --if-present`;

      return runS1(
        command,
        `legacy_vhost_quality_s1:${project}`,
        1_200_000
      );
    }
  );

  server.tool(
    'legacy_vhost_deploy_s1',
    'Compile puis redémarre une application historique via Passenger.',
    {
      project: ProjectSchema,
      install_dependencies: z.boolean().default(false),
      allow_write: z.boolean().default(false)
    },
    async ({
      project,
      install_dependencies,
      allow_write
    }) => {
      assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);

      assertWriteFlag(
        allow_write,
        `legacy_vhost_deploy_s1:${project}`
      );

      const config = projectFor(project);

      const install = install_dependencies
        ? `if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi`
        : "echo 'Installation des dépendances non demandée.'";

      const command = `set -euo pipefail
${enterProject(project)}

test -f package.json

${install}

npm run build --if-present

mkdir -p tmp
touch tmp/restart.txt

sleep 3

curl -k -I --max-time 25 https://${config.domain}`;

      return runS1(
        command,
        `legacy_vhost_deploy_s1:${project}`,
        1_200_000
      );
    }
  );

  server.tool(
    'legacy_vhost_purge_s1',
    'Supprime définitivement tout le contenu d’une racine historique, après double validation.',
    {
      project: ProjectSchema,
      confirm_domain: z.string().min(3).max(255),
      confirm_phrase: z.literal('DELETE PERMANENTLY'),
      allow_write: z.boolean().default(false)
    },
    async ({
      project,
      confirm_domain,
      confirm_phrase: _confirmPhrase,
      allow_write
    }) => {
      assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);

      assertWriteFlag(
        allow_write,
        `legacy_vhost_purge_s1:${project}`
      );

      const config = projectFor(project);

      if (confirm_domain !== config.domain) {
        throw new Error(
          `Confirmation refusée : saisir exactement ${config.domain}`
        );
      }

      const command = `set -euo pipefail
${enterProject(project)}

COUNT_BEFORE="$(
  find "$REAL_ROOT" -mindepth 1 -maxdepth 1 | wc -l
)"

BYTES_BEFORE="$(
  du -sb "$REAL_ROOT" 2>/dev/null | awk '{print $1}'
)"

if [ "$COUNT_BEFORE" -gt 0 ]; then
  find "$REAL_ROOT" \
    -mindepth 1 \
    -maxdepth 1 \
    -exec rm -rf -- {} +
fi

COUNT_AFTER="$(
  find "$REAL_ROOT" -mindepth 1 -maxdepth 1 | wc -l
)"

printf 'Projet             : ${config.label}\\n'
printf 'Domaine            : ${config.domain}\\n'
printf 'Éléments supprimés : %s\\n' "$COUNT_BEFORE"
printf 'Octets initiaux    : %s\\n' "$BYTES_BEFORE"
printf 'Éléments restants  : %s\\n' "$COUNT_AFTER"

test "$COUNT_AFTER" -eq 0`;

      return runS1(
        command,
        `legacy_vhost_purge_s1:${project}`,
        900_000
      );
    }
  );
}
