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
          <option value="low">Low (&lt;70%)</option>
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
import { ref, computed, onMounted } from 'vue'
import { useProductionStore } from '@/stores/production'
import { initWebSocket, joinCourseRoom } from '@/services/websocket'
import SampleCard from './SampleCard.vue'
import StatusBadge from './StatusBadge.vue'
import FlagMenu from './FlagMenu.vue'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const store = useProductionStore()

// Load course data if not already loaded
onMounted(async () => {
  if (store.currentCourseCode !== props.courseCode) {
    initWebSocket()
    await store.loadCourse(props.courseCode)
    joinCourseRoom(props.courseCode)
  }
})

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
