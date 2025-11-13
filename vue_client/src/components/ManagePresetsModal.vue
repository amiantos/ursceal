<template>
  <Modal title="Manage Configuration Presets" maxWidth="900px" @close="$emit('close')">
    <!-- Header Actions -->
    <div class="header-actions">
      <button class="btn btn-primary" @click="createNewPreset">
        <i class="fas fa-plus"></i>
        Create New Preset
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading presets...</p>
    </div>

    <!-- Presets List -->
    <div v-else-if="presets.length > 0" class="presets-list">
      <div v-for="preset in presets" :key="preset.id" class="preset-item">
        <div class="preset-info">
          <div class="preset-header">
            <h3 class="preset-name">{{ preset.name }}</h3>
            <span class="preset-provider-badge" :class="`provider-${preset.provider}`">
              {{ getProviderDisplayName(preset.provider) }}
            </span>
            <span v-if="preset.id === defaultPresetId" class="default-badge">
              <i class="fas fa-star"></i> Default
            </span>
          </div>
        </div>
        <div class="preset-actions">
          <button
            class="btn btn-small btn-secondary"
            @click="editPreset(preset)"
            :disabled="actionInProgress === preset.id"
          >
            <i class="fas fa-edit"></i>
            Edit
          </button>
          <button
            v-if="preset.id !== defaultPresetId"
            class="btn btn-small btn-primary"
            @click="setAsDefault(preset.id)"
            :disabled="actionInProgress === preset.id"
          >
            <i class="fas fa-star"></i>
            Set Default
          </button>
          <button
            class="btn btn-small btn-secondary"
            @click="duplicatePreset(preset)"
            :disabled="actionInProgress === preset.id"
          >
            <i class="fas fa-copy"></i>
            Duplicate
          </button>
          <button
            class="btn btn-small btn-danger"
            @click="deletePreset(preset)"
            :disabled="actionInProgress === preset.id || preset.id === defaultPresetId"
            :title="preset.id === defaultPresetId ? 'Cannot delete default preset' : ''"
          >
            <i class="fas fa-trash"></i>
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <i class="fas fa-cog"></i>
      <p>No presets available</p>
      <button class="btn btn-primary" @click="createNewPreset">
        <i class="fas fa-plus"></i>
        Create First Preset
      </button>
    </div>

    <!-- Preset Editor Modal -->
    <PresetEditorModal
      v-if="showEditor"
      :preset="editingPreset"
      @close="closeEditor"
      @saved="handlePresetSaved"
    />
  </Modal>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Modal from './Modal.vue'
import PresetEditorModal from './PresetEditorModal.vue'
import { presetsAPI } from '../services/api'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'

const emit = defineEmits(['close', 'updated'])

const toast = useToast()
const confirm = useConfirm()
const loading = ref(true)
const presets = ref([])
const defaultPresetId = ref(null)
const actionInProgress = ref(null)
const showEditor = ref(false)
const editingPreset = ref(null)

onMounted(async () => {
  await loadPresets()
})

async function loadPresets() {
  try {
    loading.value = true
    const [presetsData, defaultData] = await Promise.all([
      presetsAPI.list(),
      presetsAPI.getDefaultId()
    ])
    presets.value = presetsData.presets || []
    defaultPresetId.value = defaultData.defaultPresetId
  } catch (error) {
    console.error('Failed to load presets:', error)
    toast.error('Failed to load presets: ' + error.message)
  } finally {
    loading.value = false
  }
}

function getProviderDisplayName(provider) {
  const names = {
    deepseek: 'DeepSeek',
    aihorde: 'AI Horde',
    openai: 'OpenAI',
    anthropic: 'Claude',
    openrouter: 'OpenRouter'
  }
  return names[provider] || provider
}

function createNewPreset() {
  editingPreset.value = null
  showEditor.value = true
}

function editPreset(preset) {
  editingPreset.value = preset
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  editingPreset.value = null
}

async function handlePresetSaved() {
  closeEditor()
  await loadPresets()
  emit('updated')
  toast.success('Preset saved successfully')
}

async function setAsDefault(presetId) {
  try {
    actionInProgress.value = presetId
    await presetsAPI.setDefaultId(presetId)
    defaultPresetId.value = presetId
    toast.success('Default preset updated')
    emit('updated')
  } catch (error) {
    console.error('Failed to set default preset:', error)
    toast.error('Failed to set default preset: ' + error.message)
  } finally {
    actionInProgress.value = null
  }
}

async function duplicatePreset(preset) {
  try {
    actionInProgress.value = preset.id

    // Load full preset data
    const { preset: fullPreset } = await presetsAPI.get(preset.id)

    // Create duplicate with new name
    const duplicateData = {
      ...fullPreset,
      name: `${fullPreset.name} (Copy)`
    }
    delete duplicateData.id

    await presetsAPI.create(duplicateData)
    await loadPresets()
    toast.success('Preset duplicated successfully')
    emit('updated')
  } catch (error) {
    console.error('Failed to duplicate preset:', error)
    toast.error('Failed to duplicate preset: ' + error.message)
  } finally {
    actionInProgress.value = null
  }
}

async function deletePreset(preset) {
  if (preset.id === defaultPresetId.value) {
    toast.error('Cannot delete the default preset')
    return
  }

  const confirmed = await confirm(
    `Are you sure you want to delete "${preset.name}"?`,
    'This action cannot be undone.'
  )

  if (!confirmed) return

  try {
    actionInProgress.value = preset.id
    await presetsAPI.delete(preset.id)
    await loadPresets()
    toast.success('Preset deleted successfully')
    emit('updated')
  } catch (error) {
    console.error('Failed to delete preset:', error)
    toast.error('Failed to delete preset: ' + error.message)
  } finally {
    actionInProgress.value = null
  }
}
</script>

<style scoped>
.header-actions {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.loading-container {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.presets-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preset-item {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
  background-color: var(--bg-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.preset-info {
  flex: 1;
  min-width: 0;
}

.preset-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.preset-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.preset-provider-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.provider-deepseek {
  background-color: #e3f2fd;
  color: #1976d2;
}

.provider-aihorde {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.provider-openai {
  background-color: #e8f5e9;
  color: #388e3c;
}

.provider-anthropic {
  background-color: #fff3e0;
  color: #f57c00;
}

.provider-openrouter {
  background-color: #fce4ec;
  color: #c2185b;
}

.default-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  background-color: #fff3cd;
  color: #856404;
}

.preset-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-small {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}

.btn-primary {
  background-color: var(--accent-primary);
  color: var(--text-on-accent);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-secondary {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--bg-quaternary);
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
