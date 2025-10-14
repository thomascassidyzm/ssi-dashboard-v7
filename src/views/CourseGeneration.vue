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
          SSi Course Production Dashboard v7.0 - Complete course generation pipeline
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

        <!-- Number of Seeds -->
        <div class="mb-8">
          <label class="block text-sm font-medium text-slate-300 mb-2">
            Number of Seeds
          </label>
          <input
            v-model.number="seedCount"
            type="number"
            min="1"
            max="668"
            class="w-full md:w-64 bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
          <p class="mt-2 text-sm text-slate-400">Default: 668 (full canonical corpus)</p>
        </div>

        <!-- Generate Button -->
        <button
          @click="startGeneration"
          class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition hover:-translate-y-0.5"
        >
          Generate Course
        </button>
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
import api from '../services/api'

// State
const knownLanguage = ref('eng')
const targetLanguage = ref('gle')
const seedCount = ref(668)

const targetLanguages = ref([])
const knownLanguages = ref([])
const languagesLoading = ref(false)

const isGenerating = ref(false)
const isCompleted = ref(false)
const courseCode = ref(null)
const currentPhase = ref('initializing')
const progress = ref(0)
const errorMessage = ref('')

let pollInterval = null

// Phase names for UI
const phaseNames = [
  { id: 0, name: 'Phase 0: Corpus Pre-Analysis' },
  { id: 1, name: 'Phase 1: Generate SEED_PAIRS' },
  { id: 2, name: 'Phase 2: Corpus Intelligence' },
  { id: 3, name: 'Phase 3: Extract LEGO_PAIRS' },
  { id: 4, name: 'Phase 3.5: LEGO Graph Construction' },
  { id: 5, name: 'Phase 4: LEGO Deduplication' },
  { id: 6, name: 'Phase 5: Generate LEGO_BASKETS' },
  { id: 7, name: 'Phase 6: Generate LEGO_INTRODUCTIONS' },
  { id: 8, name: 'Compilation' }
]

// Computed
const currentPhaseIndex = computed(() => {
  const phase = currentPhase.value
  if (phase === 'initializing') return -1
  if (phase === 'phase_0') return 0
  if (phase === 'phase_1') return 1
  if (phase === 'phase_2') return 2
  if (phase === 'phase_3') return 3
  if (phase === 'phase_3.5') return 4
  if (phase === 'phase_4') return 5
  if (phase === 'phase_5') return 6
  if (phase === 'phase_6') return 7
  if (phase === 'compilation') return 8
  return -1
})

// Methods
// Fetch languages from API
const loadLanguages = async () => {
  languagesLoading.value = true
  try {
    const response = await api.get('/api/languages')
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

const startGeneration = async () => {
  try {
    errorMessage.value = ''
    isGenerating.value = true

    const response = await api.course.generate({
      target: targetLanguage.value,
      known: knownLanguage.value,
      seeds: seedCount.value
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
