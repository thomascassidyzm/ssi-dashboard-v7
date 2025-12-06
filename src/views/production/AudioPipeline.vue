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
        <!-- Progress Dashboard -->
        <PipelineProgress
          :total="progressStats.total"
          :generated="progressStats.generated"
          :pending="progressStats.pending"
          :failed="progressStats.failed"
          :estimated-cost="estimatedCost"
          :estimated-time="estimatedTime"
        />

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

const route = useRoute()
const productionStore = useProductionStore()

const courseCode = computed(() => route.params.courseCode as string)
const loading = ref(true)
const error = ref<string | null>(null)
const statusFilter = ref<string>('all')

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

const updateFilter = (filter: string) => {
  statusFilter.value = filter
}
</script>
