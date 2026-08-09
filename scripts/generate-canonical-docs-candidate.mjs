import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const OUTPUT_ROOT = '/tmp/mcp-canonical-docs';
const DOCUMENTS = [
  'SUIVI.md',
  'TASKS.md',
  'TODO.md',
  'DEPLOYMENT_PRODUCTION.md',
  'MCP_ANTI_DISPERSION_GOVERNANCE.md'
];

const state = {
  repository: 'Patricked-code/MCP',
  branch: 'main',
  s1Root: '/opt/apps/wealthtech-mcp-ssh-bridge',
  fetchRemote: 'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
  pushRemote: 'disabled://mcp-s1-read-only',
  container: 'wealthtech_mcp_ssh_bridge'
};

const block = `\n\n## État canonique structurel\n\n\`\`\`canonical-state\n${JSON.stringify(state, null, 2)}\n\`\`\`\n`;

await mkdir(OUTPUT_ROOT, { recursive: true });

for (const path of DOCUMENTS) {
  const current = await readFile(path, 'utf8');
  if (current.includes('```canonical-state')) {
    throw new Error(`canonical-state existe déjà dans ${path}`);
  }

  const firstBreak = current.indexOf('\n');
  if (firstBreak < 0) throw new Error(`titre Markdown introuvable: ${path}`);

  const candidate = `${current.slice(0, firstBreak)}${block}${current.slice(firstBreak)}`;
  const output = join(OUTPUT_ROOT, path);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, candidate, 'utf8');
}

console.log(`Candidats canoniques générés: ${DOCUMENTS.length}`);
