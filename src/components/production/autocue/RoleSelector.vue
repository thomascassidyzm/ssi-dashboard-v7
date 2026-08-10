<template>
  <div class="role-selector">
    <div class="role-setup-card">
      <button class="back-to-modes" @click="emit('back')">← Back to modes</button>
      <h2 class="setup-title">Recording Session Setup</h2>

      <div class="course-info">
        <span class="course-label">Course:</span>
        <span class="course-name">{{ courseNameDisplay }}</span>
      </div>

      <div class="role-selection">
        <label class="selection-label">Recording Role:</label>

        <!-- Cast on this course puts you in one slot. Showing the other slots
             as equal choices is how a voice-2 recordist files takes as voice 1. -->
        <p v-if="assignedSlot" class="assigned-note">
          You're cast as <strong>{{ assignedRole?.voiceName || assignedRole?.type }}</strong>
          on this course.
        </p>

        <div class="role-options">
          <div
            v-for="role in roles"
            :key="role.id"
            class="role-option"
            :class="{ selected: selectedRole === role.id, mine: role.id === assignedSlot }"
            @click="selectRole(role.id)"
          >
            <div class="role-type">{{ role.type }}</div>
            <div class="role-language">{{ role.voiceName || role.language }}</div>
            <div class="role-radio"></div>
          </div>
        </div>
      </div>

      <div class="session-summary">
        <div class="summary-line">
          This session: <strong>{{ phraseCount }} {{ targetLabel }}phrases</strong>
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
import { ref, computed, watch } from 'vue'

// No language defaults here — this component is course-agnostic, and a
// hardcoded fallback (it used to say Welsh) mislabels every other course.
// The parent supplies real values once /info resolves; until then we show
// neutral placeholders rather than a confident wrong answer.
const props = defineProps({
  courseName: { type: String, default: '' },
  knownLanguage: { type: String, default: '' },
  targetLanguage: { type: String, default: '' },
  phraseCount: { type: Number, default: 0 },
  // The slot this recordist is cast in on this course (courses.voice_config),
  // pre-selected so the default is their OWN voice rather than voice 1.
  assignedSlot: { type: String, default: null },
  // The course's configured slots with the voice actually in each — lets a
  // multi-voice cast be read off the screen instead of guessed at.
  // [{ slot, label, voiceName, isHuman }]
  slotOptions: { type: Array, default: () => [] }
})

const emit = defineEmits(['begin', 'back'])

const courseNameDisplay = computed(() => props.courseName || 'This course')
// "12 phrases" reads fine; "12 Welsh phrases" does not when it isn't Welsh.
const targetLabel = computed(() => props.targetLanguage ? `${props.targetLanguage} ` : '')

// Pre-select the recordist's own slot; re-select if the cast arrives late
// (voice_config is fetched asynchronously by the studio).
const selectedRole = ref(props.assignedSlot)
watch(() => props.assignedSlot, slot => { if (slot) selectedRole.value = slot }, { immediate: true })

const ROLE_TYPES = { known: 'Known', target1: 'Target 1', target2: 'Target 2', presentation: 'Presenter' }

const roles = computed(() => {
  const language = id => (id === 'known'
    ? (props.knownLanguage || 'Known language')
    : (props.targetLanguage || 'Target language'))

  // Prefer the course's real cast when the studio supplied it — a course with
  // one voice shouldn't offer three, and a voice with a name shouldn't show
  // as a slot number.
  if (props.slotOptions.length) {
    return props.slotOptions.map(o => ({
      id: o.slot,
      type: ROLE_TYPES[o.slot] || o.label,
      language: language(o.slot),
      voiceName: o.voiceName || null
    }))
  }

  return ['known', 'target1', 'target2'].map(id => ({
    id, type: ROLE_TYPES[id], language: language(id), voiceName: null
  }))
})

const assignedRole = computed(() => roles.value.find(r => r.id === props.assignedSlot) || null)

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

/* The slot this recordist is cast in — readable at a glance even unselected. */
.role-option.mine {
  border-style: dashed;
  border-color: var(--color-tungsten, var(--accent));
}

.assigned-note {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-paper-dim, var(--muted));
  margin: 0 0 0.75rem;
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
