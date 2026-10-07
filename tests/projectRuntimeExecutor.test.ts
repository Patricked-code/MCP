import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { assertNoCatastrophicCommand } from '../src/ssh/writeSafety.js';

const {
  evaluateComposeSafety,
  provisioningLabelsOverride
} = await import('../src/provisioning/composePolicy.js');
const {
  PROVISIONING_MARKER_FILE,
  buildActivateScript,
  buildComposeConfigScript,
  buildCreateScript,
  buildDiscardStagingScript,
  buildRollbackScript,
  buildStageScript,
  executeProjectRuntimeProvisioning,
  provisioningMarker,
  stagingPath
} = await import('../src/provisioning/runtimeExecutor.js');
const {
  parseProvisionedRuntimeInventory,
  planProjectRuntimeProvisioning,
  provisionedRuntimeObservations
} = await import('../src/provisioning/projectRuntime.js');
const { downloadGithubArchive } = await import('../src/provisioning/sourceArchive.js');

const REVISION = 'a'.repeat(40);
const OBSERVED_AT = '2026-10-06T05:00:00.000Z';
const TARGET = Object.freeze({
  mappingId: 'github:Patricked-code/Portal:s1:portal_api',
  repositoryId: 'github:Patricked-code/Portal',
  serverPath: '/opt/apps/portal-api'
});
const REQUEST = Object.freeze({ serverId: 'S1', projectId: 'portal', mappingId: TARGET.mappingId, revision: REVISION });
const PLAN_TARGET = Object.freeze({
  serverId: 'S1', projectId: 'portal', mappingId: TARGET.mappingId, repositoryId: TARGET.repositoryId,
  componentRole: 'api', serverPath: TARGET.serverPath, composeProject: 'mcp-portal-0123456789ab', revision: REVISION
});

function registry(): any {
  return {
    available: true, sourceSchemaVersion: 2, digest: null, candidateDigest: null,
    mappings: [{ mappingId: TARGET.mappingId, repositoryId: TARGET.repositoryId, projectId: 'portal', projectUid: 'uid', componentRole: 'api' }],
    projects: [{
      projectId: 'portal', projectUid: 'uid', name: 'Portal', kind: 'application',
      globalCheckpointRepositoryId: TARGET.repositoryId, centralGovernanceRepositoryId: TARGET.repositoryId,
      repositoryComponents: [{ repositoryId: TARGET.repositoryId, mappingId: TARGET.mappingId, role: 'api' }]
    }],
    activationReadiness: [],
    serverBindings: [{
      mappingId: TARGET.mappingId, repositoryId: TARGET.repositoryId, projectId: 'portal', projectUid: 'uid',
      componentRole: 'api', serverId: 's1', serverPath: TARGET.serverPath, realPath: null, realPathVerified: false,
      environment: 'production'
    }]
  };
}

function composeConfig(dir: string, service: Record<string, unknown> = {}, extra: Record<string, unknown> = {}): any {
  return {
    name: 'mcp-portal-0123456789ab',
    services: {
      api: {
        build: { context: dir, dockerfile: 'Dockerfile' },
        ports: [{ mode: 'ingress', host_ip: '127.0.0.1', target: 3000, published: '3100', protocol: 'tcp' }],
        volumes: [
          { type: 'bind', source: `${dir}/data`, target: '/data' },
          { type: 'volume', source: 'db', target: '/var/lib/db' }
        ],
        ...service
      }
    },
    networks: { default: { name: 'mcp-portal-0123456789ab_default' } },
    volumes: { db: { name: 'mcp-portal-0123456789ab_db' } },
    ...extra
  };
}

