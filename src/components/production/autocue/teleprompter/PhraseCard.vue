<template>
  <div class="phrase-card" :class="state">
    <div class="phrase-marker">
      <span v-if="uploaded" class="uploaded-dot"></span>
      <span v-if="state === 'done'">✓</span>
      <span v-else-if="state === 'current'" class="current-marker">══►</span>
      <span v-else>○</span>
    </div>

    <div class="phrase-content">
      <!-- Slow cadence label -->
      <div v-if="isSlowCadence" class="cadence-label">SLOW</div>

      <!-- Normal display -->
      <div v-if="!showGaps" class="phrase-text" :class="{ 'slow-cadence': isSlowCadence }">
        {{ phrase.text }}
      </div>

      <!-- Gap markers for Pass 2 -->
      <div v-else class="phrase-with-gaps" :class="{ 'slow-cadence': isSlowCadence }">
        <template v-for="(segment, i) in gapSegments" :key="i">
          <span class="word-segment">{{ segment }}</span>
          <span v-if="i < gapSegments.length - 1" class="gap-marker"></span>
        </template>
      </div>

      <div class="phrase-translation" v-if="phrase.translation">
        {{ phrase.translation }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  phrase: { type: Object, required: true },
  state: { type: String, default: 'upcoming' }, // done, current, upcoming
  showGaps: { type: Boolean, default: false },
  uploaded: { type: Boolean, default: false }
})

// Slow cadence detection — from phrase's own cadence field (optimizer mode)
const isSlowCadence = computed(() => props.phrase.cadence === 'slow')

// Split text into segments for gap display
const gapSegments = computed(() => {
  if (!props.phrase.text) return []
  // Split by spaces for simple word-by-word gaps
  return props.phrase.text.split(' ')
})
</script>

<style scoped>
.phrase-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border-left: 3px solid transparent;
}

.phrase-marker {
  font-size: 1.2rem;
  min-width: 50px;
  text-align: center;
  flex-shrink: 0;
}

/* State: Done */
.phrase-card.done {
  opacity: 0.35;
}

.phrase-card.done .phrase-marker {
  color: var(--color-emerald, #06ffa5);
}

.phrase-card.done .phrase-text {
  color: var(--color-paper-dim, #c1c1bb);
  text-decoration: line-through;
  text-decoration-color: var(--color-emerald, #06ffa5);
  text-decoration-thickness: 1px;
}

/* State: Current */
.phrase-card.current {
  opacity: 1;
  background: linear-gradient(90deg, transparent, rgba(255, 166, 48, 0.1), transparent);
  border-left-color: var(--color-tungsten, #ffa630);
  box-shadow: 0 0 20px rgba(255, 166, 48, 0.2);
}

.phrase-card.current .phrase-marker {
  color: var(--color-tungsten, #ffa630);
  font-size: 1.5rem;
}

.phrase-card.current .phrase-text,
.phrase-card.current .phrase-with-gaps {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-tungsten, #ffa630);
  text-shadow: 0 0 20px rgba(255, 186, 92, 0.4);
}

/* State: Upcoming */
.phrase-card.upcoming {
  opacity: 0.6;
}

.phrase-card.upcoming .phrase-marker {
  color: var(--color-paper-dim, #c1c1bb);
}

.phrase-content {
  flex: 1;
}

.phrase-text {
  font-family: 'Crimson Pro', serif;
  font-size: 1.6rem;
  font-weight: 500;
  color: var(--color-paper, #f7f7f2);
  line-height: 1.4;
  transition: all 0.5s ease;
}

.phrase-with-gaps {
  font-family: 'Crimson Pro', serif;
  font-size: 1.6rem;
  font-weight: 500;
  color: var(--color-paper, #f7f7f2);
  line-height: 1.8;
}

.word-segment {
  display: inline-block;
  padding: 0.2rem 0.4rem;
}

.gap-marker {
  display: inline-block;
  width: 40px;
  height: 4px;
  background: var(--color-tungsten, #ffa630);
  margin: 0 0.75rem;
  border-radius: 2px;
  vertical-align: middle;
  animation: gapPulse 2.5s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(255, 166, 48, 0.6);
}

@keyframes gapPulse {
  0%, 100% { opacity: 0.5; transform: scaleX(1); }
  50% { opacity: 1; transform: scaleX(1.15); }
}

/* Slow cadence treatment */
.cadence-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  color: var(--color-tungsten, #ffa630);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 0.25rem;
  opacity: 0.8;
}

.slow-cadence {
  color: var(--color-tungsten, #ffa630) !important;
}

.phrase-card.current .slow-cadence {
  text-shadow: 0 0 20px rgba(255, 166, 48, 0.6);
}

/* Uploaded indicator */
.uploaded-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-emerald, #06ffa5);
  box-shadow: 0 0 6px rgba(6, 255, 165, 0.6);
  margin-right: 0.25rem;
  vertical-align: middle;
}

.phrase-translation {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  color: var(--color-paper-dim, #c1c1bb);
  font-style: italic;
  margin-top: 0.5rem;
}
</style>
