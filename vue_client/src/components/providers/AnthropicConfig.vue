<template>
  <BaseProviderConfig
    :config="config"
    @update:config="$emit('update:config', $event)"
    :context-range="{ min: 32000, max: 200000 }"
    :context-help-text="`Context window size (32k-200k tokens). Claude 3.5 Sonnet supports up to 200k tokens.`"
  >
    <template #api-config>
      <div class="form-group">
        <label for="apiKey">API Key *</label>
        <input
          id="apiKey"
          v-model="localApiConfig.apiKey"
          type="password"
          class="text-input"
          placeholder="sk-ant-..."
        />
        <small class="help-text">Get your API key from https://console.anthropic.com</small>
      </div>

      <div v-if="showAdvancedApiConfig" class="form-group">
        <label for="baseURL">Base URL</label>
        <input
          id="baseURL"
          v-model="localApiConfig.baseURL"
          type="text"
          class="text-input"
          placeholder="https://api.anthropic.com/v1"
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
          placeholder="claude-3-5-sonnet-20241022"
        />
        <small class="help-text">Default: claude-3-5-sonnet-20241022 (or claude-3-opus, claude-3-haiku)</small>
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
