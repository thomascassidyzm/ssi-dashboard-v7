<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <router-link
              to="/courses"
              class="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span class="text-sm">Library</span>
            </router-link>
            <div class="w-px h-6 bg-slate-700"></div>
            <h1 class="text-xl font-semibold text-slate-100">Course Manager</h1>
            <span
              v-if="courseCode"
              class="px-3 py-1 bg-slate-700/50 border border-slate-600/50 rounded text-sm font-mono text-emerald-400"
            >
              {{ courseCode }}
            </span>
          </div>

          <div class="flex items-center gap-3">
            <!-- Job Status Badge -->
            <div
              v-if="jobStatus !== 'idle'"
              class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
              :class="statusBadgeClass"
            >
              <span class="status-dot" :class="statusDotClass"></span>
              <span>{{ statusLabel }}</span>
            </div>

            <!-- Data Source -->
            <span class="text-xs text-slate-500 uppercase tracking-wide">Database</span>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <!-- Configuration Section (Collapsible) -->
      <section class="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
        <button
          @click="configExpanded = !configExpanded"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-slate-300 uppercase tracking-wide">Configuration</span>
            <span v-if="!configExpanded && courseCode" class="text-sm text-slate-500">
              {{ displayName }} &middot; {{ seedCount }} seeds &middot; {{ agentEngine.toUpperCase() }}
            </span>
          </div>
          <svg
            class="w-5 h-5 text-slate-400 transition-transform duration-200"
            :class="{ 'rotate-180': configExpanded }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-show="configExpanded"
          class="px-6 pb-6 border-t border-slate-700/50 space-y-6"
        >
          <!-- Language Pair -->
          <div class="pt-6">
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
              Language Pair
            </label>
            <div v-if="isNewCourse" class="grid grid-cols-2 gap-4">
              <select
                v-model="knownLang"
                class="bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              >
                <option value="">Select known language</option>
                <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                  {{ lang.name }}
                </option>
              </select>
              <select
                v-model="targetLang"
                class="bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              >
                <option value="">Select target language</option>
                <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                  {{ lang.name }}
                </option>
              </select>
            </div>
            <div v-else class="text-lg text-slate-200">
              {{ displayName }}
            </div>
          </div>

          <!-- Course Size -->
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
              Course Size
            </label>
            <div class="flex gap-2">
              <button
                v-for="size in courseSizes"
                :key="size.seeds"
                @click="seedCount = size.seeds"
                class="flex-1 px-4 py-3 rounded-lg border transition-all text-sm"
                :class="seedCount === size.seeds
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500/50'"
              >
                <div class="font-medium">{{ size.label }}</div>
                <div class="text-xs opacity-70 mt-0.5">{{ size.seeds }} seeds</div>
              </button>
            </div>
          </div>

          <!-- Agent Engine -->
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
              Agent Engine
            </label>
            <div class="flex gap-2">
              <button
                v-for="engine in engines"
                :key="engine.id"
                @click="agentEngine = engine.id"
                class="flex-1 px-4 py-3 rounded-lg border transition-all text-sm"
                :class="agentEngine === engine.id
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500/50'"
              >
                <div class="font-medium">{{ engine.label }}</div>
                <div class="text-xs opacity-70 mt-0.5">{{ engine.description }}</div>
              </button>
            </div>
          </div>

          <!-- Create Course Button (New Course Only) -->
          <div v-if="isNewCourse" class="pt-2">
            <button
              @click="createCourse"
              :disabled="!canCreateCourse"
              class="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
            >
              Create Course
            </button>
          </div>
        </div>
      </section>

      <!-- Phase Progress -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-medium text-slate-400 uppercase tracking-wide">Phase Progress</h2>
          <div v-if="etaDisplay" class="text-sm text-slate-400">
            <span class="text-emerald-400">~{{ etaDisplay.time }}</span>
            <span class="text-slate-500"> at {{ etaDisplay.rate }}</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div
            v-for="phase in phases"
            :key="phase.number"
            class="phase-card"
            :class="phaseCardClass(phase)"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <span class="status-dot" :class="statusDotClassFor(phase.status)"></span>
                <div>
                  <div class="text-xs text-slate-500 uppercase tracking-wide">Phase {{ phase.number }}</div>
                  <div class="text-sm font-medium text-slate-200">{{ phase.name }}</div>
                </div>
              </div>
              <span
                class="text-xs uppercase tracking-wide px-2 py-0.5 rounded"
                :class="statusLabelClass(phase.status)"
              >
                {{ phase.status }}
              </span>
            </div>

            <!-- Progress Bar -->
            <div class="h-1.5 bg-slate-700/50 rounded-full overflow-hidden mb-2">
              <div
                class="h-full transition-all duration-500 rounded-full"
                :class="progressBarClass(phase.status)"
                :style="{ width: `${phase.progress}%` }"
              ></div>
            </div>

            <!-- Count -->
            <div class="flex items-baseline gap-1 font-mono text-sm">
              <span class="text-slate-200">{{ phase.completed.toLocaleString() }}</span>
              <span class="text-slate-500">/</span>
              <span class="text-slate-500">{{ phase.total.toLocaleString() }}</span>
              <span class="text-slate-600 text-xs ml-1">{{ phase.unit }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats Bar -->
      <section class="grid grid-cols-4 gap-4">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="bg-slate-800/30 border border-slate-700/50 rounded-lg px-4 py-3"
        >
          <div class="text-2xl font-mono font-semibold text-slate-200">
            {{ stat.value.toLocaleString() }}
          </div>
          <div class="text-xs text-slate-500 uppercase tracking-wide mt-1">
            {{ stat.label }}
          </div>
        </div>
      </section>

      <!-- Job Control -->
      <section
        v-if="jobStatus !== 'idle' || hasIncompletePhases"
        class="bg-slate-800/30 border border-slate-700/50 rounded-lg p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-sm font-medium text-slate-300 uppercase tracking-wide">Job Control</h3>
              <span
                v-if="isStuck"
                class="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-400 uppercase tracking-wide"
              >
                Stuck
              </span>
            </div>

            <div v-if="jobStatus === 'running'" class="text-sm text-slate-400 space-y-1">
              <div>Elapsed: <span class="font-mono text-slate-300">{{ elapsedTime }}</span></div>
              <div>Workers: <span class="font-mono text-slate-300">{{ activeWorkers }} active</span></div>
              <div v-if="lastActivityAgo">Last activity: <span class="font-mono text-slate-300">{{ lastActivityAgo }}</span></div>
            </div>

            <div v-else-if="hasIncompletePhases" class="text-sm text-slate-400">
              {{ nextActionDescription }}
            </div>
          </div>

          <div class="flex gap-3">
            <!-- Start/Resume Button -->
            <button
              v-if="jobStatus === 'idle' && hasIncompletePhases"
              @click="startPhase"
              class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
            >
              {{ nextPhaseAction }}
            </button>

            <!-- Stop Button -->
            <button
              v-if="jobStatus === 'running'"
              @click="stopJob"
              :disabled="jobStatus === 'stopping'"
              class="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 font-medium rounded-lg transition-colors"
            >
              {{ jobStatus === 'stopping' ? 'Stopping...' : 'Stop Job' }}
            </button>

            <!-- Force Kill Button -->
            <button
              v-if="showForceKill"
              @click="forceKill"
              class="px-5 py-2.5 bg-red-600/80 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
            >
              Force Kill
            </button>
          </div>
        </div>
      </section>

      <!-- Event Log (Collapsible) -->
      <section class="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
        <button
          @click="logExpanded = !logExpanded"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-slate-300 uppercase tracking-wide">Event Log</span>
            <span class="text-xs text-slate-500">{{ events.length }} events</span>
          </div>
          <div class="flex items-center gap-3">
            <span
              v-if="isPolling"
              class="text-xs text-emerald-500 uppercase tracking-wide flex items-center gap-1.5"
            >
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Live
            </span>
            <svg
              class="w-5 h-5 text-slate-400 transition-transform duration-200"
              :class="{ 'rotate-180': logExpanded }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        <div
          v-show="logExpanded"
          class="border-t border-slate-700/50 max-h-64 overflow-y-auto"
        >
          <div
            v-for="event in events"
            :key="event.id"
            class="px-6 py-2 border-b border-slate-700/30 last:border-0 flex items-start gap-4 text-sm"
          >
            <span class="font-mono text-slate-500 text-xs whitespace-nowrap">{{ event.time }}</span>
            <span class="text-slate-300">{{ event.message }}</span>
          </div>
          <div v-if="events.length === 0" class="px-6 py-8 text-center text-slate-500 text-sm">
            No events yet
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Props
const props = defineProps({
  courseCode: {
    type: String,
    default: null
  }
})

// State
const configExpanded = ref(false)
const logExpanded = ref(false)
const isPolling = ref(false)

// Config state
const knownLang = ref('')
const targetLang = ref('')
const seedCount = ref(260)
const agentEngine = ref('cli')

// Progress state
const phases = ref([
  { number: 1, name: 'Translation', status: 'pending', completed: 0, total: 0, unit: 'seeds' },
  { number: 2, name: 'Conflicts', status: 'pending', completed: 0, total: 0, unit: 'LEGOs' },
  { number: 3, name: 'Baskets', status: 'pending', completed: 0, total: 0, unit: 'LEGOs' }
])

const stats = ref([
  { label: 'Seeds', value: 0 },
  { label: 'LEGOs', value: 0 },
  { label: 'NEW LEGOs', value: 0 },
  { label: 'Phrases', value: 0 }
])

// Job state
const jobStatus = ref('idle') // idle, running, stopping, stuck
const activeWorkers = ref(0)
const jobStartTime = ref(null)
const lastProgressAt = ref(null)
const stopRequestedAt = ref(null)

// ETA tracking
const etaHistory = ref([])
const MAX_HISTORY = 30

// Events
const events = ref([])

// Static data
const languages = ref([
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'zho', name: 'Mandarin Chinese' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'ara', name: 'Arabic' }
])

