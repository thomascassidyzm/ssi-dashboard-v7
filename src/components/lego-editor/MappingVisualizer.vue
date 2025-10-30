<template>
  <div class="mapping-visualizer relative" ref="containerRef">
    <svg
      class="absolute inset-0 w-full h-full pointer-events-none"
      :style="{ height: svgHeight + 'px' }"
    >
      <!-- Connection curves for each LEGO pair -->
      <g v-for="(mapping, index) in mappings" :key="index">
        <path
          :d="getCurvePath(mapping, index)"
          :stroke="mapping.color.primary"
          stroke-width="2"
          fill="none"
          :class="[
            'transition-all duration-300',
            hoveredIndex === index ? 'opacity-100 stroke-[3]' : 'opacity-60'
          ]"
          @mouseenter="hoveredIndex = index"
          @mouseleave="hoveredIndex = null"
        />

        <!-- Optional: Add arrow marker at the end of the curve -->
        <defs>
          <marker
            :id="`arrow-${index}`"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d="M0,0 L0,6 L9,3 z"
              :fill="mapping.color.primary"
            />
          </marker>
        </defs>
      </g>
    </svg>

    <!-- Drag handles for reordering (if enabled) -->
    <div
      v-if="reorderable"
      class="absolute inset-0 pointer-events-none"
    >
      <div
        v-for="(mapping, index) in mappings"
        :key="`handle-${index}`"
        class="drag-handle pointer-events-auto"
        :style="getDragHandleStyle(mapping, index)"
        @mousedown="startDrag(index, $event)"
        :title="`Drag to reorder mapping for ${mapping.targetChunk}`"
      >
        <div
          class="w-4 h-4 rounded-full border-2 bg-slate-800 cursor-move transition-transform hover:scale-125"
          :style="{ borderColor: mapping.color.primary }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  mappings: {
    type: Array,
    required: true,
    // Each mapping: { targetChunk, knownChunk, color, targetIndex, knownIndex }
  },
  targetContainerRef: {
    type: Object,
    default: null
  },
  knownContainerRef: {
    type: Object,
    default: null
  },
  reorderable: {
    type: Boolean,
    default: false
  },
  svgHeight: {
    type: Number,
    default: 120
  }
})

const emit = defineEmits(['reorder-mapping'])

const containerRef = ref(null)
const hoveredIndex = ref(null)
const draggingIndex = ref(null)
const elementPositions = ref({})

// Calculate curve path using cubic Bezier
function getCurvePath(mapping, index) {
  const positions = elementPositions.value[index]
  if (!positions) return ''

  const { startX, startY, endX, endY } = positions

  // Control points for smooth S-curve
  const controlY1 = startY + (endY - startY) * 0.3
  const controlY2 = startY + (endY - startY) * 0.7

  return `M ${startX} ${startY}
          C ${startX} ${controlY1},
            ${endX} ${controlY2},
            ${endX} ${endY}`
}

// Calculate positions of LEGO elements
function calculatePositions() {
  if (!containerRef.value || !props.targetContainerRef || !props.knownContainerRef) return

  const newPositions = {}

  props.mappings.forEach((mapping, index) => {
    // Find the target and known elements by their index
    const targetElements = props.targetContainerRef.querySelectorAll('.lego-container')
    const knownElements = props.knownContainerRef.querySelectorAll('.lego-container')

    const targetEl = targetElements[mapping.targetIndex || index]
    const knownEl = knownElements[mapping.knownIndex || index]

    if (!targetEl || !knownEl) return

    const containerRect = containerRef.value.getBoundingClientRect()
    const targetRect = targetEl.getBoundingClientRect()
    const knownRect = knownEl.getBoundingClientRect()

    newPositions[index] = {
      startX: targetRect.left + targetRect.width / 2 - containerRect.left,
      startY: targetRect.bottom - containerRect.top,
      endX: knownRect.left + knownRect.width / 2 - containerRect.left,
      endY: knownRect.top - containerRect.top
    }
  })

  elementPositions.value = newPositions
}

function getDragHandleStyle(mapping, index) {
  const positions = elementPositions.value[index]
  if (!positions) return {}

  // Position handle at midpoint of curve
  const midX = (positions.startX + positions.endX) / 2
  const midY = (positions.startY + positions.endY) / 2

  return {
    position: 'absolute',
    left: `${midX - 8}px`,
    top: `${midY - 8}px`,
    zIndex: 10
  }
}

function startDrag(index, event) {
  if (!props.reorderable) return

  draggingIndex.value = index
  event.preventDefault()

  // Add mousemove and mouseup listeners
  window.addEventListener('mousemove', handleDrag)
  window.addEventListener('mouseup', endDrag)
}

function handleDrag(event) {
  if (draggingIndex.value === null) return
  // This would update the mapping order based on cursor position
  // Implementation depends on your specific reordering logic
}

function endDrag() {
  if (draggingIndex.value !== null) {
    // Emit reorder event if mapping changed
    draggingIndex.value = null
  }

  window.removeEventListener('mousemove', handleDrag)
  window.removeEventListener('mouseup', endDrag)
}

// Recalculate positions on mount and when mappings change
onMounted(() => {
  setTimeout(calculatePositions, 100) // Allow elements to render
  window.addEventListener('resize', calculatePositions)
})

onUnmounted(() => {
  window.removeEventListener('resize', calculatePositions)
  window.removeEventListener('mousemove', handleDrag)
  window.removeEventListener('mouseup', endDrag)
})

watch(() => props.mappings, () => {
  setTimeout(calculatePositions, 50)
}, { deep: true })

// Expose method for parent to trigger recalculation
defineExpose({
  calculatePositions
})
</script>

<style scoped>
.mapping-visualizer {
  @apply w-full;
  min-height: 120px;
}

svg path {
  stroke-linecap: round;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.drag-handle {
  transition: all 0.2s ease;
}

.drag-handle:hover {
  filter: drop-shadow(0 0 6px currentColor);
}
</style>
