import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from '../config/env.js';
import { runGuardedCommand } from '../ssh/client.js';
import { assertScopedWriteToolsEnabled, assertWriteFlag } from '../ssh/writeSafety.js';
import { asText, commandResultToText } from './format.js';
import { buildMcpRuntimeImageAttestationCommand } from './runtimeAttestation.js';

export const MCP_ACTIVE_ROOT = '/opt/apps/wealthtech-mcp-ssh-bridge';
export const MCP_RECOVERY_ROOT = '/opt/apps/wealthtech-mcp-recovery';
export const MCP_CANONICAL_REMOTE = 'https://github.com/Patricked-code/MCP.git';

const GitShaSchema = z.string().regex(/^[a-f0-9]{40}$/i, 'SHA Git complet de 40 caractères obligatoire.');

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function safeUntrackedFilterCase(): string {
  return `case "$FILE" in
  .env|.env.*|*/.env|*/.env.*|*/.env/*|secrets/*|*/secrets/*|keys/*|*/keys/*|node_modules/*|*/node_modules/*|dist/*|*/dist/*|build/*|*/build/*|coverage/*|*/coverage/*|logs/*|*/logs/*|.mcp_backups/*|*/.mcp_backups/*|*.pem|*.key|*.crt|*.p12|*.pfx|*.sql|*.dump|*.sqlite|*.sqlite3|*.db)
    EXCLUDED_COUNT=$((EXCLUDED_COUNT + 1))
    ;;
  *)
    printf '%s\\0' "$FILE" >> "$SAFE_LIST"
    ;;
esac`;
}

