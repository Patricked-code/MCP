import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { assertReadOnlyCommand } from '../src/ssh/safety.js';

const {
  PROVISIONING_LABEL_REPOSITORY,
  buildProvisionedRuntimeInventoryCommand,
  governedRuntimePath,
  parseProvisionedRuntimeInventory,
  planProjectRuntimeProvisioning,
  provisionedComposeProject,
  provisionedRuntimeObservations,
  provisioningInventoryTargets
} = await import('../src/provisioning/projectRuntime.js');
const { collectProvisionedRuntimes } = await import('../src/liveState/provisionedRuntime.js');
const { liveStateRuntimeObservations } = await import('../src/liveState/runtimeObservation.js');
const { resolveRuntime } = await import('../src/governedWorkflow/resolvers/runtime.js');

const OBSERVED_AT = '2026-10-06T00:30:00.000Z';
const REVISION = 'a'.repeat(40);
const OTHER_REVISION = 'b'.repeat(40);
const TARGET = Object.freeze({
  mappingId: 'github:Patricked-code/Portal:s1:portal_api',
  repositoryId: 'github:Patricked-code/Portal',
  serverPath: '/opt/apps/portal-api',
  composeProject: provisionedComposeProject('portal', 'github:Patricked-code/Portal:s1:portal_api', 'github:Patricked-code/Portal')
});

function registry(overrides: Record<string, unknown> = {}): any {
  return {
    available: true,
    sourceSchemaVersion: 2,
    digest: 'd'.repeat(64),
    candidateDigest: null,
    mappings: [{ mappingId: TARGET.mappingId, repositoryId: TARGET.repositoryId, projectId: 'portal', projectUid: 'uid-portal', componentRole: 'api' }],
    projects: [{
      projectId: 'portal', projectUid: 'uid-portal', name: 'Portal', kind: 'application',
      globalCheckpointRepositoryId: TARGET.repositoryId, centralGovernanceRepositoryId: TARGET.repositoryId,
      repositoryComponents: [{ repositoryId: TARGET.repositoryId, mappingId: TARGET.mappingId, role: 'api' }]
    }],
    activationReadiness: [{ mappingId: TARGET.mappingId, status: 'READY', reasonCodes: [] }],
    serverBindings: [{
      mappingId: TARGET.mappingId, repositoryId: TARGET.repositoryId, projectId: 'portal', projectUid: 'uid-portal',
      componentRole: 'api', serverId: 's1', serverPath: TARGET.serverPath, realPath: null, realPathVerified: false,
      environment: 'production'
    }],
    governanceEvidence: {
      mappings: [{
        mappingId: TARGET.mappingId, repositoryId: TARGET.repositoryId, projectId: 'portal',
        officialBranch: 'main', allowedBranchPrefixes: ['claude/'], directMainPush: false, status: 'active',
        capabilities: { deploy: true }, backupRequired: true, rollbackMethod: 'restore_previous_release'
      }]
    },
    ...overrides
  };
}

function inventory(lines: string[]): any {
  return parseProvisionedRuntimeInventory(`${lines.join('\n')}\n`, [TARGET], OBSERVED_AT);
}

const ABSENT = ['docker=ok', 'component.0.path=absent', 'component.0.containers='];

/** A provisioned container line: name, state, compose project, revision, compose service and status. */
function container(name: string, service: string, status = 'Up 2 minutes (healthy)', state = 'running', revision = REVISION): string {
  return `${name}|${state}|${TARGET.composeProject}|${revision}|${service}|${status}`;
}

/** The marker of the runtime this provisioning created, with the services its compose model declared. */
function marker(services: string[] = ['api']): string {
  return `component.0.marker=${Buffer.from(JSON.stringify({
    schemaVersion: 1, jobId: 'prov-20261006T000000Z-00000000', projectId: 'portal', mappingId: TARGET.mappingId,
    repositoryId: TARGET.repositoryId, revision: REVISION, composeProject: TARGET.composeProject, composeFile: 'compose.yaml',
    createdAt: OBSERVED_AT, treeDigest: 'e'.repeat(64), services
  })).toString('base64')}`;
}

const PRESENT_SAME = ['docker=ok', 'component.0.path=present', `component.0.containers=${container('portal-api-1', 'api')}`, marker()];

