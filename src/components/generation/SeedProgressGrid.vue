<template>
  <div class="seed-progress-grid">
    <!-- Ambient scan effect -->
    <div class="scan-line" :class="{ active: isLoading }"></div>

    <!-- Header Stats Bar -->
    <header class="stats-bar">
      <div class="stats-label">
        <span class="label-prefix">SEED</span>
        <span class="label-main">PHASE MATRIX</span>
      </div>

      <div class="phase-stats">
        <div class="stat-block" v-for="(stat, idx) in phaseStats" :key="idx">
          <span class="stat-phase">{{ stat.label }}</span>
          <span class="stat-divider">/</span>
          <span class="stat-value" :class="{ complete: stat.count === targetSeedCount }">
            {{ stat.count }}
          </span>
          <span class="stat-total">{{ targetSeedCount }}</span>
          <div class="stat-bar">
            <div
              class="stat-fill"
              :style="{ width: `${(stat.count / targetSeedCount) * 100}%` }"
              :class="`phase-${idx + 1}`"
            ></div>
          </div>
        </div>
      </div>

      <button class="refresh-btn" @click="handleRefresh" :disabled="isLoading">
        <svg viewBox="0 0 16 16" fill="currentColor" :class="{ spinning: isLoading }">
          <path d="M5.56 2.91A6 6 0 1 1 2 8a.5.5 0 0 1 1 0 5 5 0 1 0 2.95-4.563.5.5 0 1 1-.39-.927z"/>
          <path d="M5 4v2.5H2.5a.5.5 0 0 1 0-1H4V4a.5.5 0 0 1 1 0z"/>
        </svg>
      </button>
    </header>

    <!-- Grid Container -->
    <div class="grid-viewport" ref="gridViewport">
      <div class="grid-inner" :style="gridStyle">
        <div
          v-for="seed in displaySeeds"
          :key="seed.seed"
          class="seed-cell"
          @mouseenter="hoveredSeed = seed"
          @mouseleave="hoveredSeed = null"
          :class="{ hovered: hoveredSeed?.seed === seed.seed }"
        >
          <div class="phase-bar p1" :class="{ done: seed.phase1 }"></div>
          <div class="phase-bar p2" :class="{ done: seed.phase2 }"></div>
          <div class="phase-bar p3" :class="{ done: seed.phase3 }"></div>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <Transition name="tooltip">
        <div
          v-if="hoveredSeed"
          class="seed-tooltip"
          :style="tooltipStyle"
        >
          <div class="tooltip-header">
            <span class="tooltip-seed">{{ hoveredSeed.seedId }}</span>
          </div>
          <div class="tooltip-phases">
            <div class="tooltip-phase" :class="{ done: hoveredSeed.phase1 }">
              <span class="phase-dot"></span>
              <span class="phase-name">P1</span>
              <span class="phase-status">{{ hoveredSeed.phase1 ? 'DONE' : '---' }}</span>
            </div>
            <div class="tooltip-phase" :class="{ done: hoveredSeed.phase2 }">
              <span class="phase-dot"></span>
              <span class="phase-name">P2</span>
              <span class="phase-status">{{ hoveredSeed.phase2 ? 'DONE' : '---' }}</span>
            </div>
            <div class="tooltip-phase" :class="{ done: hoveredSeed.phase3 }">
              <span class="phase-dot"></span>
              <span class="phase-name">P3</span>
              <span class="phase-status">{{ hoveredSeed.phase3 ? 'DONE' : '---' }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Legend -->
    <footer class="grid-legend">
      <div class="legend-phases">
        <div class="legend-item">
          <div class="legend-bar p1"></div>
          <span>Phase 1</span>
        </div>
        <div class="legend-item">
          <div class="legend-bar p2"></div>
          <span>Phase 2</span>
        </div>
        <div class="legend-item">
          <div class="legend-bar p3"></div>
          <span>Phase 3</span>
        </div>
      </div>
      <div class="legend-status">
        <div class="legend-item">
          <div class="legend-swatch pending"></div>
          <span>Pending</span>
        </div>
        <div class="legend-item">
          <div class="legend-swatch complete"></div>
          <span>Complete</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  targetSeedCount: {
    type: Number,
    default: 668
  },
  seedProgress: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['refresh'])

