import express from 'express';
import type { Router } from 'express';

import type { GithubOidcClaims } from '../deploy/githubOidc.js';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,80}$/;
const MAX_BEARER_BYTES = 16_384;

export type GithubReadonlyEvidenceTarget = 's1' | 's2';
export type GithubReadonlyEvidenceProbe =
  | 'mcp_git_status'
  | 'stablecoin_frontend_git_status'
  | 'stablecoin_backend_git_status'
  | 'stablecoin_backend_inventory'
  | 'stablecoin_runtime_status'
  | 'server_disk'
  | 'docker_status';

interface CommandResultLike {
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface GithubReadonlyEvidenceRouteDependencies {
  verifyOidc: (token: string, requestedSha: string) => Promise<GithubOidcClaims>;
  runRead: (
    target: GithubReadonlyEvidenceTarget,
    command: string
  ) => Promise<CommandResultLike>;
}

function bearerToken(value: string | undefined): string | null {
  if (!value || !value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length);
  if (!token || token.includes(' ') || Buffer.byteLength(token, 'utf8') > MAX_BEARER_BYTES) return null;
  return token;
}

function exactRequest(value: unknown): {
  sha: string;
  target: GithubReadonlyEvidenceTarget;
  probe: GithubReadonlyEvidenceProbe;
  requestId: string;
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(',') !== 'probe,requestId,sha,target') return null;

  const sha = typeof record.sha === 'string' ? record.sha.toLowerCase() : '';
  const target = record.target;
  const probe = record.probe;
  const requestId = record.requestId;

  if (!SHA_PATTERN.test(sha)) return null;
  if (target !== 's1' && target !== 's2') return null;
  if (
    probe !== 'mcp_git_status'
    && probe !== 'stablecoin_frontend_git_status'
    && probe !== 'stablecoin_backend_git_status'
    && probe !== 'stablecoin_backend_inventory'
    && probe !== 'stablecoin_runtime_status'
    && probe !== 'server_disk'
    && probe !== 'docker_status'
  ) return null;
  if (typeof requestId !== 'string' || !REQUEST_ID_PATTERN.test(requestId)) return null;
  if (probe === 'mcp_git_status' && target !== 's1') return null;
  if (
    (
      probe === 'stablecoin_frontend_git_status'
      || probe === 'stablecoin_backend_git_status'
      || probe === 'stablecoin_backend_inventory'
      || probe === 'stablecoin_runtime_status'
    )
    && target !== 's2'
  ) return null;

  return { sha, target, probe, requestId };
}

function redactedGitStatusCommand(path: string): string {
  return `set -euo pipefail
cd '${path}'
printf 'branch=%s\\n' "$(git branch --show-current)"
printf 'head=%s\\n' "$(git rev-parse HEAD)"
printf 'working_tree_changes=%s\\n' "$(git status --porcelain=v1 --untracked-files=all | wc -l | tr -d ' ')"
origin_url="$(git remote get-url origin 2>/dev/null || true)"
push_url="$(git remote get-url --push origin 2>/dev/null || true)"
printf 'origin_fetch=%s\\n' "$(printf '%s' "$origin_url" | sed -E 's#(https?://)[^/@[:space:]]+@#\\1***@#g')"
printf 'origin_push=%s\\n' "$(printf '%s' "$push_url" | sed -E 's#(https?://)[^/@[:space:]]+@#\\1***@#g')"`;
}

function optionalRedactedGitStatusCommand(path: string): string {
  return `set -u
path='${path}'
printf 'path=%s\\n' "$path"
if [ ! -d "$path" ]; then
  printf 'path_exists=false\\n'
  printf 'git_repo=false\\n'
  exit 0
fi
printf 'path_exists=true\\n'
if ! git -C "$path" rev-parse --git-dir >/dev/null 2>&1; then
  printf 'git_repo=false\\n'
  exit 0
fi
printf 'git_repo=true\\n'
branch="$(git -C "$path" branch --show-current 2>/dev/null || true)"
head="$(git -C "$path" rev-parse HEAD 2>/dev/null || true)"
status_output="$(git -C "$path" status --porcelain=v1 --untracked-files=all 2>/dev/null || true)"
if [ -n "$status_output" ]; then
  changes="$(printf '%s\\n' "$status_output" | wc -l | tr -d ' ')"
else
  changes='0'
fi
origin_url="$(git -C "$path" remote get-url origin 2>/dev/null || true)"
push_url="$(git -C "$path" remote get-url --push origin 2>/dev/null || true)"
[ -n "$branch" ] || branch='UNKNOWN'
[ -n "$head" ] || head='UNKNOWN'
[ -n "$origin_url" ] || origin_url='UNKNOWN'
[ -n "$push_url" ] || push_url='UNKNOWN'
printf 'branch=%s\\n' "$branch"
printf 'head=%s\\n' "$head"
printf 'working_tree_changes=%s\\n' "$changes"
printf 'origin_fetch=%s\\n' "$(printf '%s' "$origin_url" | sed -E 's#(https?://)[^/@[:space:]]+@#\\1***@#g')"
printf 'origin_push=%s\\n' "$(printf '%s' "$push_url" | sed -E 's#(https?://)[^/@[:space:]]+@#\\1***@#g')"
exit 0`;
}

