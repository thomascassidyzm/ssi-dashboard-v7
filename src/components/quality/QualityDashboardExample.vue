<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Navigation Tabs -->
    <div class="bg-slate-800 border-b border-slate-700">
      <div class="max-w-7xl mx-auto px-8">
        <div class="flex gap-1">
          <button
            v-for="view in views"
            :key="view.id"
            @click="currentView = view.id"
            class="px-6 py-4 text-sm font-medium transition-colors relative"
            :class="currentView === view.id
              ? 'text-emerald-400'
              : 'text-slate-400 hover:text-slate-300'"
          >
            {{ view.label }}
            <div
              v-if="currentView === view.id"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400"
            ></div>
          </button>
        </div>
      </div>
    </div>

    <!-- View Content -->
    <div>
      <!-- Main Dashboard -->
      <QualityDashboard
        v-if="currentView === 'dashboard'"
        :courseCode="courseCode"
      />

      <!-- Detailed SEED Review -->
      <SeedQualityReview
        v-else-if="currentView === 'seed-detail'"
        :courseCode="courseCode"
        :seedId="selectedSeedId"
      />

      <!-- Prompt Evolution -->
      <PromptEvolutionView
        v-else-if="currentView === 'evolution'"
        :courseCode="courseCode"
      />

      <!-- Health Report -->
      <CourseHealthReport
        v-else-if="currentView === 'health'"
        :courseCode="courseCode"
      />
    </div>

    <!-- Help Modal -->
    <div
      v-if="showHelp"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      @click="showHelp = false"
    >
      <div class="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="p-6 border-b border-slate-700">
          <h2 class="text-2xl font-bold text-emerald-400">Quality Review Dashboard Guide</h2>
        </div>

        <div class="p-6 space-y-6">
          <!-- Dashboard View -->
          <div>
            <h3 class="text-lg font-semibold text-emerald-400 mb-3">Dashboard View</h3>
            <ul class="list-disc list-inside space-y-2 text-sm text-slate-300">
              <li>View quality overview for all {{ totalSeeds }} SEEDs</li>
              <li>Filter by quality score, status, or concerns</li>
              <li>Use quick actions to accept or re-run SEEDs</li>
              <li>Select multiple SEEDs for bulk operations</li>
              <li>Export reports as CSV or PDF</li>
            </ul>
          </div>

          <!-- Detailed Review -->
          <div>
            <h3 class="text-lg font-semibold text-emerald-400 mb-3">Detailed Review</h3>
            <ul class="list-disc list-inside space-y-2 text-sm text-slate-300">
              <li>Compare multiple extraction attempts side-by-side</li>
              <li>View agent's self-assessment and concerns</li>
              <li>See visual LEGO boundaries in context</li>
              <li>Review quality breakdown by criteria</li>
              <li>Accept, reject, or trigger re-runs</li>
            </ul>
          </div>

          <!-- Prompt Evolution -->
          <div>
            <h3 class="text-lg font-semibold text-emerald-400 mb-3">Prompt Evolution</h3>
            <ul class="list-disc list-inside space-y-2 text-sm text-slate-300">
              <li>Track prompt version history</li>
              <li>View learned rules and their impact</li>
              <li>Monitor A/B tests for experimental rules</li>
              <li>Promote high-confidence rules to production</li>
              <li>Rollback if issues arise</li>
            </ul>
          </div>

          <!-- Health Report -->
          <div>
            <h3 class="text-lg font-semibold text-emerald-400 mb-3">Health Report</h3>
            <ul class="list-disc list-inside space-y-2 text-sm text-slate-300">
              <li>Overall health score and trends</li>
              <li>Phase completion status</li>
              <li>Re-run statistics and reasons</li>
              <li>Common concerns and recommendations</li>
              <li>System performance metrics</li>
            </ul>
          </div>

          <!-- Keyboard Shortcuts -->
          <div>
            <h3 class="text-lg font-semibold text-emerald-400 mb-3">Keyboard Shortcuts</h3>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="flex items-center gap-2">
                <kbd class="px-2 py-1 bg-slate-900 rounded border border-slate-600">j/k</kbd>
                <span class="text-slate-400">Navigate</span>
              </div>
              <div class="flex items-center gap-2">
                <kbd class="px-2 py-1 bg-slate-900 rounded border border-slate-600">Enter</kbd>
                <span class="text-slate-400">View details</span>
              </div>
              <div class="flex items-center gap-2">
                <kbd class="px-2 py-1 bg-slate-900 rounded border border-slate-600">a</kbd>
                <span class="text-slate-400">Accept</span>
              </div>
              <div class="flex items-center gap-2">
                <kbd class="px-2 py-1 bg-slate-900 rounded border border-slate-600">r</kbd>
                <span class="text-slate-400">Re-run</span>
              </div>
              <div class="flex items-center gap-2">
                <kbd class="px-2 py-1 bg-slate-900 rounded border border-slate-600">x</kbd>
                <span class="text-slate-400">Toggle selection</span>
              </div>
              <div class="flex items-center gap-2">
                <kbd class="px-2 py-1 bg-slate-900 rounded border border-slate-600">?</kbd>
                <span class="text-slate-400">Show help</span>
              </div>
            </div>
          </div>
        </div>

        <div class="p-6 border-t border-slate-700 flex justify-end">
          <button
            @click="showHelp = false"
            class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>

    <!-- Help Button -->
    <button
      @click="showHelp = true"
      class="fixed bottom-8 right-8 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-colors z-40"
      title="Show help"
    >
      ?
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import QualityDashboard from './QualityDashboard.vue'
import SeedQualityReview from './SeedQualityReview.vue'
import PromptEvolutionView from './PromptEvolutionView.vue'
import CourseHealthReport from './CourseHealthReport.vue'

// Props
const props = defineProps({
  courseCode: {
    type: String,
    default: 'spanish_668seeds'
  },
  initialView: {
    type: String,
    default: 'dashboard'
  }
})

// State
const currentView = ref(props.initialView)
const selectedSeedId = ref('SEED_0001')
const showHelp = ref(false)
const totalSeeds = ref(668)

const views = [
  { id: 'dashboard', label: 'Quality Dashboard' },
  { id: 'seed-detail', label: 'Detailed Review' },
  { id: 'evolution', label: 'Prompt Evolution' },
  { id: 'health', label: 'Health Report' }
]

// Lifecycle
onMounted(() => {
  // Show help on first visit
  const hasSeenHelp = localStorage.getItem('quality-dashboard-help-seen')
  if (!hasSeenHelp) {
    setTimeout(() => {
      showHelp.value = true
      localStorage.setItem('quality-dashboard-help-seen', 'true')
    }, 1000)
  }
})
</script>

<style scoped>
/* Smooth transitions */
* {
  transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
</style>
