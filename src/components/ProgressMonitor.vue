<template>
  <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
    <h3 class="text-xl font-semibold text-slate-100 mb-4">Progress Monitor</h3>

    <!-- Execution Mode Badge -->
    <div class="mb-4">
      <span
        :class="[
          'px-3 py-1 text-xs font-semibold rounded-full',
          executionMode === 'web' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' :
          executionMode === 'local' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' :
          'bg-purple-500/20 text-purple-400 border border-purple-500/50'
        ]"
      >
        {{ executionModeName }}
      </span>
    </div>

    <!-- Live Progress (from new API) -->
    <div v-if="liveProgress && liveProgress.overallStatus === 'running'" class="mb-6 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <div class="text-emerald-400 animate-pulse text-xl">●</div>
          <div>
            <div class="text-lg font-semibold text-emerald-400">{{ getPhaseTitle(liveProgress.currentPhase) }}</div>
            <div class="text-xs text-slate-400">Started {{ formatRelativeTime(liveProgress.startTime) }}</div>
          </div>
        </div>
        <div v-if="currentPhaseData && currentPhaseData.eta" class="text-right">
          <div class="text-xs text-slate-400">ETA</div>
          <div class="text-sm font-medium text-emerald-400">{{ currentPhaseData.etaHuman }}</div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div v-if="currentPhaseData && currentPhaseData.seedsTotal" class="mb-3">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-slate-300">{{ currentPhaseData.seedsCompleted || 0 }} / {{ currentPhaseData.seedsTotal }} seeds</span>
          <span class="text-emerald-400 font-medium">{{ ((currentPhaseData.seedsCompleted || 0) / currentPhaseData.seedsTotal * 100).toFixed(1) }}%</span>
        </div>
        <div class="w-full bg-slate-700 rounded-full h-2.5">
          <div
            class="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
            :style="{ width: `${((currentPhaseData.seedsCompleted || 0) / currentPhaseData.seedsTotal * 100)}%` }"
          ></div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div v-if="liveProgress.recentLogs && liveProgress.recentLogs.length > 0" class="bg-slate-900/50 rounded p-2 max-h-32 overflow-y-auto">
        <div class="text-xs font-medium text-slate-400 mb-1.5">Recent Activity</div>
        <div v-for="(log, i) in liveProgress.recentLogs.slice(0, 5)" :key="i" class="text-xs text-slate-300 py-0.5">
          <span class="text-slate-500">{{ formatTime(log.time) }}</span>
          <span class="mx-1">•</span>
          <span>{{ log.message }}</span>
        </div>
      </div>
    </div>

    <!-- Phase Progress -->
    <div class="space-y-4">
      <!-- Phase 1: Translation -->
      <div class="bg-slate-900/50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div v-if="phase1Complete" class="text-green-400">✓</div>
            <div v-else-if="phase1Active" class="text-yellow-400 animate-pulse">●</div>
            <div v-else class="text-slate-600">○</div>
            <span class="text-sm font-medium text-slate-300">Phase 1: Pedagogical Translation</span>
          </div>
          <span v-if="phase1FileExists" class="text-xs text-green-400">seed_pairs.json ✓</span>
        </div>
        <div v-if="phase1Active || phase1Complete" class="text-xs text-slate-400 ml-10">
          Translating {{ seedCount }} canonical sentences to {{ courseCode }}
        </div>
        <!-- Phase 1 detailed progress -->
        <div v-if="phase1Data && phase1Data.seedsTotal" class="ml-10 mt-2">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-emerald-400 font-medium">{{ phase1Data.seedsCompleted || 0 }}/{{ phase1Data.seedsTotal }} seeds</span>
            <div class="flex-1 bg-slate-700 rounded-full h-1.5">
              <div class="bg-emerald-500 h-1.5 rounded-full transition-all" :style="{ width: `${((phase1Data.seedsCompleted || 0) / phase1Data.seedsTotal * 100)}%` }"></div>
            </div>
            <span class="text-slate-500">{{ ((phase1Data.seedsCompleted || 0) / phase1Data.seedsTotal * 100).toFixed(0) }}%</span>
          </div>
          <div v-if="phase1Data.etaHuman" class="text-xs text-slate-500 mt-1">ETA: {{ phase1Data.etaHuman }}</div>
        </div>
      </div>

      <!-- Phase 3: LEGO Extraction + Introductions -->
      <div class="bg-slate-900/50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div v-if="phase3Complete" class="text-green-400">✓</div>
            <div v-else-if="phase3Active" class="text-yellow-400 animate-pulse">●</div>
            <div v-else class="text-slate-600">○</div>
            <span class="text-sm font-medium text-slate-300">Phase 3: LEGO Extraction + Introductions</span>
          </div>
          <div class="flex gap-2">
            <span v-if="phase3FileExists" class="text-xs text-green-400">lego_pairs.json ✓</span>
            <span v-if="introductionsFileExists" class="text-xs text-green-400">introductions.json ✓</span>
          </div>
        </div>
        <div v-if="phase3Active || phase3Complete" class="text-xs text-slate-400 ml-10">
          Extracting building blocks + generating intro presentations (~1s overhead)
        </div>
        <div v-if="phase3Active && subProgress && subProgress.phase === 'phase_3'" class="ml-10 mt-2">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-emerald-400 font-medium">{{ subProgress.completed }}/{{ subProgress.total }} agents</span>
            <div class="flex-1 bg-slate-700 rounded-full h-1.5">
              <div class="bg-emerald-500 h-1.5 rounded-full transition-all" :style="{ width: `${subProgress.percentage}%` }"></div>
            </div>
            <span class="text-slate-500">{{ subProgress.percentage }}%</span>
          </div>
        </div>
      </div>

      <!-- Phase 5: Practice Baskets -->
      <div class="bg-slate-900/50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div v-if="phase5Complete" class="text-green-400">✓</div>
            <div v-else-if="phase5Active" class="text-yellow-400 animate-pulse">●</div>
            <div v-else class="text-slate-600">○</div>
            <span class="text-sm font-medium text-slate-300">Phase 5: Practice Baskets</span>
          </div>
          <span v-if="phase5FileExists" class="text-xs text-green-400">lego_baskets.json ✓</span>
        </div>
        <div v-if="phase5Active || phase5Complete" class="text-xs text-slate-400 ml-10">
          Generating practice phrases for each LEGO
        </div>

        <!-- Phase 5 Progress from API -->
        <div v-if="phase5Progress" class="ml-10 mt-2 space-y-1">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-emerald-400 font-medium">
              {{ phase5Progress.totalBaskets }}/{{ phase5Progress.totalNeeded }} baskets
            </span>
            <div class="flex-1 bg-slate-700 rounded-full h-1.5">
              <div class="bg-emerald-500 h-1.5 rounded-full transition-all" :style="{ width: `${phase5Progress.progress}%` }"></div>
            </div>
            <span class="text-slate-500">{{ phase5Progress.progress.toFixed(1) }}%</span>
          </div>
          <div v-if="phase5Progress.missing > 0" class="text-xs text-yellow-400">
            {{ phase5Progress.missing }} missing basket{{ phase5Progress.missing !== 1 ? 's' : '' }}
          </div>
          <div v-if="phase5Progress.activeAgents && phase5Progress.activeAgents.length > 0" class="text-xs text-blue-400">
            {{ phase5Progress.activeAgents.length }} agent{{ phase5Progress.activeAgents.length !== 1 ? 's' : '' }} active
          </div>
        </div>

        <!-- Legacy sub-progress (fallback) -->
        <div v-else-if="phase5Active && subProgress && subProgress.phase === 'phase_5'" class="ml-10 mt-2">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-emerald-400 font-medium">{{ subProgress.completed }}/{{ subProgress.total }} agents</span>
            <div class="flex-1 bg-slate-700 rounded-full h-1.5">
              <div class="bg-emerald-500 h-1.5 rounded-full transition-all" :style="{ width: `${subProgress.percentage}%` }"></div>
            </div>
            <span class="text-slate-500">{{ subProgress.percentage }}%</span>
          </div>
        </div>
      </div>

      <!-- Phase 7: Course Manifest -->
      <div class="bg-slate-900/50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div v-if="phase7Complete" class="text-green-400">✓</div>
            <div v-else-if="phase7Active" class="text-yellow-400 animate-pulse">●</div>
            <div v-else class="text-slate-600">○</div>
            <span class="text-sm font-medium text-slate-300">Phase 7: Course Manifest</span>
          </div>
          <span v-if="phase7FileExists" class="text-xs text-green-400">course_manifest.json ✓</span>
        </div>
        <div v-if="phase7Active || phase7Complete" class="text-xs text-slate-400 ml-10">
          Compiling final manifest for app deployment (~5 seconds)
        </div>
      </div>
    </div>

    <!-- Event Timeline -->
    <div v-if="events.length > 0" class="mt-6 bg-slate-800/50 rounded-lg p-4">
      <h4 class="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        📋 Activity Timeline
        <span class="text-xs text-slate-500">({{ events.length }} events)</span>
      </h4>

      <div class="space-y-2 max-h-64 overflow-y-auto">
        <div
          v-for="(event, i) in reversedEvents"
          :key="i"
          class="flex items-start gap-3 text-xs bg-slate-900/50 rounded p-2"
        >
          <span class="text-slate-500">{{ formatTime(event.timestamp) }}</span>
          <span :class="eventIconClass(event.type)">{{ getEventIcon(event.type) }}</span>
          <span class="text-slate-300 flex-1">{{ formatEvent(event) }}</span>
        </div>
      </div>
    </div>

    <!-- Git Activity -->
    <div v-if="gitStats.branchesDetected > 0" class="mt-4 bg-slate-800/50 rounded-lg p-4">
      <h4 class="text-sm font-semibold text-slate-300 mb-3">
        🌿 Git Activity
      </h4>

      <div class="space-y-2 text-xs">
        <div v-if="gitStats.branchesDetected > 0" class="flex items-center gap-2">
          <span class="text-blue-400">📤</span>
          <span class="text-slate-300">{{ gitStats.branchesDetected }} branch(es) detected</span>
        </div>
        <div v-if="gitStats.branchesMerged > 0" class="flex items-center gap-2">
          <span class="text-green-400">✓</span>
          <span class="text-slate-300">{{ gitStats.branchesMerged }} branch(es) merged</span>
        </div>
        <div v-if="gitStats.pushesToMain > 0" class="flex items-center gap-2">
          <span class="text-emerald-400">🚀</span>
          <span class="text-slate-300">{{ gitStats.pushesToMain }} push(es) to main</span>
        </div>
      </div>
    </div>

    <!-- Web Mode Instructions -->
    <div v-if="executionMode === 'web' && status === 'web_mode_waiting'" class="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <div class="flex items-start gap-3">
        <div class="text-blue-400 text-xl">✨</div>
        <div class="text-sm">
          <p class="font-medium text-blue-400 mb-2">Prompts Auto-Pasted!</p>
          <ol class="list-decimal list-inside space-y-1 text-slate-300">
            <li>Browser tabs opened automatically</li>
            <li>Prompts pasted into each tab via osascript</li>
            <li><strong>Just hit Enter in each tab to execute!</strong></li>
            <li>Outputs will appear in VFS when complete</li>
          </ol>
        </div>
      </div>
    </div>

    <!-- Auto-refresh notice -->
    <div class="mt-4 text-xs text-slate-500 text-center">
      Checking for updates every {{ pollInterval / 1000 }}s
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiClient } from '../services/api'
import { GITHUB_CONFIG } from '../config/github'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  executionMode: {
    type: String,
    default: 'local'
  },
  seedCount: {
    type: Number,
    default: 0
  },
  pollInterval: {
    type: Number,
    default: 5000 // 5 seconds
  }
})

