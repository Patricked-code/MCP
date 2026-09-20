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
