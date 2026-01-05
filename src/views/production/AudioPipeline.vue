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
          Back to Dashboard
        </button>
        <h1 class="text-3xl font-bold text-emerald-400">Audio Pipeline</h1>
        <p class="mt-2 text-slate-400">{{ courseCode }}</p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
        <p class="mt-4 text-slate-400">Loading pipeline data...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <h2 class="text-xl font-bold text-red-400 mb-2">Error</h2>
        <p class="text-slate-300">{{ error }}</p>
      </div>

      <!-- Pipeline View -->
      <div v-else class="space-y-6">
        <!-- Voice Configuration (Collapsible) -->
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
          <button
            @click="showVoiceConfig = !showVoiceConfig"
            class="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
          >
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              </svg>
              <span class="text-lg font-semibold text-slate-100">Voice Configuration</span>
              <span v-if="voicesConfigured" class="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">
                Configured
              </span>
              <span v-else class="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                Setup Required
              </span>
            </div>
            <svg
              class="w-5 h-5 text-slate-400 transition-transform"
              :class="{ 'rotate-180': showVoiceConfig }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          <div v-show="showVoiceConfig" class="border-t border-slate-700">
            <VoiceConfiguration
              :course-code="courseCode"
              @config-saved="onVoiceConfigSaved"
              @config-loaded="onVoiceConfigLoaded"
            />
          </div>
        </div>

        <!-- Regenerate by Role -->
        <div class="bg-slate-800/50 border border-amber-500/30 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-amber-400 mb-2">Regenerate Audio by Role</h2>
          <p class="text-sm text-slate-400 mb-4">
            Replace audio for a role using the configured voice.
          </p>

          <div class="flex items-center gap-4 mb-4">
            <!-- Role Selector -->
            <select
              v-model="regenerateRole"
              class="flex-1 bg-slate-700 text-slate-100 p-3 rounded border border-slate-600 focus:border-amber-500 focus:outline-none"
            >
              <option value="">Select role...</option>
              <option value="target1">Target 1</option>
              <option value="target2">Target 2</option>
              <option value="known">Known</option>
              <option value="presentation">Presentation</option>
            </select>

            <!-- Flagged Only Toggle -->
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                v-model="flaggedOnly"
                class="w-4 h-4 rounded bg-slate-700 border-slate-600 text-amber-500 focus:ring-amber-500"
              />
              <span class="text-sm text-slate-300">Flagged only</span>
            </label>
          </div>

          <div class="flex items-center gap-4">
            <!-- Preview -->
            <button
              @click="previewRegenerate"
              :disabled="!regenerateRole || regenerating"
              class="px-4 py-3 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded transition-colors"
            >
              Preview
            </button>

            <!-- Regenerate -->
            <button
              @click="executeRegenerate"
              :disabled="!regenerateRole || regenerating || !voicesConfigured"
              class="px-4 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded transition-colors font-medium"
            >
              {{ regenerating ? 'Working...' : flaggedOnly ? 'Regenerate Flagged' : 'Regenerate All' }}
            </button>
          </div>

          <!-- Preview Result -->
          <div v-if="regenerateResult" class="mt-4 p-4 bg-slate-900/50 rounded-lg">
            <div class="flex justify-between items-start">
              <div>
                <div class="text-amber-400 font-medium mb-1">
                  {{ regenerateResult.dryRun ? 'Preview' : 'Complete' }}
                  <span v-if="regenerateResult.flaggedOnly" class="text-xs ml-2 text-red-400">(flagged only)</span>
                </div>
                <div v-if="regenerateResult.voiceId" class="text-sm text-slate-300">
                  Voice: <span class="text-emerald-400 font-mono">{{ regenerateResult.voiceId }}</span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-slate-100">{{ regenerateResult.count || regenerateResult.total || 0 }}</div>
                <div class="text-xs text-slate-400">items</div>
              </div>
            </div>
            <div v-if="regenerateResult.error" class="mt-2 text-red-400 text-sm">
              {{ regenerateResult.error }}
            </div>
            <div v-if="regenerateResult.status === 'completed'" class="mt-2 text-emerald-400 text-sm">
              ✓ {{ regenerateResult.success }} generated, {{ regenerateResult.failed }} failed
            </div>
          </div>
        </div>

        <!-- Generate Presentation Text -->
        <div class="bg-slate-800/50 border border-purple-500/30 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-purple-400 mb-2">Generate Presentation Text</h2>
          <p class="text-sm text-slate-400 mb-4">
            Generate presentation text for all LEGOs (ends with "is:" - target words played separately by the app).
          </p>

          <div class="flex items-center gap-4">
            <button
              @click="previewPresentations"
              :disabled="regeneratingPresentations"
              class="px-4 py-3 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded transition-colors"
            >
              Preview
            </button>

            <button
              @click="executePresentations"
              :disabled="regeneratingPresentations"
              class="px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded transition-colors font-medium"
            >
              {{ regeneratingPresentations ? 'Working...' : 'Update Presentation Text' }}
            </button>
          </div>

          <div v-if="presentationsResult" class="mt-4 p-4 bg-slate-900/50 rounded-lg">
            <div class="flex justify-between items-start">
              <div>
                <div class="text-purple-400 font-medium mb-1">
                  {{ presentationsResult.dryRun ? 'Preview' : 'Complete' }}
                </div>
                <div v-if="presentationsResult.template" class="text-sm text-slate-300">
                  Template: <span class="text-emerald-400 font-mono text-xs">{{ presentationsResult.template }}</span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-slate-100">{{ presentationsResult.count || presentationsResult.total || 0 }}</div>
                <div class="text-xs text-slate-400">LEGOs</div>
              </div>
            </div>
            <div v-if="presentationsResult.sample" class="mt-3 space-y-2">
              <div class="text-xs text-slate-400">Sample:</div>
              <div v-for="(s, i) in presentationsResult.sample.slice(0, 3)" :key="i" class="text-xs bg-slate-800 p-2 rounded">
                <span class="text-amber-400">{{ s.known }}</span> → {{ s.presentation_text }}
              </div>
            </div>
            <div v-if="presentationsResult.error" class="mt-2 text-red-400 text-sm">
              {{ presentationsResult.error }}
            </div>
            <div v-if="presentationsResult.updated" class="mt-2 text-emerald-400 text-sm">
              ✓ {{ presentationsResult.updated }} updated. Run "Regenerate All" with role=presentation to generate audio.
            </div>
          </div>
        </div>

        <!-- Progress Dashboard -->
        <PipelineProgress
          :total="progressStats.total"
          :generated="progressStats.generated"
          :pending="progressStats.pending"
          :failed="progressStats.failed"
          :estimated-cost="estimatedCost"
          :estimated-time="estimatedTime"
        />

        <!-- Missing Audio Details -->
        <MissingAudio :course-code="courseCode" />

        <!-- Queue Controls -->
        <QueueControls
          :can-start="canStartGeneration"
          :is-running="isGenerating"
          :has-failed="hasFailed"
          @start="startGeneration"
          @cancel="cancelGeneration"
          @retry="retryFailed"
          @plan="showPlan"
        />

        <!-- Queue List -->
        <QueueList
          :items="generationQueue"
          :status-filter="statusFilter"
          @update-filter="updateFilter"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProductionStore } from '@/stores/production'
