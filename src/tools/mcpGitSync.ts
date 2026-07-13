const MCP_ROOT = '/opt/apps/wealthtech-mcp-ssh-bridge';
const MCP_GITHUB_REPOSITORY = 'Patricked-code/MCP';

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function buildMcpGitSyncCommand(): string {
  return `set -euo pipefail
cd ${shellQuote(MCP_ROOT)}

EXPECTED_BRANCH='main'
CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
  echo "Synchronisation MCP refusée: branche courante $CURRENT_BRANCH, branche attendue $EXPECTED_BRANCH."
  exit 31
fi

REMOTE_URL="$(git remote get-url origin)"
case "$REMOTE_URL" in
  'https://github.com/${MCP_GITHUB_REPOSITORY}.git'|'git@github.com:${MCP_GITHUB_REPOSITORY}.git'|'git@github.com-mcp-patricked-rw:${MCP_GITHUB_REPOSITORY}.git')
    ;;
  *)
    echo "Synchronisation MCP refusée: remote origin inattendu."
    exit 32
    ;;
esac

if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
  echo "Synchronisation MCP refusée: le dépôt contient des modifications ou fichiers non suivis."
  git status -sb
  exit 33
fi

LOCAL_BEFORE="$(git rev-parse HEAD)"
git -c core.hooksPath=/dev/null fetch --no-tags origin main
REMOTE_MAIN="$(git rev-parse FETCH_HEAD)"

if [ "$LOCAL_BEFORE" = "$REMOTE_MAIN" ]; then
  echo "MCP déjà synchronisé avec origin/main."
elif git merge-base --is-ancestor "$LOCAL_BEFORE" "$REMOTE_MAIN"; then
  git -c core.hooksPath=/dev/null merge --ff-only "$REMOTE_MAIN"
else
  echo "Synchronisation MCP refusée: divergence ou historique local non fast-forward."
  exit 34
fi

LOCAL_AFTER="$(git rev-parse HEAD)"
if [ "$LOCAL_AFTER" != "$REMOTE_MAIN" ]; then
  echo "Synchronisation MCP échouée: le commit local final ne correspond pas à origin/main."
  exit 35
fi

if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
  echo "Synchronisation MCP échouée: le dépôt n'est plus propre après fast-forward."
  git status -sb
  exit 36
fi

printf 'Synchronisation MCP GitHub vers S1 validée.\n'
printf 'Avant: %s\n' "$LOCAL_BEFORE"
printf 'Après: %s\n' "$LOCAL_AFTER"
git status -sb
git log -1 --oneline`;
}
