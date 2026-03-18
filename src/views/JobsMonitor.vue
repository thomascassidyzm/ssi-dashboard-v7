<template>
  <div class="jobs-monitor">
    <!-- Ambient Background -->
    <div class="ambient-bg">
      <div class="grid-overlay"></div>
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
    </div>

    <!-- Header -->
    <header class="jm-header">
      <div class="header-inner">
        <div class="header-left">
          <router-link to="/" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </router-link>
          <div class="header-titles">
            <h1 class="page-title">Mission Control</h1>
            <p class="page-subtitle">Active Jobs Monitor</p>
          </div>
        </div>
        <div class="header-right">
          <EnvironmentSwitcher @change="refresh" />
          <button @click="refresh" class="refresh-btn" :disabled="loading">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: loading }">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            <span>{{ loading ? 'Refreshing...' : 'Refresh' }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Service Health Bar -->
    <section class="health-bar">
      <div class="health-inner">
        <span class="health-label">Services:</span>
        <div class="health-indicators">
          <!-- ngrok tunnels -->
          <div
            v-for="service in ngrokServices"
            :key="service.name"
            class="health-indicator healthy ngrok-service"
          >
            <span class="health-dot"></span>
            <span class="health-name">ngrok</span>
            <a :href="service.url" target="_blank" class="ngrok-url">{{ formatNgrokUrl(service.url) }}</a>
          </div>
          <!-- PM2 services -->
          <div
            v-for="service in pm2Services"
            :key="service.name"
            class="health-indicator"
            :class="{ healthy: service.status === 'online', unhealthy: service.status !== 'online' }"
          >
            <span class="health-dot"></span>
            <span class="health-name">{{ service.name }}</span>
            <span class="health-status" v-if="service.status !== 'online'">{{ service.status }}</span>
            <button
              v-if="service.canRestart"
              @click="restartService(service.name)"
              class="restart-btn"
              :disabled="restarting[service.name]"
              :title="`⏻ Restart ${service.name} (will interrupt service briefly)`"
            >
              <svg v-if="!restarting[service.name]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 2v6"/>
                <path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>
              </svg>
              <span v-else class="restart-spinner"></span>
            </button>
          </div>
          <!-- No services message -->
          <div v-if="services.length === 0 && !servicesLoading" class="no-services">
            No services detected
          </div>
        </div>
        <div class="poll-status">
          <span class="poll-label">Auto-refresh:</span>
          <button
            @click="togglePolling"
            class="poll-toggle"
            :class="{ active: polling }"
          >
            {{ polling ? 'ON' : 'OFF' }}
          </button>
        </div>
      </div>
    </section>

    <!-- Main Content -->
    <main class="jm-main">
      <!-- Loading State -->
      <div v-if="loading && jobs.length === 0" class="loading-state">
        <div class="loader"></div>
        <p>Loading active jobs...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <p>{{ error }}</p>
        <button @click="refresh" class="retry-btn">Retry</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="jobs.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <path d="M9 14l2 2 4-4"/>
        </svg>
        <h3>No Active Jobs</h3>
        <p>All services are idle. Start a build or audio generation to see jobs here.</p>
        <div class="empty-actions">
          <router-link to="/courses" class="action-btn">Browse Courses</router-link>
        </div>
      </div>

      <!-- Jobs List -->
      <div v-else class="jobs-grid">
        <div
          v-for="job in jobs"
          :key="job.id"
          class="job-card"
          :class="[`job-${job.type}`, `status-${job.status}`]"
        >
          <div class="job-header">
            <div class="job-meta">
              <span class="job-service">{{ formatServiceName(job.service) }}</span>
              <span class="job-type">{{ formatJobType(job.type) }}</span>
            </div>
            <div class="job-status" :class="job.status">
              <span class="status-dot"></span>
              <span class="status-text">{{ job.status }}</span>
            </div>
          </div>

          <div class="job-body">
            <h3 class="job-course">{{ job.courseCode }}</h3>

            <!-- Progress Bar (for builds and audio) -->
            <div v-if="job.progress && job.progress.total" class="progress-section">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: `${job.progress.percentage || 0}%` }"
                ></div>
              </div>
              <div class="progress-stats">
                <span class="progress-current">{{ job.progress.current }}</span>
                <span class="progress-separator">/</span>
                <span class="progress-total">{{ job.progress.total }}</span>
                <span class="progress-label">{{ getProgressLabel(job.type) }}</span>
                <span class="progress-percent">({{ job.progress.percentage || 0 }}%)</span>
              </div>
              <!-- Pass indicator for build jobs -->
              <div v-if="job.type === 'build' && job.progress.currentPass" class="pass-indicator">
                <span class="pass-badge" :class="'pass-' + job.progress.currentPass">
                  Pass {{ job.progress.currentPass }}
                </span>
                <span class="pass-detail" v-if="job.progress.currentPass === 1">
                  {{ job.progress.seedsTranslated || 0 }} translated
                </span>
                <span class="pass-detail" v-else-if="job.progress.currentPass === 2">
                  {{ job.progress.seedsTranslated || 0 }} translated, {{ job.progress.seedsDecomposed || 0 }} decomposed
                </span>
              </div>
              <!-- Failed count for audio -->
              <div v-if="job.progress.failed > 0" class="progress-failed">
                <span class="failed-icon">!</span>
                <span class="failed-count">{{ job.progress.failed }} failed</span>
              </div>
            </div>

            <!-- Pipeline progress (for orchestrator pipelines) -->
            <div v-else-if="job.progress?.currentPhase" class="pipeline-progress">
              <span class="pipeline-phase">Phase {{ job.progress.currentPhase }}</span>
            </div>

            <!-- Job metadata -->
            <div class="job-details">
              <div v-if="job.machine" class="detail-item machine-item">
                <svg class="machine-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <path d="M8 21h8M12 17v4"/>
                </svg>
                <span class="detail-value machine-name">{{ job.machine }}</span>
              </div>
              <div v-if="job.startedAt" class="detail-item">
                <span class="detail-label">Started:</span>
                <span class="detail-value">{{ formatTime(job.startedAt) }}</span>
              </div>
              <div v-if="job.metadata?.agentCount" class="detail-item">
                <span class="detail-label">Agents:</span>
                <span class="detail-value">{{ job.metadata.agentCount }}</span>
              </div>
              <div v-if="job.metadata?.operation" class="detail-item">
                <span class="detail-label">Operation:</span>
                <span class="detail-value">{{ job.metadata.operation }}</span>
              </div>
              <div v-if="job.metadata?.lastItem" class="detail-item last-item">
                <span class="detail-label">Last:</span>
                <span class="detail-value truncate">{{ job.metadata.lastItem }}</span>
              </div>
            </div>

            <!-- Last activity indicator -->
            <div v-if="job.lastProgressAt" class="last-activity" :class="lastActivityClass(job)">
              <span class="activity-label">Last activity:</span>
              <span class="activity-time">{{ formatRelativeTime(job.lastProgressAt) }}</span>
              <span v-if="lastActivityClass(job) === 'activity-danger'" class="activity-warn-text">— may be stuck</span>
            </div>

            <!-- Stall/spawn warning banner -->
            <div v-if="getStallWarning(job)" class="stall-banner" :class="getStallClass(job)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>{{ getStallWarning(job) }}</span>
            </div>

            <!-- Activity feed (compact) -->
            <div v-if="job.activityLog?.length" class="activity-feed">
              <div class="activity-feed-header">
                <span class="activity-feed-title">Activity</span>
                <span class="activity-feed-count">{{ job.activityLog.length }} events</span>
              </div>
              <div class="activity-feed-lines">
                <div
                  v-for="(entry, idx) in getVisibleActivityLog(job)"
                  :key="idx"
                  class="activity-line"
                >{{ formatActivityLine(entry) }}</div>
              </div>
              <button
                v-if="job.activityLog.length > 5"
                @click="toggleActivityLog(job.id)"
                class="activity-show-more"
              >
                {{ expandedActivityLogs[job.id] ? 'Show less' : `Show all ${job.activityLog.length}` }}
              </button>
            </div>

            <!-- Chat messages inline -->
            <div v-if="job.chatMessages?.length" class="chat-section">
              <div class="chat-section-title">Messages</div>
              <div class="chat-lines">
                <div
                  v-for="msg in job.chatMessages"
                  :key="msg.id"
                  class="chat-line"
                  :class="msg.direction === 'human_to_agent' ? 'chat-outgoing' : 'chat-incoming'"
                >
                  <span class="chat-time">{{ formatChatTime(msg.created_at) }}</span>
                  <span class="chat-text">{{ msg.message }}</span>
                </div>
              </div>
            </div>

            <!-- Errors (expandable) -->
            <div v-if="job.metadata?.errors?.length > 0" class="job-errors">
              <button
                @click="toggleErrors(job.id)"
                class="errors-toggle"
              >
                <span class="errors-count">{{ job.metadata.errors.length }} errors</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ expanded: expandedErrors[job.id] }">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              <div v-if="expandedErrors[job.id]" class="errors-list">
                <div v-for="(err, idx) in job.metadata.errors" :key="idx" class="error-item">
                  <span class="error-text">{{ err.text }}</span>
                  <span class="error-msg">{{ err.error }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="job-footer">
            <button
              v-if="job.canStop"
              @click="stopJob(job)"
              class="job-action stop"
              :disabled="stopping[job.id]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
              <span>{{ stopping[job.id] ? 'Stopping...' : 'Stop' }}</span>
            </button>
            <button
              v-if="job.status === 'stalled'"
              @click="resumeJob(job)"
              class="job-action resume"
              :disabled="resuming[job.id]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span>{{ resuming[job.id] ? 'Resuming...' : 'Resume' }}</span>
            </button>
            <button
              v-if="job.status === 'stalled'"
              @click="clearJob(job)"
              class="job-action clear"
              :disabled="clearing[job.id]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              <span>{{ clearing[job.id] ? 'Clearing...' : 'Clear' }}</span>
            </button>
            <router-link
              :to="getJobLink(job)"
              class="job-action view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>View</span>
            </router-link>
          </div>
        </div>
      </div>
    </main>

    <!-- Last Updated -->
    <footer class="jm-footer" v-if="lastUpdate">
      <span class="update-label">Last updated:</span>
      <span class="update-time">{{ formatTime(lastUpdate) }}</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import EnvironmentSwitcher from '../components/EnvironmentSwitcher.vue'
import { getApiUrl } from '@/services/api'

// API base URL - check localStorage FIRST (EnvironmentSwitcher override)
function getApiBaseUrl() {
  // 1. Check localStorage override (user set via EnvironmentSwitcher) - takes priority
  const storedUrl = localStorage.getItem('api_base_url')
  if (storedUrl) {
    return storedUrl
  }

  // 2. If on Vercel/remote with no override, use relative URLs
  const isRemote = typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'

  const isVercel = typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname === 'popty.app' ||
    window.location.hostname.endsWith('.popty.app')
  )

  if (isVercel || isRemote) {
    return ''
  }

  // 3. Local development fallback
  return getApiUrl()
}

