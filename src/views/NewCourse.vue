<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-link to="/courses" class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition mb-4">
          <span>←</span>
          <span>Back to Course Library</span>
        </router-link>
        <h1 class="text-3xl font-bold text-emerald-400">
          Create New Course
        </h1>
        <p class="mt-2 text-slate-400">
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
                    : 'bg-slate-700 text-slate-400'
                ]"
              >
                <span v-if="currentStep > index">✓</span>
                <span v-else>{{ index + 1 }}</span>
              </div>
              <div class="ml-3 text-left hidden sm:block">
                <div
                  :class="[
                    'text-sm font-medium',
                    currentStep >= index ? 'text-slate-200' : 'text-slate-500'
                  ]"
                >
                  {{ step.title }}
                </div>
                <div class="text-xs text-slate-500">{{ step.subtitle }}</div>
              </div>
            </div>
            <!-- Connector Line -->
            <div
              v-if="index < steps.length - 1"
              :class="[
                'w-12 h-0.5 mx-4',
                currentStep > index ? 'bg-emerald-600' : 'bg-slate-700'
              ]"
            ></div>
          </div>
        </div>
      </div>

      <!-- Wizard Content -->
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">
        <!-- Step 1: Language Selection -->
        <div v-if="currentStep === 0">
          <h2 class="text-2xl font-semibold text-slate-100 mb-6">Select Languages</h2>

          <div class="space-y-6">
            <!-- Language Selection -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Known Language (Source) -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">
                  Known Language (Learning FROM) <span class="text-red-400">*</span>
                </label>
                <select
                  v-model="formData.sourceLanguage"
                  :disabled="languagesLoading"
                  class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  :class="{ 'border-red-500': errors.sourceLanguage }"
                  @change="onLanguageChange"
                >
                  <option value="" disabled>{{ languagesLoading ? 'Loading languages...' : 'Select known language' }}</option>
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
                <p v-else class="mt-1 text-xs text-slate-500">
                  The language learners already know
                </p>
              </div>

              <!-- Target Language -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">
                  Target Language (Learning TO) <span class="text-red-400">*</span>
                </label>
                <select
                  v-model="formData.targetLanguage"
                  :disabled="languagesLoading"
                  class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  :class="{ 'border-red-500': errors.targetLanguage }"
                  @change="onLanguageChange"
                >
                  <option value="" disabled>{{ languagesLoading ? 'Loading languages...' : 'Select target language' }}</option>
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
                <p v-else class="mt-1 text-xs text-slate-500">
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
                  <p class="text-slate-300 mt-1">
                    <span class="font-mono text-emerald-400">{{ computedCourseCode }}</span>
                    <span class="text-slate-500 mx-2">→</span>
                    <span>{{ computedDisplayName }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Configuration -->
        <div v-if="currentStep === 1">
          <h2 class="text-2xl font-semibold text-slate-100 mb-6">Configuration</h2>

          <div class="space-y-6">
            <!-- Seed Range -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Seed Range
              </label>
              <div class="flex items-center gap-3">
                <div class="flex-1">
                  <label class="block text-xs text-slate-500 mb-1">Start</label>
                  <input
                    v-model.number="formData.seedStart"
                    type="number"
                    min="1"
                    max="668"
                    class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono"
                  />
                </div>
                <span class="text-slate-500 pt-5">→</span>
                <div class="flex-1">
                  <label class="block text-xs text-slate-500 mb-1">End</label>
                  <input
                    v-model.number="formData.seedEnd"
                    type="number"
                    min="1"
                    max="668"
                    class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono"
                  />
                </div>
                <div class="pt-5">
                  <span class="text-slate-400 text-sm">({{ seedCount }} seeds)</span>
                </div>
              </div>
              <p class="mt-2 text-xs text-slate-500">
                Default: S0001-S0668 (full course). Use S0001-S0030 for a quick test run.
              </p>
              <!-- Quick presets -->
              <div class="mt-3 flex gap-2">
                <button
                  type="button"
                  @click="setSeedRange(1, 30)"
                  class="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                >
                  Test (1-30)
                </button>
                <button
                  type="button"
                  @click="setSeedRange(1, 100)"
                  class="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                >
                  First 100
                </button>
                <button
                  type="button"
                  @click="setSeedRange(1, 668)"
                  class="text-xs px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white transition"
                >
                  Full Course (668)
                </button>
              </div>
            </div>

            <!-- Version -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Version
              </label>
              <input
                v-model="formData.version"
                type="text"
                placeholder="e.g., 1.0"
                class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              <p class="mt-1 text-xs text-slate-500">
                Course version identifier
              </p>
            </div>

            <!-- Info Box -->
            <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <span class="text-blue-400 text-xl">ℹ️</span>
                <div class="text-sm">
                  <p class="text-blue-300 font-medium mb-1">Additional Configuration</p>
                  <p class="text-slate-400">
                    More advanced options (audio settings, pipeline configuration) can be added later through the course editor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Review & Create -->
        <div v-if="currentStep === 2">
          <h2 class="text-2xl font-semibold text-slate-100 mb-6">Review & Create</h2>

          <div class="space-y-6">
            <!-- Summary -->
            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
              <h3 class="text-lg font-medium text-slate-200 mb-4">Course Summary</h3>

              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-slate-400">Course Code:</span>
                  <span class="text-emerald-400 font-mono">{{ computedCourseCode }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Display Name:</span>
                  <span class="text-slate-200">{{ computedDisplayName }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Known Language:</span>
                  <span class="text-slate-200">{{ getLanguageName(formData.sourceLanguage) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Target Language:</span>
                  <span class="text-slate-200">{{ getLanguageName(formData.targetLanguage) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Seed Range:</span>
                  <span class="text-slate-200">
                    <span class="font-mono">S{{ String(formData.seedStart).padStart(4, '0') }}</span>
                    <span class="text-slate-500 mx-1">→</span>
                    <span class="font-mono">S{{ String(formData.seedEnd).padStart(4, '0') }}</span>
                    <span class="text-slate-400 ml-2">({{ seedCount }} seeds)</span>
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Version:</span>
                  <span class="text-slate-200">{{ formData.version }}</span>
                </div>
              </div>
            </div>

            <!-- Next Steps Info -->
            <div class="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <span class="text-emerald-400 text-xl">✨</span>
                <div class="text-sm">
                  <p class="text-emerald-300 font-medium mb-2">What happens next?</p>
                  <ul class="text-slate-400 space-y-1">
                    <li>• Course structure will be created</li>
                    <li>• You'll be redirected to the course editor</li>
                    <li>• Start generating content through the pipeline</li>
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
          class="bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold px-6 py-3 rounded-lg transition hover:-translate-y-0.5"
        >
          Previous
        </button>
        <div v-else></div>

        <!-- Next/Create Button -->
        <button
          v-if="currentStep < steps.length - 1"
          @click="nextStep"
          :disabled="!canProceed"
          class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition hover:-translate-y-0.5"
        >
          Next
        </button>
        <button
          v-else
          @click="createCourse"
          :disabled="creating"
          class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-lg transition hover:-translate-y-0.5"
        >
          <span v-if="creating">Creating...</span>
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

// Form Data
const formData = ref({
  sourceLanguage: '',
  targetLanguage: '',
  seedStart: 1,
  seedEnd: 668,
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

// Load languages from API on mount
onMounted(async () => {
  await loadLanguages()
})

async function loadLanguages() {
  languagesLoading.value = true
  try {
    const response = await apiClient.get('/api/languages')
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

// Auto-compute course code from language selections
const computedCourseCode = computed(() => {
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

// Navigation
const nextStep = () => {
  if (validateStep(currentStep.value) && currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// Helper Functions
const getLanguageName = (code) => {
  const lang = languages.value.find(l => l.code === code)
  return lang ? `${lang.name} (${lang.code})` : code
}

// Create Course
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
      version: formData.value.version
    }

    console.log('Creating course with data:', courseData)

    // Call API to create course
    await apiClient.post('/api/courses/create', courseData)

    // Success - redirect to courses page
    router.push('/courses')
  } catch (error) {
    console.error('Failed to create course:', error)
    alert('Failed to create course. Please try again.')
  } finally {
    creating.value = false
  }
}
</script>
