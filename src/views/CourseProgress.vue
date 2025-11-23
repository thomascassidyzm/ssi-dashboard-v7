<template>
  <div class="min-h-screen bg-slate-900 text-slate-100">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <router-link to="/" class="text-emerald-400 hover:text-emerald-300 text-sm mb-2 inline-block">
              ← Back to Dashboard
            </router-link>
            <h1 class="text-3xl font-bold text-emerald-400">
              Course Progress: {{ courseCode }}
            </h1>
            <p class="mt-2 text-slate-400" v-if="progress">
              Status: <span :class="statusColor">{{ progress.overallStatus }}</span>
            </p>
          </div>
          <EnvironmentSwitcher />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Loading State -->
      <div v-if="loading && !progress" class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8 text-center">
        <div class="animate-pulse">
          <div class="text-4xl mb-4">⏳</div>
          <p class="text-slate-300">Loading progress...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <h3 class="text-xl font-semibold text-red-400 mb-2">Error Loading Progress</h3>
        <p class="text-red-300 mb-2">{{ error }}</p>
        <p class="text-xs text-red-400/60">Trying to reach: {{ apiUrl }}</p>
        <button @click="fetchProgress" class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white">
          Retry
        </button>
      </div>

      <!-- Progress Content -->
      <div v-else-if="progress" class="space-y-6">

        <!-- Friendly Pipeline Progress (shown while running) -->
        <PipelineProgress
          v-if="progress.overallStatus === 'running'"
          :course-code="courseCode"
          :current-phase="currentPhaseNumber"
          :seeds-processed="seedsProcessed"
          :total-seeds="totalSeeds"
          :started-at="progress.startTime"
        />

        <!-- Completion Card (shown when complete) -->
        <div v-if="progress.overallStatus === 'complete'" class="bg-slate-800/50 rounded-lg border border-emerald-500/30 p-8">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-semibold text-emerald-400">Course Ready!</h2>
              <p class="text-slate-400">{{ courseCode }} generated successfully</p>
            </div>
          </div>
          <router-link
            :to="`/courses/${courseCode}/edit`"
            class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-colors"
          >
            <span>View Course</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </router-link>
        </div>

        <!-- Technical Details (collapsible) -->
        <details class="group" open>
          <summary class="cursor-pointer text-slate-400 hover:text-slate-300 text-sm mb-4 flex items-center gap-2">
            <svg class="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            Technical Details
          </summary>

        <!-- Phase Progress Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Phase 1 -->
          <PhaseCard
            :phase="1"
            title="Translation"
            :data="progress.phases[1]"
            color="blue"
          />

          <!-- Phase 3 -->
          <PhaseCard
            :phase="3"
            title="LEGO Extraction"
            :data="progress.phases[3]"
            color="purple"
          />

          <!-- Phase 5 -->
          <PhaseCard
            :phase="5"
            title="Basket Generation"
            :data="progress.phases[5]"
            color="pink"
          />

          <!-- Phase 7 -->
          <PhaseCard
            :phase="7"
            title="Manifest Compilation"
            :data="progress.phases[7]"
            color="teal"
          />

          <!-- Phase 8 -->
          <PhaseCard
            :phase="8"
            title="Audio Generation"
            :data="progress.phases[8]"
            color="emerald"
          />
        </div>

        <!-- Live Logs -->
        <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
          <h2 class="text-xl font-semibold text-slate-100 mb-4">Live Logs</h2>
          <div class="bg-slate-900/80 rounded p-4 font-mono text-sm max-h-96 overflow-y-auto">
            <div v-if="progress.recentLogs && progress.recentLogs.length > 0" class="space-y-1">
              <div v-for="(log, index) in progress.recentLogs" :key="index" class="flex gap-3">
                <span class="text-slate-500">{{ formatLogTime(log.time) }}</span>
                <span :class="logLevelColor(log.level)">{{ log.message }}</span>
              </div>
            </div>
            <div v-else class="text-slate-500 text-center py-8">
              No logs yet...
            </div>
          </div>
        </div>
        </details>

      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import EnvironmentSwitcher from '../components/EnvironmentSwitcher.vue'
import PipelineProgress from '../components/PipelineProgress.vue'

const route = useRoute()
const courseCode = ref(route.params.code)

const progress = ref(null)
const loading = ref(true)
const error = ref(null)
let pollInterval = null

// Computed properties
const statusColor = computed(() => {
  if (!progress.value) return ''
  const status = progress.value.overallStatus
  return {
    'running': 'text-emerald-400',
    'complete': 'text-green-400',
    'error': 'text-red-400',
    'idle': 'text-slate-400'
  }[status] || 'text-slate-400'
})

const statusBadgeClass = computed(() => {
  if (!progress.value) return ''
  const status = progress.value.overallStatus
  return {
    'running': 'bg-emerald-600 text-white',
    'complete': 'bg-green-600 text-white',
    'error': 'bg-red-600 text-white',
    'idle': 'bg-slate-600 text-white'
  }[status] || 'bg-slate-600 text-white'
})