test('the compose safety policy admits only a project-contained, locally bound runtime', () => {
  const dir = '/opt/apps/portal-api.mcp-staging-prov-1';
  const safe = evaluateComposeSafety(composeConfig(dir), dir) as any;
  assert.deepEqual({ ok: safe.ok, services: safe.services, findings: safe.findings }, { ok: true, services: ['api'], findings: [] });
  assert.ok(Object.isFrozen(safe));

  const unsafe: Array<[Record<string, unknown>, Record<string, unknown>, string]> = [
    [{ privileged: true }, {}, 'COMPOSE_PRIVILEGED'],
    [{ cap_add: ['SYS_ADMIN'] }, {}, 'COMPOSE_CAPABILITY_ADDED'],
    [{ devices: [{ source: '/dev/kmsg', target: '/dev/kmsg' }] }, {}, 'COMPOSE_DEVICE'],
    [{ network_mode: 'host' }, {}, 'COMPOSE_HOST_NAMESPACE'],
    [{ pid: 'host' }, {}, 'COMPOSE_HOST_NAMESPACE'],
    [{ ipc: 'host' }, {}, 'COMPOSE_HOST_NAMESPACE'],
    [{ userns_mode: 'host' }, {}, 'COMPOSE_HOST_NAMESPACE'],
    [{ security_opt: ['seccomp=unconfined'] }, {}, 'COMPOSE_SECURITY_OPT_UNCONFINED'],
    [{ ports: [{ mode: 'ingress', target: 3000, published: '3000', protocol: 'tcp' }] }, {}, 'COMPOSE_PORT_NOT_LOCAL'],
    [{ ports: [{ mode: 'ingress', host_ip: '0.0.0.0', target: 3000, published: '80', protocol: 'tcp' }] }, {}, 'COMPOSE_PORT_NOT_LOCAL'],
    [{ volumes: [{ type: 'bind', source: '/var/run/docker.sock', target: '/var/run/docker.sock' }] }, {}, 'COMPOSE_BIND_OUTSIDE_PROJECT'],
    [{ volumes: [{ type: 'bind', source: `${dir}/../../etc`, target: '/etc2' }] }, {}, 'COMPOSE_BIND_OUTSIDE_PROJECT'],
    [{ build: { context: '/opt/apps/wealthtech-mcp-ssh-bridge' } }, {}, 'COMPOSE_BUILD_OUTSIDE_PROJECT'],
    [{ build: { context: 'https://github.com/x/y.git' } }, {}, 'COMPOSE_BUILD_OUTSIDE_PROJECT'],
    [{ build: { context: dir, ssh: ['default'] } }, {}, 'COMPOSE_BUILD_SSH'],
    [{ container_name: 'wealthtech_mcp_ssh_bridge' }, {}, 'COMPOSE_CONTAINER_NAME'],
    [{ external_links: ['wealthtech_mcp_ssh_bridge'] }, {}, 'COMPOSE_EXTERNAL_RESOURCE'],
    [{}, { networks: { shared: { name: 'shared', external: true } } }, 'COMPOSE_EXTERNAL_RESOURCE'],
    [{}, { volumes: { db: { name: 'other_app_data', external: true } } }, 'COMPOSE_EXTERNAL_RESOURCE'],
    [{}, { secrets: { key: { file: '/root/.ssh/id_ed25519' } } }, 'COMPOSE_FILE_SOURCE_OUTSIDE_PROJECT']
  ];
  for (const [service, extra, code] of unsafe) {
    const result = evaluateComposeSafety(composeConfig(dir, service, extra), dir) as any;
    assert.equal(result.ok, false, code);
    assert.ok(result.findings.some((finding: any) => finding.code === code), `${code}: ${JSON.stringify(result.findings)}`);
  }
  for (const invalid of [null, {}, { services: {} }, { services: { 'bad name': {} } }, 'x']) {
    assert.equal((evaluateComposeSafety(invalid, dir) as any).ok, false, JSON.stringify(invalid));
  }
});

test('the labels override marks every service with the provisioned repository and revision', () => {
  const override = JSON.parse(provisioningLabelsOverride(['api', 'worker'], { repositoryId: TARGET.repositoryId, revision: REVISION, projectId: 'portal' }));
  assert.deepEqual(override.services.worker.labels, {
    'com.wealthtech.mcp.provisioning.repository': TARGET.repositoryId,
    'com.wealthtech.mcp.provisioning.revision': REVISION,
    'com.wealthtech.mcp.provisioning.project': 'portal'
  });
  assert.throws(() => provisioningLabelsOverride(['api; rm'], { repositoryId: TARGET.repositoryId, revision: REVISION, projectId: 'portal' }));
});

