import express from 'express';
import type { Router } from 'express';

import type { GithubOidcClaims } from '../deploy/githubOidc.js';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,80}$/;
const MAX_BEARER_BYTES = 16_384;

const STABLECOIN_PATH =
  '/var/www/vhosts/chainsolutions.fr/stablecoin.chainsolutions.fr/stablecoin';
const STABLECOIN_REMOTE = 'https://github.com/Patricked-code/Stablecoin.git';

interface CommandResultLike {
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface StablecoinFastForwardDependencies {
  verifyOidc: (token: string, requestedSha: string) => Promise<GithubOidcClaims>;
  writeEnabled: () => boolean;
  runWrite: (command: string) => Promise<CommandResultLike>;
}

export interface StablecoinFastForwardCommandInput {
  expectedServerSha: string;
  targetSha: string;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function exactSha(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  return SHA_PATTERN.test(normalized) ? normalized : null;
}

function bearerToken(value: string | undefined): string | null {
  if (!value || !value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length);
  if (!token || token.includes(' ') || Buffer.byteLength(token, 'utf8') > MAX_BEARER_BYTES) {
    return null;
  }
  return token;
}

function exactRequest(value: unknown): {
  sha: string;
  expectedServerSha: string;
  targetSha: string;
  requestId: string;
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).sort().join(',')
    !== 'expectedServerSha,requestId,sha,targetSha'
  ) return null;

  const sha = exactSha(record.sha);
  const expectedServerSha = exactSha(record.expectedServerSha);
  const targetSha = exactSha(record.targetSha);
  const requestId = record.requestId;

  if (!sha || !expectedServerSha || !targetSha) return null;
  if (expectedServerSha === targetSha) return null;
  if (typeof requestId !== 'string' || !REQUEST_ID_PATTERN.test(requestId)) return null;

  return { sha, expectedServerSha, targetSha, requestId };
}

