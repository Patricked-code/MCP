import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runGuardedCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';
import { assertWriteFlag } from '../ssh/writeSafety.js';

const EXPORT_SCRIPT = '/opt/apps/wealthtech-mcp-ssh-bridge/scripts/amf_registry_native_export.txt';
const ZIP_PATH = '/tmp/AMF_UMOA_Registre_Dynamique_Natif.zip';
const SUMMARY_PATH = '/tmp/AMF_UMOA_Registre_Dynamique_Natif.summary.json';
const SQLITE_GZ_PATH = '/tmp/AMF_UMOA_REGISTRE_DYNAMIQUE_NATIF.sqlite.gz';
const PUBLIC_DOWNLOAD_DIR = '/var/www/vhosts/wealthtechinnovations.com/httpdocs/downloads/amf-umoa';
const PUBLIC_DOWNLOAD_NAME = 'AMF_UMOA_REGISTRE_DYNAMIQUE_NATIF_2026-08-05_83fc4707fce1b3ac.sqlite.gz';
const PUBLIC_DOWNLOAD_URL = `https://wealthtechinnovations.com/downloads/amf-umoa/${PUBLIC_DOWNLOAD_NAME}`;

async function runS1Read(command: string, timeoutMs = 120_000) {
  const result = await runGuardedCommand('s1', command, { intent: 'amf_registry_native_read', timeoutMs, maxOutputBytes: 300_000 });
  return asText(commandResultToText(result));
}

async function runS1Write(command: string, intent: string, timeoutMs = 900_000) {
  const result = await runGuardedCommand('s1', command, {
    intent,
    timeoutMs,
    maxOutputBytes: 300_000
  });
  return asText(commandResultToText(result));
}

export function registerAmfRegistryTools(server: McpServer): void {
  server.tool('amf_registry_native_export', 'Extrait intégralement le registre dynamique public AMF-UMOA accueil/intervenant depuis ses API natives, crée SQLite/CSV/JSON et archive les documents liés.', {
    allow_write: z.boolean().default(false)
  }, async ({ allow_write }) => {
    assertWriteFlag(allow_write, 'amf_registry_native_export');
    return runS1Write(`set -euo pipefail\ntest -f '${EXPORT_SCRIPT}'\npython3 '${EXPORT_SCRIPT}'`, 'amf_registry_native_export', 900_000);
  });

  server.tool('amf_registry_native_info', 'Retourne les métadonnées et contrôles de la dernière extraction native AMF-UMOA.', {}, async () =>
    runS1Read(`set -euo pipefail\ntest -f '${SUMMARY_PATH}'\ncat '${SUMMARY_PATH}'`));

  server.tool('amf_registry_native_chunk', 'Retourne un fragment base64 de l’archive native AMF-UMOA afin de la transférer sans accès shell libre.', {
    offset: z.number().int().min(0),
    length: z.number().int().min(1).max(180_000).default(150_000)
  }, async ({ offset, length }) => runS1Read(`set -euo pipefail\ntest -f '${ZIP_PATH}'\nSIZE=$(stat -c %s '${ZIP_PATH}')\nOFFSET=${Number(offset)}\nLENGTH=${Number(length)}\nif [ "$OFFSET" -ge "$SIZE" ]; then printf '{"offset":%s,"length":0,"size":%s,"eof":true,"data":""}\\n' "$OFFSET" "$SIZE"; exit 0; fi\nACTUAL=$((SIZE-OFFSET)); if [ "$ACTUAL" -gt "$LENGTH" ]; then ACTUAL=$LENGTH; fi\nDATA=$(dd if='${ZIP_PATH}' bs=1 skip="$OFFSET" count="$ACTUAL" status=none | base64 -w0)\nprintf '{"offset":%s,"length":%s,"size":%s,"eof":%s,"data":"%s"}\\n' "$OFFSET" "$ACTUAL" "$SIZE" "$([ $((OFFSET+ACTUAL)) -ge "$SIZE" ] && echo true || echo false)" "$DATA"`, 900_000));

  server.tool('amf_registry_publish_download', 'Publie une copie gzip du référentiel natif AMF-UMOA dans un répertoire web dédié et vérifie son URL HTTPS.', {
    allow_write: z.boolean().default(false)
  }, async ({ allow_write }) => {
    assertWriteFlag(allow_write, 'amf_registry_publish_download');
    return runS1Write(
      `set -euo pipefail
test -f '${SQLITE_GZ_PATH}'
install -d -m 0755 '${PUBLIC_DOWNLOAD_DIR}'
install -m 0644 '${SQLITE_GZ_PATH}' '${PUBLIC_DOWNLOAD_DIR}/${PUBLIC_DOWNLOAD_NAME}'
SHA=$(sha256sum '${PUBLIC_DOWNLOAD_DIR}/${PUBLIC_DOWNLOAD_NAME}' | awk '{print $1}')
SIZE=$(stat -c %s '${PUBLIC_DOWNLOAD_DIR}/${PUBLIC_DOWNLOAD_NAME}')
printf '%s  %s\\n' "$SHA" '${PUBLIC_DOWNLOAD_NAME}' > '${PUBLIC_DOWNLOAD_DIR}/${PUBLIC_DOWNLOAD_NAME}.sha256'
chmod 0644 '${PUBLIC_DOWNLOAD_DIR}/${PUBLIC_DOWNLOAD_NAME}.sha256'
HEAD=$(curl -I -L --max-time 30 --silent --show-error '${PUBLIC_DOWNLOAD_URL}')
printf '{"url":"%s","checksum_url":"%s.sha256","path":"%s","size_bytes":%s,"sha256":"%s","http_head":%s}\\n' '${PUBLIC_DOWNLOAD_URL}' '${PUBLIC_DOWNLOAD_URL}' '${PUBLIC_DOWNLOAD_DIR}/${PUBLIC_DOWNLOAD_NAME}' "$SIZE" "$SHA" "$(printf '%s' "$HEAD" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"`,
      'amf_registry_publish_download',
      120_000
    );
  });
}