// State
const status = ref('initializing')
const currentPhase = ref('')
const currentMessage = ref('')
const subProgress = ref(null)
const phase1FileExists = ref(false)
const phase3FileExists = ref(false)
const introductionsFileExists = ref(false)
const phase5FileExists = ref(false)
const phase7FileExists = ref(false)
const phase5Progress = ref(null)
const events = ref([])
const windows = ref([])

// New live progress state
const liveProgress = ref(null)
const phase1Data = ref(null)
const phase3Data = ref(null)

let pollTimer = null

// Computed for current phase data
const currentPhaseData = computed(() => {
  if (!liveProgress.value || !liveProgress.value.phases) return null
  return liveProgress.value.phases[liveProgress.value.currentPhase]
})

// Computed
const executionModeName = computed(() => {
  if (props.executionMode === 'web') return '🌐 Web Mode'
  if (props.executionMode === 'local') return '💻 Local Mode'
  if (props.executionMode === 'api') return '⚡ API Mode'
  return 'Unknown'
})

const phase1Active = computed(() => {
  return currentPhase.value.includes('phase_1') && !phase1Complete.value
})

const phase1Complete = computed(() => {
  return phase1FileExists.value || currentPhase.value.includes('phase_1_complete')
})

const phase3Active = computed(() => {
  return currentPhase.value.includes('phase_3') && !phase3Complete.value
})

