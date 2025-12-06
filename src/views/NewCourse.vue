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
        <!-- Step 1: Course Basics -->
        <div v-if="currentStep === 0">
          <h2 class="text-2xl font-semibold text-slate-100 mb-6">Course Basics</h2>

          <div class="space-y-6">
            <!-- Course Code -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Course Code <span class="text-red-400">*</span>
              </label>
              <input
                v-model="formData.courseCode"
                type="text"
                placeholder="e.g., spa_for_eng"
                class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                :class="{ 'border-red-500': errors.courseCode }"
                @input="validateCourseCode"
              />
              <p v-if="errors.courseCode" class="mt-1 text-sm text-red-400">
                {{ errors.courseCode }}
              </p>
              <p v-else class="mt-1 text-xs text-slate-500">
                Use lowercase letters and underscores only (e.g., target_for_known)
              </p>
            </div>

            <!-- Display Name -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Display Name <span class="text-red-400">*</span>
              </label>
              <input
                v-model="formData.displayName"
                type="text"
                placeholder="e.g., Spanish for English Speakers"
                class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                :class="{ 'border-red-500': errors.displayName }"
                @input="validateDisplayName"
              />
              <p v-if="errors.displayName" class="mt-1 text-sm text-red-400">
                {{ errors.displayName }}
              </p>
            </div>

            <!-- Language Selection -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Source Language -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">
                  Source Language (Known) <span class="text-red-400">*</span>
                </label>
                <select
                  v-model="formData.sourceLanguage"
                  class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  :class="{ 'border-red-500': errors.sourceLanguage }"
                  @change="validateSourceLanguage"
                >
                  <option value="" disabled>Select source language</option>
                  <option
                    v-for="lang in languages"
                    :key="lang.code"
                    :value="lang.code"
                  >
                    {{ lang.name }} ({{ lang.code }})
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
                  Target Language (Learning) <span class="text-red-400">*</span>
                </label>
                <select
                  v-model="formData.targetLanguage"
                  class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  :class="{ 'border-red-500': errors.targetLanguage }"
                  @change="validateTargetLanguage"
                >
                  <option value="" disabled>Select target language</option>
                  <option
                    v-for="lang in languages"
                    :key="lang.code"
                    :value="lang.code"
                  >
                    {{ lang.name }} ({{ lang.code }})
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
          </div>
        </div>

        <!-- Step 2: Configuration -->
        <div v-if="currentStep === 1">
          <h2 class="text-2xl font-semibold text-slate-100 mb-6">Configuration</h2>

          <div class="space-y-6">
            <!-- Number of Seeds -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Number of Seeds
              </label>
              <input
                v-model.number="formData.numberOfSeeds"
                type="number"
                min="1"
                max="668"
                class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              <p class="mt-1 text-xs text-slate-500">
                Default: 668 (full course). Use fewer for testing.
              </p>
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
                  <span class="text-emerald-400 font-mono">{{ formData.courseCode }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Display Name:</span>
                  <span class="text-slate-200">{{ formData.displayName }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Source Language:</span>
                  <span class="text-slate-200">{{ getLanguageName(formData.sourceLanguage) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Target Language:</span>
                  <span class="text-slate-200">{{ getLanguageName(formData.targetLanguage) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Number of Seeds:</span>
                  <span class="text-slate-200">{{ formData.numberOfSeeds }}</span>
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Wizard Steps
const steps = [
  { title: 'Course Basics', subtitle: 'Essential information' },
  { title: 'Configuration', subtitle: 'Settings & options' },
  { title: 'Review', subtitle: 'Summary & create' }
]

const currentStep = ref(0)
const creating = ref(false)

// Form Data
const formData = ref({
  courseCode: '',
  displayName: '',
  sourceLanguage: '',
  targetLanguage: '',
  numberOfSeeds: 668,
  version: '1.0'
})

// Validation Errors
const errors = ref({
  courseCode: '',
  displayName: '',
  sourceLanguage: '',
  targetLanguage: ''
})

// Language Options
const languages = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'ita', name: 'Italian' },
  { code: 'deu', name: 'German' },
  { code: 'por', name: 'Portuguese' },
  { code: 'cmn', name: 'Chinese (Mandarin)' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'ara', name: 'Arabic' },
  { code: 'rus', name: 'Russian' },
  { code: 'cym', name: 'Welsh' },
  { code: 'gle', name: 'Irish' }
]

// Validation Functions
const validateCourseCode = () => {
  const code = formData.value.courseCode.trim()

  if (!code) {
    errors.value.courseCode = 'Course code is required'
    return false
  }

  // Must be lowercase with underscores only
  const pattern = /^[a-z_]+$/
  if (!pattern.test(code)) {
    errors.value.courseCode = 'Course code must be lowercase with underscores only'
    return false
  }

  errors.value.courseCode = ''
  return true
}

const validateDisplayName = () => {
  const name = formData.value.displayName.trim()

  if (!name) {
    errors.value.displayName = 'Display name is required'
    return false
  }

  errors.value.displayName = ''
  return true
}

const validateSourceLanguage = () => {
  if (!formData.value.sourceLanguage) {
    errors.value.sourceLanguage = 'Source language is required'
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
    errors.value.targetLanguage = 'Target language must be different from source language'
    return false
  }

  errors.value.targetLanguage = ''
  return true
}

// Step Validation
const validateStep = (step) => {
  if (step === 0) {
    return (
      validateCourseCode() &&
      validateDisplayName() &&
      validateSourceLanguage() &&
      validateTargetLanguage()
    )
  }

  return true
}

// Can Proceed to Next Step
const canProceed = computed(() => {
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
  const lang = languages.find(l => l.code === code)
  return lang ? `${lang.name} (${lang.code})` : code
}

// Create Course
const createCourse = async () => {
  creating.value = true

  try {
    // Log course data (in production, this would call an API)
    console.log('Creating course with data:', formData.value)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

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
