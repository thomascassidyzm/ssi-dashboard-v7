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
      </div>

      <!-- Phase 3: LEGO Extraction -->
      <div class="bg-slate-900/50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div v-if="phase3Complete" class="text-green-400">✓</div>
            <div v-else-if="phase3Active" class="text-yellow-400 animate-pulse">●</div>
            <div v-else class="text-slate-600">○</div>
            <span class="text-sm font-medium text-slate-300">Phase 3: LEGO Extraction</span>
          </div>
          <span v-if="phase3FileExists" class="text-xs text-green-400">lego_pairs.json ✓</span>
        </div>
        <div v-if="phase3Active || phase3Complete" class="text-xs text-slate-400 ml-10">
          Extracting linguistic building blocks from seed pairs
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
          <span v-if="phase5FileExists" class="text-xs text-green-400">baskets/ ✓</span>
        </div>
        <div v-if="phase5Active || phase5Complete" class="text-xs text-slate-400 ml-10">
          Generating practice phrases for each LEGO
        </div>
        <div v-if="phase5Active && subProgress && subProgress.phase === 'phase_5'" class="ml-10 mt-2">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-emerald-400 font-medium">{{ subProgress.completed }}/{{ subProgress.total }} agents</span>
            <div class="flex-1 bg-slate-700 rounded-full h-1.5">
              <div class="bg-emerald-500 h-1.5 rounded-full transition-all" :style="{ width: `${subProgress.percentage}%` }"></div>
            </div>
            <span class="text-slate-500">{{ subProgress.percentage }}%</span>
          </div>
        </div>
      </div>

      <!-- Phase 6: Introductions -->
      <div class="bg-slate-900/50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div v-if="phase6Complete" class="text-green-400">✓</div>
            <div v-else-if="phase6Active" class="text-yellow-400 animate-pulse">●</div>
            <div v-else class="text-slate-600">○</div>
            <span class="text-sm font-medium text-slate-300">Phase 6: Introductions</span>
          </div>
          <span v-if="phase6FileExists" class="text-xs text-green-400">introductions.json ✓</span>
        </div>
        <div v-if="phase6Active || phase6Complete" class="text-xs text-slate-400 ml-10">
          Generating LEGO presentation text (~2 seconds)
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
    default: 30000 // 30 seconds
  }
})

// State
const status = ref('initializing')
const currentPhase = ref('')
const currentMessage = ref('')
const subProgress = ref(null)
const phase1FileExists = ref(false)
const phase3FileExists = ref(false)
const phase5FileExists = ref(false)
const phase6FileExists = ref(false)
const phase7FileExists = ref(false)

let pollTimer = null

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

const phase6Active = computed(() => {
  return currentPhase.value.includes('phase_6') && !phase6Complete.value
})

const phase6Complete = computed(() => {
  return phase6FileExists.value || currentPhase.value.includes('phase_6_complete') || phase7Active.value || phase7Complete.value
})

const phase7Active = computed(() => {
  return currentPhase.value.includes('phase_7') && !phase7Complete.value
})

const phase7Complete = computed(() => {
  return phase7FileExists.value || status.value === 'completed'
})

// Methods
const checkProgress = async () => {
  try {
    // Get job status
    const jobResponse = await apiClient.get(`/api/courses/${props.courseCode}/status`)
    if (jobResponse.data) {
      status.value = jobResponse.data.status
      currentPhase.value = jobResponse.data.phase || ''
      currentMessage.value = jobResponse.data.message || ''
      subProgress.value = jobResponse.data.subProgress || null
    }

    // Check for output files (VFS-based detection)
    // For segment ranges, check base course directory for seed_pairs.json and lego_pairs.json
    const segmentMatch = props.courseCode.match(/^([a-z]{3}_for_[a-z]{3})_s\d{4}-\d{4}$/)
    const baseCourseCode = segmentMatch ? segmentMatch[1] : props.courseCode

    try {
      const seedPairsCheck = await fetch(`/vfs/courses/${baseCourseCode}/seed_pairs.json`, { method: 'HEAD' })
      phase1FileExists.value = seedPairsCheck.ok
    } catch (err) {
      phase1FileExists.value = false
    }

    try {
      const legoPairsCheck = await fetch(`/vfs/courses/${baseCourseCode}/lego_pairs.json`, { method: 'HEAD' })
      phase3FileExists.value = legoPairsCheck.ok
    } catch (err) {
      phase3FileExists.value = false
    }

    try {
      const basketsCheck = await fetch(`/vfs/courses/${baseCourseCode}/baskets/`, { method: 'HEAD' })
      phase5FileExists.value = basketsCheck.ok
    } catch (err) {
      phase5FileExists.value = false
    }

    try {
      const introductionsCheck = await fetch(`/vfs/courses/${baseCourseCode}/introductions.json`, { method: 'HEAD' })
      phase6FileExists.value = introductionsCheck.ok
    } catch (err) {
      phase6FileExists.value = false
    }

    try {
      const manifestCheck = await fetch(`/vfs/courses/${baseCourseCode}/course_manifest.json`, { method: 'HEAD' })
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
