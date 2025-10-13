<template>
  <div class="lego-visualizer">
    <!-- Header Controls -->
    <div class="controls-section bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-emerald-400">LEGO Amino Acids</h2>
        <div class="text-sm text-slate-400">
          {{ filteredLegos.length }} LEGOs
          <span v-if="totalLegos !== filteredLegos.length" class="text-emerald-400">
            (filtered from {{ totalLegos }})
          </span>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Search -->
        <div class="col-span-full">
          <label class="block text-sm font-medium text-slate-300 mb-2">Search Text</label>
          <input
            v-model="filters.searchText"
            type="text"
            placeholder="Search LEGO text..."
            class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <!-- FCFS Range -->
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">
            Min FCFS Score ({{ filters.fcfsMin }})
          </label>
          <input
            v-model.number="filters.fcfsMin"
            type="range"
            min="0"
            max="100"
            step="0.1"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">
            Max FCFS Score ({{ filters.fcfsMax }})
          </label>
          <input
            v-model.number="filters.fcfsMax"
            type="range"
            min="0"
            max="100"
            step="0.1"
            class="w-full"
          />
        </div>

        <!-- Utility Range -->
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">
            Min Utility Score ({{ filters.utilityMin }})
          </label>
          <input
            v-model.number="filters.utilityMin"
            type="range"
            min="0"
            max="100"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">
            Max Utility Score ({{ filters.utilityMax }})
          </label>
          <input
            v-model.number="filters.utilityMax"
            type="range"
            min="0"
            max="100"
            class="w-full"
          />
        </div>

        <!-- Sort By -->
        <div class="col-span-full md:col-span-1">
          <label class="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
          <select
            v-model="sortBy"
            class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="fcfs-desc">FCFS Score (High to Low)</option>
            <option value="fcfs-asc">FCFS Score (Low to High)</option>
            <option value="utility-desc">Utility Score (High to Low)</option>
            <option value="utility-asc">Utility Score (Low to High)</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>

        <!-- Reset Filters -->
        <div class="col-span-full md:col-span-1 flex items-end">
          <button
            @click="resetFilters"
            class="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="text-slate-400">Loading LEGOs...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
      <h3 class="text-red-400 font-semibold mb-2">Error Loading LEGOs</h3>
      <p class="text-slate-300">{{ error }}</p>
    </div>

    <!-- LEGO Cards -->
    <div v-else class="space-y-4">
      <div v-if="paginatedLegos.length === 0" class="text-center py-12 text-slate-400">
        No LEGOs match your filters
      </div>

      <div
        v-for="lego in paginatedLegos"
        :key="lego.uuid"
        class="lego-card bg-slate-800 border border-slate-700 rounded-lg p-5 hover:border-emerald-500/50 transition-colors"
      >
        <!-- LEGO Text -->
        <div class="mb-4">
          <div v-if="!editingLego || editingLego.uuid !== lego.uuid" class="text-xl font-medium text-emerald-400 mb-2">
            "{{ lego.text }}"
          </div>
          <div v-else class="space-y-2 mb-2">
            <textarea
              v-model="editingLego.editedText"
              class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-emerald-400 text-lg font-medium focus:outline-none focus:border-emerald-500"
              rows="2"
              placeholder="LEGO text (known language)"
            ></textarea>
          </div>
        </div>

        <!-- Provenance Chain -->
        <div class="mb-3">
          <div class="flex items-center gap-2 text-sm">
            <span class="text-slate-400">Provenance:</span>
            <div class="flex items-center gap-1 flex-wrap">
              <button
                v-for="(prov, idx) in lego.provenance"
                :key="idx"
                @click="showProvenance(prov, lego)"
                class="text-emerald-400 hover:text-emerald-300 underline decoration-dotted transition-colors"
                :title="formatProvenanceTooltip(prov)"
              >
                {{ prov.provenance }}
              </button>
              <span v-if="lego.provenance.length > 1" class="text-slate-500 text-xs ml-1">
                ({{ lego.provenance.length }} sources)
              </span>
            </div>
          </div>
        </div>

        <!-- Scores -->
        <div class="flex items-center gap-6 mb-4 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-slate-400">FCFS:</span>
            <span class="font-semibold text-emerald-400">{{ formatScore(lego.fcfs_score) }}</span>
            <div class="score-bar">
              <div class="score-bar-fill bg-emerald-500" :style="{ width: `${lego.fcfs_score}%` }"></div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-400">Utility:</span>
            <span class="font-semibold text-emerald-400">{{ lego.utility_score }}</span>
            <div class="score-bar">
              <div class="score-bar-fill bg-blue-500" :style="{ width: `${lego.utility_score}%` }"></div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-400">Pedagogical:</span>
            <span class="font-semibold text-emerald-400">{{ lego.pedagogical_score }}</span>
            <div class="score-bar">
              <div class="score-bar-fill bg-purple-500" :style="{ width: `${lego.pedagogical_score}%` }"></div>
            </div>
          </div>
        </div>

        <!-- Metadata -->
        <div class="flex items-center gap-4 text-xs text-slate-500 mb-4">
          <span>UUID: {{ lego.uuid.substring(0, 8) }}...</span>
          <span v-if="lego.metadata?.duplicate_count">
            Duplicates: {{ lego.metadata.duplicate_count }}
          </span>
          <span v-if="lego.metadata?.created_at">
            Created: {{ formatDate(lego.metadata.created_at) }}
          </span>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <button
            v-if="editable && (!editingLego || editingLego.uuid !== lego.uuid)"
            @click="startEdit(lego)"
            class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            Edit
          </button>
          <button
            v-if="editingLego && editingLego.uuid === lego.uuid"
            @click="saveLego"
            class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            Save
          </button>
          <button
            v-if="editingLego && editingLego.uuid === lego.uuid"
            @click="cancelEdit"
            class="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            @click="showImpact(lego)"
            class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            Show Impact
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination bg-slate-800 border border-slate-700 rounded-lg p-4 mt-6">
        <div class="flex items-center justify-between">
          <div class="text-sm text-slate-400">
            Showing {{ startIndex + 1 }}-{{ Math.min(endIndex, filteredLegos.length) }} of {{ filteredLegos.length }}
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="previousPage"
              :disabled="currentPage === 1"
              class="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 px-4 py-2 rounded transition-colors"
            >
              Previous
            </button>
            <div class="flex items-center gap-1">
              <button
                v-for="page in visiblePages"
                :key="page"
                @click="goToPage(page)"
                :class="[
                  'px-3 py-2 rounded transition-colors',
                  currentPage === page
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                ]"
              >
                {{ page }}
              </button>
            </div>
            <button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              class="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 px-4 py-2 rounded transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Provenance Modal -->
    <div
      v-if="provenanceModal.open"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      @click.self="closeProvenanceModal"
    >
      <div class="bg-slate-800 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 class="text-2xl font-bold text-emerald-400">Provenance Chain</h2>
          <button
            @click="closeProvenanceModal"
            class="text-slate-400 hover:text-slate-300 text-2xl"
          >
            ×
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
            <div class="text-emerald-400 font-semibold mb-2">Current LEGO</div>
            <div class="text-slate-300 text-lg">"{{ provenanceModal.lego?.text }}"</div>
          </div>

          <div v-if="provenanceModal.provenance" class="space-y-3">
            <div class="text-sm font-semibold text-slate-300">Source Information:</div>
            <div class="bg-emerald-900/20 border border-emerald-500/50 rounded-lg p-4 space-y-2 text-sm">
              <div>
                <span class="text-slate-400">Provenance ID:</span>
                <span class="text-emerald-400 ml-2 font-mono">{{ provenanceModal.provenance.provenance }}</span>
              </div>
              <div>
                <span class="text-slate-400">Source SEED ID:</span>
                <span class="text-emerald-400 ml-2 font-mono">{{ provenanceModal.provenance.source_seed_id }}</span>
              </div>
              <div>
                <span class="text-slate-400">Translation UUID:</span>
                <span class="text-emerald-400 ml-2 font-mono text-xs">{{ provenanceModal.provenance.source_translation_uuid }}</span>
              </div>
              <div>
                <span class="text-slate-400">Original UUID:</span>
                <span class="text-emerald-400 ml-2 font-mono text-xs">{{ provenanceModal.provenance.original_uuid }}</span>
              </div>
            </div>
          </div>

          <div class="text-xs text-slate-500 bg-slate-900/50 border border-slate-700 rounded-lg p-4">
            <strong class="text-emerald-400">Provenance Tracking:</strong> This LEGO was generated from SEED
            <span class="font-mono text-emerald-400">{{ provenanceModal.provenance?.source_seed_id }}</span>
            during the LEGO generation phase. Click through the chain to trace back to the original translation.
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
          <button
            @click="closeProvenanceModal"
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// Props
const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  editable: {
    type: Boolean,
    default: true
  },
  initialFilters: {
    type: Object,
    default: () => ({})
  }
})

