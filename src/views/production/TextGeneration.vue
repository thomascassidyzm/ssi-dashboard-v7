<template>
  <div class="text-generation">
    <div class="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <!-- Subtitle -->
      <p class="text-sm text-slate-400">
        Build course content using the Course Builder agent
      </p>

      <!-- Language Selection (Create Mode) -->
      <section v-if="isCreateMode" class="bg-slate-800/30 border border-emerald-500/30 rounded-lg p-6">
        <h2 class="text-sm font-medium text-emerald-400 uppercase tracking-wide mb-4">New Course</h2>

        <div class="grid grid-cols-2 gap-6">
          <!-- Source Language (Known) -->
          <div>
            <label class="block text-xs text-slate-500 mb-2">Known Language (Learning FROM)</label>
            <select
              v-model="sourceLanguage"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="" disabled>{{ languagesLoading ? 'Loading...' : 'Select language' }}</option>
              <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                {{ lang.name }} ({{ lang.code }})
              </option>
            </select>
          </div>

          <!-- Target Language -->
          <div>
            <label class="block text-xs text-slate-500 mb-2">Target Language (Learning TO)</label>
            <select
              v-model="targetLanguage"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="" disabled>{{ languagesLoading ? 'Loading...' : 'Select language' }}</option>
              <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                {{ lang.name }} ({{ lang.code }})
              </option>
            </select>
          </div>
        </div>

        <!-- Course Code Preview -->
        <div v-if="computedCourseCode" class="mt-4 bg-emerald-900/20 border border-emerald-500/20 rounded-lg p-3">
          <p class="text-sm">
            <span class="text-slate-400">Course code:</span>
            <span class="text-emerald-400 font-mono ml-2">{{ computedCourseCode }}</span>
          </p>
        </div>
      </section>

      <!-- Configuration -->
      <section class="bg-slate-800/30 border border-slate-700/50 rounded-lg p-6">
        <h2 class="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">Configuration</h2>

        <div class="grid grid-cols-2 gap-6">
          <!-- Seed Count -->
          <div>
            <label class="block text-xs text-slate-500 mb-2">Course Size</label>
            <div class="flex gap-2">
              <button
                v-for="size in courseSizes"
                :key="size.seeds"
                @click="seedCount = size.seeds"
                class="flex-1 px-3 py-2 rounded-lg border transition-all text-sm"
                :class="seedCount === size.seeds
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500/50'"
              >
                <div class="font-medium">{{ size.label }}</div>
                <div class="text-xs opacity-70">{{ size.seeds }} seeds</div>
              </button>
            </div>
          </div>

          <!-- Agent Engine -->
          <div>
            <label class="block text-xs text-slate-500 mb-2">Agent Engine</label>
            <div class="flex gap-2">
              <button
                v-for="engine in engines"
                :key="engine.id"
                @click="agentEngine = engine.id"
                class="flex-1 px-3 py-2 rounded-lg border transition-all text-sm"
                :class="agentEngine === engine.id
                  ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-400'
                  : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500/50'"
              >
                <div class="font-medium">{{ engine.label }}</div>
                <div class="text-xs opacity-70">{{ engine.description }}</div>
              </button>
            </div>
          </div>

        </div>
      </section>

      <!-- Course Builder Progress -->
      <section class="bg-slate-800/30 border rounded-lg p-6"
        :class="progress.status === 'running' ? 'border-cyan-500/30' : 'border-slate-700/50'"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <span
              class="w-2 h-2 rounded-full"
              :class="progress.status === 'running' ? 'bg-cyan-500 animate-pulse' : progress.status === 'complete' ? 'bg-emerald-500' : 'bg-slate-500'"
            ></span>
            <div>
              <div class="text-xs text-slate-500 uppercase tracking-wide">Course Builder</div>
              <div class="text-sm font-medium text-slate-200">Sequential LEGO Network</div>
            </div>
          </div>
          <span
            class="text-xs uppercase tracking-wide px-2 py-0.5 rounded"
            :class="statusClass"
          >
            {{ progress.status }}
          </span>
        </div>

        <!-- Progress Bar -->
        <div class="h-2 bg-slate-700/50 rounded-full overflow-hidden mb-4">
          <div
            class="h-full transition-all duration-500 rounded-full bg-cyan-500"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-4 gap-4 text-center">
          <div class="bg-slate-700/30 rounded-lg p-3">
            <div class="text-2xl font-mono font-semibold text-slate-200">
              {{ progress.currentSeed }}
            </div>
            <div class="text-xs text-slate-500">/ {{ progress.totalSeeds || seedCount }} seeds</div>
          </div>
          <div class="bg-slate-700/30 rounded-lg p-3">
            <div class="text-2xl font-mono font-semibold text-slate-200">
              {{ progress.legosInserted }}
            </div>
            <div class="text-xs text-slate-500">LEGOs</div>
          </div>
          <div class="bg-slate-700/30 rounded-lg p-3">
            <div class="text-2xl font-mono font-semibold text-slate-200">
              {{ progress.phrasesInserted.toLocaleString() }}
            </div>
            <div class="text-xs text-slate-500">Phrases</div>
          </div>
          <div class="bg-slate-700/30 rounded-lg p-3">
            <div class="text-2xl font-mono font-semibold" :class="ratioClass">
              {{ ratio }}
            </div>
            <div class="text-xs text-slate-500">Ratio</div>
          </div>
        </div>

        <!-- Active Agents -->
        <div v-if="agents.running_count > 0" class="mt-4 border-t border-slate-700/50 pt-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-slate-500 uppercase tracking-wide">Active Agents</span>
            <span class="text-xs text-cyan-400">{{ agents.running_count }} running</span>
          </div>
          <div class="space-y-2">
            <div
              v-for="agent in agents.running"
              :key="agent.pid"
              class="flex items-center justify-between bg-slate-700/20 rounded-lg px-3 py-2"
            >
              <div class="flex items-center gap-4">
                <span class="text-xs font-mono text-slate-400">PID {{ agent.pid }}</span>
                <span class="text-xs text-slate-500">{{ agent.seedCount }} seeds</span>
                <span class="text-xs text-slate-500">{{ agent.runningMinutes }}m</span>
              </div>
              <button
                @click="killAgent(agent.pid)"
                class="text-xs px-2 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
              >
                Kill
              </button>
            </div>
          </div>
        </div>
        <div v-else class="mt-4 border-t border-slate-700/50 pt-4">
          <div class="text-xs text-slate-500 text-center py-2">No active agents</div>
        </div>
      </section>

      <!-- QA Checkpoints -->
      <section class="bg-slate-800/30 border border-slate-700/50 rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <div class="text-xs text-slate-500 uppercase tracking-wide">Quality Assurance</div>
            <div class="text-sm font-medium text-slate-200">Checkpoint Gates</div>
          </div>
          <span
            v-if="checkpointStatus.nextCheckpoint"
            class="text-xs text-slate-400"
          >
            Next checkpoint at seed {{ checkpointStatus.nextCheckpoint }}
          </span>
        </div>

        <!-- Checkpoint Track -->
        <div class="relative mb-6">
          <!-- Progress line -->
          <div class="absolute top-3 left-0 right-0 h-1 bg-slate-700/50 rounded-full"></div>
          <div
            class="absolute top-3 left-0 h-1 bg-cyan-500 rounded-full transition-all duration-500"
            :style="{ width: `${checkpointProgressPercent}%` }"
          ></div>

          <!-- Checkpoint markers -->
          <div class="relative flex justify-between">
            <div
              v-for="cp in checkpoints"
              :key="cp.seed"
              class="flex flex-col items-center"
              :style="{ width: '80px' }"
            >
              <!-- Marker dot -->
              <div
                class="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-mono transition-all cursor-pointer"
                :class="getCheckpointMarkerClass(cp)"
                @click="openCheckpointReview(cp)"
                :title="getCheckpointTooltip(cp)"
              >
                <span v-if="cp.status === 'approved'">✓</span>
                <span v-else-if="cp.status === 'pending_human'">!</span>
                <span v-else-if="cp.status === 'rejected'">✗</span>
              </div>
              <!-- Label -->
              <span class="mt-2 text-xs text-slate-500">{{ cp.seed }}</span>
              <!-- Status badge -->
              <span
                class="mt-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
                :class="getCheckpointBadgeClass(cp)"
              >
                {{ cp.status === 'pending_human' ? 'review' : cp.status }}
              </span>
              <!-- Mode toggle -->
              <button
                @click.stop="toggleCheckpointMode(cp)"
                class="mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded transition-colors uppercase tracking-wide"
                :class="cp.review_mode === 'human'
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
                  : cp.review_mode === 'auto'
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                    : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'"
                :title="`Click to toggle mode (current: ${cp.review_mode})`"
              >
                {{ cp.review_mode === 'human' ? 'H' : cp.review_mode === 'auto' ? 'A' : 'A+F' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Checkpoint Review Panel (shown when a checkpoint needs human review) -->
        <div
          v-if="activeCheckpointReview"
          class="border border-amber-500/30 bg-amber-500/5 rounded-lg p-4 mt-4"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-amber-400 text-lg">⚠️</span>
              <span class="text-sm font-medium text-amber-300">
                Checkpoint {{ activeCheckpointReview.seed }} requires review
              </span>
            </div>
            <button
              @click="activeCheckpointReview = null"
              class="text-slate-500 hover:text-slate-300"
            >✕</button>
          </div>

          <!-- QA Metrics -->
          <div class="grid grid-cols-4 gap-3 mb-4">
            <div class="bg-slate-800/50 rounded p-2 text-center">
              <div class="text-lg font-mono" :class="activeCheckpointReview.qa_avg >= 7 ? 'text-emerald-400' : 'text-red-400'">
                {{ activeCheckpointReview.qa_avg?.toFixed(1) || '—' }}
              </div>
              <div class="text-[10px] text-slate-500 uppercase">Quality</div>
            </div>
            <div class="bg-slate-800/50 rounded p-2 text-center">
              <div class="text-lg font-mono text-slate-300">
                {{ activeCheckpointReview.use_avg?.toFixed(1) || '—' }}
              </div>
              <div class="text-[10px] text-slate-500 uppercase">USE Avg</div>
            </div>
            <div class="bg-slate-800/50 rounded p-2 text-center">
              <div class="text-lg font-mono text-slate-300">
                {{ activeCheckpointReview.build_avg?.toFixed(1) || '—' }}
              </div>
              <div class="text-[10px] text-slate-500 uppercase">BUILD Avg</div>
            </div>
            <div class="bg-slate-800/50 rounded p-2 text-center">
              <div class="text-lg font-mono" :class="(activeCheckpointReview.drift || 0) <= 0.7 ? 'text-emerald-400' : 'text-amber-400'">
                {{ activeCheckpointReview.drift?.toFixed(2) || '—' }}
              </div>
              <div class="text-[10px] text-slate-500 uppercase">Drift</div>
            </div>
          </div>

          <!-- Review Actions -->
          <div class="flex gap-3">
            <button
              @click="approveCheckpoint(activeCheckpointReview.seed)"
              class="flex-1 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors text-sm font-medium"
            >
              Approve & Continue
            </button>
            <button
              @click="rejectCheckpoint(activeCheckpointReview.seed)"
              class="px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors text-sm font-medium"
            >
              Reject
            </button>
          </div>
        </div>

        <!-- Legend -->
        <div class="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-700/30">
          <div class="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span class="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium">H</span>
            <span>Human review</span>
          </div>
          <div class="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium">A</span>
            <span>Auto-approve</span>
          </div>
          <div class="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span class="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-medium">A+F</span>
            <span>Auto + flag</span>
          </div>
          <span class="text-[10px] text-slate-600 ml-4">Click to cycle</span>
        </div>
      </section>

      <!-- Controls -->
      <section class="flex justify-end gap-3">
        <button
          v-if="progress.status === 'idle'"
          @click="startBuilder"
          class="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
        >
          Start Course Builder
        </button>
        <button
          v-if="progress.status === 'running'"
          @click="stopBuilder"
          class="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors"
        >
          Stop
        </button>
        <button
          v-if="progress.status === 'complete'"
          @click="resetBuilder"
          class="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors"
        >
          Reset
        </button>
      </section>

      <!-- Event Log -->
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getApiUrl } from '@/services/api'

const router = useRouter()

const props = defineProps({
  courseCode: {
    type: String,
    default: 'new'
  }
})

// Create mode detection
const isCreateMode = computed(() => props.courseCode === 'new')

// Language selection state
const sourceLanguage = ref('eng')  // Default to English as known language
const targetLanguage = ref('')
const languages = ref([])
const languagesLoading = ref(true)

// Computed course code from language selection
const computedCourseCode = computed(() => {
  if (!sourceLanguage.value || !targetLanguage.value) return ''
  return `${targetLanguage.value}_for_${sourceLanguage.value}`
})

// Effective course code (from prop or computed)
const effectiveCourseCode = computed(() => {
  return isCreateMode.value ? computedCourseCode.value : props.courseCode
})

// Configuration
const seedCount = ref(260)
const agentEngine = ref('cli')

const courseSizes = [
  { seeds: 30, label: 'Test' },
  { seeds: 260, label: 'MVP' },
  { seeds: 668, label: 'Full' }
]

const engines = [
  { id: 'cli', label: 'iTerm2', description: 'Pro Max #1' },
  { id: 'terminal', label: 'Terminal', description: 'Pro Max #2' },
  { id: 'browser', label: 'Safari', description: 'Browser' }
]

// Model is always Opus 4.5 (Sonnet produces poor quality - formulaic, repetitive patterns)

// Progress state
const progress = ref({
  status: 'idle',
  currentSeed: 0,
  totalSeeds: 0,
  legosInserted: 0,
  phrasesInserted: 0
})

// Checkpoint state
const CHECKPOINT_SEEDS = [10, 50, 150, 260]
const checkpoints = ref(CHECKPOINT_SEEDS.map(seed => ({
  seed,
  status: 'pending',  // pending, approved, pending_human, rejected
  review_mode: 'human',
  qa_avg: null,
  use_avg: null,
  build_avg: null,
  drift: null
})))
const checkpointStatus = ref({
  nextCheckpoint: 10,
  lastApproved: null
})
const activeCheckpointReview = ref(null)

// Agent tracking state
const agents = ref({
  running: [],
  running_count: 0,
  total_tracked: 0
})

// UI state
const logExpanded = ref(false)
const isPolling = ref(false)
const events = ref([])

// Computed
const progressPercent = computed(() => {
  if (!progress.value.totalSeeds) return 0
  return Math.round((progress.value.currentSeed / progress.value.totalSeeds) * 100)
})

const ratio = computed(() => {
  if (!progress.value.legosInserted) return '0.0'
  return (progress.value.phrasesInserted / progress.value.legosInserted).toFixed(1)
})

const ratioClass = computed(() => {
  const r = parseFloat(ratio.value)
  if (r >= 7) return 'text-emerald-400'
  if (r >= 5) return 'text-yellow-400'
  return 'text-slate-200'
})

const statusClass = computed(() => {
  switch (progress.value.status) {
    case 'running': return 'bg-cyan-500/20 text-cyan-400'
    case 'complete': return 'bg-emerald-500/20 text-emerald-400'
    default: return 'bg-slate-700/50 text-slate-500'
  }
})

// Checkpoint progress (position on track based on current seed)
const checkpointProgressPercent = computed(() => {
  const currentSeed = progress.value.currentSeed
  if (currentSeed <= 0) return 0
  // Map current seed to 0-100% across the checkpoint track (0 to 260)
  const maxSeed = CHECKPOINT_SEEDS[CHECKPOINT_SEEDS.length - 1]
  return Math.min(100, (currentSeed / maxSeed) * 100)
})

// Methods
function addEvent(message) {
  const now = new Date()
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  events.value.unshift({
    id: Date.now(),
    time,
    message
  })
  if (events.value.length > 100) {
    events.value = events.value.slice(0, 100)
  }
}

// Checkpoint helper functions
function getCheckpointMarkerClass(cp) {
  const currentSeed = progress.value.currentSeed
  const isPast = currentSeed >= cp.seed

  switch (cp.status) {
    case 'approved':
      return 'bg-emerald-500 border-emerald-400 text-white'
    case 'pending_human':
      return 'bg-amber-500 border-amber-400 text-white animate-pulse'
    case 'rejected':
      return 'bg-red-500 border-red-400 text-white'
    default:
      return isPast
        ? 'bg-cyan-500 border-cyan-400 text-white'
        : 'bg-slate-700 border-slate-600 text-slate-500'
  }
}

function getCheckpointBadgeClass(cp) {
  switch (cp.status) {
    case 'approved':
      return 'bg-emerald-500/20 text-emerald-400'
    case 'pending_human':
      return 'bg-amber-500/20 text-amber-400'
    case 'rejected':
      return 'bg-red-500/20 text-red-400'
    default:
      return 'bg-slate-700/50 text-slate-500'
  }
}

function getCheckpointTooltip(cp) {
  if (cp.status === 'approved') {
    const qaDisplay = typeof cp.qa_avg === 'number' ? cp.qa_avg.toFixed(1) : (cp.qa_avg ? Number(cp.qa_avg).toFixed(1) : '?')
    const driftDisplay = typeof cp.drift === 'number' ? cp.drift.toFixed(2) : (cp.drift ? Number(cp.drift).toFixed(2) : '?')
    return `Checkpoint ${cp.seed}: Approved (Quality: ${qaDisplay}, Drift: ${driftDisplay})`
  }
  if (cp.status === 'pending_human') {
    return `Checkpoint ${cp.seed}: Needs human review`
  }
  if (cp.status === 'rejected') {
    return `Checkpoint ${cp.seed}: Rejected - review needed`
  }
  return `Checkpoint ${cp.seed}: Pending (triggers at seed ${cp.seed})`
}

function openCheckpointReview(cp) {
  if (cp.status === 'pending_human' || cp.status === 'rejected') {
    activeCheckpointReview.value = { ...cp }
  }
}

// Fetch checkpoint config (persisted modes) from database
async function fetchCheckpointConfig() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const apiBase = localStorage.getItem('api_base_url') || (isLocal ? 'http://localhost:3470' : 'https://popty.ngrok.app')

    const response = await fetch(`${apiBase}/api/checkpoint/config/${courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (response.ok) {
      const data = await response.json()
      // data.config is an array: [{ checkpoint_seed: 10, review_mode: 'auto' }, ...]
      if (data.config && Array.isArray(data.config)) {
        checkpoints.value.forEach(cp => {
          const config = data.config.find(c => c.checkpoint_seed === cp.seed)
          if (config?.review_mode) {
            cp.review_mode = config.review_mode
          }
        })
      }
    }
  } catch (error) {
    console.error('Failed to fetch checkpoint config:', error)
  }
}

async function fetchCheckpoints() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const apiBase = localStorage.getItem('api_base_url') || (isLocal ? 'http://localhost:3470' : 'https://popty.ngrok.app')

    const response = await fetch(`${apiBase}/api/checkpoint/summary/${courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (response.ok) {
      const data = await response.json()

      // Update checkpoints with results from database
      // Backend returns checkpoint.checkpoints as object { 10: {...}, 50: {...} }
      const cpData = data.checkpoint?.checkpoints || {}

      // Preserve existing local modes when refreshing
      const existingModes = {}
      checkpoints.value.forEach(cp => {
        existingModes[cp.seed] = cp.review_mode
      })

      checkpoints.value = CHECKPOINT_SEEDS.map(seed => {
        const result = cpData[seed]
        // Map backend format to UI format
        let status = 'pending'
        if (result?.approved) {
          status = 'approved'
        } else if (result?.status === 'pending_human') {
          status = 'pending_human'
        } else if (result?.status === 'rejected') {
          status = 'rejected'
        }

        return {
          seed,
          status,
          // Preserve local mode, fall back to result mode, then default to 'human'
          review_mode: existingModes[seed] || result?.review_mode_used || 'human',
          qa_avg: result?.quality_avg || data.summary?.avg_score,
          use_avg: null, // Not yet tracked separately
          build_avg: null, // Not yet tracked separately
          drift: result?.drift_rate
        }
      })

      // Update next checkpoint info
      if (data.checkpoint?.next_checkpoint) {
        checkpointStatus.value.nextCheckpoint = data.checkpoint.next_checkpoint
      }

      // Find last approved checkpoint
      const approvedSeeds = CHECKPOINT_SEEDS.filter(seed => cpData[seed]?.approved)
      if (approvedSeeds.length > 0) {
        checkpointStatus.value.lastApproved = Math.max(...approvedSeeds)
      }

      // Check if any checkpoint needs review
      const needsReview = checkpoints.value.find(cp => cp.status === 'pending_human')
      if (needsReview && !activeCheckpointReview.value) {
        activeCheckpointReview.value = { ...needsReview }
        addEvent(`Checkpoint ${needsReview.seed} flagged for human review`)
      }
    }
  } catch (error) {
    console.error('Failed to fetch checkpoints:', error)
  }
}

async function approveCheckpoint(checkpointSeed) {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const apiBase = localStorage.getItem('api_base_url') || (isLocal ? 'http://localhost:3470' : 'https://popty.ngrok.app')

    const response = await fetch(`${apiBase}/api/checkpoint/approve/${courseCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        checkpoint_seed: checkpointSeed,
        approved_by: 'dashboard_user',
        force_approve: true
      })
    })

    if (response.ok) {
      const data = await response.json()
      addEvent(`Checkpoint ${checkpointSeed} approved`)

      // Update local state
      const cp = checkpoints.value.find(c => c.seed === checkpointSeed)
      if (cp) {
        cp.status = 'approved'
      }
      activeCheckpointReview.value = null

      // Refresh checkpoints
      await fetchCheckpoints()
    } else {
      const err = await response.json()
      addEvent(`Failed to approve checkpoint: ${err.error}`)
    }
  } catch (error) {
    console.error('Failed to approve checkpoint:', error)
    addEvent(`Error: ${error.message}`)
  }
}

async function rejectCheckpoint(checkpointSeed) {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const apiBase = localStorage.getItem('api_base_url') || (isLocal ? 'http://localhost:3470' : 'https://popty.ngrok.app')

    const response = await fetch(`${apiBase}/api/checkpoint/reject/${courseCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        checkpoint_seed: checkpointSeed,
        rejection_reason: 'Rejected by human reviewer'
      })
    })

    if (response.ok) {
      addEvent(`Checkpoint ${checkpointSeed} rejected - course builder paused`)

      // Update local state
      const cp = checkpoints.value.find(c => c.seed === checkpointSeed)
      if (cp) {
        cp.status = 'rejected'
      }
      activeCheckpointReview.value = null

      // Stop the builder since checkpoint was rejected
      if (progress.value.status === 'running') {
        await stopBuilder()
      }
    } else {
      const err = await response.json()
      addEvent(`Failed to reject checkpoint: ${err.error}`)
    }
  } catch (error) {
    console.error('Failed to reject checkpoint:', error)
    addEvent(`Error: ${error.message}`)
  }
}

