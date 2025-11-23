<template>
  <div class="min-h-screen bg-slate-900 text-slate-100">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          @click="$router.back()"
          class="mb-4 text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back to Course Editor
        </button>
        <h1 class="text-3xl font-bold text-emerald-400">Phase 8: Audio Generation Pipeline</h1>
        <p class="mt-2 text-slate-400">{{ courseCode }}</p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
        <p class="mt-4 text-slate-400">Loading course data...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <h2 class="text-xl font-bold text-red-400 mb-2">Error</h2>
        <p class="text-slate-300">{{ error }}</p>
      </div>

      <!-- Pipeline View -->
      <div v-else class="space-y-6">

        <!-- Job Status Banner (when running) -->
        <section v-if="jobStatus && jobStatus !== 'idle'" class="rounded-lg border p-6" :class="{
          'bg-blue-900/20 border-blue-500/50': jobStatus === 'running',
          'bg-yellow-900/20 border-yellow-500/50': jobStatus === 'qc_checkpoint',
          'bg-emerald-900/20 border-emerald-500/50': jobStatus === 'complete',
          'bg-red-900/20 border-red-500/50': jobStatus === 'failed'
        }">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div v-if="jobStatus === 'running'" class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
              <span v-else-if="jobStatus === 'qc_checkpoint'" class="text-2xl">⏸️</span>
              <span v-else-if="jobStatus === 'complete'" class="text-2xl">✅</span>
              <span v-else-if="jobStatus === 'failed'" class="text-2xl">❌</span>
              <div>
                <h3 class="font-semibold text-lg" :class="{
                  'text-blue-400': jobStatus === 'running',
                  'text-yellow-400': jobStatus === 'qc_checkpoint',
                  'text-emerald-400': jobStatus === 'complete',
                  'text-red-400': jobStatus === 'failed'
                }">
                  {{ statusLabel }}
                </h3>
                <p class="text-sm text-slate-400">{{ statusDescription }}</p>
              </div>
            </div>
            <div v-if="jobData?.startedAt" class="text-sm text-slate-500">
              Started: {{ formatTime(jobData.startedAt) }}
            </div>
          </div>
        </section>

        <!-- QC Review Section (when at checkpoint) -->
        <section v-if="jobStatus === 'qc_checkpoint' && qcReport" class="bg-slate-800/50 rounded-lg border border-yellow-500/30 p-6">
          <h2 class="text-2xl font-semibold text-yellow-400 mb-4 flex items-center gap-2">
            <span>🔍</span>
            QC Review Required
          </h2>

          <!-- QC Summary -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-slate-900/50 rounded-lg p-4 text-center border border-slate-700">
              <div class="text-3xl font-bold text-slate-100">{{ qcReport.total || 0 }}</div>
              <div class="text-sm text-slate-400">Total Samples</div>
            </div>
            <div class="bg-slate-900/50 rounded-lg p-4 text-center border border-red-500/30">
              <div class="text-3xl font-bold text-red-400">{{ qcReport.flagged?.high || 0 }}</div>
              <div class="text-sm text-slate-400">High Priority</div>
            </div>
            <div class="bg-slate-900/50 rounded-lg p-4 text-center border border-yellow-500/30">
              <div class="text-3xl font-bold text-yellow-400">{{ qcReport.flagged?.medium || 0 }}</div>
              <div class="text-sm text-slate-400">Medium Priority</div>
            </div>
            <div class="bg-slate-900/50 rounded-lg p-4 text-center border border-slate-600">
              <div class="text-3xl font-bold text-slate-400">{{ qcReport.flagged?.low || 0 }}</div>
              <div class="text-sm text-slate-400">Low Priority</div>
            </div>
          </div>

          <!-- Flagged Samples List -->
          <div v-if="qcReport.samples && qcReport.samples.length > 0" class="mb-6">
            <h3 class="text-lg font-semibold text-slate-100 mb-3">Flagged Samples</h3>
            <div class="max-h-96 overflow-y-auto space-y-2 bg-slate-900/30 rounded-lg p-4">
              <div
                v-for="sample in qcReport.samples"
                :key="sample.uuid"
                class="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600"
              >
                <input
                  type="checkbox"
                  :checked="selectedForRegeneration.includes(sample.uuid)"
                  @change="toggleRegeneration(sample.uuid)"
                  class="w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="px-2 py-0.5 rounded text-xs font-semibold" :class="{
                      'bg-red-500/20 text-red-400': sample.priority === 'high',
                      'bg-yellow-500/20 text-yellow-400': sample.priority === 'medium',
                      'bg-slate-500/20 text-slate-400': sample.priority === 'low'
                    }">{{ sample.priority }}</span>
                    <span class="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">{{ sample.role }}</span>
                    <span class="text-xs text-slate-500">{{ sample.flag }}</span>
                  </div>
                  <p class="text-sm text-slate-300 truncate">{{ sample.text }}</p>
                </div>
                <button
                  v-if="sample.audioUrl"
                  @click="playAudio(sample.audioUrl)"
                  class="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
                  title="Play sample"
                >
                  <span v-if="currentlyPlaying === sample.audioUrl">⏹️</span>
                  <span v-else>▶️</span>
                </button>
              </div>
            </div>
          </div>

          <!-- QC Actions -->
          <div class="flex flex-wrap gap-4">
            <button
              @click="approveAllAndContinue"
              :disabled="processingAction"
              class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition flex items-center gap-2"
            >
              <span v-if="processingAction">⏳</span>
              <span v-else>✅</span>
              Approve All & Continue
            </button>
            <button
              v-if="selectedForRegeneration.length > 0"
              @click="regenerateSelected"
              :disabled="processingAction"
              class="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition flex items-center gap-2"
            >
              <span v-if="processingAction">⏳</span>
              <span v-else>🔄</span>
              Regenerate {{ selectedForRegeneration.length }} Selected
            </button>
            <button
              @click="selectAllFlagged"
              class="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition"
            >
              Select All Flagged
            </button>
          </div>
        </section>

        <!-- Prerequisites Check (when idle) -->
        <section v-if="jobStatus === 'idle'" class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
          <h2 class="text-2xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <span>📋</span>
            Prerequisites
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              class="bg-slate-900/50 rounded-lg p-4 border transition"
              :class="course.phases_completed?.includes('7')
                ? 'border-emerald-500/50 shadow-emerald-500/10'
                : 'border-red-500/50'"
            >
              <div class="flex items-center gap-2 mb-2">
                <span v-if="course.phases_completed?.includes('7')" class="text-emerald-400">✓</span>
                <span v-else class="text-red-400">✗</span>
                <span class="font-semibold text-slate-100">Phase 7 Complete</span>
              </div>
              <p class="text-sm text-slate-400">Course manifest compiled</p>
            </div>
            <div class="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
              <div class="flex items-center gap-2 mb-2">
                <span>🎙️</span>
                <span class="font-semibold text-slate-100">Voice Configs</span>
              </div>
              <p class="text-sm text-slate-400">Azure TTS + ElevenLabs</p>
            </div>
            <div class="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
              <div class="flex items-center gap-2 mb-2">
                <span>☁️</span>
                <span class="font-semibold text-slate-100">S3 Access</span>
              </div>
              <p class="text-sm text-slate-400">Upload bucket ready</p>
            </div>
          </div>
        </section>

        <!-- Pipeline Summary -->
        <section class="bg-gradient-to-r from-emerald-600/10 to-teal-600/10 rounded-lg border border-emerald-500/30 p-6">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <span>📊</span>
            Total Pipeline Output
          </h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-slate-900/70 rounded-lg p-4 text-center border border-slate-700">
              <div class="text-3xl font-bold text-teal-400 mb-1">{{ phaseASamples }}</div>
              <div class="text-sm text-slate-400">Phase A Samples</div>
            </div>
            <div class="bg-slate-900/70 rounded-lg p-4 text-center border border-slate-700">
              <div class="text-3xl font-bold text-blue-400 mb-1">{{ phaseBSamples }}</div>
              <div class="text-sm text-slate-400">Phase B Samples</div>
            </div>
            <div class="bg-slate-900/70 rounded-lg p-4 text-center border border-slate-700">
              <div class="text-3xl font-bold text-slate-400 mb-1">77</div>
              <div class="text-sm text-slate-400">System Samples</div>
            </div>
            <div class="bg-slate-900/70 rounded-lg p-4 text-center border border-emerald-700 shadow-emerald-500/10">
              <div class="text-3xl font-bold text-emerald-400 mb-1">{{ totalSamples }}</div>
              <div class="text-sm text-slate-400">Total Files</div>
            </div>
          </div>
        </section>

        <!-- Action Buttons (when idle) -->
        <div v-if="jobStatus === 'idle'" class="flex gap-4 justify-center pt-4">
          <button
            @click="$router.back()"
            class="px-6 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg font-semibold transition-all text-slate-100"
          >
            Cancel
          </button>
          <button
            @click="startGeneration"
            :disabled="!course.phases_completed?.includes('7') || generating"
            class="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed disabled:border-slate-700 border border-emerald-500/50 rounded-lg font-semibold transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center gap-2 text-white"
          >
            <span v-if="generating">⏳</span>
            <span v-else>🚀</span>
            {{ generating ? 'Starting...' : 'Start Audio Generation' }}
          </button>
        </div>

      </div>
    </main>

    <!-- Hidden audio element -->
    <audio ref="audioPlayer" @ended="currentlyPlaying = null"></audio>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '../services/api.js'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const courseCode = computed(() => route.params.courseCode)