const phase3Complete = computed(() => {
  return phase3FileExists.value || currentPhase.value.includes('phase_3_complete')
})

const phase5Active = computed(() => {
  return currentPhase.value.includes('phase_5') && !phase5Complete.value
})

const phase5Complete = computed(() => {
  return phase5FileExists.value || currentPhase.value.includes('phase_5_complete')
})

const phase7Active = computed(() => {
  return currentPhase.value.includes('phase_7') && !phase7Complete.value
})

const phase7Complete = computed(() => {
  return phase7FileExists.value || status.value === 'completed'
})

const reversedEvents = computed(() => {
  return [...events.value].reverse()
})

const gitStats = computed(() => {
  return {
    branchesDetected: events.value.filter(e => e.type === 'branch_detected').length,
    branchesMerged: events.value.filter(e => e.type === 'branch_merged').length,
    pushesToMain: events.value.filter(e => e.type === 'push_complete').length
  }
})

// Methods
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const getEventIcon = (type) => {
  const icons = {
    window_opening: '🪟',
    window_ready: '✓',
    branch_detected: '📤',
    branch_merging: '⚙️',
    branch_merged: '✓',
    push_complete: '🚀',
    phase_started: '▶️',
    phase_complete: '✅'
  }
  return icons[type] || '•'
}

