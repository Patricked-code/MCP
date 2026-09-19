#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const profile = packageJson.mcpValidationProfile;

function fail(code, details = {}) {
  process.stderr.write(JSON.stringify({ error: code, ...details }) + '\n');
  process.exit(1);
}

if (!profile || profile.schemaVersion !== 1 || !profile.testDiscovery) {
  fail('VALIDATION_PROFILE_MISSING_OR_INVALID');
}
const discovery = profile.testDiscovery;
if (
  typeof discovery.root !== 'string'
  || !discovery.root
  || typeof discovery.suffix !== 'string'
  || !discovery.suffix
  || discovery.runnerScript !== 'test:readonly-safety'
  || !Array.isArray(discovery.dedicated)
) {
  fail('VALIDATION_TEST_DISCOVERY_INVALID');
}
if (packageJson.scripts?.[discovery.runnerScript] !== 'node scripts/run-validation-tests.mjs') {
  fail('VALIDATION_TEST_RUNNER_SCRIPT_DRIFT');
}

async function walk(relativeDirectory) {
  const absolute = path.join(root, relativeDirectory);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(relativeDirectory.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) files.push(...await walk(relative));
    else if (entry.isFile() && relative.endsWith(discovery.suffix)) files.push(relative);
  }
  return files;
}

const discovered = [...new Set(await walk(discovery.root))].sort();
const dedicated = new Map();
for (const entry of discovery.dedicated) {
  if (
    !entry
    || typeof entry.path !== 'string'
    || typeof entry.script !== 'string'
    || !packageJson.scripts?.[entry.script]
  ) {
    fail('VALIDATION_DEDICATED_TEST_INVALID');
  }
  if (dedicated.has(entry.path)) fail('VALIDATION_DEDICATED_TEST_DUPLICATE', { path: entry.path });
  dedicated.set(entry.path, entry.script);
}
for (const file of dedicated.keys()) {
  if (!discovered.includes(file)) fail('VALIDATION_DEDICATED_TEST_MISSING', { path: file });
}

const runnerTests = discovered.filter((file) => !dedicated.has(file));
if (runnerTests.length === 0) fail('VALIDATION_DISCOVERY_EMPTY');

process.stdout.write(JSON.stringify({
  validationProfile: profile.profileId,
  discoveredTests: discovered.length,
  runnerTests: runnerTests.length,
  dedicatedTests: dedicated.size
}) + '\n');

const child = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', ...runnerTests],
  {
    cwd: root,
    env: process.env,
    stdio: 'inherit'
  }
);
if (child.error) throw child.error;
process.exit(child.status ?? 1);