import PipelineProgress from './components/PipelineProgress.vue'
import QueueControls from './components/QueueControls.vue'
import QueueList from './components/QueueList.vue'
import MissingAudio from './components/MissingAudio.vue'
import VoiceConfiguration from '@/components/VoiceConfiguration.vue'

const route = useRoute()
const productionStore = useProductionStore()

const courseCode = computed(() => route.params.courseCode as string)
const loading = ref(true)
const error = ref<string | null>(null)
const statusFilter = ref<string>('all')

// Voice configuration state
const showVoiceConfig = ref(false)
const voicesConfigured = ref(false)
const voiceConfig = ref<any>(null)

// Regenerate by role state
const regenerateRole = ref('')
const regenerating = ref(false)
const regenerateResult = ref<any>(null)
const flaggedOnly = ref(false)

// Regenerate presentations state
const regeneratingPresentations = ref(false)
const presentationsResult = ref<any>(null)

// API Base URL - use localStorage (set by EnvironmentSwitcher)
const apiBaseUrl = localStorage.getItem('api_base_url') || 'http://localhost:3456'

// Load data on mount
onMounted(async () => {
  try {
    loading.value = true
    error.value = null
    await productionStore.loadCourse(courseCode.value)
    await productionStore.connectWebSocket(courseCode.value)
  } catch (err) {
    console.error('Failed to load pipeline:', err)
    error.value = 'Failed to load pipeline data. Please try again.'
  } finally {
    loading.value = false
  }
})

// Cleanup on unmount
onUnmounted(() => {
  productionStore.disconnectWebSocket()
})

// Computed properties
const progressStats = computed(() => productionStore.pipelineStats)
const generationQueue = computed(() => productionStore.generationQueue)
const isGenerating = computed(() => productionStore.jobStatus === 'running')
const hasFailed = computed(() => progressStats.value.failed > 0)
const canStartGeneration = computed(() =>
  !isGenerating.value && progressStats.value.pending > 0
)
const estimatedCost = computed(() => productionStore.costEstimate.estimated)
const estimatedTime = computed(() => productionStore.costEstimate.estimatedTime)