// For PipelineProgress component
const currentPhaseNumber = computed(() => {
  if (!progress.value) return 1
  return progress.value.currentPhase || 1
})

const seedsProcessed = computed(() => {
  if (!progress.value?.phases) return 0
  const phase1 = progress.value.phases[1]
  if (phase1?.seedsComplete) return phase1.seedsComplete
  return 0
})

const totalSeeds = computed(() => {
  if (!progress.value?.phases) return 30
  const phase1 = progress.value.phases[1]
  if (phase1?.seedsTotal) return phase1.seedsTotal
  return 30
})

// API config
const apiUrl = computed(() => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
})

// Fetch progress
async function fetchProgress() {
  try {
    const response = await fetch(`${apiUrl.value}/api/courses/${courseCode.value}/progress`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    })

    if (!response.ok) {
      // Handle 404 - course not found or not running
      if (response.status === 404) {
        const data = await response.json().catch(() => ({}))
        error.value = data.error || 'Course not found or not currently running on this server'
        loading.value = false
        return
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    progress.value = data
    error.value = null
    loading.value = false
  } catch (err) {
    console.error('Error fetching progress:', err)
    // Better error messages for common issues
    if (err.message.includes('Failed to fetch') || err.message.includes('Load failed')) {
      error.value = `Cannot connect to ${apiUrl.value}. Make sure the orchestrator is running and accessible from your device.`
    } else {
      error.value = err.message
    }
    loading.value = false
  }
}

// Format timestamp
function formatTime(isoString) {
  if (!isoString) return 'N/A'
  const date = new Date(isoString)
  return date.toLocaleString()
}

// Format log timestamp
function formatLogTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleTimeString()
}

// Log level color
function logLevelColor(level) {
  return {
    'info': 'text-slate-300',
    'warning': 'text-yellow-400',
    'error': 'text-red-400'
  }[level] || 'text-slate-300'
}

// Lifecycle
onMounted(() => {
  fetchProgress()

  // Poll every 2 seconds
  pollInterval = setInterval(fetchProgress, 2000)
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>

<script>
// Phase Card Component
import { defineComponent } from 'vue'

const PhaseCard = defineComponent({
  name: 'PhaseCard',
  props: {
    phase: Number,
    title: String,
    data: Object,
    color: String
  },
  computed: {
    statusIcon() {
      if (!this.data || this.data.status === 'pending') return '⏳'
      if (this.data.status === 'running') return '🔄'
      if (this.data.status === 'complete') return '✅'
      if (this.data.status === 'validating') return '🔍'
      return '⏳'
    },
    statusText() {
      if (!this.data) return 'Pending'
      return this.data.status.charAt(0).toUpperCase() + this.data.status.slice(1)
    },
    borderColor() {
      const colors = {
        blue: 'border-blue-500',
        purple: 'border-purple-500',
        pink: 'border-pink-500',
        teal: 'border-teal-500',
        emerald: 'border-emerald-500'
      }
      return colors[this.color] || 'border-slate-500'
    },
    bgColor() {
      const colors = {
        blue: 'bg-blue-500/10',
        purple: 'bg-purple-500/10',
        pink: 'bg-pink-500/10',
        teal: 'bg-teal-500/10',
        emerald: 'bg-emerald-500/10'
      }
      return colors[this.color] || 'bg-slate-500/10'
    }
  },
  template: `
    <div :class="['rounded-lg border-2 p-4', borderColor, bgColor]">
      <div class="flex items-center justify-between mb-3">
        <div>
          <div class="text-2xl font-bold">{{ phase }}</div>
          <div class="text-sm text-slate-400">{{ title }}</div>
        </div>
        <div class="text-3xl">{{ statusIcon }}</div>
      </div>

      <div class="text-sm">
        <div class="text-slate-300 font-semibold mb-2">{{ statusText }}</div>

        <div v-if="data && data.status === 'complete'" class="space-y-1 text-xs text-slate-400">
          <div v-if="data.seedsComplete">Seeds: {{ data.seedsComplete }}</div>
          <div v-if="data.legoCount">LEGOs: {{ data.legoCount }}</div>
          <div v-if="data.introCount">Intros: {{ data.introCount }}</div>
          <div v-if="data.basketCount">Baskets: {{ data.basketCount }}</div>
          <div v-if="data.phraseCount">Phrases: {{ data.phraseCount }}</div>
          <div v-if="data.validation && data.validation.passed !== undefined" :class="data.validation.passed ? 'text-green-400' : 'text-yellow-400'">
            {{ data.validation.passed ? '✅ Validation passed' : '⚠️ Validation warnings' }}
          </div>
        </div>
      </div>
    </div>
  `
})

export default {
  components: {
    EnvironmentSwitcher,
    PhaseCard
  }
}
</script>