const courseSizes = [
  { seeds: 10, label: 'Test' },
  { seeds: 260, label: 'MVP' },
  { seeds: 668, label: 'Full' }
]

const engines = [
  { id: 'cli', label: 'CLI', description: 'iTerm2 + Claude Code' },
  { id: 'browser', label: 'Safari', description: 'Browser-based' }
]

// Computed
const isNewCourse = computed(() => !props.courseCode && !route.params.courseCode)

const displayName = computed(() => {
  const code = props.courseCode || route.params.courseCode
  if (!code) return ''
  const [target, , known] = code.split('_')
  const targetName = languages.value.find(l => l.code === target)?.name || target
  const knownName = languages.value.find(l => l.code === known)?.name || known
  return `${targetName} for ${knownName} speakers`
})

const canCreateCourse = computed(() => {
  return knownLang.value && targetLang.value && knownLang.value !== targetLang.value
})

const hasIncompletePhases = computed(() => {
  return phases.value.some(p => p.status !== 'complete')
})

const nextPhaseAction = computed(() => {
  const incompletePhase = phases.value.find(p => p.status === 'partial')
  if (incompletePhase) return `Resume Phase ${incompletePhase.number}`

  const pendingPhase = phases.value.find(p => p.status === 'pending')
  if (pendingPhase) return `Start Phase ${pendingPhase.number}`

  return 'Start'
})

