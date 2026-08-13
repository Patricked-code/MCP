import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const OUT = '/tmp/mcp-autodeploy-governance';
const GOVERNED_DOCUMENTS = [
  'ACTIVITY_LOG.md',
  'CHANGELOG.md',
  'DECISIONS_LOG.md',
  'PRODUCTION_STATE.json',
  'SUIVI.md',
  'TASKS.md',
  'TODO.md'
];

async function output(path, content) {
  const target = join(OUT, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

await mkdir(OUT, { recursive: true });

for (const path of GOVERNED_DOCUMENTS) {
  await output(path, await readFile(path, 'utf8'));
}

console.log('Governance candidates generated from active tracked documents.');
