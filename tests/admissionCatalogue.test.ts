import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { createAdmissionsRouter } from '../src/web/admissions.js';
import { createCugJourneyGuideRouter } from '../src/cug/journeyGuide.js';

test('the same classified catalogue is visible in the public guide and private console without opening a new admission', async () => {
  let flagReads = 0;
  const app = express();
  app.use(createAdmissionsRouter((req, res, next) => {
    if (req.headers.cookie === 'fixture=valid') next();
    else res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }, () => { flagReads++; return false; }));
  app.use(createCugJourneyGuideRouter());
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw Error('Missing fixture address');
    const base = 'http://127.0.0.1:' + address.port;
    const get = (path: string, authenticated = false) => fetch(base + path, {
      redirect: 'manual', headers: authenticated ? { cookie: 'fixture=valid' } : {}
    });
    const publicGuide = await (await get('/guide/cug-grt')).text();
    const consoleIndex = await (await get('/admissions', true)).text();
    const cases = {
      chatgpt: /ChatGPT[\s\S]+PKCE/,
      claude: /Claude[\s\S]+OAuth/,
      'client-http': /Streamable HTTP/,
      bearer: /mcp:read/,
      codex: /UNVERIFIED/,
      web: /\/dashboard/,
      'github-first': /GitHub seul n’ouvre ni session/,
      github: /\/github/,
      cug: /mcp_start_governed_request_auth/,
      grt: /\/repo-template\/auth\/submit/,
      adoption: /ADOPT_EXISTING_REPOSITORY/,
      grgs: /mcp_resume_grt_repository_creation/,
      sessions: /mcp_open_governed_session[\s\S]+mcp_resume_governed_session/,
      e2: /mcp_e2_reconcile_preflight[\s\S]+mcp_e2_select_chantier/,
      agents: /mcp_claim_next_governed_task/,
      webhook: /\/webhooks\/github\/cug/,
      provisioning: /\/provisioning\/project-runtime/,
      historique: /\/gouvern/,
      plesk: /\/provisioning\/plesk-subdomain/,
      'oidc-actions': /\/deploy\/github\/s1\/start/,
      rest: /UNVERIFIED/,
      'sse-legacy': /NOT_SUPPORTED/,
      stdio: /NOT_SUPPORTED/
    };
    for (const [id, marker] of Object.entries(cases)) {
      const detail = '/admissions/' + id;
      assert.ok(consoleIndex.includes('href="' + detail + '"'), detail);
      assert.ok(publicGuide.includes('href="' + detail + '"'), detail);
      const guest = await get(detail);
      assert.equal(guest.status, 302, detail);
      const privateResponse = await get(detail + '?token=fixture-never-render', true);
      assert.equal(privateResponse.status, 200, detail);
      assert.match(privateResponse.headers.get('content-security-policy') ?? '', /form-action 'none'/);
      const html = await privateResponse.text();
      assert.match(html, marker, detail);
      assert.doesNotMatch(html, /<form|<script|<input|fixture-never-render|href="\/oauth\/authorize|href="\/repo-template\/auth/);
      assert.equal((await fetch(base + detail, { method: 'POST' })).status, 404, detail);
    }
    assert.equal(flagReads, 1);
    const chatgpt = await get('/guide/cug-grt/chatgpt');
    assert.equal(chatgpt.status, 200);
    assert.match(await chatgpt.text(), /ChatGPT[\s\S]+PKCE/);
    assert.equal((await get('/admissions/inconnu', true)).status, 404);
    assert.equal((await get('/admissions/inconnu')).status, 404);
    for (const operational of ['/mcp', '/oauth/authorize', '/webhooks/github/cug', '/repo-template/auth']) {
      assert.equal((await get(operational)).status, 404, operational);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
