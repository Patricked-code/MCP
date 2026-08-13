import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createAtomicJsonStore } from '../src/operationalMemory/atomicStore.js';
import {
  LockStoreDocumentSchema,
  SessionStoreDocumentSchema,
  createEmptyLockStoreDocument,
  createEmptySessionStoreDocument
} from '../src/operationalMemory/types.js';

async function temporaryStorePath(): Promise<{ directory: string; file: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-operational-store-'));
  return { directory, file: join(directory, 'nested', 'store.json') };
}

test('un store absent retourne un document vide sans créer de fichier', async () => {
  const { directory, file } = await temporaryStorePath();
  const store = createAtomicJsonStore({
    filePath: file,
    schema: SessionStoreDocumentSchema,
    empty: createEmptySessionStoreDocument
  });

  try {
    assert.deepEqual(await store.read(), {
      schemaVersion: 1,
      storeRevision: 0,
      sessions: []
    });
    await assert.rejects(access(file), { code: 'ENOENT' });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('update écrit un JSON strict et applique 0700 au dossier puis 0600 au fichier', async () => {
  const { directory, file } = await temporaryStorePath();
  const store = createAtomicJsonStore({
    filePath: file,
    schema: SessionStoreDocumentSchema,
    empty: createEmptySessionStoreDocument
  });

  try {
    const updated = await store.update((current) => ({
      ...current,
      storeRevision: current.storeRevision + 1
    }));

    assert.equal(updated.storeRevision, 1);
    assert.deepEqual(await store.read(), updated);
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    assert.equal((await stat(join(directory, 'nested'))).mode & 0o777, 0o700);
    assert.deepEqual(await readdir(join(directory, 'nested')), ['store.json']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('les updates concurrentes sont sérialisées sans perte de révision', async () => {
  const { directory, file } = await temporaryStorePath();
  const store = createAtomicJsonStore({
    filePath: file,
    schema: LockStoreDocumentSchema,
    empty: createEmptyLockStoreDocument
  });

  try {
    await Promise.all(Array.from({ length: 12 }, (_, index) => store.update(async (current) => {
      if (index % 2 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
      return { ...current, storeRevision: current.storeRevision + 1 };
    })));

    assert.equal((await store.read()).storeRevision, 12);
    assert.deepEqual(await readdir(join(directory, 'nested')), ['store.json']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('un JSON invalide est refusé sans écraser ni renommer la preuve corrompue', async () => {
  const { directory, file } = await temporaryStorePath();
  const store = createAtomicJsonStore({
    filePath: file,
    schema: SessionStoreDocumentSchema,
    empty: createEmptySessionStoreDocument
  });
  const corrupted = Buffer.from('{"schemaVersion":1,"sessions":[');

  try {
    await store.update((current) => current);
    await writeFile(file, corrupted, { mode: 0o600 });

    await assert.rejects(
      store.read(),
      (error: unknown) => error instanceof Error
        && error.message === 'OPERATIONAL_STORE_CORRUPTED'
    );
    assert.deepEqual(await readFile(file), corrupted);
    assert.deepEqual(await readdir(join(directory, 'nested')), ['store.json']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('un JSON valide mais hors schéma strict est traité comme corrompu', async () => {
  const { directory, file } = await temporaryStorePath();
  const store = createAtomicJsonStore({
    filePath: file,
    schema: SessionStoreDocumentSchema,
    empty: createEmptySessionStoreDocument
  });
  const invalidDocument = '{"schemaVersion":1,"storeRevision":0,"sessions":[],"transportSessionId":"raw"}\n';

  try {
    await store.update((current) => current);
    await writeFile(file, invalidDocument, { mode: 0o600 });

    await assert.rejects(store.read(), /OPERATIONAL_STORE_CORRUPTED/);
    assert.equal(await readFile(file, 'utf8'), invalidDocument);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('les documents vides sessions et locks sont versionnés et stricts', () => {
  assert.deepEqual(SessionStoreDocumentSchema.parse(createEmptySessionStoreDocument()), {
    schemaVersion: 1,
    storeRevision: 0,
    sessions: []
  });
  assert.deepEqual(LockStoreDocumentSchema.parse(createEmptyLockStoreDocument()), {
    schemaVersion: 1,
    storeRevision: 0,
    locks: []
  });
  assert.equal(SessionStoreDocumentSchema.safeParse({
    schemaVersion: 1,
    storeRevision: 0,
    sessions: [],
    unexpected: true
  }).success, false);
});