// State
const jobs = ref([])
const services = ref([])
const machineName = ref('')
const loading = ref(true)
const servicesLoading = ref(true)
const error = ref(null)
const lastUpdate = ref(null)
const polling = ref(true)
const expandedErrors = ref({})
const stopping = ref({})
const resuming = ref({})
const clearing = ref({})
const restarting = ref({})
const expandedActivityLogs = ref({})
const now = ref(Date.now())

let pollInterval = null
let tickInterval = null
const POLL_INTERVAL_MS = 5000

// Services to hide from display (deprecated or utility)
const HIDDEN_SERVICES = [
  'phase1-translation',
  'phase2-conflict',
  'phase3-basket',
  'keep-awake',
  'caffeinate-overnight'
]

// Computed: filter services by type
const ngrokServices = computed(() => services.value.filter(s => s.type === 'ngrok'))
const pm2Services = computed(() =>
  services.value.filter(s => s.type === 'pm2' && !HIDDEN_SERVICES.includes(s.name))
)

// Fetch services (PM2 + ngrok) from API
async function fetchServices() {
  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/services`, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })

    if (!response.ok) {
      console.warn('[JobsMonitor] Services API not available')
      return
    }

    const data = await response.json()
    services.value = data.services || []
    machineName.value = data.machine || ''
  } catch (err) {
    console.warn('[JobsMonitor] Failed to fetch services:', err.message)
  } finally {
    servicesLoading.value = false
  }
}

// Fetch jobs from API
async function fetchJobs() {
  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/mission-control/jobs`, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    jobs.value = data.jobs || []
    lastUpdate.value = data.timestamp || new Date().toISOString()
    error.value = null
  } catch (err) {
    console.error('[JobsMonitor] Failed to fetch jobs:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Restart a PM2 service
async function restartService(name) {
  if (restarting.value[name]) return

  // Confirm before restarting
  if (!confirm(`Restart ${name}? This will briefly interrupt the service.`)) {
    return
  }

  restarting.value[name] = true

  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/services/${name}/restart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })

    const data = await response.json()

    if (!response.ok) {
      alert(`Failed to restart ${name}: ${data.error || 'Unknown error'}`)
    } else {
      // Refresh services to see updated state
      await fetchServices()
    }
  } catch (err) {
    console.error(`[JobsMonitor] Failed to restart ${name}:`, err)
    alert(`Failed to restart ${name}: ${err.message}`)
  } finally {
    restarting.value[name] = false
  }
}