// Actions
const startGeneration = async () => {
  await productionStore.startGeneration(courseCode.value)
}

const cancelGeneration = async () => {
  await productionStore.cancelGeneration(courseCode.value)
}

const retryFailed = async () => {
  await productionStore.retryFailed(courseCode.value)
}

const showPlan = async () => {
  await productionStore.generatePlan(courseCode.value)
}

// Voice configuration handlers
const onVoiceConfigLoaded = (config: any) => {
  voiceConfig.value = config
  // Check if all required voices are configured
  const voices = config?.voices || {}
  voicesConfigured.value = !!(
    voices.target1?.voiceId &&
    voices.target2?.voiceId &&
    voices.known?.voiceId
  )
  // Auto-expand if not configured
  if (!voicesConfigured.value) {
    showVoiceConfig.value = true
  }
}

const onVoiceConfigSaved = (config: any) => {
  voiceConfig.value = config
  const voices = config?.voices || {}
  voicesConfigured.value = !!(
    voices.target1?.voiceId &&
    voices.target2?.voiceId &&
    voices.known?.voiceId
  )
}

const updateFilter = (filter: string) => {
  statusFilter.value = filter
}

// Regenerate by role functions
const previewRegenerate = async () => {
  if (!regenerateRole.value) return

  regenerating.value = true
  regenerateResult.value = null

  try {
    const response = await fetch(`${apiBaseUrl}/api/audio/regenerate-role/${courseCode.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        role: regenerateRole.value,
        dryRun: true,
        flaggedOnly: flaggedOnly.value,
        limit: 1000
      })
    })

    const data = await response.json()
    if (!response.ok) {
      regenerateResult.value = { error: data.error || 'Preview failed' }
    } else {
      regenerateResult.value = {
        dryRun: true,
        flaggedOnly: flaggedOnly.value,
        count: data.count,
        voiceId: data.voiceId,
        language: data.language,
        sample: data.sample
      }
    }
  } catch (err: any) {
    regenerateResult.value = { error: err.message }
  } finally {
    regenerating.value = false
  }
}

const executeRegenerate = async () => {
  if (!regenerateRole.value || !voicesConfigured.value) return

  const scope = flaggedOnly.value ? 'flagged' : 'all'
  const confirmed = confirm(
    `This will regenerate ${scope} ${regenerateRole.value} audio for ${courseCode.value}.\n\n` +
    `Existing audio files will be replaced.\n\n` +
    `Continue?`
  )
  if (!confirmed) return

  regenerating.value = true
  regenerateResult.value = null

  try {
    const response = await fetch(`${apiBaseUrl}/api/audio/regenerate-role/${courseCode.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        role: regenerateRole.value,
        dryRun: false,
        flaggedOnly: flaggedOnly.value,
        limit: 1000
      })
    })

    const data = await response.json()
    if (!response.ok) {
      regenerateResult.value = { error: data.error || 'Regeneration failed' }
    } else {
      regenerateResult.value = {
        dryRun: false,
        flaggedOnly: flaggedOnly.value,
        status: 'completed',
        total: data.total,
        success: data.success,
        failed: data.failed,
        voiceId: data.voiceId,
        language: data.language
      }
      // Reload pipeline stats
      await productionStore.loadCourse(courseCode.value)
    }
  } catch (err: any) {
    regenerateResult.value = { error: err.message }
  } finally {
    regenerating.value = false
  }
}

// Presentation text regeneration functions
const previewPresentations = async () => {
  regeneratingPresentations.value = true
  presentationsResult.value = null

  try {
    const response = await fetch(`${apiBaseUrl}/api/audio/regenerate-presentations/${courseCode.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        dryRun: true
      })
    })

    const data = await response.json()
    if (!response.ok) {
      presentationsResult.value = { error: data.error || 'Preview failed' }
    } else {
      presentationsResult.value = data
    }
  } catch (err: any) {
    presentationsResult.value = { error: err.message }
  } finally {
    regeneratingPresentations.value = false
  }
}

const executePresentations = async () => {
  const confirmed = confirm(
    `This will update presentation text for all LEGOs in ${courseCode.value}.\n\n` +
    `Existing presentation audio will need to be regenerated.\n\n` +
    `Continue?`
  )
  if (!confirmed) return

  regeneratingPresentations.value = true
  presentationsResult.value = null

  try {
    const response = await fetch(`${apiBaseUrl}/api/audio/regenerate-presentations/${courseCode.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        dryRun: false
      })
    })

    const data = await response.json()
    if (!response.ok) {
      presentationsResult.value = { error: data.error || 'Update failed' }
    } else {
      presentationsResult.value = data
    }
  } catch (err: any) {
    presentationsResult.value = { error: err.message }
  } finally {
    regeneratingPresentations.value = false
  }
}
</script>
