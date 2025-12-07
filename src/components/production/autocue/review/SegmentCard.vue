<template>
  <div class="segment-card" :class="segment.confidenceLevel">
    <div class="segment-header">
      <div class="segment-label">{{ segment.label }}</div>
      <div class="confidence-badge" :class="segment.confidenceLevel">
        {{ segment.confidence }}% {{ confidenceLabel }}
      </div>
    </div>

    <div class="segment-text">"{{ segment.text }}"</div>

    <div class="segment-meta">
      <span>Duration: {{ segment.duration }}s</span>
      <span :class="{ 'has-issue': segment.issues?.length }">
        {{ segment.issues?.length ? '⚠ ' + segment.issues[0] : segment.quality }}
      </span>
    </div>

    <div class="segment-waveform">
      <div
        v-for="i in 8"
        :key="i"
        class="waveform-bar"
        :style="{ height: getBarHeight(i) + '%' }"
      ></div>
    </div>

    <div class="segment-actions">
      <button class="segment-btn" @click="$emit('play', segment)">
        <span class="btn-icon">▶</span> Play
      </button>
      <button class="segment-btn" @click="$emit('redo', segment)">
        <span class="btn-icon">↻</span> Redo
      </button>
      <button class="segment-btn approve" @click="$emit('approve', segment)">
        <span class="btn-icon">✓</span> Approve
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  segment: { type: Object, required: true }
})

defineEmits(['play', 'redo', 'approve'])

const confidenceLabel = computed(() => {
  if (props.segment.confidenceLevel === 'high') return 'High'
  if (props.segment.confidenceLevel === 'medium') return 'Med'
  return 'Low'
})

// Generate random waveform bar heights based on segment id
function getBarHeight(index) {
  const seed = props.segment.id?.charCodeAt(4) || 1
  const heights = [40, 60, 80, 100, 85, 70, 50, 30]
  const offset = seed % 8
  return heights[(index + offset) % 8]
}
</script>

<style scoped>
.segment-card {
  background: var(--color-shadow, #1e293b);
  border-radius: 12px;
  padding: 1rem;
  border-left: 4px solid var(--color-graphite, #475569);
  transition: all 0.3s ease;
}

.segment-card.high {
  border-left-color: var(--color-emerald, #06ffa5);
}

.segment-card.medium {
  border-left-color: var(--color-tungsten, #ffa630);
}

.segment-card.low {
  border-left-color: var(--color-film-red, #e63946);
}

.segment-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.segment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.segment-label {
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-paper, #f7f7f2);
}

.confidence-badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.confidence-badge.high {
  background: rgba(6, 255, 165, 0.2);
  color: var(--color-emerald, #06ffa5);
}

.confidence-badge.medium {
  background: rgba(255, 166, 48, 0.2);
  color: var(--color-tungsten, #ffa630);
}

.confidence-badge.low {
  background: rgba(230, 57, 70, 0.2);
  color: var(--color-film-red, #e63946);
}

.segment-text {
  font-family: 'Crimson Pro', serif;
  font-size: 1.2rem;
  color: var(--color-paper-dim, #c1c1bb);
  margin-bottom: 0.75rem;
  font-style: italic;
}

.segment-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.segment-meta .has-issue {
  color: var(--color-tungsten, #ffa630);
}

.segment-waveform {
  height: 60px;
  background: var(--color-void, #0f172a);
  border-radius: 6px;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 0.5rem;
}

.waveform-bar {
  flex: 1;
  background: var(--color-emerald, #06ffa5);
  border-radius: 2px;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.segment-card.medium .waveform-bar {
  background: var(--color-tungsten, #ffa630);
}

.segment-card.low .waveform-bar {
  background: var(--color-film-red, #e63946);
}

.segment-card:hover .waveform-bar {
  opacity: 0.9;
}

.segment-actions {
  display: flex;
  gap: 0.5rem;
}

.segment-btn {
  flex: 1;
  background: var(--color-void, #0f172a);
  border: 1px solid var(--color-graphite, #475569);
  color: var(--color-paper, #f7f7f2);
  padding: 0.5rem;
  border-radius: 6px;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.btn-icon {
  font-size: 0.9em;
}

.segment-btn:hover {
  background: var(--color-tungsten, #ffa630);
  color: var(--color-void, #0f172a);
  border-color: var(--color-tungsten, #ffa630);
}

.segment-btn.approve:hover {
  background: var(--color-emerald, #06ffa5);
  border-color: var(--color-emerald, #06ffa5);
}
</style>
