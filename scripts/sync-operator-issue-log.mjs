import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const indexDir = join(repoRoot, 'Migration', 'index');
const packPath = join(indexDir, 'OPERATOR_ACTION_PACK.json');
const logJsonPath = join(indexDir, 'OPERATOR_ACTION_ISSUE_LOG.json');
const logMdPath = join(indexDir, 'OPERATOR_ACTION_ISSUE_LOG.md');
const repositoryNameWithOwner = 'Patricked-code/MCP';
const repositoryUrl = 'https://github.com/Patricked-code/MCP';
const ghCandidates = [
  process.env.GH_BIN,
  'gh',
  'gh.exe'
].filter(Boolean);

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function gh(args) {
  const errors = [];
  for (const candidate of ghCandidates) {
    try {
      return execFileSync(candidate, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }
  throw new Error(`Unable to run GitHub CLI. Tried ${ghCandidates.join(', ')}. ${errors.join(' | ')}`);
}

function issueNumberFromUrl(url) {
  const match = String(url || '').match(/\/issues\/(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function getIssue(action) {
  const issueNumber = action.issueNumber ?? issueNumberFromUrl(action.issueUrl);
  if (!issueNumber) {
    return null;
  }

  const output = gh([
    'issue',
    'view',
    String(issueNumber),
    '--repo',
    repositoryNameWithOwner,
    '--json',
    'number,title,state,labels,url,updatedAt,closedAt'
  ]);
  const issue = JSON.parse(output);
  return {
    actionId: action.id,
    blockerId: action.blockerId,
    issueNumber: issue.number,
    issueUrl: issue.url,
    issueTitle: issue.title,
    state: String(issue.state || '').toLowerCase(),
    labels: Array.isArray(issue.labels) ? issue.labels.map((label) => label.name).filter(Boolean) : [],
    githubUpdatedAt: issue.updatedAt ?? null,
    githubClosedAt: issue.closedAt ?? null
  };
}

function renderMarkdown(log) {
  const openCount = log.issues.filter((issue) => issue.state === 'open').length;
  const issueRows = log.issues
    .map((issue) => `| ${issue.actionId} | ${issue.blockerId} | ${issue.issueUrl} | ${issue.state} | ${issue.githubUpdatedAt ?? '-'} |`)
    .join('\n');

  return `# Operator action issue log - Migration WealthTech

Updated at: ${log.updatedAt}

This file records public-safe GitHub issue references for the operator actions that unblock the full WealthTech MCP migration objective. It does not store raw source text, raw PDF text, raw archive text, raw server inventory, tokens, private keys, \`.env\` values, recovery codes or production action output.

## Summary

| Metric | Value |
|---|---:|
| Repository | ${log.repository.nameWithOwner} |
| Issues recorded | ${log.issues.length} |
| Open issues recorded | ${openCount} |
| Production actions executed | 0 |

## Issues

| Action | Blocker | Issue | State | GitHub updated at |
|---|---|---|---|---|
${issueRows || '| None | None | None | none | - |'}

## Safety

- Do not paste raw tokens, \`.env\` values, private keys, private server paths or sensitive logs into public issues.
- Do not execute production actions from these issues.
- Regenerate the operator action pack after issue references change.
`;
}

function main() {
  if (!existsSync(packPath)) {
    throw new Error('OPERATOR_ACTION_PACK.json must exist before issue sync.');
  }

  const pack = loadJson(packPath);
  const issues = pack.actions
    .map((action) => getIssue(action))
    .filter(Boolean);
  const now = new Date().toISOString();
  const log = {
    version: 1,
    updatedAt: now,
    generator: 'scripts/sync-operator-issue-log.mjs',
    purpose: 'Public-safe issue references for operator actions that unblock the WealthTech MCP migration objective.',
    safety: {
      rawSourceTextStored: false,
      rawPdfTextStored: false,
      rawArchiveTextStored: false,
      rawServerInventoryStored: false,
      rawSecretsStored: false,
      productionActionExecuted: false,
      publicationMode: 'issue_numbers_urls_labels_states_and_public_safe_timestamps_only'
    },
    repository: {
      nameWithOwner: repositoryNameWithOwner,
      url: repositoryUrl
    },
    issues
  };

  writeFileSync(logJsonPath, `${JSON.stringify(log, null, 2)}\n`);
  writeFileSync(logMdPath, renderMarkdown(log));
  console.log(`Wrote ${logJsonPath}`);
  console.log(`Wrote ${logMdPath}`);
  console.log(JSON.stringify({
    issueCount: issues.length,
    openIssueCount: issues.filter((issue) => issue.state === 'open').length,
    issueUrls: issues.map((issue) => issue.issueUrl)
  }, null, 2));
}

main();