test('the provisioned-runtime inventory is bounded, read-only and quotes every value', () => {
  const command = buildProvisionedRuntimeInventoryCommand([TARGET]);
  assert.doesNotThrow(() => assertReadOnlyCommand(command));
  assert.match(command, /'\/opt\/apps\/portal-api'/);
  // Each container reports its compose service and status, so a partial or unhealthy runtime is never a no-op.
  assert.ok(command.includes('{{.Label "com.docker.compose.service"}}|{{.Status}}'));
  // A component's provisioned containers are those of its own compose project, not of its whole repository.
  assert.ok(command.includes(`label=com.docker.compose.project=${TARGET.composeProject}`));
  assert.equal(command.includes(PROVISIONING_LABEL_REPOSITORY), false);
  assert.doesNotMatch(command, /\becho\b/);
  // Hostile declarations never reach the shell: only governed, normalized paths are inventoried.
  assert.throws(() => buildProvisionedRuntimeInventoryCommand([{ ...TARGET, serverPath: "/opt/apps/x'; rm -rf /" }]));
  assert.throws(() => buildProvisionedRuntimeInventoryCommand([{ ...TARGET, repositoryId: "github:o/r' --format x" }]));
  assert.throws(() => buildProvisionedRuntimeInventoryCommand(Array.from({ length: 21 }, () => TARGET)));
  assert.throws(() => buildProvisionedRuntimeInventoryCommand([{ ...TARGET, composeProject: "x' --all" }]));
});

test('two components of one repository keep distinct runtimes', () => {
  // A monorepo: the same repository mapped twice, at two declared paths.
  const second = { mappingId: 'github:Patricked-code/Portal:s1:portal_worker', serverPath: '/opt/apps/portal-worker' };
  const base = registry();
  const monorepo = registry({
    mappings: [...base.mappings, { ...base.mappings[0], mappingId: second.mappingId, componentRole: 'worker' }],
    activationReadiness: [...base.activationReadiness, { mappingId: second.mappingId, status: 'READY', reasonCodes: [] }],
    governanceEvidence: { mappings: [...base.governanceEvidence.mappings, { ...base.governanceEvidence.mappings[0], mappingId: second.mappingId }] },
    projects: [{
      ...base.projects[0],
      repositoryComponents: [...base.projects[0].repositoryComponents, { repositoryId: TARGET.repositoryId, mappingId: second.mappingId, role: 'worker' }]
    }],
    serverBindings: [...base.serverBindings, { ...base.serverBindings[0], mappingId: second.mappingId, componentRole: 'worker', serverPath: second.serverPath }]
  });
  const targets = provisioningInventoryTargets(monorepo, 'portal') as any[];
  assert.deepEqual(targets.map((entry) => entry.serverPath), [TARGET.serverPath, second.serverPath]);
  assert.notEqual(targets[0].composeProject, targets[1].composeProject);
  const command = buildProvisionedRuntimeInventoryCommand(targets);
  for (const entry of targets) assert.ok(command.includes(`label=com.docker.compose.project=${entry.composeProject}`));

  // The first component runs; the second is absent and is planned for creation, never a no-op.
  const running = parseProvisionedRuntimeInventory([
    'docker=ok',
    'component.0.path=present', `component.0.containers=portal-api-1|running|${targets[0].composeProject}|${REVISION}|api|Up 2 minutes (healthy)`,
    'component.1.path=absent', 'component.1.containers='
  ].join('\n'), targets, OBSERVED_AT);
  const plan = planProjectRuntimeProvisioning({
    request: { serverId: 'S1', projectId: 'portal', mappingId: second.mappingId, revision: REVISION },
    serverTarget: { status: 'CONFIGURED', projectIds: ['portal'] }, registry: monorepo, inventory: running,
    consent: { creation: false, activation: false }
  }) as any;
  assert.deepEqual([plan.decision, plan.reasonCodes, plan.target.serverPath], ['CONSENT_REQUIRED', ['CREATION_CONSENT_REQUIRED'], second.serverPath]);
});

test('a governed runtime path lives under /opt/apps, outside the MCP checkout', () => {
  assert.equal(governedRuntimePath('/opt/apps/portal-api'), '/opt/apps/portal-api');
  assert.equal(governedRuntimePath('/opt/apps/portal/api/'), '/opt/apps/portal/api');
  for (const value of [
    '/opt/apps', '/opt/apps/', '/opt/apps/wealthtech-mcp-ssh-bridge', '/opt/apps/wealthtech-mcp-ssh-bridge/data',
    '/opt/apps/../etc', '/var/www/vhosts/x', 'opt/apps/x', '/opt/apps/a b', '/opt/apps/x;y', '', null, 42
  ]) {
    assert.equal(governedRuntimePath(value), null, String(value));
  }
});