// Cycle through modes: human -> auto -> auto_with_flag -> human
function toggleCheckpointMode(cp) {
  const modes = ['human', 'auto', 'auto_with_flag']
  const currentIndex = modes.indexOf(cp.review_mode)
  const nextIndex = (currentIndex + 1) % modes.length
  const newMode = modes[nextIndex]

  // Update local state immediately for responsive UI
  cp.review_mode = newMode

  // Persist to backend
  updateCheckpointMode(cp.seed, newMode)
}

async function updateCheckpointMode(checkpointSeed, newMode) {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const apiBase = localStorage.getItem('api_base_url') || (isLocal ? 'http://localhost:3470' : 'https://popty.ngrok.app')

    // Update mode for specific checkpoint
    const response = await fetch(`${apiBase}/api/checkpoint/config/${courseCode}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        checkpoint_seed: checkpointSeed,
        review_mode: newMode
      })
    })

    if (response.ok) {
      addEvent(`Checkpoint ${checkpointSeed} mode set to: ${newMode}`)
    } else {
      const err = await response.json()
      addEvent(`Failed to update mode: ${err.error}`)
    }
  } catch (error) {
    console.error('Failed to update checkpoint mode:', error)
    addEvent(`Error: ${error.message}`)
  }
}

async function fetchProgress() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return  // Skip if no course selected yet

  try {
    // Use localStorage api_base_url (set by EnvironmentSwitcher) to route to correct machine
    // Default to popty.ngrok.app for remote access (NOT env var - Vercel may have old value)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const apiBase = localStorage.getItem('api_base_url') || (isLocal ? 'http://localhost:3470' : 'https://popty.ngrok.app')

    // Fetch stats, build status, and agent activity in parallel
    const [statsResponse, buildResponse, activityResponse] = await Promise.all([
      fetch(`${apiBase}/api/stats/${courseCode}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      }),
      fetch(`${apiBase}/api/build/status/${courseCode}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      }),
      fetch(`${apiBase}/api/activity`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
    ])

    // Update agent tracking
    if (activityResponse.ok) {
      const activityData = await activityResponse.json()
      if (activityData.agents) {
        agents.value = activityData.agents
      }
    }

    if (statsResponse.ok) {
      const data = await statsResponse.json()
      const totalSeeds = data.total_seeds || seedCount.value

      progress.value = {
        ...progress.value,
        currentSeed: data.seeds_with_legos || data.seeds || 0,
        totalSeeds: totalSeeds,
        legosInserted: data.legos || 0,
        phrasesInserted: data.phrases || 0
      }

      // Check build status for running state
      if (buildResponse.ok) {
        const buildData = await buildResponse.json()
        if (buildData.active) {
          progress.value.status = 'running'
          progress.value.agentCount = buildData.build?.agent_count || 0
          progress.value.batchSeeds = buildData.build?.current_batch_seeds || 0
        } else if (data.seeds_with_legos >= totalSeeds && data.seeds_with_legos > 0) {
          progress.value.status = 'complete'
        } else if (progress.value.status === 'running') {
          // Build finished or was stopped
          progress.value.status = 'idle'
        }
      }

      // Handle external reset
      if (data.seeds === 0 && progress.value.status === 'complete') {
        progress.value.status = 'idle'
      }
    }

    // Also fetch checkpoint status
    await fetchCheckpoints()
  } catch (error) {
    console.error('Failed to fetch progress:', error)
  }
}

async function startBuilder() {
  const courseCode = effectiveCourseCode.value

  // Validate in create mode
  if (isCreateMode.value && !courseCode) {
    addEvent('Error: Please select both languages')
    return
  }

  try {
    // Use localStorage api_base_url (set by EnvironmentSwitcher) to route to correct machine
    // Default to popty.ngrok.app for remote access (NOT env var - Vercel may have old value)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const apiBase = localStorage.getItem('api_base_url') || (isLocal ? 'http://localhost:3470' : 'https://popty.ngrok.app')

    // If in create mode, create the course first
    if (isCreateMode.value) {
      addEvent(`Creating course ${courseCode}...`)

      const createResponse = await fetch(`${apiBase}/api/courses/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          courseCode,
          sourceLanguage: sourceLanguage.value,
          targetLanguage: targetLanguage.value,
          seedStart: 1,
          seedEnd: seedCount.value
        })
      })

      if (!createResponse.ok) {
        const err = await createResponse.json()
        throw new Error(err.error || 'Failed to create course')
      }

      addEvent(`Course ${courseCode} created`)
    }

    // Map engine selection to terminal name
    const terminalMap = { cli: 'iTerm2', terminal: 'Terminal' }
    const terminal = terminalMap[agentEngine.value] || 'iTerm2'

    // Start the course builder via Build Manager (30-seed batch agents)
    const response = await fetch(`${apiBase}/api/build/start/${courseCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ terminal, targetSeeds: seedCount.value })
    })

    const result = await response.json()
    if (!result.ok) throw new Error(result.error || 'Failed to start course builder')

    progress.value.status = 'running'
    progress.value.totalSeeds = result.progress?.total || seedCount.value
    progress.value.currentSeed = result.progress?.completed || 0
    addEvent(`Started Course Builder (${result.progress?.total || seedCount.value} seeds, 30-seed batch agents)`)

    // Navigate to the course page if we created a new one
    if (isCreateMode.value) {
      router.push(`/production/${courseCode}/text`)
    }

  } catch (error) {
    console.error('Failed to start course builder:', error)
    addEvent(`Error: ${error.message}`)
  }
}

async function stopBuilder() {
  try {
    // Use localStorage api_base_url (set by EnvironmentSwitcher) to route to correct machine
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/build/stop/${effectiveCourseCode.value}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    const result = await response.json()
    progress.value.status = 'idle'
    addEvent(`Course Builder stopped (${result.agents_used || 0} agents used)`)

  } catch (error) {
    console.error('Failed to stop builder:', error)
    addEvent(`Error: ${error.message}`)
  }
}

function resetBuilder() {
  // Just reset local UI state to unlock Start button
  // Does NOT delete data from database
  stopPolling()  // Stop polling so it doesn't immediately restore 'complete' status
  progress.value = {
    status: 'idle',
    currentSeed: 0,
    totalSeeds: 0,
    legosInserted: 0,
    phrasesInserted: 0
  }
  addEvent('UI reset - Start button unlocked (polling stopped)')
}

async function killAgent(pid) {
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/agents/${pid}`, {
      method: 'DELETE',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    const result = await response.json()
    if (result.ok) {
      addEvent(`Killed agent ${pid}`)
      // Refresh agent list
      fetchProgress()
    } else {
      addEvent(`Failed to kill agent ${pid}: ${result.error}`)
    }
  } catch (error) {
    console.error('Failed to kill agent:', error)
    addEvent(`Error killing agent: ${error.message}`)
  }
}

// Polling
let pollInterval = null

function startPolling() {
  if (pollInterval) return
  isPolling.value = true
  fetchProgress()
  pollInterval = setInterval(fetchProgress, 3000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  isPolling.value = false
}

// Load languages from API
async function loadLanguages() {
  languagesLoading.value = true
  try {
    // Use localStorage api_base_url (set by EnvironmentSwitcher) to route to correct machine
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/languages`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      languages.value = await response.json()
    }
  } catch (error) {
    console.error('Failed to load languages:', error)
    // Fallback
    languages.value = [
      { code: 'eng', name: 'English' },
      { code: 'deu', name: 'German' },
      { code: 'spa', name: 'Spanish' },
      { code: 'fra', name: 'French' },
      { code: 'zho', name: 'Chinese' },
      { code: 'jpn', name: 'Japanese' }
    ]
  } finally {
    languagesLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  startPolling()
  addEvent('Text Generation view loaded')
  if (isCreateMode.value) {
    loadLanguages()
  } else {
    // Load persisted checkpoint config for existing course
    fetchCheckpointConfig()
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.text-generation {
  min-height: 100vh;
  background: var(--color-shadow, #1e293b);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: var(--color-graphite, #475569);
  border-radius: 3px;
}
</style>
