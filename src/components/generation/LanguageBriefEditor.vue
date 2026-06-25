<template>
  <div class="brief-editor">
    <!-- Header -->
    <div class="brief-header">
      <div class="header-left">
        <h3>Language Brief</h3>
        <span class="brief-pair">{{ langPair }}</span>
      </div>
      <div class="header-actions">
        <button
          v-if="!brief && !isGenerating"
          @click="generateBrief"
          class="btn-generate"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          Generate Brief
        </button>
        <button
          v-if="!brief && !isGenerating"
          @click="pasteJson"
          class="btn-paste"
        >
          Paste JSON
        </button>
        <button
          v-if="brief && hasChanges"
          @click="saveBrief"
          :disabled="isSaving"
          class="btn-save"
        >
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </button>
        <button
          v-if="brief"
          @click="toggleExpanded"
          class="btn-toggle"
        >
          {{ isExpanded ? 'Collapse' : 'Expand' }}
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="brief-loading">
      <div class="spinner"></div>
      <span>Loading brief...</span>
    </div>

    <!-- Generating state -->
    <div v-else-if="isGenerating" class="brief-generating">
      <div class="spinner"></div>
      <div class="gen-text">
        <span class="gen-title">Generating Language Brief</span>
        <span class="gen-desc">Claude Opus 4.5 is analyzing {{ targetName }} for {{ knownName }} speakers...</span>
        <span class="gen-hint">This typically takes 30-60 seconds.</span>
      </div>
    </div>

    <!-- No brief yet -->
    <div v-else-if="!brief" class="brief-empty">
      <p>No language brief exists for this pair yet.</p>
      <p class="brief-hint">Generate one to provide linguistic guidance for the Course Builder.</p>
    </div>

    <!-- Brief content -->
    <div v-else class="brief-content" :class="{ collapsed: !isExpanded }">
      <!-- Quick stats bar -->
      <div class="brief-stats">
        <div class="stat">
          <span class="stat-value">{{ brief.zut_failures?.length || 0 }}</span>
          <span class="stat-label">ZUT Failures</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ brief.zut_passes?.length || 0 }}</span>
          <span class="stat-label">ZUT Passes</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ brief.chunking_guidance?.length || 0 }}</span>
          <span class="stat-label">Chunking Rules</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ brief.conflict_patterns?.length || 0 }}</span>
          <span class="stat-label">Conflict Patterns</span>
        </div>
      </div>

      <!-- Expandable sections -->
      <div v-if="isExpanded" class="brief-sections">
        <!-- Target Language Profile -->
        <section class="brief-section">
          <h4 @click="toggleSection('profile')">
            <span class="section-arrow" :class="{ open: openSections.profile }">&#9654;</span>
            Target Language Profile
          </h4>
          <div v-if="openSections.profile" class="section-content">
            <div class="profile-grid">
              <div class="profile-item">
                <span class="item-label">Word Order</span>
                <input v-model="editableBrief.target_language_profile.word_order" class="item-value" />
              </div>
              <div class="profile-item">
                <span class="item-label">Gender System</span>
                <input v-model="editableBrief.target_language_profile.gender_system" class="item-value" />
              </div>
              <div class="profile-item">
                <span class="item-label">Tones</span>
                <input v-model="editableBrief.target_language_profile.tone_system" class="item-value" placeholder="none" />
              </div>
              <div class="profile-item">
                <span class="item-label">Verb Conjugation</span>
                <input v-model="editableBrief.target_language_profile.verb_conjugation" class="item-value" />
              </div>
            </div>
            <div class="profile-features">
              <span class="item-label">Notable Features</span>
              <textarea
                v-model="notableFeaturesText"
                class="features-textarea"
                placeholder="One feature per line"
              ></textarea>
            </div>
          </div>
        </section>

        <!-- ZUT Failures -->
        <section class="brief-section">
          <h4 @click="toggleSection('failures')">
            <span class="section-arrow" :class="{ open: openSections.failures }">&#9654;</span>
            ZUT Failures ({{ editableBrief.zut_failures?.length || 0 }})
          </h4>
          <div v-if="openSections.failures" class="section-content">
            <div
              v-for="(item, idx) in editableBrief.zut_failures"
              :key="'f-' + idx"
              class="zut-item"
            >
              <input v-model="item.known" class="zut-known" placeholder="known" />
              <span class="zut-arrow">fails because</span>
              <input v-model="item.why" class="zut-why" placeholder="reason" />
              <button @click="removeZutFailure(idx)" class="btn-remove">x</button>
            </div>
            <button @click="addZutFailure" class="btn-add">+ Add ZUT Failure</button>
          </div>
        </section>

        <!-- ZUT Passes -->
        <section class="brief-section">
          <h4 @click="toggleSection('passes')">
            <span class="section-arrow" :class="{ open: openSections.passes }">&#9654;</span>
            ZUT Passes ({{ editableBrief.zut_passes?.length || 0 }})
          </h4>
          <div v-if="openSections.passes" class="section-content">
            <div
              v-for="(item, idx) in editableBrief.zut_passes"
              :key="'p-' + idx"
              class="zut-item pass"
            >
              <input v-model="item.known" class="zut-known" placeholder="known" />
              <span class="zut-arrow">=</span>
              <input v-model="item.target" class="zut-target" placeholder="target" />
              <input v-model="item.why" class="zut-why" placeholder="reason" />
              <button @click="removeZutPass(idx)" class="btn-remove">x</button>
            </div>
            <button @click="addZutPass" class="btn-add">+ Add ZUT Pass</button>
          </div>
        </section>

        <!-- Chunking Guidance -->
        <section class="brief-section">
          <h4 @click="toggleSection('chunking')">
            <span class="section-arrow" :class="{ open: openSections.chunking }">&#9654;</span>
            Chunking Guidance (LEGO Extraction)
          </h4>
          <div v-if="openSections.chunking" class="section-content">
            <textarea
              v-model="chunkingGuidanceText"
              class="guidance-textarea"
              placeholder="One rule per line"
              rows="5"
            ></textarea>
          </div>
        </section>

        <!-- Conflict Patterns -->
        <section class="brief-section">
          <h4 @click="toggleSection('conflicts')">
            <span class="section-arrow" :class="{ open: openSections.conflicts }">&#9654;</span>
            Conflict Patterns (ZUT Resolution)
          </h4>
          <div v-if="openSections.conflicts" class="section-content">
            <div
              v-for="(item, idx) in editableBrief.conflict_patterns"
              :key="'c-' + idx"
              class="conflict-item"
            >
              <div class="conflict-header">
                <input v-model="item.known" class="conflict-known" placeholder="known word" />
                <button @click="removeConflictPattern(idx)" class="btn-remove">x</button>
              </div>
              <div class="conflict-targets">
                <span class="targets-label">Targets:</span>
                <input
                  :value="item.targets?.join(', ')"
                  @input="item.targets = $event.target.value.split(',').map(t => t.trim())"
                  class="targets-input"
                  placeholder="target1, target2, ..."
                />
              </div>
              <div class="conflict-resolution">
                <span class="resolution-label">Resolution:</span>
                <input v-model="item.resolution" class="resolution-input" placeholder="How to upchunk" />
              </div>
            </div>
            <button @click="addConflictPattern" class="btn-add">+ Add Conflict Pattern</button>
          </div>
        </section>

        <!-- Upchunking Notes -->
        <section class="brief-section">
          <h4 @click="toggleSection('upchunking')">
            <span class="section-arrow" :class="{ open: openSections.upchunking }">&#9654;</span>
            Upchunking Notes (ZUT Resolution)
          </h4>
          <div v-if="openSections.upchunking" class="section-content">
            <textarea
              v-model="upchunkingNotesText"
              class="guidance-textarea"
              placeholder="One note per line"
              rows="4"
            ></textarea>
          </div>
        </section>

        <!-- Phrase Generation Notes -->
        <section class="brief-section">
          <h4 @click="toggleSection('phrases')">
            <span class="section-arrow" :class="{ open: openSections.phrases }">&#9654;</span>
            Phrase Generation Notes (Basket Building)
          </h4>
          <div v-if="openSections.phrases" class="section-content">
            <textarea
              v-model="phraseNotesText"
              class="guidance-textarea"
              placeholder="One note per line"
              rows="4"
            ></textarea>
          </div>
        </section>

        <!-- Common Pitfalls -->
        <section class="brief-section">
          <h4 @click="toggleSection('pitfalls')">
            <span class="section-arrow" :class="{ open: openSections.pitfalls }">&#9654;</span>
            Common Pitfalls
          </h4>
          <div v-if="openSections.pitfalls" class="section-content">
            <textarea
              v-model="pitfallsText"
              class="guidance-textarea"
              placeholder="One pitfall per line"
              rows="4"
            ></textarea>
          </div>
        </section>

        <!-- Custom Notes (expert additions) -->
        <section class="brief-section custom">
          <h4 @click="toggleSection('custom')">
            <span class="section-arrow" :class="{ open: openSections.custom }">&#9654;</span>
            Custom Notes (Expert Additions)
          </h4>
          <div v-if="openSections.custom" class="section-content">
            <textarea
              v-model="editableBrief.custom_notes"
              class="guidance-textarea custom"
              placeholder="Add any custom guidance specific to this language pair..."
              rows="5"
            ></textarea>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { getApiUrl } from '@/services/api'

