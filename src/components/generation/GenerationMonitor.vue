<template>
  <div class="generation-monitor">
    <!-- Back Link -->
    <router-link to="/" class="back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Dashboard
    </router-link>

    <!-- Header -->
    <div class="monitor-header">
      <div class="header-left">
        <h2 class="monitor-title">Course Pipeline</h2>
        <span class="course-badge">{{ courseCode || 'No Course' }}</span>
        <span class="status-indicator" :class="overallStatus">
          <span class="status-dot"></span>
          {{ statusLabel }}
        </span>
      </div>
      <div class="header-right">
        <!-- Control Bar -->
        <div class="control-bar">
          <!-- Mode Selector -->
          <div class="control-group">
            <label class="control-label">Mode</label>
            <select v-model="selectedMode" class="control-select" :disabled="isRunning">
              <option value="quick_test">Quick Test (10)</option>
              <option value="mvp_course">MVP (260)</option>
              <option value="full_course">Full (668)</option>
            </select>
          </div>

          <!-- Spawner Toggle -->
          <div class="control-group">
            <label class="control-label">Spawner</label>
            <div class="spawner-toggle">
              <button
                :class="['toggle-btn', { active: spawnerMode === 'cli' }]"
                @click="spawnerMode = 'cli'"
                :disabled="isRunning"
                title="iTerm2 + Claude CLI"
              >CLI</button>
              <button
                :class="['toggle-btn', { active: spawnerMode === 'browser' }]"
                @click="spawnerMode = 'browser'"
                :disabled="isRunning"
                title="Chrome + Claude Web"
              >Web</button>
            </div>
          </div>

          <!-- Divider -->
          <div class="control-divider"></div>

          <!-- Contextual Action Buttons -->
          <div class="action-buttons">
            <!-- Phase 1 Actions -->
            <button
              v-if="canResumePhase1"
              class="action-btn phase1"
              @click="resumePhase1"
              :disabled="isRunning"
            >
              <span class="btn-icon">1</span>
              Resume P1 ({{ missingPhase1Count }})
            </button>

            <button
              v-else-if="canStartPhase1"
              class="action-btn phase1"
              @click="startPhase1"
              :disabled="isRunning"
            >
              <span class="btn-icon">1</span>
              Start Phase 1
            </button>

            <!-- Phase 2 Actions -->
            <button
              v-if="canRunPhase2"
              class="action-btn phase2"
              @click="runPhase2"
              :disabled="isRunning"
            >
              <span class="btn-icon">2</span>
              Run Phase 2
            </button>

            <!-- Phase 3 Actions -->
            <button
              v-if="canRunPhase3"
              class="action-btn phase3"
              @click="runPhase3"
              :disabled="isRunning"
            >
              <span class="btn-icon">3</span>
              Run Phase 3
            </button>

            <!-- Stop Button (when running) -->
            <button
              v-if="isRunning"
              class="action-btn stop"
              @click="stopGeneration"
            >
              Stop
            </button>
          </div>
        </div>
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

    <!-- Course Size Indicator -->
    <div v-if="targetSeeds" class="course-size-bar">
      <div class="size-info">
        <span class="size-label">{{ courseModeName }}</span>
        <span class="size-pattern" v-if="pattern">{{ pattern.browsers }}x{{ pattern.agents_per_browser }}x{{ pattern.seeds_per_agent }}</span>
      </div>
      <div class="size-progress">
        <div class="size-progress-bar" :style="{ width: seedProgressPercent + '%' }"></div>
      </div>
      <div class="size-stats">
        <span>{{ stats.seedsComplete || 0 }} / {{ targetSeeds }} seeds</span>
        <span class="size-percent">{{ seedProgressPercent }}%</span>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.seedsComplete || 0 }}<span class="stat-target" v-if="targetSeeds">/{{ targetSeeds }}</span></div>
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
          <!-- Use detail string from API if available, otherwise fallback -->
          <template v-if="phases[phase].detail">
            {{ phases[phase].detail }}
          </template>
          <template v-else-if="phase === 'phase1'">
            {{ phases[phase].seedsComplete || 0 }}/{{ phases[phase].seedsTarget || targetSeeds }} seeds, {{ phases[phase].legosExtracted || 0 }} LEGOs
          </template>
          <template v-else-if="phase === 'phase2'">
            {{ phases[phase].legosResolved || 0 }} LEGOs resolved
          </template>
          <template v-else-if="phase === 'phase3'">
            {{ phases[phase].seedsComplete || 0 }}/{{ phases[phase].seedsTarget || targetSeeds }} seeds, {{ phases[phase].basketsGenerated || 0 }} phrases
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

    <!-- Queue Status (if queue is active) -->
    <div v-if="queue && queue.total > 0" class="queue-status">
      <div class="queue-header">
        <span class="queue-icon">📥</span>
        <span>Upload Queue</span>
      </div>
      <div class="queue-stats">
        <span class="queue-stat pending" v-if="queue.pending > 0">
          <span class="stat-num">{{ queue.pending }}</span> pending
        </span>
        <span class="queue-stat processing" v-if="queue.processing > 0">
          <span class="stat-num">{{ queue.processing }}</span> processing
        </span>
        <span class="queue-stat completed">
          <span class="stat-num">{{ queue.completed }}</span> completed
        </span>
        <span class="queue-stat failed" v-if="queue.failed > 0">
          <span class="stat-num">{{ queue.failed }}</span> failed
        </span>
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
const queue = ref(null)
const events = ref([])
const isPolling = ref(false)
const targetSeeds = ref(null)
const courseMode = ref('')
const pattern = ref(null)
let pollTimer = null
let lastStats = null
let consecutiveErrors = 0
let lastQueue = null

