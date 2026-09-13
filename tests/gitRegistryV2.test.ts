import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  assessGitRegistryV2ActivationReadiness,
  canonicalRegistryHash,
  dryRunGitRegistryV2,
  migrateGitRegistryToV2,
  validateGitRegistryV2
} = await import('../src/github/registryV2.js');

const source = JSON.parse(
  await readFile(new URL('../data/mcp-git-registry.json', import.meta.url), 'utf8')
) as unknown;

test('le dry-run convertit le registre v1 réel sans écrire ni activer de mutation', () => {
  const { candidate, report } = dryRunGitRegistryV2(source);

  assert.equal(report.sourceSchemaVersion, 1);
  assert.equal(report.targetSchemaVersion, 2);
  assert.equal(report.alreadyV2, false);
  assert.deepEqual(report.counts, {
    connections: 3,
    repositories: 5,
    mappings: 4,
    migrations: 1,
    auditEvents: 3,
    projects: 1
  });

  const mcp = candidate.mappings.find((mapping) => mapping.mappingId === 'mcp-s1-production');
  assert.ok(mcp);
  assert.equal(mcp.status, 'migration_pending');
  assert.equal(mcp.repositoryId, 'github:Patricked-code/MCP');
  assert.equal(mcp.sourceRepositoryId, 'github:Patricked-code/MCP');
  assert.equal(mcp.targetRepositoryId, 'github:chainsolutions-wealthtech/MCP');
  assert.equal(mcp.activeRepositoryId, 'github:Patricked-code/MCP');
  assert.equal(mcp.realPathVerified, false);
  assert.equal(mcp.remoteVerified, false);

  for (const mapping of candidate.mappings) {
    assert.equal(mapping.capabilities.writeFiles, false);
    assert.equal(mapping.capabilities.createBranch, false);
    assert.equal(mapping.capabilities.commit, false);
    assert.equal(mapping.capabilities.pushBranch, false);
    assert.equal(mapping.capabilities.build, false);
    assert.equal(mapping.capabilities.deploy, false);
    assert.equal(mapping.capabilities.rollback, false);
    assert.equal(mapping.capabilities.quarantine, false);
    assert.equal(mapping.capabilities.purge, false);
  }

  for (const connection of candidate.connections) {
    assert.equal(connection.credentialRef, null);
    assert.equal(connection.credentialsInRegistry, false);
  }
});

test('C1 reste fail-closed tant que les preuves d activation sont incomplètes', () => {
  const candidate = migrateGitRegistryToV2(source);
  const readiness = assessGitRegistryV2ActivationReadiness(candidate);
  const mcp = readiness.find((entry) => entry.mappingId === 'mcp-s1-production');

  assert.ok(mcp);
  assert.equal(mcp.status, 'BLOCKED');
  for (const reasonCode of [
    'MAPPING_STATUS_NOT_VALIDATED',
    'MAPPING_PATH_UNVERIFIED',
    'MAPPING_REMOTE_UNVERIFIED',
    'MAPPING_DOMAIN_UNVERIFIED',
    'REPOSITORY_CREDENTIAL_UNVERIFIED',
    'MIGRATION_PENDING',
    'ROLLBACK_UNVERIFIED'
  ]) {
    assert.ok(mcp.reasonCodes.includes(reasonCode), reasonCode);
  }

  const sourceMapping = candidate.mappings.find((mapping) => mapping.mappingId === 'mcp-s1-production');
  assert.ok(sourceMapping);
  assert.equal(sourceMapping.status, 'migration_pending');
  assert.equal(sourceMapping.realPathVerified, false);
  assert.equal(sourceMapping.remoteVerified, false);
});

test('C1 rend READY un mapping validé lorsque toutes les preuves sont présentes sans le muter', () => {
  const candidate = structuredClone(migrateGitRegistryToV2(source));
  const mapping = candidate.mappings.find((entry) => entry.mappingId === 'mcp-s1-production');
  assert.ok(mapping);

  mapping.status = 'validated';
  mapping.realPath = '/opt/apps/wealthtech-mcp-ssh-bridge';
  mapping.realPathVerified = true;
  mapping.remoteVerified = true;
  mapping.domainVerified = true;
  mapping.rollbackMethod = 'governed_exact_sha_rollback';
  mapping.healthChecks = ['/health', '/mcp'];

  const repository = candidate.repositories.find((entry) => entry.repositoryId === mapping.repositoryId);
  assert.ok(repository);
  const connection = candidate.connections.find(
    (entry) => entry.accountLogin.toLowerCase() === repository.owner.toLowerCase()
  );
  assert.ok(connection);
  connection.configuredStatus = 'validated';
  connection.credentialRef = 'github-account:Patricked-code';

  const migration = candidate.migrations.find((entry) => entry.mappingId === mapping.mappingId);
  assert.ok(migration);
  migration.status = 'migration_completed';

  const before = canonicalRegistryHash(candidate);
  const readiness = assessGitRegistryV2ActivationReadiness(candidate);
  const mcp = readiness.find((entry) => entry.mappingId === 'mcp-s1-production');

  assert.deepEqual(mcp, {
    mappingId: 'mcp-s1-production',
    status: 'READY',
    reasonCodes: []
  });
  assert.equal(canonicalRegistryHash(candidate), before);
});

test('la migration est déterministe et idempotente sur un candidat v2', () => {
  const first = migrateGitRegistryToV2(source);
  const second = migrateGitRegistryToV2(source);
  const third = migrateGitRegistryToV2(first);

  assert.deepEqual(first, second);
  assert.deepEqual(first, third);
  assert.equal(canonicalRegistryHash(first), canonicalRegistryHash(second));

  const rerun = dryRunGitRegistryV2(first);
  assert.equal(rerun.report.alreadyV2, true);
  assert.equal(rerun.report.sourceHash, rerun.report.candidateHash);
});

test('le validateur rejette les identifiants dupliqués', () => {
  const candidate = structuredClone(migrateGitRegistryToV2(source));
  candidate.connections.push(structuredClone(candidate.connections[0]));

  assert.throws(
    () => validateGitRegistryV2(candidate),
    /dupliqué/
  );
});

test('le validateur rejette les signaux de credential', () => {
  const candidate = structuredClone(migrateGitRegistryToV2(source));
  const credentialSignal = ['ghp', 'A'.repeat(30)].join('_');
  candidate.connections[0].warnings.push(credentialSignal);

  assert.throws(
    () => validateGitRegistryV2(candidate),
    /credential interdit/
  );
});

test('une structure v1 invalide est refusée', () => {
  assert.throws(
    () => migrateGitRegistryToV2({ version: 1, accounts: [], repoMappings: [], auditEvents: [] }),
    /updatedAt/
  );
});
