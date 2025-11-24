<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">Audio Generation</h1>
            <p class="text-slate-400">Generate TTS audio for all course content with customizable parameters</p>
          </div>
        </div>
      </div>

      <!-- Course Selection -->
      <div class="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-slate-200 mb-4">Select Course</h2>
        <div class="flex gap-4 items-end">
          <div class="flex-1">
            <label class="block text-sm text-slate-400 mb-2">Course Code</label>
            <select
              v-model="selectedCourse"
              @change="loadCourseManifest"
              class="w-full bg-slate-700 text-slate-100 p-3 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Select a course...</option>
              <option v-for="course in availableCourses" :key="course" :value="course">
                {{ course }}
              </option>
            </select>
          </div>
          <button
            v-if="selectedCourse"
            @click="loadCourseManifest"
            :disabled="loadingManifest"
            class="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-6 py-3 rounded transition-colors"
          >
            {{ loadingManifest ? 'Loading...' : 'Load Manifest' }}
          </button>
        </div>
      </div>

      <!-- Course Manifest Stats -->
      <div v-if="manifest" class="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-emerald-400 mb-4">Course Manifest Statistics</h2>
        <div class="grid grid-cols-4 gap-4">
          <div class="bg-slate-900/50 rounded p-4">
            <div class="text-sm text-slate-400 mb-1">Slices</div>
            <div class="text-2xl font-bold text-emerald-400">{{ manifest.slices?.length || 0 }}</div>
          </div>
          <div class="bg-slate-900/50 rounded p-4">
            <div class="text-sm text-slate-400 mb-1">Seeds</div>
            <div class="text-2xl font-bold text-emerald-400">{{ totalSeeds }}</div>
          </div>
          <div class="bg-slate-900/50 rounded p-4">
            <div class="text-sm text-slate-400 mb-1">Unique Phrases</div>
            <div class="text-2xl font-bold text-emerald-400">{{ uniquePhrases }}</div>
          </div>
          <div class="bg-slate-900/50 rounded p-4">
            <div class="text-sm text-slate-400 mb-1">Total Audio Files</div>
            <div class="text-2xl font-bold text-emerald-400">{{ totalAudioFiles }}</div>
          </div>
        </div>

        <!-- S3 Status Check -->
        <div class="mt-6">
          <button
            @click="checkS3Status"
            :disabled="checkingS3"
            class="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-6 py-3 rounded transition-colors"
          >
            {{ checkingS3 ? 'Checking S3...' : 'Check Audio Status in S3' }}
          </button>
        </div>

        <!-- S3 Status Results -->
        <div v-if="s3Status" class="grid grid-cols-3 gap-4 mt-4">
          <div class="bg-emerald-900/20 border border-emerald-700/50 rounded p-4">
            <div class="text-sm text-emerald-400 mb-1">Available in S3</div>
            <div class="text-2xl font-bold text-emerald-400">{{ s3Status.available }}</div>
          </div>
          <div class="bg-red-900/20 border border-red-700/50 rounded p-4">
            <div class="text-sm text-red-400 mb-1">Missing from S3</div>
            <div class="text-2xl font-bold text-red-400">{{ s3Status.missing }}</div>
          </div>
          <div class="bg-blue-900/20 border border-blue-700/50 rounded p-4">
            <div class="text-sm text-blue-400 mb-1">Completion</div>
            <div class="text-2xl font-bold text-blue-400">{{ s3CompletionPercent }}%</div>
          </div>
        </div>
      </div>

      <!-- TTS Service Configuration -->
      <div v-if="manifest" class="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-emerald-400 mb-4">TTS Service Configuration</h2>

        <!-- Service Provider Selection -->
        <div class="mb-6">
          <label class="block text-sm text-slate-400 mb-2">TTS Provider</label>
          <div class="flex gap-4">
            <button
              @click="config.ttsProvider = 'elevenlabs'"
              :class="[
                'px-6 py-3 rounded border-2 transition-colors',
                config.ttsProvider === 'elevenlabs'
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                  : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
              ]"
            >
              ElevenLabs
            </button>
            <button
              @click="config.ttsProvider = 'azure'"
              :class="[
                'px-6 py-3 rounded border-2 transition-colors',
                config.ttsProvider === 'azure'
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                  : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
              ]"
            >
              Azure TTS
            </button>
          </div>
        </div>

        <!-- ElevenLabs Configuration -->
        <div v-if="config.ttsProvider === 'elevenlabs'" class="space-y-4">
          <div>
            <label class="block text-sm text-slate-400 mb-2">ElevenLabs API Key</label>
            <input
              v-model="config.elevenlabs.apiKey"
              type="password"
              placeholder="Enter your ElevenLabs API key"
              class="w-full bg-slate-700 text-slate-100 p-3 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm text-slate-400 mb-2">Voice Mapping ({{ manifest.target }} → {{ manifest.known }})</label>
            <div class="space-y-3">
              <div class="flex gap-4 items-center">
                <div class="w-32 text-slate-300">target1 ({{ manifest.target }})</div>
                <input
                  v-model="config.elevenlabs.voiceMapping.target1"
                  placeholder="Voice ID for primary target voice"
                  class="flex-1 bg-slate-700 text-slate-100 p-2 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div class="flex gap-4 items-center">
                <div class="w-32 text-slate-300">target2 ({{ manifest.target }})</div>
                <input
                  v-model="config.elevenlabs.voiceMapping.target2"
                  placeholder="Voice ID for alternate target voice"
                  class="flex-1 bg-slate-700 text-slate-100 p-2 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div class="flex gap-4 items-center">
                <div class="w-32 text-slate-300">source ({{ manifest.known }})</div>
                <input
                  v-model="config.elevenlabs.voiceMapping.source"
                  placeholder="Voice ID for known language voice"
                  class="flex-1 bg-slate-700 text-slate-100 p-2 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-slate-400 mb-2">Stability (0-1)</label>
              <input
                v-model.number="config.elevenlabs.stability"
                type="number"
                min="0"
                max="1"
                step="0.1"
                class="w-full bg-slate-700 text-slate-100 p-2 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm text-slate-400 mb-2">Similarity Boost (0-1)</label>
              <input
                v-model.number="config.elevenlabs.similarityBoost"
                type="number"
                min="0"
                max="1"
                step="0.1"
                class="w-full bg-slate-700 text-slate-100 p-2 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <!-- Azure TTS Configuration -->
        <div v-else-if="config.ttsProvider === 'azure'" class="space-y-4">
          <div>
            <label class="block text-sm text-slate-400 mb-2">Azure Speech Key</label>
            <input
              v-model="config.azure.subscriptionKey"
              type="password"
              placeholder="Enter your Azure Speech subscription key"
              class="w-full bg-slate-700 text-slate-100 p-3 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm text-slate-400 mb-2">Azure Region</label>
            <input
              v-model="config.azure.region"
              placeholder="e.g., eastus"
              class="w-full bg-slate-700 text-slate-100 p-3 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm text-slate-400 mb-2">Voice Mapping ({{ manifest.target }} → {{ manifest.known }})</label>
            <div class="space-y-3">
              <div class="flex gap-4 items-center">
                <div class="w-32 text-slate-300">target1 ({{ manifest.target }})</div>
                <input
                  v-model="config.azure.voiceMapping.target1"
                  placeholder="Voice name (e.g., it-IT-IsabellaNeural)"
                  class="flex-1 bg-slate-700 text-slate-100 p-2 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div class="flex gap-4 items-center">
                <div class="w-32 text-slate-300">target2 ({{ manifest.target }})</div>
                <input
                  v-model="config.azure.voiceMapping.target2"
                  placeholder="Voice name (e.g., it-IT-DiegoNeural)"
                  class="flex-1 bg-slate-700 text-slate-100 p-2 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div class="flex gap-4 items-center">
                <div class="w-32 text-slate-300">source ({{ manifest.known }})</div>
                <input
                  v-model="config.azure.voiceMapping.source"
                  placeholder="Voice name (e.g., en-US-JennyNeural)"
                  class="flex-1 bg-slate-700 text-slate-100 p-2 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Generation Parameters -->
      <div v-if="manifest" class="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-emerald-400 mb-4">Generation Parameters</h2>

        <div class="grid grid-cols-3 gap-6">
          <div>
            <label class="block text-sm text-slate-400 mb-2">Batch Size</label>
            <input
              v-model.number="config.batchSize"
              type="number"
              min="1"
              max="100"
              class="w-full bg-slate-700 text-slate-100 p-3 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
            />
            <p class="text-xs text-slate-500 mt-1">Files to generate per batch</p>
          </div>

          <div>
            <label class="block text-sm text-slate-400 mb-2">Concurrency</label>
            <input
              v-model.number="config.concurrency"
              type="number"
              min="1"
              max="10"
              class="w-full bg-slate-700 text-slate-100 p-3 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
            />
            <p class="text-xs text-slate-500 mt-1">Parallel TTS requests</p>
          </div>

          <div>
            <label class="block text-sm text-slate-400 mb-2">Max Retries</label>
            <input
              v-model.number="config.maxRetries"
              type="number"
              min="0"
              max="5"
              class="w-full bg-slate-700 text-slate-100 p-3 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
            />
            <p class="text-xs text-slate-500 mt-1">Retry failed generations</p>
          </div>
        </div>

        <div class="mt-4">
          <label class="flex items-center gap-2 text-slate-300">
            <input
              v-model="config.skipExisting"
              type="checkbox"
              class="w-5 h-5 rounded bg-slate-700 border-slate-600"
            />
            <span>Skip existing files in S3 (only generate missing)</span>
          </label>
        </div>
      </div>

      <!-- Generation Controls -->
      <div v-if="manifest" class="mb-6">
        <div class="flex gap-4">
          <button
            @click="startGeneration"
            :disabled="generating || !isConfigValid"
            class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-8 py-4 rounded-lg transition-colors font-semibold text-lg"
          >
            {{ generating ? 'Generating...' : `Generate Audio (${s3Status?.missing || totalAudioFiles} files)` }}
          </button>

          <button
            v-if="generating"
            @click="cancelGeneration"
            class="bg-red-600 hover:bg-red-500 text-white px-6 py-4 rounded-lg transition-colors"
          >
            Cancel Generation
          </button>
        </div>

        <div v-if="!isConfigValid" class="mt-3 text-sm text-red-400">
          ⚠️ Please configure TTS service and voice mapping before generating audio
        </div>
      </div>

      <!-- Generation Progress -->
      <div
        v-if="generationProgress.active"
        class="mb-6 bg-slate-800 border border-emerald-500/30 rounded-lg p-6"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-semibold text-emerald-400">Audio Generation Progress</h3>
          <span class="text-slate-400">{{ generationProgress.completed }} / {{ generationProgress.total }}</span>
        </div>

        <div class="mb-4">
          <div class="w-full bg-slate-700 rounded-full h-4">
            <div
              class="bg-emerald-500 h-4 rounded-full transition-all duration-300"
              :style="{ width: generationProgress.progress + '%' }"
            ></div>
          </div>
          <div class="text-sm text-slate-400 mt-2">
            {{ generationProgress.progress.toFixed(1) }}% complete
          </div>
        </div>

        <div v-if="generationProgress.currentFile" class="text-sm text-slate-400 mb-2">
          Currently generating: <span class="text-slate-300 font-mono">{{ generationProgress.currentFile }}</span>
        </div>

        <div v-if="generationProgress.errors.length > 0" class="mt-4">
          <details class="bg-red-900/20 border border-red-500/30 rounded p-3">
            <summary class="text-red-400 cursor-pointer">
              ⚠️ {{ generationProgress.errors.length }} errors occurred
            </summary>
            <div class="mt-2 space-y-1 max-h-40 overflow-y-auto">
              <div
                v-for="(error, idx) in generationProgress.errors"
                :key="idx"
                class="text-xs text-red-300 font-mono"
              >
                {{ error }}
              </div>
            </div>
          </details>
        </div>

        <div class="grid grid-cols-4 gap-4 mt-4 text-sm">
          <div class="bg-slate-900/50 rounded p-3">
            <div class="text-slate-400">Successful</div>
            <div class="text-emerald-400 font-semibold">{{ generationProgress.successful }}</div>
          </div>
          <div class="bg-slate-900/50 rounded p-3">
            <div class="text-slate-400">Failed</div>
            <div class="text-red-400 font-semibold">{{ generationProgress.failed }}</div>
          </div>
          <div class="bg-slate-900/50 rounded p-3">
            <div class="text-slate-400">Skipped</div>
            <div class="text-yellow-400 font-semibold">{{ generationProgress.skipped }}</div>
          </div>
          <div class="bg-slate-900/50 rounded p-3">
            <div class="text-slate-400">Est. Time</div>
            <div class="text-blue-400 font-semibold">{{ estimatedTimeRemaining }}</div>
          </div>
        </div>
      </div>

      <!-- Completion State -->
      <div v-if="generationComplete" class="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-700/50 rounded-lg p-8">
        <div class="flex items-start gap-6">
          <div class="text-6xl">🎉</div>
          <div class="flex-1">
            <h2 class="text-3xl font-semibold text-emerald-400 mb-4">Audio Generation Complete!</h2>
            <p class="text-slate-300 mb-6">
              All audio files have been generated and uploaded to S3. Your course is ready for deployment.
            </p>

            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="bg-slate-900/50 rounded p-4">
                <div class="text-sm text-slate-400 mb-1">Total Generated</div>
                <div class="text-2xl font-bold text-emerald-400">{{ generationProgress.successful }}</div>
              </div>
              <div class="bg-slate-900/50 rounded p-4">
                <div class="text-sm text-slate-400 mb-1">Failed</div>
                <div class="text-2xl font-bold text-red-400">{{ generationProgress.failed }}</div>
              </div>
              <div class="bg-slate-900/50 rounded p-4">
                <div class="text-sm text-slate-400 mb-1">Total Time</div>
                <div class="text-2xl font-bold text-blue-400">{{ totalGenerationTime }}</div>
              </div>
            </div>

            <div class="flex gap-4">
              <button
                @click="checkS3Status"
                class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Verify S3 Status
              </button>

              <router-link
                :to="`/courses/${selectedCourse}/compile`"
                class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-colors inline-block"
              >
                Go to Course Compilation
              </router-link>

              <button
                @click="resetGeneration"
                class="bg-slate-700 hover:bg-slate-600 text-slate-300 px-6 py-3 rounded-lg transition-colors"
              >
                Generate Another Course
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const availableCourses = ref([])
const selectedCourse = ref('')
const loadingManifest = ref(false)
const manifest = ref(null)