test('host scripts quote every value, verify before extracting and never delete', () => {
  const jobId = 'prov-20261006T050000Z-0a1b2c3d';
  const scripts = [
    buildStageScript({ jobId, target: PLAN_TARGET, archiveSha256: 'f'.repeat(64) }),
    buildCreateScript({ jobId, target: PLAN_TARGET, composeFile: 'compose.yaml', createdAt: OBSERVED_AT }),
    buildComposeConfigScript({ target: PLAN_TARGET, composeFile: 'compose.yaml' }),
    buildActivateScript({ jobId, target: PLAN_TARGET, composeFile: 'compose.yaml', labelsOverride: '{"services":{}}', healthTimeoutSeconds: 180 }),
    buildRollbackScript({ jobId, target: PLAN_TARGET, composeFile: 'compose.yaml', createdInThisJob: true }),
    buildDiscardStagingScript({ jobId, target: PLAN_TARGET })
  ];
  for (const script of scripts) {
    assert.doesNotThrow(() => assertNoCatastrophicCommand(script));
    assert.doesNotMatch(script, /(^|[\s;&|])rm\s/m);
    assert.doesNotMatch(script, /--volumes|\s-v(\s|$)/);
  }
  const [stage, create, , activate, rollback] = scripts;
  assert.ok(stage!.indexOf('sha256sum') < stage!.indexOf('tar '), 'the archive digest is verified before extraction');
  assert.match(stage!, /--no-same-owner/);
  assert.match(stage!, /env -i /);
  assert.match(create!, new RegExp(PROVISIONING_MARKER_FILE.replaceAll('.', '\\.')));
  assert.match(activate!, /up -d --build/);
  assert.match(rollback!, /^project='mcp-portal-0123456789ab'$/m);
  assert.match(rollback!, /docker compose -p "\$project"[^\n]* down --remove-orphans/);
  assert.match(rollback!, /mcp-provisioning-quarantine/);
  assert.equal(stagingPath(PLAN_TARGET.serverPath, jobId), `/opt/apps/portal-api.mcp-staging-${jobId}`);
  assert.throws(() => buildStageScript({ jobId: 'x; reboot', target: PLAN_TARGET, archiveSha256: 'f'.repeat(64) }));
  assert.throws(() => buildStageScript({ jobId, target: { ...PLAN_TARGET, serverPath: '/etc' }, archiveSha256: 'f'.repeat(64) }));
});

test('target names stay off the docker compose command lines, so the write guard never misreads them', () => {
  const jobId = 'prov-20261006T050000Z-0a1b2c3d';
  // A path or compose project such as "api-v" must not read as a volume flag of docker compose.
  const target = { ...PLAN_TARGET, serverPath: '/opt/apps/api-v', composeProject: 'mcp-api-v-0123456789ab' };
  const scripts = [
    buildStageScript({ jobId, target, archiveSha256: 'f'.repeat(64) }),
    buildComposeConfigScript({ target, composeFile: 'compose.yaml' }),
    buildActivateScript({ jobId, target, composeFile: 'compose.yaml', labelsOverride: '{"services":{}}', healthTimeoutSeconds: 180 }),
    buildRollbackScript({ jobId, target, composeFile: 'compose.yaml', createdInThisJob: true })
  ];
  for (const script of scripts) {
    assert.doesNotThrow(() => assertNoCatastrophicCommand(script));
    for (const line of script.split('\n').filter((entry) => /docker compose/.test(entry))) {
      assert.doesNotMatch(line, /\/opt\/apps|mcp-api-v/, line);
    }
  }
});