// Emits
const emit = defineEmits(['lego-edited', 'show-provenance'])

// State
const legos = ref([])
const loading = ref(true)
const error = ref(null)
const currentPage = ref(1)
const itemsPerPage = 20
const sortBy = ref('fcfs-desc')

// Filters
const filters = ref({
  searchText: '',
  fcfsMin: 0,
  fcfsMax: 100,
  utilityMin: 0,
  utilityMax: 100,
  ...props.initialFilters
})

// Edit state
const editingLego = ref(null)

// Provenance modal state
const provenanceModal = ref({
  open: false,
  lego: null,
  provenance: null
})

// Computed
const totalLegos = computed(() => legos.value.length)

const filteredLegos = computed(() => {
  let result = legos.value

  // Text search
  if (filters.value.searchText) {
    const searchLower = filters.value.searchText.toLowerCase()
    result = result.filter(lego =>
      lego.text.toLowerCase().includes(searchLower)
    )
  }

  // FCFS filter
  result = result.filter(lego =>
    lego.fcfs_score >= filters.value.fcfsMin &&
    lego.fcfs_score <= filters.value.fcfsMax
  )

  // Utility filter
  result = result.filter(lego =>
    lego.utility_score >= filters.value.utilityMin &&
    lego.utility_score <= filters.value.utilityMax
  )

  // Sorting
  result = [...result].sort((a, b) => {
    switch (sortBy.value) {
      case 'fcfs-desc':
        return b.fcfs_score - a.fcfs_score
      case 'fcfs-asc':
        return a.fcfs_score - b.fcfs_score
      case 'utility-desc':
        return b.utility_score - a.utility_score
      case 'utility-asc':
        return a.utility_score - b.utility_score
      case 'alphabetical':
        return a.text.localeCompare(b.text)
      default:
        return 0
    }
  })

  return result
})

