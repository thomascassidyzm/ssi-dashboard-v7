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
              v-model="knownLanguage"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="" disabled selected>{{ languagesLoading ? 'Loading...' : 'Select known language' }}</option>
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
              <option value="" disabled selected>{{ languagesLoading ? 'Loading...' : 'Select target language' }}</option>
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
          <!-- Job Target -->
          <div>
            <label class="block text-xs text-slate-500 mb-2">Job Target</label>
            <div class="flex gap-2 items-center">
              <button
                v-for="size in courseSizes"
                :key="size.seeds"
                @click="seedCount = size.seeds"
                class="px-3 py-2 rounded-lg border transition-all text-sm"
                :class="seedCount === size.seeds
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500/50'"
              >
                <div class="font-medium">{{ size.label }}</div>
                <div class="text-xs opacity-70">{{ size.seeds }}</div>
              </button>
              <div class="flex items-center gap-2 ml-2">
                <span class="text-xs text-slate-500">Run to:</span>
                <input
                  v-model.number="seedCount"
                  type="number"
                  min="1"
                  max="1000"
                  class="w-20 px-2 py-2 rounded-lg border bg-slate-700/50 border-slate-600/50 text-slate-200 text-sm text-center"
                />
              </div>
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
        <div class="grid grid-cols-6 gap-4 text-center">
          <!-- Pass 1: Translated Seeds -->
          <div class="bg-slate-700/30 rounded-lg p-3 relative">
            <div class="absolute top-1 left-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Pass 1</div>
            <div class="text-2xl font-mono font-semibold text-slate-200 mt-2">
              {{ progress.seedsTranslated || 0 }}
            </div>
            <div class="text-xs text-slate-500">/ {{ progress.totalSeeds || seedCount }} translated</div>
          </div>
          <!-- Pass 2: Decomposed Seeds -->
          <div class="bg-slate-700/30 rounded-lg p-3 relative">
            <div class="absolute top-1 left-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Pass 2</div>
            <div class="text-2xl font-mono font-semibold text-slate-200 mt-2">
              {{ progress.currentSeed }}
            </div>
            <div class="text-xs text-slate-500">/ {{ progress.totalSeeds || seedCount }} decomposed</div>
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
          <div class="bg-slate-700/30 rounded-lg p-3">
            <div class="text-2xl font-mono font-semibold" :class="qualityScoreClass">
              {{ progress.avgPhraseScore || '—' }}
            </div>
            <div class="text-xs text-slate-500">Quality</div>
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

      <!-- Seed Grid -->
      <section v-if="seedGrid.length > 0" class="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
        <button
          @click="seedGridExpanded = !seedGridExpanded"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-slate-300 uppercase tracking-wide">Seed Grid</span>
            <span class="text-xs text-slate-500">
              {{ seedGridFinalized }}/{{ seedGrid.length }} finalized
            </span>
            <span v-if="seedGridDrafted > 0" class="text-xs text-amber-400">
              {{ seedGridDrafted }} drafted
            </span>
            <span v-if="seedGridCollision > 0" class="text-xs text-red-400">
              {{ seedGridCollision }} collision
            </span>
          </div>
          <svg
            class="w-5 h-5 text-slate-400 transition-transform duration-200"
            :class="{ 'rotate-180': seedGridExpanded }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-show="seedGridExpanded" class="border-t border-slate-700/50 px-6 py-5">
          <!-- Rebuild Controls -->
          <div class="flex items-center gap-4 mb-4">
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate-400">From</label>
              <input
                v-model.number="rebuildFrom"
                type="number" min="1" :max="rebuildTo"
                class="w-20 bg-slate-700/50 border border-slate-600/50 rounded px-2 py-1 text-sm text-slate-200 font-mono"
              />
              <label class="text-xs text-slate-400">To</label>
              <input
                v-model.number="rebuildTo"
                type="number" :min="rebuildFrom" max="999"
                class="w-20 bg-slate-700/50 border border-slate-600/50 rounded px-2 py-1 text-sm text-slate-200 font-mono"
              />
            </div>
            <button
              v-if="!rebuildConfirming"
              @click="rebuildConfirming = true"
              :disabled="rebuildRunning"
              class="px-4 py-1.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Rebuild
            </button>
            <template v-if="rebuildConfirming">
              <span class="text-xs text-red-400">Delete LEGOs + phrases for seeds {{ rebuildFrom }}-{{ rebuildTo }}?</span>
              <button
                @click="executeRebuild"
                :disabled="rebuildRunning"
                class="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {{ rebuildRunning ? 'Wiping...' : 'Confirm' }}
              </button>
              <button
                @click="rebuildConfirming = false"
                class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </template>
          </div>

          <!-- Grid -->
          <div class="flex flex-wrap gap-1">
            <div
              v-for="cell in seedGrid"
              :key="cell.seed"
              class="w-5 h-5 rounded-sm cursor-default transition-colors"
              :class="seedCellClass(cell)"
              :title="`S${cell.seed}: ${cell.status} (${cell.legos}L, ${cell.phrases}P)`"
            ></div>
          </div>

          <!-- Legend -->
          <div class="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-slate-700/80"></span> Empty</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-amber-500/80"></span> Drafted</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-red-500/80"></span> Collision</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-emerald-500/80"></span> Finalized</span>
          </div>
        </div>
      </section>

      <!-- QA Review -->
      <section v-if="progress.currentSeed > 0" class="bg-slate-800/30 border rounded-lg p-6"
        :class="qaRunning ? 'border-violet-500/30' : 'border-slate-700/50'"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <span
              class="w-2 h-2 rounded-full"
              :class="qaRunning ? 'bg-violet-500 animate-pulse' : qa.progress >= 100 ? 'bg-emerald-500' : 'bg-slate-500'"
            ></span>
            <div>
              <div class="text-xs text-slate-500 uppercase tracking-wide">QA Review</div>
              <div class="text-sm font-medium text-slate-200">Speakability Check</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="qa.flags > 0" class="text-xs text-red-400">
              {{ qa.flags }} flagged
            </span>
            <button
              v-if="!qaRunning && qa.progress < 100"
              @click="startQA"
              class="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Start QA
            </button>
            <button
              @click="startStrictQA"
              class="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              1-50 Final Check
            </button>
            <span v-if="qaRunning" class="text-xs text-violet-400 animate-pulse">Running...</span>
            <span v-if="qa.progress >= 100" class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase">Complete</span>
          </div>
        </div>

        <!-- QA Progress Bar -->
        <div class="h-2 bg-slate-700/50 rounded-full overflow-hidden mb-3">
          <div
            class="h-full transition-all duration-500 rounded-full bg-violet-500"
            :style="{ width: `${qa.progress}%` }"
          ></div>
        </div>

        <!-- QA Stats -->
        <div class="grid grid-cols-4 gap-4 text-center">
          <div class="bg-slate-700/30 rounded-lg p-3">
            <div class="text-2xl font-mono font-semibold text-slate-200">{{ qa.checked.toLocaleString() }}</div>
            <div class="text-xs text-slate-500">/ {{ qa.total.toLocaleString() }} checked</div>
          </div>
          <div class="bg-slate-700/30 rounded-lg p-3">
            <div class="text-2xl font-mono font-semibold text-slate-200">{{ qa.progress }}%</div>
            <div class="text-xs text-slate-500">progress</div>
          </div>
          <div class="bg-slate-700/30 rounded-lg p-3">
            <div class="text-2xl font-mono font-semibold" :class="qa.errors > 0 ? 'text-red-400' : 'text-slate-200'">{{ qa.errors }}</div>
            <div class="text-xs text-slate-500">errors</div>
          </div>
          <div class="bg-slate-700/30 rounded-lg p-3">
            <div class="text-2xl font-mono font-semibold" :class="qa.warnings > 0 ? 'text-amber-400' : 'text-slate-200'">{{ qa.warnings }}</div>
            <div class="text-xs text-slate-500">warnings</div>
          </div>
        </div>

        <!-- Unchecked Phrases Panel -->
        <div v-if="qa.progress > 0 && qa.progress < 100 && uncheckedPhrases.length > 0" class="mt-4 bg-slate-700/20 border border-slate-600/50 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-300">
              {{ uncheckedPhrases.length }} unchecked phrases from {{ uncheckedGrouped.length }} seeds
            </span>
            <button
              @click="showUnchecked = !showUnchecked"
              class="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {{ showUnchecked ? '▲ Hide' : '▼ Show' }}
            </button>
          </div>

          <div v-if="showUnchecked" class="mt-3 space-y-3 max-h-80 overflow-y-auto">
            <div v-for="group in uncheckedGrouped" :key="group.seed">
              <div class="text-xs font-medium text-slate-400 mb-1">Seed {{ group.seed }} ({{ group.phrases.length }} phrases)</div>
              <div class="space-y-1">
                <div
                  v-for="phrase in group.phrases"
                  :key="phrase.id"
                  class="text-xs text-slate-300 bg-slate-700/30 rounded px-2 py-1 font-mono"
                >
                  "{{ phrase.known_text }}" → "{{ phrase.target_text }}"
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 mt-3">
            <button
              @click="markAllChecked"
              :disabled="markingChecked"
              class="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {{ markingChecked ? 'Marking...' : 'Mark All Checked' }}
            </button>
            <button
              @click="startQA"
              :disabled="qaRunning"
              class="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Run QA Agent
            </button>
            <span v-if="uncheckedStatus" class="text-xs" :class="uncheckedStatus.ok ? 'text-slate-400' : 'text-red-400'">
              {{ uncheckedStatus.message }}
            </span>
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
          v-if="progress.status === 'running' && agents.running_count === 0"
          @click="forceResetBuilder"
          class="px-6 py-2.5 bg-orange-600/80 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors"
          title="Force reset when Stop button fails (no agents running)"
        >
          Force Reset
        </button>
        <button
          v-if="progress.status === 'complete'"
          @click="resetBuilder"
          class="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors"
        >
          Reset
        </button>
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
const knownLanguage = ref('')  // User must select known language
const targetLanguage = ref('')
const languages = ref([])
const languagesLoading = ref(true)

