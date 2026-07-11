import assert from 'node:assert/strict';
import test from 'node:test';

import { assertReadOnlyCommand } from '../src/ssh/safety.js';

function assertAllowed(command: string): void {
  assert.doesNotThrow(() => assertReadOnlyCommand(command));
}

function assertBlocked(command: string, label: string): void {
  assert.throws(() => assertReadOnlyCommand(command), new RegExp(label));
}

test('read-only guard does not treat .mcp or MCP text as cp command', () => {
  assertAllowed('grep -RIn OAuth src docs Migration .mcp data package.json README.md');
  assertAllowed('printf "Scan secrets MCP -- valeurs masquees\n"');
  assertAllowed('git diff -- . \':(exclude).env\' \':(exclude)secrets/**\' | sed -E -e \'s/(Bearer )[A-Za-z0-9._~+\\/=-]+/\\1***MASKED***/g\'');
});

test('read-only guard blocks cp only as a standalone shell command', () => {
  assertBlocked('cp source target', 'cp');
  assertBlocked('set -euo pipefail\ncp source target', 'cp');
  assertBlocked('grep foo file | cp source target', 'cp');
  assertBlocked('sudo cp source target', 'cp');
});

test('read-only guard still blocks other write-like commands as standalone commands', () => {
  assertBlocked('mv source target', 'mv');
  assertBlocked('rm file.txt', 'rm');
  assertBlocked('sed -i s/a/b/ file.txt', 'sed -i');
  assertBlocked('docker compose down', 'docker compose down');
  assertBlocked('pm2 restart api', 'pm2 restart');
});
