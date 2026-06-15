<template>
  <div
    class="build-progress"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
  >
    <div class="progress-bar">
      <div
        v-for="(segment, idx) in segments"
        :key="idx"
        class="segment"
        :class="segment.class"
        :style="{ width: `${100 / segments.length}%` }"
      ></div>
    </div>
    <span class="progress-label">{{ statusLabel }}</span>

    <!-- Styled Tooltip -->
    <Teleport to="body">
      <Transition name="tooltip">
        <div
          v-if="showTooltip"
          class="build-tooltip"
          :style="tooltipStyle"
        >
          <div class="tooltip-header">Build Progress</div>
          <div class="tooltip-rows">
            <div class="tooltip-row">
              <span class="segment-indicator" :class="segments[0]?.class"></span>
              <span class="segment-name">Seeds</span>
              <span class="segment-count">{{ displayedSeeds }}/{{ targetSeeds }}</span>
              <span class="segment-pct">{{ seedPct }}%</span>
            </div>
            <div class="tooltip-row">
              <span class="segment-indicator" :class="segments[1]?.class"></span>
              <span class="segment-name">LEGOs</span>
              <span class="segment-count">{{ stats.legos || 0 }}</span>
              <span class="segment-pct">{{ legoPct }}%</span>
            </div>
            <div class="tooltip-row">
              <span class="segment-indicator" :class="segments[2]?.class"></span>
              <span class="segment-name">Phrases</span>
              <span class="segment-count">{{ stats.phrases || 0 }}</span>
              <span class="segment-pct">{{ phrasePct }}%</span>
            </div>
            <div class="tooltip-row">
              <span class="segment-indicator" :class="segments[3]?.class"></span>
              <span class="segment-name">Audio</span>
              <span class="segment-count">{{ stats.audio || 0 }}</span>
              <span class="segment-pct">{{ audioPct }}%</span>
            </div>
          </div>
          <div class="tooltip-footer">
            <span class="status-badge" :class="statusClass">{{ statusLabel }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({})
  },
  contentStatus: {
    type: String,
    default: null
  },
  exportReady: {
    type: Boolean,
    default: false
  },
  targetSeeds: {
    type: Number,
    default: 300
  }
})

const showTooltip = ref(false)
const mousePos = ref({ x: 0, y: 0 })

// Status labels for the pipeline stages
const statusLabels = {
  empty: 'Empty',
  decomposing: 'Decomposing',
  needs_audio: 'Needs Audio',
  needs_export: 'Needs Export',
  ready: 'Ready'
}

// Display seeds capped at target (for cleaner UI when seeds > target)
const displayedSeeds = computed(() => {
  const completed = props.stats?.completedSeeds || 0
  const target = props.targetSeeds || 300
  // If we have more seeds than the target, show target as complete
  return Math.min(completed, target)
})

// Calculate completion percentages
const seedPct = computed(() => {
  const target = props.targetSeeds || 300
  return Math.min(100, Math.round(((props.stats?.completedSeeds || 0) / target) * 100))
})

const legoPct = computed(() => {
  if (!props.stats?.legos) return 0
  const target = props.targetSeeds || 300
  // LEGOs typically ~2x seeds
  return Math.min(100, Math.round(((props.stats?.completedSeeds || 0) / target) * 100))
})

const phrasePct = computed(() => {
  if (!props.stats?.phrases) return 0
  const target = props.targetSeeds || 300
  return Math.min(100, Math.round(((props.stats?.completedSeeds || 0) / target) * 100))
})

const audioPct = computed(() => {
  if (!props.stats?.audio) return 0
  const target = props.targetSeeds || 300
  // Rough estimate: ~10 audio files per seed
  return Math.min(100, Math.round((props.stats.audio / (target * 10)) * 100))
})

// Compute segments based on stats
const segments = computed(() => {
  return [
    { name: 'Seeds', class: getSegmentClass(seedPct.value) },
    { name: 'LEGOs', class: getSegmentClass(legoPct.value) },
    { name: 'Phrases', class: getSegmentClass(phrasePct.value) },
    { name: 'Audio', class: getSegmentClass(audioPct.value) }
  ]
})

function getSegmentClass(pct) {
  if (pct >= 100) return 'complete'
  if (pct >= 50) return 'partial'
  if (pct > 0) return 'started'
  return 'empty'
}

