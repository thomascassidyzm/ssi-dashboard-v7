<template>
  <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-semibold text-emerald-400">SEED Visualizer</h3>
        <div class="flex items-center gap-2 text-xs text-slate-400">
          <span v-if="translation">{{ translation.seed_id }}</span>
          <span v-if="legos.length > 0" class="text-emerald-400">{{ legos.length }} LEGOs</span>
        </div>
      </div>
      <p v-if="editable" class="text-xs text-slate-400">
        Click between words to add or remove LEGO boundaries
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <div class="text-slate-400">Loading SEED data...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
      <div class="text-red-400 font-semibold mb-1">Error Loading SEED</div>
      <div class="text-sm text-slate-300">{{ error }}</div>
    </div>

    <!-- Content -->
    <div v-else-if="translation" class="space-y-6">
      <!-- Known Language (Source) -->
      <div>
        <div class="text-xs font-medium text-slate-400 mb-2 uppercase">Known Language</div>
        <div class="bg-slate-900 border border-slate-700 rounded-lg p-4">
          <div class="flex flex-wrap items-center gap-1">
            <template v-for="(segment, idx) in sourceSegments" :key="'source-' + idx">
              <!-- LEGO segment -->
              <div
                class="inline-flex items-center bg-emerald-900/30 border border-emerald-600/50 rounded px-3 py-2"
                :class="{ 'hover:bg-emerald-900/40 cursor-pointer': editable }"
              >
                <span class="text-slate-100 font-medium">{{ segment.text }}</span>
              </div>

              <!-- Boundary divider (clickable in edit mode) -->
              <button
                v-if="idx < sourceSegments.length - 1"
                @click="toggleBoundary(segment.endIndex)"
                :disabled="!editable"
                class="group px-1 py-2 transition-colors"
                :class="editable
                  ? 'hover:bg-emerald-600/20 cursor-pointer'
                  : 'cursor-default'"
                :title="editable ? 'Click to toggle boundary' : ''"
              >
                <span
                  class="text-emerald-500 font-bold text-xl"
                  :class="editable && 'group-hover:text-emerald-400'"
                >|</span>
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- Target Language -->
      <div>
        <div class="text-xs font-medium text-slate-400 mb-2 uppercase">Target Language</div>
        <div class="bg-slate-900 border border-slate-700 rounded-lg p-4">
          <div class="flex flex-wrap items-center gap-1">
            <template v-for="(segment, idx) in targetSegments" :key="'target-' + idx">
              <!-- LEGO segment -->
              <div
                class="inline-flex items-center bg-emerald-900/30 border border-emerald-600/50 rounded px-3 py-2"
                :class="{ 'hover:bg-emerald-900/40 cursor-pointer': editable }"
              >
                <span class="text-slate-100 font-medium">{{ segment.text }}</span>
              </div>

              <!-- Boundary divider -->
              <span
                v-if="idx < targetSegments.length - 1"
                class="text-emerald-500 font-bold text-xl px-1 py-2"
              >|</span>
            </template>
          </div>
        </div>
      </div>

      <!-- LEGO Details -->
      <div v-if="legos.length > 0" class="border-t border-slate-700 pt-4">
        <div class="text-xs font-medium text-slate-400 mb-3 uppercase">LEGO Details</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="(lego, idx) in sortedLegos"
            :key="lego.uuid"
            class="bg-slate-900/50 border border-slate-700 rounded-lg p-3 hover:border-emerald-500/50 transition-colors"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded">
                  {{ lego.provenance }}
                </span>
                <span class="text-xs text-slate-500">
                  Words {{ lego.metadata.start_index }}-{{ lego.metadata.end_index }}
                </span>
              </div>
            </div>
            <div class="text-sm text-slate-300 font-mono">
              "{{ lego.text }}"
            </div>
            <div class="flex gap-3 mt-2 text-xs text-slate-500">
              <span>FCFS: {{ lego.fcfs_score }}</span>
              <span>Utility: {{ lego.utility_score }}</span>
              <span>Pedagogical: {{ lego.pedagogical_score }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Boundary Status -->
      <div v-if="editable && hasChanges" class="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div class="text-sm text-yellow-400">
            Boundaries have been modified. LEGOs will need regeneration.
          </div>
          <button
            @click="resetBoundaries"
            class="text-xs text-yellow-300 hover:text-yellow-200 underline"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  translationUuid: {
    type: String,
    required: true
  },
  courseCode: {
    type: String,
    required: true
  },
  editable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['boundaries-changed'])