const eventIconClass = (type) => {
  const classes = {
    window_opening: 'text-blue-400',
    window_ready: 'text-green-400',
    branch_detected: 'text-cyan-400',
    branch_merging: 'text-yellow-400',
    branch_merged: 'text-green-400',
    push_complete: 'text-emerald-400',
    phase_started: 'text-purple-400',
    phase_complete: 'text-green-500'
  }
  return classes[type] || 'text-slate-400'
}

const formatEvent = (event) => {
  switch (event.type) {
    case 'window_opening':
      return `Opening window ${event.window} in ${event.browser}`
    case 'window_ready':
      return `Window ${event.window} ready - ${event.message}`
    case 'branch_detected':
      return `Detected new branch: ${event.branch}`
    case 'branch_merging':
      return `Merging ${event.branch}...`
    case 'branch_merged':
      return `Merged ${event.branch} → ${event.target}`
    case 'push_complete':
      return `Pushed ${event.branch} to ${event.remote}`
    case 'phase_started':
      return `Phase ${event.phase} started`
    case 'phase_complete':
      return `Phase ${event.phase} complete`
    default:
      return event.type
  }
}

// Helper methods
const getPhaseTitle = (phase) => {
  const titles = {
    1: 'Phase 1: Pedagogical Translation',
    3: 'Phase 3: LEGO Extraction + Introductions',
    5: 'Phase 5: Practice Basket Generation',
    7: 'Phase 7: Course Manifest Compilation',
    8: 'Phase 8: Audio Generation'
  }
  return titles[phase] || `Phase ${phase}`
}

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return ''
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  return `${diffHours}h ${diffMins % 60}m ago`
}

