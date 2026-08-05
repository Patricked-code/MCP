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
  'sadiaaf_frontend'
]);

type ProjectKey = z.infer<typeof ProjectSchema>;

const projects: Record<
  ProjectKey,
  {
    label: string;
    path: string;
    domain: string;
  }
> = {
  sadiaaf_api: {
    label: 'SADIAAF API',
    path: '/var/www/vhosts/wealthtechinnovations.com/api.sadiaaf.wealthtechinnovations.com',
    domain: 'api.sadiaaf.wealthtechinnovations.com'
  },

  sadiaaf_frontend: {
    label: 'SADIAAF Frontend',
    path: '/var/www/vhosts/wealthtechinnovations.com/sadiaaf.wealthtechinnovations.com',
    domain: 'sadiaaf.wealthtechinnovations.com'
  }
};

function isProtectedPath(value: string): boolean {
  const normalized = value
    .replace(/^\.\//, '')
    .toLowerCase();

  const segments = normalized.split('/');
  const basename = segments.at(-1) ?? '';

  return (
    normalized === '.env' ||
    normalized.startsWith('.env.') ||
    segments.includes('.git') ||
    segments.includes('node_modules') ||
    segments.includes('secrets') ||
    segments.includes('keys') ||
    segments.includes('.ssh') ||
    segments.includes('logs') ||
    [
      '.pem',
      '.key',
      '.p12',
      '.pfx',
      '.crt',
      '.cer',
      '.sql',
      '.dump'
    ].some((suffix) => basename.endsWith(suffix))
  );
}

const RelativePathSchema = z
  .string()
  .min(1)
  .max(260)
  .regex(
    /^[A-Za-z0-9_./@+\-]+$/,
    'Chemin relatif limité aux caractères sûrs'
  )
  .refine(
    (value) =>
      !value.startsWith('/') &&
      !value.split('/').includes('..'),
    'Chemin absolu ou traversal interdit'
  )
  .refine(
    (value) => !isProtectedPath(value),
    'Chemin protégé interdit'
  );

const SearchSchema = z
  .string()
  .min(2)
  .max(100)
  .regex(
    /^[A-Za-z0-9_ .:/@+\-]+$/,
    'Recherche limitée aux caractères sûrs'
  );

const BranchSchema = z
  .string()
  .min(5)
  .max(100)
  .regex(
    /^(mcp|claude|codex|feature|fix)\/[A-Za-z0-9._-]+$/,
    'Branche autorisée : mcp/*, claude/*, codex/*, feature/* ou fix/*'
  );

const CommitMessageSchema = z
  .string()
  .min(5)
  .max(160)
  .regex(
    /^[A-Za-z0-9À-ÿ _.,:;()\[\]#/+\-]+$/,
    'Message de commit limité aux caractères sûrs'
  );

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function projectFor(project: ProjectKey) {
  return projects[project];
}

async function runS1(
  command: string,
  intent: string,
  timeoutMs = 30_000
) {
  const result = await runGuardedCommand(
    's1',
    command,
    {
      intent,
      timeoutMs,
      maxOutputBytes: 250_000
    }
  );

  return asText(commandResultToText(result));
}

function enterProject(project: ProjectKey): string {
  const config = projectFor(project);

  return `ROOT=${shellQuote(config.path)}
test -d "$ROOT"
REAL_ROOT="$(realpath "$ROOT")"
test "$REAL_ROOT" = ${shellQuote(config.path)}
cd "$REAL_ROOT"`;
}

function redactOutputPipeline(): string {
  return `sed -E \
  -e 's/(token|secret|password|privateKey|apiKey|accessToken|refreshToken)[[:space:]]*[:=][[:space:]]*[^[:space:]]+/\\1=***MASKED***/Ig' \
  -e 's/(Bearer )[A-Za-z0-9._~+\\/=-]+/\\1***MASKED***/g'`;
}

function qualityCommand(
  project: ProjectKey,
  mode:
    | 'install'
    | 'lint'
    | 'typecheck'
    | 'test'
    | 'build'
    | 'all'
): string {
  const config = projectFor(project);

  const install = `if [ -f pnpm-lock.yaml ]; then
  corepack pnpm install --frozen-lockfile
elif [ -f yarn.lock ]; then
  corepack yarn install --frozen-lockfile || corepack yarn install
elif [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi`;

  const runScript = (script: string) => `if node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts['${script}']?0:1)"; then
  npm run ${script}
else
  echo "Script ${script} absent : étape ignorée"
fi`;

  const steps: Record<
    'install' | 'lint' | 'typecheck' | 'test' | 'build' | 'all',
    string
  > = {
    install,

    lint: runScript('lint'),

    typecheck: runScript('typecheck'),

    test: runScript('test'),

    build: runScript('build'),

    all: [
      install,
      runScript('lint'),
      runScript('typecheck'),
      runScript('test'),
      runScript('build')
    ].join('\n')
  };

  return `set -euo pipefail
${enterProject(project)}

printf 'Projet : ${config.label}\\n'
printf 'Chemin : ${config.path}\\n'
printf 'Mode   : ${mode}\\n\\n'

test -f package.json

${steps[mode]}`;
}

export function registerSadiaafScopedTools(
  server: McpServer
): void {
  server.tool(
    'sadiaaf_projects_context_s1',
    'Retourne les deux projets SADIAAF autorisés sur S1 et leurs chemins, sans secret.',
    {},
    async () => {

      return asText(
        JSON.stringify(
          {
            server: 's1',
            projects
          },
          null,
          2
        )
      );
    }
  );

  server.tool(
    'sadiaaf_git_status_s1',
    'Affiche l’état Git, la branche, le dernier commit et les remotes d’un projet SADIAAF sur S1.',
    {
      project: ProjectSchema
    },
    async ({ project }) => {
      const config = projectFor(project);

      const command = `set -euo pipefail
${enterProject(project)}

printf 'Projet : ${config.label}\\n'
printf 'Chemin : ${config.path}\\n'
printf 'Domaine: ${config.domain}\\n\\n'

if [ -d .git ]; then
  git status -sb

  echo
  echo 'Branche courante:'
  git branch --show-current

  echo
  echo 'Dernier commit:'
  git log -1 --oneline

  echo
  echo 'Remotes:'
  git remote -v
else
  echo 'Aucun dépôt Git détecté à cette racine.'
  echo 'Recherche de dépôts imbriqués:'
  find . -mindepth 1 -maxdepth 2 -type d -name .git -print
fi`;

      return runS1(
        command,
        `sadiaaf_git_status_s1:${project}`
      );
    }
  );

  server.tool(
    'sadiaaf_list_files_s1',
    'Liste les fichiers utiles d’un projet SADIAAF sur S1, hors secrets, dépendances et artefacts.',
    {
      project: ProjectSchema
    },
    async ({ project }) => {
      const command = `set -euo pipefail
${enterProject(project)}

find . -maxdepth 6 \
  -path './.git' -prune -o \
  -path './node_modules' -prune -o \
  -path './.next' -prune -o \
  -path './dist' -prune -o \
  -path './build' -prune -o \
  -path './coverage' -prune -o \
  -path './logs' -prune -o \
  -path './secrets' -prune -o \
  -path './keys' -prune -o \
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
head -1200`;

      return runS1(
        command,
        `sadiaaf_list_files_s1:${project}`,
        60_000
      );
    }
  );

  server.tool(
    'sadiaaf_read_file_s1',
    'Lit un fichier texte autorisé d’un projet SADIAAF sur S1 avec masquage des secrets.',
    {
      project: ProjectSchema,
      path: RelativePathSchema
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
    echo 'Chemin hors projet refusé.'
    exit 51
    ;;
esac

sed -n '1,1200p' "$REAL_FILE" |
${redactOutputPipeline()}`;

      return runS1(
        command,
        `sadiaaf_read_file_s1:${project}:${path}`
      );
    }
  );

  server.tool(
    'sadiaaf_search_code_s1',
    'Recherche un terme dans le code d’un projet SADIAAF sur S1, hors secrets et dépendances.',
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
  ${shellQuote(query)} . 2>/dev/null |
head -500 |
${redactOutputPipeline()}`;

      return runS1(
        command,
        `sadiaaf_search_code_s1:${project}:${query}`,
        60_000
      );
    }
  );

  server.tool(
    'sadiaaf_git_diff_s1',
    'Affiche le diff Git sûr d’un projet SADIAAF sur S1, sans secrets.',
    {
      project: ProjectSchema
    },
    async ({ project }) => {
      const command = `set -euo pipefail
${enterProject(project)}

test -d .git

git diff -- . \
  ':(exclude).env' \
  ':(exclude).env.*' \
  ':(exclude)secrets/**' \
  ':(exclude)keys/**' \
  ':(exclude)node_modules/**' \
  ':(exclude).next/**' \
  ':(exclude)dist/**' \
  ':(exclude)build/**' |
${redactOutputPipeline()}`;

      return runS1(
        command,
        `sadiaaf_git_diff_s1:${project}`,
        60_000
      );
    }
  );

  server.tool(
    'sadiaaf_patch_file_s1',
    'Écrit ou remplace un fichier texte autorisé d’un projet SADIAAF sur S1. Une sauvegarde horodatée est créée hors du vhost.',
    {
      project: ProjectSchema,

      path: RelativePathSchema,

      content_base64: z
        .string()
        .min(1)
        .max(1_500_000)
        .regex(/^[A-Za-z0-9+/=\\r\\n]+$/),

      allow_write: z
        .boolean()
        .default(false)
    },
    async ({
      project,
      path,
      content_base64,
      allow_write
    }) => {
      assertScopedWriteToolsEnabled(
        env.ENABLE_WRITE_TOOLS
      );

      assertWriteFlag(
        allow_write,
        `sadiaaf_patch_file_s1:${project}:${path}`
      );

      const config = projectFor(project);

      const backupMarker = path.replaceAll('/', '_');

      const command = `set -euo pipefail
${enterProject(project)}

REL=${shellQuote(path)}
FILE="$REAL_ROOT/$REL"
PARENT="$(dirname "$FILE")"

mkdir -p "$PARENT"

REAL_PARENT="$(realpath "$PARENT")"

case "$REAL_PARENT" in
  "$REAL_ROOT"|"$REAL_ROOT"/*)
    ;;
  *)
    echo 'Chemin hors projet refusé.'
    exit 51
    ;;
esac

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_ROOT="/var/backups/wealthtech-mcp/sadiaaf/${project}/$STAMP"
BACKUP_FILE="$BACKUP_ROOT/$REL"

mkdir -p "$(dirname "$BACKUP_FILE")"

MODE=0644
OWNER="$(stat -c '%u:%g' "$REAL_ROOT")"

if [ -e "$FILE" ]; then
  test -f "$FILE"

  cp -a "$FILE" "$BACKUP_FILE"

  MODE="$(stat -c '%a' "$FILE")"
  OWNER="$(stat -c '%u:%g' "$FILE")"
else
  printf 'NEW FILE\\n' \
    > "$BACKUP_ROOT/NEW_FILE_${backupMarker}"
fi

TMP="$(mktemp "$PARENT/.mcp-patch.XXXXXX")"

printf '%s' ${shellQuote(content_base64)} |
base64 -d > "$TMP"

chmod "$MODE" "$TMP"
chown "$OWNER" "$TMP"
mv -f "$TMP" "$FILE"

printf 'Projet : ${config.label}\\n'
printf 'Fichier écrit : %s\\n' "$FILE"
printf 'Sauvegarde     : %s\\n' "$BACKUP_ROOT"
printf 'Taille         : %s octets\\n' "$(stat -c '%s' "$FILE")"`;

      return runS1(
        command,
        `sadiaaf_patch_file_s1:${project}:${path}`,
        120_000
      );
    }
  );

  server.tool(
    'sadiaaf_quality_s1',
    'Installe les dépendances et/ou exécute lint, typecheck, tests et build pour un projet SADIAAF sur S1.',
    {
      project: ProjectSchema,

      mode: z
        .enum([
          'install',
          'lint',
          'typecheck',
          'test',
          'build',
          'all'
        ])
        .default('all'),

      allow_write: z
        .boolean()
        .default(false)
    },
    async ({
      project,
      mode,
      allow_write
    }) => {
      assertScopedWriteToolsEnabled(
        env.ENABLE_WRITE_TOOLS
      );

      assertWriteFlag(
        allow_write,
        `sadiaaf_quality_s1:${project}:${mode}`
      );

      return runS1(
        qualityCommand(project, mode),
        `sadiaaf_quality_s1:${project}:${mode}`,
        1_200_000
      );
    }
  );

  server.tool(
    'sadiaaf_prepare_branch_s1',
    'Crée ou sélectionne une branche de travail contrôlée pour un projet SADIAAF sur S1.',
    {
      project: ProjectSchema,

      branch: BranchSchema,

      allow_write: z
        .boolean()
        .default(false)
    },
    async ({
      project,
      branch,
      allow_write
    }) => {
      assertScopedWriteToolsEnabled(
        env.ENABLE_WRITE_TOOLS
      );

      assertWriteFlag(
        allow_write,
        `sadiaaf_prepare_branch_s1:${project}:${branch}`
      );

      const command = `set -euo pipefail
${enterProject(project)}

test -d .git

if git show-ref --verify --quiet \
  refs/heads/${branch}; then
  git switch ${shellQuote(branch)}
else
  git switch -c ${shellQuote(branch)}
fi

git status -sb`;

      return runS1(
        command,
        `sadiaaf_prepare_branch_s1:${project}:${branch}`,
        60_000
      );
    }
  );

  server.tool(
    'sadiaaf_commit_push_s1',
    'Crée un commit contrôlé sur une branche non protégée et peut le pousser vers origin.',
    {
      project: ProjectSchema,

      message: CommitMessageSchema,

      push: z
        .boolean()
        .default(false),

      allow_write: z
        .boolean()
        .default(false)
    },
    async ({
      project,
      message,
      push,
      allow_write
    }) => {
      assertScopedWriteToolsEnabled(
        env.ENABLE_WRITE_TOOLS
      );

      assertWriteFlag(
        allow_write,
        `sadiaaf_commit_push_s1:${project}`
      );

      const pushCommand = push
        ? `git push -u origin "$BRANCH"`
        : `echo 'Push non demandé.'`;

      const command = `set -euo pipefail
${enterProject(project)}

test -d .git

BRANCH="$(git branch --show-current)"

case "$BRANCH" in
  mcp/*|claude/*|codex/*|feature/*|fix/*)
    ;;
  *)
    echo "Branche protégée ou non autorisée : $BRANCH"
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
        `sadiaaf_commit_push_s1:${project}`,
        300_000
      );
    }
  );

  server.tool(
    'sadiaaf_deploy_s1',
    'Build puis redémarre l’application SADIAAF via Passenger, avec contrôle HTTPS.',
    {
      project: ProjectSchema,

      install_dependencies: z
        .boolean()
        .default(false),

      allow_write: z
        .boolean()
        .default(false)
    },
    async ({
      project,
      install_dependencies,
      allow_write
    }) => {
      assertScopedWriteToolsEnabled(
        env.ENABLE_WRITE_TOOLS
      );

      assertWriteFlag(
        allow_write,
        `sadiaaf_deploy_s1:${project}`
      );

      const config = projectFor(project);

      const preparation = install_dependencies
        ? qualityCommand(project, 'install')
        : `set -euo pipefail
${enterProject(project)}`;

      const command = `${preparation}

test -f package.json

if node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts.build?0:1)"; then
  npm run build
else
  echo 'Script build absent : étape ignorée'
fi

mkdir -p tmp
touch tmp/restart.txt

sleep 3

curl -I --max-time 25 https://${config.domain}`;

      return runS1(
        command,
        `sadiaaf_deploy_s1:${project}`,
        1_200_000
      );
    }
  );

  server.tool(
    'sadiaaf_quarantine_contents_s1',
    'Vide réversiblement le contenu applicatif d’un projet SADIAAF en le déplaçant vers une quarantaine horodatée hors du vhost.',
    {
      project: ProjectSchema,

      confirm_domain: z
        .string()
        .min(3)
        .max(255),

      allow_write: z
        .boolean()
        .default(false)
    },
    async ({
      project,
      confirm_domain,
      allow_write
    }) => {
      assertScopedWriteToolsEnabled(
        env.ENABLE_WRITE_TOOLS
      );

      assertWriteFlag(
        allow_write,
        `sadiaaf_quarantine_contents_s1:${project}`
      );

      const config = projectFor(project);

      if (confirm_domain !== config.domain) {
        throw new Error(
          `Confirmation refusée : saisir exactement ${config.domain}`
        );
      }

      const command = `set -euo pipefail
${enterProject(project)}

STAMP="$(date +%Y%m%d_%H%M%S)"
QUARANTINE="/var/backups/wealthtech-mcp/sadiaaf-quarantine/${project}/$STAMP"

mkdir -p "$QUARANTINE"

COUNT="$(
  find "$REAL_ROOT" \
    -mindepth 1 \
    -maxdepth 1 |
  wc -l
)"

if [ "$COUNT" -gt 0 ]; then
  find "$REAL_ROOT" \
    -mindepth 1 \
    -maxdepth 1 \
    -exec mv -t "$QUARANTINE" -- {} +
fi

REMAINING="$(
  find "$REAL_ROOT" \
    -mindepth 1 \
    -maxdepth 1 |
  wc -l
)"

printf 'Projet              : ${config.label}\\n'
printf 'Domaine             : ${config.domain}\\n'
printf 'Éléments déplacés   : %s\\n' "$COUNT"
printf 'Éléments restants   : %s\\n' "$REMAINING"
printf 'Quarantaine         : %s\\n' "$QUARANTINE"

test "$REMAINING" -eq 0`;

      return runS1(
        command,
        `sadiaaf_quarantine_contents_s1:${project}`,
        900_000
      );
    }
  );

  server.tool(
    'sadiaaf_restore_quarantine_s1',
    'Restaure une quarantaine SADIAAF horodatée dans un répertoire applicatif actuellement vide.',
    {
      project: ProjectSchema,

      snapshot: z
        .string()
        .regex(
          /^\d{8}_\d{6}$/,
          'Snapshot attendu au format YYYYMMDD_HHMMSS'
        ),

      confirm_domain: z
        .string()
        .min(3)
        .max(255),

      allow_write: z
        .boolean()
        .default(false)
    },
    async ({
      project,
      snapshot,
      confirm_domain,
      allow_write
    }) => {
      assertScopedWriteToolsEnabled(
        env.ENABLE_WRITE_TOOLS
      );

      assertWriteFlag(
        allow_write,
        `sadiaaf_restore_quarantine_s1:${project}:${snapshot}`
      );

      const config = projectFor(project);

      if (confirm_domain !== config.domain) {
        throw new Error(
          `Confirmation refusée : saisir exactement ${config.domain}`
        );
      }

      const command = `set -euo pipefail
${enterProject(project)}

QUARANTINE="/var/backups/wealthtech-mcp/sadiaaf-quarantine/${project}/${snapshot}"

test -d "$QUARANTINE"

TARGET_COUNT="$(
  find "$REAL_ROOT" \
    -mindepth 1 \
    -maxdepth 1 |
  wc -l
)"

if [ "$TARGET_COUNT" -ne 0 ]; then
  echo "Restauration refusée : le répertoire cible contient $TARGET_COUNT élément(s)."
  exit 71
fi

SOURCE_COUNT="$(
  find "$QUARANTINE" \
    -mindepth 1 \
    -maxdepth 1 |
  wc -l
)"

if [ "$SOURCE_COUNT" -eq 0 ]; then
  echo 'Restauration refusée : quarantaine vide.'
  exit 72
fi

find "$QUARANTINE" \
  -mindepth 1 \
  -maxdepth 1 \
  -exec mv -t "$REAL_ROOT" -- {} +

RESTORED="$(
  find "$REAL_ROOT" \
    -mindepth 1 \
    -maxdepth 1 |
  wc -l
)"

REMAINING="$(
  find "$QUARANTINE" \
    -mindepth 1 \
    -maxdepth 1 |
  wc -l
)"

printf 'Projet                       : ${config.label}\\n'
printf 'Domaine                      : ${config.domain}\\n'
printf 'Éléments restaurés           : %s\\n' "$RESTORED"
printf 'Éléments restant en sauvegarde: %s\\n' "$REMAINING"
printf 'Source                       : %s\\n' "$QUARANTINE"

test "$REMAINING" -eq 0`;

      return runS1(
        command,
        `sadiaaf_restore_quarantine_s1:${project}:${snapshot}`,
        900_000
      );
    }
  );
}
