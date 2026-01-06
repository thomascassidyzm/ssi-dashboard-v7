<template>
  <div class="agent-swimlane">
    <!-- Ambient Background Effects -->
    <div class="swimlane-ambient">
      <div class="grid-lines"></div>
      <div class="scan-line"></div>
    </div>

    <!-- Header Bar -->
    <header class="swimlane-header">
      <div class="header-left">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0-6v6m18-6v6"/>
          </svg>
        </div>
        <div class="header-titles">
          <h1>AGENT SWIMLANE</h1>
          <span class="header-subtitle">Pipeline Orchestration Monitor</span>
        </div>
      </div>

      <div class="header-right">
        <div class="course-badge">
          <span class="badge-label">COURSE</span>
          <span class="badge-value">{{ courseCode }}</span>
        </div>

        <div class="status-indicator" :class="overallStatus">
          <span class="status-dot"></span>
          <span class="status-text">{{ statusLabel }}</span>
        </div>

        <div class="refresh-indicator" :class="{ active: isRefreshing }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
      </div>
    </header>

    <!-- Main Content Grid -->
    <div class="swimlane-content">
      <!-- Phase Swimlanes -->
      <div class="swimlanes-container">
        <!-- Phase 1: Translation -->
        <div class="phase-lane" :class="getPhaseClass('phase1')">
          <div class="lane-header">
            <div class="lane-number">01</div>
            <div class="lane-info">
              <span class="lane-title">TRANSLATION</span>
              <span class="lane-subtitle">LEGO Extraction</span>
            </div>
            <div class="lane-status-badge" :class="phases.phase1?.status">
              {{ phases.phase1?.status || 'pending' }}
            </div>
          </div>
          <div class="lane-track">
            <div class="track-line"></div>
            <div v-if="phases.phase1?.status === 'complete'" class="track-complete-marker">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
              <span>{{ phases.phase1?.seedsProcessed || 0 }} seeds</span>
            </div>
            <div v-else-if="phases.phase1?.status === 'running'" class="track-running-indicator">
              <div class="pulse-ring"></div>
              <span>Processing...</span>
            </div>
          </div>
        </div>

        <!-- Phase 2: Conflict Resolution -->
        <div class="phase-lane" :class="getPhaseClass('phase2')">
          <div class="lane-header">
            <div class="lane-number">02</div>
            <div class="lane-info">
              <span class="lane-title">CONFLICT</span>
              <span class="lane-subtitle">Resolution</span>
            </div>
            <div class="lane-status-badge" :class="phases.phase2?.status">
              {{ phases.phase2?.status || 'pending' }}
            </div>
          </div>
          <div class="lane-track">
            <div class="track-line"></div>
            <div v-if="phases.phase2?.status === 'complete'" class="track-complete-marker">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
              <span>{{ phases.phase2?.legosResolved || 0 }} LEGOs</span>
            </div>
            <div v-else-if="phases.phase2?.status === 'running'" class="track-running-indicator">
              <div class="pulse-ring"></div>
              <span>Resolving...</span>
            </div>
          </div>
        </div>

        <!-- Phase 3: Basket Generation - THE MAIN EVENT -->
        <div class="phase-lane phase-lane-expanded" :class="getPhaseClass('phase3')">
          <div class="lane-header">
            <div class="lane-number">03</div>
            <div class="lane-info">
              <span class="lane-title">BASKETS</span>
              <span class="lane-subtitle">Multi-Agent Generation</span>
            </div>
            <div class="lane-status-badge" :class="phases.phase3?.status">
              {{ phases.phase3?.status || 'pending' }}
            </div>
            <div v-if="phases.phase3?.masters?.length" class="lane-meta">
              <span class="meta-item">
                <span class="meta-value">{{ phases.phase3.masters.length }}</span>
                <span class="meta-label">Masters</span>
              </span>
              <span class="meta-item">
                <span class="meta-value">{{ totalWorkers }}</span>
                <span class="meta-label">Workers</span>
              </span>
              <span class="meta-item">
                <span class="meta-value">{{ totalLegosReceived }}/{{ totalLegosExpected }}</span>
                <span class="meta-label">LEGOs</span>
              </span>
            </div>
          </div>

          <!-- Master Agents Grid -->
          <div class="masters-grid" v-if="phases.phase3?.masters?.length">
            <div
              v-for="master in phases.phase3.masters"
              :key="master.masterNum"
              class="master-card"
              :class="[master.status, { expanded: expandedMasters.has(master.masterNum) }]"
              @click="toggleMaster(master.masterNum)"
            >
              <!-- Master Header -->
              <div class="master-header">
                <div class="master-identity">
                  <div class="master-icon" :class="master.status">
                    <div class="icon-inner">
                      <svg v-if="master.status === 'complete'" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                      <svg v-else-if="master.status === 'failed'" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                      </svg>
                      <svg v-else-if="master.status === 'stalled'" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                      </svg>
                      <span v-else class="master-num">M{{ master.masterNum }}</span>
                    </div>
                    <div v-if="master.status === 'running' || master.status === 'spawning'" class="radar-ping"></div>
                  </div>
                  <div class="master-info">
                    <span class="master-title">MASTER {{ master.masterNum }}</span>
                    <span class="master-range">{{ master.seedRange }}</span>
                  </div>
                </div>

                <!-- Mini Progress Ring -->
                <div class="master-progress">
                  <svg class="progress-ring" viewBox="0 0 36 36">
                    <circle class="ring-bg" cx="18" cy="18" r="15.5" />
                    <circle
                      class="ring-fill"
                      cx="18" cy="18" r="15.5"
                      :stroke-dasharray="97.4"
                      :stroke-dashoffset="97.4 - (master.legosExpected > 0 ? (master.legosReceived / master.legosExpected) * 97.4 : 0)"
                    />
                  </svg>
                  <span class="progress-text">{{ master.legosExpected > 0 ? Math.round((master.legosReceived / master.legosExpected) * 100) : 0 }}%</span>
                </div>
              </div>

              <!-- Master Stats -->
              <div class="master-stats">
                <div class="stat">
                  <span class="stat-value">{{ master.legosReceived }}</span>
                  <span class="stat-label">received</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ master.legosExpected }}</span>
                  <span class="stat-label">expected</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ master.workers?.length || 0 }}</span>
                  <span class="stat-label">workers</span>
                </div>
              </div>

              <!-- Time Info -->
              <div class="master-times">
                <div class="time-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  <span>{{ formatTimeAgo(master.spawnedAt) }}</span>
                </div>
                <div class="time-item" v-if="master.lastActivityAt">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  <span>{{ formatTimeAgo(master.lastActivityAt) }}</span>
                </div>
              </div>

              <!-- Expand Indicator -->
              <div class="expand-indicator">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 9l-7 7-7-7"/>
                </svg>
              </div>

              <!-- Workers Panel (Expanded) -->
              <div class="workers-panel" v-show="expandedMasters.has(master.masterNum)">
                <div class="workers-header">
                  <span>WORKERS</span>
                  <span class="workers-count">{{ master.workers?.length || 0 }}</span>
                </div>
                <div class="workers-list">
                  <div
                    v-for="worker in master.workers"
                    :key="worker.workerNum"
                    class="worker-item"
                    :class="worker.status"
                  >
                    <div class="worker-status-dot"></div>
                    <span class="worker-name">Worker {{ worker.workerNum }}</span>
                    <span class="worker-legos">{{ worker.legoCount }} LEGOs</span>
                    <span v-if="worker.lastUpload" class="worker-time">{{ formatTimeAgo(worker.lastUpload) }}</span>
                    <span v-else class="worker-time pending">waiting...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State for Phase 3 -->
          <div v-else class="lane-track">
            <div class="track-line"></div>
            <div v-if="phases.phase3?.status === 'pending'" class="track-pending">
              <span>Awaiting Phase 2 completion</span>
            </div>
          </div>
        </div>

        <!-- Audio Phase -->
        <div class="phase-lane" :class="getPhaseClass('audio')">
          <div class="lane-header">
            <div class="lane-number">04</div>
            <div class="lane-info">
              <span class="lane-title">AUDIO</span>
              <span class="lane-subtitle">TTS Generation</span>
            </div>
            <div class="lane-status-badge" :class="phases.audio?.status">
              {{ phases.audio?.status || 'pending' }}
            </div>
          </div>
          <div class="lane-track">
            <div class="track-line"></div>
            <div v-if="phases.audio?.status === 'complete'" class="track-complete-marker">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
              <span>{{ phases.audio?.samplesGenerated || 0 }} samples</span>
            </div>
          </div>
        </div>

        <!-- Manifest Phase -->
        <div class="phase-lane" :class="getPhaseClass('manifest')">
          <div class="lane-header">
            <div class="lane-number">05</div>
            <div class="lane-info">
              <span class="lane-title">MANIFEST</span>
              <span class="lane-subtitle">Compilation</span>
            </div>
            <div class="lane-status-badge" :class="phases.manifest?.status">
              {{ phases.manifest?.status || 'pending' }}
            </div>
          </div>
          <div class="lane-track">
            <div class="track-line"></div>
            <div v-if="phases.manifest?.status === 'complete'" class="track-complete-marker">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
              <span>Ready</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Activity Feed -->
      <aside class="activity-feed">
        <div class="feed-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          <span>LIVE FEED</span>
          <div class="feed-count">{{ recentActivity.length }}</div>
        </div>
        <div class="feed-list" ref="feedList">
          <TransitionGroup name="feed-item">
            <div
              v-for="(event, index) in recentActivity"
              :key="event.time + index"
              class="feed-event"
              :class="event.type"
            >
              <div class="event-indicator"></div>
              <div class="event-content">
                <span class="event-message">{{ event.event }}</span>
                <span class="event-time">{{ formatTimeAgo(event.time) }}</span>
              </div>
            </div>
          </TransitionGroup>
          <div v-if="!recentActivity.length" class="feed-empty">
            <span>No activity yet</span>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import axios from 'axios'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  pollInterval: {
    type: Number,
    default: 3000
  }
})

