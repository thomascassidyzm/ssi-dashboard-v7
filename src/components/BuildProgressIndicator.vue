<template>
  <div class="build-progress" :title="tooltipText">
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
  </div>
</template>

<script setup>
import { computed } from 'vue'

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

// Status labels matching the database enum
const statusLabels = {
  empty: 'Empty',
  seeds_only: 'Seeds',
  building: 'Building',
  audio_pending: 'Audio Pending',
  audio_generating: 'Generating',
  ready: 'Ready'
}

// Compute segments based on stats
// Each segment: Seeds | LEGOs | Phrases | Audio
const segments = computed(() => {
  const stats = props.stats || {}
  const target = props.targetSeeds || 260

  // Calculate completion percentages
  const seedPct = Math.min(100, ((stats.completedSeeds || 0) / target) * 100)
  const legoPct = Math.min(100, stats.legos > 0 ? ((stats.completedSeeds || 0) / target) * 100 : 0)
  const phrasePct = Math.min(100, stats.phrases > 0 ? ((stats.completedSeeds || 0) / target) * 100 : 0)
  const audioPct = Math.min(100, stats.audio > 0 ? (stats.audio / (target * 10)) * 100 : 0) // Rough estimate

  return [
    { name: 'Seeds', class: getSegmentClass(seedPct) },
    { name: 'LEGOs', class: getSegmentClass(legoPct) },
    { name: 'Phrases', class: getSegmentClass(phrasePct) },
    { name: 'Audio', class: getSegmentClass(audioPct) }
  ]
})

function getSegmentClass(pct) {
  if (pct >= 100) return 'complete'
  if (pct >= 50) return 'partial'
  if (pct > 0) return 'started'
  return 'empty'
}

// Determine status label from contentStatus or derive from stats
const statusLabel = computed(() => {
  if (props.contentStatus && statusLabels[props.contentStatus]) {
    return statusLabels[props.contentStatus]
  }

  // Derive from stats
  const stats = props.stats || {}
  if (stats.audio > 0) return 'Ready'
  if (stats.phrases > 0) return 'Audio Pending'
  if (stats.legos > 0) return 'Building'
  if (stats.completedSeeds > 0) return 'Seeds'
  return 'Empty'
})

const tooltipText = computed(() => {
  const stats = props.stats || {}
  return `Seeds: ${stats.completedSeeds || 0}/${props.targetSeeds} | LEGOs: ${stats.legos || 0} | Phrases: ${stats.phrases || 0} | Audio: ${stats.audio || 0}`
})
</script>

<style scoped>
.build-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 100px;
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
