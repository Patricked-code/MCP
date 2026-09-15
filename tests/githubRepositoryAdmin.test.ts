import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

process.env.NODE_ENV = 'test';
process.env.MCP_AUTH_TOKEN ??= 'test-only-mcp-auth-value-000000';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/test-s2-key';
process.env.ENABLE_WRITE_TOOLS = 'true';
process.env.MCP_GOVERNED_SESSIONS_ENABLED = 'true';
process.env.MCP_WRITE_GATE_MODE = 'shadow';
process.env.GITHUB_ORG = 'chainsolutions-wealthtech';

const {
  createGithubOrganizationRepository
} = await import('../src/github/repositoryAdmin.js');

const {
  registerGithubAdminTools
} = await import('../src/tools/githubAdmin.js');

type RequestCall = {
  endpoint: string;
  options: Record<string, unknown>;
};

function privateRepo(name = 'Brvmchainsolutionstest') {
  return {
    id: 123,
    name,
    full_name: `chainsolutions-wealthtech/${name}`,
    private: true,
    html_url: `https://github.com/chainsolutions-wealthtech/${name}`,
    owner: { login: 'chainsolutions-wealthtech' }
  };
}

function makeRequest(sequence: Array<{ ok: boolean; status: number | null; json: unknown }>) {
  const calls: RequestCall[] = [];
  const request = async (endpoint: string, options: Record<string, unknown> = {}) => {
    calls.push({ endpoint, options });
    const next = sequence.shift();
    assert.ok(next, `Réponse GitHub simulée manquante pour ${endpoint}`);
    return {
      ...next,
      tokenExpiresAt: null,
      oauthScopes: []
    };
  };
  return { calls, request };
}

test('refuse une organisation différente de GITHUB_ORG avant tout appel réseau', async () => {
  const { calls, request } = makeRequest([]);

  await assert.rejects(
    () => createGithubOrganizationRepository({
      organization: 'other-org',
      name: 'Brvmchainsolutionstest'
    }, {
      configuredOrg: 'chainsolutions-wealthtech',
      request
    }),
    /GITHUB_REPOSITORY_ORG_NOT_ALLOWED/
  );

  assert.equal(calls.length, 0);
});

test('est idempotent quand le dépôt privé existe déjà', async () => {
  const { calls, request } = makeRequest([
    { ok: true, status: 200, json: privateRepo() }
  ]);

  const result = await createGithubOrganizationRepository({
    organization: 'chainsolutions-wealthtech',
    name: 'Brvmchainsolutionstest'
  }, {
    configuredOrg: 'chainsolutions-wealthtech',
    request
  });

  assert.equal(result.status, 'ALREADY_EXISTS');
  assert.equal(result.fullName, 'chainsolutions-wealthtech/Brvmchainsolutionstest');
  assert.equal(result.private, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.endpoint, '/repos/chainsolutions-wealthtech/Brvmchainsolutionstest');
});

test('crée uniquement un dépôt privé vide après preuve 404', async () => {
  const { calls, request } = makeRequest([
    { ok: false, status: 404, json: { message: 'Not Found' } },
    { ok: true, status: 201, json: privateRepo() }
  ]);

  const result = await createGithubOrganizationRepository({
    organization: 'chainsolutions-wealthtech',
    name: 'Brvmchainsolutionstest',
    description: 'BRVM governed shadow laboratory'
  }, {
    configuredOrg: 'chainsolutions-wealthtech',
    request
  });

  assert.equal(result.status, 'CREATED');
  assert.equal(result.private, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1]?.endpoint, '/orgs/chainsolutions-wealthtech/repos');
  assert.deepEqual(calls[1]?.options, {
    method: 'POST',
    jsonBody: {
      name: 'Brvmchainsolutionstest',
      description: 'BRVM governed shadow laboratory',
      private: true,
      auto_init: false
    }
  });
});

test('refuse de considérer un dépôt public existant comme un succès', async () => {
  const { request } = makeRequest([
    {
      ok: true,
      status: 200,
      json: {
        ...privateRepo(),
        private: false
      }
    }
  ]);

  await assert.rejects(
    () => createGithubOrganizationRepository({
      organization: 'chainsolutions-wealthtech',
      name: 'Brvmchainsolutionstest'
    }, {
      configuredOrg: 'chainsolutions-wealthtech',
      request
    }),
    /GITHUB_REPOSITORY_VISIBILITY_MISMATCH/
  );
});

