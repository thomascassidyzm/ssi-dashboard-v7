<template>
  <div class="min-h-screen bg-slate-900 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-emerald-400 mb-2">
          LEGO Visualizer Demo
        </h1>
        <p class="text-slate-400">
          Interactive visualization of LEGO amino acids with filtering, sorting, and editing
        </p>
      </div>

      <!-- Stats Panel -->
      <div v-if="stats" class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-emerald-400 mb-4">Course Statistics</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div class="text-sm text-slate-400">Total LEGOs</div>
            <div class="text-3xl font-bold text-emerald-400">{{ stats.totalLegos }}</div>
          </div>
          <div>
            <div class="text-sm text-slate-400">Avg FCFS Score</div>
            <div class="text-3xl font-bold text-emerald-400">{{ stats.avgFcfs }}</div>
          </div>
          <div>
            <div class="text-sm text-slate-400">Avg Utility</div>
            <div class="text-3xl font-bold text-emerald-400">{{ stats.avgUtility }}</div>
          </div>
          <div>
            <div class="text-sm text-slate-400">Last Edited</div>
            <div class="text-lg font-bold text-emerald-400">{{ stats.lastEdited || 'Never' }}</div>
          </div>
        </div>
      </div>

      <!-- LegoVisualizer Component -->
      <LegoVisualizer
        :course-code="courseCode"
        :editable="true"
        :initial-filters="initialFilters"
        @lego-edited="handleLegoEdited"
        @show-provenance="handleShowProvenance"
      />

      <!-- Event Log (for demonstration) -->
      <div v-if="eventLog.length > 0" class="mt-8 bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 class="text-lg font-semibold text-emerald-400 mb-4">Event Log</h2>
        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="(event, idx) in eventLog"
            :key="idx"
            class="text-sm text-slate-300 font-mono bg-slate-900/50 px-3 py-2 rounded"
          >
            <span class="text-emerald-400">{{ event.timestamp }}</span>
            <span class="text-slate-500 mx-2">|</span>
            <span class="text-blue-400">{{ event.type }}</span>
            <span class="text-slate-500 mx-2">|</span>
            <span>{{ event.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import LegoVisualizer from './LegoVisualizer.vue'

// Configuration
const courseCode = 'mkd_for_eng_574seeds'

// Initial filters (optional - you can start with custom filters)
const initialFilters = ref({
  // searchText: 'I',
  // fcfsMin: 20,
  // fcfsMax: 100,
  // utilityMin: 50,
  // utilityMax: 100
})

// Stats
const stats = ref(null)

// Event log for demonstration
const eventLog = ref([])

// Lifecycle
onMounted(() => {
  // Calculate stats (in a real app, this would come from an API)
  stats.value = {
    totalLegos: 230,
    avgFcfs: '26.4',
    avgUtility: '52',
    lastEdited: null
  }
})

// Event handlers
function handleLegoEdited(lego) {
  console.log('LEGO edited:', lego)

  addEvent({
    type: 'LEGO_EDITED',
    message: `Edited LEGO: "${lego.text.substring(0, 30)}..." (UUID: ${lego.uuid.substring(0, 8)})`
  })

  stats.value.lastEdited = new Date().toLocaleTimeString()

  // In a real application, you would:
  // 1. Send the update to the API
  // 2. Trigger regeneration of downstream artifacts
  // 3. Update the course state
  // Example:
  // await api.lego.update(lego.uuid, { text: lego.text })
}

function handleShowProvenance(data) {
  console.log('Show provenance:', data)

  if (data.type === 'impact') {
    addEvent({
      type: 'IMPACT_REQUESTED',
      message: `Requested impact analysis for LEGO: "${data.lego.text.substring(0, 30)}..."`
    })
  } else {
    addEvent({
      type: 'PROVENANCE_CLICKED',
      message: `Viewing provenance: ${data.provenance.provenance} (SEED: ${data.provenance.source_seed_id})`
    })
  }

  // In a real application, you would:
  // 1. Fetch the provenance chain from the API
  // 2. Show the impact analysis
  // 3. Allow navigation to the source SEED
  // Example:
  // const chain = await api.provenance.trace(data.lego.uuid)
  // showProvenanceModal(chain)
}

function addEvent(event) {
  eventLog.value.unshift({
    ...event,
    timestamp: new Date().toLocaleTimeString()
  })

  // Keep only last 20 events
  if (eventLog.value.length > 20) {
    eventLog.value = eventLog.value.slice(0, 20)
  }
}
</script>

<style scoped>
/* Styles are minimal as LegoVisualizer handles most of the styling */
</style>
