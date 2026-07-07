import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const evidencePath = join(repoRoot, 'Migration', 'evidence', 'PUBLIC_SAFE_BLOCKER_EVIDENCE.json');
const examplePath = join(repoRoot, 'Migration', 'evidence', 'PUBLIC_SAFE_BLOCKER_EVIDENCE.example.json');
const runbookPath = join(repoRoot, 'Migration', 'index', 'BLOCKER_RESOLUTION_RUNBOOK.json');

const privateBlockerIds = new Set([
  'production_actions_require_private_inventory_and_approval'
]);

const forbiddenValuePatterns = [
  { label: 'GitHub token', pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
  { label: 'GitHub fine-grained token', pattern: /github_pat_[A-Za-z0-9_]{20,}/ },
  { label: 'private key block', pattern: /BEGIN (?:RSA|OPENSSH|EC|PRIVATE) KEY/ },
  { label: 'OpenAI-style key', pattern: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { label: 'raw env assignment', pattern: /\b[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|API_KEY)\s*=\s*\S{8,}/i },
  { label: 'Windows private path', pattern: /\b[A-Z]:\\(?:Users|inetpub|ProgramData|Windows)\\/i },
  { label: 'Unix private path', pattern: /\/(?:home|root|etc|var\/www|srv)\//i }
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function collectStrings(value, output = []) {
  if (typeof value === 'string') {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output);
    return output;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, output);
  }
  return output;
}

function fail(message) {
  console.error(message);
  globalThis.process.exitCode = 1;
}

function blockerMap(runbook) {
  return new Map((runbook.blockers ?? []).map((blocker) => [blocker.id, blocker]));
}

function validateNoForbiddenValues(name, value) {
  const strings = collectStrings(value);
  for (const text of strings) {
    for (const forbidden of forbiddenValuePatterns) {
      if (forbidden.pattern.test(text)) {
        fail(`${name}: valeur interdite detectee (${forbidden.label}).`);
      }
    }
  }
}

function validateShape(name, data, { requireComplete = false } = {}) {
  if (!data || typeof data !== 'object') {
    fail(`${name}: JSON racine invalide.`);
    return;
  }
  if (!Array.isArray(data.evidenceRecords)) {
    fail(`${name}: evidenceRecords doit etre une liste.`);
    return;
  }

  const runbook = readJson(runbookPath);
  const blockers = blockerMap(runbook);
  const seen = new Set();

  for (const record of data.evidenceRecords) {
    const blocker = blockers.get(record.blockerId);
    if (!blocker) {
      fail(`${name}: blockerId inconnu ${record.blockerId}.`);
      continue;
    }
    if (seen.has(record.blockerId)) {
      fail(`${name}: blockerId duplique ${record.blockerId}.`);
    }
    seen.add(record.blockerId);

    if (!Array.isArray(record.criteriaEvidence)) {
      fail(`${name}: criteriaEvidence doit etre une liste pour ${record.blockerId}.`);
      continue;
    }
    if (record.productionActionExecuted !== false) {
      fail(`${name}: productionActionExecuted doit rester false pour ${record.blockerId}.`);
    }
    if (record.noSecretsPublished !== true) {
      fail(`${name}: noSecretsPublished doit etre true pour ${record.blockerId}.`);
    }
    if (privateBlockerIds.has(record.blockerId) && record.privateMaterialStoredOutsideGit !== true) {
      fail(`${name}: privateMaterialStoredOutsideGit doit etre true pour ${record.blockerId}.`);
    }

    if (requireComplete) {
      if (record.evidenceStatus !== 'public_safe_evidence_complete') {
        fail(`${name}: evidenceStatus doit etre public_safe_evidence_complete pour ${record.blockerId}.`);
      }
      if (record.criteriaEvidence.length < (blocker.acceptanceCriteria ?? []).length) {
        fail(`${name}: criteres incomplets pour ${record.blockerId}.`);
      }
    }
  }

  validateNoForbiddenValues(name, data);
}

if (!existsSync(examplePath)) {
  fail('Gabarit manquant: Migration/evidence/PUBLIC_SAFE_BLOCKER_EVIDENCE.example.json');
} else {
  validateShape('PUBLIC_SAFE_BLOCKER_EVIDENCE.example.json', readJson(examplePath), { requireComplete: false });
}

if (!existsSync(evidencePath)) {
  console.log('PUBLIC_SAFE_BLOCKER_EVIDENCE.json absent: les blockers restent gates, ce qui est attendu avant preuve operateur.');
} else {
  validateShape('PUBLIC_SAFE_BLOCKER_EVIDENCE.json', readJson(evidencePath), { requireComplete: true });
}

if (!globalThis.process.exitCode) {
  console.log('Controle public-safe des preuves termine.');
}