// State
const isRefreshing = ref(false)
const overallStatus = ref('idle')
const phases = ref({})
const recentActivity = ref([])
const expandedMasters = ref(new Set())
const feedList = ref(null)

// Computed
const statusLabel = computed(() => {
  const labels = {
    idle: 'IDLE',
    running: 'LIVE',
    complete: 'COMPLETE',
    failed: 'FAILED',
    paused: 'PAUSED'
  }
  return labels[overallStatus.value] || 'UNKNOWN'
})

const totalWorkers = computed(() => {
  return phases.value.phase3?.masters?.reduce((sum, m) => sum + (m.workers?.length || 0), 0) || 0
})

const totalLegosExpected = computed(() => {
  return phases.value.phase3?.masters?.reduce((sum, m) => sum + (m.legosExpected || 0), 0) || 0
})

const totalLegosReceived = computed(() => {
  return phases.value.phase3?.masters?.reduce((sum, m) => sum + (m.legosReceived || 0), 0) || 0
})

// Methods
function getPhaseClass(phaseKey) {
  const status = phases.value[phaseKey]?.status || 'pending'
  return {
    'phase-pending': status === 'pending',
    'phase-running': status === 'running',
    'phase-complete': status === 'complete' || status === 'completed',
    'phase-failed': status === 'failed'
  }
}