test('a created runtime keeps its marker: it is a checkout until its own activation consent', () => {
  const marker = provisioningMarker({ jobId: 'prov-20261006T050000Z-0a1b2c3d', target: PLAN_TARGET, composeFile: 'compose.yaml', createdAt: OBSERVED_AT });
  const encoded = Buffer.from(JSON.stringify(marker)).toString('base64');
  const inventory = parseProvisionedRuntimeInventory(
    `docker=ok\ncomponent.0.path=present\ncomponent.0.containers=\ncomponent.0.marker=${encoded}\n`, [TARGET], OBSERVED_AT
  ) as any;
  assert.equal(inventory.components[0].marker.revision, REVISION);
  const [checkout] = provisionedRuntimeObservations(inventory, 'CURRENT', 'ref') as any[];
  assert.deepEqual([checkout.runtimeKind, checkout.runtimeId, checkout.revision], ['CHECKOUT_ONLY', PLAN_TARGET.composeProject, REVISION]);

  const configured = { status: 'CONFIGURED', projectIds: ['portal'] };
  const plan = (consent: Record<string, boolean>, inventoryOverride = inventory) => planProjectRuntimeProvisioning({
    request: REQUEST, serverTarget: configured, registry: registry(), inventory: inventoryOverride,
    consent: { creation: false, activation: false, ...consent }
  }) as any;
  // The marker binds the checkout to its compose project: a stranger's marker is a conflict.
  const own = plan({ activation: true });
  const ownMarker = { ...marker, composeProject: own.target.composeProject };
  const created = parseProvisionedRuntimeInventory(
    `docker=ok\ncomponent.0.path=present\ncomponent.0.containers=\ncomponent.0.marker=${Buffer.from(JSON.stringify(ownMarker)).toString('base64')}\n`, [TARGET], OBSERVED_AT
  );
  const ready = plan({ activation: true }, created);
  assert.deepEqual([ready.decision, ready.mode], ['READY', 'ACTIVATE']);
  assert.deepEqual(Object.fromEntries(ready.steps.map((step: any) => [step.id, step.state])), {
    'observe-runtime': 'DONE', 'bind-target': 'DONE', backup: 'DONE', 'create-runtime': 'DONE',
    activate: 'PENDING', health: 'PENDING', rollback: 'ON_FAILURE'
  });
  assert.deepEqual([plan({}, created).decision, plan({}, created).reasonCodes], ['CONSENT_REQUIRED', ['RUNTIME_CREATED_NOT_ACTIVATED', 'ACTIVATION_CONSENT_REQUIRED']]);
  assert.deepEqual(plan({ activation: true }).reasonCodes, ['EXISTING_RUNTIME_CONFLICT']);
  const other = Buffer.from(JSON.stringify({ ...ownMarker, revision: 'b'.repeat(40) })).toString('base64');
  assert.deepEqual(plan({ activation: true }, parseProvisionedRuntimeInventory(
    `docker=ok\ncomponent.0.path=present\ncomponent.0.containers=\ncomponent.0.marker=${other}\n`, [TARGET], OBSERVED_AT
  )).reasonCodes, ['EXISTING_RUNTIME_CONFLICT']);
  // An absent runtime is created, then activated only with both consents.
  const absent = parseProvisionedRuntimeInventory('docker=ok\ncomponent.0.path=absent\ncomponent.0.containers=\n', [TARGET], OBSERVED_AT);
  assert.equal(plan({ creation: true }, absent).mode, 'CREATE');
  assert.equal(plan({ creation: true, activation: true }, absent).mode, 'CREATE_AND_ACTIVATE');
  assert.equal(plan({}, absent).mode, null);
});

type Call = { kind: string; detail: string };

