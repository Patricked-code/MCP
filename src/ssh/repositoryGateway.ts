import { managedServers, type ServerId } from '../config/servers.js';
import { runReadOnlyCommand, type CommandResult } from './client.js';
import { validateGovernedRepository } from './repositoryAccess.js';

const DOMAIN_COMMAND = 'find /var/www/vhosts -maxdepth 2 -type d -printf "%TY-%Tm-%Td %TH:%TM %p\\n" 2>/dev/null | sort | head -300';
const DOCKER_COMMAND = 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"';

export const REPOSITORY_DISCOVERY_COMMANDS = Object.freeze([
  'ping',
  'project-context',
  'list-domains-s1',
  'list-domains-s2',
  'docker-status-s1',
  'docker-status-s2',
  'write-tools-context'
] as const);

// Backward-compatible alias for the SSH force-command surface.
export const REPOSITORY_SSH_DISCOVERY_COMMANDS = REPOSITORY_DISCOVERY_COMMANDS;

export type RepositoryDiscoveryCommand = typeof REPOSITORY_DISCOVERY_COMMANDS[number];
export type RepositoryDiscoveryTransport =
  | 'github_oidc_ssh_certificate'
  | 'github_oidc_direct_discovery';
export type RepositorySshDiscoveryCommand = RepositoryDiscoveryCommand;

function publicServerContext() {
  return Object.fromEntries(
    Object.entries(managedServers).map(([id, value]) => [id, {
      id: value.id,
      label: value.label,
      host: value.host,
      port: value.port,
      username: value.username,
      protectedDomains: value.protectedDomains
    }])
  );
}

async function run(serverId: ServerId, command: string): Promise<CommandResult> {
  return runReadOnlyCommand(serverId, command, 30_000, 100_000);
}

export async function executeRepositoryDiscoveryGateway(
  repositoryInput: string,
  commandInput: string,
  transport: RepositoryDiscoveryTransport
): Promise<string> {
  const repository = validateGovernedRepository(repositoryInput);
  const command = commandInput.trim() as RepositoryDiscoveryCommand;
  if (!REPOSITORY_DISCOVERY_COMMANDS.includes(command)) {
    throw new Error('repository_discovery_command_not_allowed');
  }

  if (command === 'ping') {
    return JSON.stringify({ ok: true, repository, transport, mutationAllowed: false });
  }
  if (command === 'project-context') {
    return JSON.stringify({
      repository,
      transport,
      mode: 'read-only-first',
      mutationAllowed: false,
      servers: publicServerContext()
    }, null, 2);
  }
  if (command === 'write-tools-context') {
    return JSON.stringify({
      repository,
      transport,
      mutationAllowed: false,
      directWriteAllowed: false,
      sshWriteAllowed: false,
      writeActivation: 'MCP_SCOPED_WRITE_GATE_ONLY',
      note: 'La découverte repository est lecture seule. Toute écriture passe par les outils MCP scoped-write après autorisation.'
    }, null, 2);
  }

  const serverId: ServerId = command.endsWith('-s1') ? 's1' : 's2';
  const result = await run(serverId, command.startsWith('list-domains-') ? DOMAIN_COMMAND : DOCKER_COMMAND);
  return JSON.stringify({
    repository,
    transport,
    command,
    server: result.server,
    exitCode: result.code,
    stdout: result.stdout,
    stderr: result.stderr,
    mutationAllowed: false
  }, null, 2);
}

export async function executeRepositorySshGateway(
  repositoryInput: string,
  commandInput: string
): Promise<string> {
  try {
    return await executeRepositoryDiscoveryGateway(
      repositoryInput,
      commandInput,
      'github_oidc_ssh_certificate'
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'repository_discovery_command_not_allowed') {
      throw new Error('repository_ssh_command_not_allowed');
    }
    throw error;
  }
}