// Methods
const checkProgress = async () => {
  try {
    // Get NEW live progress API (real-time updates with ETA)
    try {
      const progressResponse = await apiClient.get(`/api/courses/${props.courseCode}/progress`)
      if (progressResponse.data) {
        liveProgress.value = progressResponse.data
        // Extract phase-specific data
        if (progressResponse.data.phases) {
          phase1Data.value = progressResponse.data.phases[1]
          phase3Data.value = progressResponse.data.phases[3]
        }
      }
    } catch (err) {
      console.warn('[ProgressMonitor] Could not fetch live progress:', err.message)
    }

    // Get job status (legacy - for compatibility)
    const jobResponse = await apiClient.get(`/api/courses/${props.courseCode}/status`)
    if (jobResponse.data) {
      status.value = jobResponse.data.status
      currentPhase.value = jobResponse.data.phase || ''
      currentMessage.value = jobResponse.data.message || ''
      subProgress.value = jobResponse.data.subProgress || null
      events.value = jobResponse.data.events || []
      windows.value = jobResponse.data.windows || []
    }

    // Get Phase 5 progress from progress-tracker API
    try {
      const phase5Response = await fetch(`http://localhost:3462/api/progress/${props.courseCode}/phase5`)
      if (phase5Response.ok) {
        const phase5Data = await phase5Response.json()
        if (phase5Data.success) {
          phase5Progress.value = phase5Data
        }
      }
    } catch (err) {
      console.warn('[ProgressMonitor] Could not fetch Phase 5 progress:', err.message)
    }

    // Check for output files (VFS-based detection)
    // For segment ranges, check base course directory for seed_pairs.json and lego_pairs.json
    const segmentMatch = props.courseCode.match(/^([a-z]{3}_for_[a-z]{3})_s\d{4}-\d{4}$/)
    const baseCourseCode = segmentMatch ? segmentMatch[1] : props.courseCode

    try {
      const seedPairsCheck = await fetch(GITHUB_CONFIG.getCourseFileUrl(baseCourseCode, 'seed_pairs.json'), { method: 'HEAD' })
      phase1FileExists.value = seedPairsCheck.ok
    } catch (err) {
      phase1FileExists.value = false
    }

    try {
      const legoPairsCheck = await fetch(GITHUB_CONFIG.getCourseFileUrl(baseCourseCode, 'lego_pairs.json'), { method: 'HEAD' })
      phase3FileExists.value = legoPairsCheck.ok
    } catch (err) {
      phase3FileExists.value = false
    }

    try {
      const basketsCheck = await fetch(GITHUB_CONFIG.getCourseFileUrl(baseCourseCode, 'lego_baskets.json'), { method: 'HEAD' })
      phase5FileExists.value = basketsCheck.ok
    } catch (err) {
      phase5FileExists.value = false
    }

    try {
      const introductionsCheck = await fetch(GITHUB_CONFIG.getCourseFileUrl(baseCourseCode, 'introductions.json'), { method: 'HEAD' })
      introductionsFileExists.value = introductionsCheck.ok
    } catch (err) {
      introductionsFileExists.value = false
    }

    try {
      const manifestCheck = await fetch(GITHUB_CONFIG.getCourseFileUrl(baseCourseCode, 'course_manifest.json'), { method: 'HEAD' })
      phase7FileExists.value = manifestCheck.ok
    } catch (err) {
      phase7FileExists.value = false
    }

  } catch (error) {
    console.error('[ProgressMonitor] Failed to check progress:', error)
  }
}

const startPolling = () => {
  checkProgress() // Initial check
  pollTimer = setInterval(checkProgress, props.pollInterval)
}

const stopPolling = () => {
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
</script>
