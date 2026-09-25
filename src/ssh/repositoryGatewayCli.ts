import { executeRepositorySshGateway } from './repositoryGateway.js';

const [repository, command] = process.argv.slice(2);
if (!repository || !command || process.argv.length !== 4) {
  process.stderr.write('repository_ssh_gateway_invalid_request\n');
  process.exit(64);
}

try {
  process.stdout.write(await executeRepositorySshGateway(repository, command));
  process.stdout.write('\n');
} catch (error) {
  const code = error instanceof Error ? error.message : 'repository_ssh_gateway_failed';
  process.stderr.write(`${code}\n`);
  process.exit(65);
}