// Computed course code from language selection
const computedCourseCode = computed(() => {
  if (!knownLanguage.value || !targetLanguage.value) return ''
  return `${targetLanguage.value}_for_${knownLanguage.value}`
})

// Effective course code (from prop or computed)
const effectiveCourseCode = computed(() => {
  return isCreateMode.value ? computedCourseCode.value : props.courseCode
})

// Configuration
const seedCount = ref(300)
const agentEngine = ref('cli')

const courseSizes = [
  { seeds: 300, label: 'MVP' },
  { seeds: 668, label: 'Full' }
]

const engines = [
  { id: 'cli', label: 'iTerm2', description: 'Pro Max #1' },
  { id: 'terminal', label: 'Terminal', description: 'Pro Max #2' }
]

// Model is always Opus 4.5 (Sonnet produces poor quality - formulaic, repetitive patterns)

// Progress state
const progress = ref({
  status: 'idle',
  currentSeed: 0,        // Pass 2: seeds with LEGOs (decomposed)
  seedsTranslated: 0,    // Pass 1: seeds with translations
  totalSeeds: 0,
  legosInserted: 0,
  phrasesInserted: 0
})

// Agent tracking state
const agents = ref({
  running: [],
  running_count: 0,
  total_tracked: 0
})

// QA state
const qaRunning = ref(false)
const qa = ref({
  total: 0,
  checked: 0,
  progress: 0,
  flags: 0,
  errors: 0,
  warnings: 0
})

