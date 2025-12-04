# MASTER AGENT 2: QA Workflow Tools

## Mission Brief

You are **Master Agent 2** of 4, responsible for building the QA workflow tools: enhanced Script Viewer and new Samples Browser. You can begin work **after Master Agent 1 merges** (infrastructure dependency).

---

## Project Context

You are working on the SSi Dashboard v7 project. After cloning, your working directory is:
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean
```

This is a Vue 3 + Vite application with Tailwind CSS.

**Read these files first to understand the codebase and architecture:**
- `CLAUDE.md` - Agent onboarding guide
- `new_vision/MASTER_ORCHESTRATION_BRIEF.md` - Full architecture vision
- `new_vision/COURSE_PRODUCTION_SUITE_ARCHITECTURE.md` - Detailed specs
- `new_vision/autocue-teleprompter-prototype.html` - Design aesthetic reference
- `src/stores/production.js` - Pinia store (from Master 1)
- `src/services/websocket.js` - WebSocket service (from Master 1)

---

## Your Deliverables

### 1. Branch Setup
```bash
git checkout main
git pull origin main
git checkout -b feature/production-suite-qa
```

### 2. Component Overview

You will create/enhance these components:

```
src/components/production/
├── qa/
│   ├── ScriptViewer.vue          # Enhanced seed tree with flagging
│   ├── SamplesBrowser.vue        # NEW: Grid/list audio browser
│   ├── FlagMenu.vue              # Flagging dropdown menu
│   ├── StatusBadge.vue           # Status indicator component
│   ├── SampleCard.vue            # Individual sample in browser
│   └── CompareView.vue           # Side-by-side audio comparison
```

---

### 3. StatusBadge Component: `src/components/production/qa/StatusBadge.vue`

```vue
<template>
  <span
    class="status-badge"
    :class="statusClass"
    :title="statusLabel"
  >
    <span class="status-dot"></span>
    <span class="status-text">{{ statusLabel }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: 'pending'
  },
  size: {
    type: String,
    default: 'md' // sm, md, lg
  }
})

const statusConfig = {
  pending: { label: 'Pending', class: 'status-pending' },
  flagged_regen_tts: { label: 'TTS Regen', class: 'status-flagged' },
  flagged_human_needed: { label: 'Human Needed', class: 'status-flagged-human' },
  in_pipeline: { label: 'In Pipeline', class: 'status-in-progress' },
  in_recording: { label: 'Recording', class: 'status-in-progress' },
  needs_review: { label: 'Needs Review', class: 'status-review' },
  approved: { label: 'Approved', class: 'status-approved' },
  rejected: { label: 'Rejected', class: 'status-rejected' }
}

const statusLabel = computed(() => statusConfig[props.status]?.label || props.status)
const statusClass = computed(() => [
  statusConfig[props.status]?.class || 'status-pending',
  `status-${props.size}`
])
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Size variants */
.status-sm { font-size: 0.65rem; }
.status-sm .status-dot { width: 6px; height: 6px; }

.status-md { font-size: 0.75rem; }

.status-lg { font-size: 0.85rem; }
.status-lg .status-dot { width: 10px; height: 10px; }