export function buildStablecoinFastForwardCommand(
  input: StablecoinFastForwardCommandInput
): string {
  const expectedServerSha = exactSha(input.expectedServerSha);
  const targetSha = exactSha(input.targetSha);
  if (!expectedServerSha || !targetSha || expectedServerSha === targetSha) {
    throw new Error('stablecoin_fast_forward_sha_invalid');
  }

  return `set -euo pipefail
PATH_ROOT=${shellQuote(STABLECOIN_PATH)}
EXPECTED_SERVER_SHA=${shellQuote(expectedServerSha)}
TARGET_SHA=${shellQuote(targetSha)}
EXPECTED_REMOTE=${shellQuote(STABLECOIN_REMOTE)}

test -d "$PATH_ROOT/.git" || exit 20
cd "$PATH_ROOT"

CURRENT_BRANCH="$(git branch --show-current)"
test "$CURRENT_BRANCH" = "main" || exit 21

DIRTY_COUNT="$(git status --porcelain=v1 --untracked-files=all | wc -l | tr -d ' ')"
if [ "$DIRTY_COUNT" != "0" ]; then
  printf '%s\n' 'working tree Stablecoin non propre' >&2
  exit 22
fi

REMOTE_URL="$(git remote get-url origin 2>/dev/null || true)"
test "$REMOTE_URL" = "$EXPECTED_REMOTE" || exit 23

CURRENT_SHA="$(git rev-parse HEAD)"
test "$CURRENT_SHA" = "$EXPECTED_SERVER_SHA" || exit 24

REMOTE_SHA="$(git ls-remote origin refs/heads/main | awk '{print $1}' | head -1)"
test "$REMOTE_SHA" = "$TARGET_SHA" || exit 25

git fetch --no-tags origin main
FETCHED_SHA="$(git rev-parse FETCH_HEAD)"
test "$FETCHED_SHA" = "$TARGET_SHA" || exit 25

git merge-base --is-ancestor "$CURRENT_SHA" "$TARGET_SHA" || exit 26

CHANGED_FILES=0
APPLICATION_FILES=0
while IFS= read -r -d '' CHANGED_PATH; do
  CHANGED_FILES=$((CHANGED_FILES + 1))
  case "$CHANGED_PATH" in
    .github/*|.mcp/*|AGENTS.md|ARCHITECTURE.md|DECISIONS.md|GOVERNANCE.md|LOOP_ENGINEERING.md|README.md|SOURCE_OF_TRUTH.md|SUIVI.md|TODO.md|scripts/verify-governance-consistency.js)
      ;;
    *)
      APPLICATION_FILES=$((APPLICATION_FILES + 1))
      ;;
  esac
done < <(git diff --name-only -z "$CURRENT_SHA" "$TARGET_SHA")

if [ "$APPLICATION_FILES" != "0" ]; then
  exit 28
fi

FRONT_BEFORE="$(curl --silent --location --max-time 15 --output /dev/null --write-out '%{http_code}' https://stablecoin.chainsolutions.fr/ || true)"
API_ROOT_BEFORE="$(curl --silent --location --max-time 15 --output /dev/null --write-out '%{http_code}' https://api.stablecoin.chainsolutions.fr/ || true)"
API_HEALTH_BEFORE="$(curl --silent --location --max-time 15 --output /dev/null --write-out '%{http_code}' https://api.stablecoin.chainsolutions.fr/health || true)"
test "$FRONT_BEFORE" = "200" || exit 30
test "$API_ROOT_BEFORE" = "401" || exit 30
test "$API_HEALTH_BEFORE" = "401" || exit 30

git merge --ff-only "$TARGET_SHA" || exit 27

FINAL_SHA="$(git rev-parse HEAD)"
test "$FINAL_SHA" = "$TARGET_SHA" || exit 29
FINAL_DIRTY_COUNT="$(git status --porcelain=v1 --untracked-files=all | wc -l | tr -d ' ')"
test "$FINAL_DIRTY_COUNT" = "0" || exit 29

FRONT_AFTER="$(curl --silent --location --max-time 15 --output /dev/null --write-out '%{http_code}' https://stablecoin.chainsolutions.fr/ || true)"
API_ROOT_AFTER="$(curl --silent --location --max-time 15 --output /dev/null --write-out '%{http_code}' https://api.stablecoin.chainsolutions.fr/ || true)"
API_HEALTH_AFTER="$(curl --silent --location --max-time 15 --output /dev/null --write-out '%{http_code}' https://api.stablecoin.chainsolutions.fr/health || true)"
test "$FRONT_AFTER" = "200" || exit 31
test "$API_ROOT_AFTER" = "401" || exit 31
test "$API_HEALTH_AFTER" = "401" || exit 31

printf 'status=succeeded\n'
printf 'server_before=%s\n' "$CURRENT_SHA"
printf 'server_after=%s\n' "$FINAL_SHA"
printf 'target_sha=%s\n' "$TARGET_SHA"
printf 'changed_files=%s\n' "$CHANGED_FILES"
printf 'application_files=0\n'
printf 'frontend_http=%s\n' "$FRONT_AFTER"
printf 'api_root_http=%s\n' "$API_ROOT_AFTER"
printf 'api_health_http=%s\n' "$API_HEALTH_AFTER"
`;
}

const reasonByExitCode: Readonly<Record<number, string>> = Object.freeze({
  20: 'repository_missing',
  21: 'wrong_branch',
  22: 'dirty_worktree',
  23: 'remote_mismatch',
  24: 'server_head_mismatch',
  25: 'target_sha_mismatch',
  26: 'non_fast_forward',
  27: 'fast_forward_failed',
  28: 'application_diff_detected',
  29: 'postcondition_failed',
  30: 'preflight_health_failed',
  31: 'postflight_health_failed'
});