const checkingS3 = ref(false)
const s3Status = ref(null)

const generating = ref(false)
const generationComplete = ref(false)

const config = ref({
  ttsProvider: 'elevenlabs',
  elevenlabs: {
    apiKey: '',
    voiceMapping: {
      target1: '',
      target2: '',
      source: ''
    },
    stability: 0.5,
    similarityBoost: 0.75
  },
  azure: {
    subscriptionKey: '',
    region: 'eastus',
    voiceMapping: {
      target1: '',
      target2: '',
      source: ''
    }
  },
  batchSize: 50,
  concurrency: 5,
  maxRetries: 3,
  skipExisting: true
})

const generationProgress = ref({
  active: false,
  progress: 0,
  completed: 0,
  total: 0,
  successful: 0,
  failed: 0,
  skipped: 0,
  currentFile: '',
  errors: [],
  startTime: null
})

const totalSeeds = computed(() => {
  if (!manifest.value) return 0
  return manifest.value.slices?.reduce((sum, slice) => sum + (slice.seeds?.length || 0), 0) || 0
})

const uniquePhrases = computed(() => {
  if (!manifest.value) return 0
  let count = 0
  manifest.value.slices?.forEach(slice => {
    if (slice.samples) {
      count += Object.keys(slice.samples).length
    }
  })
  return count
})

