<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link :to="`/courses/${courseCode}`" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Course Editor
        </router-link>
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">Course Compilation</h1>
            <p class="text-slate-400">{{ courseCode }} • Prepare course for app deployment</p>
          </div>
        </div>
      </div>

      <!-- Progress Steps -->
      <div class="mb-8 bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div class="flex items-center justify-between">
          <!-- Step 1: Compile JSON -->
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                :class="compilationStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'"
              >
                {{ compilationStep > 1 ? '✓' : '1' }}
              </div>
              <div>
                <div class="font-semibold text-slate-200">Compile Course JSON</div>
                <div class="text-xs text-slate-400">Generate final course structure</div>
              </div>
            </div>
          </div>

          <div class="text-slate-600">→</div>

          <!-- Step 2: Check Audio -->
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                :class="compilationStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'"
              >
                {{ compilationStep > 2 ? '✓' : '2' }}
              </div>
              <div>
                <div class="font-semibold text-slate-200">Check Audio Status</div>
                <div class="text-xs text-slate-400">Verify audio in S3</div>
              </div>
            </div>
          </div>

          <div class="text-slate-600">→</div>

          <!-- Step 3: Generate Audio -->
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                :class="compilationStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'"
              >
                {{ compilationStep > 3 ? '✓' : '3' }}
              </div>
              <div>
                <div class="font-semibold text-slate-200">Generate Missing Audio</div>
                <div class="text-xs text-slate-400">Create audio samples</div>
              </div>
            </div>
          </div>

          <div class="text-slate-600">→</div>

          <!-- Step 4: Deploy -->
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                :class="compilationStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'"
              >
                4
              </div>
              <div>
                <div class="font-semibold text-slate-200">Ready for App</div>
                <div class="text-xs text-slate-400">Deploy to production</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="text-slate-400">Loading course data...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <h3 class="text-red-400 font-semibold mb-2">Error</h3>
        <p class="text-slate-300">{{ error }}</p>
      </div>

      <!-- Step 1: Compile JSON Structure -->
      <div v-else-if="compilationStep === 0" class="space-y-6">
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Step 1: Compile Course JSON</h2>
          <p class="text-slate-300 mb-6">
            Convert your course data (SEED_PAIRS, LEGO_PAIRS, LEGO_BASKETS) into the final JSON structure required by the app.
          </p>

          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="bg-slate-900/50 rounded p-4">
              <div class="text-sm text-slate-400 mb-1">SEED_PAIRS</div>
              <div class="text-2xl font-bold text-emerald-400">{{ courseStats.seeds }}</div>
            </div>
            <div class="bg-slate-900/50 rounded p-4">
              <div class="text-sm text-slate-400 mb-1">LEGO_PAIRS</div>
              <div class="text-2xl font-bold text-emerald-400">{{ courseStats.legos }}</div>
            </div>
            <div class="bg-slate-900/50 rounded p-4">
              <div class="text-sm text-slate-400 mb-1">LEGO_BASKETS</div>
              <div class="text-2xl font-bold text-emerald-400">{{ courseStats.baskets }}</div>
            </div>
          </div>

          <button
            @click="compileCourseJSON"
            :disabled="compiling"
            class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-8 py-3 rounded-lg transition-colors font-semibold"
          >
            {{ compiling ? 'Compiling...' : 'Compile Course JSON' }}
          </button>
        </div>
      </div>

      <!-- Step 2: Audio Status Check -->
      <div v-else-if="compilationStep === 1" class="space-y-6">
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Step 2: Audio Status Check</h2>
          <p class="text-slate-300 mb-6">
            Course JSON compiled successfully! Now let's check which audio samples are available in AWS S3.
          </p>

          <!-- Course JSON Stats -->
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="bg-emerald-900/20 border border-emerald-700/50 rounded p-4">
              <div class="text-sm text-emerald-400 mb-1">Slices</div>
              <div class="text-2xl font-bold text-emerald-400">{{ compiledJSON?.slices?.length || 0 }}</div>
            </div>
            <div class="bg-emerald-900/20 border border-emerald-700/50 rounded p-4">
              <div class="text-sm text-emerald-400 mb-1">Seeds</div>
              <div class="text-2xl font-bold text-emerald-400">{{ totalSeeds }}</div>
            </div>
            <div class="bg-emerald-900/20 border border-emerald-700/50 rounded p-4">
              <div class="text-sm text-emerald-400 mb-1">Unique Samples</div>
              <div class="text-2xl font-bold text-emerald-400">{{ uniqueSamplesCount }}</div>
            </div>
            <div class="bg-emerald-900/20 border border-emerald-700/50 rounded p-4">
              <div class="text-sm text-emerald-400 mb-1">Total Audio Files</div>
              <div class="text-2xl font-bold text-emerald-400">{{ totalAudioFiles }}</div>
            </div>
          </div>

          <button
            @click="checkAudioStatus"
            :disabled="checkingAudio"
            class="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-8 py-3 rounded-lg transition-colors font-semibold"
          >
            {{ checkingAudio ? 'Checking S3...' : 'Check Audio Status in S3' }}
          </button>
        </div>
      </div>

      <!-- Step 3: Generate Missing Audio -->
      <div v-else-if="compilationStep === 2" class="space-y-6">
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Step 3: Audio Generation</h2>

          <!-- S3 Status Summary -->
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="bg-emerald-900/20 border border-emerald-700/50 rounded p-4">
              <div class="text-sm text-emerald-400 mb-1">Available in S3</div>
              <div class="text-2xl font-bold text-emerald-400">{{ audioStatus.available }}</div>
            </div>
            <div class="bg-red-900/20 border border-red-700/50 rounded p-4">
              <div class="text-sm text-red-400 mb-1">Missing from S3</div>
              <div class="text-2xl font-bold text-red-400">{{ audioStatus.missing }}</div>
            </div>
            <div class="bg-blue-900/20 border border-blue-700/50 rounded p-4">
              <div class="text-sm text-blue-400 mb-1">Total Required</div>
              <div class="text-2xl font-bold text-blue-400">{{ audioStatus.total }}</div>
            </div>
          </div>

          <div v-if="audioStatus.missing === 0" class="mb-6 p-4 bg-emerald-900/20 border border-emerald-700/50 rounded">
            <div class="flex items-center gap-2 text-emerald-400">
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <span class="font-semibold">All audio files are available! You can proceed to deployment.</span>
            </div>
          </div>

          <div v-else class="mb-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded">
            <div class="text-yellow-400 font-semibold mb-2">⚠️ Missing Audio Samples</div>
            <p class="text-slate-300 text-sm">
              {{ audioStatus.missing }} audio files need to be generated before deployment. Click below to start generation.
            </p>
          </div>

          <div class="flex gap-4">
            <button
              v-if="audioStatus.missing > 0"
              @click="generateMissingAudio"
              :disabled="generatingAudio"
              class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-8 py-3 rounded-lg transition-colors font-semibold"
            >
              {{ generatingAudio ? 'Generating...' : `Generate Missing Audio (${audioStatus.missing})` }}
            </button>

            <button
              @click="viewMissingAudioDetails"
              class="bg-slate-700 hover:bg-slate-600 text-slate-300 px-8 py-3 rounded-lg transition-colors"
            >
              View Missing Audio Details
            </button>
          </div>
        </div>

        <!-- Missing Audio Details (if expanded) -->
        <div v-if="showMissingDetails" class="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-red-400 mb-4">Missing Audio Files</h3>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="missing in missingAudioList"
              :key="missing.id"
              class="bg-red-900/10 border border-red-700/30 rounded p-3"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="text-sm font-mono text-red-400 mb-1">{{ missing.id }}.mp3</div>
                  <div class="text-xs text-slate-400 mb-1">{{ missing.text }}</div>
                  <div class="flex gap-2 text-xs">
                    <span class="text-slate-500">Role: {{ missing.role }}</span>
                    <span class="text-slate-500">Cadence: {{ missing.cadence }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Ready for Deployment -->
      <div v-else-if="compilationStep === 3" class="space-y-6">
        <div class="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-700/50 rounded-lg p-8">
          <div class="flex items-start gap-6">
            <div class="text-6xl">🎉</div>
            <div class="flex-1">
              <h2 class="text-3xl font-semibold text-emerald-400 mb-4">Course Ready for Deployment!</h2>
              <p class="text-slate-300 mb-6">
                All audio files have been generated and are available in S3. Your course is ready to be deployed to the app.
              </p>

              <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-slate-900/50 rounded p-4">
                  <div class="text-sm text-slate-400 mb-1">Course JSON</div>
                  <div class="text-lg font-semibold text-emerald-400">✓ Compiled</div>
                </div>
                <div class="bg-slate-900/50 rounded p-4">
                  <div class="text-sm text-slate-400 mb-1">Audio Files</div>
                  <div class="text-lg font-semibold text-emerald-400">✓ Complete ({{ audioStatus.total }})</div>
                </div>
                <div class="bg-slate-900/50 rounded p-4">
                  <div class="text-sm text-slate-400 mb-1">S3 Bucket</div>
                  <div class="text-lg font-semibold text-emerald-400">✓ Synced</div>
                </div>
                <div class="bg-slate-900/50 rounded p-4">
                  <div class="text-sm text-slate-400 mb-1">Status</div>
                  <div class="text-lg font-semibold text-emerald-400">✓ Ready</div>
                </div>
              </div>

              <div class="flex gap-4">
                <button
                  @click="downloadCourseJSON"
                  class="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg transition-colors font-semibold"
                >
                  Download Course JSON
                </button>

                <button
                  @click="deployToProduction"
                  class="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg transition-colors font-semibold"
                >
                  Deploy to Production
                </button>

                <router-link
                  :to="`/courses/${courseCode}`"
                  class="bg-slate-700 hover:bg-slate-600 text-slate-300 px-8 py-3 rounded-lg transition-colors inline-block"
                >
                  Back to Course Editor
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Generation Progress Overlay -->
      <div
        v-if="generationProgress.active"
        class="fixed bottom-4 right-4 bg-slate-800 border border-emerald-500/30 rounded-lg p-6 w-96 shadow-2xl z-50"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-emerald-400">Generating Audio</h3>
        </div>

        <div class="mb-3">
          <div class="w-full bg-slate-700 rounded-full h-2">
            <div
              class="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              :style="{ width: generationProgress.progress + '%' }"
            ></div>
          </div>
          <div class="text-xs text-slate-400 mt-1 text-right">
            {{ generationProgress.completed }} / {{ generationProgress.total }} files
          </div>
        </div>

        <div v-if="generationProgress.error" class="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded p-2">
          {{ generationProgress.error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const courseCode = route.params.courseCode

const loading = ref(true)
const error = ref(null)
const compilationStep = ref(0) // 0=compile, 1=check audio, 2=generate, 3=ready

// Step 1: Compilation
const courseStats = ref({ seeds: 0, legos: 0, baskets: 0 })
const compiling = ref(false)
const compiledJSON = ref(null)

// Step 2: Audio Check
const checkingAudio = ref(false)
const audioStatus = ref({
  available: 0,
  missing: 0,
  total: 0,
  availableIds: []
})

// Step 3: Audio Generation
const generatingAudio = ref(false)
const showMissingDetails = ref(false)
const generationProgress = ref({
  active: false,
  progress: 0,
  completed: 0,
  total: 0,
  error: null
})

const totalSeeds = computed(() => {
  if (!compiledJSON.value) return 0
  return compiledJSON.value.slices?.reduce((sum, slice) => sum + (slice.seeds?.length || 0), 0) || 0
})

const uniqueSamplesCount = computed(() => {
  if (!compiledJSON.value) return 0
  let count = 0
  compiledJSON.value.slices?.forEach(slice => {
    if (slice.samples) {
      count += Object.keys(slice.samples).length
    }
  })
  return count
})

const totalAudioFiles = computed(() => {
  if (!compiledJSON.value) return 0
  let count = 0
  compiledJSON.value.slices?.forEach(slice => {
    if (slice.samples) {
      Object.values(slice.samples).forEach(sampleArray => {
        count += sampleArray.length
      })
    }
  })
  return count
})

const missingAudioList = computed(() => {
  if (!compiledJSON.value || !audioStatus.value.availableIds) return []

  const missing = []
  compiledJSON.value.slices?.forEach(slice => {
    if (slice.samples) {
      Object.entries(slice.samples).forEach(([text, samples]) => {
        samples.forEach(sample => {
          if (!audioStatus.value.availableIds.includes(sample.id)) {
            missing.push({
              ...sample,
              text
            })
          }
        })
      })
    }
  })
  return missing
})

onMounted(async () => {
  await loadCourseData()
})

async function loadCourseData() {
  loading.value = true
  error.value = null

  try {
    const response = await api.course.get(courseCode)

    courseStats.value = {
      seeds: response.translations?.length || 0,
      legos: response.legos?.length || 0,
      baskets: response.baskets?.length || 0
    }

  } catch (err) {
    error.value = err.message || 'Failed to load course data'
    console.error('Failed to load course:', err)
  } finally {
    loading.value = false
  }
}

async function compileCourseJSON() {
  compiling.value = true

  try {
    // Call API to compile the course VFS data into final JSON structure
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'}/api/courses/${courseCode}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })

    if (!response.ok) {
      throw new Error(`Compilation failed: ${response.status}`)
    }

    const data = await response.json()
    compiledJSON.value = data.courseJSON

    // Move to next step
    compilationStep.value = 1

  } catch (err) {
    console.error('Compilation failed:', err)
    alert('Failed to compile course: ' + err.message)
  } finally {
    compiling.value = false
  }
}

async function checkAudioStatus() {
  checkingAudio.value = true

  try {
    // Collect all sample IDs from compiled JSON
    const allSampleIds = new Set()
    compiledJSON.value.slices?.forEach(slice => {
      if (slice.samples) {
        Object.values(slice.samples).forEach(samples => {
          samples.forEach(sample => allSampleIds.add(sample.id))
        })
      }
    })

    // Check S3 status
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
      throw new Error(`S3 check failed: ${response.status}`)
    }

    const data = await response.json()
    audioStatus.value = data

    // Move to next step
    compilationStep.value = 2

  } catch (err) {
    console.error('Audio check failed:', err)
    alert('Failed to check audio status: ' + err.message)
  } finally {
    checkingAudio.value = false
  }
}

async function generateMissingAudio() {
  generatingAudio.value = true
  generationProgress.value = {
    active: true,
    progress: 0,
    completed: 0,
    total: audioStatus.value.missing,
    error: null
  }

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'}/api/audio/generate-missing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode,
        missingAudio: missingAudioList.value
      })
    })

    if (!response.ok) {
      throw new Error(`Audio generation failed: ${response.status}`)
    }

    const data = await response.json()

    if (data.jobId) {
      await pollGenerationProgress(data.jobId)
    } else {
      // Immediate completion
      compilationStep.value = 3
    }

  } catch (err) {
    console.error('Audio generation failed:', err)
    generationProgress.value.error = err.message
  } finally {
    generatingAudio.value = false
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
        throw new Error(`Status check failed: ${response.status}`)
      }

      const data = await response.json()

      generationProgress.value.completed = data.completed || 0
      generationProgress.value.progress = (data.completed / generationProgress.value.total) * 100

      if (data.status === 'completed') {
        clearInterval(pollInterval)
        generationProgress.value.active = false

        // Refresh audio status
        await checkAudioStatus()

        // Move to final step
        compilationStep.value = 3
      } else if (data.status === 'failed') {
        clearInterval(pollInterval)
        generationProgress.value.error = data.error || 'Generation failed'
      }

    } catch (err) {
      console.error('Failed to poll progress:', err)
    }
  }, 2000)
}

function viewMissingAudioDetails() {
  showMissingDetails.value = !showMissingDetails.value
}

function downloadCourseJSON() {
  const blob = new Blob([JSON.stringify(compiledJSON.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${courseCode}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function deployToProduction() {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'}/api/courses/${courseCode}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseJSON: compiledJSON.value
      })
    })

    if (!response.ok) {
      throw new Error(`Deployment failed: ${response.status}`)
    }

    alert('Course deployed successfully!')

  } catch (err) {
    console.error('Deployment failed:', err)
    alert('Failed to deploy: ' + err.message)
  }
}
</script>