const nextActionDescription = computed(() => {
  const incompletePhase = phases.value.find(p => p.status === 'partial')
  if (incompletePhase) {
    return `Phase ${incompletePhase.number} is ${incompletePhase.completed}/${incompletePhase.total} ${incompletePhase.unit}`
  }

  const pendingPhase = phases.value.find(p => p.status === 'pending')
  if (pendingPhase) {
    return `Ready to start Phase ${pendingPhase.number}: ${pendingPhase.name}`
  }

  return 'All phases complete'
})

const statusLabel = computed(() => {
  if (jobStatus.value === 'running') {
    const activePhase = phases.value.find(p => p.status === 'running')
    return activePhase ? `Phase ${activePhase.number} Running` : 'Running'
  }
  if (jobStatus.value === 'stopping') return 'Stopping...'
  if (jobStatus.value === 'stuck') return 'Stuck'
  return ''
})

const statusBadgeClass = computed(() => {
  switch (jobStatus.value) {
    case 'running': return 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
    case 'stopping': return 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
    case 'stuck': return 'bg-red-500/20 border border-red-500/30 text-red-400'
    default: return 'bg-slate-700/50 text-slate-400'
  }
})

const statusDotClass = computed(() => {
  switch (jobStatus.value) {
    case 'running': return 'bg-blue-500 animate-pulse'
    case 'stopping': return 'bg-amber-500'
    case 'stuck': return 'bg-red-500'
    default: return 'bg-slate-500'
  }
})

const isStuck = computed(() => {
  if (jobStatus.value !== 'running') return false
  if (!lastProgressAt.value) return false
  const minutesSinceUpdate = (Date.now() - new Date(lastProgressAt.value).getTime()) / 60000
  return minutesSinceUpdate > 5
})

const showForceKill = computed(() => {
  if (isStuck.value) return true
  if (jobStatus.value === 'stopping' && stopRequestedAt.value) {
    const secondsSinceStop = (Date.now() - stopRequestedAt.value) / 1000
    return secondsSinceStop > 30
  }
  return false
})