function harness(overrides: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const files = new Map<string, string>();
  let inventory = 'docker=ok\ncomponent.0.path=absent\ncomponent.0.containers=\n';
  const results: Record<string, string> = {
    stage: `result=staged\ncompose_file=compose.yaml\ncompose_config_b64=${Buffer.from(JSON.stringify(composeConfig('/opt/apps/portal-api.mcp-staging-prov-20261006T050000Z-0a1b2c3d'))).toString('base64')}\n`,
    create: 'result=created\n',
    config: `result=configured\ncompose_config_b64=${Buffer.from(JSON.stringify(composeConfig('/opt/apps/portal-api'))).toString('base64')}\n`,
    activate: 'result=activated\nhealth=healthy\n',
    rollback: 'result=rolled_back\n',
    discard: 'result=discarded\n'
  };
  const deps = {
    writeEnabled: () => true,
    now: () => new Date('2026-10-06T05:00:00.000Z'),
    randomHex: () => '0a1b2c3d',
    readServerTarget: async () => ({ status: 'CONFIGURED', projectIds: ['portal'] }),
    readRegistry: async () => registry(),
    observe: async (targets: any[]) => {
      calls.push({ kind: 'observe', detail: targets.map((entry) => entry.mappingId).join(',') });
      return parseProvisionedRuntimeInventory(inventory, targets, OBSERVED_AT);
    },
    admitRevision: async (input: any) => {
      calls.push({ kind: 'admit', detail: `${input.repositoryId}@${input.revision}` });
      return Object.freeze({
        admitted: true, kind: 'CI_GATE', reasonCode: 'REVISION_ADMITTED', defaultBranch: 'main', defaultBranchHead: REVISION,
        checkRuns: 1, statuses: 0
      });
    },
    fetchSource: async (input: any) => {
      calls.push({ kind: 'fetch', detail: `${input.repositoryId}@${input.revision}` });
      return { ok: true, sha256: 'f'.repeat(64), bytes: 1024 };
    },
    writeJobFile: async (path: string, content: string) => {
      calls.push({ kind: 'write-file', detail: path });
      files.set(path, content);
    },
    runWrite: async (command: string) => {
      const phase = command.match(/^# mcp-provisioning:([a-z-]+)/m)?.[1] ?? 'unknown';
      calls.push({ kind: 'host', detail: phase });
      return { code: 0, stdout: results[phase] ?? '', stderr: '' };
    },
    ...overrides
  };
  return {
    calls, files, results, deps,
    setInventory(value: string) { inventory = value; }
  };
}

async function run(h: ReturnType<typeof harness>, consent: Record<string, boolean>) {
  return executeProjectRuntimeProvisioning({ request: REQUEST, consent: { creation: false, activation: false, ...consent } }, h.deps as any) as any;
}

const hostPhases = (h: ReturnType<typeof harness>) => h.calls.filter((call) => call.kind === 'host').map((call) => call.detail);

test('the executor re-observes, then creates and activates a genuinely absent runtime with evidence', async () => {
  const h = harness();
  const result = await run(h, { creation: true, activation: true });
  assert.equal(result.result, 'SUCCEEDED');
  assert.equal(result.mode, 'CREATE_AND_ACTIVATE');
  assert.match(result.jobId, /^prov-20261006T050000Z-0a1b2c3d$/);
  assert.deepEqual(h.calls.map((call) => call.kind).slice(0, 3), ['observe', 'admit', 'fetch']);
  assert.deepEqual(hostPhases(h), ['stage', 'create', 'activate']);
  const attestation = JSON.parse(h.files.get(`/app/data/provisioning/${result.jobId}/attestation.json`)!);
  assert.equal(attestation.result, 'SUCCEEDED');
  assert.deepEqual([attestation.admission.kind, attestation.admission.defaultBranch], ['CI_GATE', 'main']);
  assert.equal(attestation.archiveSha256, 'f'.repeat(64));
  assert.equal(attestation.authorizationInferred, false);
  assert.deepEqual(attestation.consent, { creation: true, activation: true });
  assert.ok(Object.isFrozen(result));

  // Creation alone stops before any container starts.
  const created = harness();
  assert.equal((await run(created, { creation: true })).result, 'SUCCEEDED');
  assert.deepEqual(hostPhases(created), ['stage', 'create']);
});

test('the executor refuses without fresh evidence, consent or write mode, and never writes then', async () => {
  const disabled = harness({ writeEnabled: () => false });
  assert.deepEqual([(await run(disabled, { creation: true, activation: true })).result, disabled.calls.length], ['REFUSED', 0]);
  const unconsented = harness();
  const refused = await run(unconsented, {});
  assert.deepEqual([refused.result, refused.reasonCodes], ['REFUSED', ['CREATION_CONSENT_REQUIRED']]);
  assert.deepEqual(hostPhases(unconsented), []);
  // A runtime that appeared since the page was rendered is never overwritten.
  const drift = harness();
  drift.setInventory('docker=ok\ncomponent.0.path=present\ncomponent.0.containers=\n');
  assert.deepEqual((await run(drift, { creation: true, activation: true })).reasonCodes, ['TARGET_PATH_PRESENT']);
  assert.deepEqual(hostPhases(drift), []);
  // The source is fetched before any host write; a failed fetch writes nothing.
  const offline = harness({ fetchSource: async () => ({ ok: false, sha256: null, bytes: 0 }) });
  assert.deepEqual([(await run(offline, { creation: true })).result, hostPhases(offline)], ['FAILED', []]);
});

test('a revision outside the reviewed default branch or with a failing CI is refused before any write', async () => {
  for (const reasonCode of ['REVISION_NOT_ON_DEFAULT_BRANCH', 'REVISION_CI_FAILED', 'REVISION_CI_PENDING']) {
    const h = harness({
      admitRevision: async () => Object.freeze({ admitted: false, kind: null, reasonCode, defaultBranch: 'main', defaultBranchHead: null, checkRuns: null, statuses: null })
    });
    const refused = await run(h, { creation: true, activation: true });
    assert.deepEqual([refused.result, refused.reasonCodes, refused.jobId], ['REFUSED', [reasonCode], null], reasonCode);
    assert.equal(h.calls.some((call) => call.kind === 'fetch' || call.kind === 'host' || call.kind === 'write-file'), false, reasonCode);
  }
  // An admission that cannot be read refuses too: it is never assumed.
  const offline = harness({ admitRevision: async () => { throw new Error('github'); } });
  assert.deepEqual((await run(offline, { creation: true })).reasonCodes, ['REVISION_ADMISSION_UNAVAILABLE']);
  assert.deepEqual(hostPhases(offline), []);
  // The activation of a created runtime is admitted again: a revision is never trusted from an earlier job.
  const created = harness({
    admitRevision: async () => Object.freeze({ admitted: false, kind: null, reasonCode: 'REVISION_CI_FAILED', defaultBranch: 'main', defaultBranchHead: null, checkRuns: 1, statuses: 0 })
  });
  const composeProject = (planProjectRuntimeProvisioning({
    request: REQUEST, serverTarget: { status: 'CONFIGURED', projectIds: ['portal'] }, registry: registry(),
    inventory: parseProvisionedRuntimeInventory('docker=ok\ncomponent.0.path=absent\ncomponent.0.containers=\n', [TARGET], OBSERVED_AT),
    consent: { creation: true, activation: false }
  }) as any).target.composeProject;
  const marker = provisioningMarker({ jobId: 'prov-20261005T050000Z-00000000', target: { ...PLAN_TARGET, composeProject }, composeFile: 'compose.yaml', createdAt: OBSERVED_AT });
  created.setInventory(`docker=ok\ncomponent.0.path=present\ncomponent.0.containers=\ncomponent.0.marker=${Buffer.from(JSON.stringify(marker)).toString('base64')}\n`);
  assert.deepEqual((await run(created, { activation: true })).reasonCodes, ['REVISION_CI_FAILED']);
  assert.deepEqual(hostPhases(created), []);
});

test('an unsafe compose model or a bad archive is discarded to quarantine, never deleted', async () => {
  const unsafe = harness();
  unsafe.results.stage = `result=staged\ncompose_file=compose.yaml\ncompose_config_b64=${Buffer.from(JSON.stringify(composeConfig('/opt/apps/portal-api.mcp-staging-prov-20261006T050000Z-0a1b2c3d', { privileged: true }))).toString('base64')}\n`;
  const blocked = await run(unsafe, { creation: true, activation: true });
  assert.equal(blocked.result, 'BLOCKED');
  assert.ok(blocked.findings.some((finding: any) => finding.code === 'COMPOSE_PRIVILEGED'));
  assert.deepEqual(hostPhases(unsafe), ['stage', 'discard']);

  const tampered = harness();
  tampered.results.stage = 'result=failed\nreason=archive_digest\n';
  const failed = await run(tampered, { creation: true });
  assert.deepEqual([failed.result, failed.reasonCodes], ['FAILED', ['STAGE_ARCHIVE_DIGEST']]);
  assert.deepEqual(hostPhases(tampered), ['stage', 'discard']);
});

test('a failed health check rolls back without destruction, and the activation of a created runtime keeps its files', async () => {
  const unhealthy = harness();
  unhealthy.results.activate = 'result=unhealthy\nhealth=unhealthy\n';
  const rolledBack = await run(unhealthy, { creation: true, activation: true });
  assert.deepEqual([rolledBack.result, rolledBack.rollback], ['ROLLED_BACK', 'SUCCEEDED']);
  assert.deepEqual(hostPhases(unhealthy), ['stage', 'create', 'activate', 'rollback']);
  const rollbackCommand = buildRollbackScript({ jobId: rolledBack.jobId, target: PLAN_TARGET, composeFile: 'compose.yaml', createdInThisJob: true });
  assert.match(rollbackCommand, /mv /);

  // A runtime created earlier is activated alone: no fetch and no stage; its rollback keeps the files.
  const marker = provisioningMarker({ jobId: 'prov-20261005T050000Z-00000000', target: PLAN_TARGET, composeFile: 'compose.yaml', createdAt: OBSERVED_AT });
  const activateOnly = harness();
  const plan = planProjectRuntimeProvisioning({
    request: REQUEST, serverTarget: { status: 'CONFIGURED', projectIds: ['portal'] }, registry: registry(),
    inventory: null, consent: { creation: false, activation: false }
  }) as any;
  assert.equal(plan.decision, 'BLOCKED');
  const composeProject = (planProjectRuntimeProvisioning({
    request: REQUEST, serverTarget: { status: 'CONFIGURED', projectIds: ['portal'] }, registry: registry(),
    inventory: parseProvisionedRuntimeInventory('docker=ok\ncomponent.0.path=absent\ncomponent.0.containers=\n', [TARGET], OBSERVED_AT),
    consent: { creation: true, activation: false }
  }) as any).target.composeProject;
  activateOnly.setInventory(`docker=ok\ncomponent.0.path=present\ncomponent.0.containers=\ncomponent.0.marker=${Buffer.from(JSON.stringify({ ...marker, composeProject })).toString('base64')}\n`);
  activateOnly.results.activate = 'result=unhealthy\nhealth=unhealthy\n';
  const kept = await run(activateOnly, { activation: true });
  assert.deepEqual([kept.mode, kept.result], ['ACTIVATE', 'ROLLED_BACK']);
  assert.equal(activateOnly.calls.some((call) => call.kind === 'fetch'), false);
  assert.deepEqual(hostPhases(activateOnly), ['config', 'activate', 'rollback']);
  assert.doesNotMatch(buildRollbackScript({ jobId: kept.jobId, target: { ...PLAN_TARGET, composeProject }, composeFile: 'compose.yaml', createdInThisJob: false }), /mcp-provisioning-quarantine/);
});

test('one provisioning runs at a time', async () => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const slow = harness({
    fetchSource: async () => { await gate; return { ok: true, sha256: 'f'.repeat(64), bytes: 1 }; }
  });
  const first = run(slow, { creation: true });
  const second = await run(harness(), { creation: true });
  assert.deepEqual([second.result, second.reasonCodes], ['REFUSED', ['PROVISIONING_IN_PROGRESS']]);
  release();
  assert.equal((await first).result, 'SUCCEEDED');
});

