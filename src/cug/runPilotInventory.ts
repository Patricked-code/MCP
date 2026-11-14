import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { readGitRegistryEvidence } from '../github/registry.js';
import { collectCugPilotInventory, persistCugPilotInventory } from './pilotInventory.js';

async function readPrivateKey(): Promise<string> {
  const file = await open('/app/secrets/cug-app-private.pem', constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  const bytes = Buffer.alloc(16385);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || (stat.mode & 0o777) !== 0o600 || stat.size < 1 || stat.size >= bytes.length) {
      throw Error('CUG_PILOT_KEY_UNAVAILABLE');
    }
    let size = 0;
    while (size < bytes.length) {
      const { bytesRead } = await file.read(bytes, size, bytes.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size !== stat.size) throw Error('CUG_PILOT_KEY_UNAVAILABLE');
    return bytes.subarray(0, size).toString('utf8');
  } finally {
    bytes.fill(0);
    await file.close();
  }
}

async function main() {
  const raw = process.env.MCP_CUG_WEBHOOK_PILOT_INSTALLATION_ID ?? '';
  if (!/^[1-9][0-9]*$/.test(raw)) throw Error('CUG_PILOT_INSTALLATION_REQUIRED');
  const inventory = await collectCugPilotInventory(Number(raw), {
    readPrivateKey, fetchImpl: fetch, readRegistryEvidence: readGitRegistryEvidence, now: () => new Date()
  });
  const evidenceId = await persistCugPilotInventory('/app/data/cug-pilot-inventory', inventory);
  // Output contains neither repository data nor credentials. The local file is private.
  process.stdout.write(JSON.stringify({ status: 'PILOT_SNAPSHOT_STORED', evidenceId,
    registryCandidate: inventory.registryCandidate.status, provisioningAuthorized: false }) + '\n');
}

void main().catch(() => {
  process.stderr.write('CUG_PILOT_INVENTORY_UNAVAILABLE\n');
  process.exitCode = 1;
});
