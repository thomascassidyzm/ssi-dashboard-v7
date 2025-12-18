<template>
  <div class="generation-monitor">
    <!-- Header -->
    <div class="monitor-header">
      <div class="header-left">
        <h2 class="monitor-title">Course Pipeline</h2>
        <span class="course-badge">{{ pipeline?.courseCode || 'No Course' }}</span>
      </div>
      <div class="header-right">
        <span class="mode-badge" :class="pipeline?.mode">
          {{ modeLabel }}
        </span>
        <span class="status-indicator" :class="pipeline?.status">
          <span class="status-dot"></span>
          {{ statusLabel }}
        </span>
      </div>
    </div>

    <!-- Pipeline Progress Bar -->
    <PipelineProgress
      :phases="pipeline?.phases"
      :current-phase="pipeline?.currentPhase"
    />

    <!-- Phase Detail Cards -->
    <div class="phase-cards">
      <PhaseDetail
        v-for="(phase, key) in phaseList"
        :key="key"
        :phase-key="key"
        :phase="phase"
        :is-current="pipeline?.currentPhase === key"
        :is-expanded="expandedPhase === key"
        @toggle="togglePhaseExpand(key)"
      >
        <!-- Browser Lanes (for phases with browsers) -->
        <template v-if="phase.browsers && phase.browsers.length > 0">
          <div class="browser-lanes">
            <BrowserLane
              v-for="browser in phase.browsers"
              :key="browser.browserId"
              :browser="browser"
            />
          </div>
        </template>

        <!-- Seed Grid -->
        <template v-if="phase.seeds">
          <SeedGrid :seeds="phase.seeds" />
        </template>
      </PhaseDetail>
    </div>

    <!-- Event Log -->
    <EventLog
      :events="events"
      :max-events="100"
    />

    <!-- Summary Stats -->
    <div v-if="pipeline?.stats" class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ pipeline.stats.seedsComplete }}/{{ pipeline.stats.seedsTotal }}</span>
        <span class="stat-label">Seeds</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ pipeline.stats.legosGenerated }}</span>
        <span class="stat-label">LEGOs</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ pipeline.stats.basketsGenerated }}</span>
        <span class="stat-label">Baskets</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ pipeline.stats.audioFilesGenerated }}</span>
        <span class="stat-label">Audio Files</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ elapsedTime }}</span>
        <span class="stat-label">Elapsed</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { io } from 'socket.io-client'
import PipelineProgress from './PipelineProgress.vue'
import PhaseDetail from './PhaseDetail.vue'
import BrowserLane from './BrowserLane.vue'
import SeedGrid from './SeedGrid.vue'
import EventLog from './EventLog.vue'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  apiBaseUrl: {
    type: String,
    default: () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
  }
})

const emit = defineEmits(['pipeline-complete', 'pipeline-error'])

// State
const pipeline = ref(null)
const events = ref([])
const expandedPhase = ref(null)
const socket = ref(null)
const startTime = ref(null)
const elapsedSeconds = ref(0)
let elapsedInterval = null

// Computed
const modeLabel = computed(() => {
  const modes = {
    quick_test: 'Quick Test (10)',
    mvp_course: 'MVP Course (250)',
    full_course: 'Full Course (668)'
  }
  return modes[pipeline.value?.mode] || pipeline.value?.mode || 'Unknown'
})

const statusLabel = computed(() => {
  const statuses = {
    running: 'Running',
    complete: 'Complete',
    failed: 'Failed',
    paused: 'Paused'
  }
  return statuses[pipeline.value?.status] || 'Pending'
})

const phaseList = computed(() => {
  if (!pipeline.value?.phases) return {}
  return pipeline.value.phases
})

const elapsedTime = computed(() => {
  const secs = elapsedSeconds.value
  const mins = Math.floor(secs / 60)
  const hours = Math.floor(mins / 60)
  if (hours > 0) {
    return `${hours}h ${mins % 60}m`
  }
  if (mins > 0) {
    return `${mins}m ${secs % 60}s`
  }
  return `${secs}s`
})

// Methods
function togglePhaseExpand(key) {
  expandedPhase.value = expandedPhase.value === key ? null : key
}

function addEvent(event) {
  events.value.unshift({
    ...event,
    time: event.time || new Date().toISOString()
  })
  // Keep only last 100 events
  if (events.value.length > 100) {
    events.value = events.value.slice(0, 100)
  }
}