function toggleMaster(masterNum) {
  if (expandedMasters.value.has(masterNum)) {
    expandedMasters.value.delete(masterNum)
  } else {
    expandedMasters.value.add(masterNum)
  }
  expandedMasters.value = new Set(expandedMasters.value) // Trigger reactivity
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'never'
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

async function fetchData() {
  isRefreshing.value = true
  try {
    const apiBaseUrl = localStorage.getItem('api_base_url') ||
                       import.meta.env.VITE_API_BASE_URL ||
                       'http://localhost:3456'

    const response = await axios.get(`${apiBaseUrl}/api/courses/${props.courseCode}/agents`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    overallStatus.value = response.data.overallStatus || 'idle'
    phases.value = response.data.phases || {}

    // Prepend new activity items
    if (response.data.recentActivity) {
      const newEvents = response.data.recentActivity.filter(
        e => !recentActivity.value.some(existing => existing.time === e.time && existing.event === e.event)
      )
      if (newEvents.length) {
        recentActivity.value = [...newEvents, ...recentActivity.value].slice(0, 50)
      }
    }
  } catch (error) {
    console.log('[AgentSwimlane] Fetch error:', error.message)
    // Don't clear state on error - keep showing last known state
  } finally {
    setTimeout(() => {
      isRefreshing.value = false
    }, 300)
  }
}

// Lifecycle
let pollTimer = null

onMounted(() => {
  fetchData()
  pollTimer = setInterval(fetchData, props.pollInterval)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

// Auto-scroll feed on new items
watch(recentActivity, () => {
  if (feedList.value) {
    feedList.value.scrollTop = 0
  }
}, { deep: true })
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   AGENT SWIMLANE - MISSION CONTROL AESTHETIC
   ═══════════════════════════════════════════════════════════════════ */

.agent-swimlane {
  --void: #0a0f1a;
  --deep: #0f172a;
  --surface: #1e293b;
  --elevated: #334155;
  --border: #334155;
  --border-light: #475569;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --text-dim: #64748b;
  --accent: #10b981;
  --accent-glow: rgba(16, 185, 129, 0.4);
  --warning: #f59e0b;
  --warning-glow: rgba(245, 158, 11, 0.4);
  --error: #ef4444;
  --error-glow: rgba(239, 68, 68, 0.4);
  --info: #3b82f6;
  --info-glow: rgba(59, 130, 246, 0.4);

  position: relative;
  min-height: 100vh;
  background: var(--void);
  color: var(--text);
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
}

/* Ambient Background */
.swimlane-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.grid-lines {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(51, 65, 85, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(51, 65, 85, 0.1) 1px, transparent 1px);
  background-size: 40px 40px;
}

.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent-glow), transparent);
  animation: scan 8s ease-in-out infinite;
}

@keyframes scan {
  0%, 100% { transform: translateY(0); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(100vh); opacity: 0; }
}

/* ═══════════════════════════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════════════════════════ */

.swimlane-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.8) 100%);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--accent) 0%, rgba(16, 185, 129, 0.6) 100%);
  border-radius: 0.5rem;
}

