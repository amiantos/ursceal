<template>
  <div>
    <section v-if="showTemplates" class="form-section">
      <h3 class="section-title">Prompt Templates (Advanced)</h3>
      <p class="section-description">
        Customize the instructions sent to the AI. Use <code v-text="'{{char}}'"></code>,
        <code v-text="'{{instruction}}'"></code>, and <code v-text="'{{storyContent}}'"></code> as placeholders.
      </p>

      <div class="form-group">
        <label for="templateContinue">Continue Template</label>
        <textarea
          id="templateContinue"
          v-model="localTemplates.continue"
          class="textarea-input"
          rows="3"
          placeholder="Continue the story naturally..."
        ></textarea>
      </div>

      <div class="form-group">
        <label for="templateCharacter">Character Response Template</label>
        <textarea
          id="templateCharacter"
          v-model="localTemplates.character"
          class="textarea-input"
          rows="3"
          placeholder="Write from {char}'s perspective..."
        ></textarea>
      </div>

      <div class="form-group">
        <label for="templateInstruction">Custom Instruction Template</label>
        <textarea
          id="templateInstruction"
          v-model="localTemplates.instruction"
          class="textarea-input"
          rows="2"
          placeholder="{instruction}"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="templateRewrite">Rewrite to Third Person Template</label>
        <textarea
          id="templateRewrite"
          v-model="localTemplates.rewriteThirdPerson"
          class="textarea-input"
          rows="3"
          placeholder="Rewrite to third person..."
        ></textarea>
      </div>
    </section>

    <button
      type="button"
      class="btn-link"
      @click="showTemplates = !showTemplates"
    >
      {{ showTemplates ? 'Hide' : 'Show' }} Prompt Templates (Advanced)
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const showTemplates = ref(false)

const localTemplates = computed({
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

.section-description {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.section-description code {
  background-color: var(--bg-tertiary);
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.85em;
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

.textarea-input {
  width: 100%;
  padding: 0.6rem;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.95rem;
  font-family: inherit;
}

.textarea-input:focus {
  outline: none;
  border-color: var(--accent-primary);
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
