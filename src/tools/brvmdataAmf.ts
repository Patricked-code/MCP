import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from '../config/env.js';
import {
  runGuardedCommand,
  runReadOnlyCommand
} from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';
import {
  assertScopedWriteToolsEnabled,
  assertWriteFlag
} from '../ssh/writeSafety.js';

const SCRIPT =
  '/opt/apps/wealthtech-mcp-ssh-bridge/scripts/brvmdata_amf_push.txt';

async function runRead(
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

async function runWrite(
  command: string
) {
  const result = await runGuardedCommand(
    's1',
    command,
    {
      intent: 'brvmdata_amf_push_branch',
      timeoutMs: 1_800_000,
      maxOutputBytes: 500_000
    }
  );

  return asText(
    commandResultToText(result)
  );
}

export function registerBrvmdataAmfTools(
  server: McpServer
): void {
  server.tool(
    'brvmdata_amf_preflight',
    'Vérifie en lecture les accès GitHub et la présence des sources AMF destinées à BRVMDATA.',
    {},
    async () => runRead(
      `set -euo pipefail
test -f '${SCRIPT}'
python3 '${SCRIPT}' preflight`
    )
  );

  server.tool(
    'brvmdata_amf_push_branch',
    'Prépare, commit et pousse les données AMF vers une branche BRVMDATA contrôlée.',
    {
      allow_write: z.boolean().default(false)
    },
    async ({ allow_write }) => {
      assertScopedWriteToolsEnabled(
        env.ENABLE_WRITE_TOOLS
      );

      assertWriteFlag(
        allow_write,
        'brvmdata_amf_push_branch'
      );

      return runWrite(
        `set -euo pipefail
test -f '${SCRIPT}'
python3 '${SCRIPT}' push`
      );
    }
  );
}