function connectWebSocket() {
  socket.value = io(props.apiBaseUrl, {
    path: '/api/orchestrator/websocket',
    transports: ['websocket', 'polling']
  })

  socket.value.on('connect', () => {
    console.log('[GenerationMonitor] WebSocket connected:', socket.value.id)
    // Subscribe to this course's updates
    socket.value.emit('subscribe', props.courseCode)
    addEvent({ event: 'system', level: 'info', message: 'Connected to orchestrator' })
  })

  // Full state update
  socket.value.on('job:state', (data) => {
    console.log('[GenerationMonitor] Job state received:', data)
    pipeline.value = data.pipeline || data.job
    if (pipeline.value?.startedAt) {
      startTime.value = new Date(pipeline.value.startedAt)
    }
  })

  // Pipeline-level events
  socket.value.on('pipeline:update', (data) => {
    pipeline.value = data.pipeline
    addEvent({ event: 'pipeline:update', level: 'info', message: `Pipeline status: ${data.pipeline?.status}` })
  })

  // Phase-level events
  socket.value.on('phase:update', (data) => {
    if (pipeline.value?.phases && data.phaseKey) {
      pipeline.value.phases[data.phaseKey] = data.phase
    }
    addEvent({ event: 'phase:update', level: 'info', message: `Phase ${data.phaseKey}: ${data.phase?.status}` })
  })

  // Browser events
  socket.value.on('browser:spawning', (data) => {
    addEvent({ event: 'browser:spawning', level: 'info', message: `Browser ${data.browserId} spawning with ${data.assignedSeeds?.length || 0} seeds` })
  })

  socket.value.on('browser:ready', (data) => {
    addEvent({ event: 'browser:ready', level: 'success', message: `Browser ${data.browserId} ready` })
  })

  socket.value.on('browser:complete', (data) => {
    addEvent({ event: 'browser:complete', level: 'success', message: `Browser ${data.browserId} complete` })
  })

  socket.value.on('browser:failed', (data) => {
    addEvent({ event: 'browser:failed', level: 'error', message: `Browser ${data.browserId} failed: ${data.error}` })
  })

  socket.value.on('browser:update', (data) => {
    updateBrowser(data.browser)
  })

  // Agent events
  socket.value.on('agent:spawning', (data) => {
    addEvent({ event: 'agent:spawning', level: 'info', message: `Agent ${data.agentId} spawning` })
  })

  socket.value.on('agent:running', (data) => {
    addEvent({ event: 'agent:running', level: 'info', message: `Agent ${data.agentId} running` })
  })

  socket.value.on('agent:complete', (data) => {
    addEvent({ event: 'agent:complete', level: 'success', message: `Agent ${data.agentId} completed ${data.completedSeeds?.length || 0} seeds` })
  })

  socket.value.on('agent:failed', (data) => {
    addEvent({ event: 'agent:failed', level: 'error', message: `Agent ${data.agentId} failed: ${data.error}` })
  })

  socket.value.on('agent:update', (data) => {
    updateAgent(data.agent)
  })

  // Seed events
  socket.value.on('seed:processing', (data) => {
    addEvent({ event: 'seed:processing', level: 'info', message: `Processing seed ${data.seedId}` })
  })

  socket.value.on('seed:complete', (data) => {
    addEvent({ event: 'seed:complete', level: 'success', message: `Seed ${data.seedId} complete` })
    updateStats()
  })

  socket.value.on('seed:failed', (data) => {
    addEvent({ event: 'seed:failed', level: 'error', message: `Seed ${data.seedId} failed: ${data.error}` })
  })

  socket.value.on('seed:update', (data) => {
    updateSeed(data.seed)
  })

  // Gap-fill events
  socket.value.on('gap-fill:triggered', (data) => {
    addEvent({ event: 'gap-fill:triggered', level: 'warning', message: `Gap-fill triggered for ${data.missingSeeds?.length || 0} seeds (attempt ${data.attempt})` })
  })

  socket.value.on('gap-fill:complete', (data) => {
    addEvent({ event: 'gap-fill:complete', level: 'success', message: `Gap-fill recovered ${data.recoveredSeeds?.length || 0} seeds` })
  })

  socket.value.on('gap-fill:failed', (data) => {
    addEvent({ event: 'gap-fill:failed', level: 'error', message: `Gap-fill failed, ${data.remainingSeeds?.length || 0} seeds still missing` })
  })

  // Log entries
  socket.value.on('log:entry', (data) => {
    addEvent({ event: 'log', level: data.log?.level || 'info', message: data.log?.message || '' })
  })

  // Completion events
  socket.value.on('pipeline:complete', (data) => {
    addEvent({ event: 'pipeline:complete', level: 'success', message: 'Pipeline complete!' })
    emit('pipeline-complete', data)
  })

  socket.value.on('pipeline:error', (data) => {
    addEvent({ event: 'pipeline:error', level: 'error', message: `Pipeline error: ${data.error}` })
    emit('pipeline-error', data)
  })

  socket.value.on('disconnect', () => {
    console.log('[GenerationMonitor] WebSocket disconnected')
    addEvent({ event: 'system', level: 'warning', message: 'Disconnected from orchestrator' })
  })

  socket.value.on('connect_error', (err) => {
    console.error('[GenerationMonitor] WebSocket error:', err)
    addEvent({ event: 'system', level: 'error', message: `Connection error: ${err.message}` })
  })
}

