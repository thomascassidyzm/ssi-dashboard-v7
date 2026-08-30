<template>
  <!-- Gated like all teaching material. See tutorialMode.js. -->
  <figure v-if="on" class="beat-window">
    <div class="scale">
      <div
        v-for="b in bands"
        :key="b.key"
        class="band"
        :class="b.key"
        :style="{ width: b.pct + '%' }"
      ></div>

      <!-- Boundary labels, positioned on the SAME percentages the bands are
           drawn at. They were laid out as a sibling flex row before, and the
           bands' own text pushed their widths off the arithmetic, so "150 ms"
           pointed at nothing. Absolute positioning off one number each removes
           the content from the equation entirely. -->
      <span
        v-for="t in ticks"
        :key="t.ms"
        class="tick"
        :style="{ left: t.pct + '%' }"
      >
        <i class="tick-rule" aria-hidden="true"></i>
        <em class="tick-label">{{ t.ms }} ms</em>
      </span>
    </div>

    <ul class="legend">
      <li><i class="key too-short"></i>Under {{ BEAT_WINDOW.minMs }} ms — two pieces come out fused</li>
      <li><i class="key good"></i>Aim here — about {{ BEAT_WINDOW.aimMs }} ms, definite rather than long</li>
      <li><i class="key too-long"></i>Over {{ BEAT_WINDOW.maxMs }} ms — continuous mode moves on without you</li>
    </ul>

    <figcaption>
      In phrase-by-phrase mode only the left wall exists, so a generous pause costs
      nothing. In continuous mode both walls are live.
    </figcaption>
  </figure>
</template>

<script setup>
/**
 * The two walls, drawn to scale FROM THE CONSTANTS rather than from prose, so
 * the picture cannot drift from the code. BEAT_WINDOW.minMs mirrors
 * SPLICE_CONFIG.SILENCE_MIN_MS (align-audio.cjs / takeSplice.js) and
 * BEAT_WINDOW.maxMs mirrors useContinuousRecorder's silenceDuration — if either
 * moves, this redraws itself.
 */
import { computed } from 'vue'
import { useTutorialMode } from './tutorialMode'
import { BEAT_WINDOW } from './tutorialScript'

const on = useTutorialMode()

// Show a bit of runway past the upper wall so it reads as a wall rather than
// the end of the axis.
const AXIS_MAX = BEAT_WINDOW.maxMs * 1.4
const pct = (ms) => (ms / AXIS_MAX) * 100

const bands = computed(() => [
  { key: 'too-short', pct: pct(BEAT_WINDOW.minMs) },
  { key: 'good', pct: pct(BEAT_WINDOW.maxMs - BEAT_WINDOW.minMs) },
  { key: 'too-long', pct: pct(AXIS_MAX - BEAT_WINDOW.maxMs) },
])

const ticks = computed(() => [
  { ms: BEAT_WINDOW.minMs, pct: pct(BEAT_WINDOW.minMs) },
  { ms: BEAT_WINDOW.maxMs, pct: pct(BEAT_WINDOW.maxMs) },
])
</script>

<style scoped>
.beat-window {
  margin: 1.25rem 0 0;
  text-align: left;
}

.scale {
  display: flex;
  height: 22px;
  border-radius: 6px;
  overflow: visible;
  position: relative;
  /* Room underneath for the boundary labels. */
  margin-bottom: 2.1rem;
}

.band {
  height: 100%;
  flex: 0 0 auto;
}

.band:first-child { border-radius: 6px 0 0 6px; }
.band:last-child { border-radius: 0 6px 6px 0; }

.too-short { background: var(--color-film-red, #e63946); }
.good { background: var(--color-emerald, #06ffa5); }
.too-long { background: var(--color-tungsten, var(--accent)); }

.tick {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tick-rule {
  display: block;
  width: 2px;
  height: 30px;
  background: var(--color-paper, var(--ink));
  opacity: 0.55;
}

.tick-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.68rem;
  font-style: normal;
  color: var(--color-paper-dim, var(--muted));
  white-space: nowrap;
  margin-top: 0.15rem;
}

.legend {
  list-style: none;
  margin: 0;
  padding: 0;
}

.legend li {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.9rem;
  line-height: 1.45;
  margin-bottom: 0.35rem;
}

.key {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex: 0 0 auto;
  margin-top: 0.28rem;
}

figcaption {
  margin-top: 0.7rem;
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.9rem;
  line-height: 1.5;
}
</style>
