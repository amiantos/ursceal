<template>
  <section class="form-section">
    <h3 class="section-title">Lorebook Settings</h3>

    <div class="form-group">
      <label for="scanDepth">
        Scan Depth: {{ localSettings.scanDepth }} tokens
      </label>
      <input
        id="scanDepth"
        v-model.number="localSettings.scanDepth"
        type="range"
        min="500"
        max="4000"
        step="100"
        class="range-input"
      />
      <small class="help-text">How much of the story to scan for keywords</small>
    </div>

    <div class="form-group">
      <label for="tokenBudget">
        Token Budget: {{ localSettings.tokenBudget }} tokens
      </label>
      <input
        id="tokenBudget"
        v-model.number="localSettings.tokenBudget"
        type="range"
        min="500"
        max="4000"
        step="100"
        class="range-input"
      />
      <small class="help-text">Maximum tokens for lorebook content</small>
    </div>

    <div class="form-group">
      <label for="recursionDepth">
        Recursion Depth: {{ localSettings.recursionDepth }}
      </label>
      <input
        id="recursionDepth"
        v-model.number="localSettings.recursionDepth"
        type="range"
        min="0"
        max="5"
        step="1"
        class="range-input"
      />
      <small class="help-text">How many levels of cascading entries to allow</small>
    </div>

    <div class="form-group checkbox-group">
      <label>
        <input
          type="checkbox"
          v-model="localSettings.enableRecursion"
        />
        Enable recursive activation
      </label>
      <small class="help-text">Allow lorebook entries to trigger other entries</small>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
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
