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
              <span class="segment-count">{{ stats.completedSeeds || 0 }}/{{ targetSeeds }}</span>
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
  targetSeeds: {
    type: Number,
    default: 260
  }
})

const showTooltip = ref(false)
const mousePos = ref({ x: 0, y: 0 })

// Status labels matching the database enum
const statusLabels = {
  empty: 'Empty',
  seeds_only: 'Seeds',
  building: 'Building',
  audio_pending: 'Audio Pending',
  audio_generating: 'Generating',
  ready: 'Ready'
}

// Calculate completion percentages
const seedPct = computed(() => {
  const target = props.targetSeeds || 260
  return Math.min(100, Math.round(((props.stats?.completedSeeds || 0) / target) * 100))
})

const legoPct = computed(() => {
  if (!props.stats?.legos) return 0
  const target = props.targetSeeds || 260
  // LEGOs typically ~2x seeds
  return Math.min(100, Math.round(((props.stats?.completedSeeds || 0) / target) * 100))
})

const phrasePct = computed(() => {
  if (!props.stats?.phrases) return 0
  const target = props.targetSeeds || 260
  return Math.min(100, Math.round(((props.stats?.completedSeeds || 0) / target) * 100))
})

const audioPct = computed(() => {
  if (!props.stats?.audio) return 0
  const target = props.targetSeeds || 260
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

// Always derive status from actual stats (not stale database contentStatus)
const statusLabel = computed(() => {
  const stats = props.stats || {}
  if (stats.audio > 0) return 'Ready'
  if (stats.phrases > 0) return 'Audio Pending'
  if (stats.legos > 0) return 'Building'
  if (stats.completedSeeds > 0) return 'Seeds'
  return 'Empty'
})

const statusClass = computed(() => {
  const label = statusLabel.value.toLowerCase().replace(' ', '-')
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
  background: #1e293b;
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
  background: #334155;
}

.progress-label {
  font-size: 0.75rem;
  color: #94a3b8;
  white-space: nowrap;
}
</style>

<style>
/* Tooltip styles - unscoped for Teleport */
.build-tooltip {
  position: fixed;
  z-index: 10000;
  min-width: 200px;
  background: #1e293b;
  border: 1px solid #334155;
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
  background: #0f172a;
  border-bottom: 1px solid #334155;
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
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
  background: #334155;
}

.build-tooltip .segment-name {
  color: #e2e8f0;
  font-weight: 500;
}

.build-tooltip .segment-count {
  color: #94a3b8;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.build-tooltip .segment-pct {
  color: #64748b;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.build-tooltip .tooltip-footer {
  padding: 8px 12px;
  border-top: 1px solid #334155;
  background: #0f172a;
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
  color: #64748b;
}

.build-tooltip .status-badge.status-seeds {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.build-tooltip .status-badge.status-building {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.build-tooltip .status-badge.status-audio-pending {
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
}

.build-tooltip .status-badge.status-generating {
  background: rgba(236, 72, 153, 0.2);
  color: #ec4899;
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