const props = defineProps({
  knownCode: { type: String, required: true },
  targetCode: { type: String, required: true },
  knownName: { type: String, default: '' },
  targetName: { type: String, default: '' }
})

const emit = defineEmits(['brief-ready', 'brief-updated'])

// State
const brief = ref(null)
const editableBrief = ref(null)
const originalBriefJson = ref('')
const isLoading = ref(false)
const isGenerating = ref(false)
const isSaving = ref(false)
const isExpanded = ref(false)

const openSections = ref({
  profile: true,
  failures: false,
  passes: false,
  chunking: false,
  conflicts: false,
  upchunking: false,
  phrases: false,
  pitfalls: false,
  custom: true
})

// Computed
const langPair = computed(() => `${props.targetCode}_for_${props.knownCode}`)

const hasChanges = computed(() => {
  if (!editableBrief.value) return false
  return JSON.stringify(editableBrief.value) !== originalBriefJson.value
})

// Text representations for array fields (easier editing)
const notableFeaturesText = computed({
  get: () => editableBrief.value?.target_language_profile?.notable_features?.join('\n') || '',
  set: (val) => {
    if (editableBrief.value?.target_language_profile) {
      editableBrief.value.target_language_profile.notable_features = val.split('\n').filter(l => l.trim())
    }
  }
})

