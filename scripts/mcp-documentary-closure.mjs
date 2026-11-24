// REC-00/01: evidence projection, not a new registry or a write authority.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { validateMarkdownBaseline } from './doc-governance-lib.mjs';

const SHA = /^[a-f0-9]{40}$/;
const REPO = 'Patricked-code/MCP';
const INVENTORY = 'docs/governance/markdown-inventory.json';
const PRODUCTION = 'PRODUCTION_STATE.json';
const LIMIT = 20000;
const MAX_BUFFER = 8 * 1024 * 1024;
const isCandidate = p => /\.md$/i.test(p) ||
  (/^(?:docs\/|\.mcp\/|memory\/)/.test(p) && /\.(?:json|ya?ml|txt|csv)$/i.test(p)) ||
  (!p.includes('/') && /\.(?:json|ya?ml)$/i.test(p) && !/^(?:package(?:-lock)?|tsconfig(?:\..*)?)\.json$/.test(p));
const validPath = p => typeof p === 'string' && p.length > 0 && p.length <= 1024 &&
  !/[\x00-\x1f\x7f]/.test(p) && !p.startsWith('/') && !p.split('/').some(x => x === '' || x === '.' || x === '..');

export function parseNameStatus(raw) {
  if (raw === '') return [];
  if (!raw.endsWith('\0')) throw Error('DIFF_TRUNCATED');
  const parts = raw.slice(0, -1).split('\0');
  const result = [];
  for (let i = 0; i < parts.length;) {
    const code = parts[i++];
    const rename = /^[RC](?:100|[0-9]{1,2})$/.test(code);
    if (!rename && !/^[ADMTUXB]$/.test(code)) throw Error('DIFF_STATUS_INVALID');
    const previousPath = rename ? parts[i++] : null;
    const path = parts[i++];
    if (!validPath(path) || (rename && !validPath(previousPath))) throw Error('DIFF_PATH_INVALID');
    result.push({ code, path, previousPath });
    if (result.length > LIMIT) throw Error('DIFF_LIMIT_EXCEEDED');
  }
  return result;
}

export function buildDocumentaryClosureReport({headSha, baselineSha, trackedPaths, inventory, changes, g1, governanceCheckOk}) {
  if (!SHA.test(headSha ?? '') || !SHA.test(baselineSha ?? '') ||
      !Array.isArray(trackedPaths) || trackedPaths.length > LIMIT ||
      !trackedPaths.every(validPath) || new Set(trackedPaths).size !== trackedPaths.length ||
      !Array.isArray(changes) || changes.length > LIMIT) throw Error('INVALID_OBSERVATION');
  const markdown = trackedPaths.filter(p => p.endsWith('.md')).sort();
  if (inventory?.schemaVersion !== 1 || !Array.isArray(inventory.entries) ||
      inventory.entries.length > LIMIT || !inventory.entries.every(e => validPath(e?.path) && typeof e.category === 'string')) {
    throw Error('INVENTORY_UNREADABLE');
  }
  const declared = inventory.entries.map(e => e.path);
  const declaredSet = new Set(declared);
  const actualSet = new Set(markdown);
  const missing = markdown.filter(p => !declaredSet.has(p));
  const absent = [...declaredSet].filter(p => !actualSet.has(p)).sort();
  const duplicates = declared.length !== declaredSet.size;
  const baselineCheck = validateMarkdownBaseline(inventory.entries, markdown);
  const inventoryAligned = baselineCheck.ok && !missing.length && !absent.length && !duplicates &&
    inventory.trackedCount === declared.length && inventory.trackedCount === markdown.length;
  const byPath = new Map(inventory.entries.map(e => [e.path, e.category]));
  const changed = new Map();
  for (const c of changes) {
    if (!c || !validPath(c.path) || (c.previousPath !== null && !validPath(c.previousPath)) ||
        typeof c.code !== 'string' || !/^(?:[ADMTUXB]|[RC](?:100|[0-9]{1,2}))$/.test(c.code)) throw Error('INVALID_CHANGE');
    changed.set(c.path, c.code);
    if (c.previousPath !== null) changed.set(c.previousPath, c.code);
  }
  const candidates = trackedPaths.filter(isCandidate).sort();
  const documents = candidates.map(path => ({
    path, category: byPath.get(path) ?? 'AUTHORITY_UNVERIFIED',
    change: changed.get(path) ?? 'NO_DIRECT_GIT_CHANGE',
    // No direct diff does NOT prove that the content has no indirect impact.
    semanticStatus: 'UNVERIFIED',
    nextAction: 'RESOLVE_OWNER_AND_VALIDATE_IMPACT'
  }));
  const differences = [];
  if (g1?.status === 'DRIFT' && g1.sha === headSha && SHA.test(g1.declaredGithubSha ?? '') &&
      SHA.test(g1.declaredS1Sha ?? '') && g1.declaredGithubSha === baselineSha) {
    differences.push(
      {path: PRODUCTION, field: 'githubCommitFull', declared: g1.declaredGithubSha, observed: headSha,
       reason: 'G1_DOCUMENTATION_DRIFT', source: 'G1_ATTESTED_LIVE_STATE', nextAction: 'REUSE_GW60_GW61'},
      {path: PRODUCTION, field: 'serverGitState.lastDirectlyVerifiedCommitFull', declared: g1.declaredS1Sha, observed: headSha,
       reason: 'G1_DOCUMENTATION_DRIFT', source: 'G1_ATTESTED_LIVE_STATE', nextAction: 'REUSE_GW60_GW61'}
    );
  }
  const reasons = ['SEMANTIC_AND_RUNTIME_REGISTRY_COVERAGE_UNVERIFIED'];
  if (!inventoryAligned) reasons.push('MARKDOWN_INVENTORY_DRIFT');
  if (governanceCheckOk !== true) reasons.push('DOCUMENT_GOVERNANCE_CHECK_NOT_SUCCESS');
  if (g1?.status === 'DRIFT' && differences.length) reasons.push('G1_DOCUMENTATION_DRIFT');
  else if (g1?.status !== 'ALIGNED') reasons.push('G1_PROOF_UNVERIFIED');
  const status = !inventoryAligned || governanceCheckOk !== true ||
    (g1?.status !== 'ALIGNED' && !differences.length)
    ? 'DOCUMENTARY_CLOSURE_BLOCKED' : 'DOCUMENTARY_CLOSURE_PENDING';
  return {
    schemaVersion: 1, repository: REPO, headSha, baselineSha,
    comparisonBasis: 'PRODUCTION_STATE_DECLARED_GITHUB_SHA_NOT_PREVIOUS_DEPLOY_PROOF',
    status, closureAttested: false, technicalDeploymentIndependent: true,
    inventory: {markdownCount: markdown.length, declaredCount: inventory.trackedCount,
      inventoryAligned, missing, absent, duplicates, unclassified: baselineCheck.unclassified,
      categoryDrift: baselineCheck.categoryDrift, candidateCount: documents.length},
    coverage: {semanticVerifiedCount: 0, complete: false, runtimeRegistryCoverage: 'UNVERIFIED'},
    governanceCheckOk: governanceCheckOk === true,
    g1Status: ['DRIFT','ALIGNED','UNVERIFIED'].includes(g1?.status) ? g1.status : 'UNVERIFIED',
    differences, changes, documents, reasons,
    nextAction: status === 'DOCUMENTARY_CLOSURE_BLOCKED'
      ? 'REOBSERVE_AND_RESOLVE_BLOCKERS' : differences.length
        ? 'RECONCILE_G1_AND_VALIDATE_DOCUMENT_AUTHORITIES' : 'VALIDATE_DOCUMENT_AND_REGISTRY_AUTHORITIES',
    mutationPerformed: false
  };
}

