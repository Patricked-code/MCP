import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { readLiveState, writeLiveState } from '../src/liveState/store.js';
import { reconcileLiveState } from '../src/liveState/reconcile.js';
import type { LiveStateObservations } from '../src/liveState/types.js';

function observations(head: string): LiveStateObservations {
  return {
    repository: 'Patricked-code/MCP',
    github: { status: 'CURRENT', branch: 'main', head },
    s1: {
      status: 'CURRENT',
      path: '/opt/apps/wealthtech-mcp-ssh-bridge',
      branch: 'main',
      head,
      originMain: head,
      workingTreeClean: true,
      diffEmpty: true,
      fetchRemote: 'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
      pushRemote: 'disabled://mcp-s1-read-only'
    },
    runtime: {
      status: 'CURRENT',
      container: 'wealthtech_mcp_ssh_bridge',
      containerStatus: 'running',
      health: 'healthy',
      imageId: 'sha256:image',
      revision: head
    },
    documentation: {
      status: 'CURRENT',
      activeTask: null,
      declaredGithubSha: head,
      declaredS1Sha: head,
      drift: false
    }
  };
}

test('écrit puis relit un état JSON avec permissions 0600', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-live-state-store-'));
  const file = join(directory, 'live-state.json');
  process.env.MCP_LIVE_STATE_FILE = file;

  try {
    const snapshot = reconcileLiveState(observations('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), null);
    await writeLiveState(snapshot);
    const loaded = await readLiveState();
    const info = await stat(file);

    assert.deepEqual(loaded, snapshot);
    assert.equal(info.mode & 0o777, 0o600);
  } finally {
    delete process.env.MCP_LIVE_STATE_FILE;
    await rm(directory, { recursive: true, force: true });
  }
});

test('remplace atomiquement le fichier final sans laisser de temporaire', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-live-state-store-'));
  const file = join(directory, 'live-state.json');
  process.env.MCP_LIVE_STATE_FILE = file;

  try {
    const first = reconcileLiveState(observations('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), null);
    const second = reconcileLiveState(
      observations('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
      first
    );

    await writeLiveState(first);
    await writeLiveState(second);

    assert.deepEqual(await readLiveState(), second);
    assert.deepEqual(await readdir(directory), ['live-state.json']);
  } finally {
    delete process.env.MCP_LIVE_STATE_FILE;
    await rm(directory, { recursive: true, force: true });
  }
});

test('un fichier absent retourne null sans créer de faux état', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-live-state-store-'));
  process.env.MCP_LIVE_STATE_FILE = join(directory, 'missing.json');

  try {
    assert.equal(await readLiveState(), null);
  } finally {
    delete process.env.MCP_LIVE_STATE_FILE;
    await rm(directory, { recursive: true, force: true });
  }
});