// Unchecked phrases state
const uncheckedPhrases = ref([])
const showUnchecked = ref(false)
const markingChecked = ref(false)
const uncheckedStatus = ref(null)

const uncheckedGrouped = computed(() => {
  const groups = {}
  for (const p of uncheckedPhrases.value) {
    if (!groups[p.seed_number]) groups[p.seed_number] = { seed: p.seed_number, phrases: [] }
    groups[p.seed_number].phrases.push(p)
  }
  return Object.values(groups).sort((a, b) => a.seed - b.seed)
})

// UI state
const isPolling = ref(false)

// Seed grid state
const seedGrid = ref([])
const seedGridExpanded = ref(true)
const rebuildFrom = ref(11)
const rebuildTo = ref(300)
const rebuildConfirming = ref(false)
const rebuildRunning = ref(false)

const seedGridFinalized = computed(() => seedGrid.value.filter(s => s.status === 'complete').length)
const seedGridDrafted = computed(() => seedGrid.value.filter(s => s.status === 'drafted').length)
const seedGridCollision = computed(() => seedGrid.value.filter(s => s.status === 'collision' || s.status === 'rework').length)

function seedCellClass(cell) {
  if (cell.status === 'complete') return 'bg-emerald-500/80'
  if (cell.status === 'drafted') return 'bg-amber-500/80'
  if (cell.status === 'collision' || cell.status === 'rework') return 'bg-red-500/80'
  return 'bg-slate-700/80'
}

