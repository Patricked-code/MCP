import { existsSync } from 'node:fs';

const forbiddenFiles = ['.env', 'keys/s1_mcp_key', 'keys/s2_mcp_key'];
let failed = false;
for (const file of forbiddenFiles) {
  if (existsSync(file)) {
    console.error(`Fichier sensible présent dans le workspace local: ${file}`);
    failed = true;
  }
}

globalThis.process.exitCode = failed ? 1 : 0;
if (!failed) console.log('Contrôle minimal terminé.');
