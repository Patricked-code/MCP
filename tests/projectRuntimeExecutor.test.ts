import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { assertNoCatastrophicCommand } from '../src/ssh/writeSafety.js';

const {
  evaluateComposeSafety,
  evaluateComposeSource,
  provisioningLabelsOverride
} = await import('../src/provisioning/composePolicy.js');
const {
  PROVISIONING_MARKER_FILE,
  PROVISIONING_TREE_DIGEST_SHELL,
  buildActivateScript,
  buildArchiveBoundsLines,
  buildComposeConfigScript,
  buildComposeSourceScript,
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
  provisionedComposeProject,
  provisionedRuntimeObservations
} = await import('../src/provisioning/projectRuntime.js');
const { downloadGithubArchive } = await import('../src/provisioning/sourceArchive.js');

const REVISION = 'a'.repeat(40);
const TREE = 'e'.repeat(64);
/** The compose file of the fixture repository, as the host prints it before Compose ever reads it. */
const SOURCE = [
  'services:',
  '  api:',
  '    build: .',
  '    ports:',
  '      - "127.0.0.1:3100:3000"',
  '    volumes:',
  '      - ./data:/data',
  '      - db:/var/lib/db',
  'volumes:',
  '  db: {}',
  ''
].join('\n');
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const sourceLines = (source = SOURCE, digest = sha256(source)) =>
  `compose_source_b64=${Buffer.from(source).toString('base64')}\ncompose_source_sha256=${digest}\n`;
const OBSERVED_AT = '2026-10-06T05:00:00.000Z';
const TARGET = Object.freeze({
  mappingId: 'github:Patricked-code/Portal:s1:portal_api',
  repositoryId: 'github:Patricked-code/Portal',
  serverPath: '/opt/apps/portal-api',
  composeProject: provisionedComposeProject('portal', 'github:Patricked-code/Portal:s1:portal_api', 'github:Patricked-code/Portal')
});
/** What the consent page named: the resolved target the executor must still find. */
const EXPECTED = Object.freeze({ repositoryId: TARGET.repositoryId, serverPath: TARGET.serverPath, composeProject: TARGET.composeProject });
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
    activationReadiness: [{ mappingId: TARGET.mappingId, status: 'READY', reasonCodes: [] }],
    serverBindings: [{
      mappingId: TARGET.mappingId, repositoryId: TARGET.repositoryId, projectId: 'portal', projectUid: 'uid',
      componentRole: 'api', serverId: 's1', serverPath: TARGET.serverPath, realPath: null, realPathVerified: false,
      environment: 'production'
    }],
    governanceEvidence: {
      mappings: [{
        mappingId: TARGET.mappingId, repositoryId: TARGET.repositoryId, projectId: 'portal',
        officialBranch: 'main', allowedBranchPrefixes: ['claude/'], directMainPush: false, status: 'active',
        capabilities: { deploy: true }, backupRequired: true, rollbackMethod: 'restore_previous_release'
      }]
    }
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
    [{}, { secrets: { key: { file: '/root/.ssh/id_ed25519' } } }, 'COMPOSE_FILE_SOURCE_OUTSIDE_PROJECT'],
    // A named volume or network can bind a host path or join the host network through its driver.
    [{}, { volumes: { db: { name: 'db', driver: 'local', driver_opts: { type: 'none', o: 'bind', device: '/etc' } } } }, 'COMPOSE_VOLUME_DRIVER'],
    [{}, { volumes: { db: { name: 'db', driver: 'nfs' } } }, 'COMPOSE_VOLUME_DRIVER'],
    [{}, { networks: { default: { name: 'n', driver: 'macvlan' } } }, 'COMPOSE_NETWORK_DRIVER'],
    [{}, { networks: { default: { name: 'n', driver: 'bridge', driver_opts: { 'com.docker.network.bridge.host_binding_ipv4': '0.0.0.0' } } } }, 'COMPOSE_NETWORK_DRIVER'],
    // Only reviewed keys run: one that hands the engine to a container, reads a host file, runs a host
    // program or hook, or reaches the host another way is unsupported, a Compose feature to come included.
    [{ use_api_socket: true }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ env_file: [{ path: '/etc/environment', required: true }] }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ label_file: ['/etc/hostname'] }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ post_start: [{ command: ['id'], privileged: true }] }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ provider: { type: 'model', options: {} } }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ net: 'host' }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ log_driver: 'syslog' }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ volume_driver: 'local-persist' }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ cgroup_parent: '/' }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ runtime: 'runc' }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ gpus: 'all' }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ build: { context: dir, privileged: true } }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ build: { context: dir, entitlements: ['network.host'] } }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ build: { context: dir, cache_to: ['type=local,dest=/etc'] } }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{}, { models: { llm: { model: 'ai/x' } } }, 'COMPOSE_KEY_UNSUPPORTED'],
    // The engine's default bridge is shared with every container on the host: never the project network.
    [{ network_mode: 'bridge' }, {}, 'COMPOSE_SHARED_NETWORK'],
    [{ network_mode: 'default' }, {}, 'COMPOSE_SHARED_NETWORK'],
    [{ network_mode: 'service:elsewhere' }, {}, 'COMPOSE_HOST_NAMESPACE'],
    // A network or volume named outside the project joins whatever already carries that name.
    [{}, { networks: { default: { name: 'bridge' } } }, 'COMPOSE_EXTERNAL_RESOURCE'],
    [{}, { volumes: { db: { name: 'other_app_data' } } }, 'COMPOSE_EXTERNAL_RESOURCE'],
    // A profile file or a type outside the allowed set can lift the confinement as surely as "unconfined".
    [{ security_opt: ['seccomp=/opt/apps/portal-api/permissive.json'] }, {}, 'COMPOSE_SECURITY_OPT_UNCONFINED'],
    [{ security_opt: ['label=type:spc_t'] }, {}, 'COMPOSE_SECURITY_OPT_UNCONFINED'],
    // A logging driver sends from the engine, on the host network.
    [{ logging: { driver: 'syslog', options: { 'syslog-address': 'tcp://127.0.0.1:6379' } } }, {}, 'COMPOSE_LOGGING_DRIVER'],
    [{ deploy: { resources: { reservations: { devices: [{ capabilities: ['gpu'] }] } } } }, {}, 'COMPOSE_DEVICE'],
    // A built image never takes a name another workload runs: build tags and an image name on a build are refused.
    [{ build: { context: dir, tags: ['postgres:16'] } }, {}, 'COMPOSE_KEY_UNSUPPORTED'],
    [{ image: 'postgres:16' }, {}, 'COMPOSE_BUILD_TAG']
  ];
  for (const [service, extra, code] of unsafe) {
    const result = evaluateComposeSafety(composeConfig(dir, service, extra), dir) as any;
    assert.equal(result.ok, false, code);
    assert.ok(result.findings.some((finding: any) => finding.code === code), `${code}: ${JSON.stringify(result.findings)}`);
  }
  // A finding names the key it refuses.
  assert.deepEqual(
    (evaluateComposeSafety(composeConfig(dir, { use_api_socket: true }), dir) as any).findings,
    [{ code: 'COMPOSE_KEY_UNSUPPORTED', service: 'api', key: 'use_api_socket' }]
  );
  // The default drivers, the project's own names and the confined options stay admitted.
  const local = evaluateComposeSafety(composeConfig(dir, {
    network_mode: 'none',
    security_opt: ['no-new-privileges:true'],
    logging: { driver: 'json-file', options: { 'max-size': '10m' } },
    deploy: { resources: { limits: { cpus: '1', memory: '512M' } } },
    'x-team': 'portal'
  }, {
    volumes: { db: { name: 'mcp-portal-0123456789ab_db', driver: 'local' } },
    networks: { default: { name: 'mcp-portal-0123456789ab_default', driver: 'bridge' } },
    'x-common': { restart: 'unless-stopped' }
  }), dir) as any;
  assert.deepEqual(local.findings, []);
  const shared = composeConfig(dir);
  shared.services.worker = { image: 'busybox', network_mode: 'service:api' };
  assert.deepEqual((evaluateComposeSafety(shared, dir) as any).findings, []);
  for (const invalid of [null, {}, { services: {} }, { services: { 'bad name': {} } }, 'x']) {
    assert.equal((evaluateComposeSafety(invalid, dir) as any).ok, false, JSON.stringify(invalid));
  }
});

