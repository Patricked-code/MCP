const MCP_ROOT = '/opt/apps/wealthtech-mcp-ssh-bridge';
const DEPLOY_ROOT = '/opt/apps/wealthtech-mcp-deploy';
const DEPLOY_JOBS_ROOT = `${DEPLOY_ROOT}/jobs`;
const DEPLOY_LOCK_FILE = `${DEPLOY_ROOT}/deploy.lock`;
const MCP_CONTAINER = 'wealthtech_mcp_ssh_bridge';
const MCP_SERVICE = 'wealthtech-mcp-ssh-bridge';
const REQUIRED_BRANCH = 'main';
const REQUIRED_FETCH_REMOTE = 'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git';
const REQUIRED_PUSH_REMOTE = 'disabled://mcp-s1-read-only';
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const RUN_ID_PATTERN = /^[0-9]{1,30}$/;
const JOB_ID_PATTERN = /^mcp-s1-([0-9]{1,30})-([0-9a-f]{12})$/;

export type S1DeployStatusValue = 'queued' | 'running' | 'succeeded' | 'failed';

export interface S1DeployStatus {
  jobId: string;
  requestedSha: string;
  status: S1DeployStatusValue;
  phase: string;
  runtimeRevision: string | null;
  rollbackStatus: string | null;
  healthOk: boolean | null;
  oauthOk: boolean | null;
  mcpAuthOk: boolean | null;
}

export type S1DeployAdmissionEvidence =
  | Readonly<{
      kind: 'push_ci_gate';
      ciRunId: number;
      ciHeadSha: string;
      ciConclusion: 'success';
    }>
  | Readonly<{
      kind: 'workflow_dispatch_manual';
    }>;

export interface S1DeployAttestation {
  schemaVersion: 1 | 2;
  attestationId: string | null;
  jobId: string;
  requestedSha: string;
  previousGitSha: string | null;
  runtimeRevision: string | null;
  result: string;
  phase: string;
  rollbackStatus: string | null;
  healthOk: boolean;
  oauthOk: boolean;
  mcpAuthOk: boolean;
  admission: S1DeployAdmissionEvidence | null;
  endedAt: string;
}

function deployError(code: string): Error {
  return new Error(code);
}

function normalizeSha(value: string): string {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  if (!SHA_PATTERN.test(normalized)) throw deployError('deploy_sha_invalid');
  return normalized;
}

function normalizeRunId(value: string): string {
  if (typeof value !== 'string' || !RUN_ID_PATTERN.test(value)) {
    throw deployError('deploy_run_id_invalid');
  }
  return value;
}

