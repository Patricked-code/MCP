#!/usr/bin/env node
/**
 * Bounded request to the existing independent GitHub reviewer after MCP CI.
 * GitHub Actions (not PR code) is the only permitted caller. Never approves,
 * merges, changes rulesets or uses MCP/runtime credentials.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'Patricked-code/MCP';
const SHA = /^[a-f0-9]{40}$/;
const REVIEW_PREFIX = 'mcp/registry-';
const BOT = 'github-actions[bot]';

function text(value) { return typeof value === 'string' ? value : ''; }
export function reviewMarker(sha) {
  if (!SHA.test(sha)) throw Error('REGISTRY_REVIEW_SHA_INVALID');
  return '<!-- registry-review-request:' + sha + ' -->';
}

export function planRegistryReview({ event, pr, comments, repository = REPOSITORY }) {
  if (repository !== REPOSITORY || !event || typeof event !== 'object') {
    return { status: 'SKIP', reason: 'REPOSITORY_OUT_OF_SCOPE' };
  }
  const run = event.workflow_run;
  if (!run || run.name !== 'MCP CI' || run.event !== 'pull_request'
    || run.status !== 'completed' || run.conclusion !== 'success'
    || run.head_repository?.full_name !== REPOSITORY
    || !SHA.test(text(run.head_sha))) {
    return { status: 'SKIP', reason: 'NO_SUCCESSFUL_SCOPED_CI' };
  }
  const prs = run.pull_requests;
  if (!Array.isArray(prs) || prs.length !== 1
    || !Number.isSafeInteger(prs[0]?.number) || prs[0].number < 1) {
    return { status: 'SKIP', reason: 'PR_NOT_UNAMBIGUOUS' };
  }
  const number = prs[0].number;
  if (!pr || pr.number !== number || pr.state !== 'open' || pr.draft !== false
    || pr.head?.repo?.full_name !== REPOSITORY
    || pr.head?.sha !== run.head_sha
    || !text(pr.head?.ref).startsWith(REVIEW_PREFIX)
    || !['main', 'mcp/registry-federation-projection-20261121'].includes(pr.base?.ref)) {
    return { status: 'SKIP', reason: 'STALE_OR_UNADMITTED_PR' };
  }
  if (!Array.isArray(comments)) {
    return { status: 'BLOCKED', reason: 'COMMENTS_UNAVAILABLE' };
  }
  const marker = reviewMarker(run.head_sha);
  if (comments.some(c => c?.user?.login === BOT && typeof c.body === 'string' && c.body.includes(marker))) {
    return { status: 'SKIP', reason: 'ALREADY_REQUESTED' };
  }
  return { status: 'READY', number, headSha: run.head_sha, marker };
}

/** Reapply every project/branch/admission gate at the final write boundary. */
export function requireFreshReviewAdmission({ event, current, comments, planned }) {
  const checked = planRegistryReview({ event, pr: current, comments });
  if (checked.status !== 'READY' || planned.status !== 'READY'
    || checked.headSha !== planned.headSha || checked.number !== planned.number) {
    throw Error('REGISTRY_REVIEW_SCOPE_CHANGED');
  }
  return checked;
}

async function api(token, route, method = 'GET', payload) {
  const resp = await fetch('https://api.github.com/repos/' + REPOSITORY + route, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  if (!resp.ok) throw Error('REGISTRY_REVIEW_HTTP_' + resp.status);
  return await resp.json();
}

export async function main() {
  if (process.env.GITHUB_REPOSITORY !== REPOSITORY || process.env.GITHUB_EVENT_NAME !== 'workflow_run'
    || process.env.GITHUB_REF !== 'refs/heads/main') {
    throw Error('REGISTRY_REVIEW_WRONG_EXECUTION_CONTEXT');
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token || !process.env.GITHUB_EVENT_PATH) throw Error('REGISTRY_REVIEW_CONTEXT_UNAVAILABLE');
  const raw = await readFile(process.env.GITHUB_EVENT_PATH, 'utf8');
  if (raw.length > 512000) throw Error('REGISTRY_REVIEW_EVENT_TOO_LARGE');
  const event = JSON.parse(raw);
  const run = event.workflow_run;
  if (!run || run.name !== 'MCP CI' || run.event !== 'pull_request'
    || run.status !== 'completed' || run.conclusion !== 'success'
    || run.head_repository?.full_name !== REPOSITORY
    || !SHA.test(text(run.head_sha)) || !Array.isArray(run.pull_requests)
    || run.pull_requests.length !== 1) {
    console.log('REGISTRY_REVIEW_SKIPPED_UNSCOPED_EVENT');
    return;
  }
  const number = run.pull_requests[0]?.number;
  if (!Number.isSafeInteger(number) || number < 1) {
    console.log('REGISTRY_REVIEW_SKIPPED_INVALID_PR');
    return;
  }
  const pr = await api(token, '/pulls/' + number);
  const comments = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await api(token, '/issues/' + number + '/comments?per_page=100&page=' + page);
    if (!Array.isArray(batch) || batch.length > 100) throw Error('REGISTRY_REVIEW_COMMENTS_INVALID');
    comments.push(...batch);
    if (batch.length < 100) break;
    if (page === 5) throw Error('REGISTRY_REVIEW_COMMENTS_PAGINATION_LIMIT');
  }
  const planned = planRegistryReview({ event, pr, comments });
  if (planned.status !== 'READY') {
    console.log('REGISTRY_REVIEW_' + planned.status + '_' + planned.reason);
    return;
  }
  // Reobserve HEAD immediately before writing; never dispatch on a stale SHA.
  const current = await api(token, '/pulls/' + planned.number);
  // HEAD alone is insufficient: base, scope and ownership may change
  // between the first read and the last permission-sensitive action.
  requireFreshReviewAdmission({ event, current, comments, planned });
  const posted = await api(token, '/issues/' + planned.number + '/comments', 'POST', {
    body: '@codex review\n\nReview exact MCP CI HEAD ' + planned.headSha
      + '. This is an independent review request, NOT an approval.\n\n' + planned.marker
  });
  if (!Number.isSafeInteger(posted?.id) || posted.id < 1) throw Error('REGISTRY_REVIEW_RECEIPT_INVALID');
  const receipt = await api(token, '/issues/comments/' + posted.id);
  if (receipt.id !== posted.id || receipt.user?.login !== BOT
    || typeof receipt.body !== 'string' || !receipt.body.includes(planned.marker)) {
    throw Error('REGISTRY_REVIEW_RECEIPT_UNVERIFIED');
  }
  console.log('REGISTRY_REVIEW_REQUESTED_PR_' + planned.number);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'REGISTRY_REVIEW_UNAVAILABLE');
    process.exitCode = 1;
  });
}