const chunkingGuidanceText = computed({
  get: () => editableBrief.value?.chunking_guidance?.join('\n') || '',
  set: (val) => {
    if (editableBrief.value) {
      editableBrief.value.chunking_guidance = val.split('\n').filter(l => l.trim())
    }
  }
})

const upchunkingNotesText = computed({
  get: () => editableBrief.value?.upchunking_notes?.join('\n') || '',
  set: (val) => {
    if (editableBrief.value) {
      editableBrief.value.upchunking_notes = val.split('\n').filter(l => l.trim())
    }
  }
})

const phraseNotesText = computed({
  get: () => editableBrief.value?.phrase_generation_notes?.join('\n') || '',
  set: (val) => {
    if (editableBrief.value) {
      editableBrief.value.phrase_generation_notes = val.split('\n').filter(l => l.trim())
    }
  }
})

const pitfallsText = computed({
  get: () => editableBrief.value?.common_pitfalls?.join('\n') || '',
  set: (val) => {
    if (editableBrief.value) {
      editableBrief.value.common_pitfalls = val.split('\n').filter(l => l.trim())
    }
  }
})

// Methods
function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

function toggleSection(section) {
  openSections.value[section] = !openSections.value[section]
}

// ZUT management
function addZutFailure() {
  if (!editableBrief.value.zut_failures) editableBrief.value.zut_failures = []
  editableBrief.value.zut_failures.push({ known: '', why: '' })
}

function removeZutFailure(idx) {
  editableBrief.value.zut_failures.splice(idx, 1)
}

function addZutPass() {
  if (!editableBrief.value.zut_passes) editableBrief.value.zut_passes = []
  editableBrief.value.zut_passes.push({ known: '', target: '', why: '' })
}

function removeZutPass(idx) {
  editableBrief.value.zut_passes.splice(idx, 1)
}

function addConflictPattern() {
  if (!editableBrief.value.conflict_patterns) editableBrief.value.conflict_patterns = []
  editableBrief.value.conflict_patterns.push({ known: '', targets: [], resolution: '' })
}

function removeConflictPattern(idx) {
  editableBrief.value.conflict_patterns.splice(idx, 1)
}

