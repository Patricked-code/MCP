#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const target = path.join(root, '.mcp', 'function-cartography.json');
const emitted = spawnSync(process.execPath, [
  '--import', 'tsx', path.join(root, 'scripts', 'emit-function-cartography.ts')
], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env },
  maxBuffer: 8 * 1024 * 1024
});

if (emitted.status !== 0) {
  process.stderr.write(emitted.stderr || 'function_cartography_generation_failed\n');
  process.exit(1);
}

const candidate = `${JSON.stringify(JSON.parse(emitted.stdout), null, 2)}\n`;
if (process.argv.includes('--write')) {
  await writeFile(target, candidate, 'utf8');
  process.stdout.write('Function cartography generated from runtime registrations.\n');
  process.exit(0);
}

let current = '';
try {
  current = await readFile(target, 'utf8');
} catch {
  // Strict comparison below reports the missing artifact without exposing internals.
}
if (current !== candidate) {
  const actual = current ? JSON.parse(current) : {};
  const expected = JSON.parse(candidate);
  process.stderr.write(JSON.stringify({
    error: 'FUNCTION_CARTOGRAPHY_STALE',
    actualToolCount: actual.registeredToolCount ?? null,
    expectedToolCount: expected.registeredToolCount,
    actualDigest: actual.catalogueDigest ?? null,
    expectedDigest: expected.catalogueDigest
  }));
  process.stderr.write('\n');
  process.exit(1);
}

process.stdout.write('Function cartography matches runtime registrations.\n');
