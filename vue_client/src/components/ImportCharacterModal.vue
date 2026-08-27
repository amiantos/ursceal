<template>
  <Modal title="Import Character" @close="$emit('close')">
    <div class="import-content">
      <!-- Import from a file: character card images and JSON are the same
           pick-a-file action, so they share one section -->
      <section class="import-section">
        <h3><i class="fas fa-folder-open"></i> Import from File</h3>
        <p class="help-text">Choose a character card image or JSON file</p>
        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif,.json,application/json"
          @change="handleFileSelect"
          class="file-input"
        />
        <ImportProgress v-if="importing === 'file'" :progress="imageProgress" />
        <button
          class="btn btn-primary full-width"
          :disabled="!selectedFile || !!importing"
          @click="importFromFile"
        >
          <i :class="importing === 'file' ? 'fas fa-spinner fa-spin' : 'fas fa-upload'"></i>
          {{ importing === 'file' ? importStatusLabel : 'Import from File' }}
        </button>
      </section>

      <div class="divider">
        <span>OR</span>
      </div>

      <!-- Import from URL -->
      <section class="import-section">
        <h3><i class="fas fa-link"></i> Import from URL</h3>
        <p class="help-text">
          Paste a character URL from CHUB or a direct image URL (PNG, JPEG, WebP)
        </p>
        <input
          v-model="characterUrl"
          type="text"
          class="text-input"
          placeholder="https://chub.ai/characters/... or https://example.com/character.png"
          @keydown.enter="importFromURL"
        />
        <ImportProgress v-if="importing === 'url'" :progress="imageProgress" />
        <button
          class="btn btn-primary full-width"
          :disabled="!characterUrl.trim() || !!importing"
          @click="importFromURL"
        >
          <i :class="importing === 'url' ? 'fas fa-spinner fa-spin' : 'fas fa-download'"></i>
          {{ importing === 'url' ? importStatusLabel : 'Import from URL' }}
        </button>
        <small class="hint">Supported: chub.ai, direct image URLs (PNG, JPEG, WebP)</small>
      </section>
    </div>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue';
import Modal from './Modal.vue';
import ImportProgress from './ImportProgress.vue';
import { charactersAPI } from '../services/api';
import { useToast } from '../composables/useToast';

const emit = defineEmits(['close', 'imported']);
const toast = useToast();

const selectedFile = ref(null);
const fileInput = ref(null);
const characterUrl = ref('');
const importing = ref(null); // null | 'file' | 'url'

// Image caching progress for the active import.
//
// One import can cache more than one set of images: a CHUB character with an
// embedded lorebook caches the card first, then the lorebook (often the larger
// set). Each set arrives as its own start/image/done sequence, so totals are
// accumulated rather than replaced — otherwise the bar would jump backwards
// when the lorebook stage begins.
const imageProgress = ref(null); // null | { completed, total, failed, stage }

function handleImportProgress(event) {
  if (event.phase === 'start') {
    const prev = imageProgress.value;
    imageProgress.value = {
      completed: prev?.completed ?? 0,
      total: (prev?.total ?? 0) + event.total,
      failed: prev?.failed ?? 0,
      stage: event.entityType === 'lorebooks' ? 'lorebook' : 'character',
    };
  } else if (event.phase === 'image' && imageProgress.value) {
    const p = imageProgress.value;
    imageProgress.value = {
      ...p,
      completed: p.completed + 1,
      failed: p.failed + (event.ok ? 0 : 1),
    };
  }
}

function resetImportState() {
  importing.value = null;
  imageProgress.value = null;
}

/** "Caching lorebook images 12/30" — plain label before any image work. */
const importStatusLabel = computed(() => {
  const p = imageProgress.value;
  if (!p || !p.total) return 'Importing...';
  const what = p.stage === 'lorebook' ? 'lorebook images' : 'images';
  return `Caching ${what} ${p.completed}/${p.total}`;
});

/** Tell the user when some images could not be fetched — import still works. */
function reportImportResult(name) {
  const p = imageProgress.value;
  if (p && p.failed > 0) {
    toast.warning(
      `Imported "${name}" — ${p.failed} of ${p.total} image(s) could not be cached and still point at their original host`,
    );
    return;
  }
  toast.success(`Successfully imported "${name}"!`);
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
  }
}

/**
 * A card already in the library is not a failure — say so plainly instead of
 * wrapping "already imported" in "Failed to import character:".
 */
function reportImportError(error) {
  console.error('Failed to import character:', error);
  if (error.existingCharacterId) {
    toast.info(error.message);
    return;
  }
  toast.error('Failed to import character: ' + error.message);
}

async function importFromURL() {
  if (!characterUrl.value.trim() || importing.value) return;

  try {
    importing.value = 'url';
    const result = await charactersAPI.importFromURL(
      characterUrl.value.trim(),
      handleImportProgress,
    );

    reportImportResult(result.name);
    emit('imported', result);
    emit('close');
  } catch (error) {
    reportImportError(error);
  } finally {
    resetImportState();
  }
}

async function importFromFile() {
  if (!selectedFile.value || importing.value) return;

  try {
    importing.value = 'file';

    // Card images and card JSON are the same action to the user; the file
    // type decides which endpoint handles it.
    const file = selectedFile.value;
    const isImage =
      file.type.startsWith('image/') || /\.(png|jpg|jpeg|webp|avif)$/i.test(file.name);

    const result = isImage
      ? await charactersAPI.importPNG(file, handleImportProgress)
      : await charactersAPI.importJSON(file, handleImportProgress);

    reportImportResult(result.name);
    emit('imported', result);
    emit('close');
  } catch (error) {
    reportImportError(error);
  } finally {
    resetImportState();
  }
}
</script>

<style scoped>
.import-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.import-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.import-section h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.help-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.file-input {
  padding: 0.75rem;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
}

.file-input:hover {
  border-color: var(--accent-primary);
}

.text-input {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: inherit;
  font-size: 1rem;
  outline: none;
}

.text-input:focus {
  border-color: var(--accent-primary);
}

.full-width {
  width: 100%;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 0.5rem 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border-color);
}

.divider span {
  padding: 0 1rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
}

.hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-style: italic;
}
</style>
