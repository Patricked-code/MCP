#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

import {
  applyDerivedProgramReadiness,
  deriveProgramReadiness,
  selectProgramCandidates
} from './program-backlog-convergence-lib.mjs';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const args = new Set(process.argv.slice(2));
const modes = ['--check', '--write', '--next'].filter((mode) => args.has(mode));

if (modes.length > 1) {
  console.error('Choose only one of --check, --write or --next.');
  process.exit(2);
}

const mode = modes[0] ?? '--check';
const raw = await readFile(PROGRAM_PATH, 'utf8');
const program = JSON.parse(raw);

if (mode === '--next') {
  console.log(JSON.stringify(selectProgramCandidates(program), null, 2));
  process.exit(0);
}

if (mode === '--write') {
  const before = deriveProgramReadiness(program);
  const { projection, derived } = applyDerivedProgramReadiness(program);
  await writeFile(PROGRAM_PATH, JSON.stringify(projection, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({
    mode: 'WRITE_VERSIONED_PROJECTION_ONLY',
    runtimeSideEffects: false,
    createsRuntimeTasks: false,
    readyBlueprintIds: derived.readyBlueprintIds,
    changedBlueprints: before.drift.map((entry) => entry.id)
  }, null, 2));
  process.exit(0);
}

const derived = deriveProgramReadiness(program);
const ok = derived.drift.length === 0 && derived.storedReadyDrift.length === 0;
console.log(JSON.stringify({
  mode: 'CHECK',
  ok,
  runtimeSideEffects: false,
  createsRuntimeTasks: false,
  readyBlueprintIds: derived.readyBlueprintIds,
  drift: derived.drift,
  storedReadyDrift: derived.storedReadyDrift
}, null, 2));
if (!ok) process.exit(1);
