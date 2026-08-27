/**
 * Checksum Service
 *
 * Computes SHA-256 checksums over canonical representations of characters and
 * lorebooks, used for duplicate detection on import and for telling whether an
 * entity has been edited since it was imported.
 *
 * The one invariant everything here rests on: **a checksum must not depend on
 * where the data came from.** The same content has to hash identically whether
 * it just came off a parser, was read back out of SQLite, or was rebuilt by the
 * v9 backfill. SQLite applies defaults on write (`description || ''`,
 * `constant ? 1 : 0`, `scanDepth ?? null`, ...), so a parsed lorebook and the
 * same lorebook read back out are *not* the same object shape.
 *
 * The fix is to normalize before hashing, and to make normalization total:
 * every hashed field is always present with a defaulted value, mirroring the
 * defaults in sqliteStorage.js. `undefined`, `null`, missing, and `''` all
 * collapse to one representation, so shape can't leak into the digest.
 *
 * If you add a field to sqliteStorage's insert/update defaults, add it here too.
 */

import crypto from 'crypto';

// ─── Coercion helpers (total: every input maps to one canonical output) ──────

const str = (v) => (v === undefined || v === null ? '' : String(v));
const arr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/**
 * Deterministic JSON serialization: object keys sorted, `undefined` written as
 * `null` so a missing key and an explicitly-undefined key can't diverge.
 *
 * This stays a dumb, total serializer on purpose — deciding *which* fields
 * count is the normalizers' job, so there's exactly one place to look.
 */
export function canonicalStringify(value, seen = new Set()) {
  if (value === undefined || value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value !== 'object') return JSON.stringify(String(value));

  if (seen.has(value)) {
    throw new TypeError('Converting circular structure to JSON');
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return '[' + value.map((v) => canonicalStringify(v, seen)).join(',') + ']';
    }
    const pairs = Object.keys(value)
      .toSorted()
      .map((key) => JSON.stringify(key) + ':' + canonicalStringify(value[key], seen));
    return '{' + pairs.join(',') + '}';
  } finally {
    seen.delete(value);
  }
}

function digest(normalized) {
  return crypto.createHash('sha256').update(canonicalStringify(normalized), 'utf8').digest('hex');
}

// ─── Characters ──────────────────────────────────────────────────────────────

/** Card fields that make up a character's identity, as plain strings. */
const CHAR_STRING_FIELDS = [
  'name',
  'description',
  'personality',
  'scenario',
  'first_mes',
  'mes_example',
  'system_prompt',
  'post_history_instructions',
  'creator',
  'creator_notes',
  'character_version',
];

/** Card fields that are lists of strings. */
const CHAR_ARRAY_FIELDS = ['tags', 'alternate_greetings'];

/**
 * `extensions` keys that belong to the card. Everything else — most importantly
 * `ursceal_lorebook_id` — is a local association we added, not card content,
 * and is excluded so linking a lorebook doesn't read as "the card changed".
 */
const CHAR_EXTENSION_FIELDS = ['depth_prompt', 'talkativeness', 'fav', 'avatar'];

/**
 * Reduce a character card to the canonical object that gets hashed.
 *
 * `character_book` is deliberately excluded: an embedded lorebook is extracted
 * into the lorebook library on import and deduplicated by its own checksum, so
 * hashing it here would double-count it.
 *
 * @param {Object} cardData - A V2 card (`{ data: {...} }`) or a bare data object.
 * @returns {Object} Canonical, fully-defaulted representation.
 */
export function normalizeCharacterForChecksum(cardData) {
  const data = obj(obj(cardData).data ?? cardData);

  const normalized = {};
  for (const field of CHAR_STRING_FIELDS) {
    normalized[field] = str(data[field]);
  }
  for (const field of CHAR_ARRAY_FIELDS) {
    normalized[field] = arr(data[field]).map(str);
  }

  const extensions = obj(data.extensions);
  const normalizedExtensions = {};
  for (const field of CHAR_EXTENSION_FIELDS) {
    normalizedExtensions[field] = extensions[field] ?? null;
  }
  normalized.extensions = normalizedExtensions;

  return normalized;
}

