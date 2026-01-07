<template>
  <div class="generation-monitor">
    <!-- Header -->
    <div class="monitor-header">
      <div class="header-left">
        <h2 class="monitor-title">Course Pipeline</h2>
        <span class="course-badge">{{ courseCode || 'No Course' }}</span>
      </div>
      <div class="header-right">
        <span class="status-indicator" :class="overallStatus">
          <span class="status-dot"></span>
          {{ statusLabel }}
        </span>
        <span class="source-badge" v-if="dataSource">
          {{ dataSource }}
        </span>
      </div>
    </div>

    <!-- Pipeline Progress Bar -->
    <div class="pipeline-bar">
      <div
        v-for="phase in phaseOrder"
        :key="phase"
        class="phase-segment"
        :class="getPhaseClass(phase)"
      >
        <span class="phase-label">{{ phaseLabels[phase] }}</span>
        <span class="phase-count" v-if="phases[phase]?.count">
          {{ phases[phase].count }}
        </span>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.seedsComplete || 0 }}</div>
        <div class="stat-label">Seeds</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.legosGenerated || 0 }}</div>
        <div class="stat-label">LEGOs</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.newLegos || 0 }}</div>
        <div class="stat-label">New LEGOs</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.basketsGenerated || 0 }}</div>
        <div class="stat-label">Practice Phrases</div>
      </div>
    </div>

    <!-- Phase Details -->
    <div class="phase-cards">
      <div
        v-for="phase in phaseOrder"
        :key="phase"
        class="phase-card"
        :class="getPhaseClass(phase)"
      >
        <div class="phase-header">
          <span class="phase-icon">{{ phaseIcons[phase] }}</span>
          <span class="phase-name">{{ phaseLabels[phase] }}</span>
          <span class="phase-status-badge">{{ phases[phase]?.status || 'pending' }}</span>
        </div>
        <div class="phase-detail" v-if="phases[phase]">
          <template v-if="phase === 'phase1'">
            {{ phases[phase].seedsProcessed || 0 }} seeds, {{ phases[phase].legosExtracted || 0 }} LEGOs
          </template>
          <template v-else-if="phase === 'phase2'">
            {{ phases[phase].legosResolved || 0 }} LEGOs resolved
          </template>
          <template v-else-if="phase === 'phase3'">
            {{ phases[phase].basketsGenerated || 0 }} practice phrases
          </template>
          <template v-else-if="phase === 'audio'">
            {{ phases[phase].samplesGenerated || 0 }} audio samples
          </template>
          <template v-else>
            {{ phases[phase].status }}
          </template>
        </div>
      </div>
    </div>

    <!-- Event Log -->
    <div class="event-log">
      <div class="log-header">
        <span>Event Log</span>
        <span class="poll-indicator" :class="{ polling: isPolling }">
          {{ isPolling ? 'Polling...' : 'Idle' }}
        </span>
      </div>
      <div class="log-entries">
        <div
          v-for="(event, idx) in events"
          :key="idx"
          class="log-entry"
          :class="event.level"
        >
          <span class="log-time">{{ formatTime(event.time) }}</span>
          <span class="log-message">{{ event.message }}</span>
        </div>
        <div v-if="events.length === 0" class="log-empty">
          No events yet. Polling database every {{ pollInterval / 1000 }}s...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  apiBaseUrl: {
    type: String,
    default: () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
  },
  pollInterval: {
    type: Number,
    default: 3000 // Poll every 3 seconds
  }
})

const emit = defineEmits(['pipeline-complete', 'pipeline-error'])

// State
const overallStatus = ref('idle')
const dataSource = ref('')
const stats = ref({})
const phases = ref({})
const events = ref([])
const isPolling = ref(false)
let pollTimer = null
let lastStats = null

// Constants
const phaseOrder = ['phase1', 'phase2', 'phase3', 'audio', 'manifest']
const phaseLabels = {
  phase1: 'Phase 1: Translation',
  phase2: 'Phase 2: Conflicts',
  phase3: 'Phase 3: Practice',
  audio: 'Audio',
  manifest: 'Manifest'
}
const phaseIcons = {
  phase1: '🌱',
  phase2: '🔀',
  phase3: '📦',
  audio: '🔊',
  manifest: '📋'
}

// Computed
const statusLabel = computed(() => {
  const labels = {
    idle: 'Idle',
    phase1_complete: 'Phase 1 Complete',
    phase2_complete: 'Phase 2 Complete',
    phase3_complete: 'Phase 3 Complete',
    running: 'Running',
    complete: 'Complete',
    failed: 'Failed'
  }
  return labels[overallStatus.value] || overallStatus.value
})

// Methods
function getPhaseClass(phase) {
  const status = phases.value[phase]?.status || 'pending'
  return {
    pending: status === 'pending',
    running: status === 'running',
    complete: status === 'complete',
    failed: status === 'failed'
  }
}

