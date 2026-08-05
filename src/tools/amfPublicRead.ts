import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runReadOnlyCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';

const MAIN_BUNDLE_URL =
  'https://www.amf-umoa.org/main.c40b014ba24aae4f.js';

async function runS1Read(
  command: string
) {
  const result = await runReadOnlyCommand(
    's1',
    command
  );

  return asText(
    commandResultToText(result)
  );
}

export function registerAmfPublicReadOnlyTools(
  server: McpServer
): void {
  server.tool(
    'amf_registry_core_chunk',
    'Lit l’un des deux fragments JSON AMF préparés localement.',
    {
      index: z.number().int().min(0).max(1)
    },
    async ({ index }) => runS1Read(
      `set -euo pipefail
test -f '/tmp/amf_core_chunk${Number(index)}.json'
cat '/tmp/amf_core_chunk${Number(index)}.json'`
    )
  );

  server.tool(
    'amf_public_main_size',
    'Retourne la taille du bundle JavaScript public principal AMF-UMOA.',
    {},
    async () => runS1Read(
      `set -euo pipefail
curl -L --compressed --silent --show-error --max-time 120 \
  '${MAIN_BUNDLE_URL}' |
wc -c`
    )
  );

  server.tool(
    'amf_public_main_slice',
    'Lit un fragment borné du bundle JavaScript public AMF-UMOA.',
    {
      start: z.number().int().min(1).max(50_000_000),
      length: z.number().int().min(1).max(1_500_000).default(1_500_000)
    },
    async ({ start, length }) => runS1Read(
      `set -euo pipefail
curl -L --compressed --silent --show-error --max-time 120 \
  '${MAIN_BUNDLE_URL}' |
tail -c +${Number(start)} |
head -c ${Number(length)}`
    )
  );

  server.tool(
    'amf_public_fetch_path',
    'Lit une ressource publique AMF-UMOA sous un chemin HTTPS explicitement validé.',
    {
      path: z.string()
        .min(1)
        .max(400)
        .regex(
          /^\/[A-Za-z0-9._~\-/?&=%]+$/,
          'Chemin public AMF invalide'
        )
    },
    async ({ path }) => runS1Read(
      `set -euo pipefail
curl -L --compressed --silent --show-error --max-time 90 \
  'https://www.amf-umoa.org${path}' |
head -c 1500000`
    )
  );

  server.tool(
    'amf_public_search_bundle',
    'Recherche un terme sûr dans le bundle JavaScript public AMF-UMOA.',
    {
      term: z.string()
        .min(2)
        .max(80)
        .regex(
          /^[A-Za-z0-9._-]+$/,
          'Terme AMF invalide'
        )
    },
    async ({ term }) => runS1Read(
      `set -euo pipefail
curl -L --compressed --silent --show-error --max-time 90 \
  '${MAIN_BUNDLE_URL}' |
grep -n -E -C 5 '${term}' |
head -c 1500000`
    )
  );
}
