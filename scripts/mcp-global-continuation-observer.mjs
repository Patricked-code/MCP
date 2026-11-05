#!/usr/bin/env node
/**
 * Main-code-change observer for the EXISTING MCP program.
 * Makes a deterministic, read-only continuation artifact from the canonical
 * Program Backlog V2 and the non-authoritative gap qualification map.
 *
 * NEVER materializes tasks, claims a session, calls an agent, merges a PR,
 * patches S1, deploys, or upgrades a planning READY to runtime permission.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  deriveProgramReadiness,
  selectProgramCandidates
} from './program-backlog-convergence-lib.mjs';

export const REPOSITORY = 'Patricked-code/MCP';
export const EXPECTED_REF = 'refs/heads/main';
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const MAX_GAPS = 100;
const MAP_PATH = 'docs/governance/mcp-global-automation-gap-map-20261105.json';
const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';

function fail(code) {
  throw new Error(code);
}

export function validateTrigger(event) {
  if (!event || event.repository !== REPOSITORY || event.ref !== EXPECTED_REF
    || !['push', 'workflow_dispatch'].includes(event.name)
    || typeof event.sha !== 'string' || !SHA_PATTERN.test(event.sha)) {
    return { accepted: false, reason: 'EVENT_NOT_AUTHORIZED_FOR_MAIN_OBSERVATION' };
  }
  return { accepted: true, reason: 'MAIN_READ_ONLY_OBSERVATION' };
}

export function validateGapMap(map) {
  if (map?.schemaVersion !== 1
    || map.repository !== REPOSITORY
    || map.documentType !== 'NON_AUTHORITATIVE_GAP_QUALIFICATION_MAP'
    || map.authority !== 'NONE'
    || map.canonicalTaskAuthority !== 'Governed Task Queue'
    || !Array.isArray(map.gaps)
    || map.gaps.length < 1 || map.gaps.length > MAX_GAPS
    || map.executionPolicy?.automaticTaskCreation !== false
    || map.executionPolicy?.automaticTaskClaim !== false
    || map.executionPolicy?.automaticMerge !== false
    || map.executionPolicy?.automaticDeploy !== false) {
    fail('INVALID_NON_AUTHORITATIVE_GAP_MAP');
  }

  const seen = new Set();
  for (let i = 0; i < map.gaps.length; i++) {
    const item = map.gaps[i];
    if (!item || !/^(?:A|B|C|S)\d{2}$/.test(item.gapId)
      || seen.has(item.gapId) || item.order !== i + 1
      || item.qualification !== 'VERIFY_EXISTING_FIRST'
      || typeof item.title !== 'string' || item.title.length < 8
      || !Array.isArray(item.sourceLinks) || item.sourceLinks.length < 1
      || item.sourceLinks.some(value => typeof value !== 'string'
        || !value.startsWith('https://github.com/Patricked-code/MCP/'))
      || !Array.isArray(item.existingMechanisms) || item.existingMechanisms.length < 1
      || !Array.isArray(item.dependsOn)
      || item.dependsOn.some(id => !seen.has(id))
      || typeof item.acceptance !== 'string' || item.acceptance.length < 15) {
      fail('GAP_MAP_ORDER_DEPENDENCY_OR_PROVENANCE_INVALID');
    }
    seen.add(item.gapId);
  }
  return map.gaps;
}

function programCandidates(program) {
  if (program?.repository !== REPOSITORY
    || !Array.isArray(program.taskBlueprints)
    || !Array.isArray(program.programIntakes)
    || !Array.isArray(program.executionModel?.waves)) {
    fail('INVALID_CANONICAL_PROGRAM_PROJECTION');
  }
  const derived = deriveProgramReadiness(program);
  const existing = selectProgramCandidates(program);
  if (existing.canClaim !== false || existing.canMutate !== false
    || existing.runtimeAuthorityConsulted !== false
    || existing.requiresLiveCollisionCheck !== true) {
    fail('PROGRAM_READINESS_HAS_UNEXPECTED_WRITE_AUTHORITY');
  }
  return { derived, existing };
}

export function buildReport({ event, map, program, observedAt }) {
  const trigger = validateTrigger(event);
  if (!trigger.accepted) fail(trigger.reason);
  if (typeof observedAt !== 'string' || !Number.isFinite(Date.parse(observedAt))) {
    fail('INVALID_OBSERVATION_TIMESTAMP');
  }

  const gaps = validateGapMap(map);
  const { derived, existing } = programCandidates(program);
  const planningDrift = [...(derived.drift ?? []), ...(derived.storedReadyDrift ?? [])];
  const planConsistency = planningDrift.length === 0
    ? 'CANONICAL_READINESS_CONSISTENT'
    : 'PLANNING_DRIFT_REQUIRES_GOVERNED_RECONCILIATION';

  return {
    schemaVersion: 1,
    kind: 'READ_ONLY_CONTINUATION_OBSERVATION_NOT_AGENT_DISPATCH',
    repository: REPOSITORY,
    observedAt,
    trigger: {
      type: event.name,
      sourceRef: event.ref,
      sourceSha: event.sha,
      note: 'Source SHA belongs to the trigger. Current S1/runtime and latest main are NOT inferred.'
    },
    canonicalProgram: {
      projectionId: program.projectionId,
      projectedMainSha: program.observedMainSha ?? null,
      totalBlueprints: program.taskBlueprints.length,
      totalProgramIntakes: program.programIntakes.length,
      planConsistency,
      drift: planningDrift,
      readinessCandidateIds: existing.candidates.map(item => item.id),
      candidates: existing.candidates,
      candidateAuthority: 'PLANNING_ONLY',
      runtimeAuthorityConsulted: false
    },
    gapQualification: {
      source: MAP_PATH,
      total: gaps.length,
      candidates: gaps.map(item => ({
        gapId: item.gapId,
        order: item.order,
        level: item.level,
        title: item.title,
        dependsOn: item.dependsOn,
        sourceLinks: item.sourceLinks,
        qualification: 'REQUIRES_LIVE_EVIDENCE_AND_OWNER_COLLISION_CHECK',
        acceptance: item.acceptance
      }))
    },
    operationalGates: {
      liveState: 'NOT_OBSERVED_BY_THIS_GITHUB_ACTION',
      githubMainNow: 'NOT_REOBSERVED',
      runtimeSha: 'UNKNOWN',
      documentationAlignment: 'UNKNOWN',
      governedSession: 'NOT_OBSERVED',
      taskClaims: 'NOT_OBSERVED',
      activeLocks: 'NOT_OBSERVED',
      ownerChoice: 'NOT_OBSERVED',
      runtimeWriteAuthorized: false,
      canMaterializeTask: false,
      canClaimTask: false,
      canExecute: false,
      canMerge: false,
      canDeploy: false,
      noParallelQueueCreated: true
    },
    outcome: planConsistency === 'CANONICAL_READINESS_CONSISTENT'
      ? 'CONTINUATION_EVIDENCE_READY_FOR_GOVERNED_AGENT'
      : 'STOP_PROGRAM_PROJECTION_DRIFT',
    nextAction: planConsistency === 'CANONICAL_READINESS_CONSISTENT'
      ? 'Authorized agent: reconnect MCP, attest FULLY_ALIGNED, recover existing owner and continuity, inspect live sessions/claims/locks and only then invoke existing P2 tools.'
      : 'Reconcile the canonical Program Backlog V2 projection under existing governance before attempting admission.'
  };
}

export async function main(env = process.env) {
  const trigger = {
    name: env.GITHUB_EVENT_NAME,
    repository: env.GITHUB_REPOSITORY,
    ref: env.GITHUB_REF,
    sha: env.GITHUB_SHA
  };
  if (!validateTrigger(trigger).accepted) fail('EVENT_NOT_AUTHORIZED_FOR_MAIN_OBSERVATION');
  const [mapRaw, programRaw] = await Promise.all([
    readFile(MAP_PATH, 'utf8'),
    readFile(PROGRAM_PATH, 'utf8')
  ]);
  const report = buildReport({
    event: trigger,
    map: JSON.parse(mapRaw),
    program: JSON.parse(programRaw),
    observedAt: new Date().toISOString()
  });
  const output = env.MCP_CONTINUATION_OUTPUT
    || '/tmp/mcp-auto-continuation/continuation-report.json';
  await mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  process.stdout.write(JSON.stringify({
    outcome: report.outcome,
    sourceSha: trigger.sha,
    planCandidateCount: report.canonicalProgram.readinessCandidateIds.length,
    gapCount: report.gapQualification.total,
    wroteRuntimeTasks: false,
    autoDispatchedAgents: false,
    artifact: output
  }) + '\n');
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => {
    const reason = error?.message;
    process.stderr.write(
      typeof reason === 'string' && /^[A-Z][A-Z0-9_]{3,90}$/.test(reason)
        ? reason + '\n' : 'CONTINUATION_OBSERVER_FAIL_CLOSED\n'
    );
    process.exitCode = 1;
  });
}