// State
const translation = ref(null)
const legos = ref([])
const loading = ref(true)
const error = ref(null)
const boundaries = ref([]) // Array of word indices where boundaries exist
const originalBoundaries = ref([]) // For reset functionality

// Computed
const sortedLegos = computed(() => {
  return [...legos.value].sort((a, b) => {
    // Sort by provenance (S1L1, S1L2, etc.)
    const aMatch = a.provenance.match(/S(\d+)L(\d+)/)
    const bMatch = b.provenance.match(/S(\d+)L(\d+)/)

    if (!aMatch || !bMatch) return 0

    const aSeed = parseInt(aMatch[1])
    const bSeed = parseInt(bMatch[1])
    const aLego = parseInt(aMatch[2])
    const bLego = parseInt(bMatch[2])

    if (aSeed !== bSeed) return aSeed - bSeed
    return aLego - bLego
  })
})

const sourceSegments = computed(() => {
  if (!translation.value) return []
  return createSegments(translation.value.source, boundaries.value)
})

const targetSegments = computed(() => {
  if (!translation.value) return []
  // Target segments follow the same boundaries
  return createSegments(translation.value.target, boundaries.value)
})

const hasChanges = computed(() => {
  if (boundaries.value.length !== originalBoundaries.value.length) return true
  return boundaries.value.some((b, idx) => b !== originalBoundaries.value[idx])
})

// Methods
function createSegments(text, boundaryIndices) {
  if (!text) return []

  const words = text.split(/\s+/)
  const segments = []
  let currentSegment = []
  let currentStartIndex = 0

  words.forEach((word, idx) => {
    currentSegment.push(word)

    // Check if there's a boundary after this word
    if (boundaryIndices.includes(idx) || idx === words.length - 1) {
      segments.push({
        text: currentSegment.join(' '),
        startIndex: currentStartIndex,
        endIndex: idx
      })
      currentSegment = []
      currentStartIndex = idx + 1
    }
  })

  return segments
}

function extractBoundariesFromLegos() {
  if (legos.value.length === 0) return []

  // Get unique end indices from LEGOs, sorted
  const endIndices = [...new Set(
    sortedLegos.value.map(lego => lego.metadata.end_index)
  )].sort((a, b) => a - b)

  // Remove the last index if it's the end of the sentence
  const words = translation.value.source.split(/\s+/)
  return endIndices.filter(idx => idx < words.length - 1)
}

function toggleBoundary(endIndex) {
  if (!props.editable) return

  const idx = boundaries.value.indexOf(endIndex)
  if (idx > -1) {
    // Remove boundary
    boundaries.value.splice(idx, 1)
  } else {
    // Add boundary
    boundaries.value.push(endIndex)
    boundaries.value.sort((a, b) => a - b)
  }

  // Emit change event
  emit('boundaries-changed', {
    translationUuid: props.translationUuid,
    boundaries: boundaries.value
  })
}

function resetBoundaries() {
  boundaries.value = [...originalBoundaries.value]
  emit('boundaries-changed', {
    translationUuid: props.translationUuid,
    boundaries: boundaries.value
  })
}

async function loadData() {
  loading.value = true
  error.value = null

  try {
    // Fetch seed data from API endpoint
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:54321'
    const response = await fetch(`${API_BASE_URL}/api/visualization/seed/${props.translationUuid}?courseCode=${props.courseCode}`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    // Set translation data
    translation.value = data.translation || null

    // Set LEGOs data - already sorted by provenance from API
    legos.value = data.legos || []

    // Extract boundaries from LEGOs
    boundaries.value = extractBoundariesFromLegos()
    originalBoundaries.value = [...boundaries.value]

  } catch (err) {
    error.value = err.message || 'Failed to load SEED data'
    console.error('Failed to load SEED data:', err)
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadData()
})

// Watch for prop changes
watch(() => props.translationUuid, () => {
  loadData()
})
</script>

<style scoped>
/* Additional custom styles if needed */
.font-mono {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
}
</style>
