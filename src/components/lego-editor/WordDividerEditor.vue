<template>
  <div class="word-divider-editor">
    <!-- Instructions -->
    <div class="mb-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
      <div class="text-sm text-blue-200">
        <div class="font-semibold mb-2">✨ Interactive LEGO Editor</div>
        <p class="text-xs text-blue-300">
          Click between words to add/remove dividers. LEGOs are color-coded to show which target chunks map to which known chunks.
          Watch the live counter update as you edit!
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

    <!-- Target Language Section -->
    <div class="mb-4">
      <div class="text-sm font-semibold text-blue-400 mb-2">Target Language</div>
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div class="flex flex-wrap items-center gap-1" ref="targetContainerRef">
          <template v-for="(word, index) in targetWords" :key="`target-${index}`">
            <!-- Word in LEGO Container -->
            <div
              class="lego-container px-3 py-2 rounded transition-all cursor-default"
              :class="getLegoClasses(getLegoIndexForWord(index, 'target'))"
              :data-lego-index="getLegoIndexForWord(index, 'target')"
            >
              <span class="font-medium">{{ word }}</span>
            </div>

            <!-- Divider (between words, not after last word) -->
            <DividerToggle
              v-if="index < targetWords.length - 1"
              :word-index="index"
              :active="isDividerActive(index)"
              @toggle="toggleDivider"
            />
          </template>
        </div>
      </div>
    </div>

    <!-- Mapping Visualizer -->
    <div class="my-6 relative">
      <MappingVisualizer
        ref="mappingVisualizerRef"
        :mappings="legoMappings"
        :target-container-ref="targetContainerRef"
        :known-container-ref="knownContainerRef"
        :reorderable="false"
        :svg-height="120"
      />
    </div>

    <!-- Known Language Section -->
    <div class="mb-4">
      <div class="text-sm font-semibold text-slate-400 mb-2">Known Language</div>
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div class="flex flex-wrap items-center gap-1" ref="knownContainerRef">
          <template v-for="(word, index) in knownWords" :key="`known-${index}`">
            <!-- Word in LEGO Container -->
            <div
              class="lego-container px-3 py-2 rounded transition-all cursor-default"
              :class="getLegoClasses(getLegoIndexForWord(index, 'known'))"
              :data-lego-index="getLegoIndexForWord(index, 'known')"
            >
              <span class="font-medium">{{ word }}</span>
            </div>

            <!-- Divider (between words, not after last word) -->
            <DividerToggle
              v-if="index < knownWords.length - 1"
              :word-index="index"
              :active="isDividerActive(index)"
              @toggle="toggleDivider"
            />
          </template>
        </div>
      </div>
    </div>

    <!-- LEGO Preview Cards -->
    <div class="mt-6">
      <div class="text-sm font-semibold text-emerald-400 mb-3">Current LEGO Breakdown</div>
      <div class="space-y-2">
        <div
          v-for="(lego, index) in currentLegoPairs"
          :key="index"
          class="lego-preview-card p-4 rounded-lg border-2 transition-all"
          :class="getLegoClasses(index)"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="text-xs font-mono text-slate-400">
              LEGO #{{ index + 1 }}
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
              {{ lego.knownChunk }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Validation Status -->
    <div class="mt-6 p-4 rounded-lg border" :class="validationClass">
      <div class="flex items-center gap-2">
        <span v-if="isValidTiling" class="text-green-400">✓</span>
        <span v-else class="text-yellow-400">⚠</span>
        <span class="font-medium">
          {{ validationMessage }}
        </span>
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

// Refs for DOM elements
const targetContainerRef = ref(null)
const knownContainerRef = ref(null)
const mappingVisualizerRef = ref(null)

// Split sentences into words
const targetWords = computed(() => {
  return props.breakdown.original_target?.split(/\s+/).filter(w => w.length > 0) || []
})

const knownWords = computed(() => {
  return props.breakdown.original_known?.split(/\s+/).filter(w => w.length > 0) || []
})

// Divider state: array of booleans indicating if divider is active after each word
const dividers = ref([])

// Initialize dividers from existing LEGO pairs
function initializeDividersFromLegos() {
  const numWords = Math.max(targetWords.value.length, knownWords.value.length)
  const newDividers = new Array(numWords - 1).fill(false)

  if (!props.breakdown.lego_pairs || props.breakdown.lego_pairs.length === 0) {
    dividers.value = newDividers
    return
  }

  // Calculate divider positions from existing LEGO pairs
  let targetWordIndex = 0
  let knownWordIndex = 0

  props.breakdown.lego_pairs.forEach((pair, legoIndex) => {
    const targetChunkWords = pair.target_chunk.split(/\s+/).filter(w => w.length > 0)
    const knownChunkWords = pair.known_chunk.split(/\s+/).filter(w => w.length > 0)

    targetWordIndex += targetChunkWords.length
    knownWordIndex += knownChunkWords.length

    // Mark divider after this LEGO (unless it's the last one)
    if (legoIndex < props.breakdown.lego_pairs.length - 1) {
      const dividerIndex = Math.min(targetWordIndex - 1, knownWordIndex - 1)
      if (dividerIndex >= 0 && dividerIndex < newDividers.length) {
        newDividers[dividerIndex] = true
      }
    }
  })

  dividers.value = newDividers
}

// Check if divider is active at given index
function isDividerActive(wordIndex) {
  return dividers.value[wordIndex] || false
}

// Toggle divider at given index
function toggleDivider(wordIndex) {
  dividers.value[wordIndex] = !dividers.value[wordIndex]

  // Recalculate LEGO pairs and update visualizer
  nextTick(() => {
    if (mappingVisualizerRef.value) {
      mappingVisualizerRef.value.calculatePositions()
    }
  })
}

// Calculate current LEGO pairs based on divider positions
const currentLegoPairs = computed(() => {
  const pairs = []
  let targetStart = 0
  let knownStart = 0

  // Add divider at the end to capture last LEGO
  const dividerPositions = [...dividers.value, true]

  dividerPositions.forEach((isActive, index) => {
    if (isActive) {
      const targetEnd = index + 1
      const knownEnd = index + 1

      const targetChunk = targetWords.value.slice(targetStart, targetEnd).join(' ')
      const knownChunk = knownWords.value.slice(knownStart, knownEnd).join(' ')

      if (targetChunk || knownChunk) {
        pairs.push({
          targetChunk,
          knownChunk,
          targetStart,
          targetEnd,
          knownStart,
          knownEnd
        })
      }

      targetStart = targetEnd
      knownStart = knownEnd
    }
  })

  // Assign colors to pairs
  return assignColors(pairs)
})

const currentLegoCount = computed(() => currentLegoPairs.value.length)

// Generate mappings for visualizer
const legoMappings = computed(() => {
  return currentLegoPairs.value.map((pair, index) => ({
    ...pair,
    targetIndex: index,
    knownIndex: index
  }))
})

// Get LEGO index for a given word index
function getLegoIndexForWord(wordIndex, language) {
  const pairs = currentLegoPairs.value

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]
    if (language === 'target') {
      if (wordIndex >= pair.targetStart && wordIndex < pair.targetEnd) {
        return i
      }
    } else {
      if (wordIndex >= pair.knownStart && wordIndex < pair.knownEnd) {
        return i
      }
    }
  }

  return 0
}

