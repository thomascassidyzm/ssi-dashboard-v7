<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <button
          @click="$router.back()"
          class="mb-4 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
        >
          ← Back to Course Editor
        </button>
        <h1 class="text-4xl font-bold mb-2">Phase 8: Audio Generation Pipeline</h1>
        <p class="text-slate-300">{{ courseCode }}</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <p class="mt-4">Loading course data...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/50 border border-red-500 rounded-lg p-6">
        <h2 class="text-xl font-bold mb-2">Error</h2>
        <p>{{ error }}</p>
      </div>

      <!-- Pipeline View -->
      <div v-else class="space-y-6">
        <!-- Prerequisites Check -->
        <div class="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>📋</span>
            Prerequisites
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              class="p-4 rounded-lg border"
              :class="course.phases_completed?.includes('7') ? 'bg-emerald-900/20 border-emerald-500' : 'bg-red-900/20 border-red-500'"
            >
              <div class="flex items-center gap-2 mb-2">
                <span v-if="course.phases_completed?.includes('7')">✓</span>
                <span v-else>✗</span>
                <span class="font-semibold">Phase 7 Complete</span>
              </div>
              <p class="text-sm text-slate-400">Course manifest compiled</p>
            </div>
            <div class="p-4 rounded-lg border bg-slate-900/20 border-slate-500">
              <div class="flex items-center gap-2 mb-2">
                <span>🎙️</span>
                <span class="font-semibold">Voice Configs</span>
              </div>
              <p class="text-sm text-slate-400">Azure TTS + ElevenLabs</p>
            </div>
            <div class="p-4 rounded-lg border bg-slate-900/20 border-slate-500">
              <div class="flex items-center gap-2 mb-2">
                <span>☁️</span>
                <span class="font-semibold">S3 Access</span>
              </div>
              <p class="text-sm text-slate-400">Upload bucket ready</p>
            </div>
          </div>
        </div>

        <!-- Pipeline Stages -->
        <div class="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
            <span>🔄</span>
            Audio Generation Pipeline
          </h2>

          <div class="space-y-4">
            <!-- Stage 1: Pre-flight -->
            <div class="bg-slate-900/50 rounded-lg p-6 border border-slate-600">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-xl font-bold">
                  1
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold mb-2">Pre-flight Checks</h3>
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
            <div class="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-6 border border-purple-500">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-xl font-bold">
                  2
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold mb-2">Phase A: Core Vocabulary</h3>
                  <p class="text-slate-300 mb-3">Generate target language audio for all seeds</p>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div class="bg-black/30 rounded p-3">
                      <div class="text-sm text-slate-400 mb-1">Target Voice 1</div>
                      <div class="text-2xl font-bold">{{ course.actual_seed_count || 0 }}</div>
                      <div class="text-xs text-slate-500">samples</div>
                    </div>
                    <div class="bg-black/30 rounded p-3">
                      <div class="text-sm text-slate-400 mb-1">Target Voice 2</div>
                      <div class="text-2xl font-bold">{{ course.actual_seed_count || 0 }}</div>
                      <div class="text-xs text-slate-500">samples</div>
                    </div>
                    <div class="bg-black/30 rounded p-3">
                      <div class="text-sm text-slate-400 mb-1">Source</div>
                      <div class="text-2xl font-bold">{{ course.actual_seed_count || 0 }}</div>
                      <div class="text-xs text-slate-500">samples</div>
                    </div>
                  </div>
                  <div class="bg-yellow-900/30 border border-yellow-500/50 rounded p-3 text-sm">
                    <strong>⏸️ QC Checkpoint:</strong> Manual review required before continuing
                  </div>
                </div>
              </div>
            </div>

            <!-- Stage 3: Phase B - Presentations -->
            <div class="bg-gradient-to-r from-blue-900/50 to-teal-900/50 rounded-lg p-6 border border-blue-500">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-xl font-bold">
                  3
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold mb-2">Phase B: Presentations</h3>
                  <p class="text-slate-300 mb-3">Generate 3 presentation variants per LEGO</p>
                  <div class="bg-black/30 rounded p-4 mb-3">
                    <div class="text-sm text-slate-400 mb-1">Presentation Samples</div>
                    <div class="text-3xl font-bold">{{ (course.lego_count || 0) * 3 }}</div>
                    <div class="text-xs text-slate-500">{{ course.lego_count || 0 }} LEGOs × 3 variants</div>
                  </div>
                  <div class="bg-yellow-900/30 border border-yellow-500/50 rounded p-3 text-sm">
                    <strong>⏸️ QC Checkpoint:</strong> Manual review required before upload
                  </div>
                </div>
              </div>
            </div>

            <!-- Stage 4: Encouragements + Welcomes -->
            <div class="bg-slate-900/50 rounded-lg p-6 border border-slate-600">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-xl font-bold">
                  4
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold mb-2">Encouragements + Welcomes</h3>
                  <p class="text-slate-300 mb-3">Generate course intro and encouragement audio</p>
                  <div class="bg-black/30 rounded p-4">
                    <div class="text-sm text-slate-400 mb-1">System Audio</div>
                    <div class="text-3xl font-bold">77</div>
                    <div class="text-xs text-slate-500">welcome + encouragement samples</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Stage 5: Upload + MAR -->
            <div class="bg-slate-900/50 rounded-lg p-6 border border-slate-600">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-xl font-bold">
                  5
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold mb-2">S3 Upload + MAR Update</h3>
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
        </div>

        <!-- Summary Stats -->
        <div class="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-6 border border-purple-500">
          <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>📊</span>
            Total Pipeline Output
          </h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-black/40 rounded-lg p-4 text-center">
              <div class="text-3xl font-bold mb-1">{{ phaseASamples }}</div>
              <div class="text-sm text-slate-400">Phase A Samples</div>
            </div>
            <div class="bg-black/40 rounded-lg p-4 text-center">
              <div class="text-3xl font-bold mb-1">{{ phaseBSamples }}</div>
              <div class="text-sm text-slate-400">Phase B Samples</div>
            </div>
            <div class="bg-black/40 rounded-lg p-4 text-center">
              <div class="text-3xl font-bold mb-1">77</div>
              <div class="text-sm text-slate-400">System Samples</div>
            </div>
            <div class="bg-black/40 rounded-lg p-4 text-center">
              <div class="text-3xl font-bold mb-1">{{ totalSamples }}</div>
              <div class="text-sm text-slate-400">Total Files</div>
            </div>
          </div>
        </div>

        <!-- Warnings -->
        <div class="bg-yellow-900/30 border border-yellow-500 rounded-lg p-6">
          <h2 class="text-xl font-bold mb-3 flex items-center gap-2">
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
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-4 justify-center">
          <button
            @click="$router.back()"
            class="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            @click="startGeneration"
            :disabled="!course.phases_completed?.includes('7') || generating"
            class="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <span v-if="generating">⏳</span>
            <span v-else>🚀</span>
            {{ generating ? 'Starting...' : 'Start Audio Generation' }}
          </button>
        </div>
      </div>
    </div>
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
    course.value = await api.get(courseCode.value)
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