async function fetchSeedGrid() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const apiBase = localStorage.getItem('api_base_url') || (isLocal ? 'http://localhost:3470' : 'https://popty.ngrok.app')
    const response = await fetch(`${apiBase}/api/build/seed-grid/${courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      seedGrid.value = data.seeds || []
    }
  } catch (err) {
    console.error('Failed to fetch seed grid:', err)
  }
}

async function executeRebuild() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  rebuildRunning.value = true
  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const apiBase = localStorage.getItem('api_base_url') || (isLocal ? 'http://localhost:3470' : 'https://popty.ngrok.app')
    const response = await fetch(`${apiBase}/api/build/rebuild/${courseCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ from_seed: rebuildFrom.value, to_seed: rebuildTo.value })
    })

    const data = await response.json()
    if (data.ok) {
      rebuildConfirming.value = false
      await fetchSeedGrid()
    }
  } catch (err) {
    console.error('Rebuild error:', err.message)
  } finally {
    rebuildRunning.value = false
  }
}

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

const qualityScoreClass = computed(() => {
  const score = parseFloat(progress.value.avgPhraseScore)
  if (isNaN(score)) return 'text-slate-400'
  if (score >= 7.5) return 'text-emerald-400'
  if (score >= 6.5) return 'text-cyan-400'
  if (score >= 5.5) return 'text-yellow-400'
  return 'text-orange-400'
})

const statusClass = computed(() => {
  switch (progress.value.status) {
    case 'running': return 'bg-cyan-500/20 text-cyan-400'
    case 'complete': return 'bg-emerald-500/20 text-emerald-400'
    default: return 'bg-slate-700/50 text-slate-500'
  }
})

// Methods
async function fetchProgress() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return  // Skip if no course selected yet

  try {
    const apiBase = getApiUrl()

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
        currentSeed: data.seeds_with_legos || data.seeds || 0,  // Pass 2: decomposed
        seedsTranslated: data.completed_seeds || data.seeds_translated || 0,  // Pass 1: translated
        totalSeeds: totalSeeds,
        legosInserted: data.legos || 0,
        phrasesInserted: data.phrases || 0,
        avgPhraseScore: data.avg_phrase_score || null,
        scoredPhrases: data.scored_phrases || 0
      }

      // Check build status for running state
      if (buildResponse.ok) {
        const buildData = await buildResponse.json()
        if (buildData.active) {
          progress.value.status = 'running'
          progress.value.agentCount = buildData.build?.agent_count || 0
          progress.value.batchSeeds = buildData.build?.current_batch_seeds || 0
          // Sync seedCount from active job's target
          if (buildData.build?.total_seeds) {
            seedCount.value = buildData.build.total_seeds
          }
        } else {
          // No active job - don't override user's seedCount selection from stale job data
          if (data.seeds_with_legos >= totalSeeds && data.seeds_with_legos > 0) {
            progress.value.status = 'complete'
          } else if (progress.value.status === 'running') {
            // Build finished or was stopped
            progress.value.status = 'idle'
          }
        }
      }

      // Handle external reset
      if (data.seeds === 0 && progress.value.status === 'complete') {
        progress.value.status = 'idle'
      }
    }

    // Also fetch seed grid and QA summary
    fetchSeedGrid()
    fetchQASummary()
  } catch (error) {
    console.error('Failed to fetch progress:', error)
  }
}