// Refresh data
async function refresh() {
  loading.value = true
  await Promise.all([fetchJobs(), fetchServices()])
}

// Fetch all data (jobs + services)
async function fetchAll() {
  await Promise.all([fetchJobs(), fetchServices()])
}

// Toggle polling
function togglePolling() {
  polling.value = !polling.value
  if (polling.value) {
    startPolling()
  } else {
    stopPolling()
  }
}

function startPolling() {
  if (pollInterval) return
  pollInterval = setInterval(fetchAll, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// Stop a job
async function stopJob(job) {
  if (stopping.value[job.id]) return

  stopping.value[job.id] = true

  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/mission-control/jobs/${job.id}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })

    const data = await response.json()

    if (!response.ok) {
      alert(`Failed to stop job: ${data.error || 'Unknown error'}`)
    } else {
      // Refresh immediately to see updated state
      await fetchJobs()
    }
  } catch (err) {
    console.error('[JobsMonitor] Failed to stop job:', err)
    alert(`Failed to stop job: ${err.message}`)
  } finally {
    stopping.value[job.id] = false
  }
}

// Resume a stalled job (spawn new agent)
async function resumeJob(job) {
  if (resuming.value[job.id]) return

  resuming.value[job.id] = true

  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/mission-control/jobs/${job.id}/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ terminal: 'iTerm2' })
    })

    const data = await response.json()

    if (!response.ok) {
      alert(`Failed to resume job: ${data.error || 'Unknown error'}`)
    } else {
      // Refresh immediately to see updated state
      await fetchJobs()
    }
  } catch (err) {
    console.error('[JobsMonitor] Failed to resume job:', err)
    alert(`Failed to resume job: ${err.message}`)
  } finally {
    resuming.value[job.id] = false
  }
}

