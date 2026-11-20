import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { createCugJourneyGuideRouter, cugJourneyGuidePath } from '../src/cug/journeyGuide.js';

test('public CUG guide describes existing routes without exposing an action or requesting credentials', async () => {
  const app = express();
  app.use(createCugJourneyGuideRouter());
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw Error('Missing test address');
    const base = 'http://127.0.0.1:' + address.port;
    const first = await fetch(base + cugJourneyGuidePath + '?opaque=fixture-should-not-render');
    const html = await first.text();
    assert.equal(first.status, 200);
    assert.match(first.headers.get('content-type') ?? '', /^text\/html/);
    const csp = first.headers.get('content-security-policy') ?? '';
    const nonce = csp.match(/style-src 'nonce-([A-Za-z0-9+/]+={0,2})'/)?.[1];
    assert.ok(nonce);
    assert.ok(html.includes('<style nonce="' + nonce + '">'));
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, /form-action 'none'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(html, /href="\/dashboard"/);
    assert.match(html, /mcp_start_governed_request_auth/);
    assert.match(html, /mcp_resume_grt_repository_creation/);
    assert.match(html, /Choisir un parcours d’admission/);
    assert.match(html, /Les dix entrées du parcours gouverné/);
    for (const entry of ['01 · Client MCP','02 · Autorisation OAuth','03 · GitHub App CUG','04 · Interface web','05 · API HTTP','06 · Création ou adoption GRT','07 · Gouvernance GRGS','08 · Session gouvernée','09 · Webhook GitHub','10 · Agent codeur']) {
      assert.ok(html.includes(entry), 'missing governed entry: ' + entry);
    }
    assert.match(html, /aucune API REST générique d’admission n’est promise/);
    assert.match(html, /aucune tâche ni écriture n’est déclenchée/);
    assert.match(html, /Connecter un client MCP par HTTP/);
    assert.match(html, /Admettre une demande CUG par OAuth/);
    assert.match(html, /Créer ou adopter un dépôt/);
    assert.match(html, /Observer ou reprendre un chantier/);
    assert.match(html, /événements webhook GitHub App/);
    assert.match(html, /SSE hérités, stdio/);
    assert.match(html, /ne sont pas annoncés comme disponibles/);
    assert.match(html, /<code>\/mcp<\/code>/);
    assert.match(html, /<code>\/gouvern<\/code>/);
    assert.match(html, /<code>\/repo-template\/auth<\/code>/);
    assert.doesNotMatch(html, /<script|<form|<input|fixture-should-not-render|href="\/repo-template\/auth/);
    const second = await fetch(base + cugJourneyGuidePath);
    assert.notEqual(second.headers.get('content-security-policy'), csp);
    for (const [path,method] of [[cugJourneyGuidePath,'POST'],['/repo-template/auth','GET'],['/gouvern','GET'],['/index','GET']] as const) {
      assert.equal((await fetch(base + path,{method})).status,404);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
