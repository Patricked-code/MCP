import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  collectTargetProjectObservation,
  parseServerTargetConfiguration,
  readServerMapConfiguration,
  resolveServerTargetProject
} from '../src/liveState/targetProject.js';
import { reconcileLiveState } from '../src/liveState/reconcile.js';
import type { GitRegistryProjectEvidence } from '../src/github/registry.js';

const SHA_A = 'a'.repeat(40);
const OBSERVED_AT = '2026-10-04T17:00:00.000Z';

function registryEvidence(overrides: Partial<GitRegistryProjectEvidence> = {}): GitRegistryProjectEvidence {
  return {
    available: true,
    sourceSchemaVersion: 1,
    digest: 'd'.repeat(64),
    candidateDigest: 'e'.repeat(64),
    mappings: [
      {
        mappingId: 'github:Patricked-code/Stablecoin:s2:stablecoin_frontend',
        repositoryId: 'github:Patricked-code/Stablecoin',
        projectId: 'chainsolutions.stablecoin',
        projectUid: 'CS-STABLECOIN-001',
        componentRole: 'FRONTEND'
      }
    ],
    projects: [
      {
        projectId: 'chainsolutions.stablecoin',
        projectUid: 'CS-STABLECOIN-001',
        name: 'Stablecoin / E-WARI',
        kind: 'SINGLE_REPOSITORY_APPLICATION_WITH_EXTERNAL_API_RUNTIME',
        globalCheckpointRepositoryId: 'github:Patricked-code/Stablecoin',
        centralGovernanceRepositoryId: 'github:Patricked-code/Stablecoin',
        repositoryComponents: [
          {
            repositoryId: 'github:Patricked-code/Stablecoin',
            mappingId: 'github:Patricked-code/Stablecoin:s2:stablecoin_frontend',
            role: 'FRONTEND'
          }
        ]
      }
    ],
    activationReadiness: [],
    ...overrides
  };
}

function serverMap(targetProjectIds?: unknown) {
  return {
    schemaVersion: 1,
    servers: {
      S1: {
        role: 'mcp_host_and_destination',
        mainPath: '/opt/apps/wealthtech-mcp-ssh-bridge',
        ...(targetProjectIds === undefined ? {} : { targetProjectIds })
      },
      S2: { role: 'source_migration_server' }
    }
  };
}

function liveObservations(extra: Record<string, unknown> = {}) {
  return {
    repository: 'Patricked-code/MCP',
    github: { status: 'CURRENT', branch: 'main', head: SHA_A },
    s1: {
      status: 'CURRENT', path: '/opt/apps/wealthtech-mcp-ssh-bridge', branch: 'main', head: SHA_A,
      originMain: SHA_A, workingTreeClean: true, diffEmpty: true, fetchRemote: 'origin', pushRemote: null
    },
    runtime: {
      status: 'CURRENT', container: 'wealthtech_mcp_ssh_bridge', containerStatus: 'running',
      health: 'healthy', imageId: 'sha256:test', revision: SHA_A
    },
    documentation: {
      status: 'CURRENT', activeTask: null, declaredGithubSha: SHA_A, declaredS1Sha: SHA_A, drift: false
    },
    ...extra
  } as any;
}

test('server target configuration: absent or empty keeps the historical single-repository meaning', () => {
  assert.deepEqual(parseServerTargetConfiguration(null), { status: 'NOT_CONFIGURED' });
  assert.deepEqual(parseServerTargetConfiguration(serverMap()), { status: 'NOT_CONFIGURED' });
  assert.deepEqual(parseServerTargetConfiguration(serverMap([])), { status: 'NOT_CONFIGURED' });
  assert.deepEqual(
    parseServerTargetConfiguration(serverMap(['chainsolutions.stablecoin'])),
    { status: 'CONFIGURED', projectIds: ['chainsolutions.stablecoin'] }
  );
  for (const invalid of ['chainsolutions.stablecoin', [''], [42], ['bad id with spaces'], new Array(21).fill('x')]) {
    assert.deepEqual(
      parseServerTargetConfiguration(serverMap(invalid)),
      { status: 'INVALID', reasonCode: 'TARGET_PROJECT_CONFIGURATION_INVALID' },
      JSON.stringify(invalid)
    );
  }
  assert.deepEqual(
    parseServerTargetConfiguration({ schemaVersion: 1, servers: 'S1' }),
    { status: 'INVALID', reasonCode: 'TARGET_PROJECT_CONFIGURATION_INVALID' }
  );
});

