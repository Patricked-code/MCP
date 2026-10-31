/**
 * General-purpose, non-destructive MCP S1 -> approved GitHub main Git reconciliation.
 * This is NOT a GitHub PR/merge endpoint. In the unpublished-change direction,
 * the separate GitHub-first governed PR process must promote reviewed content.
 * The same file contents must already exist in approved main before this applies.
 */
const SHA=/^[a-f0-9]{40}$/;
const MCP_ROOT='/opt/apps/wealthtech-mcp-ssh-bridge';
const FETCH_REMOTE='git@github.com-mcp-patricked-ro:Patricked-code/MCP.git';
const PUSH_DISABLED='disabled://mcp-s1-read-only';
/** E2 selection is a scope gate, not a substitute for write authorization. */
export function assertE2OnlyReconciliation(profile:unknown,selected:unknown):void{
  if(profile!=='EXTERNAL_GOVERNED_RECOVERY'||selected!==true)
    throw new Error('E2_EXPLICIT_SELECTION_REQUIRED');
}


export function buildMcpReconcileS1ToMainCommand(
  expectedS1Sha:string,approvedMainSha:string,
  profile:'EXTERNAL_GOVERNED_RECOVERY',explicitlySelected:boolean
):string{
 assertE2OnlyReconciliation(profile,explicitlySelected);
 if(!SHA.test(expectedS1Sha)||!SHA.test(approvedMainSha)
   ||expectedS1Sha===approvedMainSha)throw new Error('E2_SHA_INPUT_INVALID');
 return `set -euo pipefail
cd '${MCP_ROOT}'
umask 077
EXPECTED_S1='${expectedS1Sha}'
EXPECTED_MAIN='${approvedMainSha}'
# Shared deployment lock: no collision with the existing Governed Deploy worker.
exec 9>/opt/apps/wealthtech-mcp-deploy/deploy.lock
flock -n 9 || { echo 'E2_DEPLOY_CONCURRENT'; exit 70; }
[ "$(git branch --show-current)" = main ] || { echo 'E2_NOT_MAIN'; exit 71; }
[ "$(git remote get-url origin)" = '${FETCH_REMOTE}' ] || { echo 'E2_REMOTE_CHANGED'; exit 72; }
[ "$(git remote get-url --push origin)" = '${PUSH_DISABLED}' ] || { echo 'E2_PUSH_REMOTE_NOT_DISABLED'; exit 73; }
[ "$(git rev-parse HEAD)" = "$EXPECTED_S1" ] || { echo 'E2_S1_SHA_CHANGED'; exit 74; }
git diff --cached --quiet || { echo 'E2_INDEX_DIRTY'; exit 75; }
[ -z "$(git ls-files --others --exclude-standard)" ] || { echo 'E2_UNTRACKED_FILES'; exit 76; }
# Only modifications of already tracked regular files can use the automatic path.
[ -z "$(git diff --name-only --diff-filter=ACDRTUXB)" ] || { echo 'E2_UNSAFE_FILE_CHANGE'; exit 77; }
mapfile -d '' -t FILES < <(git diff --name-only -z)
[ "\${#FILES[@]}" -gt 0 ] && [ "\${#FILES[@]}" -le 100 ] || { echo 'E2_UNEXPECTED_FILE_COUNT'; exit 78; }
for FILE in "\${FILES[@]}"; do
 case "$FILE" in
  *..*|/*|*\\*|.env|.env.*|*.pem|*.key|*.crt|*.p8|*.p12|*.sql|*.dump|secrets/*|*/secrets/*|keys/*|*/keys/*|node_modules/*|*/node_modules/*|dist/*|*/dist/*|.git/*|.mcp_backups/*)
   echo 'E2_PROTECTED_PATH'; exit 79 ;;
 esac
 [ -f "$FILE" ] && [ ! -L "$FILE" ] || { echo 'E2_NOT_REGULAR_FILE'; exit 80; }
 [ "$(wc -c < "$FILE")" -le 1000000 ] || { echo 'E2_FILE_TOO_LARGE'; exit 81; }
done
git -c core.hooksPath=/dev/null fetch --no-tags origin main
REMOTE="$(git rev-parse FETCH_HEAD)"
[ "$REMOTE" = "$EXPECTED_MAIN" ] || { echo 'E2_REMOTE_SHA_MOVED'; exit 82; }
git merge-base --is-ancestor "$EXPECTED_S1" "$REMOTE" || { echo 'E2_NOT_FAST_FORWARD'; exit 83; }
# Compare the complete path list at old and newly approved main.
cmp -s <(git diff --name-only -z) <(git diff --name-only -z "$EXPECTED_S1" "$REMOTE") || {
 echo 'E2_SCOPE_MISMATCH'; exit 84;
}
for FILE in "\${FILES[@]}"; do
 LOCAL_BLOB="$(git hash-object -- "$FILE")"
 EXPECTED_BLOB="$(git rev-parse "FETCH_HEAD:$FILE")"
 [ "$LOCAL_BLOB" = "$EXPECTED_BLOB" ] || { echo 'E2_LOCAL_CONTENT_NOT_APPROVED'; exit 85; }
done
# Retain every file, including its relative path, in an ignored private backup.
mkdir -p .mcp_backups
BACKUP="$(mktemp -d .mcp_backups/e2-main-XXXXXXXX)"
for FILE in "\${FILES[@]}"; do
 mkdir -p "$BACKUP/$(dirname "$FILE")"
 cp -- "$FILE" "$BACKUP/$FILE"
 [ "$(git hash-object -- "$BACKUP/$FILE")" = "$(git hash-object -- "$FILE")" ] || {
  echo 'E2_BACKUP_VERIFICATION_FAILED'; exit 86;
 }
done
# No ref mutation until ALL previous checks and backup verifications succeed.
cmp -s <(git diff --name-only -z) <(git diff --name-only -z "$EXPECTED_S1" "$REMOTE") || {
 echo 'E2_STATE_CHANGED'; exit 87;
}
git update-ref refs/heads/main "$REMOTE" "$EXPECTED_S1"
git add -- "\${FILES[@]}"
[ "$(git rev-parse HEAD)" = "$REMOTE" ] || { echo 'E2_REF_NOT_ALIGNED'; exit 88; }
[ -z "$(git status --porcelain --untracked-files=all)" ] || { echo 'E2_WORKTREE_NOT_CLEAN'; exit 89; }
printf 'E2_GIT_CONVERGED=YES\\n'
printf 'MAIN_SHA=%s\\n' "$REMOTE"
printf 'FILE_COUNT=%s\\n' "\${#FILES[@]}"
printf 'BACKUP_DIR=%s\\n' "$BACKUP"
printf 'DEPLOY_RUNTIME_ATTESTATION_REQUIRED=YES\\n'`;
}