test('absence is proven only when the declared path and the provisioned namespace are both empty', () => {
  const absent = inventory(ABSENT);
  assert.equal(absent.status, 'CURRENT');
  const [noRuntime] = provisionedRuntimeObservations(absent, 'CURRENT', 'live_state:state_version:7');
  assert.deepEqual({ ...noRuntime }, {
    status: 'CURRENT', observedAt: OBSERVED_AT, freshness: 'CURRENT', serverId: 's1',
    repositoryId: TARGET.repositoryId, runtimeKind: 'NO_RUNTIME', runtimeId: null, revision: null,
    evidenceRef: 'live_state:state_version:7', provenance: 'live_state_provisioned_runtime_inventory'
  });

  const [running] = provisionedRuntimeObservations(inventory(PRESENT_SAME), 'CURRENT', 'ref');
  assert.equal(running.runtimeKind, 'DOCKER_COMPOSE');
  assert.equal(running.runtimeId, TARGET.composeProject);
  assert.equal(running.revision, REVISION);

  // A present path without a provisioned runtime, or an unreadable Docker, proves nothing.
  assert.deepEqual(provisionedRuntimeObservations(inventory(['docker=ok', 'component.0.path=present', 'component.0.containers=']), 'CURRENT', 'ref'), []);
  const [unavailable] = provisionedRuntimeObservations(inventory(['docker=unavailable', 'component.0.path=absent', 'component.0.containers=']), 'CURRENT', 'ref');
  assert.equal(unavailable.status, 'UNAVAILABLE');
  assert.deepEqual(provisionedRuntimeObservations(inventory(['garbage']), 'CURRENT', 'ref').map((entry: any) => entry.status), ['UNAVAILABLE']);
  // A stale inventory never proves a current absence.
  assert.equal(provisionedRuntimeObservations(absent, 'STALE', 'ref')[0].status, 'STALE');
});

