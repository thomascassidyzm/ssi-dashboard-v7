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
        <p class="text-red-300">{{ error }}</p>
        <button @click="fetchProgress" class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white">
          Retry
        </button>
      </div>

      <!-- Progress Content -->
      <div v-else-if="progress" class="space-y-6">

        <!-- Overall Status Card -->
        <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-slate-100 mb-1">Pipeline Status</h2>
              <p class="text-sm text-slate-400">Started: {{ formatTime(progress.startTime) }}</p>
            </div>
            <div class="text-right">
              <div :class="statusBadgeClass" class="inline-block px-4 py-2 rounded-full text-sm font-semibold">
                {{ progress.overallStatus.toUpperCase() }}
              </div>
              <p class="text-xs text-slate-400 mt-1">Current Phase: {{ progress.currentPhase }}</p>
            </div>
          </div>
        </div>

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

      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import EnvironmentSwitcher from '../components/EnvironmentSwitcher.vue'

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

// API config
const apiUrl = computed(() => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3456'
})

// Fetch progress
async function fetchProgress() {
  try {
    const response = await fetch(`${apiUrl.value}/api/courses/${courseCode.value}/progress`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    progress.value = data
    error.value = null
    loading.value = false
  } catch (err) {
    console.error('Error fetching progress:', err)
    error.value = err.message
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