function stablecoinBackendInventoryCommand(): string {
  return `set -u
root='/var/www/vhosts/chainsolutions.fr/api.stablecoin.chainsolutions.fr'
printf 'inventory_schema=1\\n'
if [ ! -d "$root" ]; then
  printf 'path_exists=false\\n'
  exit 0
fi
printf 'path_exists=true\\n'
node <<'NODE'
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = '/var/www/vhosts/chainsolutions.fr/api.stablecoin.chainsolutions.fr';

function clean(value) {
  return String(value ?? 'UNKNOWN').replace(/[\\r\\n|]/g, '_').slice(0, 500);
}

function line(key, value) {
  process.stdout.write(key + '=' + clean(value) + '\\n');
}

function sanitizeRepository(value) {
  if (!value) return 'UNKNOWN';
  let raw = typeof value === 'string' ? value : value.url;
  if (!raw) return 'UNKNOWN';
  raw = String(raw);
  raw = raw.replace(/(https?:\\/\\/)[^/@\\s]+@/gi, '$1***@');
  raw = raw.replace(/(https?:\\/\\/)[^/:@\\s]+:[^/@\\s]+@/gi, '$1***@');
  return raw;
}

function sha256File(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) return 'SKIPPED';
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  } catch {
    return 'UNAVAILABLE';
  }
}

const rootStat = fs.statSync(root);
line('root_realpath', fs.realpathSync(root));
line('root_uid', rootStat.uid);
line('root_gid', rootStat.gid);
line('root_mode', (rootStat.mode & 0o777).toString(8));
line('root_mtime', rootStat.mtime.toISOString());

const packagePath = path.join(root, 'package.json');
let pkg = {};
if (fs.existsSync(packagePath)) {
  line('package_exists', 'true');
  try {
    pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    line('package_name', pkg.name || 'UNKNOWN');
    line('package_version', pkg.version || 'UNKNOWN');
    line('package_main', pkg.main || 'UNKNOWN');
    line('package_type', pkg.type || 'UNKNOWN');
    line('package_private', pkg.private === true ? 'true' : pkg.private === false ? 'false' : 'UNKNOWN');
    line('package_repository', sanitizeRepository(pkg.repository));
    line('package_homepage', sanitizeRepository(pkg.homepage));
    line('package_script_names', Object.keys(pkg.scripts || {}).sort().join(',') || 'NONE');
    line('package_sha256', sha256File(packagePath));

    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const dep of [
      'express','sequelize','mysql2','mysql','pg','pg-hstore','mariadb','sqlite3',
      'mssql','passport','jsonwebtoken','bcrypt','bcryptjs','cors','dotenv'
    ]) {
      line('dependency_' + dep.replace(/-/g, '_'), deps[dep] || 'ABSENT');
    }
  } catch {
    line('package_parse', 'INVALID');
  }
} else {
  line('package_exists', 'false');
}

const known = [
  'server.js','app.js','index.js','bin/www',
  'models','models/wtiapikey.js',
  'middlewares','middlewares/verifyApiKeyWti.js',
  'routes','controllers','services',
  'config','config/config.js','config/config.json',
  'migrations','seeders',
  'README.md','package-lock.json','yarn.lock'
];

for (const rel of known) {
  const full = path.join(root, rel);
  try {
    const stat = fs.lstatSync(full);
    const kind = stat.isDirectory() ? 'dir' : stat.isSymbolicLink() ? 'symlink' : stat.isFile() ? 'file' : 'other';
    line('known_file', rel + ':' + kind + ':uid=' + stat.uid + ':gid=' + stat.gid + ':mode=' + (stat.mode & 0o777).toString(8));
    if (stat.isFile() && [
      'server.js','app.js','index.js','bin/www',
      'models/wtiapikey.js','middlewares/verifyApiKeyWti.js',
      'config/config.js','config/config.json'
    ].includes(rel)) {
      line('sha256', rel + ':' + sha256File(full));
    }
  } catch {
    line('known_file', rel + ':absent');
  }
}

const scanRoots = ['.', 'config', 'models', 'middlewares', 'routes', 'controllers', 'services'];
const skipDirs = new Set(['node_modules','.git','tmp','logs','log','public','uploads','dist','build','coverage']);
const sourceFiles = [];
const seen = new Set();

function walk(dir, depth) {
  if (depth > 5 || sourceFiles.length >= 400) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (sourceFiles.length >= 400) break;
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walk(full, depth + 1);
      continue;
    }
    if (!entry.isFile() || !/\\.(?:js|cjs|mjs)$/.test(entry.name)) continue;
    try {
      const stat = fs.statSync(full);
      if (stat.size <= 1024 * 1024) {
        const rel = path.relative(root, full);
        if (!seen.has(rel)) {
          seen.add(rel);
          sourceFiles.push(full);
        }
      }
    } catch {}
  }
}

for (const rel of scanRoots) {
  const full = path.resolve(root, rel);
  if (full === root || full.startsWith(root + path.sep)) walk(full, 0);
}

const envNames = new Set();
const dialects = new Set();
const databaseLiterals = new Set();

for (const full of sourceFiles) {
  let content;
  try { content = fs.readFileSync(full, 'utf8'); } catch { continue; }

  for (const match of content.matchAll(/process\\.env\\.([A-Z][A-Z0-9_]*)/g)) {
    if (match[1]) envNames.add(match[1]);
  }
  for (const match of content.matchAll(/dialect\\s*:\\s*['"](mysql|postgres|postgresql|sqlite|mariadb|mssql)['"]/gi)) {
    if (match[1]) dialects.add(match[1].toLowerCase());
  }
  for (const match of content.matchAll(/database\\s*:\\s*['"]([A-Za-z0-9_.-]{1,100})['"]/g)) {
    if (match[1]) databaseLiterals.add(match[1]);
  }
}

line('source_file_count', sourceFiles.length);
for (const name of [...envNames].sort().slice(0, 120)) line('env_ref', name);
line('db_dialect_hint', [...dialects].sort().join(',') || 'UNKNOWN');
for (const name of [...databaseLiterals].sort().slice(0, 20)) line('db_database_literal', name);

for (const configRel of ['config/config.json']) {
  const full = path.join(root, configRel);
  if (!fs.existsSync(full)) continue;
  try {
    const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
    for (const envName of ['development','test','production']) {
      const cfg = parsed && typeof parsed === 'object' ? parsed[envName] : undefined;
      if (!cfg || typeof cfg !== 'object') continue;
      if (typeof cfg.dialect === 'string') line('config_dialect', envName + ':' + cfg.dialect);
      if (typeof cfg.database === 'string' && /^[A-Za-z0-9_.-]{1,100}$/.test(cfg.database)) {
        line('config_database', envName + ':' + cfg.database);
      }
    }
  } catch {
    line('config_json_parse', 'INVALID');
  }
}
NODE
exit 0`;
}