/* Status colors - cinematic palette */
.status-pending {
  background: rgba(52, 56, 74, 0.5);
  color: #c1c1bb;
}
.status-pending .status-dot { background: #c1c1bb; }

.status-flagged {
  background: rgba(255, 166, 48, 0.15);
  color: #ffa630;
}
.status-flagged .status-dot {
  background: #ffa630;
  box-shadow: 0 0 8px rgba(255, 166, 48, 0.6);
}

.status-flagged-human {
  background: rgba(230, 57, 70, 0.15);
  color: #e63946;
}
.status-flagged-human .status-dot {
  background: #e63946;
  box-shadow: 0 0 8px rgba(230, 57, 70, 0.6);
}

.status-in-progress {
  background: rgba(6, 182, 212, 0.15);
  color: #06b6d4;
}
.status-in-progress .status-dot {
  background: #06b6d4;
  animation: pulse 2s ease-in-out infinite;
}

.status-review {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}
.status-review .status-dot { background: #fbbf24; }

.status-approved {
  background: rgba(6, 255, 165, 0.15);
  color: #06ffa5;
}
.status-approved .status-dot {
  background: #06ffa5;
  box-shadow: 0 0 8px rgba(6, 255, 165, 0.5);
}

.status-rejected {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.status-rejected .status-dot { background: #ef4444; }

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}
</style>
```

---

### 4. FlagMenu Component: `src/components/production/qa/FlagMenu.vue`

```vue
<template>
  <div class="flag-menu-container" ref="menuContainer">
    <button
      class="flag-trigger"
      @click="toggleMenu"
      :class="{ 'has-flag': currentStatus !== 'pending' }"
    >
      <span class="flag-icon">{{ flagIcon }}</span>
      <span class="flag-label">{{ currentStatus === 'pending' ? 'Flag' : 'Flagged' }}</span>
    </button>

    <Transition name="menu-fade">
      <div v-if="isOpen" class="flag-dropdown">
        <div class="flag-dropdown-header">Flag Sample</div>

        <button
          v-for="option in flagOptions"
          :key="option.status"
          class="flag-option"
          :class="{ active: currentStatus === option.status }"
          @click="selectFlag(option)"
        >
          <span class="option-icon">{{ option.icon }}</span>
          <div class="option-content">
            <span class="option-label">{{ option.label }}</span>
            <span class="option-desc">{{ option.description }}</span>
          </div>
        </button>

        <div class="flag-divider"></div>

        <div class="flag-notes">
          <label class="notes-label">Notes (optional)</label>
          <textarea
            v-model="notes"
            class="notes-input"
            placeholder="Add context for this flag..."
            rows="2"
          ></textarea>
        </div>

        <div class="flag-actions">
          <button class="action-btn cancel" @click="closeMenu">Cancel</button>
          <button
            class="action-btn clear"
            v-if="currentStatus !== 'pending'"
            @click="clearFlag"
          >
            Clear Flag
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useProductionStore } from '@/stores/production'

const props = defineProps({
  uuid: { type: String, required: true },
  currentStatus: { type: String, default: 'pending' }
})

const emit = defineEmits(['flagged', 'cleared'])

const store = useProductionStore()
const isOpen = ref(false)
const notes = ref('')
const menuContainer = ref(null)

const flagOptions = [
  {
    status: 'flagged_regen_tts',
    icon: '🔄',
    label: 'Regenerate TTS',
    description: 'Send to audio pipeline for new TTS generation'
  },
  {
    status: 'flagged_human_needed',
    icon: '🎙️',
    label: 'Human Recording Needed',
    description: 'TTS inadequate, requires voice talent'
  },
  {
    status: 'rejected',
    icon: '❌',
    label: 'Reject',
    description: 'Mark as rejected, needs review'
  },
  {
    status: 'approved',
    icon: '✓',
    label: 'Approve',
    description: 'Mark as approved and complete'
  }
]

const flagIcon = computed(() => {
  if (props.currentStatus === 'pending') return '🏳️'
  const option = flagOptions.find(o => o.status === props.currentStatus)
  return option?.icon || '🚩'
})

function toggleMenu() {
  isOpen.value = !isOpen.value
}

function closeMenu() {
  isOpen.value = false
  notes.value = ''
}

async function selectFlag(option) {
  const success = await store.updateSampleFlag(props.uuid, {
    status: option.status,
    reason: option.label,
    notes: notes.value || undefined,
    flaggedBy: 'qa-reviewer' // TODO: Get from auth
  })

  if (success) {
    emit('flagged', { uuid: props.uuid, status: option.status })
    closeMenu()
  }
}

async function clearFlag() {
  const success = await store.updateSampleFlag(props.uuid, {
    status: 'pending',
    reason: null,
    notes: null
  })

  if (success) {
    emit('cleared', { uuid: props.uuid })
    closeMenu()
  }
}

// Close on outside click
function handleClickOutside(event) {
  if (menuContainer.value && !menuContainer.value.contains(event.target)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.flag-menu-container {
  position: relative;
  display: inline-block;
}

.flag-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-slate, #23262f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 8px;
  color: var(--color-paper-dim, #c1c1bb);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.flag-trigger:hover {
  background: var(--color-graphite, #34384a);
  border-color: var(--color-tungsten, #ffa630);
}

.flag-trigger.has-flag {
  background: rgba(255, 166, 48, 0.15);
  border-color: var(--color-tungsten, #ffa630);
  color: var(--color-tungsten, #ffa630);
}

.flag-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 100;
  overflow: hidden;
}

.flag-dropdown-header {
  padding: 0.75rem 1rem;
  background: var(--color-slate, #23262f);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-paper-dim, #c1c1bb);
}

.flag-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
}

.flag-option:hover {
  background: var(--color-slate, #23262f);
}

.flag-option.active {
  background: rgba(255, 166, 48, 0.1);
}

.option-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.option-label {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
}

.option-desc {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.flag-divider {
  height: 1px;
  background: var(--color-graphite, #34384a);
  margin: 0.5rem 0;
}

.flag-notes {
  padding: 0.75rem 1rem;
}

.notes-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-paper-dim, #c1c1bb);
  margin-bottom: 0.5rem;
}

.notes-input {
  width: 100%;
  padding: 0.5rem;
  background: var(--color-void, #0a0b0f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 6px;
  color: var(--color-paper, #f7f7f2);
  font-family: inherit;
  font-size: 0.85rem;
  resize: none;
}

.notes-input:focus {
  outline: none;
  border-color: var(--color-tungsten, #ffa630);
}

.flag-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-slate, #23262f);
}

.action-btn {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.cancel {
  background: transparent;
  border: 1px solid var(--color-graphite, #34384a);
  color: var(--color-paper-dim, #c1c1bb);
}

.action-btn.cancel:hover {
  background: var(--color-graphite, #34384a);
}

.action-btn.clear {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  color: #ef4444;
}

.action-btn.clear:hover {
  background: rgba(239, 68, 68, 0.25);
}

/* Transition */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
```

---

### 5. SampleCard Component: `src/components/production/qa/SampleCard.vue`

```vue
<template>
  <div
    class="sample-card"
    :class="[`confidence-${confidenceLevel}`, { playing: isPlaying }]"
  >
    <div class="card-header">
      <span class="sample-id">{{ sample.seedId || 'Sample' }}</span>
      <StatusBadge :status="sample.status || 'pending'" size="sm" />
    </div>

    <div class="card-body">
      <p class="sample-text target">{{ sample.targetText }}</p>
      <p class="sample-text known">{{ sample.knownText }}</p>
    </div>

    <div class="card-waveform" @click="togglePlayback">
      <div class="waveform-bars">
        <div
          v-for="(height, i) in waveformBars"
          :key="i"
          class="waveform-bar"
          :style="{ height: `${height}%` }"
        ></div>
      </div>
      <div class="play-overlay">
        <span class="play-icon">{{ isPlaying ? '⏸' : '▶' }}</span>
      </div>
    </div>

    <div class="card-meta">
      <span class="meta-item">
        <span class="meta-icon">⏱</span>
        {{ formatDuration(sample.duration) }}
      </span>
      <span class="meta-item confidence" :class="confidenceLevel">
        {{ confidencePercent }}%
      </span>
    </div>

    <div class="card-actions">
      <button class="action-btn play" @click="togglePlayback">
        {{ isPlaying ? '⏸ Pause' : '▶ Play' }}
      </button>
      <FlagMenu
        :uuid="sample.uuid"
        :current-status="sample.status"
        @flagged="onFlagged"
        @cleared="onCleared"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import FlagMenu from './FlagMenu.vue'

const props = defineProps({
  sample: { type: Object, required: true }
})

const emit = defineEmits(['play', 'pause', 'flagged', 'cleared'])

const isPlaying = ref(false)

// Generate fake waveform for visual
const waveformBars = computed(() => {
  const bars = []
  for (let i = 0; i < 20; i++) {
    bars.push(30 + Math.random() * 70)
  }
  return bars
})

const confidenceLevel = computed(() => {
  const conf = props.sample.confidence || 0.8
  if (conf >= 0.9) return 'high'
  if (conf >= 0.7) return 'medium'
  return 'low'
})

const confidencePercent = computed(() => {
  return Math.round((props.sample.confidence || 0.8) * 100)
})

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function togglePlayback() {
  isPlaying.value = !isPlaying.value
  emit(isPlaying.value ? 'play' : 'pause', props.sample)
}

function onFlagged(data) {
  emit('flagged', data)
}

function onCleared(data) {
  emit('cleared', data)
}
</script>

<style scoped>
.sample-card {
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.3s ease;
}

.sample-card:hover {
  border-color: var(--color-tungsten, #ffa630);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.sample-card.playing {
  border-color: var(--color-emerald, #06ffa5);
  box-shadow: 0 0 20px rgba(6, 255, 165, 0.2);
}

/* Confidence border indicators */
.sample-card.confidence-high {
  border-left: 3px solid var(--color-emerald, #06ffa5);
}

.sample-card.confidence-medium {
  border-left: 3px solid var(--color-tungsten, #ffa630);
}

.sample-card.confidence-low {
  border-left: 3px solid var(--color-film-red, #e63946);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.sample-id {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.card-body {
  margin-bottom: 0.75rem;
}

.sample-text {
  margin: 0;
  line-height: 1.4;
}

.sample-text.target {
  font-family: 'Crimson Pro', serif;
  font-size: 1.1rem;
  color: var(--color-paper, #f7f7f2);
  margin-bottom: 0.25rem;
}

.sample-text.known {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  color: var(--color-paper-dim, #c1c1bb);
  font-style: italic;
}

.card-waveform {
  position: relative;
  height: 48px;
  background: var(--color-void, #0a0b0f);
  border-radius: 6px;
  margin-bottom: 0.75rem;
  cursor: pointer;
  overflow: hidden;
}

.waveform-bars {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 2px;
  padding: 0 8px;
}

.waveform-bar {
  flex: 1;
  background: var(--color-emerald, #06ffa5);
  border-radius: 2px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.sample-card.playing .waveform-bar {
  opacity: 1;
  animation: waveAnimate 0.5s ease-in-out infinite alternate;
}

@keyframes waveAnimate {
  from { transform: scaleY(0.8); }
  to { transform: scaleY(1); }
}

.play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.card-waveform:hover .play-overlay {
  opacity: 1;
}

.play-icon {
  font-size: 1.5rem;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.meta-item {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.meta-item.confidence.high { color: var(--color-emerald, #06ffa5); }
.meta-item.confidence.medium { color: var(--color-tungsten, #ffa630); }
.meta-item.confidence.low { color: var(--color-film-red, #e63946); }

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  flex: 1;
  padding: 0.5rem;
  background: var(--color-slate, #23262f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 6px;
  color: var(--color-paper, #f7f7f2);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-graphite, #34384a);
}

.action-btn.play {
  background: var(--color-void, #0a0b0f);
}
</style>
```

---

### 6. SamplesBrowser Component: `src/components/production/qa/SamplesBrowser.vue`

```vue
<template>
  <div class="samples-browser">
    <!-- Header -->
    <div class="browser-header">
      <div class="header-title">
        <h2>Samples Browser</h2>
        <span class="sample-count">{{ filteredSamples.length }} samples</span>
      </div>

      <div class="header-controls">
        <!-- View Toggle -->
        <div class="view-toggle">
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
          >
            Grid
          </button>
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            List
          </button>
        </div>

        <!-- Filter Dropdown -->
        <select v-model="statusFilter" class="filter-select">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="flagged_regen_tts">Flagged: TTS</option>
          <option value="flagged_human_needed">Flagged: Human</option>
          <option value="in_pipeline">In Pipeline</option>
          <option value="needs_review">Needs Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <!-- Confidence Filter -->
        <select v-model="confidenceFilter" class="filter-select">
          <option value="all">All Confidence</option>
          <option value="high">High (90%+)</option>
          <option value="medium">Medium (70-90%)</option>
          <option value="low">Low (<70%)</option>
        </select>

        <!-- Search -->
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search samples..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Batch Actions -->
    <div class="batch-actions" v-if="selectedSamples.length > 0">
      <span class="selection-count">{{ selectedSamples.length }} selected</span>
      <button class="batch-btn approve" @click="batchApprove">
        Approve All
      </button>
      <button class="batch-btn flag" @click="batchFlag">
        Flag Selected
      </button>
      <button class="batch-btn clear" @click="clearSelection">
        Clear Selection
      </button>
    </div>

    <!-- Quick Stats -->
    <div class="quick-stats">
      <div class="stat-card">
        <span class="stat-value approved">{{ stats.approved }}</span>
        <span class="stat-label">Approved</span>
      </div>
      <div class="stat-card">
        <span class="stat-value flagged">{{ stats.flagged }}</span>
        <span class="stat-label">Flagged</span>
      </div>
      <div class="stat-card">
        <span class="stat-value pending">{{ stats.pending }}</span>
        <span class="stat-label">Pending</span>
      </div>
      <div class="stat-card">
        <span class="stat-value progress">{{ stats.percentComplete }}%</span>
        <span class="stat-label">Complete</span>
      </div>
    </div>

    <!-- Grid View -->
    <div v-if="viewMode === 'grid'" class="samples-grid">
      <SampleCard
        v-for="sample in filteredSamples"
        :key="sample.uuid"
        :sample="sample"
        @play="playSample"
        @flagged="onSampleFlagged"
      />
    </div>

    <!-- List View -->
    <div v-else class="samples-list">
      <div class="list-header">
        <span class="col-select">
          <input type="checkbox" @change="toggleSelectAll" />
        </span>
        <span class="col-id">ID</span>
        <span class="col-text">Text</span>
        <span class="col-status">Status</span>
        <span class="col-confidence">Confidence</span>
        <span class="col-actions">Actions</span>
      </div>

      <div
        v-for="sample in filteredSamples"
        :key="sample.uuid"
        class="list-row"
        :class="{ selected: isSelected(sample.uuid) }"
      >
        <span class="col-select">
          <input
            type="checkbox"
            :checked="isSelected(sample.uuid)"
            @change="toggleSelect(sample.uuid)"
          />
        </span>
        <span class="col-id">{{ sample.seedId }}</span>
        <span class="col-text">
          <span class="text-target">{{ sample.targetText }}</span>
          <span class="text-known">{{ sample.knownText }}</span>
        </span>
        <span class="col-status">
          <StatusBadge :status="sample.status" size="sm" />
        </span>
        <span class="col-confidence" :class="getConfidenceLevel(sample.confidence)">
          {{ Math.round((sample.confidence || 0.8) * 100) }}%
        </span>
        <span class="col-actions">
          <button class="mini-btn" @click="playSample(sample)">▶</button>
          <FlagMenu
            :uuid="sample.uuid"
            :current-status="sample.status"
            @flagged="onSampleFlagged"
          />
        </span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredSamples.length === 0" class="empty-state">
      <p>No samples match your filters</p>
      <button class="reset-btn" @click="resetFilters">Reset Filters</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProductionStore } from '@/stores/production'
import SampleCard from './SampleCard.vue'
import StatusBadge from './StatusBadge.vue'
import FlagMenu from './FlagMenu.vue'

const store = useProductionStore()

// View state
const viewMode = ref('grid')
const statusFilter = ref('all')
const confidenceFilter = ref('all')
const searchQuery = ref('')
const selectedSamples = ref([])

// Get samples from store
const allSamples = computed(() => {
  const manifest = store.courseManifest
  const flags = store.sampleFlags?.samples || {}

  if (!manifest?.samples) return []

  return manifest.samples.map(sample => ({
    ...sample,
    status: flags[sample.uuid]?.status || 'pending',
    confidence: sample.confidence || 0.85
  }))
})

// Filtered samples
const filteredSamples = computed(() => {
  let result = allSamples.value

  // Status filter
  if (statusFilter.value !== 'all') {
    result = result.filter(s => s.status === statusFilter.value)
  }

  // Confidence filter
  if (confidenceFilter.value !== 'all') {
    result = result.filter(s => {
      const conf = s.confidence || 0.8
      if (confidenceFilter.value === 'high') return conf >= 0.9
      if (confidenceFilter.value === 'medium') return conf >= 0.7 && conf < 0.9
      if (confidenceFilter.value === 'low') return conf < 0.7
      return true
    })
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.targetText?.toLowerCase().includes(query) ||
      s.knownText?.toLowerCase().includes(query) ||
      s.seedId?.toLowerCase().includes(query)
    )
  }

  return result
})

// Stats
const stats = computed(() => store.progressStats)

// Selection helpers
function isSelected(uuid) {
  return selectedSamples.value.includes(uuid)
}

function toggleSelect(uuid) {
  const index = selectedSamples.value.indexOf(uuid)
  if (index > -1) {
    selectedSamples.value.splice(index, 1)
  } else {
    selectedSamples.value.push(uuid)
  }
}

function toggleSelectAll(event) {
  if (event.target.checked) {
    selectedSamples.value = filteredSamples.value.map(s => s.uuid)
  } else {
    selectedSamples.value = []
  }
}

function clearSelection() {
  selectedSamples.value = []
}

// Batch actions
async function batchApprove() {
  const updates = selectedSamples.value.map(uuid => ({
    uuid,
    status: 'approved'
  }))
  await store.bulkUpdateFlags(updates)
  clearSelection()
}

async function batchFlag() {
  const updates = selectedSamples.value.map(uuid => ({
    uuid,
    status: 'flagged_regen_tts',
    reason: 'Batch flagged'
  }))
  await store.bulkUpdateFlags(updates)
  clearSelection()
}

// Helpers
function getConfidenceLevel(confidence) {
  const conf = confidence || 0.8
  if (conf >= 0.9) return 'high'
  if (conf >= 0.7) return 'medium'
  return 'low'
}

function resetFilters() {
  statusFilter.value = 'all'
  confidenceFilter.value = 'all'
  searchQuery.value = ''
}

function playSample(sample) {
  // TODO: Implement audio playback
  console.log('Play sample:', sample.uuid)
}

function onSampleFlagged(data) {
  console.log('Sample flagged:', data)
}
</script>

<style scoped>
.samples-browser {
  padding: 1.5rem;
  background: var(--color-void, #0a0b0f);
  min-height: 100vh;
}

/* Header */
.browser-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-graphite, #34384a);
}

.header-title h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-paper, #f7f7f2);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sample-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.header-controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.view-toggle {
  display: flex;
  background: var(--color-shadow, #16181f);
  border-radius: 8px;
  overflow: hidden;
}

.toggle-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  color: var(--color-paper-dim, #c1c1bb);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn.active {
  background: var(--color-tungsten, #ffa630);
  color: var(--color-void, #0a0b0f);
}

.filter-select {
  padding: 0.5rem 1rem;
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 8px;
  color: var(--color-paper, #f7f7f2);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
}

.search-input {
  padding: 0.5rem 1rem;
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 8px;
  color: var(--color-paper, #f7f7f2);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  min-width: 200px;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-tungsten, #ffa630);
}

/* Batch Actions */
.batch-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-tungsten, #ffa630);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.selection-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-tungsten, #ffa630);
  margin-right: auto;
}

.batch-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.batch-btn.approve {
  background: rgba(6, 255, 165, 0.15);
  border: 1px solid var(--color-emerald, #06ffa5);
  color: var(--color-emerald, #06ffa5);
}

.batch-btn.flag {
  background: rgba(255, 166, 48, 0.15);
  border: 1px solid var(--color-tungsten, #ffa630);
  color: var(--color-tungsten, #ffa630);
}

.batch-btn.clear {
  background: transparent;
  border: 1px solid var(--color-graphite, #34384a);
  color: var(--color-paper-dim, #c1c1bb);
}

/* Quick Stats */
.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.stat-value.approved { color: var(--color-emerald, #06ffa5); }
.stat-value.flagged { color: var(--color-tungsten, #ffa630); }
.stat-value.pending { color: var(--color-paper-dim, #c1c1bb); }
.stat-value.progress { color: var(--color-emerald, #06ffa5); }

.stat-label {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Grid View */
.samples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

/* List View */
.samples-list {
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 12px;
  overflow: hidden;
}

.list-header {
  display: grid;
  grid-template-columns: 40px 100px 1fr 120px 100px 120px;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-slate, #23262f);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-paper-dim, #c1c1bb);
}

.list-row {
  display: grid;
  grid-template-columns: 40px 100px 1fr 120px 100px 120px;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-graphite, #34384a);
  align-items: center;
  transition: background 0.2s ease;
}

.list-row:hover {
  background: rgba(255, 166, 48, 0.05);
}

.list-row.selected {
  background: rgba(255, 166, 48, 0.1);
}

.col-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.text-target {
  font-family: 'Crimson Pro', serif;
  color: var(--color-paper, #f7f7f2);
}

.text-known {
  font-size: 0.85rem;
  color: var(--color-paper-dim, #c1c1bb);
  font-style: italic;
}

.col-confidence {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 600;
}

.col-confidence.high { color: var(--color-emerald, #06ffa5); }
.col-confidence.medium { color: var(--color-tungsten, #ffa630); }
.col-confidence.low { color: var(--color-film-red, #e63946); }

.col-actions {
  display: flex;
  gap: 0.5rem;
}

.mini-btn {
  width: 32px;
  height: 32px;
  background: var(--color-void, #0a0b0f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 6px;
  color: var(--color-paper, #f7f7f2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mini-btn:hover {
  background: var(--color-tungsten, #ffa630);
  color: var(--color-void, #0a0b0f);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.reset-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: var(--color-tungsten, #ffa630);
  border: none;
  border-radius: 6px;
  color: var(--color-void, #0a0b0f);
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 600;
  cursor: pointer;
}

/* Responsive */
@media (max-width: 768px) {
  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .list-header,
  .list-row {
    grid-template-columns: 40px 1fr 100px;
  }

  .col-id,
  .col-confidence,
  .col-actions .mini-btn {
    display: none;
  }
}
</style>
```

---

### 7. Create Route: Update Router

Add routes for the QA tools. Find the router file (likely `src/router/index.js`) and add:

```javascript
// Add to routes array
{
  path: '/production/:courseCode/script',
  name: 'ScriptViewer',
  component: () => import('@/components/production/qa/ScriptViewer.vue'),
  props: true
},
{
  path: '/production/:courseCode/samples',
  name: 'SamplesBrowser',
  component: () => import('@/components/production/qa/SamplesBrowser.vue'),
  props: true
}
```

---

## Design Aesthetic Reference

Follow the cinematic dark palette from `new_vision/autocue-teleprompter-prototype.html`:

```css
:root {
  /* Cinematic Dark Palette */
  --color-void: #0a0b0f;
  --color-shadow: #16181f;
  --color-slate: #23262f;
  --color-graphite: #34384a;

  /* Accent Colors */
  --color-film-red: #e63946;
  --color-tungsten: #ffa630;
  --color-emerald: #06ffa5;

  /* Text */
  --color-paper: #f7f7f2;
  --color-paper-dim: #c1c1bb;

  /* Typography */
  --font-display: 'Crimson Pro', serif;
  --font-ui: 'Josefin Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/production/qa/StatusBadge.vue` | Status indicator component |
| `src/components/production/qa/FlagMenu.vue` | Flagging dropdown menu |
| `src/components/production/qa/SampleCard.vue` | Individual sample card |
| `src/components/production/qa/SamplesBrowser.vue` | Main samples browser |
| `src/components/production/qa/ScriptViewer.vue` | Enhanced script viewer (enhance existing or create) |
| `src/components/production/qa/CompareView.vue` | Side-by-side comparison (optional, stretch goal) |

---

## Success Criteria

Before creating your PR, verify:

- [ ] All components created in `src/components/production/qa/`
- [ ] Components use Pinia store from Master 1
- [ ] StatusBadge renders all status types correctly
- [ ] FlagMenu opens/closes and updates flags
- [ ] SamplesBrowser shows grid and list views
- [ ] Filters work (status, confidence, search)
- [ ] Batch actions work (select, approve, flag)
- [ ] Design matches cinematic dark aesthetic
- [ ] Routes added to router

---

## PR Instructions

When complete:

1. Commit all changes with descriptive message
2. Push branch to origin
3. Create PR with title: `[QA Tools] Script Viewer & Samples Browser`
4. PR body should list all files created/modified
5. Tag for review by Master Orchestrator

---

## Dependencies

- **Requires Master 1 complete**: You need the Pinia store and WebSocket service
- **Parallel with**: Masters 3 and 4 (no conflicts expected)

---

**You are Master 2 of 4. Your QA tools are where course producers spend most of their time. Make them powerful and delightful.**
