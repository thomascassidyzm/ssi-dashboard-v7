<template>
  <div class="min-h-screen bg-canvas text-ink p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link :to="`/courses/${courseCode}`" class="text-accent-2 hover:opacity-80 mb-4 inline-block">
          ← Back to Course Editor
        </router-link>
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-accent-2 mb-2">Course Compilation</h1>
            <p class="text-muted">{{ getCourseName(courseCode) }} • Prepare course for app deployment</p>
          </div>
        </div>
      </div>

      <!-- Progress Steps -->
      <div class="mb-8 bg-surface border border-line rounded-lg p-6">
        <div class="flex items-center justify-between">
          <!-- Step 1: Compile JSON -->
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                :class="compilationStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-surface-2 text-muted'"
              >
                {{ compilationStep > 1 ? '✓' : '1' }}
              </div>
              <div>
                <div class="font-semibold text-ink">Compile Course JSON</div>
                <div class="text-xs text-muted">Generate final course structure</div>
              </div>
            </div>
          </div>

          <div class="text-faint">→</div>

          <!-- Step 2: Check Audio -->
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                :class="compilationStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-surface-2 text-muted'"
              >
                {{ compilationStep > 2 ? '✓' : '2' }}
              </div>
              <div>
                <div class="font-semibold text-ink">Check Audio Status</div>
                <div class="text-xs text-muted">Verify audio in S3</div>
              </div>
            </div>
          </div>

          <div class="text-faint">→</div>

          <!-- Step 3: Generate Audio -->
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                :class="compilationStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-surface-2 text-muted'"
              >
                {{ compilationStep > 3 ? '✓' : '3' }}
              </div>
              <div>
                <div class="font-semibold text-ink">Generate Missing Audio</div>
                <div class="text-xs text-muted">Create audio samples</div>
              </div>
            </div>
          </div>

          <div class="text-faint">→</div>

          <!-- Step 4: Deploy -->
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                :class="compilationStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-surface-2 text-muted'"
              >
                4
              </div>
              <div>
                <div class="font-semibold text-ink">Ready for App</div>
                <div class="text-xs text-muted">Deploy to production</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="text-muted">Loading course data...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="callout callout-red rounded-lg p-6">
        <h3 class="callout-text font-semibold mb-2">Error</h3>
        <p class="text-ink">{{ error }}</p>
      </div>

      <!-- Step 1: Compile JSON Structure -->
      <div v-else-if="compilationStep === 0" class="space-y-6">
        <div class="bg-surface border border-line rounded-lg p-8">
          <h2 class="text-2xl font-semibold text-accent-2 mb-4">Step 1: Compile Course JSON</h2>
          <p class="text-ink mb-6">
            Convert your course data (SEED_PAIRS, LEGO_PAIRS, LEGO_BASKETS) into the final JSON structure required by the app.
          </p>

          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="bg-surface-2 border border-line rounded p-4">
              <div class="text-sm text-muted mb-1">SEED_PAIRS</div>
              <div class="text-2xl font-bold text-accent-2">{{ courseStats.seeds }}</div>
            </div>
            <div class="bg-surface-2 border border-line rounded p-4">
              <div class="text-sm text-muted mb-1">LEGO_PAIRS</div>
              <div class="text-2xl font-bold text-accent-2">{{ courseStats.legos }}</div>
            </div>
            <div class="bg-surface-2 border border-line rounded p-4">
              <div class="text-sm text-muted mb-1">LEGO_BASKETS</div>
              <div class="text-2xl font-bold text-accent-2">{{ courseStats.baskets }}</div>
            </div>
          </div>

          <button
            @click="compileCourseJSON"
            :disabled="compiling"
            class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-2 text-white px-8 py-3 rounded-lg transition-colors font-semibold"
          >
            {{ compiling ? 'Compiling...' : 'Compile Course JSON' }}
          </button>
        </div>
      </div>

      <!-- Step 2: Audio Status Check -->
      <div v-else-if="compilationStep === 1" class="space-y-6">
        <div class="bg-surface border border-line rounded-lg p-8">
          <h2 class="text-2xl font-semibold text-accent-2 mb-4">Step 2: Audio Status Check</h2>
          <p class="text-ink mb-6">
            Course JSON compiled successfully! Now let's check which audio samples are available in AWS S3.
          </p>

          <!-- Course JSON Stats -->
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="stat-box stat-emerald rounded p-4">
              <div class="text-sm stat-label mb-1">Slices</div>
              <div class="text-2xl font-bold stat-value">{{ compiledJSON?.slices?.length || 0 }}</div>
            </div>
            <div class="stat-box stat-emerald rounded p-4">
              <div class="text-sm stat-label mb-1">Seeds</div>
              <div class="text-2xl font-bold stat-value">{{ totalSeeds }}</div>
            </div>
            <div class="stat-box stat-emerald rounded p-4">
              <div class="text-sm stat-label mb-1">Unique Samples</div>
              <div class="text-2xl font-bold stat-value">{{ uniqueSamplesCount }}</div>
            </div>
            <div class="stat-box stat-emerald rounded p-4">
              <div class="text-sm stat-label mb-1">Total Audio Files</div>
              <div class="text-2xl font-bold stat-value">{{ totalAudioFiles }}</div>
            </div>
          </div>

          <button
            @click="checkAudioStatus"
            :disabled="checkingAudio"
            class="bg-blue-600 hover:bg-blue-500 disabled:bg-surface-2 text-white px-8 py-3 rounded-lg transition-colors font-semibold"
          >
            {{ checkingAudio ? 'Checking S3...' : 'Check Audio Status in S3' }}
          </button>
        </div>
      </div>

      <!-- Step 3: Generate Missing Audio -->
      <div v-else-if="compilationStep === 2" class="space-y-6">
        <div class="bg-surface border border-line rounded-lg p-8">
          <h2 class="text-2xl font-semibold text-accent-2 mb-4">Step 3: Audio Generation</h2>

          <!-- S3 Status Summary -->
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="stat-box stat-emerald rounded p-4">
              <div class="text-sm stat-label mb-1">Available in S3</div>
              <div class="text-2xl font-bold stat-value">{{ audioStatus.available }}</div>
            </div>
            <div class="stat-box stat-red rounded p-4">
              <div class="text-sm stat-label mb-1">Missing from S3</div>
              <div class="text-2xl font-bold stat-value">{{ audioStatus.missing }}</div>
            </div>
            <div class="stat-box stat-blue rounded p-4">
              <div class="text-sm stat-label mb-1">Total Required</div>
              <div class="text-2xl font-bold stat-value">{{ audioStatus.total }}</div>
            </div>
          </div>

          <div v-if="audioStatus.missing === 0" class="mb-6 p-4 callout callout-emerald rounded">
            <div class="flex items-center gap-2 callout-text">
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <span class="font-semibold">All audio files are available! You can proceed to deployment.</span>
            </div>
          </div>

          <div v-else class="mb-6 p-4 callout callout-yellow rounded">
            <div class="callout-text font-semibold mb-2">⚠️ Missing Audio Samples</div>
            <p class="text-ink text-sm">
              {{ audioStatus.missing }} audio files need to be generated before deployment. Click below to start generation.
            </p>
          </div>

          <div class="flex gap-4">
            <button
              v-if="audioStatus.missing > 0"
              @click="generateMissingAudio"
              :disabled="generatingAudio"
              class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-2 text-white px-8 py-3 rounded-lg transition-colors font-semibold"
            >
              {{ generatingAudio ? 'Generating...' : `Generate Missing Audio (${audioStatus.missing})` }}
            </button>

            <button
              @click="viewMissingAudioDetails"
              class="bg-surface-2 hover:bg-surface-3 text-ink px-8 py-3 rounded-lg transition-colors"
            >
              View Missing Audio Details
            </button>
          </div>
        </div>

        <!-- Missing Audio Details (if expanded) -->
        <div v-if="showMissingDetails" class="bg-surface border border-line rounded-lg p-6">
          <h3 class="text-lg font-semibold stat-value-red mb-4">Missing Audio Files</h3>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="missing in missingAudioList"
              :key="missing.id"
              class="missing-row rounded p-3"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="text-sm font-mono stat-value-red mb-1">{{ missing.id }}.mp3</div>
                  <div class="text-xs text-muted mb-1">{{ missing.text }}</div>
                  <div class="flex gap-2 text-xs">
                    <span class="text-faint">Role: {{ missing.role }}</span>
                    <span class="text-faint">Cadence: {{ missing.cadence }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Ready for Deployment -->
      <div v-else-if="compilationStep === 3" class="space-y-6">
        <div class="ready-panel rounded-lg p-8">
          <div class="flex items-start gap-6">
            <div class="text-6xl">🎉</div>
            <div class="flex-1">
              <h2 class="text-3xl font-semibold text-accent-2 mb-4">Course Ready for Deployment!</h2>
              <p class="text-ink mb-6">
                All audio files have been generated and are available in S3. Your course is ready to be deployed to the app.
              </p>

              <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-surface border border-line rounded p-4">
                  <div class="text-sm text-muted mb-1">Course JSON</div>
                  <div class="text-lg font-semibold text-accent-2">✓ Compiled</div>
                </div>
                <div class="bg-surface border border-line rounded p-4">
                  <div class="text-sm text-muted mb-1">Audio Files</div>
                  <div class="text-lg font-semibold text-accent-2">✓ Complete ({{ audioStatus.total }})</div>
                </div>
                <div class="bg-surface border border-line rounded p-4">
                  <div class="text-sm text-muted mb-1">S3 Bucket</div>
                  <div class="text-lg font-semibold text-accent-2">✓ Synced</div>
                </div>
                <div class="bg-surface border border-line rounded p-4">
                  <div class="text-sm text-muted mb-1">Status</div>
                  <div class="text-lg font-semibold text-accent-2">✓ Ready</div>
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
                  class="bg-surface-2 hover:bg-surface-3 text-ink px-8 py-3 rounded-lg transition-colors inline-block"
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
        class="fixed bottom-4 right-4 bg-surface gen-overlay rounded-lg p-6 w-96 shadow-2xl z-50"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-accent-2">Generating Audio</h3>
        </div>

        <div class="mb-3">
          <div class="w-full bg-surface-2 rounded-full h-2">
            <div
              class="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              :style="{ width: generationProgress.progress + '%' }"
            ></div>
          </div>
          <div class="text-xs text-muted mt-1 text-right">
            {{ generationProgress.completed }} / {{ generationProgress.total }} files
          </div>
        </div>

        <div v-if="generationProgress.error" class="text-sm callout callout-red callout-text rounded p-2">
          {{ generationProgress.error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api, { getApiUrl } from '../services/api'
import { useCourses } from '../composables/useCourses'

// Fetch with timeout support (1 hour default for long-running audio operations)
async function fetchWithTimeout(url, options = {}, timeoutMs = 3600000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

const route = useRoute()
const courseCode = route.params.courseCode
const { getCourseName } = useCourses()

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
    const response = await fetch(`${getApiUrl()}/api/courses/${courseCode}/compile`, {
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
    const response = await fetch(`${getApiUrl()}/api/audio/check-s3`, {
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
    const response = await fetchWithTimeout(`${getApiUrl()}/api/audio/generate-missing`, {
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
      const response = await fetch(`${getApiUrl()}/api/audio/generation-status/${jobId}`, {
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

      if (data.status === 'complete') {
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
    const response = await fetch(`${getApiUrl()}/api/courses/${courseCode}/deploy`, {
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

<style scoped>
/* Colored stat boxes, callouts and panels.
   Defaults below reproduce the original dark-mode Tailwind appearance exactly
   (bg-X-900/20, border-X-700/50, text-X-400). The [data-theme="light"]
   overrides retint them so fills/borders separate and text passes WCAG AA on
   white. Dark mode is the default branch and is therefore unchanged. */

.stat-box {
  border-width: 1px;
  border-style: solid;
}
.stat-label,
.stat-value {
  color: inherit;
}

/* --- dark defaults (match prior Tailwind classes) --- */
.stat-emerald { background: rgba(6, 78, 59, 0.2); border-color: rgba(4, 120, 87, 0.5); color: #34d399; }
.stat-red     { background: rgba(127, 29, 29, 0.2); border-color: rgba(185, 28, 28, 0.5); color: #f87171; }
.stat-blue    { background: rgba(30, 58, 138, 0.2); border-color: rgba(29, 78, 216, 0.5); color: #60a5fa; }

.callout-emerald { background: rgba(6, 78, 59, 0.2); border: 1px solid rgba(4, 120, 87, 0.5); }
.callout-emerald .callout-text { color: #34d399; }
.callout-yellow  { background: rgba(113, 63, 18, 0.2); border: 1px solid rgba(161, 98, 7, 0.5); }
.callout-yellow .callout-text { color: #facc15; }
.callout-red     { background: rgba(127, 29, 29, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); }
.callout-red.callout-text, .callout-red .callout-text { color: #f87171; }

.stat-value-red { color: #f87171; }

.missing-row { background: rgba(127, 29, 29, 0.1); border: 1px solid rgba(185, 28, 28, 0.3); }

.ready-panel {
  background-image: linear-gradient(to bottom right, rgba(6, 78, 59, 0.3), rgba(19, 78, 74, 0.3));
  border: 1px solid rgba(4, 120, 87, 0.5);
}

/* --- light overrides: darker text/fills so everything reads on white --- */
:root[data-theme="light"] .stat-emerald {
  background: #ecfdf5;            /* emerald-50 */
  border-color: #6ee7b7;         /* emerald-300, ~visible on white */
  color: #047857;                /* emerald-700: 4.7:1 on #ecfdf5 */
}
:root[data-theme="light"] .stat-red {
  background: #fef2f2;            /* red-50 */
  border-color: #fca5a5;         /* red-300 */
  color: #b91c1c;                /* red-700: ~6:1 on #fef2f2 */
}
:root[data-theme="light"] .stat-blue {
  background: #eff6ff;            /* blue-50 */
  border-color: #93c5fd;         /* blue-300 */
  color: #1d4ed8;                /* blue-700: ~6.5:1 on #eff6ff */
}

:root[data-theme="light"] .callout-emerald {
  background: #ecfdf5; border-color: #6ee7b7;
}
:root[data-theme="light"] .callout-emerald .callout-text { color: #047857; }

:root[data-theme="light"] .callout-yellow {
  background: #fefce8;           /* yellow-50 */
  border-color: #fde047;         /* yellow-300 */
}
:root[data-theme="light"] .callout-yellow .callout-text { color: #854d0e; } /* yellow-800: ~7:1 */

:root[data-theme="light"] .callout-red {
  background: #fef2f2; border-color: #fca5a5;
}
:root[data-theme="light"] .callout-red.callout-text,
:root[data-theme="light"] .callout-red .callout-text { color: #b91c1c; }

:root[data-theme="light"] .stat-value-red { color: #b91c1c; }

:root[data-theme="light"] .missing-row {
  background: #fef2f2; border-color: #fecaca; /* red-200 */
}

.gen-overlay { border: 1px solid rgba(16, 185, 129, 0.3); }
:root[data-theme="light"] .gen-overlay { border-color: #6ee7b7; }

:root[data-theme="light"] .ready-panel {
  background-image: linear-gradient(to bottom right, #ecfdf5, #f0fdfa); /* emerald-50 -> teal-50 */
  border-color: #6ee7b7;
}
</style>