const elapsedTime = computed(() => {
  if (!jobStartTime.value) return '00:00'
  const seconds = Math.floor((Date.now() - jobStartTime.value) / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const lastActivityAgo = computed(() => {
  if (!lastProgressAt.value) return null
  const seconds = Math.floor((Date.now() - new Date(lastProgressAt.value).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  return `${mins}m ago`
})

const etaDisplay = computed(() => {
  if (etaHistory.value.length < 2) return null
  if (jobStatus.value !== 'running') return null

  const first = etaHistory.value[0]
  const last = etaHistory.value[etaHistory.value.length - 1]
  const minutes = (last.timestamp - first.timestamp) / 60000
  const items = last.completed - first.completed

  if (minutes <= 0 || items <= 0) return null

  const rate = items / minutes
  const activePhase = phases.value.find(p => p.status === 'running')
  if (!activePhase) return null

  const remaining = activePhase.total - activePhase.completed
  const etaMinutes = remaining / rate

  return {
    time: formatDuration(etaMinutes),
    rate: `${rate.toFixed(1)} ${activePhase.unit}/min`
  }
})

// Methods
function formatDuration(minutes) {
  if (minutes < 1) return '<1 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}h ${mins}m`
}

function statusDotClassFor(status) {
  switch (status) {
    case 'running': return 'bg-blue-500 animate-pulse'
    case 'complete': return 'bg-emerald-500'
    case 'partial': return 'bg-amber-500'
    case 'failed': return 'bg-red-500'
    default: return 'bg-slate-500'
  }
}

function phaseCardClass(phase) {
  const base = 'bg-slate-800/30 border rounded-lg p-4 transition-all'
  switch (phase.status) {
    case 'running': return `${base} border-blue-500/30`
    case 'complete': return `${base} border-emerald-500/30`
    case 'partial': return `${base} border-amber-500/30`
    case 'failed': return `${base} border-red-500/30`
    default: return `${base} border-slate-700/50`
  }
}

function statusLabelClass(status) {
  switch (status) {
    case 'running': return 'bg-blue-500/20 text-blue-400'
    case 'complete': return 'bg-emerald-500/20 text-emerald-400'
    case 'partial': return 'bg-amber-500/20 text-amber-400'
    case 'failed': return 'bg-red-500/20 text-red-400'
    default: return 'bg-slate-700/50 text-slate-500'
  }
}

function progressBarClass(status) {
  switch (status) {
    case 'running': return 'bg-blue-500'
    case 'complete': return 'bg-emerald-500'
    case 'partial': return 'bg-amber-500'
    case 'failed': return 'bg-red-500'
    default: return 'bg-slate-600'
  }
}

function addEvent(message) {
  const now = new Date()
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  events.value.unshift({
    id: Date.now(),
    time,
    message
  })
  // Keep only last 100 events
  if (events.value.length > 100) {
    events.value = events.value.slice(0, 100)
  }
}

async function fetchProgress() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const response = await fetch(`${apiBase}/api/courses/${code}/progress`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (!response.ok) throw new Error('Failed to fetch progress')

    const data = await response.json()

    // Update phases
    if (data.phases) {
      phases.value[0] = {
        ...phases.value[0],
        status: data.phases.phase1?.status || 'pending',
        completed: data.phases.phase1?.seedsComplete || 0,
        total: data.phases.phase1?.seedsTarget || seedCount.value,
        progress: data.phases.phase1?.seedsTarget
          ? Math.round((data.phases.phase1.seedsComplete / data.phases.phase1.seedsTarget) * 100)
          : 0
      }

      phases.value[1] = {
        ...phases.value[1],
        status: data.phases.phase2?.status || 'pending',
        completed: data.phases.phase2?.legosComplete || data.stats?.legosGenerated || 0,
        total: data.phases.phase2?.legosTarget || data.stats?.legosGenerated || 0,
        progress: 100 // Phase 2 is typically all-or-nothing
      }

      phases.value[2] = {
        ...phases.value[2],
        status: data.phases.phase3?.status || 'pending',
        completed: data.phases.phase3?.legosComplete || 0,
        total: data.phases.phase3?.legosTarget || data.stats?.newLegos || 0,
        progress: data.phases.phase3?.legosTarget
          ? Math.round((data.phases.phase3.legosComplete / data.phases.phase3.legosTarget) * 100)
          : 0
      }
    }

    // Update stats
    stats.value = [
      { label: 'Seeds', value: data.stats?.seedsComplete || 0 },
      { label: 'LEGOs', value: data.stats?.legosGenerated || 0 },
      { label: 'NEW LEGOs', value: data.stats?.newLegos || 0 },
      { label: 'Phrases', value: data.stats?.basketsGenerated || 0 }
    ]

    // Update job status
    const isRunning = data.overallStatus?.includes('running') ||
                      phases.value.some(p => p.status === 'running')

    if (isRunning && jobStatus.value !== 'stopping') {
      jobStatus.value = 'running'
      if (!jobStartTime.value) {
        jobStartTime.value = Date.now()
      }
    } else if (jobStatus.value !== 'stopping') {
      jobStatus.value = 'idle'
    }

    // Track ETA
    const activePhase = phases.value.find(p => p.status === 'running')
    if (activePhase && activePhase.completed > 0) {
      etaHistory.value.push({
        timestamp: Date.now(),
        completed: activePhase.completed
      })
      if (etaHistory.value.length > MAX_HISTORY) {
        etaHistory.value.shift()
      }
      lastProgressAt.value = new Date().toISOString()
    }

    // Update active workers from queue data
    if (data.queue) {
      activeWorkers.value = data.queue.processing || 0
    }

  } catch (error) {
    console.error('Failed to fetch progress:', error)
  }
}

async function createCourse() {
  if (!canCreateCourse.value) return

  const newCode = `${targetLang.value}_for_${knownLang.value}`

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const response = await fetch(`${apiBase}/api/courses/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode: newCode,
        target: targetLang.value,
        known: knownLang.value,
        seedCount: seedCount.value
      })
    })

    if (!response.ok) throw new Error('Failed to create course')

    addEvent(`Created course: ${newCode}`)
    router.push(`/course/${newCode}`)

  } catch (error) {
    console.error('Failed to create course:', error)
    addEvent(`Error: ${error.message}`)
  }
}

async function startPhase() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  // Find the next phase to start
  const incompletePhase = phases.value.find(p => p.status === 'partial')
  const pendingPhase = phases.value.find(p => p.status === 'pending')
  const targetPhase = incompletePhase || pendingPhase

  if (!targetPhase) return

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const response = await fetch(`${apiBase}/api/courses/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode: code,
        phaseSelection: [targetPhase.number],
        spawnerMode: agentEngine.value,
        mode: seedCount.value === 10 ? 'quick_test' : seedCount.value === 260 ? 'mvp_course' : 'full_course'
      })
    })

    if (!response.ok) throw new Error('Failed to start phase')

    jobStatus.value = 'running'
    jobStartTime.value = Date.now()
    etaHistory.value = []

    addEvent(`Started Phase ${targetPhase.number}: ${targetPhase.name}`)

  } catch (error) {
    console.error('Failed to start phase:', error)
    addEvent(`Error: ${error.message}`)
  }
}

