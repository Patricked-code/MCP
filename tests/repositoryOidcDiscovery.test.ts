import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  REPOSITORY_DISCOVERY_COMMANDS,
  executeRepositoryDiscoveryGateway
} from '../src/ssh/repositoryGateway.js';

const SERVER = new URL('../src/server.ts', import.meta.url);
const ROUTE = new URL('../src/evidence/githubRepositoryDiscoveryRoutes.ts', import.meta.url);

test('repository OIDC direct discovery uses the same closed discovery command set', async () => {
  assert.deepEqual(REPOSITORY_DISCOVERY_COMMANDS, [
    'ping',
    'project-context',
    'list-domains-s1',
    'list-domains-s2',
    'docker-status-s1',
    'docker-status-s2',
    'write-tools-context'
  ]);
  const ping = JSON.parse(await executeRepositoryDiscoveryGateway(
    'Patricked-code/Gouvern',
    'ping',
    'github_oidc_direct_discovery'
  ));
  assert.equal(ping.ok, true);
  assert.equal(ping.repository, 'Patricked-code/Gouvern');
  assert.equal(ping.transport, 'github_oidc_direct_discovery');
  assert.equal(ping.mutationAllowed, false);
  await assert.rejects(
    executeRepositoryDiscoveryGateway('Patricked-code/Gouvern', 'rm -rf /', 'github_oidc_direct_discovery'),
    /repository_discovery_command_not_allowed/
  );
});

test('direct repository discovery route is fixed read-only and exact-body', async () => {
  const source = await readFile(ROUTE, 'utf8');
  assert.match(source, /\/access\/github\/repository-mcp\/discovery/);
  assert.match(source, /verifyOidc/);
  assert.match(source, /executeDiscovery/);
  assert.match(source, /mutationAllowed:\s*false/);
  assert.match(source, /Object\.keys\(record\).*repository,sha/);
  assert.doesNotMatch(source, /ENABLE_WRITE_TOOLS|runGuardedCommand|scoped-write/);
});

test('server registers OIDC direct repository discovery before general JSON parsing', async () => {
  const source = await readFile(SERVER, 'utf8');
  const route = source.indexOf('createGithubRepositoryDiscoveryRouter');
  const json = source.indexOf("app.use(express.json({ limit: '2mb' }))");
  assert.ok(route >= 0, 'repository direct discovery route missing');
  assert.ok(json >= 0, 'global JSON parser missing');
  assert.ok(route < json, 'repository direct discovery must be isolated before general web routes');
  assert.match(source, /verifyGithubRepositoryMcpDiscoveryOidcToken/);
  assert.match(source, /executeRepositoryDiscoveryGateway/);
});
