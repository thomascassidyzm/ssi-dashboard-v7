<template>
  <div class="segment-card" :class="[segment.confidenceLevel, status]">
    <div class="segment-header">
      <div class="segment-label">
        {{ segment.label }}
        <span v-if="status" class="verdict-badge" :class="status">
          {{ status === 'approved' ? '✓ Approved' : '↻ Redo' }}
        </span>
      </div>
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
      <button
        class="segment-btn"
        :class="{ playing }"
        :disabled="!hasAudio"
        :title="hasAudio ? 'Play this take' : 'No audio captured for this phrase'"
        @click="$emit('play', segment)"
      >
        <span class="btn-icon">{{ playing ? '⏸' : '▶' }}</span> {{ playing ? 'Playing' : 'Play' }}
      </button>
      <button
        class="segment-btn redo"
        :class="{ active: status === 'rejected' }"
        :title="status === 'rejected' ? 'Queued for re-record — click to undo' : 'Queue this take for re-record'"
        @click="$emit('redo', segment)"
      >
        <span class="btn-icon">↻</span> {{ status === 'rejected' ? 'Queued' : 'Redo' }}
      </button>
      <button
        class="segment-btn approve"
        :class="{ active: status === 'approved' }"
        :title="status === 'approved' ? 'Approved for upload — click to undo' : 'Approve this take for upload'"
        @click="$emit('approve', segment)"
      >
        <span class="btn-icon">✓</span> {{ status === 'approved' ? 'Approved' : 'Approve' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  segment: { type: Object, required: true },
  playing: { type: Boolean, default: false },
  // 'approved' | 'rejected' | null — the verdict this card is carrying, so the
  // Approve/Redo clicks land somewhere the recordist can actually see.
  status: { type: String, default: null }
})

defineEmits(['play', 'redo', 'approve'])

// A card with no captured audio says so on the button instead of offering a
// control that can only ever be silent.
const hasAudio = computed(() => !!props.segment.audioUrl)

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
  background: var(--color-shadow, var(--surface));
  border-radius: 12px;
  padding: 1rem;
  border-left: 4px solid var(--color-graphite, var(--surface-3));
  transition: all 0.3s ease;
}

.segment-card.high {
  border-left-color: var(--color-emerald, #06ffa5);
}

.segment-card.medium {
  border-left-color: var(--color-tungsten, var(--accent));
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
  color: var(--color-paper, var(--ink));
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
  color: var(--color-tungsten, var(--accent));
}

.confidence-badge.low {
  background: rgba(230, 57, 70, 0.2);
  color: var(--color-film-red, #e63946);
}

.segment-text {
  font-family: 'Crimson Pro', serif;
  font-size: 1.2rem;
  color: var(--color-paper-dim, var(--muted));
  margin-bottom: 0.75rem;
  font-style: italic;
}

.segment-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-paper-dim, var(--muted));
}

.segment-meta .has-issue {
  color: var(--color-tungsten, var(--accent));
}

.segment-waveform {
  height: 60px;
  background: var(--color-void, var(--canvas));
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
  background: var(--color-tungsten, var(--accent));
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
  background: var(--color-void, var(--canvas));
  border: 1px solid var(--color-graphite, var(--surface-3));
  color: var(--color-paper, var(--ink));
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

.segment-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.segment-btn:disabled:hover {
  background: var(--color-void, var(--canvas));
  color: var(--color-paper, var(--ink));
  border-color: var(--color-graphite, var(--surface-3));
}

.segment-btn.playing {
  background: var(--color-tungsten, var(--accent));
  color: var(--color-void, var(--canvas));
  border-color: var(--color-tungsten, var(--accent));
}

.segment-btn:hover {
  background: var(--color-tungsten, var(--accent));
  color: var(--color-void, var(--canvas));
  border-color: var(--color-tungsten, var(--accent));
}

.segment-btn.approve:hover {
  background: var(--color-emerald, #06ffa5);
  border-color: var(--color-emerald, #06ffa5);
}

/* A verdict has to be visible from across the booth, not just remembered. */
.segment-btn.approve.active {
  background: var(--color-emerald, #06ffa5);
  border-color: var(--color-emerald, #06ffa5);
  color: var(--color-void, var(--canvas));
}

.segment-btn.redo.active {
  background: var(--color-film-red, #e63946);
  border-color: var(--color-film-red, #e63946);
  color: var(--color-void, var(--canvas));
}

.segment-card.approved {
  border-left-color: var(--color-emerald, #06ffa5);
  box-shadow: inset 0 0 0 1px rgba(6, 255, 165, 0.25);
}

.segment-card.rejected {
  border-left-color: var(--color-film-red, #e63946);
  opacity: 0.75;
}

.verdict-badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  margin-left: 0.5rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.verdict-badge.approved {
  background: rgba(6, 255, 165, 0.2);
  color: var(--color-emerald, #06ffa5);
}

.verdict-badge.rejected {
  background: rgba(230, 57, 70, 0.2);
  color: var(--color-film-red, #e63946);
}

:root[data-theme="light"] .verdict-badge.approved {
  background: rgba(4, 120, 87, 0.14);
  color: #03543c;
}

:root[data-theme="light"] .verdict-badge.rejected {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}

/* Light-mode refinements: dark mode untouched.
   The confidence-badge backgrounds bake neon-tinted rgba that, in light mode,
   sit pale under the re-themed (darker) token text and fail WCAG AA. Replace
   with theme-token tints + darker borders, and lift the faint button border. */
:root[data-theme="light"] .confidence-badge.high {
  background: rgba(4, 120, 87, 0.14);
  color: #03543c;
}

:root[data-theme="light"] .confidence-badge.medium {
  background: rgba(168, 85, 8, 0.14);
  color: #8a4607;
}

:root[data-theme="light"] .confidence-badge.low {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}

:root[data-theme="light"] .segment-btn {
  border-color: var(--line);
}

:root[data-theme="light"] .segment-card:hover {
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
}
</style>