// API calls
async function loadBrief() {
  isLoading.value = true
  try {
    const apiBase = getApiUrl()
    const res = await fetch(`${apiBase}/api/language-brief/${props.knownCode}/${props.targetCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (res.ok) {
      const data = await res.json()
      if (data.brief) {
        brief.value = data.brief
        editableBrief.value = JSON.parse(JSON.stringify(data.brief))
        originalBriefJson.value = JSON.stringify(data.brief)
        emit('brief-ready', data.brief)
      }
    }
  } catch (err) {
    console.error('[BriefEditor] Failed to load brief:', err)
  } finally {
    isLoading.value = false
  }
}

async function generateBrief() {
  isGenerating.value = true
  try {
    const apiBase = getApiUrl()
    const res = await fetch(`${apiBase}/api/language-brief/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        known_code: props.knownCode,
        target_code: props.targetCode,
        known_name: props.knownName,
        target_name: props.targetName
      })
    })

    if (!res.ok) throw new Error((await res.clone().json().catch(() => ({}))).error || `HTTP ${res.status}`)
    const data = await res.json()

    if (res.ok && data.brief) {
      // Brief generated via Claude Opus 4.5 API
      brief.value = data.brief
      editableBrief.value = JSON.parse(JSON.stringify(data.brief))
      originalBriefJson.value = JSON.stringify(data.brief)
      isExpanded.value = true
      emit('brief-ready', data.brief)
      console.log('[BriefEditor] Brief generated successfully')
    } else {
      console.error('[BriefEditor] Generation failed:', data)
      alert(`Generation failed: ${data.error || data.message || 'Unknown error'}`)
    }
  } catch (err) {
    console.error('[BriefEditor] Failed to generate brief:', err)
    alert(`Failed to generate brief: ${err.message}`)
  } finally {
    isGenerating.value = false
  }
}

// Paste JSON from clipboard and save
async function pasteJson() {
  try {
    const text = await navigator.clipboard.readText()
    const parsed = JSON.parse(text)

    // Accept either the full brief object or wrapped {brief: ...}
    const briefData = parsed.brief || parsed

    if (!briefData.target_language_profile && !briefData.zut_failures) {
      alert('Invalid brief JSON - missing required fields')
      return
    }

    // Save to API
    const apiBase = getApiUrl()
    const res = await fetch(`${apiBase}/api/language-brief`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        known_code: props.knownCode,
        target_code: props.targetCode,
        brief: briefData,
        generated_by: 'manual-paste'
      })
    })

    if (res.ok) {
      brief.value = briefData
      editableBrief.value = JSON.parse(JSON.stringify(briefData))
      originalBriefJson.value = JSON.stringify(briefData)
      isExpanded.value = true
      emit('brief-ready', briefData)
      console.log('[BriefEditor] Brief pasted and saved')
    } else {
      const err = await res.json()
      alert(`Failed to save: ${err.error || 'Unknown error'}`)
    }
  } catch (err) {
    if (err.name === 'SyntaxError') {
      alert('Invalid JSON in clipboard')
    } else {
      alert(`Paste failed: ${err.message}`)
    }
  }
}