/**
 * Hash a character card.
 *
 * The same function computes all three stored checksums — they differ only in
 * *when* they're taken:
 *   - `import_origin_checksum`   — before image URLs are rewritten to local paths
 *   - `import_internal_checksum` — right after import finishes (frozen from then on)
 *   - `current_checksum`         — the latest saved state
 *
 * @param {Object} cardData - Character card.
 * @returns {string} Hex SHA-256 digest.
 */
export function computeCharacterChecksum(cardData) {
  return digest(normalizeCharacterForChecksum(cardData));
}

// ─── Lorebooks ───────────────────────────────────────────────────────────────

/**
 * Extension keys stripped before hashing. SillyTavern stamps these into
 * exports, so leaving them in would make two exports of the same lorebook hash
 * differently and defeat deduplication.
 */
const LOREBOOK_EXTENSION_NOISE = new Set(['id', 'create_date']);

/**
 * Normalize one lorebook entry. Defaults mirror `insertLorebookEntry` in
 * sqliteStorage.js exactly.
 *
 * `id` and `displayIndex` are excluded: both are storage artifacts (a SQLite
 * rowid and a sort column), not content.
 */
function normalizeEntryForChecksum(entry) {
  const e = obj(entry);
  return {
    keys: arr(e.keys).map(str),
    secondaryKeys: arr(e.secondaryKeys).map(str),
    content: str(e.content),
    comment: str(e.comment),
    enabled: !!e.enabled,
    constant: !!e.constant,
    selective: !!e.selective,
    selectiveLogic: e.selectiveLogic ?? 0,
    insertionOrder: e.insertionOrder ?? 0,
    position: e.position ?? 0,
    caseSensitive: !!e.caseSensitive,
    matchWholeWords: !!e.matchWholeWords,
    useRegex: !!e.useRegex,
    probability: e.probability ?? 100,
    useProbability: !!e.useProbability,
    depth: e.depth ?? 0,
    scanDepth: e.scanDepth ?? null,
    group: str(e.group),
    preventRecursion: !!e.preventRecursion,
    delayUntilRecursion: !!e.delayUntilRecursion,
    extensions: obj(e.extensions),
  };
}

/**
 * Reduce a lorebook to the canonical object that gets hashed. Scalar defaults
 * mirror `insertLorebook`/`updateLorebook` in sqliteStorage.js.
 *
 * `name` and `description` are deliberately **excluded**. A lorebook's identity
 * is its entries and scan settings, not its label — and for the case this whole
 * feature exists to fix, the label is worthless: an embedded lorebook is renamed
 * after the character that carried it (`"Alice's Lorebook"`, `"Bob's Lorebook"`),
 * so two characters shipping the same world book would never match if the name
 * were hashed.
 *
 * Entries are sorted by their own canonical serialization rather than kept in
 * array order. `getLorebookEntries` reads back `ORDER BY display_index`, and
 * display_index is not guaranteed unique, so array order is not stable across a
 * round-trip — sorting by content makes the digest independent of it.
 *
 * @param {Object} lorebookData - Parsed or read-back lorebook.
 * @returns {Object} Canonical, fully-defaulted representation.
 */
export function normalizeLorebookForChecksum(lorebookData) {
  const lb = obj(lorebookData);

  const sourceExtensions = obj(lb.extensions);
  const extensions = {};
  for (const key of Object.keys(sourceExtensions)) {
    if (!LOREBOOK_EXTENSION_NOISE.has(key)) {
      extensions[key] = sourceExtensions[key];
    }
  }

  const entries = arr(lb.entries)
    .map(normalizeEntryForChecksum)
    .toSorted((a, b) => {
      const left = canonicalStringify(a);
      const right = canonicalStringify(b);
      return left < right ? -1 : left > right ? 1 : 0;
    });

  return {
    scanDepth: lb.scanDepth ?? null,
    tokenBudget: lb.tokenBudget ?? null,
    recursiveScanning: !!lb.recursiveScanning,
    extensions,
    entries,
  };
}

/**
 * Hash a lorebook.
 *
 * @param {Object} lorebookData - Parsed or read-back lorebook.
 * @returns {string} Hex SHA-256 digest.
 */
export function computeLorebookChecksum(lorebookData) {
  return digest(normalizeLorebookForChecksum(lorebookData));
}
