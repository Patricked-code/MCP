import assert from 'node:assert/strict';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import {
  createOperationalEventJournal,
  type OperationalEvent
} from '../src/operationalMemory/eventJournal.js';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

async function temporaryJournalPath(): Promise<{ directory: string; file: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-operational-events-'));
  return { directory, file: join(directory, 'nested', 'events.jsonl') };
}

function parseLines(content: string): OperationalEvent[] {
  return content
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as OperationalEvent);
}

test('append produit du JSONL 0600 avec IDs et séquence monotone', async () => {
  const { directory, file } = await temporaryJournalPath();
  const journal = createOperationalEventJournal({
    filePath: file,
    maxBytes: 65_536,
    archives: 2,
    now: () => new Date('2026-08-13T06:00:00.000Z')
  });

  try {
    const first = await journal.append({
      type: 'session.opened',
      governedSessionId: SESSION_ID,
      metadata: {
        repository: 'Patricked-code/MCP',
        taskScope: 'TASK-20260813-004',
        status: 'OPEN'
      }
    });
    const second = await journal.append({
      type: 'context.read',
      governedSessionId: SESSION_ID,
      metadata: { stateVersion: 9, freshness: 'CURRENT' }
    });
    const persisted = parseLines(await readFile(file, 'utf8'));

    assert.equal(first.schemaVersion, 1);
    assert.match(first.eventId, /^[0-9a-f-]{36}$/);
    assert.equal(first.processSequence, 1);
    assert.equal(second.processSequence, 2);
    assert.equal(first.occurredAt, '2026-08-13T06:00:00.000Z');
    assert.deepEqual(persisted, [first, second]);
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    assert.equal((await stat(dirname(file))).mode & 0o777, 0o700);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('les appends parallèles restent complets et séquencés', async () => {
  const { directory, file } = await temporaryJournalPath();
  const journal = createOperationalEventJournal({
    filePath: file,
    maxBytes: 65_536,
    archives: 2
  });

  try {
    await Promise.all(Array.from({ length: 20 }, (_, index) => journal.append({
      type: 'session.heartbeat',
      governedSessionId: SESSION_ID,
      metadata: { sessionRevision: index, status: 'ACTIVE' }
    })));

    const events = parseLines(await readFile(file, 'utf8'));
    assert.equal(events.length, 20);
    assert.deepEqual(events.map((event) => event.processSequence),
      Array.from({ length: 20 }, (_, index) => index + 1));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('les clés sensibles ou hors allowlist sont refusées avant écriture', async () => {
  const forbiddenKeys = [
    'token',
    'authorization',
    'prompt',
    'arguments',
    'output',
    'content',
    'mcpSessionId',
    'transportSessionId'
  ];

  for (const forbiddenKey of forbiddenKeys) {
    const { directory, file } = await temporaryJournalPath();
    const journal = createOperationalEventJournal({
      filePath: file,
      maxBytes: 65_536,
      archives: 2
    });

    try {
      await assert.rejects(journal.append({
        type: 'session.opened',
        governedSessionId: SESSION_ID,
        metadata: {
          repository: 'Patricked-code/MCP',
          taskScope: 'TASK-20260813-004',
          status: 'OPEN',
          [forbiddenKey]: 'forbidden'
        }
      } as never), /OPERATIONAL_EVENT_METADATA_FORBIDDEN/);
      await assert.rejects(access(file), { code: 'ENOENT' });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
});

test('la rotation conserve deux archives maximum et chaque ligne reste JSON valide', async () => {
  const { directory, file } = await temporaryJournalPath();
  const journal = createOperationalEventJournal({
    filePath: file,
    maxBytes: 512,
    archives: 2
  });

  try {
    for (let index = 0; index < 24; index += 1) {
      await journal.append({
        type: 'blocker.detected',
        governedSessionId: SESSION_ID,
        metadata: {
          blockerCode: `BLOCKER_${index}`,
          scope: 'repository:Patricked-code/MCP'
        }
      });
    }

    const names = (await readdir(dirname(file))).sort();
    assert.deepEqual(names, ['events.jsonl', 'events.jsonl.1', 'events.jsonl.2']);
    assert.equal(names.includes('events.jsonl.3'), false);

    for (const name of names) {
      const events = parseLines(await readFile(join(dirname(file), name), 'utf8'));
      assert.ok(events.length > 0);
      assert.ok(events.every((event) => event.schemaVersion === 1));
      assert.equal((await stat(join(dirname(file), name))).mode & 0o777, 0o600);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('le journal refuse un fichier actif symlink sans modifier sa cible', async () => {
  const { directory, file } = await temporaryJournalPath();
  const target = join(directory, 'outside.txt');
  const journal = createOperationalEventJournal({
    filePath: file,
    maxBytes: 65_536,
    archives: 2
  });

  try {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    await writeFile(target, 'unchanged', 'utf8');
    await symlink(target, file);

    await assert.rejects(journal.append({
      type: 'context.read',
      governedSessionId: SESSION_ID,
      metadata: { stateVersion: 9 }
    }), /OPERATIONAL_EVENT_SYMLINK/);
    assert.equal(await readFile(target, 'utf8'), 'unchanged');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
