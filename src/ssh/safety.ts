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

  const commandBoundary = String.raw`(?:^|[;&|()\n\r])\s*(?:sudo\s+)?`;
  const writeLikePatterns: Array<{ label: string; pattern: RegExp }> = [
    { label: 'rm', pattern: new RegExp(`${commandBoundary}rm(?:\\s|$)`, 'i') },
    { label: 'mv', pattern: new RegExp(`${commandBoundary}mv(?:\\s|$)`, 'i') },
    { label: 'cp', pattern: new RegExp(`${commandBoundary}cp(?:\\s|$)`, 'i') },
    { label: 'truncate', pattern: new RegExp(`${commandBoundary}truncate(?:\\s|$)`, 'i') },
    { label: 'tee', pattern: new RegExp(`${commandBoundary}tee(?:\\s|$)`, 'i') },
    { label: 'echo', pattern: new RegExp(`${commandBoundary}echo(?:\\s|$)`, 'i') },
    { label: 'mysql', pattern: new RegExp(`${commandBoundary}mysql(?:\\s|$)`, 'i') },
    { label: 'psql', pattern: new RegExp(`${commandBoundary}psql(?:\\s|$)`, 'i') },
    { label: 'sed -i', pattern: new RegExp(`${commandBoundary}sed\\s+(?:-[A-Za-z]*i[A-Za-z]*\\b|--in-place\\b)`, 'i') },
    { label: 'cat >', pattern: new RegExp(`${commandBoundary}cat\\s*>`, 'i') },
    { label: 'systemctl restart', pattern: new RegExp(`${commandBoundary}systemctl\\s+restart(?:\\s|$)`, 'i') },
    { label: 'pm2 restart', pattern: new RegExp(`${commandBoundary}pm2\\s+restart(?:\\s|$)`, 'i') },
    { label: 'pm2 stop', pattern: new RegExp(`${commandBoundary}pm2\\s+stop(?:\\s|$)`, 'i') },
    { label: 'docker compose down', pattern: new RegExp(`${commandBoundary}docker\\s+compose\\s+down(?:\\s|$)`, 'i') },
    { label: 'docker stop', pattern: new RegExp(`${commandBoundary}docker\\s+stop(?:\\s|$)`, 'i') }
  ];

  for (const { label, pattern } of writeLikePatterns) {
    if (pattern.test(normalized)) {
      throw new Error(`Commande non read-only bloquée: ${label}`);
    }
  }
}