function git(args) {
  return execFileSync('git', args, {encoding:'utf8', maxBuffer:MAX_BUFFER, timeout:60000, stdio:['ignore','pipe','ignore']});
}

export function main(env = process.env) {
  const headSha = env.GITHUB_SHA ?? '';
  if (env.GITHUB_REPOSITORY !== REPO || env.GITHUB_REF !== 'refs/heads/main' || !SHA.test(headSha)
      || !env.GITHUB_STEP_SUMMARY || !env.DOCUMENTARY_REPORT_FILE) throw Error('INVALID_EXECUTION_CONTEXT');
  let report;
  try {
    if (git(['rev-parse','HEAD']).trim() !== headSha) throw Error('CHECKOUT_SHA_MISMATCH');
    const manifest = JSON.parse(readFileSync(PRODUCTION, 'utf8'));
    const baselineSha = manifest.githubCommitFull;
    if (!SHA.test(baselineSha ?? '') || manifest.repository !== REPO || manifest.branch !== 'main') throw Error('INVALID_BASELINE');
    git(['merge-base','--is-ancestor',baselineSha,headSha]);
    const inventory = JSON.parse(readFileSync(INVENTORY, 'utf8'));
    const tree = git(['ls-tree','-r','--name-only','-z',headSha]);
    if (tree && !tree.endsWith('\0')) throw Error('TREE_TRUNCATED');
    const trackedPaths = tree ? tree.slice(0,-1).split('\0') : [];
    const changes = parseNameStatus(git(['diff','--no-ext-diff','--name-status','-z','-M',baselineSha,headSha,'--']));
    const g1 = JSON.parse(env.G1_EVIDENCE ?? 'null');
    let governanceCheckOk = false;
    try {
      execFileSync(process.execPath,['scripts/check-doc-governance.mjs'],{stdio:'ignore',timeout:60000});
      governanceCheckOk = true;
    } catch { /* absence of proof blocks closure */ }
    report = buildDocumentaryClosureReport({headSha,baselineSha,trackedPaths,inventory,changes,g1,governanceCheckOk});
  } catch (error) {
    const bounded = new Set(['CHECKOUT_SHA_MISMATCH','INVALID_BASELINE','TREE_TRUNCATED','DIFF_TRUNCATED',
      'DIFF_STATUS_INVALID','DIFF_PATH_INVALID','DIFF_LIMIT_EXCEEDED','INVALID_OBSERVATION','INVENTORY_UNREADABLE','INVALID_CHANGE']);
    const reason = bounded.has(error?.message) ? error.message : 'DOCUMENTARY_OBSERVATION_UNVERIFIED';
    report = {schemaVersion:1,repository:REPO,headSha,status:'DOCUMENTARY_CLOSURE_BLOCKED',
      closureAttested:false,technicalDeploymentIndependent:true,coverage:{complete:false},
      reasons:[reason],nextAction:'REOBSERVE_AND_RESOLVE_BLOCKERS',mutationPerformed:false};
  }
  writeFileSync(env.DOCUMENTARY_REPORT_FILE, JSON.stringify({...report,observedAt:new Date().toISOString()},null,2)+'\n',{mode:0o600});
  appendFileSync(env.GITHUB_STEP_SUMMARY, '\n### Documentary closure: '+report.status+'\n\n'
    +'Technical deployment and documentary closure are independent. Global closure is NOT attested.\n\n'
    +'Reasons: '+report.reasons.join(', ')+'\n\n'
    +'Next action: '+report.nextAction+'\n\n'
    +'See the documentary-closure artifact for paths, differences and coverage.\n');
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT,'closure-status='+report.status+'\n');
  return report;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