function formatTime(isoTime) {
  if (!isoTime) return ''
  const date = new Date(isoTime)
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function addEvent(level, message) {
  events.value.unshift({
    time: new Date().toISOString(),
    level,
    message
  })
  // Keep only last 50 events
  if (events.value.length > 50) {
    events.value = events.value.slice(0, 50)
  }
}

async function pollProgress() {
  if (isPolling.value) return
  isPolling.value = true

  try {
    const response = await fetch(`${props.apiBaseUrl}/api/courses/${props.courseCode}/progress`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    // Update state
    overallStatus.value = data.overallStatus || 'idle'
    dataSource.value = data.source || ''
    stats.value = data.stats || {}
    phases.value = data.phases || {}

    // Check for changes and log them
    if (lastStats) {
      if (data.stats?.seedsComplete !== lastStats.seedsComplete) {
        addEvent('info', `Seeds: ${lastStats.seedsComplete || 0} → ${data.stats?.seedsComplete || 0}`)
      }
      if (data.stats?.legosGenerated !== lastStats.legosGenerated) {
        addEvent('info', `LEGOs: ${lastStats.legosGenerated || 0} → ${data.stats?.legosGenerated || 0}`)
      }
      if (data.stats?.basketsGenerated !== lastStats.basketsGenerated) {
        addEvent('success', `Practice phrases: ${lastStats.basketsGenerated || 0} → ${data.stats?.basketsGenerated || 0}`)
      }
    } else if (data.stats?.seedsComplete > 0) {
      addEvent('info', `Loaded: ${data.stats.seedsComplete} seeds, ${data.stats.legosGenerated} LEGOs, ${data.stats.basketsGenerated} practice phrases`)
    }

    lastStats = { ...data.stats }

    // Emit completion if phase3 is complete
    if (data.overallStatus === 'phase3_complete') {
      emit('pipeline-complete', data)
    }

  } catch (error) {
    console.error('[GenerationMonitor] Poll error:', error)
    addEvent('error', `Poll failed: ${error.message}`)
  } finally {
    isPolling.value = false
  }
}

function startPolling() {
  // Initial poll
  pollProgress()

  // Set up interval
  pollTimer = setInterval(pollProgress, props.pollInterval)
  addEvent('info', 'Started polling database')
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// Lifecycle
onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

// Watch for course code changes
watch(() => props.courseCode, (newCode, oldCode) => {
  if (newCode !== oldCode) {
    stopPolling()
    events.value = []
    stats.value = {}
    phases.value = {}
    lastStats = null
    startPolling()
  }
})
</script>

<style scoped>
.generation-monitor {
  --void: #0f172a;
  --deep: #1e293b;
  --surface: #1e293b;
  --elevated: #334155;
  --border: #334155;
  --border-light: #475569;
  --text: #f1f5f9;
  --text-dim: #94a3b8;
  --text-muted: #64748b;
  --accent: #10b981;
  --accent-dim: #059669;
  --accent-glow: rgba(16, 185, 129, 0.15);
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
  --info: #3b82f6;

  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Header */
.monitor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.monitor-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.course-badge {
  padding: 0.375rem 0.75rem;
  background: var(--accent-glow);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 6px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.875rem;
  color: var(--accent);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-dim);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.status-indicator.idle .status-dot { background: var(--text-muted); }
.status-indicator.running .status-dot { background: var(--accent); animation: pulse 1.5s ease-in-out infinite; }
.status-indicator.phase1_complete .status-dot,
.status-indicator.phase2_complete .status-dot,
.status-indicator.phase3_complete .status-dot,
.status-indicator.complete .status-dot { background: var(--success); }
.status-indicator.failed .status-dot { background: var(--error); }

.source-badge {
  padding: 0.25rem 0.5rem;
  background: var(--elevated);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

/* Pipeline Bar */
.pipeline-bar {
  display: flex;
  gap: 2px;
  background: var(--void);
  border-radius: 8px;
  padding: 4px;
}

.phase-segment {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  background: var(--elevated);
  border-radius: 6px;
  transition: all 0.3s ease;
}

.phase-segment.complete {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.phase-segment.running {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.phase-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.phase-segment.complete .phase-label { color: var(--accent); }
.phase-segment.running .phase-label { color: var(--info); }

.phase-count {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text);
  font-family: 'SF Mono', Monaco, monospace;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  background: var(--elevated);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  font-family: 'SF Mono', Monaco, monospace;
}

.stat-label {
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

/* Phase Cards */
.phase-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.phase-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--elevated);
  border-radius: 8px;
  border-left: 3px solid var(--border);
}

.phase-card.complete { border-left-color: var(--success); }
.phase-card.running { border-left-color: var(--info); }
.phase-card.failed { border-left-color: var(--error); }

.phase-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.phase-icon { font-size: 1.25rem; }
.phase-name {
  font-weight: 600;
  color: var(--text);
}

.phase-status-badge {
  padding: 0.125rem 0.5rem;
  background: var(--void);
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--text-muted);
}

.phase-card.complete .phase-status-badge {
  background: rgba(34, 197, 94, 0.15);
  color: var(--success);
}

.phase-detail {
  font-size: 0.875rem;
  color: var(--text-dim);
  font-family: 'SF Mono', Monaco, monospace;
}

/* Event Log */
.event-log {
  background: var(--void);
  border-radius: 8px;
  overflow: hidden;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--elevated);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.poll-indicator {
  padding: 0.125rem 0.5rem;
  background: var(--void);
  border-radius: 4px;
  font-size: 0.625rem;
}

.poll-indicator.polling {
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent);
}

.log-entries {
  max-height: 200px;
  overflow-y: auto;
  padding: 0.5rem;
}

.log-entry {
  display: flex;
  gap: 0.75rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  font-family: 'SF Mono', Monaco, monospace;
  border-radius: 4px;
}

.log-entry:hover {
  background: var(--elevated);
}

.log-entry.info { color: var(--text-dim); }
.log-entry.success { color: var(--success); }
.log-entry.warning { color: var(--warning); }
.log-entry.error { color: var(--error); }

.log-time {
  color: var(--text-muted);
  min-width: 65px;
}

.log-empty {
  padding: 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .phase-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .phase-detail {
    font-size: 0.75rem;
  }
}
</style>
