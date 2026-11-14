// Pure read-side capsule. Ports are supplied by an admitted host, never by the caller.
const grt = 'chainsolutions-wealthtech/Governed-Repository-Template';
const root = /^WT-PROJECT-GRT-1386478935-(GR-[0-9]{6,12})$/;
const localId = /^LOCAL-([0-9]{6,12})$/;
const repo = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/;
const branch = value => typeof value === 'string' && value.length <= 255
  && /^[A-Za-z0-9_][A-Za-z0-9._/-]*$/.test(value)
  && !value.includes('..') && !value.endsWith('.') && !value.startsWith('refs/')
  && value.split('/').every(part => part.length > 0 && !part.startsWith('.') && !part.endsWith('.lock'));
const githubId = /^[1-9][0-9]{0,19}$/;
const sha = /^[0-9a-f]{40}$/i;
const step = /^[A-Z][A-Z0-9_-]{0,79}$/;
const centralKinds = new Set(['QUESTION', 'AGENT_REQUEST', 'PLAN_APPROVAL', 'ACTION_REQUEST']);
const centralActiveKinds = new Map([
  ['WAITING_FOR_ANSWER', new Set(['QUESTION', 'AGENT_REQUEST'])],
  ['PLAN_READY', new Set(['PLAN_APPROVAL'])],
  ['WAITING_FOR_PLAN_APPROVAL', new Set(['PLAN_APPROVAL'])],
  ['EXECUTING_PREPARATION', new Set(['ACTION_REQUEST'])],
]);
const localActiveKinds = new Map([
  ['WAITING_FOR_ANSWER', new Set(['QUESTION'])],
  ['WAITING_FOR_SETUP_ANSWER', new Set(['QUESTION'])],
  ['WAITING_FOR_BASELINE_APPROVAL', new Set(['PLAN_APPROVAL'])],
  ['WAITING_FOR_DISCOVERY_APPROVAL', new Set(['PLAN_APPROVAL'])],
  ['WAITING_FOR_SETUP_APPROVAL', new Set(['PLAN_APPROVAL'])],
  ['MCP_CREDENTIAL_REQUIRED', new Set(['CREDENTIAL_GATE'])],
  ['MCP_DISCOVERY_REQUIRED', new Set(['MCP_DISCOVERY'])],
  ['MCP_DISCOVERY_FAILED_RETRYABLE', new Set(['MCP_DISCOVERY'])],
  ['APPLYING_BASELINE', new Set(['APPLY_BASELINE'])],
]);
const unavailable = () => ({ status: 'UNAVAILABLE' });
const blocked = () => ({ status: 'BLOCKED', reason: 'INCONSISTENT_EVIDENCE' });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const positive = n => Number.isSafeInteger(n) && n > 0;
const is = (pattern, value) => typeof value === 'string' && pattern.test(value);
const sameRepo = (a, b) => is(repo, a) && is(repo, b) && a.toLowerCase() === b.toLowerCase();
const timestamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value) && Number.isFinite(Date.parse(value));

function projection(value, projectId, requestId) {
  return object(value) && value.schema_version === '1.0.0'
    && value.project_continuity_id === projectId && value.source_request_id === requestId
    && is(githubId, value.github_repository_id) && is(repo, value.github_repository)
    && value.server_binding_status === 'NOT_BOUND';
}

function checkpoint(record, authority, kinds, { terminal = false, matchPhase = true } = {}) {
  const { state, evidence } = record;
  if (!is(step, state.phase) || !positive(state.revision) || !positive(evidence.issue)
      || !timestamp(evidence.observedAt)) return null;
  const next = state.next_request;
  if (!terminal && (!object(next) || !is(step, next.id) || !kinds.has(next.kind)
      || (matchPhase && state.phase !== next.id))) return null;
  return {
    authority, requestId: state.request_id, revision: state.revision, phase: state.phase,
    next: terminal ? null : { kind: next.kind, id: next.id },
    evidence: { repository: evidence.repository, issue: evidence.issue, observedAt: evidence.observedAt },
  };
}

function receiptArchitecture(receipt, local, projectId, requestId, target, id) {
  const no = { status: 'NOT_ATTESTED' };
  if (!object(receipt) || receipt.schema_version !== '1.0.0' || receipt.request_id !== local.state.request_id
      || !sameRepo(receipt.repository, target) || !timestamp(receipt.completed_at)
      || !projection(receipt.project_continuity, projectId, requestId)
      || receipt.project_continuity.github_repository_id !== id
      || !sameRepo(receipt.project_continuity.github_repository, target)
      || !is(sha, receipt.baseline_subject_head)
      || receipt.baseline_subject_head !== local.state.expected_head_sha) return no;
  // This receipt attests the baseline, not deployment or target architecture.
  return { status: 'BASELINE_ATTESTED', subjectHead: receipt.baseline_subject_head, completedAt: receipt.completed_at };
}