const gridViewport = ref(null)
const hoveredSeed = ref(null)
const isLoading = ref(false)
const mousePos = ref({ x: 0, y: 0 })

// Generate display seeds - fill gaps with empty state
const displaySeeds = computed(() => {
  const seedMap = new Map()

  // Map existing progress by seed number
  props.seedProgress.forEach(s => {
    seedMap.set(s.seed, s)
  })

  // Generate full list with defaults for missing
  const seeds = []
  for (let i = 1; i <= props.targetSeedCount; i++) {
    if (seedMap.has(i)) {
      seeds.push(seedMap.get(i))
    } else {
      seeds.push({
        seed: i,
        seedId: `S${String(i).padStart(4, '0')}`,
        phase1: false,
        phase2: false,
        phase3: false
      })
    }
  }
  return seeds
})

// Phase completion stats
const phaseStats = computed(() => [
  {
    label: 'P1',
    count: displaySeeds.value.filter(s => s.phase1).length
  },
  {
    label: 'P2',
    count: displaySeeds.value.filter(s => s.phase2).length
  },
  {
    label: 'P3',
    count: displaySeeds.value.filter(s => s.phase3).length
  }
])

// Dynamic grid columns based on seed count
const gridStyle = computed(() => {
  const count = props.targetSeedCount
  let cols = 56 // Default for 668 (12 rows)

  if (count <= 10) cols = 10
  else if (count <= 50) cols = 10
  else if (count <= 250) cols = 25

  return {
    gridTemplateColumns: `repeat(${cols}, 1fr)`
  }
})

// Tooltip positioning
const tooltipStyle = computed(() => {
  if (!hoveredSeed.value) return {}
  return {
    left: `${mousePos.value.x + 12}px`,
    top: `${mousePos.value.y + 12}px`
  }
})

// Track mouse for tooltip
function handleMouseMove(e) {
  mousePos.value = { x: e.clientX, y: e.clientY }
}

function handleRefresh() {
  isLoading.value = true
  emit('refresh')
  // Reset loading state after animation
  setTimeout(() => {
    isLoading.value = false
  }, 1000)
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
})
</script>

<style scoped>
/* ================================================
   SEED PROGRESS GRID - Mission Control Aesthetic
   ================================================ */

.seed-progress-grid {
  --void: #0a0f1a;
  --surface: #111827;
  --elevated: var(--surface);
  --border: var(--surface-2);
  --text-dim: var(--faint);
  --text-muted: var(--muted);
  --text-bright: var(--ink);

  /* Phase Colors */
  --p1: #3b82f6;
  --p1-dim: rgba(59, 130, 246, 0.15);
  --p2: #8b5cf6;
  --p2-dim: rgba(139, 92, 246, 0.15);
  --p3: #10b981;
  --p3-dim: rgba(16, 185, 129, 0.15);

  --pending: var(--surface);
  --pending-border: var(--surface-2);

  position: relative;
  background: var(--void);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
}

/* Scan line effect */
.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--p3), transparent);
  opacity: 0;
  z-index: 10;
  pointer-events: none;
}

.scan-line.active {
  animation: scan 1.5s ease-in-out;
}

@keyframes scan {
  0% {
    top: 0;
    opacity: 0.8;
  }
  100% {
    top: 100%;
    opacity: 0;
  }
}

/* ================================================
   STATS BAR
   ================================================ */

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.stats-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label-prefix {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  text-transform: uppercase;
}

.label-main {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--text-bright);
  text-transform: uppercase;
}

.phase-stats {
  display: flex;
  gap: 24px;
}