// Control bar state
const selectedMode = ref('mvp_course')
const spawnerMode = ref('cli')
const isRunning = ref(false)
const missingPhase1Count = ref(0)

// Computed for course size display
const courseModeName = computed(() => {
  const modeNames = {
    'quick_test': 'Quick Test (10 seeds)',
    'mvp_course': 'MVP Course (260 seeds)',
    'full_course': 'Full Course (668 seeds)'
  }
  return modeNames[courseMode.value] || courseMode.value
})

const seedProgressPercent = computed(() => {
  if (!targetSeeds.value || !stats.value.seedsComplete) return 0
  return Math.round((stats.value.seedsComplete / targetSeeds.value) * 100)
})

// Action button visibility
const canStartPhase1 = computed(() => {
  const p1 = phases.value.phase1
  return !p1 || p1.status === 'pending' || (!p1.seedsComplete && p1.status !== 'running')
})

const canResumePhase1 = computed(() => {
  const p1 = phases.value.phase1
  if (!p1) return false
  // Can resume if partial progress and not currently running
  const isPartial = p1.status === 'partial' || (p1.seedsComplete > 0 && p1.seedsComplete < (targetSeeds.value || 260))
  const isNotRunning = p1.status !== 'running' && overallStatus.value !== 'phase1_running'
  return isPartial && isNotRunning
})

const canRunPhase2 = computed(() => {
  const p1 = phases.value.phase1
  const p2 = phases.value.phase2
  if (!p1) return false
  // Phase 1 must be complete or have enough seeds
  const p1Ready = p1.status === 'complete' || (p1.seedsComplete >= (targetSeeds.value || 10))
  const p2NotComplete = !p2 || p2.status !== 'complete'
  const notRunning = overallStatus.value !== 'phase2_running'
  return p1Ready && p2NotComplete && notRunning
})

const canRunPhase3 = computed(() => {
  const p2 = phases.value.phase2
  const p3 = phases.value.phase3
  if (!p2) return false
  // Phase 2 must be complete
  const p2Complete = p2.status === 'complete'
  const p3NotComplete = !p3 || p3.status !== 'complete'
  const notRunning = overallStatus.value !== 'phase3_running'
  return p2Complete && p3NotComplete && notRunning
})

