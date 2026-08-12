import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import {
  extractCanonicalState,
  validateMarkdownBaseline,
  validateProductionState,
  validateRequiredCanonicalStates
} from './doc-governance-lib.mjs';

const BASELINE_FILE = 'docs/governance/markdown-inventory.json';
const REQUIRED_CANONICAL_DOCUMENTS = [
  'SUIVI.md',
  'TASKS.md',
  'TODO.md',
  'DEPLOYMENT_PRODUCTION.md',
  'MCP_ANTI_DISPERSION_GOVERNANCE.md'
];

function fail(label, details) {
  console.error(`Documentation governance failure: ${label}`);
  if (details !== undefined) {
    const rendered = JSON.stringify(details, null, 2);
    console.error(rendered.length > 12_000 ? `${rendered.slice(0, 12_000)}\n...TRUNCATED...` : rendered);
  }
  process.exitCode = 1;
}

let baseline;
try {
  baseline = JSON.parse(await readFile(BASELINE_FILE, 'utf8'));
} catch (error) {
  fail('baseline_unreadable', { file: BASELINE_FILE, error: error instanceof Error ? error.message : 'unknown' });
}

if (!baseline || baseline.schemaVersion !== 1 || !Array.isArray(baseline.entries)) {
  fail('baseline_schema_invalid', { file: BASELINE_FILE });
}

if (!process.exitCode) {
  const output = execFileSync('git', ['ls-files', '*.md'], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024
  });
  const actualPaths = output
    .split(/\r?\n/)
    .map((path) => path.trim())
    .filter(Boolean)
    .sort();

  const inventory = validateMarkdownBaseline(baseline.entries, actualPaths);
  if (!inventory.ok) {
    fail('markdown_inventory_drift', inventory);
  }

  if (baseline.trackedCount !== baseline.entries.length || baseline.trackedCount !== actualPaths.length) {
    fail('markdown_count_drift', {
      declared: baseline.trackedCount,
      baselineEntries: baseline.entries.length,
      actual: actualPaths.length
    });
  }
}

const canonicalDocuments = [];
for (const path of REQUIRED_CANONICAL_DOCUMENTS) {
  try {
    const markdown = await readFile(path, 'utf8');
    let state = null;
    try {
      state = extractCanonicalState(markdown);
    } catch (error) {
      fail('canonical_state_invalid', {
        path,
        error: error instanceof Error ? error.message : 'unknown'
      });
    }
    canonicalDocuments.push({ path, state });
  } catch {
    // Missing files are reported by validateRequiredCanonicalStates below.
  }
}

const semantic = validateRequiredCanonicalStates(REQUIRED_CANONICAL_DOCUMENTS, canonicalDocuments);
if (!semantic.ok) {
  fail('canonical_state_drift', semantic);
}

let productionState = null;
try {
  productionState = JSON.parse(await readFile('PRODUCTION_STATE.json', 'utf8'));
} catch (error) {
  fail('production_state_unreadable', {
    file: 'PRODUCTION_STATE.json',
    error: error instanceof Error ? error.message : 'unknown'
  });
}

const canonicalReference = canonicalDocuments.find((document) => document.path === 'SUIVI.md')?.state ?? null;
if (productionState && canonicalReference) {
  const productionSemantic = validateProductionState(productionState, canonicalReference);
  if (!productionSemantic.ok) {
    fail('production_state_drift', productionSemantic);
  }
}

if (!process.exitCode) {
  console.log(`Documentation gouvernée: ${baseline.trackedCount} Markdown suivis, inventaire exact, état canonique et production cohérents.`);
}