async function stopJob() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  jobStatus.value = 'stopping'
  stopRequestedAt.value = Date.now()

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    await fetch(`${apiBase}/api/cancel/${code}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    addEvent('Stop request sent')

    // Poll for completion
    setTimeout(() => {
      if (jobStatus.value === 'stopping') {
        fetchProgress()
      }
    }, 5000)

  } catch (error) {
    console.error('Failed to stop job:', error)
    addEvent(`Error stopping: ${error.message}`)
  }
}

async function forceKill() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    await fetch(`${apiBase}/api/force-kill/${code}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    jobStatus.value = 'idle'
    jobStartTime.value = null
    stopRequestedAt.value = null

    addEvent('Force kill executed')

  } catch (error) {
    console.error('Failed to force kill:', error)
    addEvent(`Error: ${error.message}`)
  }
}

// Polling
let pollInterval = null

function startPolling() {
  if (pollInterval) return

  isPolling.value = true
  fetchProgress()

  pollInterval = setInterval(() => {
    fetchProgress()
  }, 3000)

  addEvent('Started polling database')
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  isPolling.value = false
}

// Lifecycle
onMounted(() => {
  const code = props.courseCode || route.params.courseCode

  if (code) {
    // Management mode - collapse config, start polling
    configExpanded.value = false
    startPolling()
  } else {
    // Creation mode - expand config
    configExpanded.value = true
  }
})

onUnmounted(() => {
  stopPolling()
})

// Watch for route changes
watch(() => route.params.courseCode, (newCode) => {
  if (newCode) {
    configExpanded.value = false
    startPolling()
  } else {
    stopPolling()
    configExpanded.value = true
  }
})
</script>

<style scoped>
.status-dot {
  @apply w-2 h-2 rounded-full flex-shrink-0;
}

.phase-card {
  @apply transition-all duration-200;
}

/* Subtle animations */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

/* Scrollbar styling for event log */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: theme('colors.slate.700');
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: theme('colors.slate.600');
}
</style>