// Clear/dismiss a stalled job
async function clearJob(job) {
  if (clearing.value[job.id]) return

  if (!confirm(`Clear stalled job for ${job.courseCode}? This removes it from the list but doesn't delete data.`)) {
    return
  }

  clearing.value[job.id] = true

  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/mission-control/jobs/${job.id}/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })

    const data = await response.json()

    if (!response.ok) {
      alert(`Failed to clear job: ${data.error || 'Unknown error'}`)
    } else {
      // Refresh immediately to see updated state
      await fetchJobs()
    }
  } catch (err) {
    console.error('[JobsMonitor] Failed to clear job:', err)
    alert(`Failed to clear job: ${err.message}`)
  } finally {
    clearing.value[job.id] = false
  }
}

// Toggle error details
function toggleErrors(jobId) {
  expandedErrors.value[jobId] = !expandedErrors.value[jobId]
}

// Activity & stall helpers
function getSecondsSince(isoString) {
  if (!isoString) return null
  return Math.floor((now.value - new Date(isoString).getTime()) / 1000)
}

function formatRelativeTime(isoString) {
  const secs = getSecondsSince(isoString)
  if (secs === null) return null
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function lastActivityClass(job) {
  if (job.status !== 'running') return ''
  const secs = getSecondsSince(job.lastProgressAt)
  if (secs === null) return ''
  if (secs >= 300) return 'activity-danger'
  if (secs >= 60) return 'activity-warning'
  return 'activity-ok'
}

function getStallWarning(job) {
  if (job.status !== 'running') return null
  const startedSecs = getSecondsSince(job.startedAt)
  const progressSecs = getSecondsSince(job.lastProgressAt)

  if (!job.lastProgressAt && startedSecs !== null && startedSecs > 60) {
    return 'No activity since launch — agent may have failed to start'
  }
  if (progressSecs !== null && progressSecs >= 300) {
    return 'No progress for 5+ minutes — agent may be stuck'
  }
  return null
}

function getStallClass(job) {
  if (job.status !== 'running') return ''
  const progressSecs = getSecondsSince(job.lastProgressAt)
  if (!job.lastProgressAt) return 'stall-warning'
  if (progressSecs !== null && progressSecs >= 300) return 'stall-danger'
  return ''
}

function formatActivityLine(entry) {
  const time = new Date(entry.at)
  const hh = String(time.getHours()).padStart(2, '0')
  const mm = String(time.getMinutes()).padStart(2, '0')
  let line = `${hh}:${mm}`
  if (entry.seed != null) line += `  Seed ${entry.seed}:`
  const parts = []
  if (entry.new_legos) parts.push(`${entry.new_legos} new LEGOs`)
  else if (entry.legos) parts.push(`${entry.legos} LEGOs`)
  if (entry.phrases) parts.push(`${entry.phrases} phrases`)
  if (parts.length) line += ` ${parts.join(', ')}`
  if (entry.msg && !parts.length) line += ` ${entry.msg}`
  return line
}

function getVisibleActivityLog(job) {
  if (!job.activityLog?.length) return []
  if (expandedActivityLogs.value[job.id]) return job.activityLog
  return job.activityLog.slice(-5)
}

function toggleActivityLog(jobId) {
  expandedActivityLogs.value[jobId] = !expandedActivityLogs.value[jobId]
}

function formatChatTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

// Format helpers
function formatServiceName(key) {
  const names = {
    'course-builder': 'Course Builder',
    'phase8-audio': 'Audio Gen',
    'phase9-manifest': 'Manifest',
    'orchestrator': 'Orchestrator'
  }
  return names[key] || key
}

function formatJobType(type) {
  const types = {
    'build': 'Build',
    'audio-generation': 'Audio',
    'pipeline': 'Pipeline',
    'manifest': 'Manifest'
  }
  return types[type] || type
}

function getProgressLabel(type) {
  const labels = {
    'build': 'seeds',
    'audio-generation': 'items',
    'pipeline': 'phases'
  }
  return labels[type] || 'items'
}

function formatTime(isoString) {
  if (!isoString) return '-'
  const date = new Date(isoString)
  const now = new Date()
  const diff = now - date

  // Less than a minute
  if (diff < 60000) {
    return 'just now'
  }

  // Less than an hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000)
    return `${mins} min${mins > 1 ? 's' : ''} ago`
  }

  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }

  // Format as date
  return date.toLocaleString()
}