async function saveBrief() {
  isSaving.value = true
  try {
    const apiBase = getApiUrl()
    const res = await fetch(`${apiBase}/api/language-brief/${props.knownCode}/${props.targetCode}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ brief: editableBrief.value })
    })

    if (res.ok) {
      brief.value = JSON.parse(JSON.stringify(editableBrief.value))
      originalBriefJson.value = JSON.stringify(editableBrief.value)
      emit('brief-updated', editableBrief.value)
    }
  } catch (err) {
    console.error('[BriefEditor] Failed to save brief:', err)
  } finally {
    isSaving.value = false
  }
}

// Watch for language pair changes
watch([() => props.knownCode, () => props.targetCode], () => {
  if (props.knownCode && props.targetCode) {
    loadBrief()
  }
}, { immediate: true })

onMounted(() => {
  if (props.knownCode && props.targetCode) {
    loadBrief()
  }
})
</script>

<style scoped>
.brief-editor {
  --surface: var(--surface);
  --elevated: var(--surface-2);
  --border: var(--line);
  --text: var(--ink);
  --text-dim: var(--muted);
  --text-muted: var(--faint);
  --accent: var(--accent-2);
  --accent-dim: color-mix(in srgb, var(--accent-2) 15%, transparent);

  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

/* Header */
.brief-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: var(--elevated);
  border-bottom: 1px solid var(--border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-left h3 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
}

.brief-pair {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: var(--surface);
  border-radius: 4px;
  color: var(--text-dim);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-generate,
.btn-paste,
.btn-save,
.btn-toggle {
  padding: 0.5rem 0.875rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-paste {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
}

.btn-paste:hover {
  background: var(--elevated);
  color: var(--text);
}

.btn-generate {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--accent);
  border: none;
  color: white;
}

.btn-generate:hover {
  opacity: 0.9;
}

.btn-generate svg {
  width: 16px;
  height: 16px;
  animation: spin 3s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-save {
  background: var(--accent);
  border: none;
  color: white;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-toggle {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
}

.btn-toggle:hover {
  border-color: var(--text-muted);
  color: var(--text);
}

/* Loading/Empty states */
.brief-loading,
.brief-generating,
.brief-empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
}

.brief-loading,
.brief-generating {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.brief-generating {
  flex-direction: column;
  gap: 0.5rem;
}

.gen-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.gen-title {
  color: var(--text);
  font-weight: 500;
}

.gen-desc {
  font-size: 0.875rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.brief-empty p {
  margin: 0.5rem 0;
}

.brief-hint {
  font-size: 0.875rem;
}

/* Stats bar */
.brief-stats {
  display: flex;
  gap: 1px;
  background: var(--border);
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  background: var(--surface);
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent);
}

.stat-label {
  font-size: 0.6875rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Content */
.brief-content.collapsed {
  max-height: 0;
  overflow: hidden;
}

.brief-sections {
  padding: 1rem;
}

/* Sections */
.brief-section {
  margin-bottom: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.brief-section.custom {
  border-color: var(--accent);
  background: var(--accent-dim);
}

.brief-section h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.75rem 1rem;
  background: var(--elevated);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  user-select: none;
}

.brief-section h4:hover {
  background: var(--border);
}

.section-arrow {
  font-size: 0.625rem;
  color: var(--text-muted);
  transition: transform 0.2s;
}

.section-arrow.open {
  transform: rotate(90deg);
}

.section-content {
  padding: 1rem;
  background: var(--surface);
}

/* Profile grid */
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.profile-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-label {
  font-size: 0.6875rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.item-value {
  padding: 0.5rem 0.75rem;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 0.875rem;
}

.item-value:focus {
  outline: none;
  border-color: var(--accent);
}

.profile-features {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.features-textarea {
  padding: 0.5rem 0.75rem;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 0.8125rem;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
}

.features-textarea:focus {
  outline: none;
  border-color: var(--accent);
}

/* ZUT items */
.zut-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: var(--elevated);
  border-radius: 6px;
}

.zut-known,
.zut-target,
.zut-why {
  padding: 0.375rem 0.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 0.8125rem;
}

.zut-known {
  width: 100px;
  font-weight: 500;
}

.zut-target {
  width: 100px;
}

.zut-why {
  flex: 1;
}

.zut-arrow {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.zut-item.pass .zut-arrow {
  color: var(--accent);
  font-weight: 600;
}

.btn-remove {
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.75rem;
}

.btn-remove:hover {
  background: color-mix(in srgb, var(--danger) 18%, transparent);
  border-color: var(--danger);
  color: var(--danger);
}

.btn-add {
  width: 100%;
  padding: 0.5rem;
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 0.8125rem;
  cursor: pointer;
}

.btn-add:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Conflict items */
.conflict-item {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: var(--elevated);
  border-radius: 6px;
}

.conflict-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.conflict-known {
  flex: 1;
  padding: 0.375rem 0.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 500;
}

.conflict-targets,
.conflict-resolution {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.375rem;
}

.targets-label,
.resolution-label {
  font-size: 0.6875rem;
  color: var(--text-muted);
  text-transform: uppercase;
  width: 70px;
  flex-shrink: 0;
}

.targets-input,
.resolution-input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 0.8125rem;
}

/* Guidance textareas */
.guidance-textarea {
  width: 100%;
  padding: 0.75rem;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 0.8125rem;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
}

.guidance-textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.guidance-textarea.custom {
  background: color-mix(in srgb, var(--accent) 10%, var(--elevated));
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}

/* Responsive */
@media (max-width: 640px) {
  .brief-stats {
    flex-wrap: wrap;
  }

  .stat {
    flex: 1 1 50%;
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }

  .zut-item {
    flex-wrap: wrap;
  }

  .zut-known,
  .zut-target {
    width: 100%;
  }

  .zut-why {
    width: 100%;
  }
}
</style>