const totalPages = computed(() => Math.ceil(filteredLegos.value.length / itemsPerPage))

const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage)
const endIndex = computed(() => startIndex.value + itemsPerPage)

const paginatedLegos = computed(() =>
  filteredLegos.value.slice(startIndex.value, endIndex.value)
)

const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return pages
})

// Watch filters and reset to page 1
watch([filters, sortBy], () => {
  currentPage.value = 1
}, { deep: true })

// Lifecycle
onMounted(async () => {
  await loadLegos()
})

// Methods
async function loadLegos() {
  loading.value = true
  error.value = null

  try {
    // Fetch LEGOs from the API endpoint
    // This should match the automation server API structure
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:54321'
    const response = await fetch(`${API_BASE_URL}/api/visualization/legos/${props.courseCode}`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    legos.value = data.legos || []
  } catch (err) {
    error.value = err.message || 'Failed to load LEGOs'
    console.error('Failed to load LEGOs:', err)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = {
    searchText: '',
    fcfsMin: 0,
    fcfsMax: 100,
    utilityMin: 0,
    utilityMax: 100
  }
  sortBy.value = 'fcfs-desc'
}

function formatScore(score) {
  return typeof score === 'number' ? score.toFixed(1) : score
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatProvenanceTooltip(prov) {
  return `Source: ${prov.source_seed_id}\nProvenance: ${prov.provenance}\nClick to view details`
}

function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

function goToPage(page) {
  currentPage.value = page
}

function startEdit(lego) {
  editingLego.value = {
    ...lego,
    editedText: lego.text
  }
}

function cancelEdit() {
  editingLego.value = null
}

async function saveLego() {
  if (!editingLego.value) return

  try {
    const updatedLego = {
      ...editingLego.value,
      text: editingLego.value.editedText
    }

    // Emit the change
    emit('lego-edited', updatedLego)

    // Update local state
    const index = legos.value.findIndex(l => l.uuid === updatedLego.uuid)
    if (index !== -1) {
      legos.value[index] = updatedLego
    }

    editingLego.value = null
  } catch (err) {
    console.error('Failed to save LEGO:', err)
    alert('Failed to save: ' + err.message)
  }
}

function showProvenance(provenance, lego) {
  provenanceModal.value = {
    open: true,
    lego,
    provenance
  }

  emit('show-provenance', { lego, provenance })
}

function closeProvenanceModal() {
  provenanceModal.value = {
    open: false,
    lego: null,
    provenance: null
  }
}

function showImpact(lego) {
  // This would show the downstream impact of editing this LEGO
  emit('show-provenance', { lego, type: 'impact' })
}

// Expose methods for parent components
defineExpose({
  loadLegos,
  resetFilters
})
</script>

<style scoped>
.lego-visualizer {
  @apply text-slate-100;
}

.score-bar {
  @apply w-24 h-2 bg-slate-700 rounded-full overflow-hidden;
}

.score-bar-fill {
  @apply h-full transition-all duration-300;
}

input[type="range"] {
  @apply accent-emerald-500;
}

/* Custom scrollbar for modals */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  @apply bg-slate-800;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  @apply bg-slate-600 rounded;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  @apply bg-slate-500;
}
</style>