async function startBuilder() {
  const courseCode = effectiveCourseCode.value

  // Validate in create mode
  if (isCreateMode.value && !courseCode) {
    console.error('Please select both languages')
    return
  }

  try {
    // Use localStorage api_base_url (set by EnvironmentSwitcher) to route to correct machine
    // Default to popty.ngrok.app for remote access (NOT env var - Vercel may have old value)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const apiBase = localStorage.getItem('api_base_url') || (isLocal ? 'http://localhost:3470' : 'https://popty.ngrok.app')

    // If in create mode, create the course first
    if (isCreateMode.value) {
      const createResponse = await fetch(`${apiBase}/api/courses/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          courseCode,
          knownLanguage: knownLanguage.value,
          targetLanguage: targetLanguage.value,
          seedStart: 1,
          seedEnd: seedCount.value
        })
      })

      if (!createResponse.ok) {
        const err = await createResponse.json()
        // 409 = course already exists, that's fine - just proceed to start builder
        if (createResponse.status === 409) {
        } else {
          throw new Error(err.error || 'Failed to create course')
        }
      } else {
      }
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
    // Navigate to the course page if we created a new one
    if (isCreateMode.value) {
      router.push(`/production/${courseCode}/text`)
    }

  } catch (error) {
    console.error('Failed to start course builder:', error)
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

  } catch (error) {
    console.error('Failed to stop builder:', error)
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
}

async function forceResetBuilder() {
  // Force reset when build is stuck (running but no agents)
  // Attempts to call stop API but resets UI regardless

  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    await fetch(`${apiBase}/api/build/stop/${effectiveCourseCode.value}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
  } catch (error) {
    // Ignore errors - we're force resetting anyway
    console.warn('Stop API call failed during force reset:', error)
  }

  // Always reset UI state
  stopPolling()
  progress.value = {
    status: 'idle',
    currentSeed: progress.value.currentSeed,  // Keep current progress
    totalSeeds: progress.value.totalSeeds,
    legosInserted: progress.value.legosInserted,
    phrasesInserted: progress.value.phrasesInserted,
    avgPhraseScore: progress.value.avgPhraseScore,
    scoredPhrases: progress.value.scoredPhrases
  }

  // Restart polling to sync state
  startPolling()
}

async function startQA() {
  const courseCode = effectiveCourseCode.value
  console.log('[QA] startQA called, courseCode:', courseCode)
  if (!courseCode) {
    console.warn('[QA] No course code — aborting')
    return
  }

  qaRunning.value = true
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    console.log('[QA] Calling:', `${apiBase}/api/qa/start/${courseCode}`)
    const response = await fetch(`${apiBase}/api/qa/start/${courseCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })
    const result = await response.json()
    console.log('[QA] Response:', result)
    if (!result.ok) {
      console.error('[QA] Start failed:', result.error)
      qaRunning.value = false
    }
  } catch (error) {
    console.error('[QA] Failed to start QA:', error)
    qaRunning.value = false
  }
}

async function startStrictQA() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  qaRunning.value = true
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/qa/strict/${courseCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })
    const result = await response.json()
    if (!result.ok) {
      console.error('[StrictQA] Start failed:', result.error)
      qaRunning.value = false
    }
  } catch (error) {
    console.error('[StrictQA] Failed to start strict QA:', error)
    qaRunning.value = false
  }
}

async function fetchQASummary() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/qa/summary/${courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      qa.value = {
        total: data.phrases?.total || 0,
        checked: data.phrases?.checked || 0,
        progress: data.phrases?.progress_percent || 0,
        flags: data.flags?.total || 0,
        errors: data.flags?.errors || 0,
        warnings: data.flags?.warnings || 0
      }
      // Auto-detect QA running state
      if (qa.value.progress > 0 && qa.value.progress < 100) {
        qaRunning.value = true
      } else if (qa.value.progress >= 100) {
        qaRunning.value = false
      }
      // Fetch unchecked phrases if not at 100%
      if (qa.value.progress > 0 && qa.value.progress < 100) {
        fetchUncheckedPhrases()
      } else {
        uncheckedPhrases.value = []
      }
    }
  } catch (err) {
    // QA summary endpoint may not exist yet for this course
  }
}

async function fetchUncheckedPhrases() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/qa/unchecked/${courseCode}?limit=500`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      uncheckedPhrases.value = data.phrases || data || []
    }
  } catch (err) {
    console.error('Failed to fetch unchecked phrases:', err)
  }
}

async function markAllChecked() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode || uncheckedPhrases.value.length === 0) return

  markingChecked.value = true
  uncheckedStatus.value = null
  try {
    const count = uncheckedPhrases.value.length
    const seeds = uncheckedPhrases.value.map(p => p.seed_number)
    const seedMin = Math.min(...seeds)
    const seedMax = Math.max(...seeds)

    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/qa/bulk-mark-checked`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ course_code: courseCode, seed_min: seedMin, seed_max: seedMax })
    })
    if (response.ok) {
      uncheckedStatus.value = { ok: true, message: `Marked ${count} phrases as checked` }
      uncheckedPhrases.value = []
      showUnchecked.value = false
      fetchQASummary()
    } else {
      const err = await response.json().catch(() => ({}))
      uncheckedStatus.value = { ok: false, message: err.error || `Failed (${response.status})` }
    }
  } catch (err) {
    uncheckedStatus.value = { ok: false, message: err.message }
  } finally {
    markingChecked.value = false
  }
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
      // Refresh agent list
      fetchProgress()
    } else {
    }
  } catch (error) {
    console.error('Failed to kill agent:', error)
    console.error('Failed to kill agent:', error)
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
    const response = await fetch(`${apiBase}/api/languages?tts=true&format=legacy`, {
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
  if (isCreateMode.value) {
    loadLanguages()
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
