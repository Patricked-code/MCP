export const blockedCommandFragments = [
  'rm -rf /',
  'rm -rf /*',
  'mkfs',
  'dd if=',
  ':(){',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'chmod -R 777 /',
  'chown -R',
  '>/dev/sda',
  'wipefs'
];

export function assertReadOnlyCommand(command: string): void {
  const normalized = command.trim().toLowerCase();
  for (const fragment of blockedCommandFragments) {
    if (normalized.includes(fragment.toLowerCase())) {
      throw new Error(`Commande bloquée par la politique de sécurité: ${fragment}`);
    }
  }

  const writeLike = [' rm ', ' rm\t', 'mv ', 'cp ', 'truncate ', 'sed -i', 'tee ', 'echo ', 'cat >', 'mysql ', 'psql ', 'systemctl restart', 'pm2 restart', 'pm2 stop', 'docker compose down', 'docker stop'];
  for (const fragment of writeLike) {
    if (` ${normalized}`.includes(fragment)) {
      throw new Error(`Commande non read-only bloquée: ${fragment.trim()}`);
    }
  }
}