function stablecoinRuntimeStatusCommand(): string {
  return `set -u
frontend='/var/www/vhosts/chainsolutions.fr/stablecoin.chainsolutions.fr/stablecoin'
backend='/var/www/vhosts/chainsolutions.fr/api.stablecoin.chainsolutions.fr'
if [ -d "$frontend" ]; then frontend_exists=true; else frontend_exists=false; fi
if [ -d "$backend" ]; then backend_exists=true; else backend_exists=false; fi
printf 'frontend_path_exists=%s\\n' "$frontend_exists"
printf 'backend_path_exists=%s\\n' "$backend_exists"
printf 'processes_begin\\n'
if command -v pgrep >/dev/null 2>&1; then
  pids="$(pgrep -f 'Passenger|passenger|node' 2>/dev/null || true)"
  count='0'
  for pid in $pids; do
    [ "$pid" = "$$" ] && continue
    comm="$(cat "/proc/$pid/comm" 2>/dev/null || true)"
    cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    case "$comm:$cwd" in
      *Passenger*|*passenger*|*stablecoin*)
        printf 'pid=%s comm=%s cwd=%s\\n' "$pid" "$(printf '%s' "$comm" | tr '[:space:]' '_')" "$cwd"
        count=$((count + 1))
        [ "$count" -ge 80 ] && break
        ;;
    esac
  done
else
  printf 'process_probe=UNAVAILABLE\\n'
fi
printf 'processes_end\\n'
for url in \
  'https://stablecoin.chainsolutions.fr/' \
  'https://api.stablecoin.chainsolutions.fr/' \
  'https://api.stablecoin.chainsolutions.fr/health'
do
  if command -v curl >/dev/null 2>&1; then
    code="$(curl --silent --location --max-time 10 --output /dev/null --write-out '%{http_code}' "$url" 2>/dev/null || true)"
    [ -n "$code" ] || code='000'
  else
    code='UNAVAILABLE'
  fi
  printf 'http_status=%s %s\\n' "$code" "$url"
done
exit 0`;
}

