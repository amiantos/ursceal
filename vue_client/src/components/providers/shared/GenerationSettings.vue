<template>
  <section class="form-section">
    <h3 class="section-title">Generation Settings</h3>

    <div class="form-group">
      <label for="maxTokens">
        Max Tokens: {{ localSettings.maxTokens }}
      </label>
      <input
        id="maxTokens"
        v-model.number="localSettings.maxTokens"
        type="range"
        min="100"
        max="8000"
        step="100"
        class="range-input"
      />
      <small class="help-text">Maximum tokens to generate (100-8000)</small>
    </div>

    <div class="form-group">
      <label for="temperature">
        Temperature: {{ localSettings.temperature.toFixed(2) }}
      </label>
      <input
        id="temperature"
        v-model.number="localSettings.temperature"
        type="range"
        min="0"
        max="2"
        step="0.05"
        class="range-input"
      />
      <small class="help-text">Creativity/randomness (0 = focused, 2 = creative)</small>
    </div>

    <!-- Max Context Tokens - optional for providers that support it -->
    <div v-if="showMaxContext" class="form-group">
      <label for="maxContextTokens">
        Max Context Tokens: {{ (localSettings.maxContextTokens / 1000).toFixed(0) }}k
      </label>
      <input
        id="maxContextTokens"
        v-model.number="localSettings.maxContextTokens"
        type="range"
        :min="contextRange.min"
        :max="contextRange.max"
        step="1000"
        class="range-input"
      />
      <small class="help-text">
        {{ contextHelpText }}
      </small>
    </div>

    <div class="form-group checkbox-group">
      <label>
        <input
          type="checkbox"
          v-model="localSettings.includeDialogueExamples"
        />
        Include dialogue examples from character cards
      </label>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  showMaxContext: {
    type: Boolean,
    default: true
  },
  contextRange: {
    type: Object,
    default: () => ({ min: 32000, max: 128000 })
  },
  contextHelpText: {
    type: String,
    default: 'Context window size (32k-128k tokens). Larger = more story content but higher costs.'
  }
})

const emit = defineEmits(['update:modelValue'])

const localSettings = computed({
  get() {
    return props.modelValue || {}
  },
  set(value) {
    emit('update:modelValue', value)
  }
})
</script>

<style scoped>
.form-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border-color);
}

.form-section:last-child {
  border-bottom: none;
}

.section-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: normal;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.range-input {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--border-color);
  outline: none;
}

.range-input::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-primary);
  cursor: pointer;
}

.range-input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-primary);
  cursor: pointer;
  border: none;
}

.help-text {
  display: block;
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
</style>
