<template>
  <BaseProviderConfig
    :config="config"
    @update:config="$emit('update:config', $event)"
    :context-range="{ min: 8000, max: 128000 }"
    :context-help-text="`Context window size (8k-128k tokens). Varies by model: GPT-4 Turbo (128k), GPT-4 (8k), GPT-3.5 Turbo (16k).`"
  >
    <template #api-config>
      <div class="form-group">
        <label for="apiKey">API Key *</label>
        <input
          id="apiKey"
          v-model="localApiConfig.apiKey"
          type="password"
          class="text-input"
          placeholder="sk-..."
        />
        <small class="help-text">Get your API key from https://platform.openai.com</small>
      </div>

      <div v-if="showAdvancedApiConfig" class="form-group">
        <label for="baseURL">Base URL</label>
        <input
          id="baseURL"
          v-model="localApiConfig.baseURL"
          type="text"
          class="text-input"
          placeholder="https://api.openai.com/v1"
        />
        <small class="help-text">Leave empty to use default</small>
      </div>

      <div class="form-group">
        <label for="model">Model</label>
        <input
          id="model"
          v-model="localApiConfig.model"
          type="text"
          class="text-input"
          placeholder="gpt-4-turbo-preview"
        />
        <small class="help-text">Default: gpt-4-turbo-preview (or gpt-4, gpt-3.5-turbo)</small>
      </div>

      <button
        type="button"
        class="btn-link"
        @click="showAdvancedApiConfig = !showAdvancedApiConfig"
      >
        {{ showAdvancedApiConfig ? 'Hide' : 'Show' }} Advanced API Options
      </button>
    </template>
  </BaseProviderConfig>
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseProviderConfig from './shared/BaseProviderConfig.vue'

const props = defineProps({
  config: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:config'])

const showAdvancedApiConfig = ref(false)

// Local computed for API config
const localApiConfig = computed({
  get() {
    return props.config.apiConfig || {}
  },
  set(value) {
    emit('update:config', { ...props.config, apiConfig: value })
  }
})
</script>

<style scoped>
.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.text-input {
  width: 100%;
  padding: 0.6rem;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.95rem;
  font-family: inherit;
}

.text-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.help-text {
  display: block;
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.btn-link {
  background: none;
  border: none;
  color: var(--accent-primary);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.5rem 0;
  text-decoration: underline;
}

.btn-link:hover {
  opacity: 0.8;
}
</style>
