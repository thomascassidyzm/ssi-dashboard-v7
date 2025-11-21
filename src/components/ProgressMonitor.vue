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
      <div v-if="currentPhaseData && (currentPhaseData.seedsTotal || currentPhaseData.legosTotal)" class="mb-3">
        <div class="flex items-center justify-between text-xs mb-1">
          <!-- Phase 5: Show LEGOs and seeds -->
          <span v-if="liveProgress.currentPhase === 5 && currentPhaseData.legosTotal" class="text-slate-300">
            {{ currentPhaseData.legosCompleted || 0 }} / {{ currentPhaseData.legosTotal }} LEGOs
            <span class="text-slate-500 ml-2">({{ currentPhaseData.seedsCompleted || 0 }} / {{ currentPhaseData.seedsTotal }} seeds)</span>
          </span>
          <!-- Other phases: Show agent breakdown or seeds -->
          <span v-else-if="currentPhaseData.agentCount" class="text-slate-300">
            {{ currentPhaseData.agentCount }} agents × {{ currentPhaseData.seedsPerAgent }} seeds/agent
          </span>
          <span v-else class="text-slate-300">{{ currentPhaseData.seedsCompleted || 0 }} / {{ currentPhaseData.seedsTotal }} seeds</span>

          <!-- Percentage: Use LEGOs for Phase 5, seeds for others -->
          <span class="text-emerald-400 font-medium">
            {{ liveProgress.currentPhase === 5 && currentPhaseData.legosTotal
              ? ((currentPhaseData.legosCompleted || 0) / currentPhaseData.legosTotal * 100).toFixed(1)
              : ((currentPhaseData.seedsCompleted || 0) / currentPhaseData.seedsTotal * 100).toFixed(1)
            }}%
          </span>
        </div>
        <div class="w-full bg-slate-700 rounded-full h-2.5">
          <div
            class="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
            :style="{ width: `${
              liveProgress.currentPhase === 5 && currentPhaseData.legosTotal
                ? ((currentPhaseData.legosCompleted || 0) / currentPhaseData.legosTotal * 100)
                : ((currentPhaseData.seedsCompleted || 0) / currentPhaseData.seedsTotal * 100)
            }%` }"
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

    <!-- Simple status message when not running -->
    <div v-else class="text-center py-8 text-slate-400">
      <div class="text-sm">No active pipeline running</div>
      <div class="text-xs mt-2">Start a course generation to see live progress</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  pollInterval: {
    type: Number,
    default: 5000
  },
  seedCount: {
    type: Number,
    default: null
  }
})

const liveProgress = ref(null)
const executionMode = ref('web')

const executionModeName = computed(() => {
  if (executionMode.value === 'web') return '● Web Mode'
  if (executionMode.value === 'local') return '● Local Mode'
  return '● Hybrid Mode'
})

const currentPhaseData = computed(() => {
  if (!liveProgress.value || !liveProgress.value.currentPhase) return null
  return liveProgress.value.phases[liveProgress.value.currentPhase]
})

function getPhaseTitle(phaseNum) {
  const titles = {
    1: 'Phase 1: Pedagogical Translation',
    3: 'Phase 3: LEGO Extraction + Introductions',
    5: 'Phase 5: Practice Baskets',
    7: 'Phase 7: Course Manifest',
    8: 'Phase 8: Audio/TTS Generation'
  }
  return titles[phaseNum] || `Phase ${phaseNum}`
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour12: false })
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return ''
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = Math.floor((now - then) / 1000) // seconds

  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

async function fetchProgress() {
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const response = await axios.get(`${apiBaseUrl}/api/courses/${props.courseCode}/progress`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    liveProgress.value = response.data
  } catch (error) {
    // Silently fail - progress endpoint might not exist yet
    console.log('[ProgressMonitor] Progress not available:', error.message)
  }
}

let interval = null

onMounted(() => {
  fetchProgress()
  interval = setInterval(fetchProgress, props.pollInterval)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>
