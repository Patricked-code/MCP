import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildS1DeployJobId,
  buildS1DeployLaunchCommand,
  buildS1DeployWorkerScript,
  parseS1DeployStatus
} from '../src/deploy/s1Deploy.js';

const SHA = 'b'.repeat(40);
const RUN_ID = '31317000000';
const JOB_ID = `mcp-s1-${RUN_ID}-${SHA.slice(0, 12)}`;

test('l’identifiant de job est déterministe et borné', () => {
  assert.equal(buildS1DeployJobId(RUN_ID, SHA), JOB_ID);
  assert.throws(() => buildS1DeployJobId('../../tmp', SHA), /deploy_run_id_invalid/);
  assert.throws(() => buildS1DeployJobId(RUN_ID, 'b'.repeat(12)), /deploy_sha_invalid/);
});

test('le worker impose verrou, branche main, propreté et remotes read-only', () => {
  const script = buildS1DeployWorkerScript(JOB_ID, SHA);

  assert.match(script, /flock/);
  assert.match(script, /git branch --show-current/);
  assert.match(script, /git status --porcelain --untracked-files=all/);
  assert.match(script, /git remote get-url origin/);
  assert.match(script, /git remote get-url --push origin/);
  assert.match(script, /github\.com-mcp-patricked-ro:Patricked-code\/MCP\.git/);
  assert.match(script, /disabled:\/\/mcp-s1-read-only/);
});

test('le worker fetch main sans hooks et lie FETCH_HEAD au SHA demandé avant fast-forward', () => {
  const script = buildS1DeployWorkerScript(JOB_ID, SHA);

  assert.match(script, /core\.hooksPath=\/dev\/null/);
  assert.match(script, /fetch[^\n]*origin[^\n]*main/);
  assert.match(script, /git rev-parse FETCH_HEAD/);
  assert.match(script, new RegExp(SHA));
  assert.match(script, /merge-base --is-ancestor/);
  assert.match(script, /merge --ff-only/);
  assert.doesNotMatch(script, /reset\s+--hard/);
  assert.doesNotMatch(script, /git\s+clean/);
  assert.doesNotMatch(script, /checkout\s+-f|switch\s+-f|rebase/);
});

test('le worker conserve l’image précédente, construit un candidat et sait restaurer le runtime', () => {
  const script = buildS1DeployWorkerScript(JOB_ID, SHA);

  assert.match(script, /PREVIOUS_IMAGE_ID/);
  assert.match(script, /ROLLBACK_REF/);
  assert.match(script, /CANDIDATE_REF/);
  assert.match(script, /docker image tag/);
  assert.match(script, /MCP_GIT_REVISION/);
  assert.match(script, /MCP_IMAGE_REF/);
  assert.match(script, /docker compose build/);
  assert.match(script, /docker compose up -d --no-build/);
  assert.match(script, /rollback/);
});

test('le worker contrôle health, OAuth, MCP 401 et la révision OCI exacte', () => {
  const script = buildS1DeployWorkerScript(JOB_ID, SHA);

  assert.match(script, /127\.0\.0\.1:8787\/health/);
  assert.match(script, /\.well-known\/oauth-protected-resource/);
  assert.match(script, /\.well-known\/oauth-authorization-server/);
  assert.match(script, /127\.0\.0\.1:8787\/mcp/);
  assert.match(script, /401/);
  assert.match(script, /org\.opencontainers\.image\.revision/);
  assert.match(script, /docker inspect --type container --format/);
});

test('le worker produit une attestation bornée et atomique sans secrets', () => {
  const script = buildS1DeployWorkerScript(JOB_ID, SHA);

  assert.match(script, /attestation\.json\.tmp/);
  assert.match(script, /mv[^\n]*attestation\.json\.tmp[^\n]*attestation\.json/);
  assert.match(script, /requested_sha/);
  assert.match(script, /previous_git_sha/);
  assert.match(script, /runtime_revision/);
  assert.match(script, /health_ok/);
  assert.match(script, /oauth_ok/);
  assert.match(script, /mcp_auth_ok/);
  assert.doesNotMatch(script, /\.env|secrets\/|keys\/|MCP_AUTH_TOKEN|GITHUB_TOKEN/);
});

test('le lancement est détaché, utilise uniquement les chemins fixes et refuse les entrées non bornées', () => {
  const command = buildS1DeployLaunchCommand(RUN_ID, SHA);

  assert.match(command, /\/opt\/apps\/wealthtech-mcp-deploy\/jobs/);
  assert.match(command, /nohup/);
  assert.match(command, /<\/dev\/null/);
  assert.match(command, />\/dev\/null 2>&1/);
  assert.match(command, new RegExp(JOB_ID));
  assert.doesNotMatch(command, /\.\.\//);
  assert.doesNotMatch(command, /eval\b/);
});

test('le parseur de statut accepte uniquement le job et SHA attendus', () => {
  const parsed = parseS1DeployStatus([
    `job_id=${JOB_ID}`,
    `requested_sha=${SHA}`,
    'status=succeeded',
    'phase=attested',
    `runtime_revision=${SHA}`,
    'rollback_status=not_needed',
    'health_ok=true',
    'oauth_ok=true',
    'mcp_auth_ok=true'
  ].join('\n'), JOB_ID, SHA);

  assert.equal(parsed.status, 'succeeded');
  assert.equal(parsed.runtimeRevision, SHA);
  assert.equal(parsed.healthOk, true);

  assert.throws(() => parseS1DeployStatus([
    'job_id=mcp-s1-1-aaaaaaaaaaaa',
    `requested_sha=${SHA}`,
    'status=running',
    'phase=build'
  ].join('\n'), JOB_ID, SHA), /deploy_status_job_mismatch/);

  assert.throws(() => parseS1DeployStatus([
    `job_id=${JOB_ID}`,
    `requested_sha=${'c'.repeat(40)}`,
    'status=running',
    'phase=build'
  ].join('\n'), JOB_ID, SHA), /deploy_status_sha_mismatch/);
});

test('le parseur refuse les statuts, phases et valeurs non bornés', () => {
  assert.throws(() => parseS1DeployStatus([
    `job_id=${JOB_ID}`,
    `requested_sha=${SHA}`,
    'status=pwned;rm -rf /',
    'phase=build'
  ].join('\n'), JOB_ID, SHA), /deploy_status_invalid/);

  assert.throws(() => parseS1DeployStatus([
    `job_id=${JOB_ID}`,
    `requested_sha=${SHA}`,
    'status=running',
    `phase=${'x'.repeat(100)}`
  ].join('\n'), JOB_ID, SHA), /deploy_phase_invalid/);
});