test('provisioning plans only a genuinely absent runtime at its exact, declared and governed target', async () => {
  const policy = JSON.parse(await readFile('.mcp/provisioning-contracts.json', 'utf8'));
  const contractSteps = policy.contracts.find((entry: any) => entry.resourceType === 'PROJECT_RUNTIME').steps.map((step: any) => step.id);
  const configured = { status: 'CONFIGURED', projectIds: ['portal'] };
  const request = { serverId: 'S1', projectId: 'portal', mappingId: TARGET.mappingId, revision: REVISION };
  const plan = (overrides: Record<string, unknown> = {}) => planProjectRuntimeProvisioning({
    request, serverTarget: configured, registry: registry(), inventory: inventory(ABSENT),
    consent: { creation: false, activation: false }, ...overrides
  }) as any;

  const pending = plan();
  assert.equal(pending.decision, 'CONSENT_REQUIRED');
  assert.deepEqual(pending.steps.map((step: any) => step.id), contractSteps);
  assert.deepEqual(pending.target, {
    serverId: 'S1', projectId: 'portal', mappingId: TARGET.mappingId, repositoryId: TARGET.repositoryId,
    componentRole: 'api', serverPath: TARGET.serverPath, composeProject: pending.target.composeProject, revision: REVISION
  });
  assert.match(pending.target.composeProject, /^mcp-[a-z0-9-]{1,40}-[0-9a-f]{12}$/);
  assert.deepEqual(pending.governance, { backupRequired: true, rollbackMethod: 'restore_previous_release' });
  assert.equal(pending.authorizationInferred, false);
  assert.equal(pending.mutationPerformed, false);
  assert.ok(Object.isFrozen(pending) && Object.isFrozen(pending.steps));

  // Creation consent never implies activation, which keeps its own consent.
  const created = plan({ consent: { creation: true, activation: false } });
  assert.equal(created.decision, 'READY');
  const states = Object.fromEntries(created.steps.map((step: any) => [step.id, step.state]));
  assert.deepEqual(states, {
    'observe-runtime': 'DONE', 'bind-target': 'DONE', backup: 'PENDING', 'create-runtime': 'PENDING',
    activate: 'OWN_CONSENT_REQUIRED', health: 'NOT_APPLICABLE', rollback: 'ON_FAILURE'
  });
  const activated = plan({ consent: { creation: true, activation: true } });
  assert.equal(Object.fromEntries(activated.steps.map((step: any) => [step.id, step.state])).health, 'PENDING');

  // An existing runtime is never overwritten: complete and healthy at the same revision it is a no-op, another one blocks.
  assert.equal(plan({ inventory: inventory(PRESENT_SAME) }).decision, 'NO_OP');
  const conflict = plan({ request: { ...request, revision: OTHER_REVISION }, inventory: inventory(PRESENT_SAME) });
  assert.deepEqual([conflict.decision, conflict.reasonCodes], ['BLOCKED', ['EXISTING_RUNTIME_CONFLICT']]);
  // A partial, unhealthy, stopped or unmarked runtime at that revision is degraded, never already in place.
  const degraded: string[][] = [
    ['docker=ok', 'component.0.path=present', `component.0.containers=${container('portal-api-1', 'api')}`, marker(['api', 'worker'])],
    ['docker=ok', 'component.0.path=present', `component.0.containers=${container('portal-api-1', 'api', 'Up 2 minutes (unhealthy)')}`, marker()],
    ['docker=ok', 'component.0.path=present', `component.0.containers=${container('portal-api-1', 'api', 'Up 5 seconds (health: starting)')}`, marker()],
    ['docker=ok', 'component.0.path=present', `component.0.containers=${container('portal-api-1', 'api', 'Exited (1) 2 minutes ago', 'exited')}`, marker()],
    ['docker=ok', 'component.0.path=present', `component.0.containers=${container('portal-api-1', 'api')}`]
  ];
  for (const lines of degraded) {
    const result = plan({ inventory: inventory(lines) });
    assert.deepEqual([result.decision, result.reasonCodes], ['BLOCKED', ['EXISTING_RUNTIME_DEGRADED']], lines.join(' '));
  }

  const blocked: Array<[Record<string, unknown>, string]> = [
    [{ request: { ...request, revision: 'main' } }, 'PROVISIONING_REQUEST_INVALID'],
    [{ request: { ...request, serverId: 'S2' } }, 'PROVISIONING_SERVER_UNSUPPORTED'],
    [{ serverTarget: { status: 'NOT_CONFIGURED' } }, 'TARGET_NOT_CONFIGURED'],
    [{ serverTarget: { status: 'INVALID', reasonCode: 'TARGET_PROJECT_CONFIGURATION_INVALID' } }, 'TARGET_CONFIGURATION_INVALID'],
    [{ serverTarget: { status: 'CONFIGURED', projectIds: ['other'] } }, 'TARGET_PROJECT_NOT_CONFIGURED'],
    [{ registry: registry({ available: false }) }, 'REGISTRY_UNAVAILABLE'],
    [{ registry: registry({ projects: [] }) }, 'TARGET_PROJECT_NOT_REGISTERED'],
    [{ request: { ...request, mappingId: 'github:Patricked-code/Other:s1:x' } }, 'TARGET_COMPONENT_UNKNOWN'],
    [{ registry: registry({ serverBindings: [] }) }, 'TARGET_PATH_UNDECLARED'],
    [{ registry: registry({ serverBindings: [...registry().serverBindings, { ...registry().serverBindings[0], serverPath: '/opt/apps/portal-2' }] }) }, 'TARGET_PATH_AMBIGUOUS'],
    [{ registry: registry({ serverBindings: [{ ...registry().serverBindings[0], serverPath: '/var/www/vhosts/portal' }] }) }, 'TARGET_PATH_OUTSIDE_GOVERNED_ROOT'],
    // The registry's own deployment rule (D1) applies before anything is observed or written.
    [{ registry: registry({ governanceEvidence: { mappings: [{ ...registry().governanceEvidence.mappings[0], capabilities: { deploy: false } }] } }) }, 'GOVERNANCE_DEPLOY_CAPABILITY_DISABLED'],
    [{ registry: registry({ governanceEvidence: { mappings: [{ ...registry().governanceEvidence.mappings[0], status: 'suspended' }] } }) }, 'GOVERNANCE_MAPPING_NOT_ACTIVE'],
    [{ registry: registry({ activationReadiness: [{ mappingId: TARGET.mappingId, status: 'BLOCKED', reasonCodes: [] }] }) }, 'GOVERNANCE_ACTIVATION_BLOCKED'],
    [{ registry: registry({ activationReadiness: [] }) }, 'GOVERNANCE_ACTIVATION_UNKNOWN'],
    [{ registry: registry({ governanceEvidence: undefined }) }, 'GOVERNANCE_MAPPING_UNDECLARED'],
    [{ inventory: null }, 'RUNTIME_ABSENCE_UNPROVEN'],
    [{ inventory: inventory(['docker=unavailable', 'component.0.path=absent', 'component.0.containers=']) }, 'RUNTIME_ABSENCE_UNPROVEN'],
    [{ inventory: inventory(['docker=ok', 'component.0.path=present', 'component.0.containers=']) }, 'TARGET_PATH_PRESENT']
  ];
  for (const [overrides, reasonCode] of blocked) {
    const result = plan({ ...overrides, consent: { creation: true, activation: true } });
    assert.equal(result.decision, 'BLOCKED', reasonCode);
    assert.deepEqual(result.reasonCodes, [reasonCode], reasonCode);
    assert.ok(result.steps.every((step: any) => step.state !== 'PENDING'), reasonCode);
  }
});