function getJobLink(job) {
  switch (job.type) {
    case 'build':
      return `/production/${job.courseCode}`
    case 'audio-generation':
      return `/production/${job.courseCode}/pipeline`
    case 'pipeline':
      return `/production/${job.courseCode}`
    default:
      return `/production/${job.courseCode}`
  }
}

// Format ngrok URL to show just the domain
function formatNgrokUrl(url) {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return url
  }
}

// Lifecycle
onMounted(() => {
  fetchAll()
  if (polling.value) {
    startPolling()
  }
  // Tick every second to update relative timestamps
  tickInterval = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  stopPolling()
  if (tickInterval) {
    clearInterval(tickInterval)
    tickInterval = null
  }
})
</script>

<style scoped>
/* CSS Custom Properties */
.jobs-monitor {
  --jm-void: #0f172a;
  --jm-deep: #1e293b;
  --jm-surface: #1e293b;
  --jm-elevated: #334155;
  --jm-border: #334155;
  --jm-border-light: #475569;
  --jm-text: #f1f5f9;
  --jm-text-dim: #94a3b8;
  --jm-text-muted: #64748b;
  --jm-accent: #10b981;
  --jm-accent-dim: #059669;
  --jm-warning: #f59e0b;
  --jm-danger: #ef4444;
  --jm-info: #3b82f6;

  min-height: 100vh;
  background: var(--jm-void);
  color: var(--jm-text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* Ambient Background */
.ambient-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--jm-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--jm-border) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.03;
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  animation: float 20s ease-in-out infinite;
}

