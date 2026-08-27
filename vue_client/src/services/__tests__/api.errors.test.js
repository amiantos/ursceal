import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { charactersAPI } from '../api.js';

/** A failed fetch Response carrying a JSON error body. */
function jsonErrorResponse(status, body) {
  return {
    ok: false,
    status,
    statusText: 'Conflict',
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

describe('api error bodies', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('carries server-supplied fields onto the thrown error', async () => {
    // A duplicate import needs to tell the caller which character it collided
    // with, not just that something failed.
    fetch.mockResolvedValue(
      jsonErrorResponse(409, {
        error: '"Alice" has already been imported from this card.',
        existingCharacterId: 'char-1',
        existingCharacterName: 'Alice',
      }),
    );

    const error = await charactersAPI.get('anything').catch((e) => e);

    expect(error.message).toBe('"Alice" has already been imported from this card.');
    expect(error.status).toBe(409);
    expect(error.existingCharacterId).toBe('char-1');
    expect(error.existingCharacterName).toBe('Alice');
  });

  it('falls back to the status text when the body has no error field', async () => {
    fetch.mockResolvedValue(jsonErrorResponse(409, {}));

    const error = await charactersAPI.get('anything').catch((e) => e);
    expect(error.message).toContain('Conflict');
  });

  it('survives a body that is not JSON', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: () => 'text/html' },
      json: async () => {
        throw new Error('not json');
      },
    });

    const error = await charactersAPI.get('anything').catch((e) => e);
    expect(error.message).toContain('Internal Server Error');
  });
});
