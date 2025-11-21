<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-start justify-between mb-4">
          <router-link to="/" class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition">
            <span>←</span>
            <span>Back to Dashboard</span>
          </router-link>
          <button
            v-if="errorMessage && courseCode"
            @click="clearStuckJob"
            class="bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            🔧 Clear Stuck Job
          </button>
        </div>
        <h1 class="text-3xl font-bold text-emerald-400">
          Generate New Course
        </h1>
        <p class="mt-2 text-slate-400">
          Popty v8.2.2 - SSi Course Production Dashboard
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Generation Form -->
      <div v-if="!isGenerating && !isCompleted" class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">
        <h2 class="text-2xl font-semibold text-slate-100 mb-6">Select Language Pair</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <!-- Known Language -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Known Language (Learning FROM)
            </label>
            <select
              v-model="knownLanguage"
              :disabled="languagesLoading"
              class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            >
              <option value="" disabled>{{ languagesLoading ? 'Loading...' : 'Select known language' }}</option>
              <option
                v-for="lang in knownLanguages"
                :key="lang.code"
                :value="lang.code"
              >
                {{ lang.name }} ({{ lang.code }}) - {{ lang.native }}
              </option>
            </select>
          </div>

          <!-- Target Language -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Target Language (Learning TO)
            </label>
            <select
              v-model="targetLanguage"
              :disabled="languagesLoading"
              class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            >
              <option value="" disabled>{{ languagesLoading ? 'Loading...' : 'Select target language' }}</option>
              <option
                v-for="lang in targetLanguages"
                :key="lang.code"
                :value="lang.code"
              >
                {{ lang.name }} ({{ lang.code }}) - {{ lang.native }}
              </option>
            </select>
          </div>
        </div>

        <!-- Analyze Course Button -->
        <div v-if="!analysis && knownLanguage && targetLanguage" class="mb-8">
          <button
            @click="analyzeCourse"
            :disabled="analyzing"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition hover:-translate-y-0.5"
          >
            <span v-if="analyzing">Analyzing Course...</span>
            <span v-else>Analyze Course & Get Smart Recommendations</span>
          </button>
        </div>

        <!-- Analysis Loading -->
        <div v-if="analyzing" class="mb-8 text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          <p class="text-slate-400 mt-3">Analyzing course progress...</p>
        </div>

        <!-- Smart Recommendations -->
        <div v-if="analysis && !isGenerating" class="mb-8">
          <div class="bg-slate-700/50 rounded-lg border border-slate-400/20 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-slate-100">🎯 Smart Options</h3>
              <button
                @click="analysis = null"
                class="text-slate-400 hover:text-slate-300 text-sm"
              >
                ✕ Clear
              </button>
            </div>

            <!-- Course Status -->
            <div class="mb-6 p-4 bg-slate-800/50 rounded-lg">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-slate-400">Phase 1 (Seeds):</span>
                  <span class="ml-2 font-semibold" :class="analysis.seed_pairs.exists ? 'text-green-400' : 'text-red-400'">
                    {{ analysis.seed_pairs.exists ? `✓ ${analysis.seed_pairs.count} seeds` : '✗ Missing' }}
                  </span>
                </div>
                <div>
                  <span class="text-slate-400">Phase 3 (LEGOs):</span>
                  <span class="ml-2 font-semibold" :class="analysis.lego_pairs.exists ? 'text-green-400' : 'text-red-400'">
                    {{ analysis.lego_pairs.exists ? `✓ ${analysis.lego_pairs.count} LEGOs` : '✗ Missing' }}
                  </span>
                </div>
                <div v-if="analysis.baskets">
                  <span class="text-slate-400">Phase 5 (Baskets):</span>
                  <span class="ml-2 font-semibold" :class="analysis.baskets.missing_seeds === 0 ? 'text-green-400' : 'text-amber-400'">
                    {{ analysis.baskets.missing_seeds === 0 ? '✓ Complete' : `⚠️  ${analysis.baskets.missing_seeds} seeds missing` }}
                  </span>
                </div>
              </div>
              <div v-if="analysis.lego_pairs.missing && analysis.lego_pairs.missing.length > 0" class="mt-3 text-sm text-amber-400">
                ⚠️  {{ analysis.lego_pairs.missing.length }} seeds missing LEGOs
              </div>
            </div>

            <!-- Recommendations -->
            <div class="space-y-3">
              <button
                v-for="rec in analysis.recommendations"
                :key="rec.title"
                @click="selectRecommendation(rec)"
                class="w-full text-left p-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600 hover:border-emerald-500 rounded-lg transition group"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span v-if="rec.type === 'test'" class="text-xl">✨</span>
                      <span v-else-if="rec.type === 'resume-baskets'" class="text-xl">📦</span>
                      <span v-else-if="rec.type === 'resume'" class="text-xl">📝</span>
                      <span v-else-if="rec.type === 'full'" class="text-xl">🚀</span>
                      <span v-else class="text-xl">➡️</span>
                      <span class="font-semibold text-slate-100 group-hover:text-emerald-400 transition">
                        {{ rec.title }}
                      </span>
                    </div>
                    <p class="text-sm text-slate-400 ml-7">{{ rec.description }}</p>
                    <p v-if="rec.action.phases" class="text-xs text-emerald-500 ml-7 mt-1">
                      Phase {{ rec.phase }} only (intelligent resume - missing baskets)
                    </p>
                    <p v-else class="text-xs text-slate-500 ml-7 mt-1">
                      Seeds {{ rec.action.startSeed }}-{{ rec.action.endSeed }}
                      ({{ rec.action.endSeed - rec.action.startSeed + 1 }} seeds)
                    </p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Execution Mode Selection -->
        <ExecutionModeSelector v-model="executionMode" />

        <!-- Custom Range / Manual Input -->
        <div v-if="!analysis" class="mb-8">

          <!-- Custom Range -->
          <div class="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-600">
            <div class="flex items-start gap-3 mb-3">
              <div class="text-blue-400 text-xl">⚙️</div>
              <div class="flex-1">
                <h3 class="text-lg font-medium text-slate-300 mb-1">Seed Range</h3>
                <p class="text-sm text-slate-400 mb-3">Specify start and end seeds (or use Smart Recommendations above)</p>

                <div class="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label class="block text-xs font-medium text-slate-400 mb-1">Start Seed</label>
                    <input
                      v-model.number="startSeed"
                      type="number"
                      min="1"
                      max="668"
                      class="w-full bg-slate-700 border border-slate-500 rounded px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-slate-400 mb-1">End Seed</label>
                    <input
                      v-model.number="endSeed"
                      type="number"
                      min="1"
                      max="668"
                      class="w-full bg-slate-700 border border-slate-500 rounded px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <!-- Phase Selection Dropdown -->
                <div class="mb-3">
                  <label class="block text-xs font-medium text-slate-400 mb-1">Phases to Run</label>
                  <select
                    v-model="phaseSelection"
                    class="w-full bg-slate-700 border border-slate-500 rounded px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="all">All Phases (1 → 3 → 5 → 7 → 8)</option>
                    <option value="phase1">Phase 1 Only (Translation)</option>
                    <option value="phase3">Phase 3 Only (LEGO Extraction)</option>
                    <option value="phase5">Phase 5 Only (Practice Baskets)</option>
                    <option value="phase7">Phase 7 Only (Course Compilation)</option>
                  </select>
                  <p class="text-xs text-slate-500 mt-1">
                    <span v-if="phaseSelection === 'phase3'">⚠️ Requires seed_pairs.json from Phase 1</span>
                    <span v-else-if="phaseSelection === 'phase5'">⚠️ Requires lego_pairs.json from Phase 3</span>
                    <span v-else-if="phaseSelection === 'phase7'">⚠️ Requires all previous phases complete</span>
                  </p>
                </div>

                <div v-if="startSeed && endSeed" class="text-xs text-emerald-400">
                  ✓ Selected range: {{ seedCount }} seeds (S{{ String(startSeed).padStart(4, '0') }}-S{{ String(endSeed).padStart(4, '0') }})
                </div>
              </div>
            </div>
          </div>

          <!-- Generate Button -->
          <div class="flex gap-4">
            <button
              @click="startGeneration"
              :disabled="!startSeed || !endSeed || startSeed > endSeed"
              class="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition hover:-translate-y-0.5"
            >
              <span v-if="startSeed && endSeed">Generate Course ({{ seedCount }} seeds: {{ startSeed }}-{{ endSeed }})</span>
              <span v-else>Enter Seed Range</span>
            </button>

            <button
              @click="clearJob"
              :disabled="clearingJob"
              class="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-4 rounded-lg shadow-lg transition hover:-translate-y-0.5"
              title="Clear any stuck Phase 5 jobs"
            >
              {{ clearingJob ? 'Clearing...' : 'Clear Job' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Progress Monitor -->
      <div v-if="isGenerating || isCompleted" class="space-y-6">
        <!-- Real-time Progress Monitor -->
        <ProgressMonitor
          v-if="courseCode"
          :courseCode="courseCode"
          :executionMode="executionMode"
          :seedCount="seedCount"
        />

        <!-- Traditional Progress Display -->
        <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-semibold text-slate-100">
              {{ courseCode || 'Generating...' }}
            </h2>
          <span v-if="isCompleted" class="flex items-center text-green-400 font-semibold">
            <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            Completed!
          </span>
          <span v-else class="flex items-center text-yellow-400 font-semibold">
            <svg class="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </span>
        </div>

        <!-- Current Phase -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-slate-300">{{ currentPhase }}</span>
            <span class="text-sm font-medium text-slate-300">{{ progress }}%</span>
          </div>
          <div class="w-full bg-slate-700 rounded-full h-3">
            <div
              class="bg-emerald-500 h-3 rounded-full transition-all duration-300"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
        </div>

        <!-- Enhanced Progress Details (NEW!) -->
        <div v-if="phaseDetails" class="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <div class="space-y-3">
            <!-- Status & Sub-status -->
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-medium text-emerald-400">{{ phaseDetails.status }}</div>
                <div v-if="phaseDetails.subStatus" class="text-xs text-slate-400">{{ phaseDetails.subStatus }}</div>
              </div>

              <!-- Estimated Completion -->
              <div v-if="estimatedCompletion" class="text-right">
                <div class="text-xs text-slate-400">ETA</div>
                <div class="text-sm font-medium text-emerald-400">{{ formatETA(estimatedCompletion) }}</div>
              </div>
            </div>

            <!-- Branch Progress (for Phase 3 & 5) -->
            <div v-if="phaseDetails.milestones && phaseDetails.milestones.branchesExpected" class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-300">Branches Detected</span>
                <span class="font-medium text-white">
                  {{ phaseDetails.milestones.branchesDetected }} / {{ phaseDetails.milestones.branchesExpected }}
                </span>
              </div>

              <!-- Progress bar for branches -->
              <div class="w-full bg-slate-800 rounded-full h-2">
                <div
                  class="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  :style="{ width: `${(phaseDetails.milestones.branchesDetected / phaseDetails.milestones.branchesExpected) * 100}%` }"
                ></div>
              </div>

              <!-- Velocity Info -->
              <div v-if="phaseDetails.timing && phaseDetails.timing.velocity" class="flex items-center justify-between text-xs text-slate-400">
                <span>Avg: {{ Math.floor(phaseDetails.timing.velocity.avgSecondsPerBranch / 60) }}m per branch</span>
                <span>Remaining: {{ formatSeconds(phaseDetails.timing.velocity.estimatedSecondsRemaining) }}</span>
              </div>
            </div>

            <!-- Coverage Info (Phase 3 & 5) -->
            <div v-if="phaseDetails.coverage" class="text-xs text-slate-400">
              <span v-if="phaseDetails.coverage.strategy">Strategy: {{ phaseDetails.coverage.strategy }}</span>
              <span v-if="phaseDetails.coverage.totalAgents"> • {{ phaseDetails.coverage.totalAgents }} agents</span>
              <span v-if="phaseDetails.coverage.coveragePercent"> • {{ phaseDetails.coverage.coveragePercent }}% coverage</span>
            </div>
          </div>
        </div>

        <!-- Branch Timeline (NEW!) -->
        <div v-if="phaseDetails && phaseDetails.branches && phaseDetails.branches.length > 0" class="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
          <div class="text-sm font-medium text-slate-300 mb-3">Branch Timeline</div>
          <div class="space-y-2 max-h-60 overflow-y-auto">
            <div
              v-for="(branch, idx) in phaseDetails.branches"
              :key="branch.branchName"
              class="flex items-center gap-3 text-sm"
            >
              <div class="flex-shrink-0">
                <span v-if="branch.merged" class="text-green-400">✅</span>
                <span v-else class="text-yellow-400">⏳</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-slate-300 truncate">
                  {{ branch.seedRange || `Branch ${idx + 1}` }}
                </div>
                <div class="text-xs text-slate-500">
                  {{ formatTimestamp(branch.detectedAt) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Phase List -->
        <div class="space-y-3">
          <div v-for="phase in phaseNames" :key="phase.id" class="flex items-center gap-3">
            <div v-if="phase.id < currentPhaseIndex" class="w-5 h-5 text-green-400">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div v-else-if="phase.id === currentPhaseIndex" class="w-5 h-5 text-yellow-400">
              <svg class="animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div v-else class="w-5 h-5 text-slate-500">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"/>
              </svg>
            </div>
            <span :class="phase.id <= currentPhaseIndex ? 'text-white' : 'text-slate-500'">
              {{ phase.name }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="isCompleted" class="mt-8 space-y-4">
          <!-- Extend Button (if applicable) -->
          <div v-if="canExtendCourse" class="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div class="flex items-start gap-3">
              <div class="text-blue-400 text-xl">🚀</div>
              <div class="flex-1">
                <p class="font-medium text-blue-400 mb-1">Ready to Extend?</p>
                <p class="text-sm text-slate-300 mb-3">
                  Your {{ endSeed }} seed course is complete! Extend it to the full 668 seeds without regenerating existing work.
                </p>
                <button
                  @click="extendToFullCourse"
                  class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition hover:-translate-y-0.5"
                >
                  🎯 Extend to Full Course (668 Seeds)
                </button>
              </div>
            </div>
          </div>

          <!-- Standard Actions -->
          <div class="flex gap-4">
            <button
              @click="startNew"
              class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg transition hover:-translate-y-0.5"
            >
              Generate Another Course
            </button>
            <button
              @click="viewCourse"
              class="bg-slate-600 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg transition hover:-translate-y-0.5"
            >
              View Course Files
            </button>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
          <div class="flex items-start justify-between gap-4">
            <p class="text-red-400 flex-1">{{ errorMessage }}</p>
            <button
              v-if="courseCode"
              @click="clearStuckJob"
              class="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap"
            >
              Clear Stuck Job
            </button>
          </div>
        </div>
        </div>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api, { apiClient } from '../services/api'
import ExecutionModeSelector from '../components/ExecutionModeSelector.vue'
import ProgressMonitor from '../components/ProgressMonitor.vue'

const router = useRouter()

// State
const knownLanguage = ref('eng')
const targetLanguage = ref('gle')
const startSeed = ref(1)
const endSeed = ref(668)
const executionMode = ref('web') // 'local', 'api', or 'web'
const phaseSelection = ref('all') // 'all', 'phase1', 'phase3', 'phase5', 'phase7'

const targetLanguages = ref([])
const knownLanguages = ref([])
const languagesLoading = ref(false)

const isGenerating = ref(false)
const isCompleted = ref(false)
const courseCode = ref(null)
const currentPhase = ref('initializing')
const progress = ref(0)
const errorMessage = ref('')
const clearingJob = ref(false)

// Enhanced tracking from phase servers
const phaseDetails = ref(null)
const estimatedCompletion = ref(null)

// Smart Resume
const analyzing = ref(false)
const analysis = ref(null)
const showManualInput = ref(false)

let pollInterval = null

// Phase names for UI (matches Phase Intelligence architecture)
const phaseNames = [
  { id: 0, name: 'Phase 1: Pedagogical Translation' },
  { id: 1, name: 'Phase 3: LEGO Extraction + Introductions' },
  { id: 2, name: 'Phase 5: Practice Baskets + Grammar' },
  { id: 3, name: 'Phase 7: Course Manifest' },
  { id: 4, name: 'Phase 8: Audio/TTS' }
]

// Computed
const seedCount = computed(() => {
  return endSeed.value - startSeed.value + 1
})

const currentPhaseIndex = computed(() => {
  const phase = currentPhase.value
  if (phase === 'initializing') return -1
  if (phase.includes('phase_1')) return 0
  if (phase.includes('phase_3')) return 1
  if (phase.includes('phase_5')) return 2
  if (phase.includes('phase_7') || phase === 'compilation') return 3
  if (phase.includes('phase_8') || phase === 'audio') return 4
  if (phase === 'completed') return 5
  return -1
})

const canExtendCourse = computed(() => {
  // Show extend button if:
  // 1. Course is completed
  // 2. End seed is less than 668 (full course)
  // 3. Start seed was 1 (started from beginning)
  return isCompleted.value && endSeed.value < 668 && startSeed.value === 1
})

// Methods
// Fetch languages from API
const loadLanguages = async () => {
  languagesLoading.value = true
  try {
    const response = await apiClient.get('/api/languages')
    targetLanguages.value = response.data
    knownLanguages.value = response.data
  } catch (error) {
    console.error('Failed to load languages:', error)
    // Fallback to basic list
    const fallback = [
      { code: 'eng', name: 'English', native: 'English' },
      { code: 'ita', name: 'Italian', native: 'Italiano' },
      { code: 'spa', name: 'Spanish', native: 'Español' },
      { code: 'fra', name: 'French', native: 'Français' },
      { code: 'cym', name: 'Welsh', native: 'Cymraeg' },
      { code: 'gle', name: 'Irish', native: 'Gaeilge' }
    ]
    targetLanguages.value = fallback
    knownLanguages.value = fallback
  } finally {
    languagesLoading.value = false
  }
}

const analyzeCourse = async () => {
  try {
    analyzing.value = true
    errorMessage.value = ''

    const code = `${targetLanguage.value}_for_${knownLanguage.value}`
    const response = await apiClient.get(`/api/courses/${code}/analyze`)

    analysis.value = response.data
  } catch (error) {
    console.error('Failed to analyze course:', error)

    // If course doesn't exist, that's okay - show recommendations anyway
    if (error.response?.status === 404) {
      analysis.value = {
        courseCode: `${targetLanguage.value}_for_${knownLanguage.value}`,
        exists: false,
        seed_pairs: { exists: false },
        lego_pairs: { exists: false },
        recommendations: [
          {
            type: 'test',
            phase: 3,
            title: 'Test Run: First 50 Seeds',
            description: 'Test the pipeline on 50 seeds before full run',
            action: { startSeed: 1, endSeed: 50 }
          },
          {
            type: 'full',
            phase: 3,
            title: 'Full Run: All 668 Seeds',
            description: 'Generate complete course',
            action: { startSeed: 1, endSeed: 668 }
          }
        ]
      }
    } else {
      errorMessage.value = 'Failed to analyze course'
    }
  } finally {
    analyzing.value = false
  }
}

const selectRecommendation = (rec) => {
  startSeed.value = rec.action.startSeed
  if (rec.action.count) {
    // Quick test with random seeds
    endSeed.value = rec.action.startSeed + rec.action.count - 1
  } else {
    endSeed.value = rec.action.endSeed
  }

  // Handle phase-specific recommendations (e.g., Phase 5 only)
  if (rec.action.phases && rec.action.phases.includes('phase5')) {
    phaseSelection.value = 'phase5'
  } else {
    phaseSelection.value = 'all'
  }

  // Pass force flag from recommendation
  const force = rec.action.force || false
  startGeneration(force)
}

const extendToFullCourse = async () => {
  // Confirm with user
  const confirmed = confirm(
    `🚀 Extend to Full Course?\n\n` +
    `This will extend your existing ${endSeed.value}-seed course to 668 seeds.\n\n` +
    `✅ Keeps existing work (seeds 1-${endSeed.value})\n` +
    `✅ Only generates new content (seeds ${endSeed.value + 1}-668)\n` +
    `⏱️  Estimated time: ~2-3 hours\n\n` +
    `Continue?`
  )

  if (!confirmed) {
    return
  }

  // Update seed range to full course
  startSeed.value = 1
  endSeed.value = 668

  // Reset state and restart generation
  isCompleted.value = false
  isGenerating.value = true
  currentPhase.value = 'initializing'
  progress.value = 0
  errorMessage.value = ''

  // Start generation (backend will detect existing work and extend)
  await startGeneration()
}

const clearJob = async () => {
  if (!targetLanguage.value || !knownLanguage.value) {
    errorMessage.value = 'Please select languages first'
    return
  }

  clearingJob.value = true
  errorMessage.value = ''

  try {
    const courseCode = `${targetLanguage.value}_for_${knownLanguage.value}`

    // Call Phase 5 abort endpoint
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'}/phase5/abort/${courseCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })

    const data = await response.json()

    if (data.success) {
      console.log('✅ Job cleared:', data.message)
      // Reset UI state
      isGenerating.value = false
      isCompleted.value = false
      currentPhase.value = 'initializing'
      progress.value = 0
    } else {
      errorMessage.value = data.message || 'Failed to clear job'
    }
  } catch (error) {
    console.error('Failed to clear job:', error)
    errorMessage.value = `Failed to clear job: ${error.message}`
  } finally {
    clearingJob.value = false
  }
}

const startGeneration = async (force = false) => {
  try {
    errorMessage.value = ''
    isGenerating.value = true

    const response = await api.course.generate({
      target: targetLanguage.value,
      known: knownLanguage.value,
      startSeed: startSeed.value,
      endSeed: endSeed.value,
      executionMode: executionMode.value,
      phaseSelection: phaseSelection.value,
      force: force
    })

    console.log('Course generation started:', response)
    courseCode.value = response.courseCode

    // Redirect to dedicated progress page (only for orchestrated pipelines)
    // Phase 5 standalone runs in browser windows (web mode) - no redirect needed
    if (phaseSelection.value === 'all' || phaseSelection.value === 'phase1') {
      router.push(`/courses/${response.courseCode}/progress`)
    } else {
      // For single-phase jobs (3, 5, 7), show inline message
      currentPhase.value = `Running ${phaseSelection.value}...`
      // Don't redirect - user watches browser windows for Phase 5
    }
  } catch (error) {
    console.error('Failed to start course generation:', error)

    // Handle "course already exists with data" warning (409 with existingFiles)
    if (error.response?.status === 409 && error.response?.data?.existingFiles) {
      const data = error.response.data
      const filesList = data.existingFiles.join(', ')

      const confirmed = confirm(
        `⚠️  Course "${data.courseCode}" already exists!\n\n` +
        `Existing files: ${filesList}\n\n` +
        `This will OVERWRITE all existing data.\n\n` +
        `Are you sure you want to proceed?`
      )

      if (confirmed) {
        // Retry with force=true
        startGeneration(true)
        return
      } else {
        errorMessage.value = 'Generation cancelled - course already exists'
        isGenerating.value = false
        return
      }
    }

    // Handle "job already in progress" error (409 with status)
    if (error.response?.status === 409 && error.response?.data?.courseCode) {
      courseCode.value = error.response.data.courseCode
      errorMessage.value = `Course generation already in progress for ${error.response.data.courseCode}. Click "Clear Stuck Job" to reset.`
      isGenerating.value = false
      return
    }

    errorMessage.value = error.response?.data?.error || 'Failed to start course generation. Check console for details.'
    isGenerating.value = false
  }
}

const startPolling = (code) => {
  // Poll every 5 seconds for real-time updates
  pollInterval = setInterval(async () => {
    try {
      const status = await api.course.getStatus(code)
      currentPhase.value = status.currentPhase ? `Phase ${status.currentPhase}` : 'initializing'
      progress.value = status.progress || 0

      // Capture enhanced tracking
      if (status.phaseDetails) {
        phaseDetails.value = status.phaseDetails
      }

      // Capture estimated completion
      if (status.estimatedCompletion) {
        estimatedCompletion.value = status.estimatedCompletion
      }

      // Check if completed or error
      if (status.status === 'completed') {
        isCompleted.value = true
        isGenerating.value = false
        stopPolling()
      } else if (status.status === 'failed') {
        isGenerating.value = false
        stopPolling()
        errorMessage.value = status.error || 'Course generation failed'
      }
    } catch (error) {
      console.error('Failed to fetch course status:', error)
    }
  }, 5000) // Poll every 5 seconds
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// Helper functions for formatting enhanced tracking data
const formatETA = (isoTimestamp) => {
  const eta = new Date(isoTimestamp)
  const now = new Date()
  const diffMs = eta - now
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Less than 1m'
  if (diffMins < 60) return `${diffMins}m`

  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hours}h ${mins}m`
}

const formatSeconds = (seconds) => {
  if (seconds < 60) return `${seconds}s`

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (mins < 60) return `${mins}m ${secs}s`

  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}

const formatTimestamp = (isoTimestamp) => {
  const time = new Date(isoTimestamp)
  const now = new Date()
  const diffMs = now - time
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins === 1) return '1 minute ago'
  if (diffMins < 60) return `${diffMins} minutes ago`

  const hours = Math.floor(diffMins / 60)
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`

  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

const startNew = () => {
  isGenerating.value = false
  isCompleted.value = false
  courseCode.value = null
  currentPhase.value = 'initializing'
  progress.value = 0
  errorMessage.value = ''
  analysis.value = null
  showManualInput.value = false
}

const viewCourse = () => {
  alert(`Course files saved to: vfs/courses/${courseCode.value}`)
}

const clearStuckJob = async () => {
  if (!courseCode.value) {
    // If no courseCode, try to derive it from languages
    if (targetLanguage.value && knownLanguage.value) {
      courseCode.value = `${targetLanguage.value}_for_${knownLanguage.value}`
    } else {
      errorMessage.value = 'Cannot determine course code to clear'
      return
    }
  }

  try {
    console.log(`Clearing stuck job for: ${courseCode.value}`)
    await api.course.clearJob(courseCode.value)

    // Reset state
    errorMessage.value = ''
    isGenerating.value = false
    isCompleted.value = false
    stopPolling()

    console.log('Job cleared successfully - you can now retry generation')
  } catch (error) {
    console.error('Failed to clear job:', error)
    errorMessage.value = 'Failed to clear job: ' + (error.response?.data?.error || error.message)
  }
}

// Lifecycle hooks
onMounted(async () => {
  await loadLanguages()
})

// Cleanup
onUnmounted(() => {
  stopPolling()
})
</script>