test('the compose source is parsed before Compose loads it, whatever the YAML spells a key as', () => {
  const safe = evaluateComposeSource(SOURCE) as any;
  assert.deepEqual({ ok: safe.ok, services: safe.services, findings: safe.findings }, { ok: true, services: ['api'], findings: [] });
  assert.ok(Object.isFrozen(safe));
  // Anchors, merges, an obsolete version and extension fields are ordinary Compose.
  const anchored = [
    'version: "3.8"',
    'x-common: &common',
    '  restart: unless-stopped',
    '  logging: {driver: json-file}',
    'services:',
    '  api:',
    '    <<: *common',
    '    image: node:20',
    '    x-team: portal',
    '    build: {context: ., dockerfile: Dockerfile, args: {NODE_ENV: production}}',
    ''
  ].join('\n');
  assert.deepEqual((evaluateComposeSource(anchored) as any).findings, []);

  // Compose loads these files before the model exists, and the model no longer says where its values came from.
  const unsupported: Array<[string, string | null, string]> = [
    ['services:\n  api:\n    image: x\n    env_file: /etc/environment\n', 'api', 'env_file'],
    ['services:\n  api:\n    image: x\n    "env_file": /etc/environment\n', 'api', 'env_file'],
    ["services:\n  api:\n    image: x\n    'env_file': /etc/environment\n", 'api', 'env_file'],
    ['services: {api: {image: x, "env_file": /etc/environment}}\n', 'api', 'env_file'],
    ['services:\n  api:\n    image: x\n    "\\x65nv_file": /etc/environment\n', 'api', 'env_file'],
    ['services:\n  api:\n    image: x\n    ? "env\\\n      _file"\n    : /etc/environment\n', 'api', 'env_file'],
    ['x-k: &k env_file\nservices:\n  api:\n    image: x\n    *k : /etc/environment\n', 'api', 'env_file'],
    ['x-base: &base\n  extends: {file: /opt/apps/other/compose.yaml, service: db}\nservices:\n  api:\n    <<: *base\n', 'api', 'extends'],
    ['services:\n  api:\n    "extends": {file: /opt/apps/other/compose.yaml, service: db}\n', 'api', 'extends'],
    ['"include": [/opt/apps/other/compose.yaml]\nservices:\n  api:\n    image: x\n', null, 'include'],
    ['services:\n  api:\n    image: x\n    label_file: /etc/hostname\n', 'api', 'label_file'],
    ['services:\n  api:\n    image: x\n    use_api_socket: true\n', 'api', 'use_api_socket'],
    ['services:\n  api:\n    image: x\n    "<<": {env_file: /etc/environment}\n', 'api', '<<'],
    ['services:\n  api:\n    build: {context: ., privileged: true}\n', 'api', 'build.privileged'],
    ['models:\n  llm: {model: ai/x}\nservices:\n  api:\n    image: x\n', null, 'models']
  ];
  for (const [source, service, key] of unsupported) {
    const result = evaluateComposeSource(source) as any;
    assert.equal(result.ok, false, source);
    assert.ok(
      result.findings.some((finding: any) => finding.code === 'COMPOSE_KEY_UNSUPPORTED' && finding.service === service && finding.key === key),
      `${source}: ${JSON.stringify(result.findings)}`
    );
  }
  // What the parse cannot read exactly as Compose would fails closed: unknown or binary tags, duplicate
  // keys, several documents, non-string keys, too many aliases, or no services at all.
  const invalid = [
    'services:\n  api:\n    image: x\n    ports: !reset []\n',
    'services:\n  api:\n    image: x\n    ? !!binary ZXh0ZW5kcw==\n    : {file: /etc/a.yml, service: s}\n',
    'services:\n  api:\n    image: x\n    image: y\n',
    'services:\n  api:\n    image: x\n---\nservices: {}\n',
    'services:\n  api:\n    image: x\n    ? [a, b]\n    : x\n',
    'a: &a [x,x,x,x,x,x,x,x,x,x]\nb: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a,*a]\nc: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b,*b]\nservices: {api: {image: x, labels: [*c,*c]}}\n',
    'services: []\n',
    'version: "3"\n',
    '',
    null
  ];
  for (const source of invalid) {
    const result = evaluateComposeSource(source) as any;
    assert.equal(result.ok, false, String(source));
    assert.ok(
      result.findings.some((finding: any) => finding.code === 'COMPOSE_SOURCE_INVALID' || finding.code === 'COMPOSE_SERVICES_INVALID'),
      `${source}: ${JSON.stringify(result.findings)}`
    );
  }
  assert.equal((evaluateComposeSource(`services:\n  api:\n    image: x\n    labels: [${'"x",'.repeat(40_000)}]\n`) as any).ok, false);
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
  const sourceDigest = sha256(SOURCE);
  const scripts = [
    buildStageScript({ jobId, target: PLAN_TARGET, archiveSha256: 'f'.repeat(64) }),
    buildCreateScript({ jobId, target: PLAN_TARGET, composeFile: 'compose.yaml', createdAt: OBSERVED_AT, treeDigest: TREE, services: ['api'] }),
    buildComposeConfigScript({ target: PLAN_TARGET, composeFile: 'compose.yaml', sourceSha256: sourceDigest }),
    buildActivateScript({ jobId, target: PLAN_TARGET, composeFile: 'compose.yaml', labelsOverride: '{"services":{}}', healthTimeoutSeconds: 180, treeDigest: TREE }),
    buildRollbackScript({ jobId, target: PLAN_TARGET, composeFile: 'compose.yaml', createdInThisJob: true }),
    buildDiscardStagingScript({ jobId, target: PLAN_TARGET }),
    buildComposeConfigScript({ target: PLAN_TARGET, composeFile: 'compose.yaml', sourceSha256: sourceDigest, jobId }),
    buildComposeSourceScript({ target: PLAN_TARGET, composeFile: 'compose.yaml', treeDigest: TREE })
  ];
  for (const script of scripts) {
    assert.doesNotThrow(() => assertNoCatastrophicCommand(script));
    assert.doesNotMatch(script, /(^|[\s;&|])rm\s/m);
    assert.doesNotMatch(script, /--volumes|\s-v(\s|$)/);
  }
  const [stage, create, config, activate, rollback, , stagedConfig, source] = scripts;
  // Compose never loads a file the parsed source has not admitted: the stage and the source script only print it.
  for (const printer of [stage!, source!]) {
    assert.doesNotMatch(printer, /docker compose/);
    assert.match(printer, /compose_source_b64=/);
    assert.match(printer, /compose_source_sha256=/);
    // Only a regular file is read, never a link to a host file.
    assert.ok(printer.indexOf('[ ! -L') > 0 && printer.indexOf('[ ! -L') < printer.indexOf('compose_source_b64='));
  }
  assert.ok(source!.indexOf('checkout_modified') > 0 && source!.indexOf('checkout_modified') < source!.indexOf('compose_source_b64='));
  for (const [script, directory] of [[config!, PLAN_TARGET.serverPath], [stagedConfig!, stagingPath(PLAN_TARGET.serverPath, jobId)]] as const) {
    assert.match(script, new RegExp(`^directory='${directory.replaceAll('.', '\\.')}'$`, 'm'));
    const load = script.indexOf('config $resolution --format json');
    assert.ok(load > 0);
    // The file Compose loads is the one whose parsed source was admitted.
    assert.ok(script.includes(sourceDigest) && script.indexOf('compose_source_changed') < load);
    // --no-env-resolution is passed where Compose knows it: a second guard, never a version gate.
    const option = script.indexOf("resolution='--no-env-resolution'");
    assert.ok(option > 0 && option < load);
    assert.doesNotMatch(script, /compose_version_unsupported/);
  }
  assert.throws(() => buildComposeConfigScript({ target: PLAN_TARGET, composeFile: 'compose.yaml', sourceSha256: 'x' }));
  assert.ok(stage!.indexOf('sha256sum') < stage!.indexOf('tar '), 'the archive digest is verified before extraction');
  // Volumes a failed earlier job left behind are existing state: creation never reattaches them.
  assert.ok(stage!.indexOf('docker volume ls') > 0 && stage!.indexOf('compose_project_volumes_present') < stage!.indexOf('mkdir -p'));
  // Only the component's own compose project counts: another component of the same repository never blocks it.
  assert.doesNotMatch(stage!, /provisioning\.repository/);
  assert.match(stage!, /label=com\.docker\.compose\.project=mcp-portal-0123456789ab/);
  // The staged tree is digested; the marker keeps the digest and the activation verifies it before starting anything.
  assert.match(stage!, /tree_digest=/);
  assert.ok(stage!.indexOf('tar -tvzf') > 0 && stage!.indexOf('tar -tvzf') < stage!.indexOf('tar -xzf'), 'the archive is bounded before extraction');
  assert.match(create!, /"services":\["api"\]/);
  assert.match(create!, new RegExp(`"treeDigest":"${TREE}"`));
  assert.ok(activate!.indexOf('checkout_modified') > 0 && activate!.indexOf('checkout_modified') < activate!.indexOf('up -d --build'));
  assert.match(stage!, /--no-same-owner/);
  // Compose runs with a clean environment.
  assert.match(config!, /env -i /);
  assert.match(stagedConfig!, /env -i /);
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
    buildComposeConfigScript({ target, composeFile: 'compose.yaml', sourceSha256: sha256(SOURCE) }),
    buildComposeConfigScript({ target, composeFile: 'compose.yaml', sourceSha256: sha256(SOURCE), jobId }),
    buildComposeSourceScript({ target, composeFile: 'compose.yaml', treeDigest: TREE }),
    buildActivateScript({ jobId, target, composeFile: 'compose.yaml', labelsOverride: '{"services":{}}', healthTimeoutSeconds: 180, treeDigest: TREE }),
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
  const marker = provisioningMarker({ jobId: 'prov-20261006T050000Z-0a1b2c3d', target: PLAN_TARGET, composeFile: 'compose.yaml', createdAt: OBSERVED_AT, treeDigest: TREE, services: ['api'] });
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
  const scripts = new Map<string, string>();
  let inventory = 'docker=ok\ncomponent.0.path=absent\ncomponent.0.containers=\n';
  const results: Record<string, string> = {
    stage: `result=staged\ncompose_file=compose.yaml\n${sourceLines()}tree_digest=${TREE}\n`,
    // The model Compose prints for the staged checkout of a creation, then for a created runtime.
    'config-staging': `result=configured\ncompose_file=compose.yaml\ncompose_config_b64=${Buffer.from(JSON.stringify(composeConfig('/opt/apps/portal-api.mcp-staging-prov-20261006T050000Z-0a1b2c3d'))).toString('base64')}\n`,
    source: `result=sourced\ncompose_file=compose.yaml\n${sourceLines()}`,
    create: 'result=created\n',
    config: `result=configured\ncompose_file=compose.yaml\ncompose_config_b64=${Buffer.from(JSON.stringify(composeConfig('/opt/apps/portal-api'))).toString('base64')}\n`,
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
    readCoordination: async () => {
      calls.push({ kind: 'coordinate', detail: '' });
      return Object.freeze({ complete: true, locks: [], tasks: [] });
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
      scripts.set(phase, command);
      const key = phase === 'config' && command.includes('.mcp-staging-') ? 'config-staging' : phase;
      return { code: 0, stdout: results[key] ?? '', stderr: '' };
    },
    ...overrides
  };
  return {
    calls, files, results, scripts, deps,
    setInventory(value: string) { inventory = value; }
  };
}

async function run(h: ReturnType<typeof harness>, consent: Record<string, boolean>, expectedTarget: unknown = EXPECTED) {
  return executeProjectRuntimeProvisioning({
    request: REQUEST, consent: { creation: false, activation: false, ...consent }, expectedTarget
  } as any, h.deps as any) as any;
}

const hostPhases = (h: ReturnType<typeof harness>) => h.calls.filter((call) => call.kind === 'host').map((call) => call.detail);

test('the executor re-observes, then creates and activates a genuinely absent runtime with evidence', async () => {
  const h = harness();
  const result = await run(h, { creation: true, activation: true });
  assert.equal(result.result, 'SUCCEEDED');
  assert.equal(result.mode, 'CREATE_AND_ACTIVATE');
  assert.match(result.jobId, /^prov-20261006T050000Z-0a1b2c3d$/);
  assert.deepEqual(h.calls.map((call) => call.kind).slice(0, 4), ['observe', 'coordinate', 'admit', 'fetch']);
  // The staged source is parsed first; Compose then loads exactly that file, in the staging directory.
  assert.deepEqual(hostPhases(h), ['stage', 'config', 'create', 'activate']);
  assert.ok(h.scripts.get('config')!.includes(sha256(SOURCE)));
  assert.ok(h.scripts.get('config')!.includes(`directory='${stagingPath(TARGET.serverPath, result.jobId)}'`));
  const attestation = JSON.parse(h.files.get(`/app/data/provisioning/${result.jobId}/attestation.json`)!);
  assert.equal(attestation.result, 'SUCCEEDED');
  assert.equal(attestation.composeSourceSha256, sha256(SOURCE));
  assert.deepEqual([attestation.admission.kind, attestation.admission.defaultBranch], ['CI_GATE', 'main']);
  assert.deepEqual(attestation.coordination, { locks: 0, tasks: 0 });
  assert.equal(attestation.archiveSha256, 'f'.repeat(64));
  assert.equal(attestation.authorizationInferred, false);
  assert.deepEqual(attestation.consent, { creation: true, activation: true });
  assert.ok(Object.isFrozen(result));

  // Creation alone stops before any container starts.
  const created = harness();
  assert.equal((await run(created, { creation: true })).result, 'SUCCEEDED');
  assert.deepEqual(hostPhases(created), ['stage', 'config', 'create']);
});

test('a compose source that loads a host file is refused before Compose ever reads it', async () => {
  // A quoted key the line guard of the host would not see: the parse refuses it, and nothing loads it.
  const quoted = harness();
  quoted.results.stage = `result=staged\ncompose_file=compose.yaml\n${sourceLines(`${SOURCE.replace('    build: .\n', '    build: .\n    "env_file": /etc/environment\n')}`)}tree_digest=${TREE}\n`;
  const blocked = await run(quoted, { creation: true, activation: true });
  assert.deepEqual([blocked.result, blocked.reasonCodes], ['BLOCKED', ['COMPOSE_UNSAFE']]);
  assert.deepEqual(blocked.findings, [{ code: 'COMPOSE_KEY_UNSUPPORTED', service: 'api', key: 'env_file' }]);
  assert.deepEqual(hostPhases(quoted), ['stage', 'discard']);
  const attestation = JSON.parse(quoted.files.get(`/app/data/provisioning/${blocked.jobId}/attestation.json`)!);
  assert.deepEqual(attestation.steps.map((step: any) => `${step.id}:${step.status}`), [
    'fetch-source:DONE', 'backup:DONE', 'compose-source:BLOCKED', 'discard-staging:DONE'
  ]);

  // A source that does not match its digest, or that the host could not print whole, is never parsed.
  for (const stage of [
    `result=staged\ncompose_file=compose.yaml\n${sourceLines(SOURCE, 'b'.repeat(64))}tree_digest=${TREE}\n`,
    `result=staged\ncompose_file=compose.yaml\ntree_digest=${TREE}\n`
  ]) {
    const unreadable = harness();
    unreadable.results.stage = stage;
    const failed = await run(unreadable, { creation: true });
    assert.deepEqual([failed.result, failed.reasonCodes], ['FAILED', ['STAGE_SOURCE_UNREADABLE']]);
    assert.deepEqual(hostPhases(unreadable), ['stage', 'discard']);
  }

  // A model Compose cannot build creates nothing: the staging is discarded.
  const unbuilt = harness();
  unbuilt.results['config-staging'] = 'result=failed\nreason=compose_invalid\n';
  const invalid = await run(unbuilt, { creation: true, activation: true });
  assert.deepEqual([invalid.result, invalid.reasonCodes], ['FAILED', ['CONFIG_COMPOSE_INVALID']]);
  assert.deepEqual(hostPhases(unbuilt), ['stage', 'config', 'discard']);

  // A runtime created earlier has its source parsed again, from the checkout its marker digests.
  const marker = provisioningMarker({ jobId: 'prov-20261005T050000Z-00000000', target: PLAN_TARGET, composeFile: 'compose.yaml', createdAt: OBSERVED_AT, treeDigest: TREE, services: ['api'] });
  const existing = harness();
  existing.setInventory(`docker=ok\ncomponent.0.path=present\ncomponent.0.containers=\ncomponent.0.marker=${Buffer.from(JSON.stringify({ ...marker, composeProject: TARGET.composeProject })).toString('base64')}\n`);
  existing.results.source = `result=sourced\ncompose_file=compose.yaml\n${sourceLines('include: [/opt/apps/other/compose.yaml]\nservices:\n  api:\n    image: x\n')}`;
  const refused = await run(existing, { activation: true });
  assert.deepEqual([refused.mode, refused.result, refused.reasonCodes], ['ACTIVATE', 'BLOCKED', ['COMPOSE_UNSAFE']]);
  assert.deepEqual(refused.findings, [{ code: 'COMPOSE_KEY_UNSUPPORTED', service: null, key: 'include' }]);
  assert.deepEqual(hostPhases(existing), ['source']);
  assert.ok(existing.scripts.get('source')!.includes(TREE));
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
  const marker = provisioningMarker({ jobId: 'prov-20261005T050000Z-00000000', target: { ...PLAN_TARGET, composeProject }, composeFile: 'compose.yaml', createdAt: OBSERVED_AT, treeDigest: TREE, services: ['api'] });
  created.setInventory(`docker=ok\ncomponent.0.path=present\ncomponent.0.containers=\ncomponent.0.marker=${Buffer.from(JSON.stringify(marker)).toString('base64')}\n`);
  assert.deepEqual((await run(created, { activation: true })).reasonCodes, ['REVISION_CI_FAILED']);
  assert.deepEqual(hostPhases(created), []);
});

test('a consent given for another resolved target never runs', async () => {
  for (const expected of [{ ...EXPECTED, serverPath: '/opt/apps/portal-old' }, { ...EXPECTED, repositoryId: 'github:Patricked-code/Other' }, null]) {
    const h = harness();
    const refused = await run(h, { creation: true, activation: true }, expected);
    assert.deepEqual([refused.result, refused.reasonCodes], ['REFUSED', ['TARGET_CHANGED_SINCE_CONSENT']], JSON.stringify(expected));
    assert.equal(h.calls.some((call) => ['admit', 'fetch', 'host', 'write-file'].includes(call.kind)), false);
  }
});

test('the checkout is verified against its creation digest before any activation', async () => {
  // Creation records the digest of the staged tree; the same job's activation verifies it.
  const created = harness();
  assert.equal((await run(created, { creation: true, activation: true })).result, 'SUCCEEDED');
  assert.match(created.scripts.get('create')!, new RegExp(`"treeDigest":"${TREE}"`));
  assert.ok(created.scripts.get('activate')!.includes(TREE));
  // A stage that reports no digest creates nothing.
  const undigested = harness();
  undigested.results.stage = undigested.results.stage!.replace(/tree_digest=.*\n/, '');
  const failed = await run(undigested, { creation: true });
  assert.deepEqual([failed.result, failed.reasonCodes], ['FAILED', ['STAGE_TREE_DIGEST_MISSING']]);
  assert.deepEqual(hostPhases(undigested), ['stage', 'discard']);

  // A runtime created earlier is activated only if its checkout still matches the digest of its marker.
  const composeProject = TARGET.composeProject;
  const marker = provisioningMarker({ jobId: 'prov-20261005T050000Z-00000000', target: { ...PLAN_TARGET, composeProject }, composeFile: 'compose.yaml', createdAt: OBSERVED_AT, treeDigest: TREE, services: ['api'] });
  const edited = harness();
  edited.setInventory(`docker=ok\ncomponent.0.path=present\ncomponent.0.containers=\ncomponent.0.marker=${Buffer.from(JSON.stringify(marker)).toString('base64')}\n`);
  edited.results.activate = 'result=failed\nreason=checkout_modified\n';
  const refused = await run(edited, { activation: true });
  assert.deepEqual([refused.mode, refused.result, refused.reasonCodes, refused.rollback], ['ACTIVATE', 'FAILED', ['ACTIVATE_CHECKOUT_MODIFIED'], 'NOT_NEEDED']);
  assert.deepEqual(hostPhases(edited), ['source', 'config', 'activate']);
  assert.ok(edited.scripts.get('activate')!.includes(TREE));
  // A marker without a digest is not a created runtime: the present path blocks.
  const { treeDigest: _digest, ...legacy } = marker as any;
  const old = harness();
  old.setInventory(`docker=ok\ncomponent.0.path=present\ncomponent.0.containers=\ncomponent.0.marker=${Buffer.from(JSON.stringify(legacy)).toString('base64')}\n`);
  assert.deepEqual((await run(old, { activation: true })).reasonCodes, ['TARGET_PATH_PRESENT']);
});

test('the tree digest ignores the provisioning files and changes with any content, mode or link change', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-f03-tree-'));
  try {
    const digest = (shell: string) => {
      const result = spawnSync(shell, ['-c', `${PROVISIONING_TREE_DIGEST_SHELL}\ntree_digest "$1"`, 'tree-digest', directory], { encoding: 'utf8', timeout: 10_000 });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };
    await mkdir(join(directory, 'sub'));
    await writeFile(join(directory, 'a.txt'), 'alpha\n');
    await writeFile(join(directory, 'sub', 'b.txt'), 'beta\n');
    await writeFile(join(directory, 'run.sh'), '#!/bin/sh\n');
    await chmod(join(directory, 'run.sh'), 0o755);
    await symlink('sub/b.txt', join(directory, 'link'));
    const base = digest('sh');
    assert.match(base, /^[0-9a-f]{64}$/);
    assert.equal(digest('bash'), base);
    // The marker and the labels written by provisioning are not part of the checkout.
    await writeFile(join(directory, PROVISIONING_MARKER_FILE), '{}\n');
    await writeFile(join(directory, '.mcp-provisioning.labels.json'), '{}\n');
    assert.equal(digest('sh'), base);
    const changes: Array<[() => Promise<void>, () => Promise<void>]> = [
      [() => writeFile(join(directory, 'a.txt'), 'alpha!\n'), () => writeFile(join(directory, 'a.txt'), 'alpha\n')],
      [() => chmod(join(directory, 'run.sh'), 0o644), () => chmod(join(directory, 'run.sh'), 0o755)],
      // Any mode change counts, not only the owner's execute bit.
      [() => chmod(join(directory, 'a.txt'), 0o654), () => chmod(join(directory, 'a.txt'), 0o644)],
      [async () => { await unlink(join(directory, 'link')); await symlink('a.txt', join(directory, 'link')); },
        async () => { await unlink(join(directory, 'link')); await symlink('sub/b.txt', join(directory, 'link')); }],
      [() => writeFile(join(directory, 'sub', 'new.txt'), 'new\n'), () => unlink(join(directory, 'sub', 'new.txt'))]
    ];
    for (const [change, revert] of changes) {
      await change();
      assert.notEqual(digest('sh'), base);
      await revert();
      assert.equal(digest('sh'), base);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the host prints the compose file whole and only from a regular file of an unchanged checkout', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-f03-source-'));
  const outside = await mkdtemp(join(tmpdir(), 'mcp-f03-outside-'));
  try {
    const digest = () => spawnSync('sh', ['-c', `${PROVISIONING_TREE_DIGEST_SHELL}\ntree_digest "$1"`, 'tree-digest', directory], { encoding: 'utf8' }).stdout.trim();
    const print = (treeDigest = digest()) => {
      const script = buildComposeSourceScript({ target: PLAN_TARGET, composeFile: 'compose.yaml', treeDigest })
        .replace(`directory='${PLAN_TARGET.serverPath}'`, `directory='${directory}'`);
      const results = ['sh', 'bash'].map((shell) => spawnSync(shell, ['-c', script], { encoding: 'utf8', timeout: 10_000 }).stdout);
      assert.equal(results[0], results[1]);
      return new Map(results[0]!.trim().split('\n').map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
    };
    await writeFile(join(directory, 'compose.yaml'), SOURCE);
    const printed = print();
    assert.equal(printed.get('result'), 'sourced');
    assert.equal(Buffer.from(printed.get('compose_source_b64')!, 'base64').toString('utf8'), SOURCE);
    assert.equal(printed.get('compose_source_sha256'), sha256(SOURCE));
    // A checkout edited since its creation is never read.
    assert.equal(print('0'.repeat(64)).get('reason'), 'checkout_modified');
    // A link, even to a file of the checkout, is never followed to print a host file.
    await writeFile(join(outside, 'secret.yaml'), 'services: {}\n');
    await unlink(join(directory, 'compose.yaml'));
    await symlink(join(outside, 'secret.yaml'), join(directory, 'compose.yaml'));
    assert.equal(print().get('reason'), 'compose_not_regular');
    // An oversized file is never printed.
    await unlink(join(directory, 'compose.yaml'));
    await writeFile(join(directory, 'compose.yaml'), `${SOURCE}#${'x'.repeat(100_000)}\n`);
    assert.equal(print().get('reason'), 'compose_source_too_large');
  } finally {
    await rm(directory, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('the installed Compose loads host files the model may not show: only the parsed source refuses them all', async (t) => {
  const help = spawnSync('docker', ['compose', 'config', '--help'], { encoding: 'utf8', timeout: 30_000 });
  if (help.status !== 0 || !help.stdout.includes('--no-env-resolution')) {
    t.skip('no Docker Compose with config --no-env-resolution on this host');
    return;
  }
  const work = await mkdtemp(join(tmpdir(), 'mcp-f03-compose-'));
  try {
    const host = join(work, 'host');
    const project = join(work, 'project');
    await mkdir(host);
    await mkdir(join(project, 'data'), { recursive: true });
    await writeFile(join(host, 'host.env'), 'LEAKED=from-the-host-env-file\n');
    await writeFile(join(host, 'compose.yaml'), 'services:\n  db:\n    image: postgres\n    environment:\n      PASSWORD: from-the-host-compose-file\n');
    // The executor's own invocation, with a clean environment.
    const model = async (source: string) => {
      await writeFile(join(project, 'compose.yaml'), source);
      const result = spawnSync('docker', ['compose', '-p', 'mcp-probe', '-f', 'compose.yaml', 'config', '--no-env-resolution', '--format', 'json'], {
        cwd: project, encoding: 'utf8', timeout: 30_000, env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: process.env.HOME ?? '/root' }
      });
      assert.equal(result.status, 0, result.stderr);
      return { text: result.stdout, json: JSON.parse(result.stdout) };
    };
    // The fixture project builds a model the policy admits.
    const admitted = await model(SOURCE);
    assert.deepEqual(evaluateComposeSafety(admitted.json, project).findings, []);
    // An env file: Docker Compose v5.1.1 keeps it in the model, unread, and the model refuses it by name;
    // v2.38.2 reads it anyway and keeps no trace of where the value came from. The parse refuses it on both.
    const quoted = `services:\n  api:\n    image: x\n    "env_file": ${join(host, 'host.env')}\n`;
    const envFile = await model(quoted);
    if (envFile.text.includes('from-the-host-env-file')) {
      assert.doesNotMatch(envFile.text, /env_file/);
    } else {
      assert.ok(evaluateComposeSafety(envFile.json, project).findings.some((finding: any) => finding.key === 'env_file'));
    }
    assert.ok(evaluateComposeSource(quoted).findings.some((finding: any) => finding.key === 'env_file'));
    // A host file extended through a quoted key is read and merged without a trace: only the parsed source refuses it.
    const extended = `services:\n  api:\n    "extends": {file: ${join(host, 'compose.yaml')}, service: db}\n`;
    const loaded = await model(extended);
    assert.match(loaded.text, /from-the-host-compose-file/);
    assert.doesNotMatch(loaded.text, /"extends"/);
    assert.ok(evaluateComposeSource(extended).findings.some((finding: any) => finding.key === 'extends'));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test('work claimed or locked on the component, or unreadable coordination, refuses before any write', async () => {
  const repositoryScope = 'repository:patricked-code/portal';
  const cases: Array<[unknown, string]> = [
    [{ complete: true, locks: [{ scope: repositoryScope, projectId: null }], tasks: [] }, 'TARGET_LOCKED'],
    [{ complete: true, locks: [{ scope: `component:portal:${TARGET.mappingId}`, projectId: null }], tasks: [] }, 'TARGET_LOCKED'],
    [{ complete: true, locks: [{ scope: 'resource:other', projectId: 'portal' }], tasks: [] }, 'TARGET_LOCKED'],
    [{ complete: true, locks: [], tasks: [{ taskId: 'TASK-1', resourceScopes: [repositoryScope] }] }, 'TARGET_CLAIMED_BY_TASK'],
    [{ complete: false, locks: [], tasks: [] }, 'COORDINATION_UNAVAILABLE'],
    [null, 'COORDINATION_UNAVAILABLE']
  ];
  for (const [coordination, reasonCode] of cases) {
    const h = harness({ readCoordination: async () => coordination });
    const refused = await run(h, { creation: true, activation: true });
    assert.deepEqual([refused.result, refused.reasonCodes], ['REFUSED', [reasonCode]], reasonCode);
    assert.equal(h.calls.some((call) => ['admit', 'fetch', 'host', 'write-file'].includes(call.kind)), false, reasonCode);
  }
  const failing = harness({ readCoordination: async () => { throw new Error('store'); } });
  assert.deepEqual((await run(failing, { creation: true })).reasonCodes, ['COORDINATION_UNAVAILABLE']);
  // Another repository's or component's work never blocks this one.
  const unrelated = harness({ readCoordination: async () => ({
    complete: true,
    locks: [{ scope: 'repository:patricked-code/mcp', projectId: 'mcp' }, { scope: 'component:portal:github:Patricked-code/Portal:s1:other', projectId: null }],
    tasks: [{ taskId: 'TASK-2', resourceScopes: ['provisioning:project-runtime'] }]
  }) });
  assert.equal((await run(unrelated, { creation: true })).result, 'SUCCEEDED');
});

test('a mapping the registry does not let deploy is never provisioned', async () => {
  const governed = (change: (registry: any) => void) => harness({
    readRegistry: async () => { const value = registry(); change(value); return value; }
  });
  const cases: Array<[(registry: any) => void, string]> = [
    [(value) => { value.governanceEvidence.mappings[0].capabilities.deploy = false; }, 'GOVERNANCE_DEPLOY_CAPABILITY_DISABLED'],
    [(value) => { value.governanceEvidence.mappings[0].status = 'suspended'; }, 'GOVERNANCE_MAPPING_NOT_ACTIVE'],
    [(value) => { value.activationReadiness[0].status = 'BLOCKED'; }, 'GOVERNANCE_ACTIVATION_BLOCKED'],
    [(value) => { value.activationReadiness = []; }, 'GOVERNANCE_ACTIVATION_UNKNOWN'],
    [(value) => { delete value.governanceEvidence; }, 'GOVERNANCE_MAPPING_UNDECLARED']
  ];
  for (const [change, reasonCode] of cases) {
    const h = governed(change);
    const refused = await run(h, { creation: true, activation: true });
    assert.deepEqual([refused.result, refused.reasonCodes], ['REFUSED', [reasonCode]], reasonCode);
    assert.deepEqual(hostPhases(h), []);
  }
});

test('the tree digest fails instead of digesting a partial tree', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-f03-partial-'));
  const shim = await mkdtemp(join(tmpdir(), 'mcp-f03-shim-'));
  try {
    await writeFile(join(directory, 'a.txt'), 'alpha\n');
    const real = spawnSync('sh', ['-c', 'command -v sha256sum'], { encoding: 'utf8' }).stdout.trim();
    // A file read that fails mid-digest, as a vanished or unreadable file would.
    await writeFile(join(shim, 'sha256sum'), `#!/bin/sh\nif [ "$1" = "--" ]; then exit 1; fi\nexec ${real} "$@"\n`);
    await chmod(join(shim, 'sha256sum'), 0o755);
    for (const shell of ['sh', 'bash']) {
      const result = spawnSync(shell, ['-c', `${PROVISIONING_TREE_DIGEST_SHELL}\nif tree_digest "$1"; then echo digested; else echo failed; fi`, 'tree-digest', directory], {
        encoding: 'utf8', timeout: 10_000, env: { ...process.env, PATH: `${shim}:${process.env.PATH}` }
      });
      assert.equal(result.stdout.trim().split('\n').at(-1), 'failed', `${shell}: ${result.stdout}${result.stderr}`);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
    await rm(shim, { recursive: true, force: true });
  }
});

test('an archive is bounded by its expanded size and entry count before any extraction', async () => {
  const work = await mkdtemp(join(tmpdir(), 'mcp-f03-bomb-'));
  try {
    await mkdir(join(work, 'repo'));
    await writeFile(join(work, 'repo', 'zeros.bin'), Buffer.alloc(2 * 1024 * 1024));
    await writeFile(join(work, 'repo', 'a.txt'), 'alpha\n');
    const archive = join(work, 'source.tar.gz');
    assert.equal(spawnSync('tar', ['-czf', archive, '-C', work, 'repo']).status, 0);
    const check = (limits: { maxEntries: number; maxBytes: number }) => {
      const script = ["fail() { printf 'result=failed\\nreason=%s\\n' \"$1\"; exit 0; }", ...buildArchiveBoundsLines(archive, limits), "printf 'result=bounded\\n'"].join('\n');
      return spawnSync('sh', ['-c', script], { encoding: 'utf8', timeout: 10_000 }).stdout;
    };
    assert.match(check({ maxEntries: 100, maxBytes: 10 * 1024 * 1024 }), /result=bounded/);
    assert.match(check({ maxEntries: 100, maxBytes: 1024 * 1024 }), /reason=archive_expanded_too_large/);
    assert.match(check({ maxEntries: 2, maxBytes: 10 * 1024 * 1024 }), /reason=archive_too_many_entries/);
    assert.throws(() => buildArchiveBoundsLines("/tmp/x'; reboot", { maxEntries: 1, maxBytes: 1 }));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test('an unsafe compose model or a bad archive is discarded to quarantine, never deleted', async () => {
  const unsafe = harness();
  unsafe.results['config-staging'] = `result=configured\ncompose_file=compose.yaml\ncompose_config_b64=${Buffer.from(JSON.stringify(composeConfig('/opt/apps/portal-api.mcp-staging-prov-20261006T050000Z-0a1b2c3d', { privileged: true }))).toString('base64')}\n`;
  const blocked = await run(unsafe, { creation: true, activation: true });
  assert.equal(blocked.result, 'BLOCKED');
  assert.ok(blocked.findings.some((finding: any) => finding.code === 'COMPOSE_PRIVILEGED'));
  assert.deepEqual(hostPhases(unsafe), ['stage', 'config', 'discard']);

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
  assert.deepEqual(hostPhases(unhealthy), ['stage', 'config', 'create', 'activate', 'rollback']);
  const rollbackCommand = buildRollbackScript({ jobId: rolledBack.jobId, target: PLAN_TARGET, composeFile: 'compose.yaml', createdInThisJob: true });
  assert.match(rollbackCommand, /mv /);

  // A runtime created earlier is activated alone: no fetch and no stage; its rollback keeps the files.
  const marker = provisioningMarker({ jobId: 'prov-20261005T050000Z-00000000', target: PLAN_TARGET, composeFile: 'compose.yaml', createdAt: OBSERVED_AT, treeDigest: TREE, services: ['api'] });
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
  assert.deepEqual(hostPhases(activateOnly), ['source', 'config', 'activate', 'rollback']);
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
    // GitHub Enterprise Server keeps its /api/v3 path and serves archives from its own host.
    const enterprise: string[] = [];
    const ghes = async (url: string) => {
      enterprise.push(url);
      return url.startsWith('https://ghe.example.com/api/v3/')
        ? new Response(null, { status: 302, headers: { location: 'https://ghe.example.com/_codeload/o/r/legacy.tar.gz/sha?token=signed' } })
        : new Response(body, { status: 200 });
    };
    assert.equal((await downloadGithubArchive({
      token: 't', apiBase: 'https://ghe.example.com/api/v3', repositoryId: TARGET.repositoryId, revision: REVISION,
      destination: join(directory, 'ghes.tar.gz'), maxBytes: 1024, fetchImpl: ghes as any
    })).ok, true);
    assert.equal(enterprise[0], `https://ghe.example.com/api/v3/repos/Patricked-code/Portal/tarball/${REVISION}`);
    assert.equal((await downloadGithubArchive({
      token: 't', apiBase: 'https://api.github.com', repositoryId: 'github:o/r', revision: 'main',
      destination: join(directory, 'z.tar.gz'), maxBytes: 4, fetchImpl: fetchImpl as any
    })).ok, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
