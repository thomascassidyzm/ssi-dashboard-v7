<template>
  <div class="role-selector">
    <div class="role-setup-card">
      <button class="back-to-modes" @click="emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
        Back to modes
      </button>
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
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 2rem;
}

/* The other way back to the mode chooser, kept exactly where it was — the
   breadcrumb above is the same gesture, this is the one already under the
   recordist's thumb. */
.back-to-modes {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  color: var(--accent-2);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: 1.5rem;
  min-height: 44px;
}

.back-to-modes svg { width: 16px; height: 16px; }

.setup-title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 0 0 1.5rem 0;
  text-align: center;
}

.course-info {
  text-align: center;
  margin-bottom: 1.75rem;
}

.course-label {
  font-size: 0.9375rem;
  color: var(--muted);
  margin-right: 0.35rem;
}

.course-name {
  font-weight: 600;
  color: var(--ink);
}

.selection-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 0.75rem;
  text-align: center;
}

.role-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.75rem;
}

.role-option {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  text-align: center;
}

.role-option:hover {
  border-color: var(--accent);
}

.role-option.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--surface-2));
}

/* The slot this recordist is cast in — readable at a glance even unselected. */
.role-option.mine {
  border-style: dashed;
  border-color: var(--accent);
}

.assigned-note {
  font-size: 0.875rem;
  color: var(--muted);
  margin: 0 0 0.75rem;
  text-align: center;
}

.assigned-note strong { color: var(--ink); }

.role-type {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 0.25rem;
}

.role-language {
  font-size: 1rem;
  color: var(--muted);
  margin-bottom: 1rem;
}

.role-radio {
  width: 22px;
  height: 22px;
  border: 2px solid var(--surface-3);
  border-radius: 50%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.role-option.selected .role-radio {
  border-color: var(--accent);
  background: var(--accent);
}

.role-option.selected .role-radio::after {
  content: '';
  width: 8px;
  height: 8px;
  background: var(--canvas);
  border-radius: 50%;
}

.session-summary {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.75rem;
  text-align: center;
}

.summary-line {
  font-size: 0.9375rem;
  color: var(--muted);
  margin-bottom: 0.5rem;
}

.summary-line:last-child {
  margin-bottom: 0;
}

.summary-line strong {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.begin-btn {
  width: 100%;
  background: var(--accent-2);
  border: 1px solid var(--accent-2);
  color: var(--canvas);
  padding: 0.875rem 2rem;
  border-radius: 12px;
  font: inherit;
  font-weight: 600;
  font-size: 1rem;
  min-height: 44px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.begin-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.begin-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .role-options {
    grid-template-columns: 1fr;
  }
}
</style>