const totalAudioFiles = computed(() => {
  if (!manifest.value) return 0
  let count = 0
  manifest.value.slices?.forEach(slice => {
    if (slice.samples) {
      Object.values(slice.samples).forEach(sampleArray => {
        count += sampleArray.length
      })
    }
  })
  return count
})

const s3CompletionPercent = computed(() => {
  if (!s3Status.value || s3Status.value.total === 0) return 0
  return Math.round((s3Status.value.available / s3Status.value.total) * 100)
})

const isConfigValid = computed(() => {
  if (config.value.ttsProvider === 'elevenlabs') {
    return config.value.elevenlabs.apiKey !== '' &&
           config.value.elevenlabs.voiceMapping.target1 !== '' &&
           config.value.elevenlabs.voiceMapping.target2 !== '' &&
           config.value.elevenlabs.voiceMapping.source !== ''
  } else if (config.value.ttsProvider === 'azure') {
    return config.value.azure.subscriptionKey !== '' &&
           config.value.azure.region !== '' &&
           config.value.azure.voiceMapping.target1 !== '' &&
           config.value.azure.voiceMapping.target2 !== '' &&
           config.value.azure.voiceMapping.source !== ''
  }
  return false
})

const estimatedTimeRemaining = computed(() => {
  if (!generationProgress.value.active || !generationProgress.value.startTime) return '--'

  const elapsed = Date.now() - generationProgress.value.startTime
  const remaining = generationProgress.value.total - generationProgress.value.completed

  if (generationProgress.value.completed === 0) return '--'

  const avgTimePerFile = elapsed / generationProgress.value.completed
  const estimatedMs = avgTimePerFile * remaining

  const minutes = Math.floor(estimatedMs / 60000)
  const seconds = Math.floor((estimatedMs % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
})

const totalGenerationTime = computed(() => {
  if (!generationProgress.value.startTime) return '--'

  const elapsed = Date.now() - generationProgress.value.startTime
  const minutes = Math.floor(elapsed / 60000)
  const seconds = Math.floor((elapsed % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
})

onMounted(async () => {
  await loadAvailableCourses()
})

async function loadAvailableCourses() {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'}/api/courses/list`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    })

    if (response.ok) {
      const data = await response.json()
      availableCourses.value = data.courses || []
    }
  } catch (error) {
    console.error('Failed to load courses:', error)
  }
}

async function loadCourseManifest() {
  if (!selectedCourse.value) return

  loadingManifest.value = true

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'}/api/courses/${selectedCourse.value}/manifest`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to load course manifest')
    }

    const data = await response.json()
    manifest.value = data

    // Reset states
    s3Status.value = null
    generationComplete.value = false

  } catch (error) {
    console.error('Failed to load manifest:', error)
    alert('Failed to load course manifest: ' + error.message)
  } finally {
    loadingManifest.value = false
  }
}

