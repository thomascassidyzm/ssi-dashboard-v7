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

        <!-- Prerequisites Check -->
        <section class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
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

        <!-- Pipeline Stages -->
        <section class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
          <h2 class="text-2xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
            <span>🔄</span>
            Audio Generation Pipeline
          </h2>

          <div class="space-y-4">

            <!-- Stage 1: Pre-flight -->
            <div class="bg-slate-900/50 rounded-lg p-6 border border-slate-600 hover:border-slate-500 transition">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center text-xl font-bold text-slate-100 shadow-lg">
                  1
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-slate-100 mb-2">Pre-flight Checks</h3>
                  <p class="text-slate-300 mb-3">Validate environment and configurations</p>
                  <ul class="text-sm text-slate-400 space-y-1 ml-4">
                    <li>• Voice configurations loaded</li>
                    <li>• API keys validated (Azure + ElevenLabs)</li>
                    <li>• S3 bucket access confirmed</li>
                    <li>• Course manifest readable</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Stage 2: Phase A - Core Vocabulary -->
            <div class="bg-slate-900/50 rounded-lg p-6 border border-teal-500/30 hover:border-teal-500/50 transition shadow-teal-500/5">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-teal-500/20">
                  2
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-teal-400 mb-2">Phase A: Core Vocabulary</h3>
                  <p class="text-slate-300 mb-3">Generate target language audio for all seeds</p>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div class="bg-slate-800/70 rounded p-3 border border-slate-700">
                      <div class="text-sm text-slate-400 mb-1">Target Voice 1</div>
                      <div class="text-2xl font-bold text-slate-100">{{ course.actual_seed_count || 0 }}</div>
                      <div class="text-xs text-slate-500">samples</div>
                    </div>
                    <div class="bg-slate-800/70 rounded p-3 border border-slate-700">
                      <div class="text-sm text-slate-400 mb-1">Target Voice 2</div>
                      <div class="text-2xl font-bold text-slate-100">{{ course.actual_seed_count || 0 }}</div>
                      <div class="text-xs text-slate-500">samples</div>
                    </div>
                    <div class="bg-slate-800/70 rounded p-3 border border-slate-700">
                      <div class="text-sm text-slate-400 mb-1">Source</div>
                      <div class="text-2xl font-bold text-slate-100">{{ course.actual_seed_count || 0 }}</div>
                      <div class="text-xs text-slate-500">samples</div>
                    </div>
                  </div>
                  <div class="bg-yellow-900/20 border border-yellow-500/30 rounded p-3 text-sm text-yellow-200/90">
                    <strong>⏸️ QC Checkpoint:</strong> Manual review required before continuing
                  </div>
                </div>
              </div>
            </div>

            <!-- Stage 3: Phase B - Presentations -->
            <div class="bg-slate-900/50 rounded-lg p-6 border border-blue-500/30 hover:border-blue-500/50 transition shadow-blue-500/5">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-blue-500/20">
                  3
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-blue-400 mb-2">Phase B: Presentations</h3>
                  <p class="text-slate-300 mb-3">Generate 3 presentation variants per LEGO</p>
                  <div class="bg-slate-800/70 rounded p-4 mb-3 border border-slate-700">
                    <div class="text-sm text-slate-400 mb-1">Presentation Samples</div>
                    <div class="text-3xl font-bold text-slate-100">{{ (course.lego_count || 0) * 3 }}</div>
                    <div class="text-xs text-slate-500">{{ course.lego_count || 0 }} LEGOs × 3 variants</div>
                  </div>
                  <div class="bg-yellow-900/20 border border-yellow-500/30 rounded p-3 text-sm text-yellow-200/90">
                    <strong>⏸️ QC Checkpoint:</strong> Manual review required before upload
                  </div>
                </div>
              </div>
            </div>

            <!-- Stage 4: Encouragements + Welcomes -->
            <div class="bg-slate-900/50 rounded-lg p-6 border border-slate-600 hover:border-slate-500 transition">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center text-xl font-bold text-slate-100 shadow-lg">
                  4
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-slate-100 mb-2">Encouragements + Welcomes</h3>
                  <p class="text-slate-300 mb-3">Generate course intro and encouragement audio</p>
                  <div class="bg-slate-800/70 rounded p-4 border border-slate-700">
                    <div class="text-sm text-slate-400 mb-1">System Audio</div>
                    <div class="text-3xl font-bold text-slate-100">77</div>
                    <div class="text-xs text-slate-500">welcome + encouragement samples</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Stage 5: Upload + MAR -->
            <div class="bg-slate-900/50 rounded-lg p-6 border border-emerald-500/30 hover:border-emerald-500/50 transition shadow-emerald-500/5">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-emerald-500/20">
                  5
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-emerald-400 mb-2">S3 Upload + MAR Update</h3>
                  <p class="text-slate-300 mb-3">Upload audio files and update Master Audio Registry</p>
                  <ul class="text-sm text-slate-400 space-y-1 ml-4">
                    <li>• Upload all generated audio to S3</li>
                    <li>• Update MAR with file metadata</li>
                    <li>• Populate duration fields in manifest</li>
                    <li>• Generate CDN URLs</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Summary Stats -->
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

        <!-- Warnings -->
        <section class="bg-yellow-900/10 border border-yellow-500/30 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-yellow-300 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            Important Notes
          </h2>
          <ul class="space-y-2 text-sm text-slate-300">
            <li>• This process uses Azure TTS and ElevenLabs APIs (costs apply)</li>
            <li>• QC checkpoints require manual review before continuing</li>
            <li>• Voice configurations must be set up correctly</li>
            <li>• Estimated time: 2-4 hours for full course</li>
            <li>• Process can be resumed if interrupted</li>
          </ul>
        </section>

        <!-- Action Buttons -->
        <div class="flex gap-4 justify-center pt-4">
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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

// Calculate sample counts
const phaseASamples = computed(() => (course.value.actual_seed_count || 0) * 3)
const phaseBSamples = computed(() => (course.value.lego_count || 0) * 3)
const totalSamples = computed(() => phaseASamples.value + phaseBSamples.value + 77)

async function loadCourse() {
  try {
    loading.value = true
    error.value = null
    const response = await api.course.get(courseCode.value)
    course.value = response.course
  } catch (err) {
    console.error('Failed to load course:', err)
    error.value = 'Failed to load course data. Please try again.'
  } finally {
    loading.value = false
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
    toast.success('🎵 Audio generation started! Check progress in Course Progress page.')
    // Navigate to progress page
    router.push({ name: 'CourseProgress', params: { code: courseCode.value } })
  } catch (err) {
    console.error('Failed to start audio generation:', err)
    if (err.response?.status === 404) {
      toast.error('❌ Phase 8 server is not available.')
    } else if (err.response?.status === 409) {
      toast.error('⚠️ Audio generation already in progress for this course.')
    } else if (err.message?.includes('Network Error')) {
      toast.error('❌ Cannot reach Phase 8 server.')
    } else {
      toast.error('❌ Failed to start audio generation')
    }
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  loadCourse()
})
</script>
