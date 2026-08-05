import fs from 'node:fs';

const path = 'src/tools/writeScoped.ts';
let source = fs.readFileSync(path, 'utf8');

const importLine = "import { registerAmfRegistryTools } from './amfRegistry.js';";
const importAnchor = "import { registerLegacyVhostsScopedTools } from './legacyVhostsScoped.js';";
if (!source.includes(importLine)) {
  if (!source.includes(importAnchor)) {
    throw new Error("Ancre d'import introuvable dans writeScoped.ts");
  }
  source = source.replace(importAnchor, `${importAnchor}\n${importLine}`);
}

const callLine = '  registerAmfRegistryTools(server);';
const callAnchor = '  registerMcpSelfWriteTools(server);';
if (!source.includes(callLine)) {
  if (!source.includes(callAnchor)) {
    throw new Error("Ancre d'enregistrement introuvable dans writeScoped.ts");
  }
  source = source.replace(callAnchor, `${callLine}\n${callAnchor}`);
}

fs.writeFileSync(path, source, 'utf8');
console.log('Enregistrement AMF-UMOA vérifié dans writeScoped.ts');
