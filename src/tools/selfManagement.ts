import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from '../config/env.js';
import { runReadOnlyCommand, runGuardedCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';
import { buildMcpGitSyncCommand } from './mcpGitSync.js';
import { assertScopedWriteToolsEnabled, assertWriteFlag } from '../ssh/writeSafety.js';

const MCP_PROJECT_KEY = 'mcp_bridge';
const MCP_ROOT = '/opt/apps/wealthtech-mcp-ssh-bridge';
const MCP_CONTAINER = 'wealthtech_mcp_ssh_bridge';

const allowedTextExtensions = [
  '.ts',
  '.js',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.txt'
];

const allowedSpecialFiles = new Set([
  'Dockerfile',
  'docker-compose.yml',
  'compose.yml',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'README.md',
  'CODESPACES.md',
  'MCP_PROJECT.md',
  'MCP_AGENT_RULES.md',
  'MCP_REPO_INVENTORY.md',
  'MCP_SERVER_MAPPING.md'
]);

const forbiddenPathFragments = [
  '.env',
  '.env.',
  'secrets/',
  'keys/',
  'id_rsa',
  '.pem',
  '.key',
  '.p12',
  '.crt',
  '.sql',
  '.dump',
  'node_modules/',
  '.git/',
  'dist/',
  'build/',
  'coverage/'
];

const RelativePathSchema = z.string()
  .min(1)
  .max(260)
  .refine((value) => !value.startsWith('/') && !value.includes('..') && !value.includes('\\'), 'Chemin relatif MCP invalide.')
  .refine((value) => !forbiddenPathFragments.some((fragment) => value.includes(fragment)), 'Chemin interdit par la politique MCP.');

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function isAllowedTextFile(relativePath: string): boolean {
  if (allowedSpecialFiles.has(relativePath)) {
    return true;
  }

  return allowedTextExtensions.some((extension) => relativePath.endsWith(extension));
}

function assertAllowedCodePath(relativePath: string): void {
  if (!isAllowedTextFile(relativePath)) {
    throw new Error(`Fichier refusé: extension non autorisée (${relativePath}).`);
  }
}

function maskSecretsSed(): string {
  return `sed -E \\
  -e 's/(token|secret|password|privateKey|apiKey|accessToken|refreshToken)[[:space:]]*[:=][[:space:]]*["'\\''"][^"'\\''"]+["'\\''"]/\\1="***MASKED***"/Ig' \\
  -e 's/(Bearer )[A-Za-z0-9._~+\\/=-]+/\\1***MASKED***/g'`;
}

function safeReadCommand(relativePath: string): string {
  assertAllowedCodePath(relativePath);

  return `set -euo pipefail
cd ${shellQuote(MCP_ROOT)}
FILE=${shellQuote(relativePath)}
test -f "$FILE"
sed -n '1,420p' "$FILE" | ${maskSecretsSed()}`;
}

async function runS1Read(command: string) {
  const result = await runReadOnlyCommand('s1', command);
  return asText(commandResultToText(result));
}

async function runS1Write(command: string, intent: string, timeoutMs = 30_000) {
  const result = await runGuardedCommand('s1', command, {
    intent,
    timeoutMs,
    maxOutputBytes: 200_000
  });
  return asText(commandResultToText(result));
}

export function registerMcpSelfReadOnlyTools(server: McpServer): void {
  server.tool('mcp_bridge', 'Retourne la fiche du projet MCP auto-gérable.', {}, async () => asText(JSON.stringify({
    key: MCP_PROJECT_KEY,
    label: 'MCP Bridge WealthTech',
    root: MCP_ROOT,
    container: MCP_CONTAINER,
    server: 's1',
    github: {
      activeRemote: 'Patricked-code/MCP',
      futureTarget: 'chainsolutions-wealthtech/MCP'
    },
    safety: {
      freeShell: false,
      secretsReadable: false,
      writeRequiresAllowWrite: true,
      protectedPaths: forbiddenPathFragments
    }
  }, null, 2)));

  server.tool('mcp_git_status_s1', 'Affiche l’état Git du dépôt MCP sur S1.', {}, async () => runS1Read(`set -euo pipefail
cd ${shellQuote(MCP_ROOT)}
git status -sb
printf '\\nBranche courante:\\n'
git branch --show-current
printf '\\nDernier commit local:\\n'
git log -1 --oneline
printf '\\nDernier commit origin/main connu localement:\\n'
git log -1 --oneline origin/main || true
printf '\\nRemote:\\n'
git remote -v`));

  server.tool('mcp_git_diff_s1', 'Affiche le diff Git du dépôt MCP sur S1, sans secrets.', {}, async () => runS1Read(`set -euo pipefail
cd ${shellQuote(MCP_ROOT)}
git diff -- . ':(exclude).env' ':(exclude).env.*' ':(exclude)secrets/**' ':(exclude)keys/**' ':(exclude)node_modules/**' | ${maskSecretsSed()}`));

  server.tool('list_mcp_code_files_s1', 'Liste les fichiers utiles du code MCP sur S1, hors secrets et node_modules.', {}, async () => runS1Read(`set -euo pipefail
cd ${shellQuote(MCP_ROOT)}
find . -maxdepth 5 \\
  -path './.git' -prune -o \\
  -path './node_modules' -prune -o \\
  -path './dist' -prune -o \\
  -path './build' -prune -o \\
  -path './coverage' -prune -o \\
  -path './keys' -prune -o \\
  -path './secrets' -prune -o \\
  -type f \\
  \\( -name '*.ts' -o -name '*.js' -o -name '*.json' -o -name '*.md' -o -name '*.yml' -o -name '*.yaml' -o -name 'Dockerfile' -o -name 'docker-compose.yml' -o -name 'compose.yml' \\) \\
  ! -name '.env' ! -name '.env.*' ! -name '*.pem' ! -name '*.key' ! -name '*.crt' ! -name '*.p12' ! -name '*.sql' ! -name '*.dump' \\
  -print | sort | head -700`));

  server.tool('read_mcp_code_file_s1', 'Lit un fichier texte autorisé du code MCP sur S1, avec masquage de secrets.', {
    path: RelativePathSchema
  }, async ({ path }) => runS1Read(safeReadCommand(path)));

  server.tool('search_mcp_code_s1', 'Recherche un terme dans le code MCP sur S1, hors secrets et node_modules.', {
    query: z.string().min(2).max(80).regex(/^[A-Za-z0-9_.:/ -]+$/)
  }, async ({ query }) => runS1Read(`set -euo pipefail
cd ${shellQuote(MCP_ROOT)}
grep -RIn --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=coverage --exclude-dir=keys --exclude-dir=secrets --exclude='*.pem' --exclude='*.key' --exclude='.env' --exclude='.env.*' ${shellQuote(query)} src docs Migration .mcp data package.json README.md 2>/dev/null | head -160 | ${maskSecretsSed()}`));

  server.tool('scan_mcp_secrets_s1', 'Scanne le dépôt MCP pour détecter des secrets potentiels, sans afficher les valeurs.', {}, async () => runS1Read(`set -euo pipefail
cd ${shellQuote(MCP_ROOT)}
printf 'Scan secrets MCP — valeurs masquées\\n'
printf 'Chemin: ${MCP_ROOT}\\n\\n'
git ls-files --others --cached --exclude-standard \\
  | grep -Ev '(^|/)(node_modules|dist|build|coverage|\\.git|keys|secrets)/' \\
  | grep -Ev '(^|/)(\\.env|\\.env\\.|.*\\.pem|.*\\.key|.*\\.crt|.*\\.p12|.*\\.sql|.*\\.dump)$' \\
  | xargs -r grep -InE '(token|secret|password|privateKey|apiKey|accessToken|refreshToken|BEGIN RSA|BEGIN OPENSSH|Bearer )' 2>/dev/null \\
  | ${maskSecretsSed()} \\
  | head -200 || true
printf '\\nScan terminé. Si aucune ligne sensible réelle ne sort, c’est bon signe.\\n'`));

  server.tool('mcp_container_logs_s1', 'Affiche les dernières lignes de logs Docker du conteneur MCP sur S1.', {
    lines: z.number().int().min(20).max(300).default(120)
  }, async ({ lines }) => runS1Read(`docker logs --tail ${Number(lines)} ${MCP_CONTAINER} 2>&1 | ${maskSecretsSed()}`));
}

export function registerMcpSelfWriteTools(server: McpServer): void {
  server.tool('mcp_sync_from_github_s1', 'Synchronise le dépôt MCP S1 avec origin/main par fast-forward uniquement.', {
    allow_write: z.boolean().default(false)
  }, async ({ allow_write }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    assertWriteFlag(allow_write, 'mcp_sync_from_github_s1');
    return runS1Write(buildMcpGitSyncCommand(), 'mcp_sync_from_github_s1', 120_000);
  });

  server.tool('patch_mcp_code_file_s1', 'Écrit ou remplace un fichier texte autorisé du dépôt MCP sur S1 via contenu base64. Ne lit ni n’écrit les secrets.', {
    path: RelativePathSchema,
    content_base64: z.string().min(1).max(700_000).regex(/^[A-Za-z0-9+/=\\r\\n]+$/),
    allow_write: z.boolean().default(false)
  }, async ({ path, content_base64, allow_write }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    assertWriteFlag(allow_write, 'patch_mcp_code_file_s1');
    assertAllowedCodePath(path);

    const command = `set -euo pipefail
cd ${shellQuote(MCP_ROOT)}
TARGET=${shellQuote(path)}
CONTENT_B64=${shellQuote(content_base64)}
case "$TARGET" in
  *..*|/*|*.env|*.env.*|*.pem|*.key|*.crt|*.p12|*.sql|*.dump|secrets/*|keys/*|node_modules/*|.git/*|dist/*|build/*|coverage/*)
    echo "Chemin refusé par la politique MCP: $TARGET"
    exit 22
    ;;
esac
mkdir -p "$(dirname "$TARGET")"
if [ -f "$TARGET" ]; then
  mkdir -p .mcp_backups
  cp "$TARGET" ".mcp_backups/$(echo "$TARGET" | tr '/' '_').$(date +%Y%m%d_%H%M%S).bak"
fi
printf '%s' "$CONTENT_B64" | base64 -d > "$TARGET"
echo "Fichier MCP écrit: $TARGET"
git status -sb
git diff -- "$TARGET" | ${maskSecretsSed()} | head -260`;
    return runS1Write(command, 'patch_mcp_code_file_s1', 30_000);
  });

  server.tool('mcp_typecheck_s1', 'Lance le typecheck TypeScript du MCP sur S1 via Node 20 Docker.', {
    allow_write: z.boolean().default(false)
  }, async ({ allow_write }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    assertWriteFlag(allow_write, 'mcp_typecheck_s1');
    return runS1Write(`set -euo pipefail
cd ${shellQuote(MCP_ROOT)}
docker run --rm -v "$PWD:/work" -w /work node:20-alpine sh -lc 'npm install --package-lock=false && npm run typecheck'`, 'mcp_typecheck_s1', 180_000);
  });

  server.tool('mcp_build_s1', 'Build le MCP sur S1 via Node 20 Docker.', {
    allow_write: z.boolean().default(false)
  }, async ({ allow_write }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    assertWriteFlag(allow_write, 'mcp_build_s1');
    return runS1Write(`set -euo pipefail
cd ${shellQuote(MCP_ROOT)}
docker run --rm -v "$PWD:/work" -w /work node:20-alpine sh -lc 'npm install --package-lock=false && npm run build'`, 'mcp_build_s1', 180_000);
  });

  server.tool('restart_mcp_bridge_s1', 'Redémarre le conteneur MCP sur S1 après validation.', {
    allow_write: z.boolean().default(false)
  }, async ({ allow_write }) => {
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
    assertWriteFlag(allow_write, 'restart_mcp_bridge_s1');
    return runS1Write(`set -euo pipefail
cd ${shellQuote(MCP_ROOT)}
docker compose up -d --build
sleep 5
docker ps --filter name=${MCP_CONTAINER} --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"
curl -s http://127.0.0.1:8787/health || true`, 'restart_mcp_bridge_s1', 240_000);
  });
}