test('a configured, registered project yields one identity-only TargetContext with unobserved components UNVERIFIED', () => {
  const resolved = resolveServerTargetProject({
    configuration: { status: 'CONFIGURED', projectIds: ['chainsolutions.stablecoin'] },
    registry: registryEvidence(),
    observedAt: OBSERVED_AT
  });

  assert.deepEqual(resolved.targetSelection, {
    source: 'server_map',
    serverId: 'S1',
    status: 'RESOLVED',
    projectIds: ['chainsolutions.stablecoin'],
    reasonCodes: []
  });
  assert.equal(resolved.targetContext?.status, 'UNVERIFIED');
  assert.equal(resolved.targetContext?.targetId, 'CS-STABLECOIN-001');
  assert.equal(resolved.targetContext?.projectId, 'chainsolutions.stablecoin');
  assert.equal(resolved.targetContext?.globalCheckpointRepositoryId, 'github:Patricked-code/Stablecoin');
  assert.deepEqual(resolved.targetContext?.components, [{
    mappingId: 'github:Patricked-code/Stablecoin:s2:stablecoin_frontend',
    repositoryId: 'github:Patricked-code/Stablecoin',
    role: 'FRONTEND',
    githubHead: null,
    runtimeRevision: null,
    freshness: 'UNVERIFIED',
    reasonCodes: ['COMPONENT_OBSERVATION_MISSING']
  }]);
  assert.equal(JSON.stringify(resolved).includes('projectSha'), false);
});

test('unregistered, multiple, invalid or unreadable targets fail closed without a TargetContext', () => {
  const cases: Array<[Parameters<typeof resolveServerTargetProject>[0], string]> = [
    [{ configuration: { status: 'CONFIGURED', projectIds: ['mcp_bridge'] }, registry: registryEvidence(), observedAt: OBSERVED_AT }, 'TARGET_PROJECT_NOT_REGISTERED'],
    [{ configuration: { status: 'CONFIGURED', projectIds: ['a.one', 'b.two'] }, registry: registryEvidence(), observedAt: OBSERVED_AT }, 'TARGET_PROJECT_MULTIPLE_NOT_SUPPORTED'],
    [{ configuration: { status: 'INVALID', reasonCode: 'TARGET_PROJECT_CONFIGURATION_INVALID' }, registry: registryEvidence(), observedAt: OBSERVED_AT }, 'TARGET_PROJECT_CONFIGURATION_INVALID'],
    [{ configuration: { status: 'CONFIGURED', projectIds: ['chainsolutions.stablecoin'] }, registry: registryEvidence({ available: false, projects: [], mappings: [] }), observedAt: OBSERVED_AT }, 'TARGET_PROJECT_REGISTRY_UNAVAILABLE'],
    [{
      configuration: { status: 'CONFIGURED', projectIds: ['chainsolutions.stablecoin'] },
      registry: registryEvidence({
        projects: [{ ...registryEvidence().projects[0]!, globalCheckpointRepositoryId: 'not-a-repository-id' }]
      }),
      observedAt: OBSERVED_AT
    }, 'TARGET_PROJECT_REGISTRY_INCOMPLETE']
  ];
  for (const [input, reasonCode] of cases) {
    const resolved = resolveServerTargetProject(input);
    assert.equal(resolved.targetContext, undefined, reasonCode);
    assert.equal(resolved.targetSelection?.status, 'UNRESOLVED', reasonCode);
    assert.deepEqual(resolved.targetSelection?.reasonCodes, [reasonCode]);
  }

  assert.deepEqual(resolveServerTargetProject({
    configuration: { status: 'NOT_CONFIGURED' },
    registry: registryEvidence(),
    observedAt: OBSERVED_AT
  }), {});
});

test('the collector adds nothing when no target is configured and reads the registry only when configured', async () => {
  let registryReads = 0;
  const readRegistry = async () => {
    registryReads += 1;
    return registryEvidence();
  };
  const now = () => new Date(OBSERVED_AT);

  const unconfigured = await collectTargetProjectObservation({
    readServerMap: async () => serverMap([]),
    readRegistry,
    now
  });
  assert.deepEqual(unconfigured, {});
  assert.equal(Object.keys(unconfigured).length, 0);
  assert.equal(registryReads, 0);

  const missingFile = await collectTargetProjectObservation({ readServerMap: async () => null, readRegistry, now });
  assert.deepEqual(missingFile, {});

  const configured = await collectTargetProjectObservation({
    readServerMap: async () => serverMap(['chainsolutions.stablecoin']),
    readRegistry,
    now
  });
  assert.equal(registryReads, 1);
  assert.equal(configured.targetSelection?.status, 'RESOLVED');
  assert.equal(configured.targetContext?.observedAt, OBSERVED_AT);

  const unreadable = await collectTargetProjectObservation({
    readServerMap: async () => { throw new Error('EACCES'); },
    readRegistry,
    now
  });
  assert.deepEqual(unreadable.targetSelection?.reasonCodes, ['TARGET_PROJECT_CONFIGURATION_UNREADABLE']);
  assert.equal(unreadable.targetContext, undefined);
});

