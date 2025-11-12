<template>
  <Modal title="Import Lorebook" @close="$emit('close')">
    <div class="import-content">
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
        <button
          class="btn btn-primary full-width"
          :disabled="!selectedFile || importing"
          @click="importFromJSON"
        >
          <i class="fas fa-upload"></i>
          {{ importing ? 'Importing...' : 'Import JSON' }}
        </button>
      </section>
    </div>
  </Modal>
</template>

<script setup>
import { ref } from 'vue'
import Modal from './Modal.vue'
import { lorebooksAPI } from '../services/api'
import { useToast } from '../composables/useToast'

const emit = defineEmits(['close', 'imported'])
const toast = useToast()

const selectedFile = ref(null)
const fileInput = ref(null)
const importing = ref(false)

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
  }
}

async function importFromJSON() {
  if (!selectedFile.value || importing.value) return

  try {
    importing.value = true
    const result = await lorebooksAPI.importJSON(selectedFile.value)

    toast.success(`Successfully imported "${result.name}"!`)
    emit('imported', result)
    emit('close')
  } catch (error) {
    console.error('Failed to import lorebook:', error)
    toast.error('Failed to import lorebook: ' + error.message)
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

.full-width {
  width: 100%;
}
</style>
