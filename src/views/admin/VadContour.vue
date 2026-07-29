<script setup>
/**
 * VadContour — the VAD Lab's live contour view. Draws the energy envelope
 * (the actual feature the metric scores) for one clip or an overlaid pair,
 * with a moving playhead synced to playback, syllable-peak ticks on the
 * axis, and an optional EXPERIMENTAL pitch-shape track (register-normalised
 * semitones — display only, never scored; melody is voice-dominated).
 *
 * Props are plain arrays so the same component serves precomputed study
 * contours and live record-yourself extractions.
 */
import { computed } from 'vue'

const props = defineProps({
  a: { type: Array, required: true }, // energy contour, z-scored, ~150 pts
  b: { type: Array, default: null },
  sylTA: { type: Array, default: () => [] }, // syllable peak times, fraction 0..1
  sylTB: { type: Array, default: () => [] },
  f0A: { type: Array, default: null }, // semitones re own median (experimental)
  f0B: { type: Array, default: null },
  // playhead: which side is playing ('a' | 'b' | ''), fraction 0..1 of that clip
  playSide: { type: String, default: '' },
  playFrac: { type: Number, default: 0 },
  // when the b-series is DTW-warped onto a's axis, bmap[j] = a-index for b-index j
  bmap: { type: Array, default: null },
  showPitch: { type: Boolean, default: true },
})

const W = 640
const H = 150
const HP = 84 // pitch track height
const PAD = 8

function poly(series, lo, hi, height) {
  return series
    .map((v, i) => {
      const x = PAD + (i / (series.length - 1)) * (W - 2 * PAD)
      const c = Math.max(lo, Math.min(hi, v))
      const y = height - PAD - ((c - lo) / (hi - lo)) * (height - 2 * PAD)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

const polyA = computed(() => poly(props.a, -2.6, 2.6, H))
const polyB = computed(() => (props.b ? poly(props.b, -2.6, 2.6, H) : ''))
const polyF0A = computed(() => (props.f0A ? poly(props.f0A, -8, 8, HP) : ''))
const polyF0B = computed(() => (props.f0B ? poly(props.f0B, -8, 8, HP) : ''))

// map a fraction of clip-b's own timeline onto the a-axis when warped
function bFracToX(frac) {
  if (!props.bmap || !props.bmap.length) return frac
  const j = Math.max(0, Math.min(props.bmap.length - 1, Math.round(frac * (props.bmap.length - 1))))
  return props.bmap[j] / (props.a.length - 1)
}

const playX = computed(() => {
  if (!props.playSide) return null
  const f = Math.max(0, Math.min(1, props.playFrac))
  const frac = props.playSide === 'b' ? bFracToX(f) : f
  return PAD + frac * (W - 2 * PAD)
})

const ticksA = computed(() => props.sylTA.map((f) => PAD + f * (W - 2 * PAD)))
const ticksB = computed(() => props.sylTB.map((f) => PAD + bFracToX(f) * (W - 2 * PAD)))
const hasPitch = computed(() => props.showPitch && (props.f0A || props.f0B))
</script>

<template>
  <div class="vc">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" role="img" aria-label="Energy contour">
      <line :x1="PAD" :y1="H / 2" :x2="W - PAD" :y2="H / 2" class="vc-mid" />
      <!-- syllable-peak ticks on the axis -->
      <line v-for="(x, i) in ticksA" :key="'ta' + i" :x1="x" :y1="H - 10" :x2="x" :y2="H - 2" class="vc-tick vc-tick-a" />
      <line v-for="(x, i) in ticksB" :key="'tb' + i" :x1="x" :y1="H - 10" :x2="x" :y2="H - 2" class="vc-tick vc-tick-b" />
      <polyline :points="polyA" class="vc-a" />
      <polyline v-if="polyB" :points="polyB" class="vc-b" />
      <line v-if="playX != null" :x1="playX" :y1="2" :x2="playX" :y2="H - 2" class="vc-play" :class="'vc-play-' + playSide" />
    </svg>
    <div v-if="hasPitch" class="vc-pitch">
      <svg :viewBox="`0 0 ${W} ${HP}`" preserveAspectRatio="none" role="img" aria-label="Pitch shape (experimental)">
        <line :x1="PAD" :y1="HP / 2" :x2="W - PAD" :y2="HP / 2" class="vc-mid" />
        <polyline v-if="polyF0A" :points="polyF0A" class="vc-a vc-thin" />
        <polyline v-if="polyF0B" :points="polyF0B" class="vc-b vc-thin" />
        <line v-if="playX != null && playSide !== 'b'" :x1="playX" :y1="2" :x2="playX" :y2="HP - 2" class="vc-play" />
      </svg>
      <span class="vc-pitch-label"
        >pitch shape · EXPERIMENTAL — register-normalised (semitones re own median), raw
        time, never scored: melody tracks the voice (AUC 0.464)</span
      >
    </div>
  </div>
</template>

<style scoped>
.vc svg {
  width: 100%;
  display: block;
  background: var(--surface-1, rgba(255, 255, 255, 0.02));
  border: 1px solid var(--surface-3);
  border-radius: 8px;
}
.vc > svg { height: 150px; }
.vc-pitch svg { height: 84px; margin-top: 6px; border-style: dashed; }
.vc-mid { stroke: var(--surface-3); stroke-width: 1; stroke-dasharray: 3 4; }
.vc-a { fill: none; stroke: #3987e5; stroke-width: 2; stroke-linejoin: round; }
.vc-b { fill: none; stroke: #d95926; stroke-width: 2; stroke-linejoin: round; }
.vc-thin { stroke-width: 1.5; opacity: 0.9; }
[data-theme='light'] .vc-a { stroke: #2a78d6; }
[data-theme='light'] .vc-b { stroke: #eb6834; }
.vc-tick { stroke-width: 1.5; opacity: 0.8; }
.vc-tick-a { stroke: #3987e5; }
.vc-tick-b { stroke: #d95926; transform: translateY(-9px); }
.vc-play { stroke: var(--color-paper, #fff); stroke-width: 1.5; opacity: 0.85; }
.vc-play-b { stroke: #d95926; }
.vc-pitch-label { display: block; margin-top: 4px; font-size: 0.6875rem; color: #fbbf24; font-style: italic; }
[data-theme='light'] .vc-pitch-label { color: #92400e; }
</style>
