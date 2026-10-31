/**
 * Governed, single-file S1 recovery for a GitHub-approved change that already
 * exists byte-identically in the MCP S1 working tree.
 *
 * Never fetches from a push remote, never checks out, resets, cleans, stashes,
 * or overwrites the file; a full local backup is retained before ref changes.
 * No deployment/restart or authorization is granted by this command builder.
 */
const SHA=/^[a-f0-9]{40}$/;
export const S1_ACCOUNT_REGISTRY='data/github-accounts.json';
const MCP_ROOT='/opt/apps/wealthtech-mcp-ssh-bridge';

export function buildMcpS1ExactContentReconcileCommand(
  expectedS1Head:string,
  approvedMainHead:string
):string{
  if(!SHA.test(expectedS1Head)||!SHA.test(approvedMainHead)
    ||expectedS1Head===approvedMainHead){
    throw new Error('E2_EXACT_SHA_RECONCILIATION_INPUT_INVALID');
  }
  return `set -euo pipefail
cd '${MCP_ROOT}'
umask 077
EXPECTED_S1_HEAD='${expectedS1Head}'
APPROVED_MAIN_HEAD='${approvedMainHead}'
FILE='data/github-accounts.json'
EXPECTED_FETCH_REMOTE='git@github.com-mcp-patricked-ro:Patricked-code/MCP.git'
EXPECTED_PUSH_REMOTE='disabled://mcp-s1-read-only'

# Do not collide with any other governed operation.
exec 9> .git/e2-registry-reconcile.lock
flock -n 9 || { echo 'E2_RECONCILIATION_LOCKED'; exit 70; }

[ "$(git branch --show-current)" = 'main' ] || { echo 'E2_NOT_MAIN'; exit 71; }
[ "$(git remote get-url origin)" = "$EXPECTED_FETCH_REMOTE" ] || { echo 'E2_FETCH_REMOTE_CHANGED'; exit 72; }
[ "$(git remote get-url --push origin)" = "$EXPECTED_PUSH_REMOTE" ] || { echo 'E2_PUSH_REMOTE_CHANGED'; exit 73; }
[ "$(git rev-parse HEAD)" = "$EXPECTED_S1_HEAD" ] || { echo 'E2_S1_SHA_CHANGED'; exit 74; }
[ ! -L "$FILE" ] && [ -f "$FILE" ] || { echo 'E2_REGISTRY_NOT_REGULAR'; exit 75; }

# The exact known local modification must be the ONLY worktree difference.
STATUS="$(git status --porcelain --untracked-files=all)"
[ "$STATUS" = ' M data/github-accounts.json' ] || { echo 'E2_UNEXPECTED_WORKTREE'; exit 76; }
git diff --cached --quiet || { echo 'E2_INDEX_DIRTY'; exit 77; }

git -c core.hooksPath=/dev/null fetch --no-tags origin main
REMOTE_MAIN="$(git rev-parse FETCH_HEAD)"
[ "$REMOTE_MAIN" = "$APPROVED_MAIN_HEAD" ] || { echo 'E2_GITHUB_MAIN_MOVED'; exit 78; }
git merge-base --is-ancestor "$EXPECTED_S1_HEAD" "$REMOTE_MAIN" || { echo 'E2_MAIN_NOT_FAST_FORWARD'; exit 79; }
[ "$(git diff --name-only "$EXPECTED_S1_HEAD" "$REMOTE_MAIN")" = "$FILE" ] || {
 echo 'E2_REMOTE_SCOPE_NOT_SINGLE_REGISTRY_FILE'; exit 80;
}
TARGET_BLOB="$(git rev-parse "FETCH_HEAD:$FILE")"
LOCAL_BLOB="$(git hash-object -- "$FILE")"
[ "$TARGET_BLOB" = "$LOCAL_BLOB" ] || { echo 'E2_LOCAL_CONTENT_DIFFERS_FROM_APPROVED_MAIN'; exit 81; }

# Store an immutable copy in the repository's pre-existing ignored backup area.
mkdir -p .mcp_backups
BACKUP_DIR="$(mktemp -d .mcp_backups/e2-account-reconcile-XXXXXXXX)"
cp -- "$FILE" "$BACKUP_DIR/github-accounts.json"
[ "$(git hash-object -- "$BACKUP_DIR/github-accounts.json")" = "$TARGET_BLOB" ] || {
 echo 'E2_BACKUP_HASH_MISMATCH'; exit 82;
}
[ "$(git status --porcelain --untracked-files=all)" = ' M data/github-accounts.json' ] || {
 echo 'E2_WORKTREE_CHANGED_AFTER_BACKUP'; exit 83;
}

# The working file is NOT written. Advance only main's Git ref and reconcile
# the index from the already identical local file.
git update-ref refs/heads/main "$REMOTE_MAIN" "$EXPECTED_S1_HEAD"
git add -- "$FILE"
[ "$(git rev-parse HEAD)" = "$APPROVED_MAIN_HEAD" ] || { echo 'E2_REF_ATTESTATION_FAILED'; exit 84; }
[ "$(git hash-object -- "$FILE")" = "$TARGET_BLOB" ] || { echo 'E2_CONTENT_CHANGED'; exit 85; }
[ -z "$(git status --porcelain --untracked-files=all)" ] || { echo 'E2_WORKTREE_NOT_CLEAN'; exit 86; }
printf 'E2_S1_GIT_RECONCILED=YES\\n'
printf 'GITHUB_MAIN_SHA=%s\\n' "$REMOTE_MAIN"
printf 'LOCAL_FILE_BLOB=%s\\n' "$TARGET_BLOB"
printf 'BACKUP_DIR=%s\\n' "$BACKUP_DIR"
printf 'RUNTIME_REDEPLOY_REQUIRED=YES\\n'`;
}
