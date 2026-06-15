<template>
  <div class="audio-pipeline">
    <header class="pipeline-header">
      <div class="header-title">
        <h1>Audio Pipeline</h1>
        <span class="queue-count">{{ queueItems.length }} in queue</span>
      </div>

      <div class="header-actions">
        <button class="action-btn" @click="refreshQueue">
          Refresh
        </button>
        <button
          class="action-btn primary"
          @click="processQueue"
          :disabled="!hasItemsToProcess"
        >
          Process All
        </button>
      </div>
    </header>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat">
        <span class="stat-value">{{ stats.pending }}</span>
        <span class="stat-label">Pending</span>
      </div>
      <div class="stat">
        <span class="stat-value processing">{{ stats.processing }}</span>
        <span class="stat-label">Processing</span>
      </div>
      <div class="stat">
        <span class="stat-value complete">{{ stats.complete }}</span>
        <span class="stat-label">Complete</span>
      </div>
      <div class="stat">
        <span class="stat-value failed">{{ stats.failed }}</span>
        <span class="stat-label">Failed</span>
      </div>
    </div>

    <!-- Queue Filters -->
    <div class="queue-filters">
      <button
        v-for="filter in filters"
        :key="filter.value"
        class="filter-btn"
        :class="{ active: activeFilter === filter.value }"
        @click="activeFilter = filter.value"
      >
        {{ filter.label }} ({{ filter.count }})
      </button>
    </div>

    <!-- Queue List -->
    <div class="queue-list">
      <PipelineItem
        v-for="item in filteredItems"
        :key="item.uuid"
        :item="item"
        @retry="retryItem"
        @play="playItem"
        @remove="removeItem"
      />

      <div v-if="filteredItems.length === 0" class="empty-state">
        <p>No items in {{ activeFilter }} queue</p>
      </div>
    </div>

    <!-- Add from Flags -->
    <div class="add-section" v-if="flaggedForTTS.length > 0">
      <h3>Flagged for TTS Regeneration</h3>
      <p class="flagged-count">{{ flaggedForTTS.length }} samples waiting</p>
      <button class="action-btn primary" @click="addFlaggedToQueue">
        + Add All to Queue
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProductionStore } from '@/stores/production'
import PipelineItem from './PipelineItem.vue'

const store = useProductionStore()

// Local UI state
const activeFilter = ref('all')
const isProcessing = ref(false)

// Use store's generation queue as the source of truth
const queueItems = computed(() => store.generationQueue)

// Computed
const flaggedForTTS = computed(() => store.samplesByStatus.flagged_regen_tts)

const stats = computed(() => ({
  pending: queueItems.value.filter(i => i.status === 'pending' || i.status === 'queued').length,
  processing: queueItems.value.filter(i => i.status === 'processing').length,
  complete: queueItems.value.filter(i => i.status === 'complete').length,
  failed: queueItems.value.filter(i => i.status === 'failed').length
}))

const filters = computed(() => [
  { value: 'all', label: 'All', count: queueItems.value.length },
  { value: 'pending', label: 'Pending', count: stats.value.pending },
  { value: 'processing', label: 'Processing', count: stats.value.processing },
  { value: 'complete', label: 'Complete', count: stats.value.complete },
  { value: 'failed', label: 'Failed', count: stats.value.failed }
])

const filteredItems = computed(() => {
  if (activeFilter.value === 'all') return queueItems.value
  if (activeFilter.value === 'pending') {
    return queueItems.value.filter(i => i.status === 'pending' || i.status === 'queued')
  }
  return queueItems.value.filter(i => i.status === activeFilter.value)
})

const hasItemsToProcess = computed(() => stats.value.pending > 0 && store.jobStatus !== 'running')

// Actions
async function refreshQueue() {
  if (!store.currentCourseCode) return

  try {
    await store.loadCourse(store.currentCourseCode)
    console.log('[AudioPipeline] Queue refreshed')
  } catch (err) {
    console.error('[AudioPipeline] Failed to refresh queue:', err)
  }
}

async function processQueue() {
  if (!store.currentCourseCode || isProcessing.value) return

  isProcessing.value = true
  console.log('[AudioPipeline] Starting audio generation...')

  try {
    await store.startGeneration(store.currentCourseCode)
    console.log('[AudioPipeline] Generation started')
  } catch (err) {
    console.error('[AudioPipeline] Failed to start generation:', err)
  } finally {
    isProcessing.value = false
  }
}

async function addFlaggedToQueue() {
  const newItems = flaggedForTTS.value.map(sample => ({
    uuid: sample.uuid,
    seedId: sample.seedId,
    targetText: sample.target,
    knownText: sample.known,
    status: 'pending',
    progress: 0,
    queuedAt: new Date().toISOString()
  }))

  store.generationQueue.push(...newItems)

  await store.bulkUpdateFlags(
    flaggedForTTS.value.map(s => ({ uuid: s.uuid, status: 'in_pipeline' }))
  )
}

async function retryItem(item) {
  if (!store.currentCourseCode) return

  try {
    await store.retryFailed(store.currentCourseCode)
  } catch (err) {
    console.error('[AudioPipeline] Retry failed:', err)
  }
}

async function playItem(item) {
  if (!item.uuid) return

  // Direct S3 access (same pattern as learning app)
  const audioUrl = `https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/${item.uuid.toUpperCase()}.mp3`

  try {
    const audio = new Audio(audioUrl)
    await audio.play()
    console.log('[AudioPipeline] Playing:', item.uuid)
  } catch (err) {
    console.error('[AudioPipeline] Failed to play audio:', err)
  }
}

function removeItem(item) {
  const index = store.generationQueue.findIndex(i => i.uuid === item.uuid)
  if (index > -1) {
    store.generationQueue.splice(index, 1)
  }
}

// Watch for job status changes
watch(() => store.jobStatus, (newStatus) => {
  console.log('[AudioPipeline] Job status changed:', newStatus)
  if (newStatus === 'complete') {
    refreshQueue()
  }
})

// Component uses polling for progress updates (managed by parent view)
</script>

<style scoped>
.audio-pipeline {
  padding: 1.5rem;
  background: var(--canvas);
  min-height: 100vh;
}

.pipeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--surface-3);
}

.header-title h1 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.queue-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--muted);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  padding: 0.6rem 1.25rem;
  background: var(--surface-2);
  border: 1px solid var(--surface-3);
  border-radius: 8px;
  color: var(--ink);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--surface-3);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--accent), #e6951c);
  border-color: var(--accent);
  color: var(--canvas);
}

.action-btn.primary:hover {
  box-shadow: 0 0 16px rgba(255, 166, 48, 0.4);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Stats Bar */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat {
  background: var(--surface);
  border: 1px solid var(--surface-3);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 2rem;
  font-weight: 600;
  color: var(--ink);
}

.stat-value.processing { color: #06b6d4; }
.stat-value.complete { color: #06ffa5; }
.stat-value.failed { color: #e63946; }

.stat-label {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.75rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Queue Filters */
.queue-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.5rem 1rem;
  background: var(--surface);
  border: 1px solid var(--surface-3);
  border-radius: 20px;
  color: var(--muted);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  border-color: var(--accent);
}

.filter-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--canvas);
}

/* Queue List */
.queue-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--muted);
}

/* Add Section */
.add-section {
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}

.add-section h3 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  color: var(--ink);
  margin: 0 0 0.5rem 0;
}

.flagged-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--accent);
  margin: 0 0 1rem 0;
}

/* Responsive */
@media (max-width: 768px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