.header-icon svg {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--void);
}

.header-titles h1 {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--accent);
  margin: 0;
}

.header-subtitle {
  font-size: 0.6875rem;
  color: var(--text-dim);
  letter-spacing: 0.05em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.course-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
}

.badge-label {
  font-size: 0.5625rem;
  color: var(--text-dim);
  letter-spacing: 0.1em;
}

.badge-value {
  font-size: 0.875rem;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text);
  padding: 0.25rem 0.75rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.875rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 9999px;
}

.status-indicator.running {
  border-color: var(--accent);
  background: rgba(16, 185, 129, 0.1);
}

.status-indicator.failed {
  border-color: var(--error);
  background: rgba(239, 68, 68, 0.1);
}

.status-indicator.complete {
  border-color: var(--accent);
  background: rgba(16, 185, 129, 0.1);
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--text-dim);
}

.status-indicator.running .status-dot {
  background: var(--accent);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

.status-indicator.failed .status-dot {
  background: var(--error);
}

.status-indicator.complete .status-dot {
  background: var(--accent);
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.status-text {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.status-indicator.running .status-text {
  color: var(--accent);
}

.refresh-indicator {
  width: 1.5rem;
  height: 1.5rem;
  opacity: 0.3;
  transition: opacity 0.3s, transform 0.3s;
}

.refresh-indicator.active {
  opacity: 1;
  animation: spin 1s linear infinite;
}

.refresh-indicator svg {
  width: 100%;
  height: 100%;
  color: var(--accent);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN CONTENT
   ═══════════════════════════════════════════════════════════════════ */

.swimlane-content {
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
  min-height: calc(100vh - 80px);
}

/* ═══════════════════════════════════════════════════════════════════
   PHASE SWIMLANES
   ═══════════════════════════════════════════════════════════════════ */

.swimlanes-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.phase-lane {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(30, 41, 59, 0.3) 100%);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.phase-lane.phase-running {
  border-color: var(--accent);
  box-shadow: 0 0 20px var(--accent-glow), inset 0 0 20px rgba(16, 185, 129, 0.05);
}

.phase-lane.phase-complete {
  border-color: rgba(16, 185, 129, 0.3);
}

.phase-lane.phase-failed {
  border-color: var(--error);
  box-shadow: 0 0 20px var(--error-glow);
}

.lane-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.25rem;
  background: rgba(15, 23, 42, 0.5);
  border-bottom: 1px solid var(--border);
}

.lane-number {
  font-size: 1.5rem;
  font-weight: 800;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-dim);
  opacity: 0.4;
  min-width: 2.5rem;
}

.phase-running .lane-number {
  color: var(--accent);
  opacity: 1;
}

.lane-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
}

.lane-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--text);
}

.lane-subtitle {
  font-size: 0.625rem;
  color: var(--text-dim);
  letter-spacing: 0.05em;
}

