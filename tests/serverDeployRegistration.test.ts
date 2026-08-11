import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SERVER_FILE = new URL('../src/server.ts', import.meta.url);

test('le serveur câble les routes GitHub deploy avec OIDC et SSH gouverné', async () => {
  const source = await readFile(SERVER_FILE, 'utf8');

  assert.match(source, /createGithubDeployRouter/);
  assert.match(source, /verifyGithubOidcToken/);
  assert.match(source, /runGuardedCommand/);
  assert.match(source, /runReadOnlyCommand/);
  assert.match(source, /writeEnabled:\s*\(\)\s*=>\s*env\.ENABLE_WRITE_TOOLS/);
  assert.match(source, /intent:\s*['"]github_oidc_s1_deploy_start['"]/);
  assert.match(source, /maxOutputBytes:\s*8_192/);
});

test('les routes de déploiement sont montées avant les parseurs et routes web existants', async () => {
  const source = await readFile(SERVER_FILE, 'utf8');
  const deployIndex = source.indexOf('app.use(createGithubDeployRouter');
  const jsonIndex = source.indexOf("app.use(express.json({ limit: '2mb' }))");
  const oauthIndex = source.indexOf('registerOauthRoutes(app');
  const loginIndex = source.indexOf("app.get('/login'");

  assert.ok(deployIndex >= 0, 'routeur de déploiement absent');
  assert.ok(jsonIndex >= 0, 'parseur JSON global actuel absent');
  assert.ok(oauthIndex >= 0, 'routes OAuth existantes absentes');
  assert.ok(loginIndex >= 0, 'routes web existantes absentes');
  assert.ok(deployIndex < jsonIndex, 'le routeur deploy doit précéder le parseur JSON global');
  assert.ok(deployIndex < oauthIndex, 'le routeur deploy doit être isolé avant les routes OAuth web');
  assert.ok(deployIndex < loginIndex, 'le routeur deploy doit être isolé avant les routes de session web');
});
