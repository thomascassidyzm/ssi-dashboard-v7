<template>
  <div class="min-h-screen bg-canvas">
    <!-- Header -->
    <header class="bg-surface/50 border-b border-line/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-link to="/courses" class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition mb-4">
          <span>←</span>
          <span>Back to Course Library</span>
        </router-link>
        <h1 class="text-3xl font-bold text-emerald-400">
          Create New Course
        </h1>
        <p class="mt-2 text-muted">
          Build a new language course from scratch
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Wizard Steps Indicator -->
      <div class="mb-8">
        <div class="flex items-center justify-center">
          <div
            v-for="(step, index) in steps"
            :key="index"
            class="flex items-center"
          >
            <!-- Step Circle -->
            <div class="flex items-center">
              <div
                :class="[
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all',
                  currentStep > index
                    ? 'bg-emerald-600 text-white'
                    : currentStep === index
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/30'
                    : 'bg-surface-2 text-muted'
                ]"
              >
                <span v-if="currentStep > index">✓</span>
                <span v-else>{{ index + 1 }}</span>
              </div>
              <div class="ml-3 text-left hidden sm:block">
                <div
                  :class="[
                    'text-sm font-medium',
                    currentStep >= index ? 'text-ink' : 'text-faint'
                  ]"
                >
                  {{ step.title }}
                </div>
                <div class="text-xs text-faint">{{ step.subtitle }}</div>
              </div>
            </div>
            <!-- Connector Line -->
            <div
              v-if="index < steps.length - 1"
              :class="[
                'w-12 h-0.5 mx-4',
                currentStep > index ? 'bg-emerald-600' : 'bg-surface-2'
              ]"
            ></div>
          </div>
        </div>
      </div>

      <!-- Wizard Content -->
      <div class="bg-surface/50 rounded-lg border border-line/20 p-8">
        <!-- Step 1: Language Selection -->
        <div v-if="currentStep === 0">
          <h2 class="text-2xl font-semibold text-ink mb-6">Select Languages</h2>

          <div class="space-y-6">
            <!-- Language Selection -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Known Language -->
              <div>
                <label class="block text-sm font-medium text-ink mb-2">
                  Known Language (Learning FROM) <span class="text-red-400">*</span>
                </label>
                <select
                  v-model="formData.sourceLanguage"
                  :disabled="languagesLoading"
                  class="w-full bg-surface-2 border border-line/20 rounded-lg px-4 py-3 text-ink focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  :class="{ 'border-red-500': errors.sourceLanguage }"
                  @change="onLanguageChange"
                >
                  <option value="" disabled selected>{{ languagesLoading ? 'Loading languages...' : 'Select known language' }}</option>
                  <option
                    v-for="lang in languages"
                    :key="lang.code"
                    :value="lang.code"
                  >
                    {{ lang.name }} ({{ lang.code }}) {{ lang.native ? `- ${lang.native}` : '' }}
                  </option>
                </select>
                <p v-if="errors.sourceLanguage" class="mt-1 text-sm text-red-400">
                  {{ errors.sourceLanguage }}
                </p>
                <p v-else class="mt-1 text-xs text-faint">
                  The language learners already know
                </p>
              </div>

              <!-- Target Language -->
              <div>
                <label class="block text-sm font-medium text-ink mb-2">
                  Target Language (Learning TO) <span class="text-red-400">*</span>
                </label>
                <select
                  v-model="formData.targetLanguage"
                  :disabled="languagesLoading"
                  class="w-full bg-surface-2 border border-line/20 rounded-lg px-4 py-3 text-ink focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  :class="{ 'border-red-500': errors.targetLanguage }"
                  @change="onLanguageChange"
                >
                  <option value="" disabled selected>{{ languagesLoading ? 'Loading languages...' : 'Select target language' }}</option>
                  <option
                    v-for="lang in languages"
                    :key="lang.code"
                    :value="lang.code"
                  >
                    {{ lang.name }} ({{ lang.code }}) {{ lang.native ? `- ${lang.native}` : '' }}
                  </option>
                </select>
                <p v-if="errors.targetLanguage" class="mt-1 text-sm text-red-400">
                  {{ errors.targetLanguage }}
                </p>
                <p v-else class="mt-1 text-xs text-faint">
                  The language learners want to learn
                </p>
              </div>
            </div>

            <!-- Auto-computed Course Code Preview -->
            <div v-if="formData.sourceLanguage && formData.targetLanguage" class="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
              <div class="flex items-center gap-3">
                <span class="text-emerald-400 text-xl">✨</span>
                <div>
                  <p class="text-emerald-300 font-medium">Course will be created as:</p>
                  <p class="text-ink mt-1">
                    <span class="font-mono text-emerald-400">{{ computedCourseCode }}</span>
                    <span class="text-faint mx-2">→</span>
                    <span>{{ computedDisplayName }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Configuration -->
        <div v-if="currentStep === 1">
          <h2 class="text-2xl font-semibold text-ink mb-6">Configuration</h2>

          <div class="space-y-6">
            <!-- Course Mode Selection -->
            <div>
              <label class="block text-sm font-medium text-ink mb-2">
                Course Mode <span class="text-red-400">*</span>
              </label>
              <div v-if="modesLoading" class="text-muted text-sm">Loading modes...</div>
              <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  v-for="mode in modes"
                  :key="mode.id"
                  type="button"
                  @click="selectedMode = mode.id; onModeChange()"
                  :class="[
                    'p-4 rounded-lg border-2 text-left transition-all',
                    selectedMode === mode.id
                      ? 'border-emerald-500 bg-emerald-900/30'
                      : 'border-line bg-surface/50 hover:border-line'
                  ]"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span :class="['font-medium', selectedMode === mode.id ? 'text-emerald-400' : 'text-ink']">
                      {{ mode.name }}
                    </span>
                    <span class="text-xs text-faint">~{{ mode.estimatedMinutes }}min</span>
                  </div>
                  <div class="text-sm text-muted mb-2">{{ mode.description }}</div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono px-2 py-0.5 rounded bg-surface-2 text-emerald-400">
                      {{ mode.seeds }} seeds
                    </span>
                    <span v-if="mode.pattern" class="text-xs text-faint">{{ mode.pattern }}</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Seed Range (Advanced) -->
            <div>
              <label class="block text-sm font-medium text-ink mb-2">
                Seed Range
                <span class="text-xs text-faint ml-2">(auto-set by mode, can be customized)</span>
              </label>
              <div class="flex items-center gap-3">
                <div class="flex-1">
                  <label class="block text-xs text-faint mb-1">Start</label>
                  <input
                    v-model.number="formData.seedStart"
                    type="number"
                    min="1"
                    max="668"
                    class="w-full bg-surface-2 border border-line/20 rounded-lg px-4 py-3 text-ink focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono"
                  />
                </div>
                <span class="text-faint pt-5">→</span>
                <div class="flex-1">
                  <label class="block text-xs text-faint mb-1">End</label>
                  <input
                    v-model.number="formData.seedEnd"
                    type="number"
                    min="1"
                    max="668"
                    class="w-full bg-surface-2 border border-line/20 rounded-lg px-4 py-3 text-ink focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono"
                  />
                </div>
                <div class="pt-5">
                  <span class="text-muted text-sm">({{ seedCount }} seeds)</span>
                </div>
              </div>
              <p class="mt-2 text-xs text-faint">
                Seed range is set automatically based on the selected mode. Customize if needed.
              </p>
            </div>

            <!-- Version -->
            <div>
              <label class="block text-sm font-medium text-ink mb-2">
                Version
              </label>
              <input
                v-model="formData.version"
                type="text"
                placeholder="e.g., 1.0"
                class="w-full bg-surface-2 border border-line/20 rounded-lg px-4 py-3 text-ink placeholder-faint focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              <p class="mt-1 text-xs text-faint">
                Course version identifier
              </p>
            </div>

            <!-- Info Box -->
            <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <span class="text-blue-400 text-xl">ℹ️</span>
                <div class="text-sm">
                  <p class="text-blue-300 font-medium mb-1">Additional Configuration</p>
                  <p class="text-muted">
                    More advanced options (audio settings, pipeline configuration) can be added later through the course editor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Review & Create -->
        <div v-if="currentStep === 2">
          <h2 class="text-2xl font-semibold text-ink mb-6">Review & Create</h2>

          <div class="space-y-6">
            <!-- Summary -->
            <div class="bg-canvas/50 border border-line rounded-lg p-6">
              <h3 class="text-lg font-medium text-ink mb-4">Course Summary</h3>

              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-muted">Course Code:</span>
                  <span class="text-emerald-400 font-mono">{{ computedCourseCode }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted">Display Name:</span>
                  <span class="text-ink">{{ computedDisplayName }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted">Known Language:</span>
                  <span class="text-ink">{{ getLanguageName(formData.sourceLanguage) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted">Target Language:</span>
                  <span class="text-ink">{{ getLanguageName(formData.targetLanguage) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted">Course Mode:</span>
                  <span class="text-emerald-400">{{ getModeName(selectedMode) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted">Seed Range:</span>
                  <span class="text-ink">
                    <span class="font-mono">S{{ String(formData.seedStart).padStart(4, '0') }}</span>
                    <span class="text-faint mx-1">→</span>
                    <span class="font-mono">S{{ String(formData.seedEnd).padStart(4, '0') }}</span>
                    <span class="text-muted ml-2">({{ seedCount }} seeds)</span>
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted">Version:</span>
                  <span class="text-ink">{{ formData.version }}</span>
                </div>
              </div>
            </div>

            <!-- Existence Check Result -->
            <div v-if="existenceCheck.checking" class="bg-surface-2/50 border border-line rounded-lg p-4">
              <div class="flex items-center gap-3">
                <div class="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                <span class="text-ink">Checking if course already exists...</span>
              </div>
            </div>

            <div v-else-if="existenceCheck.exists" class="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <span class="text-amber-400 text-xl">⚠️</span>
                <div class="text-sm flex-1">
                  <p class="text-amber-300 font-medium mb-2">Course already exists!</p>
                  <p class="text-muted mb-3">
                    A course with code <span class="font-mono text-amber-400">{{ computedCourseCode }}</span> already exists
                    <span v-if="existenceCheck.existsLocal && existenceCheck.existsS3">(locally and in S3)</span>
                    <span v-else-if="existenceCheck.existsLocal">(locally)</span>
                    <span v-else-if="existenceCheck.existsS3">(in S3)</span>.
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      @click="useNewVersion"
                      class="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded transition"
                    >
                      Create as {{ existenceCheck.suggestedVersion }}
                    </button>
                    <router-link
                      :to="`/production/${computedCourseCode}`"
                      class="bg-surface-3 hover:bg-surface-3 text-ink text-sm px-4 py-2 rounded transition"
                    >
                      View existing course
                    </router-link>
                  </div>
                </div>
              </div>
            </div>

            <!-- Next Steps Info (only show if no conflict) -->
            <div v-else class="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <span class="text-emerald-400 text-xl">✨</span>
                <div class="text-sm">
                  <p class="text-emerald-300 font-medium mb-2">What happens next?</p>
                  <ul class="text-muted space-y-1">
                    <li>• Course will be created in the database</li>
                    <li>• You'll be redirected to the course editor</li>
                    <li>• Use Course Builder to add seeds, LEGOs and phrases</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="mt-8 flex justify-between">
        <!-- Back Button -->
        <button
          v-if="currentStep > 0"
          @click="previousStep"
          class="bg-surface-2 hover:bg-surface-3 text-ink font-semibold px-6 py-3 rounded-lg transition hover:-translate-y-0.5"
        >
          Previous
        </button>
        <div v-else></div>

        <!-- Next/Create Button -->
        <button
          v-if="currentStep < steps.length - 1"
          @click="nextStep"
          :disabled="!canProceed"
          class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-3 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition hover:-translate-y-0.5"
        >
          Next
        </button>
        <button
          v-else
          @click="createCourse"
          :disabled="creating || existenceCheck.checking || existenceCheck.exists"
          class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-3 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-lg transition hover:-translate-y-0.5"
        >
          <span v-if="creating">Creating...</span>
          <span v-else-if="existenceCheck.checking">Checking...</span>
          <span v-else-if="existenceCheck.exists">Resolve Conflict First</span>
          <span v-else>Create Course</span>
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/services/api'

const router = useRouter()

// Wizard Steps
const steps = [
  { title: 'Languages', subtitle: 'Select language pair' },
  { title: 'Configuration', subtitle: 'Settings & options' },
  { title: 'Review', subtitle: 'Summary & create' }
]

const currentStep = ref(0)
const creating = ref(false)

// Language loading state
const languages = ref([])
const languagesLoading = ref(true)

// Course modes loading state
const modes = ref([])
const modesLoading = ref(true)
const selectedMode = ref(null)

// Form Data
const formData = ref({
  sourceLanguage: '',
  targetLanguage: '',
  seedStart: 1,
  seedEnd: 10,  // Default to quick_test size
  version: '1.0'
})

// Computed seed count
const seedCount = computed(() => {
  const start = formData.value.seedStart || 1
  const end = formData.value.seedEnd || 668
  return Math.max(0, end - start + 1)
})

// Set seed range preset
function setSeedRange(start, end) {
  formData.value.seedStart = start
  formData.value.seedEnd = end
}

// Validation Errors
const errors = ref({
  sourceLanguage: '',
  targetLanguage: ''
})

// Course existence check state
const existenceCheck = ref({
  checking: false,
  exists: false,
  existsLocal: false,
  existsS3: false,
  suggestedVersion: null
})

// Override course code (when user chooses new version)
const overrideCourseCode = ref(null)

// Load languages and modes from API on mount
onMounted(async () => {
  await Promise.all([loadLanguages(), loadModes()])
})

async function loadLanguages() {
  languagesLoading.value = true
  try {
    // Request TTS-capable languages with legacy 3-letter codes (spa, fra, deu)
    // to match existing course code conventions (spa_for_eng)
    const response = await apiClient.get('/api/languages?tts=true&format=legacy')
    languages.value = response.data
  } catch (error) {
    console.error('Failed to load languages:', error)
    // Fallback to comprehensive list if API fails
    languages.value = [
      { code: 'afr', name: 'Afrikaans', native: 'Afrikaans' },
      { code: 'ara', name: 'Arabic', native: 'العربية' },
      { code: 'bre', name: 'Breton', native: 'Brezhoneg' },
      { code: 'cat', name: 'Catalan', native: 'Català' },
      { code: 'ces', name: 'Czech', native: 'Čeština' },
      { code: 'cmn', name: 'Chinese (Mandarin)', native: '中文 (普通话)' },
      { code: 'cym', name: 'Welsh', native: 'Cymraeg' },
      { code: 'dan', name: 'Danish', native: 'Dansk' },
      { code: 'deu', name: 'German', native: 'Deutsch' },
      { code: 'ell', name: 'Greek', native: 'Ελληνικά' },
      { code: 'eng', name: 'English', native: 'English' },
      { code: 'eus', name: 'Basque', native: 'Euskara' },
      { code: 'fin', name: 'Finnish', native: 'Suomi' },
      { code: 'fra', name: 'French', native: 'Français' },
      { code: 'gla', name: 'Scottish Gaelic', native: 'Gàidhlig' },
      { code: 'gle', name: 'Irish', native: 'Gaeilge' },
      { code: 'glv', name: 'Manx', native: 'Gaelg' },
      { code: 'heb', name: 'Hebrew', native: 'עברית' },
      { code: 'hin', name: 'Hindi', native: 'हिन्दी' },
      { code: 'hun', name: 'Hungarian', native: 'Magyar' },
      { code: 'ind', name: 'Indonesian', native: 'Bahasa Indonesia' },
      { code: 'ita', name: 'Italian', native: 'Italiano' },
      { code: 'jpn', name: 'Japanese', native: '日本語' },
      { code: 'kor', name: 'Korean', native: '한국어' },
      { code: 'lit', name: 'Lithuanian', native: 'Lietuvių' },
      { code: 'ltz', name: 'Luxembourgish', native: 'Lëtzebuergesch' },
      { code: 'nld', name: 'Dutch', native: 'Nederlands' },
      { code: 'nor', name: 'Norwegian', native: 'Norsk' },
      { code: 'pol', name: 'Polish', native: 'Polski' },
      { code: 'por', name: 'Portuguese', native: 'Português' },
      { code: 'ron', name: 'Romanian', native: 'Română' },
      { code: 'rus', name: 'Russian', native: 'Русский' },
      { code: 'slk', name: 'Slovak', native: 'Slovenčina' },
      { code: 'slv', name: 'Slovenian', native: 'Slovenščina' },
      { code: 'spa', name: 'Spanish', native: 'Español' },
      { code: 'swe', name: 'Swedish', native: 'Svenska' },
      { code: 'tha', name: 'Thai', native: 'ไทย' },
      { code: 'tur', name: 'Turkish', native: 'Türkçe' },
      { code: 'ukr', name: 'Ukrainian', native: 'Українська' },
      { code: 'vie', name: 'Vietnamese', native: 'Tiếng Việt' },
      { code: 'yue', name: 'Chinese (Cantonese)', native: '中文 (粤语)' },
      { code: 'zho', name: 'Chinese', native: '中文' }
    ]
  } finally {
    languagesLoading.value = false
  }
}

async function loadModes() {
  modesLoading.value = true
  try {
    const response = await apiClient.get('/api/modes')
    modes.value = response.data.modes
    // Pre-select quick_test as default
    const quickTest = modes.value.find(m => m.id === 'quick_test')
    if (quickTest) {
      selectedMode.value = quickTest.id
      // Apply quick_test seed range
      formData.value.seedStart = 1
      formData.value.seedEnd = quickTest.seeds
    }
  } catch (error) {
    console.error('Failed to load modes:', error)
    // Fallback modes if API fails
    modes.value = [
      { id: 'quick_test', name: 'Quick Test', seeds: 10, description: 'Fast validation (10 seeds)', estimatedMinutes: 2 },
      { id: 'mvp_course', name: 'MVP Course', seeds: 250, description: 'Production MVP (250 seeds)', estimatedMinutes: 15 },
      { id: 'full_course', name: 'Full Course', seeds: 668, description: 'Complete course (668 seeds)', estimatedMinutes: 20 }
    ]
    selectedMode.value = 'quick_test'
  } finally {
    modesLoading.value = false
  }
}

// Handle mode selection change
function onModeChange() {
  const mode = modes.value.find(m => m.id === selectedMode.value)
  if (mode) {
    formData.value.seedStart = 1
    formData.value.seedEnd = mode.seeds
  }
}

// Auto-compute course code from language selections
const computedCourseCode = computed(() => {
  // Use override if set (when user chooses new version)
  if (overrideCourseCode.value) {
    return overrideCourseCode.value
  }
  if (!formData.value.targetLanguage || !formData.value.sourceLanguage) {
    return ''
  }
  return `${formData.value.targetLanguage}_for_${formData.value.sourceLanguage}`
})

// Auto-compute display name from language selections
const computedDisplayName = computed(() => {
  if (!formData.value.targetLanguage || !formData.value.sourceLanguage) {
    return ''
  }
  const targetLang = languages.value.find(l => l.code === formData.value.targetLanguage)
  const sourceLang = languages.value.find(l => l.code === formData.value.sourceLanguage)

  const targetName = targetLang?.name || formData.value.targetLanguage.toUpperCase()
  const sourceName = sourceLang?.name || formData.value.sourceLanguage.toUpperCase()

  return `${targetName} for ${sourceName} Speakers`
})

// Called when language selection changes
function onLanguageChange() {
  validateSourceLanguage()
  validateTargetLanguage()
}

// Validation Functions
const validateSourceLanguage = () => {
  if (!formData.value.sourceLanguage) {
    errors.value.sourceLanguage = 'Known language is required'
    return false
  }

  errors.value.sourceLanguage = ''
  return true
}

const validateTargetLanguage = () => {
  if (!formData.value.targetLanguage) {
    errors.value.targetLanguage = 'Target language is required'
    return false
  }

  if (formData.value.targetLanguage === formData.value.sourceLanguage) {
    errors.value.targetLanguage = 'Target language must be different from known language'
    return false
  }

  errors.value.targetLanguage = ''
  return true
}

// Step Validation
const validateStep = (step) => {
  if (step === 0) {
    return (
      validateSourceLanguage() &&
      validateTargetLanguage()
    )
  }

  return true
}

// Can Proceed to Next Step
const canProceed = computed(() => {
  if (currentStep.value === 0) {
    return formData.value.sourceLanguage &&
           formData.value.targetLanguage &&
           formData.value.sourceLanguage !== formData.value.targetLanguage
  }
  return validateStep(currentStep.value)
})

// Check if course already exists
async function checkCourseExists() {
  if (!computedCourseCode.value) return

  existenceCheck.value.checking = true
  existenceCheck.value.exists = false

  try {
    const response = await apiClient.get(`/api/courses/${computedCourseCode.value}/exists`)
    existenceCheck.value = {
      checking: false,
      exists: response.data.exists,
      existsLocal: response.data.existsLocal,
      existsS3: response.data.existsS3,
      suggestedVersion: response.data.suggestedVersion
    }
  } catch (error) {
    console.error('Failed to check course existence:', error)
    existenceCheck.value.checking = false
    // Assume doesn't exist if check fails
    existenceCheck.value.exists = false
  }
}

// Use suggested new version
function useNewVersion() {
  if (existenceCheck.value.suggestedVersion) {
    overrideCourseCode.value = existenceCheck.value.suggestedVersion
    existenceCheck.value.exists = false
    existenceCheck.value.suggestedVersion = null
  }
}

// Navigation
const nextStep = async () => {
  if (validateStep(currentStep.value) && currentStep.value < steps.length - 1) {
    currentStep.value++

    // Check course existence when entering Review step
    if (currentStep.value === 2) {
      await checkCourseExists()
    }
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    // Reset override and existence check when going back
    if (currentStep.value === 2) {
      overrideCourseCode.value = null
      existenceCheck.value = {
        checking: false,
        exists: false,
        existsLocal: false,
        existsS3: false,
        suggestedVersion: null
      }
    }
    currentStep.value--
  }
}

// Helper Functions
const getLanguageName = (code) => {
  const lang = languages.value.find(l => l.code === code)
  return lang ? `${lang.name} (${lang.code})` : code
}

const getModeName = (modeId) => {
  const mode = modes.value.find(m => m.id === modeId)
  return mode ? `${mode.name} (${mode.seeds} seeds)` : modeId
}

// Create Course (APML v14 - Database-first, Course Builder)
const createCourse = async () => {
  creating.value = true

  try {
    const courseData = {
      courseCode: computedCourseCode.value,
      displayName: computedDisplayName.value,
      sourceLanguage: formData.value.sourceLanguage,
      targetLanguage: formData.value.targetLanguage,
      seedStart: formData.value.seedStart,
      seedEnd: formData.value.seedEnd,
      seedCount: seedCount.value,
      version: formData.value.version,
      mode: selectedMode.value
    }

    // Create course in Supabase (database-first)
    await apiClient.post('/api/courses/create', courseData)

    // Success - redirect to course editor
    // Course Builder API will be used to add content
    router.push(`/courses/${computedCourseCode.value}`)
  } catch (error) {
    console.error('Failed to create course:', error)
    alert('Failed to create course. Please try again.')
  } finally {
    creating.value = false
  }
}
</script>