// Constants
const phaseOrder = ['phase1', 'phase2', 'phase3', 'audio', 'manifest']
const phaseLabels = {
  phase1: 'Phase 1: Translation & LEGO Extraction',
  phase2: 'Phase 2: Conflict Resolution',
  phase3: 'Phase 3: Basket Generation',
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
const targetLang = computed(() => {
  // Extract from courseCode like "zho_for_eng" -> "zho"
  const match = props.courseCode?.match(/^(\w+)_for_/)
  return match ? match[1] : ''
})

const knownLang = computed(() => {
  // Extract from courseCode like "zho_for_eng" -> "eng"
  const match = props.courseCode?.match(/_for_(\w+)$/)
  return match ? match[1] : ''
})

const statusLabel = computed(() => {
  const labels = {
    idle: 'Idle',
    phase1_running: 'Phase 1 Running',
    phase1_complete: 'Phase 1 Complete',
    phase2_running: 'Phase 2 Running',
    phase2_complete: 'Phase 2 Complete',
    phase3_running: 'Phase 3 Running',
    phase3_complete: 'Phase 3 Complete',
    phase3_stalled: 'Phase 3 STALLED',
    running: 'Running',
    complete: 'Complete',
    stalled: 'STALLED',
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
    partial: status === 'partial',
    complete: status === 'complete',
    stalled: status === 'stalled',
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
    queue.value = data.queue || null
    targetSeeds.value = data.targetSeeds || null
    courseMode.value = data.courseMode || ''
    pattern.value = data.pattern || null
    consecutiveErrors = 0 // Reset error count on success

    // Update running state from status
    const runningStates = ['phase1_running', 'phase2_running', 'phase3_running', 'running']
    isRunning.value = runningStates.includes(data.overallStatus)

    // Calculate missing phase 1 seeds
    const p1 = data.phases?.phase1
    if (p1 && targetSeeds.value) {
      const completed = p1.seedsComplete || 0
      missingPhase1Count.value = Math.max(0, targetSeeds.value - completed)
    }

    // Update selected mode from server if available
    if (data.courseMode && !selectedMode.value) {
      selectedMode.value = data.courseMode
    }

    // Check for queue changes and log them
    if (data.queue && lastQueue) {
      if (data.queue.pending !== lastQueue.pending && data.queue.pending > 0) {
        addEvent('info', `Queue: ${data.queue.pending} pending uploads`)
      }
      if (data.queue.completed > lastQueue.completed) {
        addEvent('success', `Queue: ${data.queue.completed - lastQueue.completed} uploads processed`)
      }
    }
    lastQueue = data.queue ? { ...data.queue } : null

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
    // Silently handle poll errors - only log occasionally to avoid console spam
    consecutiveErrors = (consecutiveErrors || 0) + 1
    if (consecutiveErrors === 1 || consecutiveErrors % 10 === 0) {
      console.warn('[GenerationMonitor] Poll error (x' + consecutiveErrors + '):', error.message)
    }
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

// Generation action methods
async function startPhase1() {
  isRunning.value = true
  addEvent('info', 'Starting Phase 1 generation...')

  try {
    const response = await fetch(`${props.apiBaseUrl}/api/courses/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode: props.courseCode,
        target: targetLang.value,
        known: knownLang.value,
        mode: selectedMode.value,
        phaseSelection: 'phase1',
        spawnerMode: spawnerMode.value
      })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to start Phase 1')
    }

    addEvent('success', 'Phase 1 generation started')
  } catch (error) {
    addEvent('error', `Failed: ${error.message}`)
    isRunning.value = false
  }
}

async function resumePhase1() {
  isRunning.value = true
  addEvent('info', `Resuming Phase 1 (${missingPhase1Count.value} seeds)...`)

  try {
    const response = await fetch(`${props.apiBaseUrl}/api/courses/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode: props.courseCode,
        target: targetLang.value,
        known: knownLang.value,
        mode: selectedMode.value,
        phaseSelection: 'phase1',
        spawnerMode: spawnerMode.value,
        resume: true
      })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to resume Phase 1')
    }

    addEvent('success', 'Phase 1 resume started')
  } catch (error) {
    addEvent('error', `Failed: ${error.message}`)
    isRunning.value = false
  }
}

async function runPhase2() {
  isRunning.value = true
  addEvent('info', 'Running Phase 2 (Conflict Resolution)...')

  try {
    const response = await fetch(`${props.apiBaseUrl}/api/courses/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode: props.courseCode,
        target: targetLang.value,
        known: knownLang.value,
        mode: selectedMode.value,
        phaseSelection: 'phase2',
        spawnerMode: spawnerMode.value
      })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to run Phase 2')
    }

    addEvent('success', 'Phase 2 started')
  } catch (error) {
    addEvent('error', `Failed: ${error.message}`)
    isRunning.value = false
  }
}

async function runPhase3() {
  isRunning.value = true
  addEvent('info', 'Running Phase 3 (Basket Generation)...')

  try {
    const response = await fetch(`${props.apiBaseUrl}/api/courses/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode: props.courseCode,
        target: targetLang.value,
        known: knownLang.value,
        mode: selectedMode.value,
        phaseSelection: 'phase3',
        spawnerMode: spawnerMode.value
      })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to run Phase 3')
    }

    addEvent('success', 'Phase 3 started')
  } catch (error) {
    addEvent('error', `Failed: ${error.message}`)
    isRunning.value = false
  }
}

