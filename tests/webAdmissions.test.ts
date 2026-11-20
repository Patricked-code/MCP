import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { createAdmissionsRouter } from '../src/web/admissions.js';

const pages = ['/admissions', '/admissions/cug', '/admissions/grt', '/admissions/historique'] as const;
const fixture = 'web-session-fixture=read-only';

test('admission navigation is web-authenticated, read-only and separate from the operational HTTP contracts', async () => {
  let available = false;
  let entryChecks = 0;
  const app = express();
  app.use(createAdmissionsRouter((req, res, next) => {
    if (req.headers.cookie === fixture) next();
    else res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }, () => {
    entryChecks++;
    return available;
  }));
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw Error('Missing test address');
    const base = 'http://127.0.0.1:' + address.port;
    const htmlByPath: string[] = [];
    for (const path of pages) {
      const guest = await fetch(base + path, { redirect: 'manual' });
      assert.equal(guest.status, 302);
      assert.equal(guest.headers.get('location'), '/login?next=' + encodeURIComponent(path));
      assert.equal(guest.headers.get('cache-control'), 'no-store');
      const response = await fetch(base + path + '?flow=unknown-flow-marker', { headers: { cookie: fixture } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
      const csp = response.headers.get('content-security-policy') ?? '';
      assert.match(csp, /default-src 'none'; style-src 'sha256-[A-Za-z0-9+/]+=+'; form-action 'none'/);
      const html = await response.text();
      const css = html.match(/<style>([\s\S]+?)<\/style>/)?.[1];
      assert.ok(css);
      assert.ok(csp.includes(createHash('sha256').update(css).digest('base64')));
      assert.match(html, /name="viewport"/);
      assert.doesNotMatch(html, /<script|<form|<input|unknown-flow-marker|web-session-fixture/);
      htmlByPath.push(html);
      const write = await fetch(base + path, { method: 'POST', headers: { cookie: fixture } });
      assert.equal(write.status, 404);
    }
    assert.equal(entryChecks, 1);
    const [index = '', cug = '', grt = '', historic = ''] = htmlByPath;
    for (const path of pages.slice(1)) assert.ok(index.includes('href="' + path + '"'));
    assert.match(cug, /Route d’admission indisponible/);
    assert.match(cug, /mcp_start_governed_request_auth[\s\S]+\/repo-template\/auth\/verify[\s\S]+\/repo-template\/auth\/select/);
    assert.doesNotMatch(cug, /href="\/repo-template\/auth/);
    assert.match(grt, /\/repo-template\/auth\/submit[\s\S]+\/repo-template\/auth\/status[\s\S]+mcp_resume_grt_repository_creation/);
    assert.match(historic, /GET \/gouvern[\s\S]+POST \/gouvern\/deploy/);
    assert.doesNotMatch(historic, /\/repo-template\/auth/);
    available = true;
    const enabled = await fetch(base + '/admissions/cug', { headers: { cookie: fixture } });
    assert.match(await enabled.text(), /Route d’admission activée[\s\S]+ne vérifie ni l’installation CUG/);
    assert.equal((await fetch(base + '/admissions/inconnue', { headers: { cookie: fixture } })).status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
