<template>
  <div class="word-divider-editor">
    <!-- Instructions -->
    <div class="mb-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
      <div class="text-sm text-blue-200">
        <div class="font-semibold mb-2">✨ Interactive LEGO Editor</div>
        <p class="text-xs text-blue-300 mb-2">
          <strong>Step 1:</strong> Click between target words to create LEGO boundaries.
        </p>
        <p class="text-xs text-blue-300">
          <strong>Step 2:</strong> For each target LEGO (highlighted), click the known words that map to it.
        </p>
      </div>
    </div>

    <!-- Live LEGO Counter -->
    <div class="mb-4 text-center">
      <div class="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 border-2 border-emerald-500 rounded-lg">
        <span class="text-slate-400 text-sm">Current LEGOs:</span>
        <span class="text-3xl font-bold text-emerald-400">{{ currentLegoCount }}</span>
      </div>
    </div>

    <!-- Target Language Section (with dividers) -->
    <div class="mb-4">
      <div class="text-sm font-semibold text-blue-400 mb-2">
        Step 1: Target Language - Click between words to create LEGOs
      </div>
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div class="flex flex-wrap items-center gap-1">
          <template v-for="(word, index) in targetWords" :key="`target-${index}`">
            <!-- Word in LEGO Container -->
            <div
              class="lego-container px-3 py-2 rounded transition-all cursor-default"
              :class="getTargetWordClasses(index)"
            >
              <span class="font-medium">{{ word }}</span>
            </div>

            <!-- Divider (between words, not after last word) -->
            <DividerToggle
              v-if="index < targetWords.length - 1"
              :word-index="index"
              :active="isTargetDividerActive(index)"
              @toggle="toggleTargetDivider"
            />
          </template>
        </div>
      </div>
    </div>

    <!-- Current LEGO Being Mapped -->
    <div v-if="currentTargetLego !== null" class="mb-4 p-4 bg-purple-900/20 border border-purple-500/50 rounded-lg">
      <div class="text-sm font-semibold text-purple-300 mb-2">
        Step 2: Now mapping LEGO #{{ currentTargetLego + 1 }}
      </div>
      <div class="flex items-center gap-3">
        <div class="text-lg font-medium text-purple-100">
          Target: <span class="text-purple-300">{{ targetLegoPairs[currentTargetLego]?.targetChunk }}</span>
        </div>
        <div class="text-xs text-purple-400">
          (Click known words below that map to this target LEGO)
        </div>
      </div>
      <div class="mt-2 flex items-center gap-2">
        <button
          v-if="currentTargetLego > 0"
          @click="currentTargetLego--"
          class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded"
        >
          ← Previous LEGO
        </button>
        <button
          v-if="currentTargetLego < targetLegoPairs.length - 1"
          @click="currentTargetLego++"
          class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded"
        >
          Next LEGO →
        </button>
      </div>
    </div>

    <!-- Known Language Section (clickable words) -->
    <div class="mb-4">
      <div class="text-sm font-semibold text-slate-400 mb-2">
        Step 2: Known Language - Click words to assign to target LEGO #{{ currentTargetLego + 1 }}
      </div>
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="(word, index) in knownWords"
            :key="`known-${index}`"
            class="known-word-btn px-3 py-2 rounded transition-all border-2"
            :class="getKnownWordClasses(index)"
            @click="toggleKnownWord(index)"
            :disabled="currentTargetLego === null"
          >
            <span class="font-medium">{{ word }}</span>
            <span v-if="getLegoIndexForKnownWord(index) !== null" class="ml-1 text-xs">
              (#{{ getLegoIndexForKnownWord(index) + 1 }})
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mapping Visualizer -->
    <div class="my-6 relative">
      <MappingVisualizer
        ref="mappingVisualizerRef"
        :mappings="currentLegoPairs"
        :svg-height="150"
      />
    </div>

    <!-- LEGO Preview Cards -->
    <div class="mt-6">
      <div class="text-sm font-semibold text-emerald-400 mb-3">Current LEGO Breakdown</div>
      <div class="space-y-2">
        <div
          v-for="(lego, index) in currentLegoPairs"
          :key="index"
          class="lego-preview-card p-4 rounded-lg border-2 transition-all cursor-pointer"
          :class="getLegoPreviewClasses(index)"
          @click="currentTargetLego = index"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="text-xs font-mono text-slate-400">
              LEGO #{{ index + 1 }}
              <span v-if="currentTargetLego === index" class="ml-2 text-purple-400">← Editing</span>
            </div>
            <div
              class="w-3 h-3 rounded-full"
              :style="{ backgroundColor: lego.color.primary }"
            ></div>
          </div>
          <div class="space-y-1">
            <div :class="lego.color.text" class="font-medium">
              {{ lego.targetChunk }}
            </div>
            <div class="text-slate-300 text-sm">
              {{ lego.knownChunk || '(no known words mapped yet)' }}
            </div>
            <div v-if="!lego.knownChunk" class="text-xs text-yellow-400">
              ⚠ Click known words above to complete this mapping
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Validation Status -->
    <div class="mt-6 p-4 rounded-lg border" :class="validationClass">
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <span v-if="isValidTiling" class="text-green-400">✓</span>
          <span v-else class="text-yellow-400">⚠</span>
          <span class="font-medium">
            {{ validationMessage }}
          </span>
        </div>
        <div v-if="unmappedKnownWords.length > 0" class="text-xs text-yellow-300">
          Unmapped known words: {{ unmappedKnownWords.map(i => knownWords[i]).join(', ') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import DividerToggle from './DividerToggle.vue'
import MappingVisualizer from './MappingVisualizer.vue'
import { assignColors, getColorClasses } from '../../utils/ColorMapper'

const props = defineProps({
  breakdown: {
    type: Object,
    required: true,
    // Expected: { seed_id, original_target, original_known, lego_pairs: [...] }
  }
})

const emit = defineEmits(['update-legos'])

const mappingVisualizerRef = ref(null)

// Split sentences into words
const targetWords = computed(() => {
  return props.breakdown.original_target?.split(/\s+/).filter(w => w.length > 0) || []
})

const knownWords = computed(() => {
  return props.breakdown.original_known?.split(/\s+/).filter(w => w.length > 0) || []
})

// Target divider state: array of booleans indicating if divider is active after each word
const targetDividers = ref([])

// Known word assignments: Map<legoIndex, Set<knownWordIndex>>
const knownWordAssignments = ref({})

// Currently selected target LEGO for mapping
const currentTargetLego = ref(0)

// Initialize dividers and mappings from existing LEGO pairs
function initializeFromLegos() {
  const numTargetWords = targetWords.value.length
  targetDividers.value = new Array(numTargetWords - 1).fill(false)
  knownWordAssignments.value = {}

  if (!props.breakdown.lego_pairs || props.breakdown.lego_pairs.length === 0) {
    currentTargetLego.value = 0
    return
  }

  // Build dividers from target chunks
  let targetWordIndex = 0
  props.breakdown.lego_pairs.forEach((pair, legoIndex) => {
    const targetChunkWords = pair.target_chunk.split(/\s+/).filter(w => w.length > 0)
    targetWordIndex += targetChunkWords.length

    // Mark divider after this LEGO (unless it's the last one)
    if (legoIndex < props.breakdown.lego_pairs.length - 1 && targetWordIndex > 0) {
      const dividerIndex = targetWordIndex - 1
      if (dividerIndex < targetDividers.value.length) {
        targetDividers.value[dividerIndex] = true
      }
    }
  })

  // Build known word assignments from known chunks
  let knownWordIndex = 0
  props.breakdown.lego_pairs.forEach((pair, legoIndex) => {
    const knownChunkWords = pair.known_chunk.split(/\s+/).filter(w => w.length > 0)

    if (!knownWordAssignments.value[legoIndex]) {
      knownWordAssignments.value[legoIndex] = new Set()
    }

    for (let i = 0; i < knownChunkWords.length; i++) {
      knownWordAssignments.value[legoIndex].add(knownWordIndex)
      knownWordIndex++
    }
  })

  currentTargetLego.value = 0
}

// Check if target divider is active at given index
function isTargetDividerActive(wordIndex) {
  return targetDividers.value[wordIndex] || false
}

// Toggle target divider at given index
function toggleTargetDivider(wordIndex) {
  targetDividers.value[wordIndex] = !targetDividers.value[wordIndex]

  // Reset current target LEGO to first one
  currentTargetLego.value = 0

  // Recalculate mapping visualizer
  nextTick(() => {
    if (mappingVisualizerRef.value) {
      mappingVisualizerRef.value.calculatePositions()
    }
  })
}

// Calculate target LEGO pairs based on divider positions
const targetLegoPairs = computed(() => {
  const pairs = []
  let targetStart = 0

  // Add divider at the end to capture last LEGO
  const dividerPositions = [...targetDividers.value, true]

  dividerPositions.forEach((isActive, index) => {
    if (isActive) {
      const targetEnd = index + 1
      const targetChunk = targetWords.value.slice(targetStart, targetEnd).join(' ')

      if (targetChunk) {
        pairs.push({
          targetChunk,
          targetStart,
          targetEnd
        })
      }

      targetStart = targetEnd
    }
  })

  return pairs
})

const currentLegoCount = computed(() => targetLegoPairs.value.length)

// Get LEGO index for a target word index
function getTargetLegoIndex(wordIndex) {
  for (let i = 0; i < targetLegoPairs.value.length; i++) {
    const pair = targetLegoPairs.value[i]
    if (wordIndex >= pair.targetStart && wordIndex < pair.targetEnd) {
      return i
    }
  }
  return 0
}

// Get LEGO index for a known word (if assigned)
function getLegoIndexForKnownWord(wordIndex) {
  for (const [legoIndex, wordSet] of Object.entries(knownWordAssignments.value)) {
    if (wordSet.has(wordIndex)) {
      return parseInt(legoIndex)
    }
  }
  return null
}

// Toggle known word assignment
function toggleKnownWord(wordIndex) {
  if (currentTargetLego.value === null) return

  const legoIndex = currentTargetLego.value

  // Initialize set if needed
  if (!knownWordAssignments.value[legoIndex]) {
    knownWordAssignments.value[legoIndex] = new Set()
  }

  // Check if word is already assigned to this LEGO
  if (knownWordAssignments.value[legoIndex].has(wordIndex)) {
    // Remove from this LEGO
    knownWordAssignments.value[legoIndex].delete(wordIndex)
  } else {
    // Remove from any other LEGO first
    for (const [otherLegoIndex, wordSet] of Object.entries(knownWordAssignments.value)) {
      if (wordSet.has(wordIndex)) {
        wordSet.delete(wordIndex)
      }
    }

    // Add to current LEGO
    knownWordAssignments.value[legoIndex].add(wordIndex)
  }

  // Trigger reactivity
  knownWordAssignments.value = { ...knownWordAssignments.value }
}

// Get classes for target word
function getTargetWordClasses(wordIndex) {
  const legoIndex = getTargetLegoIndex(wordIndex)
  const colorClasses = getColorClasses(legoIndex)
  const isCurrentLego = legoIndex === currentTargetLego.value

  return [
    colorClasses.containerClass,
    isCurrentLego ? 'ring-2 ring-purple-400' : ''
  ]
}

// Get classes for known word
function getKnownWordClasses(wordIndex) {
  const assignedLegoIndex = getLegoIndexForKnownWord(wordIndex)

  if (assignedLegoIndex === null) {
    // Unassigned
    return 'bg-slate-700 border-slate-600 text-slate-300 hover:border-yellow-500 cursor-pointer'
  }

  const colorClasses = getColorClasses(assignedLegoIndex)
  const isCurrentLego = assignedLegoIndex === currentTargetLego.value

  return [
    colorClasses.containerClass,
    isCurrentLego ? 'ring-2 ring-purple-400' : '',
    'cursor-pointer'
  ]
}

// Get classes for LEGO preview card
function getLegoPreviewClasses(index) {
  const colorClasses = getColorClasses(index)
  const isCurrentLego = index === currentTargetLego.value

  return [
    colorClasses.containerClass,
    isCurrentLego ? 'ring-4 ring-purple-400' : ''
  ]
}

// Build final LEGO pairs with known chunks
const currentLegoPairs = computed(() => {
  return targetLegoPairs.value.map((pair, index) => {
    // Get known words for this LEGO
    const knownWordIndices = Array.from(knownWordAssignments.value[index] || []).sort((a, b) => a - b)
    const knownChunk = knownWordIndices.map(i => knownWords.value[i]).join(' ')

    return {
      ...pair,
      knownChunk
    }
  })
})

// Assign colors to final pairs
const currentLegoWithColors = computed(() => {
  return assignColors(currentLegoPairs.value)
})

// Find unmapped known words
const unmappedKnownWords = computed(() => {
  const mapped = new Set()
  for (const wordSet of Object.values(knownWordAssignments.value)) {
    for (const wordIndex of wordSet) {
      mapped.add(wordIndex)
    }
  }

  const unmapped = []
  for (let i = 0; i < knownWords.value.length; i++) {
    if (!mapped.has(i)) {
      unmapped.push(i)
    }
  }
  return unmapped
})

// Validation
const isValidTiling = computed(() => {
  // Check target reconstruction
  const reconstructedTarget = targetLegoPairs.value.map(p => p.targetChunk).join(' ')
  const normalizeWS = (str) => str.replace(/\s+/g, ' ').trim()

  const targetValid = normalizeWS(reconstructedTarget) === normalizeWS(props.breakdown.original_target)

  // Check all known words are mapped
  const allKnownMapped = unmappedKnownWords.value.length === 0

  // Check known reconstruction
  let knownValid = false
  if (allKnownMapped) {
    const reconstructedKnown = currentLegoPairs.value.map(p => p.knownChunk).join(' ')
    knownValid = normalizeWS(reconstructedKnown) === normalizeWS(props.breakdown.original_known)
  }

  return targetValid && allKnownMapped && knownValid
})

const validationMessage = computed(() => {
  if (isValidTiling.value) {
    return 'Perfect! All words mapped correctly.'
  } else if (unmappedKnownWords.value.length > 0) {
    return `${unmappedKnownWords.value.length} known word(s) not yet mapped.`
  } else {
    return 'Warning: Mappings do not reconstruct sentences correctly.'
  }
})

const validationClass = computed(() => {
  return isValidTiling.value
    ? 'bg-green-900/20 border-green-500/50'
    : 'bg-yellow-900/20 border-yellow-500/50'
})

// Watch for changes and emit to parent
watch([currentLegoPairs, knownWordAssignments], () => {
  // Convert to format expected by parent
  const legoPairs = currentLegoPairs.value.map((pair, index) => ({
    lego_id: `${props.breakdown.seed_id}L${String(index + 1).padStart(2, '0')}`,
    lego_type: 'BASE', // Default to BASE, parent can upgrade to COMPOSITE
    target_chunk: pair.targetChunk,
    known_chunk: pair.knownChunk,
    fd_validated: false
  }))

  emit('update-legos', {
    seed_id: props.breakdown.seed_id,
    lego_pairs: legoPairs,
    is_valid_tiling: isValidTiling.value
  })
}, { deep: true })

// Initialize on mount
onMounted(() => {
  initializeFromLegos()

  // Recalculate mapping positions after render
  nextTick(() => {
    if (mappingVisualizerRef.value) {
      setTimeout(() => {
        mappingVisualizerRef.value.calculatePositions()
      }, 200)
    }
  })
})

// Expose method to reset
defineExpose({
  reset: initializeFromLegos
})
</script>

<style scoped>
.word-divider-editor {
  @apply text-slate-100;
}

.lego-container {
  @apply shadow-sm;
}

.lego-preview-card {
  @apply shadow-md;
}

.known-word-btn:disabled {
  @apply opacity-50 cursor-not-allowed;
}

/* Smooth transitions for color changes */
.lego-container,
.lego-preview-card,
.known-word-btn {
  transition: all 0.3s ease;
}

/* Animation when LEGO count changes */
@keyframes bounce-count {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>