test('the source archive is downloaded once, from codeload only, bounded and digested', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-f03-archive-'));
  try {
    const body = Buffer.from('archive-bytes');
    const seen: Array<{ url: string; auth: string | null }> = [];
    const fetchImpl = async (url: string, init: any) => {
      seen.push({ url, auth: init?.headers?.Authorization ?? null });
      if (url.startsWith('https://api.github.com/')) {
        return new Response(null, { status: 302, headers: { location: 'https://codeload.github.com/Patricked-code/Portal/legacy.tar.gz/refs?token=signed' } });
      }
      return new Response(body, { status: 200 });
    };
    const destination = join(directory, 'source.tar.gz');
    const result = await downloadGithubArchive({
      token: 'server-token', apiBase: 'https://api.github.com', repositoryId: TARGET.repositoryId, revision: REVISION,
      destination, maxBytes: 1024, fetchImpl: fetchImpl as any
    });
    assert.deepEqual(result, { ok: true, sha256: createHash('sha256').update(body).digest('hex'), bytes: body.length });
    assert.deepEqual((await readFile(destination)).toString(), 'archive-bytes');
    assert.equal(seen[0]!.url, `https://api.github.com/repos/Patricked-code/Portal/tarball/${REVISION}`);
    assert.equal(seen[0]!.auth, 'Bearer server-token');
    // The signed codeload URL never receives the credential.
    assert.equal(seen[1]!.auth, null);

    const elsewhere = async (url: string) => (url.startsWith('https://api.github.com/')
      ? new Response(null, { status: 302, headers: { location: 'https://evil.example/archive.tar.gz' } })
      : new Response(body, { status: 200 }));
    assert.equal((await downloadGithubArchive({
      token: 't', apiBase: 'https://api.github.com', repositoryId: TARGET.repositoryId, revision: REVISION,
      destination: join(directory, 'x.tar.gz'), maxBytes: 1024, fetchImpl: elsewhere as any
    })).ok, false);
    const tooLarge = await downloadGithubArchive({
      token: 't', apiBase: 'https://api.github.com', repositoryId: TARGET.repositoryId, revision: REVISION,
      destination: join(directory, 'y.tar.gz'), maxBytes: 4, fetchImpl: fetchImpl as any
    });
    assert.equal(tooLarge.ok, false);
    assert.equal((await downloadGithubArchive({
      token: 't', apiBase: 'https://api.github.com', repositoryId: 'github:o/r', revision: 'main',
      destination: join(directory, 'z.tar.gz'), maxBytes: 4, fetchImpl: fetchImpl as any
    })).ok, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