export async function resumeRepositoryCreation(input, ports) {
  const projectId = input?.projectId;
  const requestId = typeof projectId === 'string' ? root.exec(projectId)?.[1] : undefined;
  if (!requestId || typeof input?.principalRef !== 'string'
      || !input.principalRef.trim() || input.principalRef.length > 256) return unavailable();

  let grant;
  try { grant = await ports.authorize({ projectId, principalRef: input.principalRef }); }
  catch { return unavailable(); }
  if (grant?.projectId !== projectId || !positive(grant.centralIssue)
      || Number(requestId.slice(3)) !== grant.centralIssue) return unavailable();

  try {
    const central = await ports.readCentral({ projectId, issue: grant.centralIssue });
    if (!central) return unavailable();
    const c = central.state;
    if (!object(c) || central.evidence?.repository !== grt || central.evidence.issue !== grant.centralIssue
        || c.schema_version !== '1.0.0'
        || c.control_plane_repository !== grt || c.request_id !== requestId
        || c.project_continuity_id !== projectId || c.credential_provider !== 'CUG'
        || c.answers?.entry_action !== 'CREATE_NEW_REPOSITORY') return blocked();
    const base = { projectId, centralRequestId: requestId, architecture: { status: 'NOT_ATTESTED' } };

    if (c.status !== 'HANDOFF_READY') {
      const held = c.status === 'HOLD_FOR_REVIEW';
      const kinds = held ? centralKinds : centralActiveKinds.get(c.status);
      if (!kinds) return blocked();
      const cp = checkpoint(central, 'GRT_CENTRAL', kinds, {
        terminal: held, matchPhase: c.phase !== 'PLAN_APPROVAL',
      });
      return cp ? { ...base, status: held ? 'HELD' : 'READY', checkpoint: cp } : blocked();
    }

    const h = c.handoff;
    const centralCheckpoint = checkpoint(central, 'GRT_CENTRAL', centralKinds, { terminal: true });
    const projected = c.project_continuity;
    if (!centralCheckpoint || c.phase !== 'HANDOFF' || !object(h) || h.status !== 'HANDOFF_READY'
        || h.request_id !== requestId || h.entry_action !== 'CREATE_NEW_REPOSITORY'
        || !projection(projected, projectId, requestId) || !projection(h.project_continuity, projectId, requestId)
        || projected.github_repository_id !== h.project_continuity.github_repository_id
        || !sameRepo(projected.github_repository, h.project_continuity.github_repository)
        || !sameRepo(projected.github_repository, h.target_repository)
        || !is(sha, h.expected_head_sha) || !branch(h.target_branch)) return blocked();
    const repository = { id: projected.github_repository_id, name: h.target_repository, branch: h.target_branch };
    const local = await ports.readLocal({ projectId, repository, centralIssue: grant.centralIssue });
    if (!local) return { ...base, repository, status: 'WAITING_LOCAL', reason: 'LOCAL_ENTRY_NOT_OBSERVED', checkpoint: centralCheckpoint };

    const s = local.state;
    if (!object(s) || s.schema_version !== '1.1.0' || s.mode !== 'FIRST_AGENT_BOOTSTRAP'
        || !sameRepo(s.repository, repository.name) || !sameRepo(local.evidence?.repository, repository.name)
        || local.evidence.repositoryId !== repository.id || s.expected_head_sha !== h.expected_head_sha
        || !is(localId, s.request_id) || Number(s.request_id.slice(6)) !== local.evidence.issue
        || !projection(s.project_continuity, projectId, requestId)
        || s.project_continuity.github_repository_id !== repository.id
        || !sameRepo(s.project_continuity.github_repository, repository.name)) return blocked();
    const held = s.status === 'HOLD_FOR_REVIEW';
    const terminal = s.status === 'LOCAL_HANDOFF_READY';
    if (terminal) {
      const handoff = s.handoff;
      if (s.phase !== 'HANDOFF' || !object(handoff) || handoff.status !== 'LOCAL_HANDOFF_READY'
          || !sameRepo(handoff.repository, repository.name) || !is(sha, handoff.baseline_commit_sha)
          || !projection(handoff.project_continuity, projectId, requestId)
          || handoff.project_continuity.github_repository_id !== repository.id
          || !sameRepo(handoff.project_continuity.github_repository, repository.name)) return blocked();
    }
    const kinds = localActiveKinds.get(s.status);
    if (!held && !terminal && !kinds) return blocked();
    const cp = checkpoint(local, 'GRT_LOCAL', kinds, {
      terminal: held || terminal,
      matchPhase: !['BASELINE_APPROVAL', 'MCP_DISCOVERY_APPROVAL', 'SETUP_APPROVAL'].includes(s.phase),
    });
    if (!cp) return blocked();
    return {
      ...base, repository, status: held ? 'HELD' : terminal ? 'HANDOFF' : 'READY', checkpoint: cp,
      architecture: terminal ? receiptArchitecture(local.baselineReceipt, local, projectId, requestId, repository.name, repository.id) : base.architecture,
    };
  } catch {
    return { status: 'BLOCKED', reason: 'SOURCE_UNAVAILABLE' };
  }
}
