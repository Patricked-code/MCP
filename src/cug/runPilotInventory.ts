import { readGitRegistryEvidence } from '../github/registry.js';
import { collectCugPilotInventory, persistCugPilotInventory } from './pilotInventory.js';
import { readCugPilotPrivateKey } from './pilotCredentials.js';

async function main() {
  const raw = process.env.MCP_CUG_WEBHOOK_PILOT_INSTALLATION_ID ?? '';
  if (!/^[1-9][0-9]*$/.test(raw)) throw Error('CUG_PILOT_INSTALLATION_REQUIRED');
  const inventory = await collectCugPilotInventory(Number(raw), {
    readPrivateKey: readCugPilotPrivateKey, fetchImpl: fetch, readRegistryEvidence: readGitRegistryEvidence, now: () => new Date()
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
