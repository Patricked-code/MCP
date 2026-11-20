import { readGitRegistryEvidence } from '../github/registry.js';
import { readCugPilotPrivateKey } from './pilotCredentials.js';
import { collectCugScopedInventory, parseCugInventoryTargetArgs, persistCugPilotInventory } from './pilotInventory.js';

async function main() {
  const target = parseCugInventoryTargetArgs(process.argv.slice(2));
  if (!target) {
    process.stderr.write('CUG_SCOPED_INVENTORY_SCOPE_INVALID\n');
    process.exitCode = 2;
    return;
  }
  const inventory = await collectCugScopedInventory(target, {
    readPrivateKey: readCugPilotPrivateKey, fetchImpl: fetch, readRegistryEvidence: readGitRegistryEvidence, now: () => new Date()
  });
  // Same bounded private evidence store as the UAES operator pilot, not a new registry.
  const evidenceId = await persistCugPilotInventory('/app/data/cug-pilot-inventory', inventory);
  process.stdout.write(JSON.stringify({ status: 'CUG_SCOPED_SNAPSHOT_STORED', evidenceId,
    registryCandidate: inventory.registryCandidate.status, serverBinding: 'NOT_VERIFIED',
    provisioningAuthorized: false }) + '\n');
}

void main().catch(error => {
  const code = error instanceof Error && ['CUG_PILOT_INSTALLATION_NOT_ATTESTED', 'GITHUB_APP_INSTALLATION_TOKEN_REFUSED']
    .includes(error.message) ? 'CUG_SCOPED_COVERAGE_UNVERIFIED' : 'CUG_SCOPED_INVENTORY_UNAVAILABLE';
  process.stderr.write(code + '\n');
  process.exitCode = 1;
});