export function buildGithubReadonlyEvidenceCommand(
  target: GithubReadonlyEvidenceTarget,
  probe: GithubReadonlyEvidenceProbe
): string {
  if (probe === 'mcp_git_status' && target === 's1') {
    return redactedGitStatusCommand('/opt/apps/wealthtech-mcp-ssh-bridge');
  }
  if (probe === 'stablecoin_frontend_git_status' && target === 's2') {
    return redactedGitStatusCommand(
      '/var/www/vhosts/chainsolutions.fr/stablecoin.chainsolutions.fr/stablecoin'
    );
  }
  if (probe === 'stablecoin_backend_git_status' && target === 's2') {
    return optionalRedactedGitStatusCommand(
      '/var/www/vhosts/chainsolutions.fr/api.stablecoin.chainsolutions.fr'
    );
  }
  if (probe === 'stablecoin_backend_inventory' && target === 's2') {
    return stablecoinBackendInventoryCommand();
  }
  if (probe === 'stablecoin_runtime_status' && target === 's2') {
    return stablecoinRuntimeStatusCommand();
  }
  if (probe === 'server_disk') {
    return 'set -euo pipefail; df -h /';
  }
  if (probe === 'docker_status') {
    return "set -euo pipefail; docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'";
  }
  throw new Error('readonly_evidence_probe_target_invalid');
}

function jsonError(response: express.Response, status: number, error: string) {
  return response.status(status).json({ error });
}

export function createGithubReadonlyEvidenceRouter(
  dependencies: GithubReadonlyEvidenceRouteDependencies
): Router {
  const router = express.Router();
  const json4kb = express.json({ limit: '4kb', strict: true });

  router.post('/evidence/github/readonly', json4kb, async (request, response) => {
    const token = bearerToken(request.header('authorization'));
    if (!token) return jsonError(response, 401, 'github_oidc_required');

    const body = exactRequest(request.body);
    if (!body) return jsonError(response, 400, 'invalid_request');

    try {
      await dependencies.verifyOidc(token, body.sha);
    } catch {
      return jsonError(response, 403, 'github_oidc_invalid');
    }

    let command: string;
    try {
      command = buildGithubReadonlyEvidenceCommand(body.target, body.probe);
    } catch {
      return jsonError(response, 400, 'invalid_request');
    }

    let result: CommandResultLike;
    try {
      result = await dependencies.runRead(body.target, command);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const reasonCode = (
        message.includes('politique de sécurité')
        || message.includes('non read-only bloquée')
      ) ? 'read_policy_rejected' : 'read_transport_failed';
      return response.status(502).json({
        error: 'readonly_evidence_collection_failed',
        reasonCode
      });
    }
    if (result.code !== 0) {
      return response.status(502).json({
        error: 'readonly_evidence_collection_failed',
        reasonCode: 'remote_exit_nonzero',
        exitCode: result.code
      });
    }

    return response.status(200).json({
      schemaVersion: 1,
      requestId: body.requestId,
      target: body.target,
      probe: body.probe,
      sha: body.sha,
      mutationAllowed: false,
      output: result.stdout
    });
  });

  return router;
}