function parseBoundedSuccess(
  stdout: string,
  expectedServerSha: string,
  targetSha: string
): {
  serverBefore: string;
  serverAfter: string;
  targetSha: string;
  changedFiles: number;
  applicationFiles: number;
  frontendHttp: number;
  apiRootHttp: number;
  apiHealthHttp: number;
} {
  if (Buffer.byteLength(stdout, 'utf8') > 32_768) {
    throw new Error('stablecoin_fast_forward_output_too_large');
  }

  const values = new Map<string, string>();
  for (const line of stdout.split(/\r?\n/)) {
    const match = /^(status|server_before|server_after|target_sha|changed_files|application_files|frontend_http|api_root_http|api_health_http)=([^\r\n]+)$/.exec(line);
    if (match) values.set(match[1]!, match[2]!);
  }

  if (values.get('status') !== 'succeeded') {
    throw new Error('stablecoin_fast_forward_output_invalid');
  }
  if (values.get('server_before') !== expectedServerSha) {
    throw new Error('stablecoin_fast_forward_output_invalid');
  }
  if (values.get('server_after') !== targetSha || values.get('target_sha') !== targetSha) {
    throw new Error('stablecoin_fast_forward_output_invalid');
  }

  const integer = (key: string, min: number, max: number): number => {
    const raw = values.get(key);
    if (!raw || !/^[0-9]+$/.test(raw)) throw new Error('stablecoin_fast_forward_output_invalid');
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
      throw new Error('stablecoin_fast_forward_output_invalid');
    }
    return parsed;
  };

  const applicationFiles = integer('application_files', 0, 0);
  return {
    serverBefore: expectedServerSha,
    serverAfter: targetSha,
    targetSha,
    changedFiles: integer('changed_files', 1, 10_000),
    applicationFiles,
    frontendHttp: integer('frontend_http', 100, 599),
    apiRootHttp: integer('api_root_http', 100, 599),
    apiHealthHttp: integer('api_health_http', 100, 599)
  };
}

function jsonError(
  response: express.Response,
  status: number,
  error: string,
  reasonCode?: string
) {
  return response.status(status).json(reasonCode ? { error, reasonCode } : { error });
}

export function createStablecoinFastForwardRouter(
  dependencies: StablecoinFastForwardDependencies
): Router {
  const router = express.Router();
  const json4kb = express.json({ limit: '4kb', strict: true });

  router.post('/deploy/github/stablecoin/s2/fast-forward', json4kb, async (request, response) => {
    const token = bearerToken(request.header('authorization'));
    if (!token) return jsonError(response, 401, 'github_oidc_required');

    const body = exactRequest(request.body);
    if (!body) return jsonError(response, 400, 'invalid_request');

    try {
      await dependencies.verifyOidc(token, body.sha);
    } catch {
      return jsonError(response, 403, 'github_oidc_invalid');
    }

    if (!dependencies.writeEnabled()) {
      return jsonError(response, 503, 'stablecoin_write_gate_disabled');
    }

    let command: string;
    try {
      command = buildStablecoinFastForwardCommand({
        expectedServerSha: body.expectedServerSha,
        targetSha: body.targetSha
      });
    } catch {
      return jsonError(response, 400, 'invalid_request');
    }

    let result: CommandResultLike;
    try {
      result = await dependencies.runWrite(command);
    } catch {
      return jsonError(
        response,
        502,
        'stablecoin_fast_forward_failed',
        'write_transport_failed'
      );
    }

    if (result.code !== 0) {
      const reasonCode = (
        typeof result.code === 'number'
        ? reasonByExitCode[result.code]
        : undefined
      ) ?? 'write_failed';
      const status = reasonCode === 'write_failed' ? 502 : 409;
      return jsonError(
        response,
        status,
        'stablecoin_fast_forward_rejected',
        reasonCode
      );
    }

    let parsed;
    try {
      parsed = parseBoundedSuccess(
        result.stdout,
        body.expectedServerSha,
        body.targetSha
      );
    } catch {
      return jsonError(
        response,
        502,
        'stablecoin_fast_forward_failed',
        'attestation_invalid'
      );
    }

    return response.status(200).json({
      schemaVersion: 1,
      requestId: body.requestId,
      status: 'succeeded',
      ...parsed
    });
  });

  return router;
}
