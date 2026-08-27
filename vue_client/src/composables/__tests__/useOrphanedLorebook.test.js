import { describe, it, expect, beforeEach, vi } from 'vitest';

const deleteLorebook = vi.fn();
const confirm = vi.fn();
const removeLorebookLocally = vi.fn();
const toast = { success: vi.fn(), error: vi.fn() };

vi.mock('../../services/api', () => ({
  lorebooksAPI: { delete: (...args) => deleteLorebook(...args) },
}));
vi.mock('../useConfirm', () => ({ useConfirm: () => ({ confirm }) }));
vi.mock('../useToast', () => ({ useToast: () => toast }));
vi.mock('../useDataCache', () => ({ useDataCache: () => ({ removeLorebookLocally }) }));

const { useOrphanedLorebook } = await import('../useOrphanedLorebook.js');

describe('useOrphanedLorebook', () => {
  const orphan = { id: 'lb-1', name: "Alice's Lorebook" };
  let offerToDeleteOrphanedLorebook;

  beforeEach(() => {
    vi.clearAllMocks();
    ({ offerToDeleteOrphanedLorebook } = useOrphanedLorebook());
  });

  it('does nothing when the delete stranded no lorebook', async () => {
    await offerToDeleteOrphanedLorebook(undefined);
    expect(confirm).not.toHaveBeenCalled();
    expect(deleteLorebook).not.toHaveBeenCalled();
  });

  it('names the lorebook in the prompt', async () => {
    confirm.mockResolvedValue(false);
    await offerToDeleteOrphanedLorebook(orphan);

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Alice's Lorebook") }),
    );
  });

  it('keeps the lorebook when the user declines', async () => {
    confirm.mockResolvedValue(false);
    await offerToDeleteOrphanedLorebook(orphan);

    expect(deleteLorebook).not.toHaveBeenCalled();
    expect(removeLorebookLocally).not.toHaveBeenCalled();
  });

  it('deletes and drops it from the cache when the user accepts', async () => {
    confirm.mockResolvedValue(true);
    deleteLorebook.mockResolvedValue({ success: true });

    await offerToDeleteOrphanedLorebook(orphan);

    expect(deleteLorebook).toHaveBeenCalledWith('lb-1');
    expect(removeLorebookLocally).toHaveBeenCalledWith('lb-1');
    expect(toast.success).toHaveBeenCalled();
  });

  it('reports a failed delete without dropping it from the cache', async () => {
    confirm.mockResolvedValue(true);
    deleteLorebook.mockRejectedValue(new Error('nope'));

    await offerToDeleteOrphanedLorebook(orphan);

    expect(removeLorebookLocally).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('nope'));
  });
});