.glow-orb-1 {
  width: 500px;
  height: 500px;
  background: var(--jm-accent);
  top: -200px;
  right: -100px;
  opacity: 0.08;
}

.glow-orb-2 {
  width: 400px;
  height: 400px;
  background: var(--jm-info);
  bottom: -100px;
  left: -100px;
  opacity: 0.06;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -20px) scale(1.05); }
}

/* Header */
.jm-header {
  position: relative;
  z-index: 10;
  border-bottom: 1px solid var(--jm-border);
  background: linear-gradient(180deg, var(--jm-deep) 0%, transparent 100%);
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-link {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--jm-text-dim);
  border: 1px solid var(--jm-border);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.back-link:hover {
  color: var(--jm-text);
  border-color: var(--jm-border-light);
  background: var(--jm-elevated);
}

.back-link svg {
  width: 20px;
  height: 20px;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--jm-text);
  margin: 0;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--jm-text-dim);
  margin: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: var(--jm-surface);
  border: 1px solid var(--jm-border);
  border-radius: 8px;
  color: var(--jm-text-dim);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--jm-elevated);
  color: var(--jm-text);
  border-color: var(--jm-border-light);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-btn svg {
  width: 18px;
  height: 18px;
}

.refresh-btn svg.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Health Bar */
.health-bar {
  position: relative;
  z-index: 10;
  border-bottom: 1px solid var(--jm-border);
  background: rgba(30, 41, 59, 0.5);
}

.health-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0.75rem 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.health-label {
  font-size: 0.75rem;
  color: var(--jm-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.health-indicators {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;
}

.health-indicator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
}

.health-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--jm-text-muted);
}

.health-indicator.healthy .health-dot {
  background: var(--jm-accent);
  box-shadow: 0 0 8px var(--jm-accent);
}

.health-indicator.unhealthy .health-dot {
  background: var(--jm-danger);
}

.health-name {
  color: var(--jm-text-dim);
}

.health-indicator.healthy .health-name {
  color: var(--jm-text);
}