test('server map reader treats a missing file as not configured and refuses oversized or malformed files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-server-map-'));
  try {
    assert.equal(await readServerMapConfiguration(join(directory, 'absent.json')), null);
    const valid = join(directory, 'valid.json');
    await writeFile(valid, JSON.stringify(serverMap(['chainsolutions.stablecoin'])));
    assert.deepEqual(parseServerTargetConfiguration(await readServerMapConfiguration(valid)), {
      status: 'CONFIGURED',
      projectIds: ['chainsolutions.stablecoin']
    });
    const malformed = join(directory, 'malformed.json');
    await writeFile(malformed, '{not json');
    await assert.rejects(readServerMapConfiguration(malformed));
    const oversized = join(directory, 'oversized.json');
    await writeFile(oversized, JSON.stringify({ padding: 'x'.repeat(70_000) }));
    await assert.rejects(readServerMapConfiguration(oversized));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Live State stays byte-for-byte historical without a target and records unresolved targets as contradictions', () => {
  const historicalFirst = reconcileLiveState(liveObservations(), null, new Date(OBSERVED_AT));
  const historicalSecond = reconcileLiveState(liveObservations(), historicalFirst, new Date('2026-10-04T17:01:00.000Z'));
  assert.equal('targetSelection' in historicalFirst, false);
  assert.equal('targetContext' in historicalFirst, false);
  assert.equal(historicalSecond.stateVersion, historicalFirst.stateVersion);

  const resolved = resolveServerTargetProject({
    configuration: { status: 'CONFIGURED', projectIds: ['chainsolutions.stablecoin'] },
    registry: registryEvidence(),
    observedAt: OBSERVED_AT
  });
  const targeted = reconcileLiveState(liveObservations(resolved), historicalFirst, new Date(OBSERVED_AT));
  assert.equal(targeted.stateVersion, historicalFirst.stateVersion + 1);
  assert.equal(targeted.alignment.global, historicalFirst.alignment.global);
  assert.deepEqual(targeted.contradictions, historicalFirst.contradictions);
  const later = reconcileLiveState(
    liveObservations(resolveServerTargetProject({
      configuration: { status: 'CONFIGURED', projectIds: ['chainsolutions.stablecoin'] },
      registry: registryEvidence(),
      observedAt: '2026-10-04T17:05:00.000Z'
    })),
    targeted,
    new Date('2026-10-04T17:05:00.000Z')
  );
  assert.equal(later.stateVersion, targeted.stateVersion, 'observedAt alone never advances stateVersion');

  const unresolved = reconcileLiveState(liveObservations(resolveServerTargetProject({
    configuration: { status: 'CONFIGURED', projectIds: ['mcp_bridge'] },
    registry: registryEvidence(),
    observedAt: OBSERVED_AT
  })), null, new Date(OBSERVED_AT));
  assert.ok(unresolved.contradictions.includes('TARGET_PROJECT_NOT_REGISTERED'));
  assert.equal(unresolved.alignment.global, historicalFirst.alignment.global);
  assert.equal(unresolved.targetContext, undefined);
});

test('registry project evidence carries the governance repositories needed by the TargetContext', async () => {
  const previous = process.env.MCP_GIT_REGISTRY_FILE;
  process.env.MCP_GIT_REGISTRY_FILE = 'data/mcp-git-registry.json';
  try {
    const { readGitRegistryProjectEvidence } = await import('../src/github/registry.js');
    const evidence = await readGitRegistryProjectEvidence();
    assert.equal(evidence.available, true);
    const stablecoin = evidence.projects.find((project) => project.projectId === 'chainsolutions.stablecoin');
    assert.equal(stablecoin?.globalCheckpointRepositoryId, 'github:Patricked-code/Stablecoin');
    assert.equal(stablecoin?.centralGovernanceRepositoryId, 'github:Patricked-code/Stablecoin');
  } finally {
    if (previous === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
    else process.env.MCP_GIT_REGISTRY_FILE = previous;
  }
});

test('the versioned operator configuration declares no target yet and ships inside the runtime image', async () => {
  const [mapRaw, dockerfile] = await Promise.all([
    readFile('.mcp/server-map.json', 'utf8'),
    readFile('Dockerfile', 'utf8')
  ]);
  const map = JSON.parse(mapRaw);
  assert.deepEqual(map.servers.S1.targetProjectIds, []);
  assert.deepEqual(parseServerTargetConfiguration(map), { status: 'NOT_CONFIGURED' });
  assert.match(dockerfile, /COPY \.mcp\/server-map\.json \.\/\.mcp\/server-map\.json/);
});
