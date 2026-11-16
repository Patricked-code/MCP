import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { G1_MANIFEST, G1_REPOSITORY, prepareG1Candidate, type G1Drift } from '../src/deploy/g1Documentation.js';
import { createGovernedContractSubstrate } from '../src/governedWorkflow/contractSubstrate.js';
import { planGw60DocumentationReconciliation, planGw61DocumentationPr } from '../src/governedWorkflow/terminal/index.js';

const sha = process.env.GITHUB_SHA ?? '';
const token = process.env.G1_GITHUB_TOKEN;
if (process.env.GITHUB_REPOSITORY !== G1_REPOSITORY || process.env.GITHUB_REF !== 'refs/heads/main'
  || !/^[0-9a-f]{40}$/.test(sha) || !token) throw new Error('g1_invalid_execution_context');
const evidence = JSON.parse(await readFile(process.env.G1_EVIDENCE_FILE ?? '', 'utf8')) as G1Drift;
const observedAt = Date.parse(evidence.observedAt);
function assertFresh() {
  const age = Date.now() - observedAt;
  if (!Number.isFinite(age) || age < -5_000 || age > 300_000) throw new Error('g1_evidence_expired_reobserve');
}
const branch = 'mcp/docs-reconcile-' + sha;
const title = 'docs(mcp): réconcilier l’état de production ' + sha.slice(0, 12);
const root = '/repos/' + G1_REPOSITORY;

async function api(path: string, method = 'GET', body?: unknown, missingAllowed = false) {
  const response = await fetch('https://api.github.com' + path, {
    method, headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15_000), redirect: 'error', body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (missingAllowed && response.status === 404) return null;
  if (!response.ok) throw new Error('g1_github_' + method + '_' + response.status);
  return await response.json();
}
const readHead = async (name: string, missing = false) => (await api(root + '/git/ref/heads/' + name, 'GET', undefined, missing))?.object?.sha;
async function assertMain() {
  assertFresh();
  if (await readHead('main') !== sha) throw new Error('g1_main_changed_reobserve');
}
async function findOpenCorrection() {
  for (let page = 1; page <= 5; page++) {
    const prs = await api(root + '/pulls?state=open&base=main&per_page=100&page=' + page);
    if (!Array.isArray(prs)) throw new Error('g1_invalid_pr_list');
    const existing = prs.find(pr => pr.head?.repo?.full_name === G1_REPOSITORY
      && (pr.head?.ref === branch || String(pr.head?.ref ?? '').startsWith('mcp/docs-reconcile-')));
    if (existing) return existing;
    if (prs.length < 100) return null;
  }
  throw new Error('g1_pr_scan_limit');
}

await assertMain();
const prior = await findOpenCorrection();
if (prior) {
  console.log('G1 existing documentation PR #' + Number(prior.number) + ' — no duplicate created.');
} else {
  const raw = await readFile(G1_MANIFEST, 'utf8');
  const content = prepareG1Candidate(raw, evidence, sha, Date.parse(evidence.observedAt));
  const [contractsProjection, graphProjection] = await Promise.all(
    ['.mcp/gwc-contracts.json', '.mcp/gwc-workflow-graph.json'].map(async path => JSON.parse(await readFile(path, 'utf8')))
  );
  const substrate = createGovernedContractSubstrate({ contractsProjection, graphProjection, expectedSchemaVersion: 1,
    expectedContractRegistryDigest: contractsProjection.registryDigest, expectedGraphRegistryDigest: graphProjection.registryDigest });
  const plan = planGw60DocumentationReconciliation({ repository: G1_REPOSITORY, branchName: branch, baseSha: sha, message: title,
    changes: [{ path: G1_MANIFEST, contentDigest: createHash('sha256').update(content).digest('hex'),
      contentBase64: Buffer.from(content).toString('base64') }] }, substrate);
  if (plan.status !== 'READY' || plan.effectPlan?.toolName !== 'github_create_commit') throw new Error('g1_gw60_rejected');
  await assertMain();
  let head = await readHead(branch, true);
  if (!head) {
    await api(root + '/git/refs', 'POST', { ref: 'refs/heads/' + branch, sha });
    head = sha;
  }
  if (head === sha) {
    await assertMain();
    const { expectedHeadSha, payload } = plan.effectPlan;
    const result = await api('/graphql', 'POST', {
      query: 'mutation($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid } } }',
      variables: { input: { branch: { repositoryNameWithOwner: G1_REPOSITORY, branchName: branch },
        expectedHeadOid: expectedHeadSha, message: { headline: payload.message },
        fileChanges: { additions: (payload.files as {path: string; contentBase64: string}[])
          .map(file => ({ path: file.path, contents: file.contentBase64 })) } } }
    });
    head = result.data?.createCommitOnBranch?.commit?.oid;
    if (result.errors || !/^[0-9a-f]{40}$/.test(head ?? '')) throw new Error('g1_exact_head_commit_failed');
  }
  const diff = await api(root + '/compare/' + sha + '...' + head);
  const committed = await api(root + '/contents/' + G1_MANIFEST + '?ref=' + head);
  if (diff.status !== 'ahead' || diff.ahead_by !== 1 || diff.files?.length !== 1 || diff.files[0].filename !== G1_MANIFEST
    || committed.encoding !== 'base64') throw new Error('g1_existing_branch_not_docs_only');
  const candidate = Buffer.from(committed.content, 'base64').toString('utf8');
  // A retry may have a newer observation timestamp. Rebuild from the prior candidate's
  // recorded time and verify byte-for-byte before reusing its exact commit.
  const priorManifest = JSON.parse(candidate);
  const priorObservedAt = priorManifest.githubObservedAt;
  const priorVersion = /^G1_GOVERNED_DEPLOY_EXACT_SHA_LIVESTATE_V([0-9]+)_/.exec(priorManifest.githubObservationBasis)?.[1];
  if (typeof priorObservedAt !== 'string' || !priorVersion || Date.parse(priorObservedAt) > Date.parse(evidence.observedAt)
    || candidate !== prepareG1Candidate(raw, { ...evidence, stateVersion: Number(priorVersion), observedAt: priorObservedAt }, sha, Date.parse(priorObservedAt))) {
    throw new Error('g1_existing_branch_candidate_mismatch');
  }
  const pr = planGw61DocumentationPr({ repository: G1_REPOSITORY, branchName: branch, baseBranch: 'main', headSha: head, title }, substrate);
  if (pr.status !== 'READY' || pr.effectPlan?.toolName !== 'github_create_pull_request') throw new Error('g1_gw61_rejected');
  await assertMain();
  if (await readHead(branch) !== pr.effectPlan.expectedHeadSha) throw new Error('g1_candidate_head_changed');
  if (await findOpenCorrection()) throw new Error('g1_correction_already_open');
  const payload = pr.effectPlan.payload;
  const created = await api(root + '/pulls', 'POST', { head: payload.head, base: payload.targetBase,
    title: payload.title, draft: payload.draft,
    body: 'Réconciliation G1 documentaire après attestation Governed Deploy sur ' + sha
      + '. Uniquement PRODUCTION_STATE.json. CI et revue sur le HEAD exact, puis fusion autorisée et réattestation Live State.' });
  console.log('G1 draft PR #' + Number(created.number));
}