.health-port {
  color: var(--jm-text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
}

.health-status {
  color: var(--jm-warning);
  font-size: 0.6875rem;
  padding: 0.125rem 0.375rem;
  background: rgba(245, 158, 11, 0.15);
  border-radius: 3px;
}

.ngrok-url {
  color: var(--jm-accent);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  text-decoration: none;
  transition: color 0.2s;
}

.ngrok-url:hover {
  color: var(--jm-text);
  text-decoration: underline;
}

.restart-btn {
  width: 20px;
  height: 20px;
  padding: 2px;
  background: transparent;
  border: 1px solid var(--jm-border);
  border-radius: 4px;
  color: var(--jm-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-left: 0.25rem;
}

.restart-btn:hover:not(:disabled) {
  background: var(--jm-elevated);
  border-color: var(--jm-accent);
  color: var(--jm-accent);
}

.restart-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.restart-btn svg {
  width: 12px;
  height: 12px;
}

.restart-spinner {
  width: 10px;
  height: 10px;
  border: 2px solid var(--jm-border);
  border-top-color: var(--jm-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.no-services {
  color: var(--jm-text-muted);
  font-size: 0.8125rem;
  font-style: italic;
}

.poll-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.poll-label {
  font-size: 0.75rem;
  color: var(--jm-text-muted);
}

.poll-toggle {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--jm-elevated);
  border: 1px solid var(--jm-border);
  border-radius: 4px;
  color: var(--jm-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.poll-toggle.active {
  background: var(--jm-accent-dim);
  border-color: var(--jm-accent);
  color: white;
}

/* Main Content */
.jm-main {
  position: relative;
  z-index: 10;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  min-height: calc(100vh - 200px);
}

/* States */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  color: var(--jm-text-dim);
}

.loading-state svg,
.error-state svg,
.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.error-state svg {
  color: var(--jm-danger);
  opacity: 1;
}

.loader {
  width: 48px;
  height: 48px;
  border: 3px solid var(--jm-border);
  border-top-color: var(--jm-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  color: var(--jm-text);
  margin: 0 0 0.5rem;
}

.empty-state p {
  margin: 0 0 1.5rem;
  max-width: 400px;
}

.retry-btn,
.action-btn {
  padding: 0.625rem 1.25rem;
  background: var(--jm-accent);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
}

.retry-btn:hover,
.action-btn:hover {
  background: var(--jm-accent-dim);
}

/* Jobs Grid */
.jobs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 500px) {
  .jobs-grid {
    grid-template-columns: 1fr;
  }
}

/* Job Card */
.job-card {
  background: var(--jm-surface);
  border: 1px solid var(--jm-border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.job-card:hover {
  border-color: var(--jm-border-light);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.job-card.status-running {
  border-color: var(--jm-accent);
}

.job-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: var(--jm-elevated);
  border-bottom: 1px solid var(--jm-border);
}

.job-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.job-service {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--jm-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.job-type {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  background: var(--jm-surface);
  border-radius: 4px;
  color: var(--jm-text-dim);
}

.job-status {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.job-status .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.job-status.running {
  color: var(--jm-accent);
}

.job-status.running .status-dot {
  background: var(--jm-accent);
  animation: pulse 1.5s ease-in-out infinite;
}

.job-status.completed {
  color: var(--jm-info);
}

.job-status.completed .status-dot {
  background: var(--jm-info);
}

.job-status.failed {
  color: var(--jm-danger);
}

.job-status.failed .status-dot {
  background: var(--jm-danger);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.1); }
}

.job-body {
  padding: 1.25rem;
}

.job-course {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--jm-text);
  margin: 0 0 1rem;
  font-family: 'JetBrains Mono', monospace;
}

/* Progress */
.progress-section {
  margin-bottom: 1rem;
}

.progress-bar {
  height: 8px;
  background: var(--jm-elevated);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--jm-accent-dim), var(--jm-accent));
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-stats {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: var(--jm-text-dim);
}

.progress-current {
  font-weight: 700;
  color: var(--jm-text);
  font-family: 'JetBrains Mono', monospace;
}

.progress-total {
  font-family: 'JetBrains Mono', monospace;
}

.progress-label {
  margin-left: 0.25rem;
}

.progress-percent {
  color: var(--jm-accent);
  font-weight: 600;
}

.pass-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.8125rem;
}

.pass-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.6875rem;
  text-transform: uppercase;
}

.pass-badge.pass-1 {
  background: rgba(59, 130, 246, 0.15);
  color: var(--jm-info);
}

.pass-badge.pass-2 {
  background: rgba(16, 185, 129, 0.15);
  color: var(--jm-accent);
}

.pass-detail {
  color: var(--jm-text-muted);
}

.progress-failed {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  color: var(--jm-danger);
}

.failed-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--jm-danger);
  color: white;
  border-radius: 50%;
  font-size: 0.6875rem;
  font-weight: 700;
}

.pipeline-progress {
  padding: 0.5rem 0.75rem;
  background: var(--jm-elevated);
  border-radius: 6px;
  margin-bottom: 1rem;
}

.pipeline-phase {
  font-size: 0.875rem;
  color: var(--jm-text-dim);
}

/* Details */
.job-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
}

.detail-label {
  color: var(--jm-text-muted);
}

.detail-value {
  color: var(--jm-text-dim);
}

.detail-item.machine-item {
  flex-basis: 100%;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  background: var(--jm-elevated);
  border-radius: 5px;
  margin-bottom: 0.25rem;
}

.machine-icon {
  width: 14px;
  height: 14px;
  color: var(--jm-info);
  flex-shrink: 0;
}

.machine-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--jm-info);
  font-weight: 600;
}

.detail-item.last-item {
  flex-basis: 100%;
}

.truncate {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Last Activity Indicator */
.last-activity {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.75rem;
  font-size: 0.75rem;
}

.activity-label {
  color: var(--jm-text-muted);
}

.activity-time {
  font-family: 'JetBrains Mono', monospace;
  color: var(--jm-text-dim);
}

.last-activity.activity-ok .activity-time {
  color: var(--jm-accent);
}

.last-activity.activity-warning .activity-time {
  color: var(--jm-warning);
}

.last-activity.activity-danger .activity-time {
  color: var(--jm-danger);
}

.activity-warn-text {
  color: var(--jm-danger);
  font-weight: 600;
}

/* Stall/Spawn Warning Banner */
.stall-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.stall-banner svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.stall-banner.stall-warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: var(--jm-warning);
}

