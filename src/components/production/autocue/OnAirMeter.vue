<template>
  <!--
    ON AIR — the reassurance that the mic is hot, and NOT a gate.

    Sascha recorded 34 takes on 2026-08-21 whose openings were cut off at
    capture, and had no way to see that anything was being heard at all. The
    capture fix (63cfcc52e) is what makes an early start safe: a recorder now
    runs from startFlow, so the front of a word spoken before the studio looks
    ready is already in the pre-roll. This panel exists so the speaker can SEE
    that, not so they have to wait for it.

    Two rules follow, and both are load-bearing:

    1. The lamp is lit the whole time the stream is live — through calibration,
       through every take, and through every gap between takes. It never blinks
       off at a take boundary, because the stream is never unobserved. A lamp
       that went dark between takes would teach exactly the wrong lesson: that
       there are moments when speaking is not safe.
    2. Nothing here ever says "wait". The copy says the session is on air and
       takes are cut from the stream, which is what actually happens.

    The meter is the speaker's own level, continuously — the point is that it
    is ALWAYS moving, so stillness means a dead mic and not a quiet moment.
  -->
  <div class="onair" :class="{ 'is-live': live }" data-feature="on-air-meter-2026-08-21">
    <div class="onair-lamp" role="status" :aria-label="ariaLabel">
      <span class="onair-dot" aria-hidden="true"></span>
      <span class="onair-word">ON AIR</span>
    </div>

    <!-- Segmented, broadcast-style. Segments rather than one sliding bar
         because a segment lighting up is legible in peripheral vision, and the
         recordist is reading a script, not watching this. -->
    <div class="onair-meter" aria-hidden="true">
      <span
        v-for="(seg, i) in SEGMENTS"
        :key="i"
        class="onair-seg"
        :class="[seg.zone, { on: i < litSegments }]"
      ></span>
    </div>

    <p class="onair-line">{{ statusLine }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Raw VAD RMS, 0..1, updated every poll (50ms) whether or not anyone is
  // speaking. See useVAD.pollAudioLevel.
  level: { type: Number, default: 0 },
  // Is the stream live? True from startFlow — before the first phrase is on
  // screen — until the session ends.
  live: { type: Boolean, default: false },
  // The room measurement runs at the top of a session. The stream is already
  // hot during it, so the lamp stays lit; only the words change.
  calibrating: { type: Boolean, default: false },
  // Whether the VAD currently believes this is speech. Colours the meter only.
  // Deliberately NOT a gate and never phrased as permission.
  speaking: { type: Boolean, default: false }
})

const SEGMENT_COUNT = 16
// Bottom third reads as room tone, the middle is a healthy read, the top two
// are the approach to clipping. Zones are cosmetic — no behaviour hangs on them.
const SEGMENTS = Array.from({ length: SEGMENT_COUNT }, (_, i) => ({
  zone: i >= SEGMENT_COUNT - 2 ? 'hot' : i >= SEGMENT_COUNT - 6 ? 'high' : 'low'
}))

// Same x300 scaling the old thin bar used, so this reads identically to what
// recordists have already been looking at: the 0.02 silence threshold lands
// just above the first segment and an ordinary read sits mid-to-high.
const litSegments = computed(() => {
  const pct = Math.min(100, Math.max(0, (props.level || 0) * 300))
  return Math.round((pct / 100) * SEGMENT_COUNT)
})

const statusLine = computed(() => {
  if (!props.live) return 'Microphone off'
  if (props.calibrating) return 'On air — measuring the room, stay quiet for a moment'
  // No "ready", no "you may now speak". The session is hot; takes are cut out
  // of the stream afterwards, so there is nothing to wait for.
  return 'On air — start whenever you like, takes are cut from the stream'
})

const ariaLabel = computed(() =>
  props.live ? 'On air, microphone is live' : 'Microphone off'
)

defineExpose({ litSegments, statusLine })
</script>

<style scoped>
.onair {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.onair-lamp {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.35);
  white-space: nowrap;
}

.onair-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
}

.is-live .onair-lamp { color: #ff4d4d; }
.is-live .onair-dot {
  background: #ff2d2d;
  box-shadow: 0 0 8px 2px rgba(255, 45, 45, 0.55);
}

.onair-meter {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  flex: 1;
  min-width: 90px;
  height: 18px;
}

.onair-seg {
  flex: 1;
  height: 100%;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.09);
  /* Fast enough that the meter tracks the voice rather than lagging behind it —
     a laggy meter is worse than none, because it desynchronises the speaker
     from their own level. */
  transition: background-color 60ms linear;
}

.onair-seg.on.low { background: #3ddc84; }
.onair-seg.on.high { background: #ffd23f; }
.onair-seg.on.hot { background: #ff5252; }

.onair-line {
  margin: 0;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .onair-seg { transition: none; }
}
</style>
