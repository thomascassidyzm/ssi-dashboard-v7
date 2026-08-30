<template>
  <!--
    The studio's own room-calibration / level strip, lifted VERBATIM from
    AutocueStudio.vue's recording phase (markup and CSS both — it scopes its
    styles, so the rules have to be present here to render the same thing).

    Deliberately NOT gated by TUTORIAL_MODE: every string in here is the real
    studio's own wording, shown to real recordists. It is extracted only because
    the tutorial draws this strip on two different screens (phrase-by-phrase and
    continuous) and duplicating it twice invites drift. No teaching copy lives
    here — that all belongs in tutorialScript.js.
  -->
  <div v-if="calibrating" class="vad-calibrating">
    <div class="vad-bar" :style="{ width: `${percent}%` }"></div>
    <span class="vad-status">Listening to the room — stay quiet for a moment...</span>
  </div>

  <div
    v-else-if="warn"
    class="vad-noise-warning"
    :class="`quality-${calibration.quality}`"
  >
    <strong>{{ calibration.quality === 'too-loud' ? 'Too noisy to record' : 'Background noise' }}</strong>
    <span>{{ calibration.message }}</span>
  </div>

  <div v-if="recording && !calibrating" class="vad-indicator">
    <div class="vad-bar" :style="{ width: `${percent}%` }"></div>
    <span class="vad-status">{{ speaking ? 'Speaking...' : 'Listening...' }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  calibrating: { type: Boolean, default: false },
  calibration: { type: Object, default: null },
  recording: { type: Boolean, default: false },
  speaking: { type: Boolean, default: false },
  percent: { type: Number, default: 0 },
})

// Only surface the room measurement when it is bad news — "nice and quiet" is
// one more thing to read on a screen the recordist is trying to read a script
// off. Same rule as AutocueStudio's `calibrationWarning`.
const warn = computed(
  () => props.calibration?.quality === 'loud' || props.calibration?.quality === 'too-loud'
)
</script>

<style scoped>
.vad-indicator,
.vad-calibrating {
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px;
  padding: 0.5rem 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  overflow: hidden;
  position: relative;
}

.vad-calibrating {
  border-color: var(--color-tungsten, var(--accent));
}

.vad-bar {
  height: 4px;
  background: var(--color-emerald, #06ffa5);
  border-radius: 2px;
  transition: width 0.05s linear;
  min-width: 2px;
  box-shadow: 0 0 8px rgba(6, 255, 165, 0.5);
}

.vad-status {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
  white-space: nowrap;
}

.vad-noise-warning {
  border-radius: 8px;
  padding: 0.5rem 1rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.8rem;
  line-height: 1.35;
}

.vad-noise-warning strong {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.vad-noise-warning.quality-loud {
  background: rgba(255, 186, 92, 0.12);
  border: 1px solid var(--color-tungsten, var(--accent));
  color: var(--color-tungsten, var(--accent));
}

.vad-noise-warning.quality-too-loud {
  background: rgba(255, 92, 92, 0.14);
  border: 1px solid var(--color-crimson, #ff5c5c);
  color: var(--color-crimson, #ff5c5c);
}
</style>