const course = ref({})
const loading = ref(true)
const error = ref(null)
const generating = ref(false)

// Job tracking
const jobStatus = ref('idle') // 'idle', 'running', 'qc_checkpoint', 'complete', 'failed'
const jobData = ref(null)
const qcReport = ref(null)
const selectedForRegeneration = ref([])
const processingAction = ref(false)

// Audio playback
const audioPlayer = ref(null)
const currentlyPlaying = ref(null)

// Polling
let pollInterval = null

// Calculate sample counts
const phaseASamples = computed(() => (course.value.actual_seed_count || 0) * 3)
const phaseBSamples = computed(() => (course.value.lego_count || 0) * 3)
const totalSamples = computed(() => phaseASamples.value + phaseBSamples.value + 77)

// Status labels
const statusLabel = computed(() => {
  switch (jobStatus.value) {
    case 'running': return 'Audio Generation In Progress'
    case 'qc_checkpoint': return 'QC Review Required'
    case 'complete': return 'Audio Generation Complete'
    case 'failed': return 'Audio Generation Failed'
    default: return ''
  }
})

const statusDescription = computed(() => {
  switch (jobStatus.value) {
    case 'running': return 'Generating audio samples with Azure TTS and ElevenLabs...'
    case 'qc_checkpoint': return 'Please review flagged samples before continuing'
    case 'complete': return 'All audio files generated and uploaded to S3'
    case 'failed': return jobData.value?.error || 'An error occurred during generation'
    default: return ''
  }
})