// Get color classes for a LEGO
function getLegoClasses(legoIndex) {
  const colorClasses = getColorClasses(legoIndex)
  return colorClasses.containerClass
}

// Validation
const isValidTiling = computed(() => {
  const reconstructedTarget = currentLegoPairs.value.map(p => p.targetChunk).join(' ')
  const reconstructedKnown = currentLegoPairs.value.map(p => p.knownChunk).join(' ')

  const normalizeWS = (str) => str.replace(/\s+/g, ' ').trim()

  return (
    normalizeWS(reconstructedTarget) === normalizeWS(props.breakdown.original_target) &&
    normalizeWS(reconstructedKnown) === normalizeWS(props.breakdown.original_known)
  )
})

const validationMessage = computed(() => {
  if (isValidTiling.value) {
    return 'Perfect tiling! LEGOs reconstruct both sentences completely.'
  } else {
    return 'Warning: LEGOs do not tile perfectly. Adjust dividers to match original sentences.'
  }
})

const validationClass = computed(() => {
  return isValidTiling.value
    ? 'bg-green-900/20 border-green-500/50'
    : 'bg-yellow-900/20 border-yellow-500/50'
})

// Watch for changes and emit to parent
watch(currentLegoPairs, (newPairs) => {
  // Convert to format expected by parent
  const legoPairs = newPairs.map((pair, index) => ({
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
  initializeDividersFromLegos()

  // Recalculate mapping positions after render
  nextTick(() => {
    if (mappingVisualizerRef.value) {
      setTimeout(() => {
        mappingVisualizerRef.value.calculatePositions()
      }, 200)
    }
  })
})

// Expose method to reset dividers
defineExpose({
  resetDividers: initializeDividersFromLegos
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

/* Smooth transitions for color changes */
.lego-container,
.lego-preview-card {
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

.text-3xl {
  animation: bounce-count 0.3s ease-out;
}
</style>
