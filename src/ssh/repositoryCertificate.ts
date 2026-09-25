import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { managedServers } from '../config/servers.js';
import {
  GOVERNED_REPOSITORY_SSH_CA_KEY_PATH,
  GOVERNED_REPOSITORY_SSH_HOST_PUBLIC_KEY_PATH,
  repositorySshForceCommand,
  validateGovernedRepository,
  validateRepositorySshPublicKey
} from './repositoryAccess.js';

const execFileAsync = promisify(execFile);
const RUN_ID_PATTERN = /^[0-9]{1,30}$/;

export interface RepositorySshCertificate {
  repository: string;
  principal: 'root';
  fingerprint: string;
  certificate: string;
  knownHosts: string;
  host: string;
  port: number;
  username: string;
  validForSeconds: number;
  mutationAllowed: false;
}

export async function signRepositorySshCertificate(input: {
  repository: string;
  publicKey: string;
  runId: string;
  caKeyPath?: string;
}): Promise<RepositorySshCertificate> {
  const repository = validateGovernedRepository(input.repository);
  const publicKey = validateRepositorySshPublicKey(input.publicKey);
  if (!RUN_ID_PATTERN.test(input.runId)) throw new Error('repository_ssh_run_id_invalid');

  const caKeyPath = input.caKeyPath ?? GOVERNED_REPOSITORY_SSH_CA_KEY_PATH;
  try {
    await access(caKeyPath);
  } catch {
    throw new Error('repository_ssh_ca_unavailable');
  }

  const dir = await mkdtemp(join(tmpdir(), 'governed-repo-ssh-'));
  const publicPath = join(dir, 'repository.pub');
  const certificatePath = join(dir, 'repository-cert.pub');
  try {
    await writeFile(publicPath, publicKey + '\n', { encoding: 'utf8', mode: 0o600 });
    const forceCommand = repositorySshForceCommand(repository);
    await execFileAsync('ssh-keygen', [
      '-q',
      '-s', caKeyPath,
      '-I', `governed-repo:${repository}:${input.runId}`,
      '-n', 'root',
      '-V', '-1m:+10m',
      '-O', 'clear',
      '-O', `force-command=${forceCommand}`,
      publicPath
    ], {
      timeout: 10_000,
      maxBuffer: 64 * 1024
    });

    const { stdout: fingerprintRaw } = await execFileAsync(
      'ssh-keygen',
      ['-lf', publicPath, '-E', 'sha256'],
      { timeout: 5_000, maxBuffer: 16 * 1024 }
    );
    const fingerprint = fingerprintRaw.trim().split(/\s+/)[1];
    if (!fingerprint || !fingerprint.startsWith('SHA256:')) {
      throw new Error('repository_ssh_fingerprint_invalid');
    }

    const certificate = (await readFile(certificatePath, 'utf8')).trim();
    if (!certificate.startsWith('ssh-ed25519-cert-v01@openssh.com ')) {
      throw new Error('repository_ssh_certificate_invalid');
    }

    const hostPublicKeyRaw = (await readFile(GOVERNED_REPOSITORY_SSH_HOST_PUBLIC_KEY_PATH, 'utf8')).trim();
    const hostParts = hostPublicKeyRaw.split(/\s+/);
    if (hostParts.length < 2 || hostParts[0] !== 'ssh-ed25519' || !/^[A-Za-z0-9+/]+={0,2}$/.test(hostParts[1]!)) {
      throw new Error('repository_ssh_host_key_invalid');
    }
    const s1 = managedServers.s1;
    const knownHostName = s1.port === 22 ? s1.host : `[${s1.host}]:${s1.port}`;
    const knownHosts = `${knownHostName} ${hostParts[0]} ${hostParts[1]}`;

    return {
      repository,
      principal: 'root',
      fingerprint,
      certificate,
      knownHosts,
      host: s1.host,
      port: s1.port,
      username: s1.username,
      validForSeconds: 600,
      mutationAllowed: false
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
