<template>
  <div class="role-selector">
    <div class="role-setup-card">
      <button class="back-to-modes" @click="emit('back')">← Back to modes</button>
      <h2 class="setup-title">Recording Session Setup</h2>

      <div class="course-info">
        <span class="course-label">Course:</span>
        <span class="course-name">{{ courseName }}</span>
      </div>

      <div class="role-selection">
        <label class="selection-label">Recording Role:</label>

        <div class="role-options">
          <div
            v-for="role in roles"
            :key="role.id"
            class="role-option"
            :class="{ selected: selectedRole === role.id }"
            @click="selectRole(role.id)"
          >
            <div class="role-type">{{ role.type }}</div>
            <div class="role-language">{{ role.language }}</div>
            <div class="role-radio"></div>
          </div>
        </div>
      </div>

      <div class="session-summary">
        <div class="summary-line">
          This session: <strong>{{ phraseCount }} {{ targetLanguage }} phrases</strong>
        </div>
        <div class="summary-line">
          Estimated time: <strong>~{{ estimatedTime }} minutes</strong>
        </div>
      </div>

      <button
        class="begin-btn"
        :disabled="!selectedRole"
        @click="beginSession"
      >
        Begin Session
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  courseName: { type: String, default: 'Welsh for English Speakers' },
  knownLanguage: { type: String, default: 'English' },
  targetLanguage: { type: String, default: 'Welsh' },
  phraseCount: { type: Number, default: 287 }
})

const emit = defineEmits(['begin', 'back'])

const selectedRole = ref(null)

const roles = computed(() => [
  { id: 'known', type: 'Known', language: props.knownLanguage },
  { id: 'target1', type: 'Target 1', language: props.targetLanguage },
  { id: 'target2', type: 'Target 2', language: props.targetLanguage }
])

const estimatedTime = computed(() => {
  // Rough estimate: 3 seconds per phrase for both passes
  return Math.round((props.phraseCount * 6) / 60)
})

function selectRole(roleId) {
  selectedRole.value = roleId
}

function beginSession() {
  if (selectedRole.value) {
    emit('begin', {
      role: selectedRole.value,
      language: roles.value.find(r => r.id === selectedRole.value)?.language
    })
  }
}
</script>

<style scoped>
.role-selector {
  max-width: 600px;
  margin: 0 auto;
}

.role-setup-card {
  background: linear-gradient(135deg, var(--color-shadow, var(--surface)), var(--color-slate, var(--surface-2)));
  border: 2px solid var(--color-graphite, var(--surface-3));
  border-radius: 16px;
  padding: 2.5rem;
  position: relative;
}

.back-to-modes {
  background: none;
  border: none;
  color: var(--color-paper-dim, var(--muted));
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: 1.5rem;
}

.back-to-modes:hover {
  color: var(--color-tungsten, var(--accent));
}

.setup-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-paper, var(--ink));
  margin: 0 0 2rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
}

.course-info {
  text-align: center;
  margin-bottom: 2rem;
}

.course-label {
  font-size: 1rem;
  color: var(--color-paper-dim, var(--muted));
}

.course-name {
  font-weight: 600;
  color: var(--color-paper, var(--ink));
}

.selection-label {
  display: block;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-paper-dim, var(--muted));
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
  text-align: center;
}

.role-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.role-option {
  background: var(--color-void, var(--canvas));
  border: 2px solid var(--color-graphite, var(--surface-3));
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.role-option:hover {
  border-color: var(--color-tungsten, var(--accent));
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(255, 166, 48, 0.3);
}

.role-option.selected {
  border-color: var(--color-tungsten, var(--accent));
  background: linear-gradient(135deg, rgba(255, 166, 48, 0.15), transparent);
  box-shadow: 0 0 30px rgba(255, 166, 48, 0.3);
}

.role-type {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-paper, var(--ink));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.role-language {
  font-size: 1.2rem;
  color: var(--color-paper-dim, var(--muted));
  margin-bottom: 1rem;
}

.role-radio {
  width: 24px;
  height: 24px;
  border: 3px solid var(--color-graphite, var(--surface-3));
  border-radius: 50%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.role-option.selected .role-radio {
  border-color: var(--color-tungsten, var(--accent));
  background: var(--color-tungsten, var(--accent));
  box-shadow: 0 0 16px rgba(255, 166, 48, 0.6);
}

.role-option.selected .role-radio::after {
  content: '';
  width: 8px;
  height: 8px;
  background: var(--color-void, var(--canvas));
  border-radius: 50%;
}

.session-summary {
  background: var(--color-void, var(--canvas));
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  text-align: center;
}

.summary-line {
  font-size: 1rem;
  color: var(--color-paper-dim, var(--muted));
  margin-bottom: 0.5rem;
}

.summary-line:last-child {
  margin-bottom: 0;
}

.summary-line strong {
  color: var(--color-emerald, #06ffa5);
  font-family: 'IBM Plex Mono', monospace;
}

.begin-btn {
  width: 100%;
  background: linear-gradient(135deg, var(--color-film-red, #e63946), #c4313d);
  border: 2px solid var(--color-film-red, #e63946);
  color: var(--color-paper, var(--ink));
  padding: 1rem 2rem;
  border-radius: 12px;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 16px rgba(230, 57, 70, 0.4);
}

.begin-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(230, 57, 70, 0.6);
}

.begin-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* In light mode --ink flips to near-black, which would put dark text on the
   saturated red CTA (muddy, ~4.3:1). Keep the button label light, as it is in
   dark mode, for a crisp white-on-red CTA. Scoped so dark mode is untouched. */
:root[data-theme="light"] .begin-btn {
  color: #ffffff;
}

@media (max-width: 768px) {
  .role-options {
    grid-template-columns: 1fr;
  }
}
</style>