.stall-banner.stall-danger {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: var(--jm-danger);
}

/* Activity Feed */
.activity-feed {
  margin-top: 0.75rem;
  border-top: 1px solid var(--jm-border);
  padding-top: 0.625rem;
}

.activity-feed-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}

.activity-feed-title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--jm-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.activity-feed-count {
  font-size: 0.6875rem;
  color: var(--jm-text-muted);
}

.activity-feed-lines {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.activity-line {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6875rem;
  color: var(--jm-text-dim);
  padding: 0.1875rem 0.375rem;
  background: rgba(51, 65, 85, 0.3);
  border-radius: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-show-more {
  display: block;
  margin-top: 0.25rem;
  padding: 0;
  background: none;
  border: none;
  color: var(--jm-accent);
  font-size: 0.6875rem;
  cursor: pointer;
  transition: color 0.2s;
}

.activity-show-more:hover {
  color: var(--jm-text);
}

/* Chat Messages */
.chat-section {
  margin-top: 0.75rem;
  border-top: 1px solid var(--jm-border);
  padding-top: 0.625rem;
}

.chat-section-title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--jm-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.375rem;
}

.chat-lines {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chat-line {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  max-width: 95%;
}

.chat-line.chat-incoming {
  background: rgba(51, 65, 85, 0.4);
  align-self: flex-start;
}

.chat-line.chat-outgoing {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.15);
  align-self: flex-end;
}

.chat-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.625rem;
  color: var(--jm-text-muted);
  flex-shrink: 0;
}

.chat-text {
  color: var(--jm-text-dim);
  word-break: break-word;
  white-space: pre-wrap;
}

.chat-line.chat-outgoing .chat-text {
  color: var(--jm-accent);
}

/* Errors */
.job-errors {
  margin-top: 1rem;
  border-top: 1px solid var(--jm-border);
  padding-top: 0.75rem;
}

.errors-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: var(--jm-danger);
  font-size: 0.8125rem;
  cursor: pointer;
  padding: 0;
}

.errors-toggle svg {
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
}

.errors-toggle svg.expanded {
  transform: rotate(180deg);
}

.errors-list {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error-item {
  padding: 0.5rem 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  font-size: 0.75rem;
}

.error-text {
  display: block;
  color: var(--jm-text-dim);
  margin-bottom: 0.25rem;
}

.error-msg {
  display: block;
  color: var(--jm-danger);
}

/* Footer */
.job-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--jm-border);
  background: rgba(30, 41, 59, 0.5);
}

.job-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.job-action svg {
  width: 16px;
  height: 16px;
}

.job-action.stop {
  background: transparent;
  border: 1px solid var(--jm-danger);
  color: var(--jm-danger);
}

.job-action.stop:hover:not(:disabled) {
  background: var(--jm-danger);
  color: white;
}

.job-action.stop:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.job-action.resume {
  background: transparent;
  border: 1px solid var(--jm-success);
  color: var(--jm-success);
}

.job-action.resume:hover:not(:disabled) {
  background: var(--jm-success);
  color: white;
}

.job-action.resume:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.job-action.clear {
  background: transparent;
  border: 1px solid var(--jm-text-dim);
  color: var(--jm-text-dim);
}

.job-action.clear:hover:not(:disabled) {
  background: var(--jm-text-dim);
  color: var(--jm-bg);
}

.job-action.clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.job-action.view {
  background: var(--jm-elevated);
  border: 1px solid var(--jm-border);
  color: var(--jm-text-dim);
}

.job-action.view:hover {
  background: var(--jm-border);
  color: var(--jm-text);
}

/* Page Footer */
.jm-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 0.75rem 2rem;
  background: var(--jm-deep);
  border-top: 1px solid var(--jm-border);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.update-label {
  color: var(--jm-text-muted);
}

.update-time {
  color: var(--jm-text-dim);
}

/* Responsive */
@media (max-width: 768px) {
  .header-inner {
    padding: 1rem;
  }

  .health-inner {
    flex-wrap: wrap;
  }

  .health-indicators {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .jm-main {
    padding: 1rem;
  }

  .job-card {
    border-radius: 8px;
  }
}
</style>