export function buildMcpRecoveryCandidatePreparationCommand(expectedMainSha: string): string {
  const expected = GitShaSchema.parse(expectedMainSha).toLowerCase();
  const dockerAttestation = buildMcpRuntimeImageAttestationCommand();

  return `set -euo pipefail
umask 077
ACTIVE_ROOT=${shellQuote(MCP_ACTIVE_ROOT)}
RECOVERY_ROOT=${shellQuote(MCP_RECOVERY_ROOT)}
CANONICAL_REMOTE=${shellQuote(MCP_CANONICAL_REMOTE)}
EXPECTED_MAIN_SHA=${shellQuote(expected)}

printf 'MCP recovery preparation — no active-tree mutation\\n'

test -d "$ACTIVE_ROOT/.git"
test ! -L "$RECOVERY_ROOT"
CURRENT_REMOTE="$(git -C "$ACTIVE_ROOT" remote get-url origin)"
case "$CURRENT_REMOTE" in
  https://github.com/Patricked-code/MCP|https://github.com/Patricked-code/MCP.git|git@github.com:Patricked-code/MCP.git)
    ;;
  *)
    printf 'ERREUR: remote actif non autorisé.\\n' >&2
    exit 21
    ;;
esac

REMOTE_MAIN_SHA="$(git ls-remote "$CANONICAL_REMOTE" refs/heads/main | awk 'NR == 1 { print $1 }')"
if [ "$REMOTE_MAIN_SHA" != "$EXPECTED_MAIN_SHA" ]; then
  printf 'ERREUR: SHA demandé différent du main GitHub distant.\\n' >&2
  printf 'expected=%s\\nremote_main=%s\\n' "$EXPECTED_MAIN_SHA" "$REMOTE_MAIN_SHA" >&2
  exit 22
fi

RUN_ID="$(date -u +%Y%m%d_%H%M%S)"
SNAPSHOT_ROOT="$RECOVERY_ROOT/snapshots/$RUN_ID"
CANDIDATE_ROOT="$RECOVERY_ROOT/candidates/$RUN_ID"

test ! -e "$SNAPSHOT_ROOT"
test ! -e "$CANDIDATE_ROOT"
install -d -m 700 "$RECOVERY_ROOT" "$RECOVERY_ROOT/snapshots" "$RECOVERY_ROOT/candidates"
install -d -m 700 "$SNAPSHOT_ROOT" "$CANDIDATE_ROOT"

SOURCE_HEAD="$(git -C "$ACTIVE_ROOT" rev-parse HEAD)"
SOURCE_BRANCH="$(git -C "$ACTIVE_ROOT" branch --show-current)"
printf '%s\\n' "$SOURCE_HEAD" > "$SNAPSHOT_ROOT/source-head.txt"
printf '%s\\n' "$SOURCE_BRANCH" > "$SNAPSHOT_ROOT/source-branch.txt"
printf '%s\\n' 'Patricked-code/MCP' > "$SNAPSHOT_ROOT/source-remote.txt"
git -C "$ACTIVE_ROOT" status --porcelain=v2 --branch > "$SNAPSHOT_ROOT/source-status.txt"
git -C "$ACTIVE_ROOT" bundle create "$SNAPSHOT_ROOT/repository.bundle" --all

git -C "$ACTIVE_ROOT" diff --binary HEAD -- . \\
  ':(exclude,glob)**/.env' \\
  ':(exclude,glob)**/.env.*' \\
  ':(exclude,glob)**/secrets/**' \\
  ':(exclude,glob)**/keys/**' \\
  ':(exclude,glob)**/node_modules/**' \\
  ':(exclude,glob)**/dist/**' \\
  ':(exclude,glob)**/build/**' \\
  ':(exclude,glob)**/coverage/**' \\
  ':(exclude,glob)**/logs/**' \\
  > "$SNAPSHOT_ROOT/working-tree.patch"

SAFE_LIST="$SNAPSHOT_ROOT/safe-untracked.list0"
: > "$SAFE_LIST"
EXCLUDED_COUNT=0
while IFS= read -r -d '' FILE; do
  ${safeUntrackedFilterCase()}
done < <(git -C "$ACTIVE_ROOT" ls-files --others --exclude-standard -z)

SAFE_COUNT="$(tr -cd '\\0' < "$SAFE_LIST" | wc -c | tr -d ' ')"
printf '%s\\n' "$SAFE_COUNT" > "$SNAPSHOT_ROOT/safe-untracked-count.txt"
printf '%s\\n' "$EXCLUDED_COUNT" > "$SNAPSHOT_ROOT/excluded-untracked-count.txt"

if [ "$SAFE_COUNT" -gt 0 ]; then
  tar -C "$ACTIVE_ROOT" --null --verbatim-files-from --files-from="$SAFE_LIST" -czf "$SNAPSHOT_ROOT/safe-untracked.tar.gz"
else
  printf 'Aucun fichier non suivi autorisé.\\n' > "$SNAPSHOT_ROOT/safe-untracked-empty.txt"
fi

(
${dockerAttestation}
) > "$SNAPSHOT_ROOT/docker-attestation.txt"

git -C "$CANDIDATE_ROOT" init -q
git -C "$CANDIDATE_ROOT" remote add origin "$CANONICAL_REMOTE"
git -C "$CANDIDATE_ROOT" -c core.hooksPath=/dev/null fetch --depth=1 origin main
FETCHED_SHA="$(git -C "$CANDIDATE_ROOT" rev-parse FETCH_HEAD)"
if [ "$FETCHED_SHA" != "$EXPECTED_MAIN_SHA" ]; then
  printf 'ERREUR: le clone candidat ne pointe pas vers le SHA attendu.\\n' >&2
  exit 23
fi
git -C "$CANDIDATE_ROOT" -c core.hooksPath=/dev/null -c advice.detachedHead=false checkout --detach "$EXPECTED_MAIN_SHA"
test "$(git -C "$CANDIDATE_ROOT" rev-parse HEAD)" = "$EXPECTED_MAIN_SHA"
test "$(git -C "$CANDIDATE_ROOT" remote get-url origin)" = "$CANONICAL_REMOTE"
test -z "$(git -C "$CANDIDATE_ROOT" status --porcelain)"
printf '%s\\n' "$EXPECTED_MAIN_SHA" > "$SNAPSHOT_ROOT/candidate-head.txt"
printf '%s\\n' 'Patricked-code/MCP' > "$SNAPSHOT_ROOT/candidate-remote.txt"
printf '%s\\n' "$CANDIDATE_ROOT" > "$SNAPSHOT_ROOT/candidate-root.txt"

(
  cd "$SNAPSHOT_ROOT"
  find . -maxdepth 1 -type f ! -name SHA256SUMS -printf '%P\\0' \\
    | sort -z \\
    | xargs -0 sha256sum \\
    > SHA256SUMS
)
chmod -R go-rwx "$RECOVERY_ROOT"
MANIFEST_SHA="$(sha256sum "$SNAPSHOT_ROOT/SHA256SUMS" | awk '{ print $1 }')"

printf 'status=prepared\\n'
printf 'run_id=%s\\n' "$RUN_ID"
printf 'expected_main_sha=%s\\n' "$EXPECTED_MAIN_SHA"
printf 'source_head=%s\\n' "$SOURCE_HEAD"
printf 'source_branch=%s\\n' "$SOURCE_BRANCH"
printf 'safe_untracked_count=%s\\n' "$SAFE_COUNT"
printf 'excluded_untracked_count=%s\\n' "$EXCLUDED_COUNT"
printf 'snapshot_root=%s\\n' "$SNAPSHOT_ROOT"
printf 'candidate_root=%s\\n' "$CANDIDATE_ROOT"
printf 'manifest_sha256=%s\\n' "$MANIFEST_SHA"
printf 'production_modified=false\\n'
printf 'candidate_validated=false\\n'`;
}

export function registerRecoveryCandidateWriteTools(server: McpServer): void {
  server.tool(
    'mcp_prepare_recovery_candidate_s1',
    'Crée hors du dépôt actif un snapshot forensique local et un clone candidat au SHA exact de main, sans checkout, reset, clean, build ou restart de production.',
    {
      expected_main_sha: GitShaSchema,
      allow_write: z.boolean().default(false)
    },
    async ({ expected_main_sha, allow_write }) => {
      assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
      assertWriteFlag(allow_write, 'mcp_prepare_recovery_candidate_s1');
      const result = await runGuardedCommand('s1', buildMcpRecoveryCandidatePreparationCommand(expected_main_sha), {
        intent: 'mcp_prepare_recovery_candidate_s1',
        timeoutMs: 180_000,
        maxOutputBytes: 40_000
      });
      return asText(commandResultToText(result));
    }
  );
}