async function checkS3Status() {
  if (!manifest.value) return

  checkingS3.value = true

  try {
    // Collect all sample IDs
    const allSampleIds = new Set()
    manifest.value.slices?.forEach(slice => {
      if (slice.samples) {
        Object.values(slice.samples).forEach(samples => {
          samples.forEach(sample => allSampleIds.add(sample.id))
        })
      }
    })

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'}/api/audio/check-s3`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        sampleIds: Array.from(allSampleIds)
      })
    })

    if (!response.ok) {
      throw new Error('Failed to check S3 status')
    }

    const data = await response.json()
    s3Status.value = data

  } catch (error) {
    console.error('Failed to check S3:', error)
    alert('Failed to check S3 status: ' + error.message)
  } finally {
    checkingS3.value = false
  }
}

async function startGeneration() {
  if (!isConfigValid.value) return

  generating.value = true
  generationProgress.value = {
    active: true,
    progress: 0,
    completed: 0,
    total: s3Status.value?.missing || totalAudioFiles.value,
    successful: 0,
    failed: 0,
    skipped: 0,
    currentFile: '',
    errors: [],
    startTime: Date.now()
  }

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'}/api/audio/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode: selectedCourse.value,
        manifest: manifest.value,
        config: config.value,
        s3Status: s3Status.value
      })
    })

    if (!response.ok) {
      throw new Error('Failed to start audio generation')
    }

    const data = await response.json()

    if (data.jobId) {
      await pollGenerationProgress(data.jobId)
    }

  } catch (error) {
    console.error('Generation failed:', error)
    alert('Failed to generate audio: ' + error.message)
    generationProgress.value.active = false
  } finally {
    generating.value = false
  }
}