.lane-status-badge {
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  background: var(--surface);
  color: var(--text-dim);
  border: 1px solid var(--border);
}

.lane-status-badge.running {
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent);
  border-color: var(--accent);
}

.lane-status-badge.complete,
.lane-status-badge.completed {
  background: rgba(16, 185, 129, 0.1);
  color: var(--accent);
  border-color: rgba(16, 185, 129, 0.3);
}

.lane-status-badge.failed {
  background: rgba(239, 68, 68, 0.15);
  color: var(--error);
  border-color: var(--error);
}

.lane-meta {
  display: flex;
  gap: 1.5rem;
  margin-left: auto;
}

.meta-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.meta-value {
  font-size: 1rem;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text);
}

.meta-label {
  font-size: 0.5625rem;
  color: var(--text-dim);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* Lane Track */
.lane-track {
  padding: 1rem 1.25rem;
  min-height: 3rem;
  position: relative;
}

.track-line {
  position: absolute;
  left: 2rem;
  right: 2rem;
  top: 50%;
  height: 2px;
  background: linear-gradient(90deg, var(--border), var(--border-light), var(--border));
  border-radius: 1px;
}

.track-complete-marker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--accent);
  font-size: 0.75rem;
  font-weight: 500;
}

.track-complete-marker svg {
  width: 1.25rem;
  height: 1.25rem;
}

.track-running-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--accent);
  font-size: 0.75rem;
}

.pulse-ring {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse-ring 1.5s ease-out infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 1; box-shadow: 0 0 0 0 var(--accent-glow); }
  100% { transform: scale(1); opacity: 0.5; box-shadow: 0 0 0 12px transparent; }
}

.track-pending {
  color: var(--text-dim);
  font-size: 0.75rem;
  font-style: italic;
}

/* ═══════════════════════════════════════════════════════════════════
   MASTERS GRID (Phase 3)
   ═══════════════════════════════════════════════════════════════════ */

.phase-lane-expanded {
  /* Allow more space for Phase 3 */
}

.masters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  padding: 1rem 1.25rem;
}

.master-card {
  background: linear-gradient(145deg, var(--deep) 0%, rgba(15, 23, 42, 0.8) 100%);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.master-card:hover {
  border-color: var(--border-light);
  transform: translateY(-2px);
}

.master-card.running {
  border-color: var(--accent);
  box-shadow: 0 4px 24px var(--accent-glow);
}

.master-card.spawning {
  border-color: var(--warning);
  box-shadow: 0 4px 24px var(--warning-glow);
}

.master-card.complete {
  border-color: rgba(16, 185, 129, 0.4);
}

.master-card.failed {
  border-color: var(--error);
  box-shadow: 0 4px 24px var(--error-glow);
}

.master-card.stalled {
  border-color: var(--warning);
}

.master-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.875rem;
}

.master-identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.master-icon {
  position: relative;
  width: 2.5rem;
  height: 2.5rem;
}

.icon-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
}

.master-icon.running .icon-inner,
.master-icon.spawning .icon-inner {
  border-color: var(--accent);
  color: var(--accent);
}

.master-icon.complete .icon-inner {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--void);
}

.master-icon.complete .icon-inner svg {
  width: 1rem;
  height: 1rem;
}

.master-icon.failed .icon-inner {
  background: var(--error);
  border-color: var(--error);
  color: white;
}

.master-icon.failed .icon-inner svg {
  width: 1rem;
  height: 1rem;
}

.master-icon.stalled .icon-inner {
  background: var(--warning);
  border-color: var(--warning);
  color: var(--void);
}

.master-icon.stalled .icon-inner svg {
  width: 1rem;
  height: 1rem;
}

.radar-ping {
  position: absolute;
  inset: -4px;
  border: 2px solid var(--accent);
  border-radius: 0.625rem;
  animation: radar 2s ease-out infinite;
}

.master-card.spawning .radar-ping {
  border-color: var(--warning);
}

@keyframes radar {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.4); opacity: 0; }
}

.master-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.master-title {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text);
}

.master-range {
  font-size: 0.75rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-muted);
}

/* Progress Ring */
.master-progress {
  position: relative;
  width: 3rem;
  height: 3rem;
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: var(--surface);
  stroke-width: 3;
}

.ring-fill {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
}

