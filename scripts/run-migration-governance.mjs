#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const nodeCommand = process.execPath;
const gitCommand = process.env.MCP_GIT || process.env.GIT_BIN || 'git';
const args = new Set(process.argv.slice(2));

function commandIsAvailable(command) {
  const result = spawnSync(command, ['--version'], {
    cwd: repoRoot,
    stdio: 'ignore',
    shell: false
  });
  return !result.error && result.status === 0;
}

function resolvePythonCommand() {
  for (const candidate of [process.env.MCP_PYTHON, process.env.PYTHON].filter(Boolean)) {
    return candidate;
  }

  const dependencyRoot = resolve(dirname(nodeCommand), '..', '..');
  for (const candidate of [
    join(dependencyRoot, 'python', 'python.exe'),
    join(dependencyRoot, 'python', 'bin', 'python3'),
    join(dependencyRoot, 'python', 'bin', 'python')
  ]) {
    if (commandIsAvailable(candidate)) {
      return candidate;
    }
  }

  for (const candidate of ['python3', 'python', 'py']) {
    if (commandIsAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error('No Python runtime found. Set MCP_PYTHON or PYTHON to run the governance pipeline.');
}

function buildPlan(pythonCommand) {
  return [
    {
      label: 'Sync public-safe operator issue state',
      command: nodeCommand,
      args: ['scripts/sync-operator-issue-log.mjs']
    },
    {
      label: 'Regenerate source registry',
      command: nodeCommand,
      args: ['scripts/build-source-registry.mjs']
    },
    {
      label: 'Regenerate PDF text audit',
      command: pythonCommand,
      args: ['scripts/build-pdf-text-audit.py']
    },
    {
      label: 'Regenerate archive text audit',
      command: pythonCommand,
      args: ['scripts/build-archive-text-audit.py']
    },
    {
      label: 'Regenerate objective traceability matrix',
      command: pythonCommand,
      args: ['scripts/build-objective-index.py']
    },
    {
      label: 'Regenerate MCP execution tasks',
      command: pythonCommand,
      args: ['scripts/build-execution-tasks.py']
    },
    {
      label: 'Regenerate private server inventory cards',
      command: pythonCommand,
      args: ['scripts/build-server-inventory-cards.py']
    },
    {
      label: 'Regenerate blocker resolution runbook',
      command: pythonCommand,
      args: ['scripts/build-blocker-resolution-runbook.py']
    },
    {
      label: 'Regenerate blocker evidence gate',
      command: pythonCommand,
      args: ['scripts/build-blocker-evidence-gate.py']
    },
    {
      label: 'Regenerate completion audit',
      command: pythonCommand,
      args: ['scripts/build-completion-audit.py']
    },
    {
      label: 'Regenerate operator action pack',
      command: pythonCommand,
      args: ['scripts/build-operator-action-pack.py']
    },
    {
      label: 'Regenerate resume gate',
      command: pythonCommand,
      args: ['scripts/build-resume-gate.py']
    },
    {
      label: 'Regenerate execution runway',
      command: pythonCommand,
      args: ['scripts/build-execution-runway.py']
    },
    {
      label: 'Run onboarding tests',
      command: nodeCommand,
      args: ['node_modules/tsx/dist/cli.mjs', '--test', 'tests/onboarding.test.ts']
    },
    {
      label: 'Run TypeScript typecheck',
      command: nodeCommand,
      args: ['node_modules/typescript/lib/tsc.js', '--noEmit', '-p', 'tsconfig.json']
    },
    {
      label: 'Run TypeScript build',
      command: nodeCommand,
      args: ['node_modules/typescript/lib/tsc.js', '-p', 'tsconfig.json']
    },
    {
      label: 'Check required documentation',
      command: nodeCommand,
      args: ['scripts/check-docs.mjs']
    },
    {
      label: 'Check secret signals',
      command: nodeCommand,
      args: ['scripts/check-no-secrets.mjs']
    },
    {
      label: 'Check public-safe blocker evidence',
      command: nodeCommand,
      args: ['scripts/check-public-evidence.mjs']
    },
    {
      label: 'Check git diff whitespace',
      command: gitCommand,
      args: ['diff', '--check']
    }
  ];
}

function quoteForLog(value) {
  const text = String(value);
  return /\s/.test(text) ? JSON.stringify(text) : text;
}

function renderCommand(step) {
  return [step.command, ...step.args].map(quoteForLog).join(' ');
}

function runStep(step, index, total) {
  console.log(`\n[${index}/${total}] ${step.label}`);
  console.log(`$ ${renderCommand(step)}`);
  const result = spawnSync(step.command, step.args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      PATH: [join(repoRoot, 'node_modules', '.bin'), process.env.PATH].filter(Boolean).join(delimiter)
    },
    stdio: 'inherit',
    shell: false
  });

  if (result.error) {
    throw result.error;
  }
  if (result.signal) {
    throw new Error(`${step.label} stopped with signal ${result.signal}.`);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (args.has('--help') || args.has('-h')) {
  console.log(`Usage: node scripts/run-migration-governance.mjs [--list]

Runs the public-safe WealthTech migration governance regeneration and no-regression gate.

Environment:
  MCP_PYTHON or PYTHON  Python runtime used for generated Python scripts
  GH_BIN               GitHub CLI used by scripts/sync-operator-issue-log.mjs
  MCP_GIT or GIT_BIN   Git binary used for the final git diff check
`);
  process.exit(0);
}

if (args.has('--list')) {
  const plan = buildPlan('${MCP_PYTHON|PYTHON|python3|python|py}');
  console.log(JSON.stringify({
    stepCount: plan.length,
    steps: plan.map((step) => ({
      label: step.label,
      command: renderCommand(step)
    }))
  }, null, 2));
  process.exit(0);
}

const pythonCommand = resolvePythonCommand();
const plan = buildPlan(pythonCommand);

console.log(`Running WealthTech migration governance from ${repoRoot}`);
for (const [index, step] of plan.entries()) {
  runStep(step, index + 1, plan.length);
}
console.log('\nMigration governance regeneration and no-regression gate completed.');
