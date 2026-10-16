#!/usr/bin/env node
/**
 * GitHub-only, unprivileged intake discovery for the EXISTING MCP program.
 * Writes one idempotent issue receipt. Never changes the Program Backlog,
 * runtime Task Queue, session/lease/claim/lock, source code or deployments.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CANONICAL_REPOSITORY = 'Patricked-code/MCP';
export const SUPERVISION_ISSUES = new Set([235, 313]);
export const DISCOVERY_MARKER = 'MCP_AUTO_INTAKE_DISCOVERY_V1';
const MAX_BODY_BYTES = 128 * 1024;
const MAX_PAGES = 10;

function validNumber(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function classifyEvent(event, eventName, repository, actor) {
  if (repository !== CANONICAL_REPOSITORY) return null;
  if (!event || typeof event !== 'object' || !event.issue) return null;
  if (!validNumber(event.issue.number)) return null;
  if (typeof actor !== 'string' || !/^[A-Za-z0-9-]{1,39}$/.test(actor)) return null;
  if (event.sender?.login !== actor) return null;
  if (event.issue.state !== 'open') return null;

  const number = event.issue.number;
  let body;
  let title;
  let sourceKey;
  let action;
  let sourceUrl;

  if (eventName === 'issues') {
    if (!['opened', 'edited', 'reopened'].includes(event.action)) return null;
    title = event.issue.title;
    if (typeof title !== 'string' || !/^\[PROGRAM INTAKE\]\s+\S/i.test(title)) return null;
    if (!validNumber(event.issue.id)) return null;
    body = event.issue.body ?? '';
    sourceKey = 'issue-' + event.issue.id;
    action = event.action;
    sourceUrl = 'https://github.com/' + CANONICAL_REPOSITORY + '/issues/' + number;
  } else if (eventName === 'issue_comment') {
    if (event.action !== 'created' || !SUPERVISION_ISSUES.has(number)) return null;
    if (!event.comment || !validNumber(event.comment.id)) return null;
    if (event.comment.user?.login !== actor) return null;
    body = event.comment.body ?? '';
    if (typeof body !== 'string' || !/^\[(?:PROGRAM INTAKE|PROGRAM MANDATE)\]\s+\S/i.test(body)) return null;
    title = body.split(/\r?\n/, 1)[0].slice(0, 180);
    sourceKey = 'comment-' + event.comment.id;
    action = 'created';
    sourceUrl = 'https://github.com/' + CANONICAL_REPOSITORY + '/issues/' + number
      + '#issuecomment-' + event.comment.id;
  } else {
    return null;
  }

  if (typeof body !== 'string' || Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) return null;
  if (typeof title !== 'string' || title.length > 240) return null;

  // The owner-written text is always untrusted *data*; it is never executed.
  return {
    issueNumber: number,
    sourceKey,
    action,
    title,
    actor,
    sourceUrl,
    digest: createHash('sha256').update(title + '\n' + body).digest('hex')
  };
}

export function isIntakeSubmitterPermission(permission) {
  // GitHub WRITE authorizes proposing an intake, never executing it.
  return permission === 'admin' || permission === 'maintain' || permission === 'write';
}

export function programIntakeStatus(program, source) {
  if (!program || !Array.isArray(program.programIntakes)) {
    throw new Error('INVALID_CANONICAL_PROGRAM_BACKLOG');
  }
  const match = program.programIntakes.find((entry) => entry.issue === source.issueNumber);
  if (match) return {
    status: 'EXISTING_BACKLOG_RECORD_REOBSERVE',
    existingIntakeId: String(match.id || '').slice(0, 80)
  };
  return { status: 'DISCOVERED_PENDING_GOVERNED_CONVERGENCE', existingIntakeId: null };
}

export function receiptMarker(source) {
  return '<!-- ' + DISCOVERY_MARKER + ':' + source.sourceKey + ' -->';
}

export function renderReceipt(source, intake) {
  const cleanTitle = source.title.replace(/[<>\r\n]/g, ' ').slice(0, 180);
  return [
    receiptMarker(source),
    '### MCP — détection automatique de mission (preuve GitHub, sans attribution)',
    '',
    '- **Source :** ' + source.sourceUrl,
    '- **Événement GitHub :** ' + source.action,
    '- **Soumis par :** \`' + source.actor + '\` (permission de contribution GitHub \`write|maintain|admin\` vérifiée ; aucun droit runtime accordé)',
    '- **Intitulé :** ' + cleanTitle,
    '- **Empreinte SHA-256 du contenu :** \`' + source.digest + '\`',
    '- **Backlog V2 :** \`' + intake.status + '\`',
    ...(intake.existingIntakeId ? ['- **Entrée existante :** \`' + intake.existingIntakeId + '\`'] : []),
    '',
    '**Limite d’autorité :** ceci est uniquement une découverte/idempotence durable. '
      + 'Ni Task runtime, ni session, claim, lease, lock, permission, exécution, '
      + 'déploiement ou bus live ne sont créés par cette notification.',
    '',
    '**NEXT_ACTION :** réconcilier de façon gouvernée avec le Program Backlog V2 '
      + '(existence, dépendances, domaines de collision), puis réobserver les autorités '
      + 'Task Queue / Sessions / Locks et les droits avant toute matérialisation ou exécution.',
    '',
    'Le corps potentiellement sensible de la mission n’est pas recopié dans ce reçu.',
  ].join('\n');
}

export function decideReceipt({ candidate, permission, program }) {
  if (!candidate) return { action: 'IGNORE', reason: 'NOT_ALLOWLISTED_EVENT' };
  if (!isIntakeSubmitterPermission(permission)) return { action: 'IGNORE', reason: 'NOT_GITHUB_SUBMITTER_AUTHORIZED' };
  const intake = programIntakeStatus(program, candidate);
  return { action: 'UPSERT_RECEIPT', intake, body: renderReceipt(candidate, intake) };
}

async function githubRequest(token, repository, apiPath, method = 'GET', body) {
  const response = await fetch('https://api.github.com/repos/' + repository + apiPath, {
    method,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('GITHUB_API_' + response.status);
  return response.json();
}

async function upsertReceipt(token, source, body) {
  const repository = CANONICAL_REPOSITORY;
  const issuePath = '/issues/' + source.issueNumber + '/comments';
  const marker = receiptMarker(source);
  let existing = null;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const comments = await githubRequest(token, repository, issuePath + '?per_page=100&page=' + page);
    if (!Array.isArray(comments)) throw new Error('INVALID_ISSUE_COMMENTS');
    existing = comments.find((comment) =>
      comment.user?.login === 'github-actions[bot]' && typeof comment.body === 'string'
      && comment.body.includes(marker)
    ) || existing;
    if (existing) break;
    if (comments.length < 100) break;
    if (page === MAX_PAGES) throw new Error('COMMENTS_PAGE_LIMIT_FAIL_CLOSED');
  }
  if (existing?.body === body) return 'UNCHANGED';
  if (existing) {
    await githubRequest(token, repository, '/issues/comments/' + existing.id, 'PATCH', { body });
    return 'UPDATED';
  }
  await githubRequest(token, repository, issuePath, 'POST', { body });
  return 'CREATED';
}

export async function main(env = process.env) {
  if (env.GITHUB_REPOSITORY !== CANONICAL_REPOSITORY) throw new Error('WRONG_REPOSITORY');
  if (!env.GITHUB_EVENT_PATH || !env.GITHUB_EVENT_NAME || !env.GITHUB_ACTOR || !env.GITHUB_TOKEN) {
    throw new Error('MISSING_GITHUB_EVENT_CONTEXT');
  }
  const raw = await readFile(env.GITHUB_EVENT_PATH);
  if (raw.length > 200 * 1024) throw new Error('EVENT_PAYLOAD_TOO_LARGE');
  const event = JSON.parse(raw.toString('utf8'));
  const candidate = classifyEvent(event, env.GITHUB_EVENT_NAME, env.GITHUB_REPOSITORY, env.GITHUB_ACTOR);
  if (!candidate) { process.stdout.write('AUTO_INTAKE_IGNORED\n'); return; }

  const permissionResponse = await githubRequest(
    env.GITHUB_TOKEN, CANONICAL_REPOSITORY,
    '/collaborators/' + encodeURIComponent(env.GITHUB_ACTOR) + '/permission'
  );
  const program = JSON.parse(await readFile('docs/governance/program-backlog-convergence.json', 'utf8'));
  const result = decideReceipt({ candidate, permission: permissionResponse.permission, program });
  if (result.action !== 'UPSERT_RECEIPT') {
    process.stdout.write('AUTO_INTAKE_IGNORED_UNAUTHORIZED\n');
    return;
  }
  const outcome = await upsertReceipt(env.GITHUB_TOKEN, candidate, result.body);
  process.stdout.write('AUTO_INTAKE_' + outcome + ' ' + result.intake.status + '\n');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    const reason = /^GITHUB_API_\d+$|^[A-Z_]+$/.test(error?.message || '')
      ? error.message : 'AUTO_INTAKE_FAIL_CLOSED';
    process.stderr.write(reason + '\n');
    process.exitCode = 1;
  });
}
