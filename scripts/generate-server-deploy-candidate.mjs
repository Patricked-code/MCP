import { mkdir, readFile, writeFile } from 'node:fs/promises';

const SOURCE = 'src/server.ts';
const OUTPUT = '/tmp/mcp-server-candidate/server.ts';

const importAnchor = "import { readGitRegistry, recordGithubConnection, renderGitSettingsPage } from './github/registry.js';\n";
const importBlock = `${importAnchor}import { createGithubDeployRouter } from './deploy/routes.js';\nimport { verifyGithubOidcToken } from './deploy/githubOidc.js';\nimport { runGuardedCommand, runReadOnlyCommand } from './ssh/client.js';\n`;

const serverAnchor = `export async function startHttpServer(): Promise<void> {\n  const app = express();\n`;
const serverBlock = `${serverAnchor}  app.use(createGithubDeployRouter({\n    verifyOidc: verifyGithubOidcToken,\n    writeEnabled: () => env.ENABLE_WRITE_TOOLS,\n    runWrite: async (command) => runGuardedCommand('s1', command, {\n      intent: 'github_oidc_s1_deploy_start',\n      timeoutMs: 15_000,\n      maxOutputBytes: 8_192\n    }),\n    runRead: async (command) => runReadOnlyCommand('s1', command, 15_000, 8_192)\n  }));\n`;

const source = await readFile(SOURCE, 'utf8');
if (!source.includes(importAnchor)) throw new Error('server_import_anchor_missing');
if (!source.includes(serverAnchor)) throw new Error('server_start_anchor_missing');
if (source.includes("./deploy/routes.js") || source.includes('createGithubDeployRouter({')) {
  throw new Error('server_deploy_wiring_already_present');
}

const candidate = source
  .replace(importAnchor, importBlock)
  .replace(serverAnchor, serverBlock);

if (candidate === source) throw new Error('server_candidate_unchanged');
if ((candidate.match(/createGithubDeployRouter/g) || []).length !== 2) {
  throw new Error('server_deploy_wiring_count_invalid');
}

await mkdir('/tmp/mcp-server-candidate', { recursive: true });
await writeFile(OUTPUT, candidate, 'utf8');
console.log('Server deploy candidate generated.');