// Derive status from actual stats using correct pipeline logic
const statusLabel = computed(() => {
  const stats = props.stats || {}
  const targetSeeds = props.targetSeeds || 300
  const completedSeeds = stats.completedSeeds || 0
  const legos = stats.legos || 0
  const phrases = stats.phrases || 0
  const audio = stats.audio || 0

  // Export ready is the source of truth from Phase 9
  const exportReady = props.exportReady || false

  // Ignore system audio (shared audio files < 100)
  const meaningfulAudio = audio > 100

  // Ready: Phase 9 validated (export_ready = true)
  if (exportReady) {
    return 'Ready'
  }

  // Needs Export: Audio looks complete but Phase 9 hasn't validated
  if (meaningfulAudio && phrases > 0 && audio >= phrases * 2) {
    return 'Needs Export'
  }

  // Needs Audio: Content complete but audio not generated
  if (completedSeeds >= targetSeeds && phrases > 0) {
    return 'Needs Audio'
  }

  // Decomposing: LEGOs exist or working toward target
  if (legos > 0 || (completedSeeds > 0 && completedSeeds < targetSeeds)) {
    const pct = Math.min(100, Math.round((completedSeeds / targetSeeds) * 100))
    return `Decomposing ${pct}%`
  }

  return 'Empty'
})

const statusClass = computed(() => {
  const label = statusLabel.value.toLowerCase()
  // Handle "Decomposing X%" by extracting just "decomposing"
  if (label.startsWith('decomposing')) return 'status-decomposing'
  if (label === 'needs audio') return 'status-needs-audio'
  if (label === 'needs export') return 'status-needs-export'
  return `status-${label}`
})

// Tooltip positioning
const tooltipStyle = computed(() => {
  return {
    left: `${mousePos.value.x + 12}px`,
    top: `${mousePos.value.y + 12}px`
  }
})

// Track mouse for tooltip
function handleMouseMove(e) {
  mousePos.value = { x: e.clientX, y: e.clientY }
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
})
</script>

<style scoped>
.build-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 100px;
  cursor: default;
}

.progress-bar {
  display: flex;
  height: 6px;
  width: 48px;
  background: var(--surface);
  border-radius: 3px;
  overflow: hidden;
  gap: 1px;
}

.segment {
  height: 100%;
  transition: background-color 0.2s;
}

.segment.complete {
  background: #10b981;
}

.segment.partial {
  background: #3b82f6;
}

.segment.started {
  background: #f59e0b;
}

.segment.empty {
  background: var(--surface-2);
}

.progress-label {
  font-size: 0.75rem;
  color: var(--muted);
  white-space: nowrap;
}
</style>

<style>
/* Tooltip styles - unscoped for Teleport */
.build-tooltip {
  position: fixed;
  z-index: 10000;
  min-width: 200px;
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 8px;
  padding: 0;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 11px;
  overflow: hidden;
}

.build-tooltip .tooltip-header {
  padding: 8px 12px;
  background: var(--canvas);
  border-bottom: 1px solid var(--surface-2);
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.build-tooltip .tooltip-rows {
  padding: 8px 0;
}

.build-tooltip .tooltip-row {
  display: grid;
  grid-template-columns: 8px 60px 1fr 36px;
  gap: 8px;
  align-items: center;
  padding: 4px 12px;
}

.build-tooltip .segment-indicator {
  width: 6px;
  height: 6px;
  border-radius: 2px;
}

.build-tooltip .segment-indicator.complete {
  background: #10b981;
}

.build-tooltip .segment-indicator.partial {
  background: #3b82f6;
}

.build-tooltip .segment-indicator.started {
  background: #f59e0b;
}

.build-tooltip .segment-indicator.empty {
  background: var(--surface-2);
}

.build-tooltip .segment-name {
  color: var(--ink);
  font-weight: 500;
}

.build-tooltip .segment-count {
  color: var(--muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.build-tooltip .segment-pct {
  color: var(--faint);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.build-tooltip .tooltip-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--surface-2);
  background: var(--canvas);
}

.build-tooltip .status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.build-tooltip .status-badge.status-empty {
  background: rgba(100, 116, 139, 0.2);
  color: var(--faint);
}

.build-tooltip .status-badge.status-decomposing {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.build-tooltip .status-badge.status-needs-audio {
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
}

.build-tooltip .status-badge.status-needs-export {
  background: rgba(249, 115, 22, 0.2);
  color: #f97316;
}

.build-tooltip .status-badge.status-ready {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

/* Tooltip transitions */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
