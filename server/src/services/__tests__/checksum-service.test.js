import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  canonicalStringify,
  computeCharacterChecksum,
  computeLorebookChecksum,
  normalizeCharacterForChecksum,
  normalizeLorebookForChecksum,
} from '../checksum-service.js';
import { SqliteStorageService } from '../sqliteStorage.js';
import { LorebookParser } from '../lorebook-parser.js';

/** A lorebook in the shape LorebookParser produces, with optional fields omitted. */
function sparseLorebook(overrides = {}) {
  return {
    name: 'World Book',
    entries: [
      {
        keys: ['dragon'],
        content: 'Dragons are real.',
        enabled: true,
        insertionOrder: 100,
        probability: 100,
        depth: 4,
      },
      {
        keys: ['knight', 'squire'],
        content: 'Knights serve the crown.',
        enabled: true,
        insertionOrder: 100,
        probability: 100,
        depth: 4,
      },
    ],
    ...overrides,
  };
}

function card(overrides = {}) {
  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: 'Alice',
      description: 'A knight.',
      personality: 'Brave',
      first_mes: 'Hail.',
      extensions: {},
      ...overrides,
    },
  };
}

describe('canonicalStringify', () => {
  it('is independent of key insertion order', () => {
    expect(canonicalStringify({ b: 1, a: 2 })).toBe(canonicalStringify({ a: 2, b: 1 }));
  });

  it('preserves array order', () => {
    expect(canonicalStringify([1, 2])).not.toBe(canonicalStringify([2, 1]));
  });

  it('treats undefined and null alike so a missing key cannot diverge', () => {
    expect(canonicalStringify({ a: undefined })).toBe(canonicalStringify({ a: null }));
  });

  it('throws on circular structures rather than recursing forever', () => {
    const cyclic = { name: 'loop' };
    cyclic.self = cyclic;
    expect(() => canonicalStringify(cyclic)).toThrow(TypeError);
  });

  it('does not treat a value repeated at sibling positions as circular', () => {
    const shared = { a: 1 };
    expect(() => canonicalStringify({ x: shared, y: shared })).not.toThrow();
  });
});

describe('normalization is total', () => {
  it('collapses missing, undefined, null and empty-string lorebook fields', () => {
    const missing = computeLorebookChecksum({ entries: [] });
    const explicit = computeLorebookChecksum({
      description: '',
      scanDepth: null,
      tokenBudget: undefined,
      recursiveScanning: false,
      extensions: {},
      entries: [],
    });
    expect(missing).toBe(explicit);
  });

  it('collapses missing, undefined and empty-string character fields', () => {
    const missing = computeCharacterChecksum({ data: { name: 'Alice' } });
    const explicit = computeCharacterChecksum({
      data: {
        name: 'Alice',
        description: '',
        personality: undefined,
        scenario: null,
        tags: [],
        extensions: {},
      },
    });
    expect(missing).toBe(explicit);
  });

  it('defaults every hashed field so shape cannot leak into the digest', () => {
    const normalized = normalizeLorebookForChecksum({});
    for (const value of Object.values(normalized)) {
      expect(value).toBeDefined();
    }
    expect(normalizeCharacterForChecksum({}).name).toBe('');
  });
});

describe('what a lorebook checksum covers', () => {
  it('ignores name and description', () => {
    // The case this feature exists for: an embedded lorebook is renamed after
    // whichever character carried it, so the label cannot be part of identity.
    const asAlices = computeLorebookChecksum(
      sparseLorebook({ name: "Alice's Lorebook", description: 'Lorebook for Alice' }),
    );
    const asBobs = computeLorebookChecksum(
      sparseLorebook({ name: "Bob's Lorebook", description: 'Lorebook for Bob' }),
    );
    expect(asAlices).toBe(asBobs);
  });

  it('ignores entry order', () => {
    const forward = sparseLorebook();
    const reversed = sparseLorebook({ entries: sparseLorebook().entries.toReversed() });
    expect(computeLorebookChecksum(forward)).toBe(computeLorebookChecksum(reversed));
  });

  it('changes when entry content changes', () => {
    const edited = sparseLorebook();
    edited.entries[0].content = 'Dragons are a myth.';
    expect(computeLorebookChecksum(edited)).not.toBe(computeLorebookChecksum(sparseLorebook()));
  });

  it('changes when scan settings change', () => {
    expect(computeLorebookChecksum(sparseLorebook({ tokenBudget: 500 }))).not.toBe(
      computeLorebookChecksum(sparseLorebook()),
    );
  });

  it('ignores SillyTavern export stamps in extensions', () => {
    const stamped = sparseLorebook({ extensions: { id: 41, create_date: '2026-01-01' } });
    expect(computeLorebookChecksum(stamped)).toBe(computeLorebookChecksum(sparseLorebook()));
  });
});

