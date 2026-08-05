import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from '../config/env.js';
import { runGuardedCommand, runReadOnlyCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';
import { assertScopedWriteToolsEnabled, assertWriteFlag } from '../ssh/writeSafety.js';

const ROOT = '/opt/apps/nigeria-opcvm-pipeline';
const REPO = 'https://github.com/Patricked-code/Nigeria.git';

const BranchSchema = z.string().min(1).max(120)
  .regex(/^(main|master|feature\/[A-Za-z0-9._-]+|claude\/[A-Za-z0-9._-]+)$/);

const forbidden = ['.git/','node_modules/','dist/','build/','coverage/','secrets/','keys/','data/raw/','data/archive/','data/incoming/','.pem','.key','.p12','.crt','.dump'];
const PathSchema = z.string().min(1).max(300)
  .refine(v => !v.startsWith('/') && !v.includes('..') && !v.includes('\\'))
  .refine(v => v === '.env.example' || !v.startsWith('.env'))
  .refine(v => !forbidden.some(f => v.includes(f)));

function q(v:string){ return `'${v.replace(/'/g, `'"'"'`)}'`; }
async function read(command:string){
  const r=await runReadOnlyCommand('s2',command);
  return asText(commandResultToText(r));
}
async function write(command:string,intent:string,timeoutMs=120000){
  const r=await runGuardedCommand('s2',command,{intent,timeoutMs,maxOutputBytes:300000});
  return asText(commandResultToText(r));
}

export function registerNigeriaScopedTools(server:McpServer):void {
  server.tool('nigeria_project_status_s2','Etat read-only du projet Nigeria sur S2.',{},async()=>read(`set -euo pipefail
ROOT=${q(ROOT)}
REPO=${q(REPO)}
printf 'Projet: Nigeria OPCVM Data Factory\nChemin: %s\nDepot: %s\n\n' "$ROOT" "$REPO"
if [ ! -d "$ROOT/.git" ]; then echo 'STATUS=NOT_INITIALIZED'; exit 0; fi
cd "$ROOT"
echo 'STATUS=INITIALIZED'
git status -sb
echo
git branch --show-current
git log -1 --oneline || true
git remote -v`));

  server.tool('nigeria_bootstrap_s2','Clone Patricked-code/Nigeria sur S2 et prépare une branche contrôlée.',{
    branch:BranchSchema,
    allow_write:z.boolean().default(false)
  },async({branch,allow_write})=>{
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS); assertWriteFlag(allow_write,'nigeria_bootstrap_s2');
    return write(`set -euo pipefail
ROOT=${q(ROOT)}
REPO=${q(REPO)}
BRANCH=${q(branch)}
mkdir -p "$(dirname "$ROOT")"
if [ ! -d "$ROOT/.git" ]; then
  if [ -e "$ROOT" ] && [ -n "$(ls -A "$ROOT" 2>/dev/null || true)" ]; then echo 'ERREUR: chemin non vide'; exit 31; fi
  rm -rf "$ROOT"
  git clone "$REPO" "$ROOT"
fi
cd "$ROOT"
ACTUAL="$(git remote get-url origin)"
case "$ACTUAL" in "$REPO"|https://github.com/Patricked-code/Nigeria|git@github.com:Patricked-code/Nigeria.git) ;; *) echo "ERREUR remote: $ACTUAL"; exit 32;; esac
git fetch origin --prune || true
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then git switch "$BRANCH"
elif git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then git switch -c "$BRANCH" --track "origin/$BRANCH"
elif git rev-parse --verify HEAD >/dev/null 2>&1; then git switch -c "$BRANCH"
else git switch --orphan "$BRANCH"
fi
git status -sb
git remote -v`, 'nigeria_bootstrap_s2',180000);
  });

  server.tool('nigeria_patch_file_s2','Ecrit un fichier texte autorisé du projet Nigeria.',{
    path:PathSchema,
    content_base64:z.string().min(1).max(900000).regex(/^[A-Za-z0-9+/=\r\n]+$/),
    allow_write:z.boolean().default(false)
  },async({path,content_base64,allow_write})=>{
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS); assertWriteFlag(allow_write,'nigeria_patch_file_s2');
    return write(`set -euo pipefail
ROOT=${q(ROOT)}
TARGET=${q(path)}
B64=${q(content_base64)}
test -d "$ROOT/.git"
cd "$ROOT"
mkdir -p "$(dirname "$TARGET")"
printf '%s' "$B64" | base64 -d > "$TARGET"
echo "Ecrit: $TARGET"
git status -sb
git diff -- "$TARGET" | head -260`, `nigeria_patch_file_s2:${path}`,60000);
  });

  server.tool('nigeria_commit_push_s2','Teste, commit et push la branche Nigeria.',{
    branch:BranchSchema,
    message:z.string().min(5).max(180),
    allow_write:z.boolean().default(false)
  },async({branch,message,allow_write})=>{
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS); assertWriteFlag(allow_write,'nigeria_commit_push_s2');
    return write(`set -euo pipefail
ROOT=${q(ROOT)}
BRANCH=${q(branch)}
MESSAGE=${q(message)}
test -d "$ROOT/.git"
cd "$ROOT"
[ "$(git branch --show-current)" = "$BRANCH" ] || { echo 'Branche inattendue'; exit 34; }
if find . -type f -not -path './.git/*' -not -path './node_modules/*' -not -path './dist/*' -print0 | xargs -0 grep -IlE '(BEGIN (RSA|OPENSSH) PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})' 2>/dev/null | grep -q .; then echo 'Secret potentiel détecté'; exit 35; fi
if [ -f package.json ]; then npm install; npm run typecheck --if-present; npm test --if-present; npm run build --if-present; fi
git add -A -- . ':(exclude)data/raw/**' ':(exclude)data/archive/**' ':(exclude)data/incoming/**'
if ! git diff --cached --quiet; then git commit -m "$MESSAGE"; fi
git push -u origin "$BRANCH"
git status -sb
git log -1 --oneline`, 'nigeria_commit_push_s2',900000);
  });

  server.tool('nigeria_deploy_s2','Déploie le projet Nigeria via Docker Compose après contrôles.',{
    branch:BranchSchema,
    allow_write:z.boolean().default(false)
  },async({branch,allow_write})=>{
    assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS); assertWriteFlag(allow_write,'nigeria_deploy_s2');
    return write(`set -euo pipefail
ROOT=${q(ROOT)}
BRANCH=${q(branch)}
test -d "$ROOT/.git"
cd "$ROOT"
[ "$(git branch --show-current)" = "$BRANCH" ] || { echo 'Branche inattendue'; exit 37; }
git diff --quiet && git diff --cached --quiet || { echo 'Arbre Git non propre'; git status -sb; exit 38; }
git fetch origin --prune
git pull --ff-only origin "$BRANCH"
if [ -f package.json ]; then npm install; npm run typecheck --if-present; npm test --if-present; npm run build --if-present; fi
if [ -f docker-compose.yml ] || [ -f compose.yml ]; then docker compose up -d --build; docker compose ps
else echo 'Aucun Docker Compose'; exit 39; fi
git log -1 --oneline`, 'nigeria_deploy_s2',900000);
  });
}
