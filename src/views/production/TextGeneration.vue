<template>
  <div class="text-generation">
    <div class="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <!-- Subtitle -->
      <p class="text-sm text-slate-400">
        Build course content using the Course Builder agent
      </p>

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

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
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

// Progress state
const progress = ref({
  status: 'idle',
  currentSeed: 0,
  totalSeeds: 0,
  legosInserted: 0,
  phrasesInserted: 0
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

async function fetchProgress() {
  try {
    const builderApiUrl = import.meta.env.VITE_COURSE_BUILDER_API_URL || 'http://localhost:3471'
    const response = await fetch(`${builderApiUrl}/api/stats/${props.courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (response.ok) {
      const data = await response.json()
      progress.value = {
        ...progress.value,
        currentSeed: data.seeds || 0,
        totalSeeds: seedCount.value,
        legosInserted: data.legos || 0,
        phrasesInserted: data.phrases || 0
      }

      // Update status based on progress
      if (data.seeds >= seedCount.value && data.seeds > 0) {
        progress.value.status = 'complete'
      } else if (data.seeds === 0 && progress.value.status === 'complete') {
        // Course was reset externally - go back to idle
        progress.value.status = 'idle'
      }
    }
  } catch (error) {
    console.error('Failed to fetch progress:', error)
  }
}

async function startBuilder() {
  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const response = await fetch(`${apiBase}/api/courses/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode: props.courseCode,
        buildMode: 'course-builder',
        spawnerMode: agentEngine.value,
        seedCount: seedCount.value,
        mode: seedCount.value === 30 ? 'quick_test' : seedCount.value === 260 ? 'mvp_course' : 'full_course'
      })
    })

    if (!response.ok) throw new Error('Failed to start course builder')

    progress.value.status = 'running'
    progress.value.totalSeeds = seedCount.value
    addEvent(`Started Course Builder (${seedCount.value} seeds)`)

  } catch (error) {
    console.error('Failed to start course builder:', error)
    addEvent(`Error: ${error.message}`)
  }
}

async function stopBuilder() {
  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    await fetch(`${apiBase}/api/cancel/${props.courseCode}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    progress.value.status = 'idle'
    addEvent('Course Builder stopped')

  } catch (error) {
    console.error('Failed to stop builder:', error)
    addEvent(`Error: ${error.message}`)
  }
}

function resetBuilder() {
  progress.value = {
    status: 'idle',
    currentSeed: 0,
    totalSeeds: 0,
    legosInserted: 0,
    phrasesInserted: 0
  }
  addEvent('Progress reset')
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

// Lifecycle
onMounted(() => {
  startPolling()
  addEvent('Text Generation view loaded')
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
