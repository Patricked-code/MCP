import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/*
 * Configuration exclusivement fictive pour les tests.
 * Elle est définie avant les imports dynamiques des modules MCP.
 * Aucune connexion SSH ou opération de production n’est exécutée.
 */
process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-token-20260805-abcdef0123456789';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.ENABLE_WRITE_TOOLS ??= 'false';

async function loadModules() {
  const [
    readOnlyModule,
    writeScopedModule,
    policyModule
  ] = await Promise.all([
    import('../src/tools/readOnly.js'),
    import('../src/tools/writeScoped.js'),
    import('../src/tools/registrationPolicy.js')
  ]);

  return {
    registerReadOnlyTools:
      readOnlyModule.registerReadOnlyTools,

    registerScopedWriteTools:
      writeScopedModule.registerScopedWriteTools,

    filterToolRegistrations:
      policyModule.filterToolRegistrations,

    READ_ONLY_SCOPED_TOOL_NAMES:
      policyModule.READ_ONLY_SCOPED_TOOL_NAMES,

    WRITE_SCOPED_TOOL_NAMES:
      policyModule.WRITE_SCOPED_TOOL_NAMES
  };
}

function captureTools(
  register: (server: McpServer) => void
): Set<string> {
  const names = new Set<string>();

  const fakeServer = {
    tool(name: string) {
      assert.equal(
        names.has(name),
        false,
        `Outil enregistré deux fois : ${name}`
      );

      names.add(name);

      return undefined;
    }
  } as unknown as McpServer;

  register(fakeServer);

  return names;
}

test(
  'les catalogues read et write sont disjoints',
  async () => {
    const {
      READ_ONLY_SCOPED_TOOL_NAMES,
      WRITE_SCOPED_TOOL_NAMES
    } = await loadModules();

    for (const name of READ_ONLY_SCOPED_TOOL_NAMES) {
      assert.equal(
        WRITE_SCOPED_TOOL_NAMES.has(name),
        false,
        `Outil présent dans read et write : ${name}`
      );
    }
  }
);

test(
  'le mode read-only expose les lectures et aucune mutation',
  async () => {
    const {
      registerReadOnlyTools,
      READ_ONLY_SCOPED_TOOL_NAMES,
      WRITE_SCOPED_TOOL_NAMES
    } = await loadModules();

    const names = captureTools(registerReadOnlyTools);

    for (const name of READ_ONLY_SCOPED_TOOL_NAMES) {
      assert.equal(
        names.has(name),
        true,
        `Outil read-only absent : ${name}`
      );
    }

    for (const name of WRITE_SCOPED_TOOL_NAMES) {
      assert.equal(
        names.has(name),
        false,
        `Outil write exposé en lecture : ${name}`
      );
    }

    assert.equal(
      names.has('curl_domain'),
      true
    );
  }
);

test(
  'le mode write expose uniquement les mutations classées',
  async () => {
    const {
      registerScopedWriteTools,
      filterToolRegistrations,
      READ_ONLY_SCOPED_TOOL_NAMES,
      WRITE_SCOPED_TOOL_NAMES
    } = await loadModules();

    const names = captureTools(
      (server) => registerScopedWriteTools(
        filterToolRegistrations(
          server,
          WRITE_SCOPED_TOOL_NAMES
        )
      )
    );

    for (const name of WRITE_SCOPED_TOOL_NAMES) {
      assert.equal(
        names.has(name),
        true,
        `Outil write absent : ${name}`
      );
    }

    for (const name of READ_ONLY_SCOPED_TOOL_NAMES) {
      assert.equal(
        names.has(name),
        false,
        `Outil read dupliqué dans write : ${name}`
      );
    }
  }
);

test(
  'tous les outils des modules mixtes sont classifiés',
  async () => {
    const {
      READ_ONLY_SCOPED_TOOL_NAMES,
      WRITE_SCOPED_TOOL_NAMES
    } = await loadModules();

    const files = [
      'src/tools/writeScoped.ts',
      'src/tools/amfRegistry.ts',
      'src/tools/amfPublicRead.ts',
      'src/tools/brvmdataAmf.ts',
      'src/tools/sadiaafDeploy.ts',
      'src/tools/sadiaafScoped.ts',
      'src/tools/legacyFundsScoped.ts',
      'src/tools/legacyVhostsScoped.ts',
      'src/tools/nigeriaScoped.ts'
    ];

    const classified = new Set([
      ...READ_ONLY_SCOPED_TOOL_NAMES,
      ...WRITE_SCOPED_TOOL_NAMES
    ]);

    const unclassified: string[] = [];

    for (const file of files) {
      const source = readFileSync(
        new URL(`../${file}`, import.meta.url),
        'utf8'
      );

      const matches = source.matchAll(
        /server\.tool\(\s*['"]([^'"]+)['"]/g
      );

      for (const match of matches) {
        const name = match[1];

        if (!classified.has(name)) {
          unclassified.push(`${file}: ${name}`);
        }
      }
    }

    assert.deepEqual(
      unclassified,
      [],
      `Outils non classifiés : ${unclassified.join(', ')}`
    );
  }
);

test(
  'curl_domain ne contient plus aucun alias magique',
  () => {
    const source = readFileSync(
      new URL(
        '../src/tools/readOnly.ts',
        import.meta.url
      ),
      'utf8'
    );

    const forbiddenAliases = [
      'brvmdatapreflight',
      'brvmdatapush',
      'amfexport',
      'amfinfo',
      'amfcore0',
      'amfcore1',
      'amfchunk-',
      'amfhex-',
      'amfgrep-'
    ];

    for (const alias of forbiddenAliases) {
      assert.equal(
        source.includes(alias),
        false,
        `Alias magique encore présent : ${alias}`
      );
    }

    assert.match(
      source,
      /curl -I --max-time 15 https:\/\/\$\{domain\}/
    );
  }
);
