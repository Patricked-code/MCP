import fs from 'node:fs';
const path='src/tools/readOnly.ts';
let source=fs.readFileSync(path,'utf8');
const anchor="    const chunkMatch = domain.match(/^amfchunk-(\\d+)-(\\d+)$/);";
const block=`    if (domain === 'amfcore0' || domain === 'amfcore1') {
      const index = domain === 'amfcore0' ? 0 : 1;
      return runAmfScoped(
        \`set -euo pipefail\\ntest -f '/tmp/amf_core_chunk\${index}.json'\\ncat '/tmp/amf_core_chunk\${index}.json'\`,
        'amf_registry_core_chunk',
        120_000,
        200_000
      );
    }
`;
if (!source.includes("domain === 'amfcore0'")) {
  if (!source.includes(anchor)) throw new Error('anchor not found');
  source=source.replace(anchor,block+anchor);
}
fs.writeFileSync(path,source,'utf8');
console.log('AMF fixed core chunk endpoints registered');
