/**
 * F.2 (TB-W3-F-03), increment 3: the admission of the revision a runtime is
 * provisioned from, generalized from the Governed Deploy admission. The
 * revision must belong to the reviewed history of the repository's default
 * branch, and its CI gate must not fail nor still run: every check run and
 * commit status is read in full. A revision with no CI at all is admitted by
 * the explicit consent alone (MANUAL_CONSENT), as a manual dispatch is for the
 * Governed Deploy. Anything unreadable refuses. Free of configuration: the
 * caller supplies the GitHub read.
 */
const REPOSITORY_ID_PATTERN = /^github:([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9._-]{1,100})$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const BRANCH_PATTERN = /^[A-Za-z0-9._/-]{1,200}$/;
const MAX_CHECK_RUNS = 100;
const PASSING_CONCLUSIONS = new Set(['success', 'neutral', 'skipped']);

export type RevisionAdmissionReasonCode =
  | 'REVISION_ADMITTED'
  | 'REVISION_ADMISSION_UNAVAILABLE'
  | 'REVISION_NOT_ON_DEFAULT_BRANCH'
  | 'REVISION_CI_FAILED'
  | 'REVISION_CI_PENDING'
  | 'REVISION_CI_UNVERIFIABLE';

export type RevisionAdmission = Readonly<{
  admitted: boolean;
  kind: 'CI_GATE' | 'MANUAL_CONSENT' | null;
  reasonCode: RevisionAdmissionReasonCode;
  defaultBranch: string | null;
  defaultBranchHead: string | null;
  /** Check runs and commit statuses read on the revision; null when not read. */
  checkRuns: number | null;
  statuses: number | null;
}>;

export type GithubRead = (endpoint: string) => Promise<{ ok: boolean; status: number | null; json: unknown }>;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function admitProvisioningRevision(
  input: { repositoryId: string; revision: string },
  read: GithubRead
): Promise<RevisionAdmission> {
  let defaultBranch: string | null = null;
  let defaultBranchHead: string | null = null;
  let checkRuns: number | null = null;
  let statuses: number | null = null;
  const decide = (reasonCode: RevisionAdmissionReasonCode, kind: RevisionAdmission['kind'] = null): RevisionAdmission => (
    Object.freeze({ admitted: kind !== null, kind, reasonCode, defaultBranch, defaultBranchHead, checkRuns, statuses })
  );
  const repository = REPOSITORY_ID_PATTERN.exec(input.repositoryId);
  if (!repository || !SHA_PATTERN.test(input.revision)) return decide('REVISION_ADMISSION_UNAVAILABLE');
  const base = `/repos/${repository[1]}/${repository[2]}`;
  const get = async (endpoint: string) => {
    try {
      return await read(`${base}${endpoint}`);
    } catch {
      return { ok: false, status: null, json: null };
    }
  };

  const repo = await get('');
  const branch = record(repo.json)?.default_branch;
  if (!repo.ok || typeof branch !== 'string' || !BRANCH_PATTERN.test(branch) || branch.split('/').includes('..')) {
    return decide('REVISION_ADMISSION_UNAVAILABLE');
  }
  defaultBranch = branch;
  // One encoded path parameter, slashes included, as the other GitHub branch readers send it.
  const head = await get(`/branches/${encodeURIComponent(branch)}`);
  const headSha = record(record(head.json)?.commit)?.sha;
  if (!head.ok || typeof headSha !== 'string' || !SHA_PATTERN.test(headSha)) return decide('REVISION_ADMISSION_UNAVAILABLE');
  defaultBranchHead = headSha;

  if (input.revision !== headSha) {
    // base...head is "ahead" when the default branch already contains the revision.
    const compare = await get(`/compare/${input.revision}...${headSha}`);
    if (compare.status === 404) return decide('REVISION_NOT_ON_DEFAULT_BRANCH');
    const relation = record(compare.json)?.status;
    if (!compare.ok || typeof relation !== 'string') return decide('REVISION_ADMISSION_UNAVAILABLE');
    if (relation !== 'ahead' && relation !== 'identical') return decide('REVISION_NOT_ON_DEFAULT_BRANCH');
  }

  const runs = await get(`/commits/${input.revision}/check-runs?per_page=${MAX_CHECK_RUNS}`);
  const runsBody = record(runs.json);
  const runList = runsBody?.check_runs;
  const runTotal = runsBody?.total_count;
  if (!runs.ok || !Array.isArray(runList) || typeof runTotal !== 'number' || !Number.isSafeInteger(runTotal)) {
    return decide('REVISION_ADMISSION_UNAVAILABLE');
  }
  if (runTotal > runList.length || runTotal > MAX_CHECK_RUNS) return decide('REVISION_CI_UNVERIFIABLE');
  checkRuns = runTotal;

  const combined = await get(`/commits/${input.revision}/status`);
  const combinedBody = record(combined.json);
  const state = combinedBody?.state;
  const statusTotal = combinedBody?.total_count;
  if (!combined.ok || typeof state !== 'string' || typeof statusTotal !== 'number' || !Number.isSafeInteger(statusTotal)) {
    return decide('REVISION_ADMISSION_UNAVAILABLE');
  }
  statuses = statusTotal;

  let pending = false;
  for (const entry of runList) {
    const run = record(entry);
    if (run?.status !== 'completed') {
      pending = true;
      continue;
    }
    if (typeof run.conclusion !== 'string' || !PASSING_CONCLUSIONS.has(run.conclusion)) return decide('REVISION_CI_FAILED');
  }
  if (statusTotal > 0) {
    // A combined status without statuses reads "pending": only real statuses count.
    if (state === 'failure' || state === 'error') return decide('REVISION_CI_FAILED');
    if (state !== 'success') pending = true;
  }
  if (pending) return decide('REVISION_CI_PENDING');
  return decide('REVISION_ADMITTED', runTotal + statusTotal > 0 ? 'CI_GATE' : 'MANUAL_CONSENT');
}
