<template>
  <Modal title="Import Lorebook" @close="$emit('close')">
    <div class="import-content">
      <!-- Import from JSON File -->
      <section class="import-section">
        <h3><i class="fas fa-file-code"></i> Import from JSON</h3>
        <p class="help-text">Upload a lorebook JSON file</p>
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          @change="handleFileSelect"
          class="file-input"
        />
        <ImportProgress v-if="importing === 'json'" :progress="imageProgress" />
        <button
          class="btn btn-primary full-width"
          :disabled="!selectedFile || !!importing"
          @click="importFromJSON"
        >
          <i :class="importing === 'json' ? 'fas fa-spinner fa-spin' : 'fas fa-upload'"></i>
          {{ importing === 'json' ? importStatusLabel : 'Import JSON' }}
        </button>
      </section>

      <div class="divider">
        <span>OR</span>
      </div>

      <!-- Import from URL -->
      <section class="import-section">
        <h3><i class="fas fa-link"></i> Import from URL</h3>
        <p class="help-text">Paste a URL to a lorebook JSON file</p>
        <input
          v-model="lorebookUrl"
          type="text"
          class="text-input"
          placeholder="https://example.com/lorebook.json"
          @keydown.enter="importFromURL"
        />
        <ImportProgress v-if="importing === 'url'" :progress="imageProgress" />
        <button
          class="btn btn-primary full-width"
          :disabled="!lorebookUrl.trim() || !!importing"
          @click="importFromURL"
        >
          <i :class="importing === 'url' ? 'fas fa-spinner fa-spin' : 'fas fa-download'"></i>
          {{ importing === 'url' ? importStatusLabel : 'Import from URL' }}
        </button>
      </section>
    </div>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue';
import Modal from './Modal.vue';
import ImportProgress from './ImportProgress.vue';
import { lorebooksAPI } from '../services/api';
import { useToast } from '../composables/useToast';

const emit = defineEmits(['close', 'imported']);
const toast = useToast();

const selectedFile = ref(null);
const fileInput = ref(null);
const lorebookUrl = ref('');
const importing = ref(null); // null | 'json' | 'url'

// Lorebook entries carry images too, and a large lorebook can take a while.
const imageProgress = ref(null);

const importStatusLabel = computed(() => {
  const p = imageProgress.value;
  if (!p || !p.total) return 'Importing...';
  return `Caching images ${p.completed}/${p.total}`;
});

function handleImportProgress(event) {
  if (event.phase === 'start') {
    imageProgress.value = { completed: 0, total: event.total, failed: 0, stage: 'lorebook' };
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

async function importFromJSON() {
  if (!selectedFile.value || importing.value) return;

  try {
    importing.value = 'json';
    const result = await lorebooksAPI.importJSON(selectedFile.value, handleImportProgress);

    reportImportResult(result.name);
    emit('imported', result);
    emit('close');
  } catch (error) {
    reportImportError(error);
  } finally {
    resetImportState();
  }
}

/**
 * A lorebook already in the library is not a failure — say so plainly instead
 * of wrapping "already imported" in "Failed to import lorebook:".
 */
function reportImportError(error) {
  console.error('Failed to import lorebook:', error);
  if (error.existingLorebookId) {
    toast.info(error.message);
    return;
  }
  toast.error('Failed to import lorebook: ' + error.message);
}

async function importFromURL() {
  if (!lorebookUrl.value.trim() || importing.value) return;

  try {
    importing.value = 'url';
    const result = await lorebooksAPI.importFromURL(lorebookUrl.value.trim(), handleImportProgress);

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
</style>
