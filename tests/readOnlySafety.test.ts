import assert from 'node:assert/strict';
import test from 'node:test';

import { assertReadOnlyCommand } from '../src/ssh/safety.js';

function assertAllowed(command: string): void {
  assert.doesNotThrow(() => assertReadOnlyCommand(command));
}

function assertBlocked(command: string, label: string): void {
  assert.throws(() => assertReadOnlyCommand(command), new RegExp(label));
}

const scanMcpSecretsCommand = `set -euo pipefail
cd '/opt/apps/wealthtech-mcp-ssh-bridge'
printf 'Scan secrets MCP — valeurs masquées\\n'
printf 'Chemin: /opt/apps/wealthtech-mcp-ssh-bridge\\n\\n'
git ls-files --others --cached --exclude-standard \\
  | grep -Ev '(^|/)(node_modules|dist|build|coverage|\\.git|keys|secrets)/' \\
  | grep -Ev '(^|/)(\\.env|\\.env\\.|.*\\.pem|.*\\.key|.*\\.crt|.*\\.p12|.*\\.sql|.*\\.dump)$' \\
  | xargs -r grep -InE '(token|secret|password|privateKey|apiKey|accessToken|refreshToken|BEGIN RSA|BEGIN OPENSSH|Bearer )' 2>/dev/null \\
  | sed -E \\
      -e 's/(token|secret|password|privateKey|apiKey|accessToken|refreshToken)[[:space:]]*[:=][[:space:]]*["'"'][^"'"']+["'"']/\\1="***MASKED***"/Ig' \\
      -e 's/(Bearer )[A-Za-z0-9._~+\\/=-]+/\\1***MASKED***/g' \\
  | head -200 || true
printf '\\nScan terminé. Si aucune ligne sensible réelle ne sort, c’est bon signe.\\n'`;

const searchMcpCodeCommand = `set -euo pipefail
cd '/opt/apps/wealthtech-mcp-ssh-bridge'
grep -RIn --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=coverage --exclude-dir=keys --exclude-dir=secrets --exclude='*.pem' --exclude='*.key' --exclude='.env' --exclude='.env.*' 'OAuth' src docs Migration .mcp data package.json README.md 2>/dev/null | head -160 | sed -E \\
  -e 's/(token|secret|password|privateKey|apiKey|accessToken|refreshToken)[[:space:]]*[:=][[:space:]]*["'"'][^"'"']+["'"']/\\1="***MASKED***"/Ig' \\
  -e 's/(Bearer )[A-Za-z0-9._~+\\/=-]+/\\1***MASKED***/g'`;

test('read-only guard allows legitimate MCP, scp, tcp and literal cp text', () => {
  const allowed = [
    'grep -RIn OAuth src docs Migration .mcp data package.json README.md',
    'test -f .mcp/manifest.json',
    'printf "Scan secrets MCP -- valeurs masquees\\n"',
    'grep -RIn scp docs README.md',
    'grep -RIn tcp docs README.md',
    'grep -RIn "cp source target" docs',
    '/usr/bin/scp-helper --status',
    '/usr/bin/tcp-check --read-only',
    scanMcpSecretsCommand,
    searchMcpCodeCommand
  ];

  for (const command of allowed) assertAllowed(command);
});

test('read-only guard blocks cp across direct shell boundaries and substitutions', () => {
  const blocked = [
    'cp source target',
    'sudo cp source target',
    'CP source target',
    'cp\t source target',
    'cp     source target',
    'true; cp source target',
    'true && cp source target',
    'false || cp source target',
    'grep foo file | cp source target',
    'set -euo pipefail\ncp source target',
    'set -euo pipefail\r\ncp source target',
    '(cp source target)',
    'printf "%s" "$(cp source target)"',
    '`cp source target`',
    'if true; then cp source target; fi',
    'while true; do cp source target; done',
    'if false; then true; else cp source target; fi'
  ];

  for (const command of blocked) assertBlocked(command, 'cp');
});

test('read-only guard blocks write commands through wrappers and shell launchers', () => {
  const blocked = [
    'env cp source target',
    'sudo env cp source target',
    'env MODE=safe cp source target',
    'command cp source target',
    'xargs cp',
    'bash -c "cp source target"',
    'sh -c "cp source target"',
    'dash -c "cp source target"',
    'zsh -c "cp source target"',
    'nohup cp source target',
    'find . -type f -exec cp {} /tmp/target ;'
  ];

  for (const command of blocked) assertBlocked(command, 'write command|shell -c');
});

test('read-only guard covers every declared write-like command family', () => {
  const blocked: Array<[string, string]> = [
    ['rm file.txt', 'rm'],
    ['mv source target', 'mv'],
    ['truncate -s 0 file.txt', 'truncate'],
    ['tee output.txt', 'tee'],
    ['echo value', 'echo'],
    ['mysql database', 'mysql'],
    ['psql database', 'psql'],
    ['sed -i s/a/b/ file.txt', 'sed -i'],
    ['cat > output.txt', 'cat >'],
    ['systemctl restart service', 'systemctl restart'],
    ['pm2 restart api', 'pm2 restart'],
    ['pm2 stop api', 'pm2 stop'],
    ['docker compose down', 'docker compose down'],
    ['docker stop container', 'docker stop']
  ];

  for (const [command, label] of blocked) assertBlocked(command, label);
});