async function stopGeneration() {
  addEvent('warning', 'Stopping generation...')

  try {
    // Cancel on orchestrator
    await fetch(`${props.apiBaseUrl}/api/cancel/${props.courseCode}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    // Cancel on Phase 1 server
    await fetch(`${props.apiBaseUrl}/api/phase1/${props.courseCode}/cancel`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    addEvent('warning', 'Generation stopped')
    isRunning.value = false
  } catch (error) {
    addEvent('error', `Stop failed: ${error.message}`)
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

/* Back Link */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--accent);
  text-decoration: none;
  font-size: 0.875rem;
  margin-bottom: -0.5rem;
  transition: color 0.15s;
}
.back-link:hover {
  color: var(--text);
}
.back-link svg {
  flex-shrink: 0;
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
.status-indicator.running .status-dot,
.status-indicator.phase1_running .status-dot,
.status-indicator.phase2_running .status-dot,
.status-indicator.phase3_running .status-dot { background: var(--accent); animation: pulse 1.5s ease-in-out infinite; }
.status-indicator.phase1_complete .status-dot,
.status-indicator.phase2_complete .status-dot,
.status-indicator.phase3_complete .status-dot,
.status-indicator.complete .status-dot { background: var(--success); }
.status-indicator.phase3_stalled .status-dot,
.status-indicator.stalled .status-dot { background: var(--error); animation: blink 1s ease-in-out infinite; }
.status-indicator.failed .status-dot { background: var(--error); }

.source-badge {
  padding: 0.25rem 0.5rem;
  background: var(--elevated);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* Control Bar */
.control-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  background: var(--void);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.control-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.control-select {
  padding: 0.375rem 0.5rem;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  min-width: 100px;
}

.control-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spawner-toggle {
  display: flex;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.toggle-btn {
  padding: 0.375rem 0.625rem;
  background: var(--elevated);
  border: none;
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn:first-child {
  border-right: 1px solid var(--border);
}

.toggle-btn.active {
  background: var(--accent);
  color: white;
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-divider {
  width: 1px;
  height: 32px;
  background: var(--border);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.action-btn:hover:not(:disabled) {
  background: var(--border);
  border-color: var(--accent);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn .btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: var(--void);
  border-radius: 50%;
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--accent);
}

.action-btn.phase1 .btn-icon { color: #3b82f6; }
.action-btn.phase2 .btn-icon { color: #8b5cf6; }
.action-btn.phase3 .btn-icon { color: #10b981; }

.action-btn.stop {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.action-btn.stop:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

/* Course Size Indicator */
.course-size-bar {
  background: var(--elevated);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
}

.size-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.size-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
}

.size-pattern {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: var(--void);
  border-radius: 4px;
  color: var(--accent);
}

.size-progress {
  height: 6px;
  background: var(--void);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.size-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-dim));
  border-radius: 3px;
  transition: width 0.5s ease;
}

.size-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.size-percent {
  font-weight: 600;
  color: var(--accent);
}

.stat-target {
  font-size: 0.875rem;
  color: var(--text-muted);
  font-weight: 400;
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

.phase-segment.partial {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.1));
  border: 1px solid rgba(234, 179, 8, 0.3);
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
.phase-segment.partial .phase-label { color: var(--warning); }
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
.phase-card.partial { border-left-color: var(--warning); }
.phase-card.running { border-left-color: var(--info); }
.phase-card.stalled { border-left-color: var(--error); background: rgba(239, 68, 68, 0.1); }
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

.phase-card.partial .phase-status-badge {
  background: rgba(234, 179, 8, 0.15);
  color: var(--warning);
}

.phase-card.stalled .phase-status-badge {
  background: rgba(239, 68, 68, 0.2);
  color: var(--error);
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.phase-detail {
  font-size: 0.875rem;
  color: var(--text-dim);
  font-family: 'SF Mono', Monaco, monospace;
}

/* Queue Status */
.queue-status {
  background: var(--elevated);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.queue-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.queue-icon {
  font-size: 1rem;
}

.queue-stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.queue-stat {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.queue-stat .stat-num {
  font-weight: 700;
  font-family: 'SF Mono', Monaco, monospace;
}

.queue-stat.pending .stat-num {
  color: #f59e0b;
}

.queue-stat.processing .stat-num {
  color: #3b82f6;
}

.queue-stat.completed .stat-num {
  color: #10b981;
}

.queue-stat.failed .stat-num {
  color: #ef4444;
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
@media (max-width: 900px) {
  .monitor-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .control-bar {
    flex-wrap: wrap;
    width: 100%;
  }

  .action-buttons {
    flex-wrap: wrap;
  }
}

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

  .control-bar {
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .control-divider {
    display: none;
  }

  .action-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.6875rem;
  }
}
</style>