.stat-block {
  display: flex;
  align-items: baseline;
  gap: 4px;
  position: relative;
}

.stat-phase {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 0.05em;
}

.stat-divider {
  font-size: 10px;
  color: var(--border);
}

.stat-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  min-width: 32px;
  text-align: right;
}

.stat-value.complete {
  color: var(--p3);
}

.stat-total {
  font-size: 11px;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}

.stat-bar {
  position: absolute;
  bottom: -6px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--pending);
  border-radius: 1px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  border-radius: 1px;
  transition: width 0.5s ease-out;
}

.stat-fill.phase-1 { background: var(--p1); }
.stat-fill.phase-2 { background: var(--p2); }
.stat-fill.phase-3 { background: var(--p3); }

.refresh-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-dim);
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--elevated);
  color: var(--text-bright);
  border-color: var(--text-dim);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn svg {
  width: 14px;
  height: 14px;
}

.refresh-btn svg.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ================================================
   GRID
   ================================================ */

.grid-viewport {
  padding: 16px;
  background: var(--void);
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.grid-viewport::-webkit-scrollbar {
  width: 6px;
}

.grid-viewport::-webkit-scrollbar-track {
  background: transparent;
}

.grid-viewport::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.grid-inner {
  display: grid;
  gap: 3px;
}

/* ================================================
   SEED CELL - The heart of the visualization
   ================================================ */

.seed-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px;
  background: var(--surface);
  border-radius: 2px;
  cursor: default;
  transition: transform 0.15s, background 0.15s;
  min-width: 12px;
  aspect-ratio: 1;
}

.seed-cell:hover,
.seed-cell.hovered {
  transform: scale(1.4);
  z-index: 5;
  background: var(--elevated);
  box-shadow: 0 0 0 1px var(--border);
}

.phase-bar {
  flex: 1;
  border-radius: 1px;
  transition: background 0.2s;
}

.phase-bar.p1 {
  background: var(--p1-dim);
}

.phase-bar.p1.done {
  background: var(--p1);
}

.phase-bar.p2 {
  background: var(--p2-dim);
}

.phase-bar.p2.done {
  background: var(--p2);
}

.phase-bar.p3 {
  background: var(--p3-dim);
}

.phase-bar.p3.done {
  background: var(--p3);
}

/* ================================================
   TOOLTIP
   ================================================ */

.seed-tooltip {
  position: fixed;
  z-index: 1000;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
}

.tooltip-header {
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.tooltip-seed {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-bright);
  letter-spacing: 0.05em;
}

.tooltip-phases {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tooltip-phase {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-dim);
}

.tooltip-phase.done {
  color: var(--text-muted);
}

.tooltip-phase .phase-dot {
  width: 6px;
  height: 6px;
  border-radius: 1px;
  background: var(--pending);
}

.tooltip-phase.done .phase-dot {
  background: var(--p3);
}

.tooltip-phase .phase-name {
  font-weight: 600;
  width: 20px;
}

.tooltip-phase .phase-status {
  font-variant-numeric: tabular-nums;
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

/* ================================================
   LEGEND
   ================================================ */

.grid-legend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--surface);
  border-top: 1px solid var(--border);
}

.legend-phases,
.legend-status {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.legend-bar {
  width: 16px;
  height: 4px;
  border-radius: 2px;
}

.legend-bar.p1 { background: var(--p1); }
.legend-bar.p2 { background: var(--p2); }
.legend-bar.p3 { background: var(--p3); }

.legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-swatch.pending {
  background: var(--pending);
  border: 1px solid var(--border);
}

.legend-swatch.complete {
  background: var(--p3);
}

/* ================================================
   RESPONSIVE
   ================================================ */

@media (max-width: 640px) {
  .stats-bar {
    flex-wrap: wrap;
    gap: 12px;
  }

  .phase-stats {
    gap: 16px;
    order: 3;
    width: 100%;
  }

  .seed-cell {
    min-width: 8px;
  }
}
</style>
