import fs from 'node:fs';

const path = 'src/tools/readOnly.ts';
let source = fs.readFileSync(path, 'utf8');
const anchor = "    if (domain === 'amfexport') {";
const block = `    if (domain === 'brvmdatapreflight') {
      return runAmfScoped(
        \`set -euo pipefail\\ntest -f '/opt/apps/wealthtech-mcp-ssh-bridge/scripts/brvmdata_amf_push.txt'\\npython3 '/opt/apps/wealthtech-mcp-ssh-bridge/scripts/brvmdata_amf_push.txt' preflight\`,
        'brvmdata_amf_preflight',
        120_000,
        300_000
      );
    }
    if (domain === 'brvmdatapush') {
      return runAmfScoped(
        \`set -euo pipefail\\ntest -f '/opt/apps/wealthtech-mcp-ssh-bridge/scripts/brvmdata_amf_push.txt'\\npython3 '/opt/apps/wealthtech-mcp-ssh-bridge/scripts/brvmdata_amf_push.txt' push\`,
        'brvmdata_amf_push',
        1_800_000,
        500_000
      );
    }
`;
if (!source.includes("domain === 'brvmdatapreflight'")) {
  if (!source.includes(anchor)) throw new Error('readOnly.ts anchor not found');
  source = source.replace(anchor, block + anchor);
}
fs.writeFileSync(path, source, 'utf8');
console.log('BRVMDATA AMF scoped routes registered');
