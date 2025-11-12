<template>
  <Modal title="Import Character" @close="$emit('close')">
    <div class="import-content">
      <!-- Import from PNG -->
      <section class="import-section">
        <h3><i class="fas fa-image"></i> Import from PNG</h3>
        <p class="help-text">Upload a character card image (PNG format)</p>
        <input
          ref="fileInput"
          type="file"
          accept="image/png"
          @change="handleFileSelect"
          class="file-input"
        />
        <button
          class="btn btn-primary full-width"
          :disabled="!selectedFile || importing"
          @click="importFromPNG"
        >
          <i class="fas fa-upload"></i>
          {{ importing ? 'Importing...' : 'Import PNG' }}
        </button>
      </section>

      <div class="divider">
        <span>OR</span>
      </div>

      <!-- Import from URL -->
      <section class="import-section">
        <h3><i class="fas fa-link"></i> Import from URL</h3>
        <p class="help-text">Paste a character URL from CHUB</p>
        <input
          v-model="characterUrl"
          type="text"
          class="text-input"
          placeholder="https://chub.ai/characters/..."
          @keydown.enter="importFromURL"
        />
        <button
          class="btn btn-primary full-width"
          :disabled="!characterUrl.trim() || importing"
          @click="importFromURL"
        >
          <i class="fas fa-download"></i>
          {{ importing ? 'Importing...' : 'Import from URL' }}
        </button>
        <small class="hint">Supported: chub.ai</small>
      </section>
    </div>
  </Modal>
</template>

<script setup>
import { ref } from 'vue'
import Modal from './Modal.vue'
import { charactersAPI } from '../services/api'

const emit = defineEmits(['close', 'imported'])

const selectedFile = ref(null)
const fileInput = ref(null)
const characterUrl = ref('')
const importing = ref(false)

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
  }
}

async function importFromPNG() {
  if (!selectedFile.value || importing.value) return

  try {
    importing.value = true
    const result = await charactersAPI.importPNG(selectedFile.value)

    alert(`Successfully imported "${result.name}"!`)
    emit('imported', result)
    emit('close')
  } catch (error) {
    console.error('Failed to import PNG:', error)
    alert('Failed to import character: ' + error.message)
  } finally {
    importing.value = false
  }
}

async function importFromURL() {
  if (!characterUrl.value.trim() || importing.value) return

  try {
    importing.value = true
    const result = await charactersAPI.importFromURL(characterUrl.value.trim())

    alert(`Successfully imported "${result.name}"!`)
    emit('imported', result)
    emit('close')
  } catch (error) {
    console.error('Failed to import from URL:', error)
    alert('Failed to import character: ' + error.message)
  } finally {
    importing.value = false
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