function disconnectWebSocket() {
  if (socket.value) {
    socket.value.emit('unsubscribe', props.courseCode)
    socket.value.disconnect()
    socket.value = null
  }
}

function updateBrowser(browser) {
  if (!pipeline.value?.phases || !browser?.browserId) return
  // Find the browser in all phases and update it
  for (const phase of Object.values(pipeline.value.phases)) {
    if (phase.browsers) {
      const idx = phase.browsers.findIndex(b => b.browserId === browser.browserId)
      if (idx !== -1) {
        phase.browsers[idx] = browser
        break
      }
    }
  }
}

function updateAgent(agent) {
  if (!pipeline.value?.phases || !agent?.agentId) return
  // Find the agent in all browsers and update it
  for (const phase of Object.values(pipeline.value.phases)) {
    if (phase.browsers) {
      for (const browser of phase.browsers) {
        if (browser.agents) {
          const idx = browser.agents.findIndex(a => a.agentId === agent.agentId)
          if (idx !== -1) {
            browser.agents[idx] = agent
            return
          }
        }
      }
    }
  }
}

function updateSeed(seed) {
  if (!pipeline.value?.phases || !seed?.seedId) return
  // Update seed in phase seeds tracking
  for (const phase of Object.values(pipeline.value.phases)) {
    if (phase.seeds) {
      // Find and update the seed
      const seedLists = ['pending', 'processing', 'completed', 'failed']
      for (const list of seedLists) {
        if (phase.seeds[list]) {
          const idx = phase.seeds[list].indexOf(seed.seedId)
          if (idx !== -1) {
            phase.seeds[list].splice(idx, 1)
          }
        }
      }
      // Add to correct list
      if (phase.seeds[seed.status]) {
        phase.seeds[seed.status].push(seed.seedId)
      }
    }
  }
}

function updateStats() {
  if (!pipeline.value?.stats) return
  // Stats will be updated via the next job:state event
}

function startElapsedTimer() {
  elapsedInterval = setInterval(() => {
    if (startTime.value && pipeline.value?.status === 'running') {
      elapsedSeconds.value = Math.floor((Date.now() - startTime.value.getTime()) / 1000)
    }
  }, 1000)
}

// Lifecycle
onMounted(() => {
  connectWebSocket()
  startElapsedTimer()
})

onUnmounted(() => {
  disconnectWebSocket()
  if (elapsedInterval) {
    clearInterval(elapsedInterval)
  }
})

// Watch for course code changes
watch(() => props.courseCode, (newCode, oldCode) => {
  if (newCode !== oldCode) {
    disconnectWebSocket()
    events.value = []
    pipeline.value = null
    connectWebSocket()
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

.mode-badge {
  padding: 0.25rem 0.625rem;
  background: var(--elevated);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-dim);
}

.mode-badge.quick_test {
  border-color: rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
}

.mode-badge.mvp_course {
  border-color: rgba(168, 85, 247, 0.3);
  background: rgba(168, 85, 247, 0.1);
  color: #c084fc;
}

.mode-badge.full_course {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.1);
  color: var(--accent);
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

.status-indicator.running .status-dot {
  background: var(--accent);
  animation: pulse 1.5s ease-in-out infinite;
}

.status-indicator.complete .status-dot {
  background: var(--success);
}

.status-indicator.failed .status-dot {
  background: var(--error);
}

.status-indicator.paused .status-dot {
  background: var(--warning);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

/* Phase Cards */
.phase-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Browser Lanes */
.browser-lanes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

/* Stats Bar */
.stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--elevated);
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.25rem;
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
}

/* Responsive */
@media (max-width: 640px) {
  .monitor-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-right {
    width: 100%;
    justify-content: flex-start;
  }

  .stats-bar {
    justify-content: flex-start;
  }

  .stat-item {
    flex: 1;
    min-width: 80px;
  }
}
</style>