async function loadCourse() {
  try {
    loading.value = true
    error.value = null
    const response = await api.course.get(courseCode.value)
    course.value = response.course

    // Check for existing job
    await checkJobStatus()
  } catch (err) {
    console.error('Failed to load course:', err)
    error.value = 'Failed to load course data. Please try again.'
  } finally {
    loading.value = false
  }
}

async function checkJobStatus() {
  try {
    const response = await api.getPhase8Status(courseCode.value)
    if (response.success && response.job) {
      jobData.value = response.job
      jobStatus.value = response.job.status

      // If at QC checkpoint, load the report
      if (response.job.status === 'qc_checkpoint' || response.job.status === 'running') {
        await loadQCReport()
      }

      // Start polling if running
      if (response.job.status === 'running') {
        startPolling()
      }
    }
  } catch (err) {
    // No job found - that's okay
    if (err.response?.status !== 404) {
      console.error('Failed to check job status:', err)
    }
  }
}

async function loadQCReport() {
  try {
    const response = await api.getPhase8QCReport(courseCode.value)
    if (response.success) {
      qcReport.value = response.report
    }
  } catch (err) {
    // QC report might not exist yet
    console.log('QC report not available yet')
  }
}

async function startGeneration() {
  if (!course.value.phases_completed?.includes('7')) {
    toast.error('Phase 7 must be complete before generating audio')
    return
  }

  generating.value = true
  try {
    await api.startPhase8Audio(courseCode.value)
    toast.success('🎵 Audio generation started!')
    jobStatus.value = 'running'
    startPolling()
  } catch (err) {
    console.error('Failed to start audio generation:', err)
    if (err.response?.status === 404 || err.response?.status === 503) {
      toast.error('❌ Phase 8 server is not available. Start it with: node services/phases/phase8-audio-server.cjs')
    } else if (err.response?.status === 409) {
      toast.error('⚠️ Audio generation already in progress.')
      await checkJobStatus()
    } else {
      toast.error('❌ Failed to start audio generation')
    }
  } finally {
    generating.value = false
  }
}

