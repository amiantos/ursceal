<template>
  <Modal title="Rename Story" :close-on-overlay-click="false" @close="$emit('close')">
    <div class="rename-content">
      <div class="form-group">
        <label for="storyTitle">Story Title *</label>
        <input
          id="storyTitle"
          ref="titleInput"
          v-model="storyTitle"
          type="text"
          class="text-input"
          placeholder="Enter story title..."
          @keydown.enter="renameStory"
        />
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="$emit('close')">
        Cancel
      </button>
      <button
        class="btn btn-primary"
        :disabled="!storyTitle.trim() || renaming"
        @click="renameStory"
      >
        <i class="fas fa-save"></i>
        {{ renaming ? 'Saving...' : 'Rename' }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Modal from './Modal.vue'
import { storiesAPI } from '../services/api'
import { useToast } from '../composables/useToast'

const props = defineProps({
  story: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'updated'])

const toast = useToast()
const storyTitle = ref(props.story.title || '')
const renaming = ref(false)
const titleInput = ref(null)

onMounted(() => {
  // Focus title input when modal opens
  if (titleInput.value) {
    titleInput.value.focus()
    // Select all text for easy overwriting
    titleInput.value.select()
  }
})

async function renameStory() {
  if (!storyTitle.value.trim() || renaming.value) return

  try {
    renaming.value = true

    await storiesAPI.updateMetadata(props.story.id, {
      title: storyTitle.value.trim()
    })

    toast.success('Story renamed successfully')
    emit('updated')
    emit('close')
  } catch (error) {
    console.error('Failed to rename story:', error)
    toast.error('Failed to rename story: ' + error.message)
  } finally {
    renaming.value = false
  }
}
</script>

<style scoped>
.rename-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary);
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
  line-height: 1.5;
  outline: none;
}

.text-input:focus {
  border-color: var(--accent-primary);
}
</style>
