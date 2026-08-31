<template>
  <div class="chunk-progress" v-if="expected > 1">
    <!-- One pip per LEGO piece, in reading order. This is the whole point:
         while the recordist is mid-phrase they can see which piece they are on
         and that the previous one landed, instead of finding out after the
         session (or never). -->
    <div class="pip-row" :aria-label="`Piece ${Math.min(done + 1, expected)} of ${expected}`">
      <span
        v-for="i in expected"
        :key="i"
        class="pip"
        :class="pipClass(i - 1)"
      >{{ i }}</span>
    </div>

    <!-- The pause window, drawn. Nothing in the studio has ever shown that a
         pause has to last a certain length to register, so a recordist whose
         pauses were consistently a shade too quick had no way to find out. The
         bar fills as the silence grows and turns green the instant the pause
         is long enough to count — the same poll that actually counts it. -->
    <div class="pause-lane" :class="paused ? (registered ? 'is-registered' : 'is-holding') : 'is-idle'">
      <div class="pause-track">
        <div class="pause-fill" :style="{ width: fillPercent + '%' }"></div>
        <div class="pause-threshold" :style="{ left: thresholdPercent + '%' }"></div>
      </div>
      <span class="pause-caption">{{ caption }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // How many LEGO pieces this phrase is read in.
  expected: { type: Number, default: 1 },
  // Boundaries the VAD has counted so far in the take being read. Also the
  // index of the piece now being read: after piece 1 and its pause, done === 1.
  done: { type: Number, default: 0 },
  // Length of the silence in progress, ms. 0 while speaking.
  silenceMs: { type: Number, default: 0 },
  // The length a pause must reach to count (VAD chunkPauseDuration).
  thresholdMs: { type: Number, default: 400 }
})

// The lane is scaled so the threshold sits a third of the way along: a pause
// that only just registers looks only just registered, and there is room to see
// a long one running on.
const laneMs = computed(() => props.thresholdMs * 3)
const thresholdPercent = computed(() => Math.round((props.thresholdMs / laneMs.value) * 100))
const fillPercent = computed(() =>
  Math.min(100, Math.round((props.silenceMs / laneMs.value) * 100))
)

// A dip only reads as a pause once it is long enough to be worth drawing —
// below the aligner's own 150ms floor it is a gap between words, not a pause.
//
// Keyed on silenceMs alone, and NOT on the VAD's isSpeaking. isSpeaking means
// "a take is open", and it stays true right through a mid-phrase pause — which
// is the whole point of the slow-cadence tolerance. Gating on it left the
// caption stuck on "Reading piece N" through every pause the recordist made,
// i.e. silent at exactly the moment they needed to be told something. Caught
// by the e2e timeline, which never once saw "Hold the pause".
const paused = computed(() => props.silenceMs >= 150)
const registered = computed(() => props.silenceMs >= props.thresholdMs)

// The piece being read now, 1-based. `done` counts boundaries, so after the
// pause that closes piece 1 it is 1 and piece 2 is up.
const piece = computed(() => Math.min(props.done + 1, props.expected))
// Only true once the pause AFTER the last piece has landed — that is the whole
// phrase read, and the only moment it is honest to say so. Keying this off
// `done >= expected - 1` instead said "that is the phrase — done" while the
// last piece was still to come; caught by the e2e timeline.
const finished = computed(() => props.done >= props.expected)

const caption = computed(() => {
  if (!paused.value) {
    if (finished.value) return 'That is the phrase — done'
    const last = piece.value === props.expected ? ' — last one' : ''
    return `Reading piece ${piece.value} of ${props.expected}${last}`
  }
  if (!registered.value) return 'Hold the pause…'
  return finished.value ? 'That is the phrase — done' : 'Pause registered — next piece'
})

function pipClass(index) {
  if (index < props.done) return 'done'
  if (index === props.done) return 'current'
  return 'upcoming'
}
</script>

<style scoped>
.chunk-progress {
  /* Pinned to the screen for the same reason the refusal panel is: at 390px
     this sat in the page above a 500px teleprompter that auto-scrolls, so the
     one thing a recordist needs to glance at MID-READ was off the top of the
     viewport. An indicator you have to scroll to is not an indicator.
     Bottom edge, because that is where a thumb-held phone's spare screen is
     and the eye is already travelling down the script. */
  position: fixed;
  left: 8px;
  right: 8px;
  bottom: 10px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 12px;
  /* Opaque: it overlays live content. */
  background: var(--surface);
  border: 1px solid var(--line);
}

@media (min-width: 720px) {
  .chunk-progress {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: 560px;
  }
}

.pip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

/* Tap-target sized even though these are not tappable: on a 390px phone held
   at arm's length while reading a script, anything smaller cannot be read at a
   glance, which is the only way it will ever be read. */
.pip {
  flex: 1 1 auto;
  min-width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  border: 1px solid var(--line);
  color: var(--muted);
  background: var(--surface-2);
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.pip.done {
  background: var(--success);
  border-color: var(--success);
  color: var(--canvas);
}

.pip.current {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
}

.pause-lane {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.pause-track {
  position: relative;
  height: 10px;
  border-radius: 5px;
  background: var(--surface-3);
  overflow: hidden;
}

.pause-fill {
  height: 100%;
  border-radius: 5px;
  background: var(--accent);
  transition: width 0.05s linear;
}

.is-registered .pause-fill {
  background: var(--success);
}

.is-idle .pause-fill {
  background: var(--faint);
}

/* Where the pause starts counting. A recordist can watch the bar cross it. */
.pause-threshold {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  background: var(--ink);
  opacity: 0.75;
}

.pause-caption {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--muted);
}

.is-holding .pause-caption {
  color: var(--accent);
}

.is-registered .pause-caption {
  color: var(--success);
}
</style>
