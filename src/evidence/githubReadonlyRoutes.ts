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
  return `set -euo pipefail
path='${path}'
printf 'path=%s\\n' "$path"
if [ ! -d "$path" ]; then
  printf 'path_exists=false\\n'
  exit 0
fi
printf 'path_exists=true\\n'
if ! git -C "$path" rev-parse --git-dir >/dev/null 2>&1; then
  printf 'git_repo=false\\n'
  exit 0
fi
printf 'git_repo=true\\n'
cd "$path"
printf 'branch=%s\\n' "$(git branch --show-current)"
printf 'head=%s\\n' "$(git rev-parse HEAD)"
printf 'working_tree_changes=%s\\n' "$(git status --porcelain=v1 --untracked-files=all | wc -l | tr -d ' ')"
origin_url="$(git remote get-url origin 2>/dev/null || true)"
push_url="$(git remote get-url --push origin 2>/dev/null || true)"
printf 'origin_fetch=%s\\n' "$(printf '%s' "$origin_url" | sed -E 's#(https?://)[^/@[:space:]]+@#\\1***@#g')"
printf 'origin_push=%s\\n' "$(printf '%s' "$push_url" | sed -E 's#(https?://)[^/@[:space:]]+@#\\1***@#g')"`;
}

function stablecoinRuntimeStatusCommand(): string {
  return `set -euo pipefail
frontend='/var/www/vhosts/chainsolutions.fr/stablecoin.chainsolutions.fr/stablecoin'
backend='/var/www/vhosts/chainsolutions.fr/api.stablecoin.chainsolutions.fr'
printf 'frontend_path_exists=%s\\n' "$([ -d "$frontend" ] && printf true || printf false)"
printf 'backend_path_exists=%s\\n' "$([ -d "$backend" ] && printf true || printf false)"
printf 'processes_begin\\n'
for pid in $(pgrep -f 'Passenger|passenger|node' 2>/dev/null | head -n 80 || true); do
  [ "$pid" = "$$" ] && continue
  comm="$(cat "/proc/$pid/comm" 2>/dev/null || true)"
  cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  case "$comm:$cwd" in
    *Passenger*|*passenger*|*stablecoin*)
      printf 'pid=%s comm=%s cwd=%s\\n' "$pid" "$(printf '%s' "$comm" | tr '[:space:]' '_')" "$cwd"
      ;;
  esac
done
printf 'processes_end\\n'
for url in \
  'https://stablecoin.chainsolutions.fr/' \
  'https://api.stablecoin.chainsolutions.fr/' \
  'https://api.stablecoin.chainsolutions.fr/health'
do
  code="$(curl --silent --show-error --location --max-time 10 --output /dev/null --write-out '%{http_code}' "$url" 2>/dev/null || true)"
  [ -n "$code" ] || code='000'
  printf 'http_status=%s %s\\n' "$code" "$url"
done`;
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
    } catch {
      return jsonError(response, 502, 'readonly_evidence_collection_failed');
    }
    if (result.code !== 0) {
      return jsonError(response, 502, 'readonly_evidence_collection_failed');
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