test('Live State inventories its configured target and lets C4 prove absence', async () => {
  const commands: string[] = [];
  const targetProject = {
    targetSelection: { source: 'server_map', serverId: 'S1', status: 'RESOLVED', projectIds: ['portal'], reasonCodes: [] },
    targetContext: { projectId: 'portal' }
  } as any;
  const collected = await collectProvisionedRuntimes({
    targetProject,
    readRegistry: async () => registry(),
    runReadOnly: async (command: string) => {
      commands.push(command);
      return { code: 0, stdout: `${ABSENT.join('\n')}\n`, stderr: '' };
    },
    now: () => new Date(OBSERVED_AT)
  }) as any;
  assert.equal(commands.length, 1);
  assert.doesNotThrow(() => assertReadOnlyCommand(commands[0]!));
  assert.equal(collected.status, 'CURRENT');

  // Nothing is collected without a resolved target, and a failed read stays unavailable.
  assert.equal(await collectProvisionedRuntimes({
    targetProject: {}, readRegistry: async () => registry(), runReadOnly: async () => { throw new Error('unused'); }, now: () => new Date(OBSERVED_AT)
  }), undefined);
  const failed = await collectProvisionedRuntimes({
    targetProject, readRegistry: async () => registry(), runReadOnly: async () => ({ code: 1, stdout: '', stderr: 'x' }), now: () => new Date(OBSERVED_AT)
  }) as any;
  assert.equal(failed.status, 'UNAVAILABLE');

  const snapshot = {
    repository: 'Patricked-code/MCP', stateVersion: 9, lastReconciledAt: OBSERVED_AT, generatedAt: OBSERVED_AT,
    maxAgeSeconds: 60, freshness: 'CURRENT', ageSeconds: 0,
    runtime: { status: 'CURRENT', container: 'wealthtech_mcp_ssh_bridge', containerStatus: 'running', health: 'healthy', imageId: 'sha256:x', revision: REVISION, composeProject: 'wealthtech-mcp-ssh-bridge' },
    provisionedRuntimes: collected
  } as any;
  const observations = liveStateRuntimeObservations(snapshot, new Date(OBSERVED_AT)) as any[];
  assert.deepEqual(observations.map((entry) => [entry.repositoryId, entry.runtimeKind]), [
    ['github:Patricked-code/MCP', 'DOCKER_COMPOSE'],
    [TARGET.repositoryId, 'NO_RUNTIME']
  ]);

  const resolution = resolveRuntime({
    server: { status: 'RESOLVED', observedAt: OBSERVED_AT, selectedServer: { serverId: 's1' }, freshness: 'CURRENT' },
    components: [{ componentId: TARGET.mappingId, repositoryId: TARGET.repositoryId, componentRole: 'api' }],
    observations: observations
      .filter((entry) => entry.repositoryId === TARGET.repositoryId)
      .map(({ provenance, ...entry }) => ({ ...entry, componentId: TARGET.mappingId, componentRole: 'api' })),
    declarations: [],
    runtimeHint: null,
    observedAt: OBSERVED_AT
  }) as any;
  assert.equal(resolution.status, 'RESOLVED');
  assert.equal(resolution.cardinality, 'NO_RUNTIME');
});
