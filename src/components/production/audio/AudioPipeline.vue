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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useProductionStore } from '@/stores/production'
import PipelineItem from './PipelineItem.vue'

const store = useProductionStore()

// Queue state
const queueItems = ref([])
const activeFilter = ref('all')

// Computed
const flaggedForTTS = computed(() => store.samplesByStatus.flagged_regen_tts)

const stats = computed(() => ({
  pending: queueItems.value.filter(i => i.status === 'pending').length,
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
  return queueItems.value.filter(i => i.status === activeFilter.value)
})

const hasItemsToProcess = computed(() => stats.value.pending > 0)

// Actions
async function refreshQueue() {
  // TODO: Fetch queue from API
  console.log('Refreshing queue...')
}

async function processQueue() {
  // TODO: Start processing all pending items
  console.log('Processing queue...')

  // Simulate processing for demo
  const pendingItems = queueItems.value.filter(i => i.status === 'pending')
  for (const item of pendingItems) {
    item.status = 'processing'
    item.progress = 0

    // Simulate progress
    const progressInterval = setInterval(() => {
      item.progress += 10
      if (item.progress >= 100) {
        clearInterval(progressInterval)
        item.status = Math.random() > 0.1 ? 'complete' : 'failed'
        item.duration = (Math.random() * 2 + 1).toFixed(1)
        if (item.status === 'failed') {
          item.error = 'TTS API timeout - please retry'
        }
      }
    }, 500)
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

  queueItems.value.push(...newItems)

  // Update flags to in_pipeline
  await store.bulkUpdateFlags(
    flaggedForTTS.value.map(s => ({ uuid: s.uuid, status: 'in_pipeline' }))
  )
}

function retryItem(item) {
  const index = queueItems.value.findIndex(i => i.uuid === item.uuid)
  if (index > -1) {
    queueItems.value[index].status = 'pending'
    queueItems.value[index].progress = 0
    queueItems.value[index].error = null
  }
}

function playItem(item) {
  // TODO: Play audio preview
  console.log('Playing:', item.uuid)
}

function removeItem(item) {
  const index = queueItems.value.findIndex(i => i.uuid === item.uuid)
  if (index > -1) {
    queueItems.value.splice(index, 1)
  }
}

// WebSocket listener for pipeline progress
function handlePipelineProgress(event) {
  const data = event.detail
  const index = queueItems.value.findIndex(i => i.uuid === data.uuid)
  if (index > -1) {
    queueItems.value[index].status = data.status
    queueItems.value[index].progress = data.progress || 0
    if (data.error) {
      queueItems.value[index].error = data.error
    }
    if (data.duration) {
      queueItems.value[index].duration = data.duration
    }
  }
}

onMounted(() => {
  window.addEventListener('pipeline_progress', handlePipelineProgress)

  // Add some demo items if queue is empty
  if (queueItems.value.length === 0) {
    queueItems.value = [
      {
        uuid: 'demo-001-uuid-12345',
        seedId: 'S0001',
        targetText: 'Hola, buenos dias',
        knownText: 'Hello, good morning',
        status: 'complete',
        progress: 100,
        duration: 1.8,
        queuedAt: new Date(Date.now() - 300000).toISOString()
      },
      {
        uuid: 'demo-002-uuid-67890',
        seedId: 'S0002',
        targetText: 'Como estas hoy',
        knownText: 'How are you today',
        status: 'processing',
        progress: 65,
        queuedAt: new Date(Date.now() - 120000).toISOString()
      },
      {
        uuid: 'demo-003-uuid-11111',
        seedId: 'S0003',
        targetText: 'Muy bien, gracias',
        knownText: 'Very well, thank you',
        status: 'pending',
        progress: 0,
        queuedAt: new Date(Date.now() - 60000).toISOString()
      },
      {
        uuid: 'demo-004-uuid-22222',
        seedId: 'S0004',
        targetText: 'Hasta luego',
        knownText: 'See you later',
        status: 'failed',
        progress: 0,
        error: 'TTS API timeout',
        queuedAt: new Date(Date.now() - 180000).toISOString()
      }
    ]
  }
})

onUnmounted(() => {
  window.removeEventListener('pipeline_progress', handlePipelineProgress)
})
</script>

<style scoped>
.audio-pipeline {
  padding: 1.5rem;
  background: #0f172a;
  min-height: 100vh;
}

.pipeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #475569;
}

.header-title h1 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: #f7f7f2;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.queue-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: #c1c1bb;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  padding: 0.6rem 1.25rem;
  background: #334155;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #f7f7f2;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #475569;
}

.action-btn.primary {
  background: linear-gradient(135deg, #ffa630, #e6951c);
  border-color: #ffa630;
  color: #0f172a;
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
  background: #1e293b;
  border: 1px solid #475569;
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 2rem;
  font-weight: 600;
  color: #f7f7f2;
}

.stat-value.processing { color: #06b6d4; }
.stat-value.complete { color: #06ffa5; }
.stat-value.failed { color: #e63946; }

.stat-label {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.75rem;
  color: #c1c1bb;
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
  background: #1e293b;
  border: 1px solid #475569;
  border-radius: 20px;
  color: #c1c1bb;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  border-color: #ffa630;
}

.filter-btn.active {
  background: #ffa630;
  border-color: #ffa630;
  color: #0f172a;
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
  color: #c1c1bb;
}

/* Add Section */
.add-section {
  background: #1e293b;
  border: 1px solid #ffa630;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}

.add-section h3 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  color: #f7f7f2;
  margin: 0 0 0.5rem 0;
}

.flagged-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: #ffa630;
  margin: 0 0 1rem 0;
}

/* Responsive */
@media (max-width: 768px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
