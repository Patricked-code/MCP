import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  deriveProgramReadiness,
  validateProgramBacklogConvergence
} from '../scripts/program-backlog-convergence-lib.mjs';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const SOURCE = 'issue-comment:236@2026-10-05T09:16:08Z';
const REQUIRED_EVIDENCE = [
  'OBSERVED_MCP_PUBLIC_DOMAIN',
  'DOMAIN_AUTHORITY',
  'DNS_STATE',
  'TLS_STATE',
  'REVERSE_PROXY_STATE',
  'EXISTING_PUBLIC_ROUTES',
  'COCKPIT_ROUTE_OR_EXPOSURE_DECISION',
  'AUTH_BOUNDARY',
  'WHY_REUSE_IS_SAFE',
  'OR_WHY_SEPARATION_IS_REQUIRED',
  'REGRESSION_TESTS_FOR_EXISTING_ENDPOINTS',
  'EXACT_DEPLOYED_SHA',
  'POST_DEPLOY_SMOKE_EVIDENCE'
];

async function loadProgram() {
  return JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
}

test('the #236 owner clarification is converged as a complement of PB-K, never a new workstream', async () => {
  const program = await loadProgram();
  const clarification = program.programIntakes.find((entry: any) => entry.id === 'CLARIFICATION-236-20261005');
  assert.equal(clarification?.source, SOURCE);
  assert.equal(clarification?.sourceCommentId, 5991560741);
  assert.equal(clarification?.status, 'CONVERGED_CURRENT_MAIN');
  assert.equal(clarification?.refinesIntake, 'INTAKE-236');
  assert.equal(clarification?.principle, 'EXISTING_MCP_EXPOSURE_FIRST');
  assert.equal(clarification?.integrationVerdict, 'COMPLEMENT');
  assert.deepEqual(clarification?.appliedTo, ['PB-K', 'TB-W4-K-01']);
  assert.deepEqual(clarification?.requiredDeploymentEvidence, REQUIRED_EVIDENCE);
  assert.equal(clarification?.createsParallelProgram, false);
  assert.equal(clarification?.createsRuntimeTasks, false);
  assert.equal(clarification?.authorizesRuntimeMutation, false);
  assert.match(clarification?.observedMainSha ?? '', /^[0-9a-f]{40}$/);
  // The derived /cockpit namespace is a proposal decided by K-01 after the inventory.
  assert.ok(clarification?.supersedesAsDecision?.some((line: string) => /proposedRouteNamespace/.test(line)));

  const intake = program.programIntakes.find((entry: any) => entry.id === 'INTAKE-236');
  assert.ok(intake?.refinedBy?.includes('CLARIFICATION-236-20261005'));
  assert.ok(program.sourceCoverage.programIntakes.some(
    (entry: any) => entry.sourceKey === SOURCE && entry.coveredBy === 'PB-K'
  ));
});

test('PB-K and K-01 carry EXISTING_MCP_EXPOSURE_FIRST as non-regression, acceptance, RED and done criteria', async () => {
  const program = await loadProgram();
  const workItem = program.workItems.find((entry: any) => entry.id === 'PB-K');
  for (const rule of [
    'EXISTING_MCP_EXPOSURE_FIRST',
    'NO_NEW_DOMAIN_REVERSE_PROXY_RUNTIME_OR_CONTROL_PLANE_BY_DEFAULT',
    'EXISTING_MCP_PUBLIC_ENDPOINTS_PRESERVED',
    'NO_SPECULATIVE_ROUTE_BEFORE_ROUTE_AUTH_SECURITY_INVENTORY',
    'PUBLIC_MCP_PROTOCOL_AND_PRIVILEGED_COCKPIT_SURFACES_SECURITY_SEPARATED'
  ]) {
    assert.ok(workItem.nonRegression.includes(rule), rule);
  }
  // The historical PB-K invariants are kept.
  assert.ok(workItem.nonRegression.includes('SUPER_ADMIN_UI_NEVER_BYPASSES_GOVERNANCE'));
  assert.ok(workItem.nonRegression.includes('EXISTING_DASHBOARD_AND_WEB_ROUTES_KEEP_WORKING'));

  const shell = program.taskBlueprints.find((entry: any) => entry.id === 'TB-W4-K-01');
  assert.ok(shell.greenAcceptance.some((line: string) => /^EXISTING_MCP_EXPOSURE_FIRST/.test(line)));
  assert.ok(shell.greenAcceptance.some((line: string) => /\/admin or \/cockpit/.test(line) && /security-separated/.test(line)));
  const evidenceLine = shell.greenAcceptance.find((line: string) => /deployment evidence records/.test(line));
  for (const field of REQUIRED_EVIDENCE) assert.ok(evidenceLine?.includes(field), field);
  assert.ok(shell.redTests.some((line: string) => /exposure inventory/.test(line)));
  assert.ok(shell.definitionOfDone.some((line: string) => /EXISTING_MCP_EXPOSURE_FIRST/.test(line)));
  // The historical K-01 criteria are kept.
  assert.ok(shell.greenAcceptance.some((line: string) => /\/dashboard keeps working/.test(line)));
});

test('the clarification changes no readiness and keeps the program valid', async () => {
  const program = await loadProgram();
  const derived = deriveProgramReadiness(program);
  assert.deepEqual(derived.drift, []);
  const shell = program.taskBlueprints.find((entry: any) => entry.id === 'TB-W4-K-01');
  assert.equal(shell.readiness.state, 'READY');
  assert.equal(shell.materialization.createsRuntimeTask, false);
  const validation = validateProgramBacklogConvergence({
    projection: program,
    todo: await readFile('TODO.md', 'utf8'),
    roadmap: await readFile('ROADMAP.md', 'utf8'),
    gwc: JSON.parse(await readFile('.mcp/gwc-evolution-design.json', 'utf8')),
    taskRegistry: JSON.parse(await readFile('.mcp/task-registry.json', 'utf8'))
  }) as any;
  assert.equal(validation.ok, true, JSON.stringify(validation).slice(0, 2000));

  const claude = await readFile('CLAUDE.md', 'utf8');
  assert.match(claude, /EXISTING_MCP_EXPOSURE_FIRST/);
  const decisions = await readFile('DECISIONS_LOG.md', 'utf8');
  assert.match(decisions, /exposition MCP existante d'abord/);
});
