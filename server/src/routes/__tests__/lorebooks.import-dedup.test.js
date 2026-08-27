import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import lorebooksRouter from '../lorebooks.js';
import { errorHandler } from '../../middleware/error-handler.js';
import { SqliteStorageService } from '../../services/sqliteStorage.js';

/** A lorebook in SillyTavern's standalone export shape. */
function exportedLorebook({ name = 'World Book', content = 'Dragons are real.' } = {}) {
  return {
    name,
    entries: {
      0: { uid: 0, key: ['dragon'], content, order: 100 },
      1: { uid: 1, key: ['castle'], content: 'A castle stands here.', order: 100 },
    },
  };
}

describe('Lorebook import deduplication', () => {
  let app;
  let tempDir;
  let storage;

  const importFile = (lorebook) =>
    request(app)
      .post('/api/lorebooks/import')
      .attach('lorebook', Buffer.from(JSON.stringify(lorebook)), 'book.json');

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lorebooks-dedup-test-'));
  });

  afterAll(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    storage = new SqliteStorageService(tempDir);
    storage.db.exec('DELETE FROM lorebooks');

    app = express();
    app.use(express.json());
    app.locals.dataRoot = tempDir;
    app.use('/api/lorebooks', lorebooksRouter);
    app.use(errorHandler);
  });

  it('rejects the same file imported twice', async () => {
    await importFile(exportedLorebook()).expect(200);

    const response = await importFile(exportedLorebook()).expect(409);

    expect(response.body.error).toContain('already been imported');
    expect(response.body.existingLorebookName).toBe('World Book');
    expect(response.body.existingLorebookId).toBeTruthy();
  });

  it('catches a re-export saved under a different name', async () => {
    // Identity is the entries and scan settings, not the label.
    await importFile(exportedLorebook({ name: 'World Book' })).expect(200);
    await importFile(exportedLorebook({ name: 'World Book Copy' })).expect(409);

    expect(storage.db.prepare('SELECT id FROM lorebooks').all()).toHaveLength(1);
  });

  it('imports a lorebook whose entries differ', async () => {
    await importFile(exportedLorebook({ content: 'Dragons are real.' })).expect(200);
    await importFile(exportedLorebook({ content: 'Dragons are a myth.' })).expect(200);

    expect(storage.db.prepare('SELECT id FROM lorebooks').all()).toHaveLength(2);
  });

  it('suffixes a colliding name rather than importing a second "World Book"', async () => {
    await importFile(exportedLorebook({ content: 'One.' })).expect(200);
    const second = await importFile(exportedLorebook({ content: 'Two.' })).expect(200);

    expect(second.body.name).toBe('World Book (2)');
  });

  it('does not count renaming or re-describing as a content change', async () => {
    const { body } = await importFile(exportedLorebook()).expect(200);

    await request(app)
      .put(`/api/lorebooks/${body.id}`)
      .send({ name: 'My World Book', description: 'Now with notes.' })
      .expect(200);

    // Still the same lorebook, so the file it came from is still a duplicate.
    await importFile(exportedLorebook()).expect(409);
  });

  it('treats an entry edit as a change to the lorebook', async () => {
    const { body } = await importFile(exportedLorebook()).expect(200);
    const before = storage.db
      .prepare('SELECT current_checksum, import_internal_checksum FROM lorebooks WHERE id = ?')
      .get(body.id);
    expect(before.current_checksum).toBe(before.import_internal_checksum);

    const lorebook = await storage.getLorebook(body.id);
    await request(app)
      .put(`/api/lorebooks/${body.id}/entries/${lorebook.entries[0].id}`)
      .send({ content: 'Dragons are, in fact, real.' })
      .expect(200);

    const after = storage.db
      .prepare('SELECT current_checksum, import_internal_checksum FROM lorebooks WHERE id = ?')
      .get(body.id);
    expect(after.current_checksum).not.toBe(before.current_checksum);
    expect(after.import_internal_checksum).toBe(before.import_internal_checksum);

    // ...and the re-import that was blocked before is now allowed.
    await importFile(exportedLorebook()).expect(200);
  });

  it('catches a file matching a lorebook that predates schema v9', async () => {
    // Migrated rows have no origin checksum, so matching on that alone would let
    // the exact duplicates this feature exists to stop straight back in.
    const { body } = await importFile(exportedLorebook()).expect(200);
    storage.db
      .prepare('UPDATE lorebooks SET import_origin_checksum = NULL WHERE id = ?')
      .run(body.id);

    const response = await importFile(exportedLorebook()).expect(409);
    expect(response.body.existingLorebookId).toBe(body.id);
  });

  it('leaves no origin checksum on a lorebook created in the app', async () => {
    const { body } = await request(app)
      .post('/api/lorebooks/create')
      .send({ name: 'Hand-written' })
      .expect(200);

    const row = storage.db
      .prepare('SELECT import_origin_checksum, current_checksum FROM lorebooks WHERE id = ?')
      .get(body.id);
    expect(row.import_origin_checksum).toBeNull();
    expect(row.current_checksum).toBeTruthy();
  });
});
