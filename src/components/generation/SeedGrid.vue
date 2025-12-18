<template>
  <div class="seed-grid-container">
    <!-- Header with summary -->
    <div class="grid-header">
      <span class="header-label">Seed Status</span>
      <div class="status-summary">
        <span class="summary-item complete">
          <span class="indicator">+</span>
          <span class="count">{{ completedCount }}</span>
        </span>
        <span class="summary-item failed">
          <span class="indicator">x</span>
          <span class="count">{{ failedCount }}</span>
        </span>
        <span class="summary-item processing">
          <span class="indicator">...</span>
          <span class="count">{{ processingCount }}</span>
        </span>
        <span class="summary-item pending">
          <span class="indicator">-</span>
          <span class="count">{{ pendingCount }}</span>
        </span>
      </div>
    </div>

    <!-- Grid of seed indicators -->
    <div class="seed-grid" :style="gridStyle">
      <div
        v-for="seedId in allSeeds"
        :key="seedId"
        class="seed-cell"
        :class="getSeedClass(seedId)"
        :title="`${seedId} - ${getSeedStatus(seedId)}`"
      >
        <span class="seed-symbol">{{ getSeedSymbol(seedId) }}</span>
      </div>
    </div>

    <!-- Legend -->
    <div class="grid-legend">
      <div class="legend-item">
        <span class="legend-indicator complete">+</span>
        <span class="legend-label">Complete</span>
      </div>
      <div class="legend-item">
        <span class="legend-indicator failed">x</span>
        <span class="legend-label">Failed</span>
      </div>
      <div class="legend-item">
        <span class="legend-indicator processing">...</span>
        <span class="legend-label">Processing</span>
      </div>
      <div class="legend-item">
        <span class="legend-indicator pending">-</span>
        <span class="legend-label">Pending</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  seeds: {
    type: Object,
    default: () => ({
      total: 0,
      pending: [],
      processing: [],
      completed: [],
      failed: []
    })
  },
  // Maximum columns in the grid
  maxColumns: {
    type: Number,
    default: 20
  }
})

// Computed
const allSeeds = computed(() => {
  // Combine all seed lists and sort
  const all = [
    ...(props.seeds.completed || []),
    ...(props.seeds.failed || []),
    ...(props.seeds.processing || []),
    ...(props.seeds.pending || [])
  ]
  // Sort by seed ID (S0001, S0002, etc.)
  return all.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0
    return numA - numB
  })
})

const completedCount = computed(() => props.seeds.completed?.length || 0)
const failedCount = computed(() => props.seeds.failed?.length || 0)
const processingCount = computed(() => props.seeds.processing?.length || 0)
const pendingCount = computed(() => props.seeds.pending?.length || 0)

const gridStyle = computed(() => {
  const count = allSeeds.value.length
  const cols = Math.min(count, props.maxColumns)
  return {
    gridTemplateColumns: `repeat(${cols}, 1fr)`
  }
})

// Methods
function getSeedStatus(seedId) {
  if (props.seeds.completed?.includes(seedId)) return 'complete'
  if (props.seeds.failed?.includes(seedId)) return 'failed'
  if (props.seeds.processing?.includes(seedId)) return 'processing'
  return 'pending'
}

function getSeedClass(seedId) {
  return `seed-${getSeedStatus(seedId)}`
}

function getSeedSymbol(seedId) {
  const status = getSeedStatus(seedId)
  switch (status) {
    case 'complete': return '+'
    case 'failed': return 'x'
    case 'processing': return '...'
    default: return '-'
  }
}
</script>

<style scoped>
.seed-grid-container {
  background: var(--void, #0f172a);
  border: 1px solid var(--border, #334155);
  border-radius: 8px;
  padding: 1rem;
}

/* Header */
.grid-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.header-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, #64748b);
}

.status-summary {
  display: flex;
  gap: 0.75rem;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-family: 'SF Mono', Monaco, monospace;
}

.summary-item .indicator {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 700;
}

.summary-item.complete .indicator {
  background: rgba(34, 197, 94, 0.2);
  color: var(--success, #22c55e);
}

.summary-item.failed .indicator {
  background: rgba(239, 68, 68, 0.2);
  color: var(--error, #ef4444);
}

.summary-item.processing .indicator {
  background: rgba(16, 185, 129, 0.2);
  color: var(--accent, #10b981);
}

.summary-item.pending .indicator {
  background: var(--elevated, #334155);
  color: var(--text-muted, #64748b);
}

.summary-item .count {
  color: var(--text-dim, #94a3b8);
}

/* Grid */
.seed-grid {
  display: grid;
  gap: 3px;
  margin-bottom: 0.75rem;
}

.seed-cell {
  aspect-ratio: 1;
  min-width: 20px;
  max-width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 700;
  cursor: default;
  transition: transform 0.1s, background 0.2s;
}

.seed-cell:hover {
  transform: scale(1.15);
  z-index: 1;
}

.seed-cell.seed-complete {
  background: rgba(34, 197, 94, 0.2);
  color: var(--success, #22c55e);
}

.seed-cell.seed-complete:hover {
  background: rgba(34, 197, 94, 0.35);
}

.seed-cell.seed-failed {
  background: rgba(239, 68, 68, 0.2);
  color: var(--error, #ef4444);
}

.seed-cell.seed-failed:hover {
  background: rgba(239, 68, 68, 0.35);
}

.seed-cell.seed-processing {
  background: rgba(16, 185, 129, 0.2);
  color: var(--accent, #10b981);
  animation: pulse 1.5s ease-in-out infinite;
}

.seed-cell.seed-processing:hover {
  background: rgba(16, 185, 129, 0.35);
}

.seed-cell.seed-pending {
  background: var(--elevated, #334155);
  color: var(--text-muted, #64748b);
}

.seed-cell.seed-pending:hover {
  background: var(--border-light, #475569);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.seed-symbol {
  line-height: 1;
}

/* Legend */
.grid-legend {
  display: flex;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border, #334155);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.legend-indicator {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 700;
}

.legend-indicator.complete {
  background: rgba(34, 197, 94, 0.2);
  color: var(--success, #22c55e);
}

.legend-indicator.failed {
  background: rgba(239, 68, 68, 0.2);
  color: var(--error, #ef4444);
}

.legend-indicator.processing {
  background: rgba(16, 185, 129, 0.2);
  color: var(--accent, #10b981);
}

.legend-indicator.pending {
  background: var(--elevated, #334155);
  color: var(--text-muted, #64748b);
}

.legend-label {
  font-size: 0.6875rem;
  color: var(--text-muted, #64748b);
}
</style>