.master-card.failed .ring-fill {
  stroke: var(--error);
}

.master-card.spawning .ring-fill {
  stroke: var(--warning);
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text);
}

/* Master Stats */
.master-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.75rem;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.125rem;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text);
}

.stat-label {
  font-size: 0.5625rem;
  color: var(--text-dim);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Master Times */
.master-times {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.time-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  color: var(--text-dim);
}

.time-item svg {
  width: 0.875rem;
  height: 0.875rem;
  opacity: 0.6;
}

/* Expand Indicator */
.expand-indicator {
  display: flex;
  justify-content: center;
  padding-top: 0.25rem;
}

.expand-indicator svg {
  width: 1rem;
  height: 1rem;
  color: var(--text-dim);
  transition: transform 0.3s;
}

.master-card.expanded .expand-indicator svg {
  transform: rotate(180deg);
}

/* Workers Panel */
.workers-panel {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border);
}

.workers-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.625rem;
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-dim);
}

.workers-count {
  padding: 0.125rem 0.375rem;
  background: var(--surface);
  border-radius: 0.25rem;
  font-family: 'SF Mono', Monaco, monospace;
}

.workers-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.worker-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--surface);
  border-radius: 0.375rem;
  font-size: 0.6875rem;
}

.worker-status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--text-dim);
  flex-shrink: 0;
}

.worker-item.complete .worker-status-dot {
  background: var(--accent);
}

.worker-item.running .worker-status-dot {
  background: var(--accent);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

.worker-item.failed .worker-status-dot {
  background: var(--error);
}

.worker-name {
  font-weight: 500;
  color: var(--text);
}

.worker-legos {
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-muted);
  margin-left: auto;
}

.worker-time {
  font-size: 0.625rem;
  color: var(--text-dim);
}

.worker-time.pending {
  font-style: italic;
  opacity: 0.6;
}

/* ═══════════════════════════════════════════════════════════════════
   ACTIVITY FEED
   ═══════════════════════════════════════════════════════════════════ */

.activity-feed {
  background: linear-gradient(180deg, var(--deep) 0%, rgba(15, 23, 42, 0.6) 100%);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px);
  position: sticky;
  top: 1.5rem;
}

.feed-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  background: rgba(15, 23, 42, 0.5);
}

.feed-header svg {
  width: 1rem;
  height: 1rem;
  color: var(--accent);
}

.feed-header span {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--text);
}

.feed-count {
  margin-left: auto;
  padding: 0.125rem 0.5rem;
  background: var(--surface);
  border-radius: 9999px;
  font-size: 0.625rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-muted);
}

.feed-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.feed-event {
  display: flex;
  gap: 0.625rem;
  padding: 0.625rem;
  border-radius: 0.375rem;
  margin-bottom: 0.375rem;
  background: rgba(30, 41, 59, 0.4);
  transition: background 0.2s;
}

.feed-event:hover {
  background: rgba(30, 41, 59, 0.8);
}

.event-indicator {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: var(--text-dim);
  margin-top: 0.375rem;
  flex-shrink: 0;
}

.feed-event.success .event-indicator {
  background: var(--accent);
}

.feed-event.error .event-indicator {
  background: var(--error);
}

.feed-event.warning .event-indicator {
  background: var(--warning);
}

.feed-event.info .event-indicator {
  background: var(--info);
}

.event-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.event-message {
  font-size: 0.75rem;
  color: var(--text);
  line-height: 1.4;
  word-break: break-word;
}

.event-time {
  font-size: 0.625rem;
  color: var(--text-dim);
  font-family: 'SF Mono', Monaco, monospace;
}

.feed-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--text-dim);
  font-size: 0.75rem;
  font-style: italic;
}

/* Feed Item Transitions */
.feed-item-enter-active {
  transition: all 0.4s ease;
}

.feed-item-leave-active {
  transition: all 0.3s ease;
}

.feed-item-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.feed-item-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* ═══════════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════════ */

@media (max-width: 1200px) {
  .swimlane-content {
    grid-template-columns: 1fr;
  }

  .activity-feed {
    position: static;
    max-height: 300px;
  }
}

@media (max-width: 768px) {
  .swimlane-header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
  }

  .swimlane-content {
    padding: 1rem;
  }

  .masters-grid {
    grid-template-columns: 1fr;
  }

  .lane-meta {
    display: none;
  }
}
</style>