async function pollGenerationProgress(jobId) {
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'}/api/audio/generation-status/${jobId}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to check generation status')
      }

      const data = await response.json()

      generationProgress.value.completed = data.completed || 0
      generationProgress.value.successful = data.successful || 0
      generationProgress.value.failed = data.failed || 0
      generationProgress.value.skipped = data.skipped || 0
      generationProgress.value.currentFile = data.currentFile || ''
      generationProgress.value.errors = data.errors || []
      generationProgress.value.progress = (data.completed / generationProgress.value.total) * 100

      if (data.status === 'completed') {
        clearInterval(pollInterval)
        generationProgress.value.active = false
        generationComplete.value = true

        // Refresh S3 status
        await checkS3Status()
      } else if (data.status === 'failed') {
        clearInterval(pollInterval)
        generationProgress.value.active = false
        alert('Audio generation failed: ' + (data.error || 'Unknown error'))
      }

    } catch (error) {
      console.error('Failed to poll progress:', error)
    }
  }, 2000)
}

function cancelGeneration() {
  // TODO: Implement cancellation endpoint
  alert('Cancellation not yet implemented')
}

function resetGeneration() {
  generationComplete.value = false
  generationProgress.value = {
    active: false,
    progress: 0,
    completed: 0,
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    currentFile: '',
    errors: [],
    startTime: null
  }
  selectedCourse.value = ''
  manifest.value = null
  s3Status.value = null
}
</script>
