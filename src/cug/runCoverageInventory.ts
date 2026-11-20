import { collectCugCoverage } from './coverageInventory.js';
import { readCugPilotPrivateKey } from './pilotCredentials.js';

async function main() {
  if (process.argv.length !== 2) {
    process.stderr.write('CUG_COVERAGE_ARGUMENTS_INVALID\n');
    process.exitCode = 2;
    return;
  }
  const report = await collectCugCoverage({ readPrivateKey: readCugPilotPrivateKey,
    fetchImpl: fetch, now: () => new Date() });
  process.stdout.write(JSON.stringify(report) + '\n');
  if (!report.complete) process.exitCode = 1;
}

void main().catch(() => {
  process.stderr.write('CUG_COVERAGE_UNAVAILABLE\n');
  process.exitCode = 1;
});
