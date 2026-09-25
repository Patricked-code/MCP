const REPOSITORY_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38}[A-Za-z0-9])?\/[A-Za-z0-9_.-]{1,100}$/;
const ED25519_PATTERN = /^ssh-ed25519 ([A-Za-z0-9+/]{40,120}={0,2})(?: ([A-Za-z0-9_.:@\/-]{1,200}))?$/;

export const GOVERNED_REPOSITORY_SSH_CA_HOST_KEY_PATH =
  '/opt/apps/wealthtech-mcp-ssh-bridge/keys/governed_repo_ssh_ca';

export const GOVERNED_REPOSITORY_SSH_CA_KEY_PATH =
  '/app/keys/governed_repo_ssh_ca';

export const GOVERNED_REPOSITORY_SSH_HOST_PUBLIC_KEY_PATH =
  '/app/keys/s1_ssh_host_ed25519.pub';

export const GOVERNED_REPOSITORY_SSH_CA_PUBLIC_PATH =
  '/etc/ssh/wealthtech-governed-repo-ssh-ca.pub';

export const GOVERNED_REPOSITORY_SSHD_CONFIG_PATH =
  '/etc/ssh/sshd_config.d/90-wealthtech-governed-repo-ca.conf';

export function validateGovernedRepository(repository: string): string {
  if (!REPOSITORY_PATTERN.test(repository)) {
    throw new Error('repository_invalid');
  }
  return repository;
}

export function validateRepositorySshPublicKey(publicKey: string): string {
  const normalized = publicKey.trim();
  if (Buffer.byteLength(normalized, 'utf8') > 512 || !ED25519_PATTERN.test(normalized)) {
    throw new Error('repository_ssh_public_key_invalid');
  }
  return normalized;
}

export function repositorySshForceCommand(repository: string): string {
  const target = validateGovernedRepository(repository);
  return `/bin/bash /opt/apps/wealthtech-mcp-ssh-bridge/scripts/governed-repository-ssh-gateway.sh ${target}`;
}

export function buildRepositorySshCaBootstrapCommand(): string {
  const key = GOVERNED_REPOSITORY_SSH_CA_HOST_KEY_PATH;
  const pub = GOVERNED_REPOSITORY_SSH_CA_PUBLIC_PATH;
  const conf = GOVERNED_REPOSITORY_SSHD_CONFIG_PATH;
  return `set -euo pipefail
umask 077
install -d -m 0700 /opt/apps/wealthtech-mcp-ssh-bridge/keys
if [ ! -f '${key}' ]; then
  ssh-keygen -t ed25519 -q -N '' -C 'wealthtech-governed-repo-ssh-ca' -f '${key}'
fi
test -f '${key}.pub'
install -m 0644 '${key}.pub' '${pub}'
test -f /etc/ssh/ssh_host_ed25519_key.pub
install -m 0644 /etc/ssh/ssh_host_ed25519_key.pub /opt/apps/wealthtech-mcp-ssh-bridge/keys/s1_ssh_host_ed25519.pub
printf '%s\\n' 'TrustedUserCAKeys ${pub}' > '${conf}'
sshd -t
systemctl reload ssh
printf 'status=READY\\n'
printf 'caFingerprint='
ssh-keygen -lf '${pub}' -E sha256 | awk '{print $2}'
`;
}