describe('what a character checksum covers', () => {
  it('changes when the name changes', () => {
    expect(computeCharacterChecksum(card({ name: 'Alicia' }))).not.toBe(
      computeCharacterChecksum(card()),
    );
  });

  it('changes when alternate greetings change', () => {
    expect(computeCharacterChecksum(card({ alternate_greetings: ['Yo.'] }))).not.toBe(
      computeCharacterChecksum(card()),
    );
  });

  it('ignores the local lorebook association', () => {
    // ursceal_lorebook_id is ours, not the card author's — linking a lorebook is
    // not a change to the character.
    const linked = card({ extensions: { ursceal_lorebook_id: 'lb-123' } });
    expect(computeCharacterChecksum(linked)).toBe(computeCharacterChecksum(card()));
  });

  it('ignores the embedded lorebook, which is deduplicated on its own', () => {
    const withBook = card({ character_book: { entries: [{ keys: ['x'], content: 'y' }] } });
    expect(computeCharacterChecksum(withBook)).toBe(computeCharacterChecksum(card()));
  });

  it('accepts a bare data object as well as a wrapped V2 card', () => {
    expect(computeCharacterChecksum(card().data)).toBe(computeCharacterChecksum(card()));
  });
});

// The property every other use of these checksums depends on. If a checksum
// taken at import time cannot be reproduced from the stored entity, duplicate
// detection silently stops working the moment anything is saved or migrated.
describe('checksums survive a round-trip through SQLite', () => {
  let tempDir;
  let storage;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checksum-roundtrip-'));
    storage = new SqliteStorageService(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('a lorebook hashes the same before saving and after reading back', async () => {
    const parsed = sparseLorebook();
    const atImport = computeLorebookChecksum(parsed);

    await storage.saveLorebook('lb-1', parsed);
    const readBack = await storage.getLorebook('lb-1');

    expect(computeLorebookChecksum(readBack)).toBe(atImport);
  });

  it('a lorebook parsed from a real SillyTavern export round-trips', async () => {
    const parsed = LorebookParser.parseStandaloneLorebook(
      JSON.stringify({
        name: 'Exported Book',
        entries: {
          0: { uid: 0, key: ['castle'], content: 'A castle stands here.', order: 100 },
          1: { uid: 1, key: ['moat'], content: 'It has a moat.', order: 100 },
        },
      }),
    );
    const atImport = computeLorebookChecksum(parsed);

    await storage.saveLorebook('lb-2', parsed);
    expect(computeLorebookChecksum(await storage.getLorebook('lb-2'))).toBe(atImport);
  });

  it('storage records the same checksum it would compute on read', async () => {
    await storage.saveLorebook('lb-3', sparseLorebook());

    const stored = storage.db
      .prepare('SELECT current_checksum FROM lorebooks WHERE id = ?')
      .get('lb-3');
    expect(stored.current_checksum).toBe(
      computeLorebookChecksum(await storage.getLorebook('lb-3')),
    );
  });

  it('a character hashes the same before saving and after reading back', async () => {
    const cardData = card();
    const atImport = computeCharacterChecksum(cardData);

    await storage.saveCharacter('char-1', cardData, null);
    expect(computeCharacterChecksum(await storage.getCharacter('char-1'))).toBe(atImport);
  });

  it('backfilled checksums match a fresh import of the same content', async () => {
    // An install upgrading from schema v8 has rows with no checksum. If the
    // backfill produced a different digest than an import does, the installs
    // that actually have duplicate lorebooks would never detect one.
    const parsed = sparseLorebook();
    await storage.saveLorebook('lb-old', parsed);
    storage.db.prepare('UPDATE lorebooks SET current_checksum = NULL WHERE id = ?').run('lb-old');

    const result = await storage.backfillChecksums();
    expect(result.lorebooks).toBe(1);

    const backfilled = storage.db
      .prepare('SELECT current_checksum FROM lorebooks WHERE id = ?')
      .get('lb-old');
    expect(backfilled.current_checksum).toBe(computeLorebookChecksum(parsed));
  });

  it('backfills characters too, and leaves origin checksums null', async () => {
    await storage.saveCharacter('char-old', card(), null);
    storage.db
      .prepare('UPDATE characters SET current_checksum = NULL, import_origin_checksum = NULL')
      .run();

    expect((await storage.backfillChecksums()).characters).toBe(1);

    const row = storage.db
      .prepare('SELECT current_checksum, import_origin_checksum FROM characters WHERE id = ?')
      .get('char-old');
    expect(row.current_checksum).toBe(computeCharacterChecksum(card()));
    expect(row.import_origin_checksum).toBeNull();
  });

  it('leaves rows that already have a checksum alone', async () => {
    await storage.saveLorebook('lb-4', sparseLorebook());
    expect(await storage.backfillChecksums()).toEqual({ characters: 0, lorebooks: 0 });
  });
});

describe('storage checksum bookkeeping', () => {
  let tempDir;
  let storage;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checksum-storage-'));
    storage = new SqliteStorageService(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const checksumsFor = (id) =>
    storage.db
      .prepare(
        `SELECT import_origin_checksum, import_internal_checksum, current_checksum
         FROM characters WHERE id = ?`,
      )
      .get(id);

  it('records the origin checksum on import and derives the rest', async () => {
    await storage.saveCharacter('char-1', card(), null, { originChecksum: 'origin-abc' });

    const row = checksumsFor('char-1');
    expect(row.import_origin_checksum).toBe('origin-abc');
    expect(row.current_checksum).toBe(computeCharacterChecksum(card()));
    expect(row.import_internal_checksum).toBe(row.current_checksum);
  });

  it('leaves the import baselines frozen when the character is edited', async () => {
    await storage.saveCharacter('char-1', card(), null, { originChecksum: 'origin-abc' });
    const before = checksumsFor('char-1');

    const edited = card();
    edited.data.description = 'A knight, retired.';
    await storage.saveCharacter('char-1', edited, null);

    const after = checksumsFor('char-1');
    expect(after.import_origin_checksum).toBe('origin-abc');
    expect(after.import_internal_checksum).toBe(before.import_internal_checksum);
    // Only the current checksum moves — that difference is what "edited since
    // import" means everywhere else.
    expect(after.current_checksum).not.toBe(before.current_checksum);
  });

  it('does not let a later save resurrect an origin checksum', async () => {
    await storage.saveCharacter('char-1', card(), null);
    await storage.saveCharacter('char-1', card(), null, { originChecksum: 'sneaky' });
    expect(checksumsFor('char-1').import_origin_checksum).toBeNull();
  });

  it('finds an existing lorebook by content checksum', async () => {
    await storage.saveLorebook('lb-1', sparseLorebook({ name: "Alice's Lorebook" }));

    const match = storage.findLorebookByContentChecksum(
      computeLorebookChecksum(sparseLorebook({ name: "Bob's Lorebook" })),
    );
    expect(match).toMatchObject({ id: 'lb-1', name: "Alice's Lorebook" });
  });

  it('returns null when no lorebook matches', () => {
    expect(storage.findLorebookByContentChecksum('nope')).toBeNull();
  });
});

describe('resolveUniqueLorebookName', () => {
  let tempDir;
  let storage;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checksum-names-'));
    storage = new SqliteStorageService(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('leaves a free name alone', () => {
    expect(storage.resolveUniqueLorebookName('World Book')).toBe('World Book');
  });

  it('appends the next free suffix', async () => {
    await storage.saveLorebook('lb-1', sparseLorebook({ name: 'World Book' }));
    expect(storage.resolveUniqueLorebookName('World Book')).toBe('World Book (2)');

    await storage.saveLorebook('lb-2', sparseLorebook({ name: 'World Book (2)' }));
    expect(storage.resolveUniqueLorebookName('World Book')).toBe('World Book (3)');
  });

  it('falls back to a default for an empty name', () => {
    expect(storage.resolveUniqueLorebookName('')).toBe('Untitled Lorebook');
  });
});
