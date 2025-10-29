<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-link to="/" class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition mb-4">
          <span>←</span>
          <span>Back to Dashboard</span>
        </router-link>
        <h1 class="text-3xl font-bold text-emerald-400">
          Generate New Course
        </h1>
        <p class="mt-2 text-slate-400">
          SSi Course Production Dashboard v7.6 - Complete 8-phase generation pipeline
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

        <!-- Smart Resume Options -->
        <div v-if="!analyzing && !analysis" class="mb-8">
          <button
            @click="analyzeCourse"
            :disabled="!targetLanguage || !knownLanguage"
            class="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition hover:-translate-y-0.5"
          >
            🔍 Analyze Course Progress
          </button>
          <p class="mt-2 text-sm text-slate-400">
            See what's already done and get smart suggestions
          </p>
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
              </div>
              <div v-if="analysis.lego_pairs.missing.length > 0" class="mt-3 text-sm text-amber-400">
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
                      <span v-else-if="rec.type === 'resume'" class="text-xl">📝</span>
                      <span v-else-if="rec.type === 'full'" class="text-xl">🚀</span>
                      <span v-else class="text-xl">➡️</span>
                      <span class="font-semibold text-slate-100 group-hover:text-emerald-400 transition">
                        {{ rec.title }}
                      </span>
                    </div>
                    <p class="text-sm text-slate-400 ml-7">{{ rec.description }}</p>
                    <p class="text-xs text-slate-500 ml-7 mt-1">
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

        <!-- Manual Seed Range (fallback) -->
        <div v-if="!analysis || showManualInput" class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-slate-300">Manual Seed Range</h3>
            <button
              v-if="analysis && !showManualInput"
              @click="showManualInput = true"
              class="text-sm text-slate-400 hover:text-emerald-400 transition"
            >
              Show manual input
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Start Seed
              </label>
              <input
                v-model.number="startSeed"
                type="number"
                min="1"
                max="668"
                class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              <p class="mt-2 text-sm text-slate-400">First seed to generate (default: 1)</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                End Seed
              </label>
              <input
                v-model.number="endSeed"
                type="number"
                min="1"
                max="668"
                class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              <p class="mt-2 text-sm text-slate-400">Last seed to generate (default: 668)</p>
            </div>
          </div>
          <p class="mt-3 text-sm text-slate-400">
            <span class="font-semibold text-emerald-400">{{ seedCount }} seeds</span> will be generated (S{{ String(startSeed).padStart(4, '0') }}-S{{ String(endSeed).padStart(4, '0') }})
          </p>

          <!-- Generate Button -->
          <button
            @click="startGeneration"
            class="mt-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition hover:-translate-y-0.5"
          >
            Generate Course
          </button>
        </div>
      </div>

      <!-- Progress Monitor -->
      <div v-if="isGenerating || isCompleted" class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">
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
        <div v-if="isCompleted" class="mt-8 flex gap-4">
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

        <!-- Error Message -->
        <div v-if="errorMessage" class="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {{ errorMessage }}
        </div>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api, { apiClient } from '../services/api'

// State
const knownLanguage = ref('eng')
const targetLanguage = ref('gle')
const startSeed = ref(1)
const endSeed = ref(668)

const targetLanguages = ref([])
const knownLanguages = ref([])
const languagesLoading = ref(false)

const isGenerating = ref(false)
const isCompleted = ref(false)
const courseCode = ref(null)
const currentPhase = ref('initializing')
const progress = ref(0)
const errorMessage = ref('')

// Smart Resume
const analyzing = ref(false)
const analysis = ref(null)
const showManualInput = ref(false)

let pollInterval = null

// Phase names for UI (matches Phase Intelligence architecture)
const phaseNames = [
  { id: 0, name: 'Phase 1: Pedagogical Translation' },
  { id: 1, name: 'Phase 3: LEGO Extraction' },
  { id: 2, name: 'Phase 4: Batch Preparation' },
  { id: 3, name: 'Phase 5: Basket Generation' },
  { id: 4, name: 'Phase 6: Introduction Generation' },
  { id: 5, name: 'Phase 7: Compilation' },
  { id: 6, name: 'Phase 8: Audio Generation (Kai)' }
]

// Computed
const seedCount = computed(() => {
  return endSeed.value - startSeed.value + 1
})

const currentPhaseIndex = computed(() => {
  const phase = currentPhase.value
  if (phase === 'initializing') return -1
  if (phase === 'phase_1' || phase === 'phase_1_waiting' || phase === 'phase_1_complete') return 0
  if (phase === 'phase_3') return 1
  if (phase === 'phase_5') return 2
  if (phase === 'phase_5.5') return 3
  if (phase === 'phase_6') return 4
  if (phase === 'phase_7' || phase === 'compilation') return 5
  if (phase === 'phase_8') return 6
  if (phase === 'completed') return 7
  return -1
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
  endSeed.value = rec.action.endSeed
  startGeneration()
}

const startGeneration = async () => {
  try {
    errorMessage.value = ''
    isGenerating.value = true

    const response = await api.course.generate({
      target: targetLanguage.value,
      known: knownLanguage.value,
      startSeed: startSeed.value,
      endSeed: endSeed.value
    })

    console.log('Course generation started:', response)
    courseCode.value = response.courseCode

    // Start polling for status
    startPolling(response.courseCode)
  } catch (error) {
    console.error('Failed to start course generation:', error)
    errorMessage.value = error.response?.data?.error || 'Failed to start course generation. Check console for details.'
    isGenerating.value = false
  }
}

const startPolling = (code) => {
  // Poll every 2 seconds
  pollInterval = setInterval(async () => {
    try {
      const status = await api.course.getStatus(code)
      currentPhase.value = status.phase || 'initializing'
      progress.value = status.progress || 0

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
  }, 2000)
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
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

// Lifecycle hooks
onMounted(async () => {
  await loadLanguages()
})

// Cleanup
onUnmounted(() => {
  stopPolling()
})
</script>