test('réconcilie une course 422 par relecture du dépôt', async () => {
  const { calls, request } = makeRequest([
    { ok: false, status: 404, json: { message: 'Not Found' } },
    { ok: false, status: 422, json: { message: 'already exists' } },
    { ok: true, status: 200, json: privateRepo() }
  ]);

  const result = await createGithubOrganizationRepository({
    organization: 'chainsolutions-wealthtech',
    name: 'Brvmchainsolutionstest'
  }, {
    configuredOrg: 'chainsolutions-wealthtech',
    request
  });

  assert.equal(result.status, 'ALREADY_EXISTS');
  assert.equal(calls.length, 3);
});

test('ne propage jamais les champs sensibles renvoyés par GitHub', async () => {
  const { request } = makeRequest([
    {
      ok: true,
      status: 200,
      json: {
        ...privateRepo(),
        token: 'super-secret-value',
        private_key: 'never-return-this'
      }
    }
  ]);

  const result = await createGithubOrganizationRepository({
    organization: 'chainsolutions-wealthtech',
    name: 'Brvmchainsolutionstest'
  }, {
    configuredOrg: 'chainsolutions-wealthtech',
    request
  });

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('super-secret-value'), false);
  assert.equal(serialized.includes('never-return-this'), false);
});

test('bloque la mutation GitHub si la gouvernance Shadow n’est pas prête', async () => {
  let registeredHandler: ((input: unknown, extra: unknown) => Promise<unknown>) | null = null;
  let mutationCount = 0;
  const server = {
    tool(...args: unknown[]) {
      registeredHandler = args.at(-1) as typeof registeredHandler;
    }
  } as unknown as McpServer;

  registerGithubAdminTools(server, {
    writeEnabled: () => true,
    evaluateGovernance: async () => ({
      mode: 'shadow',
      toolName: 'github_create_repository',
      governedSessionId: null,
      currentStateVersion: 10,
      acknowledgedStateVersion: null,
      activeLockConflicts: 0,
      verdict: 'task_unclaimed',
      wouldBlock: true
    }),
    createRepository: async () => {
      mutationCount += 1;
      return {
        status: 'CREATED',
        organization: 'chainsolutions-wealthtech',
        name: 'Brvmchainsolutionstest',
        fullName: 'chainsolutions-wealthtech/Brvmchainsolutionstest',
        private: true,
        htmlUrl: 'https://github.com/chainsolutions-wealthtech/Brvmchainsolutionstest'
      };
    }
  });

  assert.ok(registeredHandler);

  await assert.rejects(
    () => registeredHandler!({
      organization: 'chainsolutions-wealthtech',
      name: 'Brvmchainsolutionstest'
    }, {}),
    /GITHUB_ADMIN_GOVERNANCE_BLOCKED:task_unclaimed/
  );

  assert.equal(mutationCount, 0);
});

test('autorise le service borné uniquement après verdict shadow_ready', async () => {
  let registeredHandler: ((input: unknown, extra: unknown) => Promise<any>) | null = null;
  let mutationCount = 0;
  const server = {
    tool(...args: unknown[]) {
      registeredHandler = args.at(-1) as typeof registeredHandler;
    }
  } as unknown as McpServer;

  registerGithubAdminTools(server, {
    writeEnabled: () => true,
    evaluateGovernance: async () => ({
      mode: 'shadow',
      toolName: 'github_create_repository',
      governedSessionId: '11111111-1111-4111-8111-111111111111',
      currentStateVersion: 10,
      acknowledgedStateVersion: 10,
      activeLockConflicts: 0,
      verdict: 'shadow_ready',
      wouldBlock: false
    }),
    createRepository: async () => {
      mutationCount += 1;
      return {
        status: 'CREATED',
        organization: 'chainsolutions-wealthtech',
        name: 'Brvmchainsolutionstest',
        fullName: 'chainsolutions-wealthtech/Brvmchainsolutionstest',
        private: true,
        htmlUrl: 'https://github.com/chainsolutions-wealthtech/Brvmchainsolutionstest'
      };
    }
  });

  assert.ok(registeredHandler);

  const response = await registeredHandler!({
    organization: 'chainsolutions-wealthtech',
    name: 'Brvmchainsolutionstest'
  }, {});

  assert.equal(mutationCount, 1);
  assert.equal(JSON.stringify(response).includes('Brvmchainsolutionstest'), true);
});
