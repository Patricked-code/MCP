import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import { collectCugCoverage } from '../src/cug/coverageInventory.js';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const now = new Date('2026-11-20T08:00:00.000Z');
const owner = { login: 'chainsolutions-wealthtech', id: 299685687 };
const installation = { app_id: 5417646, id: 173915815, account: owner, repository_selection: 'all', suspended_at: null };
const token = { permissions: { metadata: 'read' }, token: 'fixture-installation-grant', expires_at: '2026-11-20T09:00:00Z' };

function github(options: { selected?: typeof installation, grant?: object, duplicate?: boolean } = {}) {
  const requests: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://api.github.com');
    assert.equal(init?.redirect, 'error');
    requests.push((init?.method ?? 'GET') + ' ' + url.pathname);
    if (url.pathname === '/orgs/chainsolutions-wealthtech/installation') {
      const auth = new Headers(init?.headers).get('authorization') ?? '';
      const claims = JSON.parse(Buffer.from(auth.split('.')[1]!, 'base64url').toString('utf8'));
      assert.equal(claims.iss, '5417646');
      return Response.json(options.selected ?? installation);
    }
    if (url.pathname.startsWith('/users/')) return new Response(null, { status: 404 });
    if (url.pathname === '/app/installations/173915815/access_tokens') {
      assert.equal(init?.method, 'POST');
      assert.deepEqual(JSON.parse(String(init.body)), { permissions: { metadata: 'read' } });
      return Response.json(options.grant ?? token, { status: 201 });
    }
    if (url.pathname === '/installation/repositories') {
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fixture-installation-grant');
      const offset = (Number(url.searchParams.get('page')) - 1) * 100;
      const count = offset === 0 ? 100 : 1;
      return Response.json({ total_count: 101, repositories: Array.from({length: count}, (_, i) => ({
        id: options.duplicate && offset ? 1 : offset + i + 1,
        owner, full_name: owner.login + '/private-fixture-' + i
      })) });
    }
    throw new Error('Unexpected request');
  };
  return { requests, deps: { fetchImpl, now: () => now, readPrivateKey: async () => privateKey } };
}

test('CUG B2 reports exact bounded coverage after all metadata pages, without publishing names or tokens', async () => {
  const { requests, deps } = github();
  const report = await collectCugCoverage(deps);
  assert.equal(report.appId, 5417646);
  assert.equal(report.complete, false);
  const org = report.owners.find(row => row.owner === owner.login);
  assert.deepEqual(org, {
    owner: owner.login, ownerId: owner.id, status: 'VERIFIED', installationId: 173915815,
    mode: 'all', repositoryCount: 101, repositoryIds: Array.from({ length: 101 }, (_, i) => i + 1)
  });
  assert.equal(requests.filter(value => value === 'GET /installation/repositories').length, 2);
  assert.equal(report.owners.filter(row => row.status === 'UNVERIFIED').length, 2);
  assert.doesNotMatch(JSON.stringify(report), /fixture-installation-grant|private-fixture/);
});

test('CUG B2 will not use a grant containing permissions beyond metadata read', async () => {
  const { requests, deps } = github({ grant: { ...token, permissions: { metadata: 'read', contents: 'write' } } });
  const report = await collectCugCoverage(deps);
  assert.equal(requests.includes('GET /installation/repositories'), false);
  assert.deepEqual(report.owners.find(row => row.owner === owner.login), {
    owner: owner.login, ownerId: owner.id, status: 'UNVERIFIED', reason: 'GRANT_UNVERIFIED'
  });
});

test('a repeated repository across pages leaves coverage unknown without reporting a partial count', async () => {
  const report = await collectCugCoverage(github({ duplicate: true }).deps);
  assert.deepEqual(report.owners.find(row => row.owner === owner.login), {
    owner: owner.login, ownerId: owner.id, status: 'UNVERIFIED', reason: 'REPOSITORIES_UNVERIFIED'
  });
});

test('a lookalike App or different account is rejected before minting a token', async () => {
  const fakeApp = github({ selected: { ...installation, app_id: 5417647 } });
  const fakeOrg = github({ selected: { ...installation, account: { ...owner, id: 42 } } });
  for (const { deps, requests } of [fakeApp, fakeOrg]) {
    const report = await collectCugCoverage(deps);
    assert.equal(report.owners.find(row => row.owner === owner.login)?.status, 'UNVERIFIED');
    assert.equal(requests.some(line => line.startsWith('POST')), false);
  }
});

test('selected coverage remains selected, even after the complete repository list is observed', async () => {
  const report = await collectCugCoverage(github({ selected: { ...installation, repository_selection: 'selected' } }).deps);
  const row = report.owners.find(value => value.owner === owner.login);
  assert.equal(row?.status === 'VERIFIED' && row.mode, 'selected');
});