function normalizeJobId(value: string, expectedSha?: string): string {
  if (typeof value !== 'string') throw deployError('deploy_job_id_invalid');
  const match = value.match(JOB_ID_PATTERN);
  if (!match) throw deployError('deploy_job_id_invalid');
  if (expectedSha && match[2] !== expectedSha.slice(0, 12)) {
    throw deployError('deploy_job_id_invalid');
  }
  return value;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function normalizeAdmissionEvidence(
  input: S1DeployAdmissionEvidence | undefined,
  sha: string
): S1DeployAdmissionEvidence {
  if (input === undefined) return Object.freeze({ kind: 'workflow_dispatch_manual' as const });
  if (input.kind === 'workflow_dispatch_manual') {
    return Object.freeze({ kind: 'workflow_dispatch_manual' as const });
  }
  if (
    input.kind !== 'push_ci_gate'
    || !Number.isSafeInteger(input.ciRunId)
    || input.ciRunId <= 0
    || normalizeSha(input.ciHeadSha) !== sha
    || input.ciConclusion !== 'success'
  ) {
    throw deployError('deploy_admission_invalid');
  }
  return Object.freeze({
    kind: 'push_ci_gate' as const,
    ciRunId: input.ciRunId,
    ciHeadSha: sha,
    ciConclusion: 'success' as const
  });
}

export function buildS1DeployJobId(runIdInput: string, shaInput: string): string {
  const runId = normalizeRunId(runIdInput);
  const sha = normalizeSha(shaInput);
  return `mcp-s1-${runId}-${sha.slice(0, 12)}`;
}

export function buildS1DeployWorkerScript(
  jobIdInput: string,
  shaInput: string,
  admissionInput?: S1DeployAdmissionEvidence
): string {
  const sha = normalizeSha(shaInput);
  const jobId = normalizeJobId(jobIdInput, sha);
  const admission = normalizeAdmissionEvidence(admissionInput, sha);
  const attestationId = `s1-deploy-${jobId}`;
  const ciRunIdJson = admission.kind === 'push_ci_gate' ? String(admission.ciRunId) : 'null';
  const ciHeadShaJson = admission.kind === 'push_ci_gate' ? JSON.stringify(admission.ciHeadSha) : 'null';
  const ciConclusionJson = admission.kind === 'push_ci_gate' ? JSON.stringify(admission.ciConclusion) : 'null';

  return `#!/bin/bash
set -euo pipefail

MCP_ROOT=${shellQuote(MCP_ROOT)}
DEPLOY_ROOT=${shellQuote(DEPLOY_ROOT)}
LOCK_FILE=${shellQuote(DEPLOY_LOCK_FILE)}
CONTAINER=${shellQuote(MCP_CONTAINER)}
SERVICE=${shellQuote(MCP_SERVICE)}
JOB_ID=${shellQuote(jobId)}
REQUESTED_SHA=${shellQuote(sha)}
ATTESTATION_ID=${shellQuote(attestationId)}
ADMISSION_KIND=${shellQuote(admission.kind)}
CI_RUN_ID_JSON=${shellQuote(ciRunIdJson)}
CI_HEAD_SHA_JSON=${shellQuote(ciHeadShaJson)}
CI_CONCLUSION_JSON=${shellQuote(ciConclusionJson)}
JOB_DIR=${shellQuote(`${DEPLOY_JOBS_ROOT}/${jobId}`)}
STATUS_FILE="$JOB_DIR/status.state"
ATTESTATION_FILE="$JOB_DIR/attestation.json"
CANDIDATE_REF="wealthtech-mcp-ssh-bridge:deploy-$REQUESTED_SHA"
ROLLBACK_REF="wealthtech-mcp-ssh-bridge:rollback-$JOB_ID"
PREVIOUS_GIT_SHA=""
PREVIOUS_IMAGE_ID=""
RUNTIME_REVISION=""
ROLLBACK_STATUS="not_needed"
HEALTH_OK="false"
OAUTH_OK="false"
MCP_AUTH_OK="false"
RUNTIME_CHANGED="false"

mkdir -p "$JOB_DIR"
chmod 700 "$DEPLOY_ROOT" "$JOB_DIR"

write_status() {
  local status="$1"
  local phase="$2"
  local tmp="$JOB_DIR/status.state.tmp"
  printf 'job_id=%s\\nrequested_sha=%s\\nstatus=%s\\nphase=%s\\nruntime_revision=%s\\nrollback_status=%s\\nhealth_ok=%s\\noauth_ok=%s\\nmcp_auth_ok=%s\\n' \\
    "$JOB_ID" "$REQUESTED_SHA" "$status" "$phase" "$RUNTIME_REVISION" "$ROLLBACK_STATUS" "$HEALTH_OK" "$OAUTH_OK" "$MCP_AUTH_OK" > "$tmp"
  chmod 600 "$tmp"
  mv "$tmp" "$STATUS_FILE"
}

write_attestation() {
  local result="$1"
  local phase="$2"
  local ended_at
  ended_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '{\\n  "schema_version": 2,\\n  "attestation_id": "%s",\\n  "job_id": "%s",\\n  "requested_sha": "%s",\\n  "previous_git_sha": "%s",\\n  "runtime_revision": "%s",\\n  "result": "%s",\\n  "phase": "%s",\\n  "rollback_status": "%s",\\n  "health_ok": %s,\\n  "oauth_ok": %s,\\n  "mcp_auth_ok": %s,\\n  "admission_kind": "%s",\\n  "ci_run_id": %s,\\n  "ci_head_sha": %s,\\n  "ci_conclusion": %s,\\n  "ended_at": "%s"\\n}\\n' \
    "$ATTESTATION_ID" "$JOB_ID" "$REQUESTED_SHA" "$PREVIOUS_GIT_SHA" "$RUNTIME_REVISION" "$result" "$phase" "$ROLLBACK_STATUS" "$HEALTH_OK" "$OAUTH_OK" "$MCP_AUTH_OK" "$ADMISSION_KIND" "$CI_RUN_ID_JSON" "$CI_HEAD_SHA_JSON" "$CI_CONCLUSION_JSON" "$ended_at" \
    > "$JOB_DIR/attestation.json.tmp"
  chmod 600 "$JOB_DIR/attestation.json.tmp"
  mv "$JOB_DIR/attestation.json.tmp" "$JOB_DIR/attestation.json"


http_code() {
  curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 10 "$1" || true
}

mcp_auth_code() {
  curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 10 \\
    --request POST --header 'content-type: application/json' --data '{}' \\
    'http://127.0.0.1:8787/mcp' || true
}

wait_for_code() {
  local url="$1"
  local expected="$2"
  local attempt=0
  local code=""
  while [ "$attempt" -lt 20 ]; do
    code="$(http_code "$url")"
    if [ "$code" = "$expected" ]; then return 0; fi
    attempt=$((attempt + 1))
    sleep 2
  done
  return 1
}

rollback_runtime() {
  if [ "$RUNTIME_CHANGED" != "true" ] || [ -z "$PREVIOUS_IMAGE_ID" ]; then
    ROLLBACK_STATUS="not_needed"
    return 0
  fi

  write_status running rollback
  if ! docker image tag "$PREVIOUS_IMAGE_ID" "$ROLLBACK_REF"; then
    ROLLBACK_STATUS="failed"
    return 1
  fi
  if ! MCP_IMAGE_REF="$ROLLBACK_REF" docker compose up -d --no-build "$SERVICE"; then
    ROLLBACK_STATUS="failed"
    return 1
  fi
  if ! wait_for_code 'http://127.0.0.1:8787/health' '200'; then
    ROLLBACK_STATUS="failed"
    return 1
  fi
  ROLLBACK_STATUS="succeeded"
  return 0
}

fail_deploy() {
  local phase="$1"
  rollback_runtime || true
  write_status failed "$phase"
  write_attestation failed "$phase"
  exit 1
}

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  write_status failed locked
  write_attestation failed locked
  exit 75
fi

write_status running preflight
cd "$MCP_ROOT"

BRANCH="$(git branch --show-current)"
[ "$BRANCH" = '${REQUIRED_BRANCH}' ] || fail_deploy preflight
[ -z "$(git status --porcelain --untracked-files=all)" ] || fail_deploy preflight
FETCH_REMOTE="$(git remote get-url origin)"
PUSH_REMOTE="$(git remote get-url --push origin)"
[ "$FETCH_REMOTE" = '${REQUIRED_FETCH_REMOTE}' ] || fail_deploy preflight
[ "$PUSH_REMOTE" = '${REQUIRED_PUSH_REMOTE}' ] || fail_deploy preflight
PREVIOUS_GIT_SHA="$(git rev-parse HEAD)"

write_status running fetch
if ! git -c core.hooksPath=/dev/null fetch --no-tags origin main; then fail_deploy fetch; fi
FETCHED_SHA="$(git rev-parse FETCH_HEAD)"
[ "$FETCHED_SHA" = "$REQUESTED_SHA" ] || fail_deploy fetch
if ! git merge-base --is-ancestor "$PREVIOUS_GIT_SHA" "$REQUESTED_SHA"; then fail_deploy fast_forward; fi

PREVIOUS_IMAGE_ID="$(docker inspect --type container --format '{{.Image}}' "$CONTAINER")" || fail_deploy preflight
[ -n "$PREVIOUS_IMAGE_ID" ] || fail_deploy preflight
if ! docker image tag "$PREVIOUS_IMAGE_ID" "$ROLLBACK_REF"; then fail_deploy preflight; fi

write_status running fast_forward
if ! git merge --ff-only "$REQUESTED_SHA"; then fail_deploy fast_forward; fi
[ "$(git rev-parse HEAD)" = "$REQUESTED_SHA" ] || fail_deploy fast_forward

write_status running build
if ! MCP_IMAGE_REF="$CANDIDATE_REF" MCP_GIT_REVISION="$REQUESTED_SHA" docker compose build "$SERVICE"; then fail_deploy build; fi

write_status running start
RUNTIME_CHANGED="true"
if ! MCP_IMAGE_REF="$CANDIDATE_REF" docker compose up -d --no-build "$SERVICE"; then fail_deploy start; fi

write_status running health
if ! wait_for_code 'http://127.0.0.1:8787/health' '200'; then fail_deploy health; fi
HEALTH_OK="true"

write_status running oauth
if ! wait_for_code 'http://127.0.0.1:8787/.well-known/oauth-protected-resource' '200'; then fail_deploy oauth; fi
if ! wait_for_code 'http://127.0.0.1:8787/.well-known/oauth-authorization-server' '200'; then fail_deploy oauth; fi
OAUTH_OK="true"

write_status running mcp_auth
MCP_CODE="$(mcp_auth_code)"
[ "$MCP_CODE" = '401' ] || fail_deploy mcp_auth
MCP_AUTH_OK="true"

write_status running attest
RUNTIME_REVISION="$(docker inspect --type container --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$CONTAINER")" || fail_deploy attest
[ "$RUNTIME_REVISION" = "$REQUESTED_SHA" ] || fail_deploy attest
ROLLBACK_STATUS="not_needed"
write_status succeeded attested
write_attestation succeeded attested
`;
}

export function buildS1DeployLaunchCommand(
  runIdInput: string,
  shaInput: string,
  admissionInput?: S1DeployAdmissionEvidence
): string {
  const sha = normalizeSha(shaInput);
  const runId = normalizeRunId(runIdInput);
  const jobId = buildS1DeployJobId(runId, sha);
  const workerScript = buildS1DeployWorkerScript(jobId, sha, admissionInput);
  const workerBase64 = Buffer.from(workerScript, 'utf8').toString('base64');
  const jobDir = `${DEPLOY_JOBS_ROOT}/${jobId}`;

  return `set -euo pipefail
DEPLOY_ROOT=${shellQuote(DEPLOY_ROOT)}
JOBS_ROOT=${shellQuote(DEPLOY_JOBS_ROOT)}
JOB_ID=${shellQuote(jobId)}
JOB_DIR=${shellQuote(jobDir)}
mkdir -p "$JOB_DIR"
chmod 700 "$DEPLOY_ROOT" "$JOBS_ROOT" "$JOB_DIR"
printf '%s' ${shellQuote(workerBase64)} | base64 -d > "$JOB_DIR/worker.sh"
chmod 700 "$JOB_DIR/worker.sh"
printf 'job_id=%s\\nrequested_sha=%s\\nstatus=queued\\nphase=queued\\n' "$JOB_ID" ${shellQuote(sha)} > "$JOB_DIR/status.state"
chmod 600 "$JOB_DIR/status.state"
nohup /bin/bash "$JOB_DIR/worker.sh" >/dev/null 2>&1 </dev/null &
printf 'job_id=%s\\nrequested_sha=%s\\nstatus=queued\\n' "$JOB_ID" ${shellQuote(sha)}`;
}

export function buildS1DeployStatusCommand(jobIdInput: string, shaInput: string): string {
  const sha = normalizeSha(shaInput);
  const jobId = normalizeJobId(jobIdInput, sha);
  const statusFile = `${DEPLOY_JOBS_ROOT}/${jobId}/status.state`;
  return `set -euo pipefail
test -f ${shellQuote(statusFile)}
sed -n '1,20p' ${shellQuote(statusFile)}`;
}

function parseBoolean(value: string | undefined): boolean | null {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === undefined || value === '') return null;
  throw deployError('deploy_boolean_invalid');
}

