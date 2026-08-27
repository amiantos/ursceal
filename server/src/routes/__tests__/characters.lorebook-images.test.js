import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Stand in for the real image cacher: rewriting an external URL to a local path
// is what makes a lorebook's stored content differ from the content the card
// carried, which is the situation this file exists to cover.
vi.mock('../../services/image-cacher.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    cacheAndRewriteLorebookImages: vi.fn(async (lorebookId, lorebookData) => {
      for (const entry of lorebookData.entries ?? []) {
        entry.content = entry.content.replace(
          /https:\/\/example\.test\/(\S+)/g,
          `/api/assets/lorebooks/${lorebookId}/$1`,
        );
      }
    }),
  };
});

import charactersRouter from '../characters.js';
import { errorHandler } from '../../middleware/error-handler.js';
import { SqliteStorageService } from '../../services/sqliteStorage.js';

/** An embedded world book whose entry references an external image. */
function illustratedBook() {
  return {
    name: 'World Book',
    entries: [
      {
        keys: ['dragon'],
        content: 'Dragons are real. ![](https://example.test/dragon.png)',
        enabled: true,
        insertion_order: 100,
      },
    ],
  };
}

function card(name) {
  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: { name, description: `${name} the knight.`, character_book: illustratedBook() },
  };
}

describe('embedded lorebooks whose images get cached', () => {
  let app;
  let tempDir;
  let storage;

  const importCard = (name) =>
    request(app)
      .post('/api/characters/import-json')
      .attach('character', Buffer.from(JSON.stringify(card(name))), 'card.json');

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'characters-lb-images-'));
  });

  afterAll(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    storage = new SqliteStorageService(tempDir);
    storage.db.exec('DELETE FROM characters; DELETE FROM lorebooks');

    app = express();
    app.use(express.json());
    app.locals.dataRoot = tempDir;
    app.use('/api/characters', charactersRouter);
    app.use(errorHandler);
  });

  it('rewrites the stored copy, so its content no longer matches the card', async () => {
    // Establishes the premise: without this, the test below proves nothing.
    const { body } = await importCard('Alice').expect(201);

    const stored = await storage.getLorebook(body.embeddedLorebook.id);
    expect(stored.entries[0].content).toContain('/api/assets/lorebooks/');
    expect(stored.entries[0].content).not.toContain('https://example.test/');
  });

  it('still reuses the lorebook for the next character carrying it', async () => {
    // Matching on stored content alone would miss here — the stored copy points
    // at local paths while the incoming card still points at the original URL.
    const first = await importCard('Alice').expect(201);
    const second = await importCard('Bob').expect(201);

    expect(second.body.embeddedLorebook.reused).toBe(true);
    expect(second.body.embeddedLorebook.id).toBe(first.body.embeddedLorebook.id);
    expect(storage.db.prepare('SELECT id FROM lorebooks').all()).toHaveLength(1);
  });

  it('does not re-run image caching for the reused lorebook', async () => {
    const { cacheAndRewriteLorebookImages } = await import('../../services/image-cacher.js');
    cacheAndRewriteLorebookImages.mockClear();

    await importCard('Alice').expect(201);
    await importCard('Bob').expect(201);

    expect(cacheAndRewriteLorebookImages).toHaveBeenCalledTimes(1);
  });

  it('records the pre-rewrite content as the origin checksum', async () => {
    const { body } = await importCard('Alice').expect(201);

    const row = storage.db
      .prepare(
        `SELECT import_origin_checksum, current_checksum
         FROM lorebooks WHERE id = ?`,
      )
      .get(body.embeddedLorebook.id);

    expect(row.import_origin_checksum).toBeTruthy();
    expect(row.current_checksum).not.toBe(row.import_origin_checksum);
  });
});