function startPolling() {
  if (pollInterval) return

  pollInterval = setInterval(async () => {
    try {
      const response = await api.getPhase8Status(courseCode.value)
      if (response.success && response.job) {
        jobData.value = response.job
        jobStatus.value = response.job.status

        // Load QC report if at checkpoint
        if (response.job.status === 'qc_checkpoint') {
          await loadQCReport()
          stopPolling()
        } else if (response.job.status === 'complete' || response.job.status === 'failed') {
          stopPolling()
          if (response.job.status === 'complete') {
            toast.success('✅ Audio generation complete!')
          }
        }
      }
    } catch (err) {
      console.error('Polling error:', err)
    }
  }, 5000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

function toggleRegeneration(uuid) {
  const idx = selectedForRegeneration.value.indexOf(uuid)
  if (idx >= 0) {
    selectedForRegeneration.value.splice(idx, 1)
  } else {
    selectedForRegeneration.value.push(uuid)
  }
}

function selectAllFlagged() {
  if (qcReport.value?.samples) {
    selectedForRegeneration.value = qcReport.value.samples.map(s => s.uuid)
  }
}

async function approveAllAndContinue() {
  processingAction.value = true
  try {
    await api.continuePhase8Processing(courseCode.value)
    toast.success('✅ Continuing processing...')
    jobStatus.value = 'running'
    qcReport.value = null
    selectedForRegeneration.value = []
    startPolling()
  } catch (err) {
    console.error('Failed to continue processing:', err)
    toast.error('❌ Failed to continue processing')
  } finally {
    processingAction.value = false
  }
}

async function regenerateSelected() {
  if (selectedForRegeneration.value.length === 0) return

  processingAction.value = true
  try {
    await api.regeneratePhase8Samples(courseCode.value, selectedForRegeneration.value)
    toast.success(`🔄 Regenerating ${selectedForRegeneration.value.length} samples...`)
    selectedForRegeneration.value = []
    jobStatus.value = 'running'
    startPolling()
  } catch (err) {
    console.error('Failed to regenerate samples:', err)
    toast.error('❌ Failed to regenerate samples')
  } finally {
    processingAction.value = false
  }
}

function playAudio(url) {
  if (currentlyPlaying.value === url) {
    audioPlayer.value?.pause()
    currentlyPlaying.value = null
  } else {
    if (audioPlayer.value) {
      audioPlayer.value.src = url
      audioPlayer.value.play()
      currentlyPlaying.value = url
    }
  }
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString()
}

onMounted(() => {
  loadCourse()
})

onUnmounted(() => {
  stopPolling()
})
</script>