export function parseS1DeployStatus(output: string, expectedJobIdInput: string, expectedShaInput: string): S1DeployStatus {
  const expectedSha = normalizeSha(expectedShaInput);
  const expectedJobId = normalizeJobId(expectedJobIdInput, expectedSha);
  if (typeof output !== 'string' || Buffer.byteLength(output, 'utf8') > 8_192) {
    throw deployError('deploy_status_too_large');
  }

  const values: Record<string, string> = {};
  const allowedKeys = new Set([
    'job_id', 'requested_sha', 'status', 'phase', 'runtime_revision',
    'rollback_status', 'health_ok', 'oauth_ok', 'mcp_auth_ok'
  ]);
  for (const line of output.split(/\r?\n/)) {
    if (!line) continue;
    const index = line.indexOf('=');
    if (index <= 0) throw deployError('deploy_status_invalid');
    const key = line.slice(0, index);
    const value = line.slice(index + 1);
    if (!allowedKeys.has(key) || value.length > 160) throw deployError('deploy_status_invalid');
    values[key] = value;
  }

  if (values.job_id !== expectedJobId) throw deployError('deploy_status_job_mismatch');
  if (values.requested_sha !== expectedSha) throw deployError('deploy_status_sha_mismatch');

  const allowedStatuses = new Set<S1DeployStatusValue>(['queued', 'running', 'succeeded', 'failed']);
  const status = values.status as S1DeployStatusValue | undefined;
  if (!status || !allowedStatuses.has(status)) throw deployError('deploy_status_invalid');

  const phase = values.phase;
  if (!phase || !/^[a-z_]{1,32}$/.test(phase)) throw deployError('deploy_phase_invalid');

  const runtimeRevision = values.runtime_revision
    ? normalizeSha(values.runtime_revision)
    : null;
  const rollbackStatus = values.rollback_status || null;
  if (rollbackStatus && !new Set(['not_needed', 'succeeded', 'failed']).has(rollbackStatus)) {
    throw deployError('deploy_rollback_status_invalid');
  }

  return {
    jobId: expectedJobId,
    requestedSha: expectedSha,
    status,
    phase,
    runtimeRevision,
    rollbackStatus,
    healthOk: parseBoolean(values.health_ok),
    oauthOk: parseBoolean(values.oauth_ok),
    mcpAuthOk: parseBoolean(values.mcp_auth_ok)
  };
}


