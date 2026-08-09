import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getLiveStateSummary, registerLiveStateReadOnlyTools } from '../src/tools/liveState.js';
import type { LiveStateSnapshot } from '../src/liveState/types.js';

const SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function snapshot(): LiveStateSnapshot {
  return {
    schemaVersion: 1,
    stateVersion: 7,
    generatedAt: '2026-08-09T12:00:00.000Z',
    lastReconciledAt: '2026-08-09T12:00:00.000Z',
    maxAgeSeconds: 60,
    freshness: 'CURRENT',
    ageSeconds: 3,
    repository: 'Patricked-code/MCP',
    github: { status: 'CURRENT', branch: 'main', head: SHA },
    s1: {
      status: 'CURRENT',
      path: '/opt/apps/wealthtech-mcp-ssh-bridge',
      branch: 'main', head: SHA, originMain: SHA, workingTreeClean: true, diffEmpty: true,
      fetchRemote: 'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
      pushRemote: 'disabled://mcp-s1-read-only'
    },
    runtime: {
      status: 'CURRENT', container: 'wealthtech_mcp_ssh_bridge', containerStatus: 'running',
      health: 'healthy', imageId: 'sha256:image', revision: SHA
    },
    documentation: {
      status: 'CURRENT', activeTask: 'TASK-20260809-002', declaredGithubSha: SHA,
      declaredS1Sha: SHA, drift: false
    },
    alignment: {
      githubVsS1: 'ALIGNED', runtime: 'ALIGNED', documentation: 'ALIGNED', global: 'FULLY_ALIGNED'
    },
    contradictions: [],
    nextAction: null
  };
}

test('enregistre uniquement les deux outils Live State read-only attendus', () => {
  const handlers = new Map<string, () => Promise<unknown>>();
  const fakeServer = {
    tool(name: string, _description: string, _schema: unknown, handler: () => Promise<unknown>) {
      handlers.set(name, handler);
    }
  } as unknown as McpServer;

  registerLiveStateReadOnlyTools(fakeServer, {
    getCurrent: async () => snapshot(),
    reconcileNow: async () => snapshot()
  });

  assert.deepEqual([...handlers.keys()].sort(), ['mcp_get_live_state', 'mcp_reconcile_live_state']);
});

test('les handlers retournent un état JSON sans forcer de mutation', async () => {
  const handlers = new Map<string, () => Promise<{ content?: Array<{ text?: string }> }>>();
  let getCount = 0;
  let reconcileCount = 0;
  const fakeServer = {
    tool(name: string, _description: string, _schema: unknown, handler: () => Promise<{ content?: Array<{ text?: string }> }>) {
      handlers.set(name, handler);
    }
  } as unknown as McpServer;

  registerLiveStateReadOnlyTools(fakeServer, {
    getCurrent: async () => { getCount += 1; return snapshot(); },
    reconcileNow: async () => { reconcileCount += 1; return snapshot(); }
  });

  const getResult = await handlers.get('mcp_get_live_state')?.();
  const reconcileResult = await handlers.get('mcp_reconcile_live_state')?.();
  assert.equal(getCount, 1);
  assert.equal(reconcileCount, 1);
  assert.match(getResult?.content?.[0]?.text || '', /"stateVersion": 7/);
  assert.match(reconcileResult?.content?.[0]?.text || '', /"FULLY_ALIGNED"/);
});

test('le résumé expose uniquement le contexte opérationnel compact', () => {
  assert.deepEqual(getLiveStateSummary(snapshot()), {
    available: true,
    stateVersion: 7,
    freshness: 'CURRENT',
    ageSeconds: 3,
    globalAlignment: 'FULLY_ALIGNED',
    activeTask: 'TASK-20260809-002',
    nextAction: null
  });
});

test('le chemin read-only global enregistre Live State sans catalogue WRITE', async () => {
  const source = await readFile('src/tools/githubAuthorization.ts', 'utf8');
  assert.match(source, /registerLiveStateReadOnlyTools/);
  assert.doesNotMatch(source, /registerLiveStateWrite|mcp_live_state_write/);
});

test('le point de démarrage initialise le moteur Live State une seule fois', async () => {
  const source = await readFile('src/index.ts', 'utf8');
  assert.match(source, /startLiveStateEngine/);
  assert.match(source, /startHttpServer/);
});