function nullableSha(value: unknown, errorCode: string): string | null {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value !== 'string') throw deployError(errorCode);
  try {
    return normalizeSha(value);
  } catch {
    throw deployError(errorCode);
  }
}

function requiredBoolean(value: unknown, errorCode: string): boolean {
  if (typeof value !== 'boolean') throw deployError(errorCode);
  return value;
}

function attestationString(
  record: Record<string, unknown>,
  key: string,
  errorCode: string,
  pattern: RegExp
): string {
  const value = record[key];
  if (typeof value !== 'string' || !pattern.test(value)) throw deployError(errorCode);
  return value;
}

export function parseS1DeployAttestation(
  input: string,
  expectedJobIdInput: string,
  expectedShaInput: string
): S1DeployAttestation {
  const expectedSha = normalizeSha(expectedShaInput);
  const expectedJobId = normalizeJobId(expectedJobIdInput, expectedSha);
  if (typeof input !== 'string' || Buffer.byteLength(input, 'utf8') > 16_384) {
    throw deployError('deploy_attestation_too_large');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch {
    throw deployError('deploy_attestation_invalid');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw deployError('deploy_attestation_invalid');
  }
  const record = raw as Record<string, unknown>;
  if (record.schema_version !== 1 && record.schema_version !== 2) {
    throw deployError('deploy_attestation_version_invalid');
  }
  const schemaVersion = record.schema_version;
  if (record.job_id !== expectedJobId) throw deployError('deploy_attestation_job_mismatch');
  if (record.requested_sha !== expectedSha) throw deployError('deploy_attestation_sha_mismatch');

  const previousGitSha = nullableSha(record.previous_git_sha, 'deploy_attestation_previous_sha_invalid');
  const runtimeRevision = nullableSha(record.runtime_revision, 'deploy_attestation_runtime_sha_invalid');
  const endedAt = attestationString(
    record,
    'ended_at',
    'deploy_attestation_ended_at_invalid',
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
  );

  let resultValue: string;
  let phase: string;
  let rollbackStatus: string | null;
  let attestationId: string | null = null;
  let admission: S1DeployAdmissionEvidence | null = null;

  if (schemaVersion === 1) {
    resultValue = attestationString(record, 'result', 'deploy_attestation_result_invalid', /^[a-z_]{1,32}$/);
    phase = attestationString(record, 'phase', 'deploy_attestation_phase_invalid', /^[a-z_]{1,32}$/);
    const rawRollback = record.rollback_status;
    if (rawRollback === '' || rawRollback === null || rawRollback === undefined) rollbackStatus = null;
    else if (typeof rawRollback === 'string' && /^[a-z_]{1,32}$/.test(rawRollback)) rollbackStatus = rawRollback;
    else throw deployError('deploy_attestation_rollback_status_invalid');
  } else {
    const expectedAttestationId = `s1-deploy-${expectedJobId}`;
    if (record.attestation_id !== expectedAttestationId) throw deployError('deploy_attestation_id_invalid');
    attestationId = expectedAttestationId;
    if (record.result !== 'succeeded' && record.result !== 'failed') {
      throw deployError('deploy_attestation_result_invalid');
    }
    resultValue = record.result;
    const allowedPhases = new Set([
      'locked', 'preflight', 'fetch', 'fast_forward', 'build', 'start',
      'health', 'oauth', 'mcp_auth', 'attest', 'attested', 'rollback'
    ]);
    if (typeof record.phase !== 'string' || !allowedPhases.has(record.phase)) {
      throw deployError('deploy_attestation_phase_invalid');
    }
    phase = record.phase;
    if (
      record.rollback_status !== 'not_needed'
      && record.rollback_status !== 'succeeded'
      && record.rollback_status !== 'failed'
    ) throw deployError('deploy_attestation_rollback_status_invalid');
    rollbackStatus = record.rollback_status;

    if (record.admission_kind === 'push_ci_gate') {
      if (!Number.isSafeInteger(record.ci_run_id) || (record.ci_run_id as number) <= 0) {
        throw deployError('deploy_attestation_ci_run_invalid');
      }
      if (record.ci_head_sha !== expectedSha) throw deployError('deploy_attestation_ci_sha_mismatch');
      if (record.ci_conclusion !== 'success') throw deployError('deploy_attestation_ci_conclusion_invalid');
      admission = Object.freeze({
        kind: 'push_ci_gate' as const,
        ciRunId: record.ci_run_id as number,
        ciHeadSha: expectedSha,
        ciConclusion: 'success' as const
      });
    } else if (record.admission_kind === 'workflow_dispatch_manual') {
      if (record.ci_run_id !== null || record.ci_head_sha !== null || record.ci_conclusion !== null) {
        throw deployError('deploy_attestation_manual_ci_evidence_invalid');
      }
      admission = Object.freeze({ kind: 'workflow_dispatch_manual' as const });
    } else {
      throw deployError('deploy_attestation_admission_invalid');
    }
  }

  return Object.freeze({
    schemaVersion,
    attestationId,
    jobId: expectedJobId,
    requestedSha: expectedSha,
    previousGitSha,
    runtimeRevision,
    result: resultValue,
    phase,
    rollbackStatus,
    healthOk: requiredBoolean(record.health_ok, 'deploy_attestation_health_invalid'),
    oauthOk: requiredBoolean(record.oauth_ok, 'deploy_attestation_oauth_invalid'),
    mcpAuthOk: requiredBoolean(record.mcp_auth_ok, 'deploy_attestation_mcp_auth_invalid'),
    admission,
    endedAt
  });
}
