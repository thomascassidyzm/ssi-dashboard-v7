<template>
  <!-- A slow read whose pauses did not come out right is NOT a take. Until this
       existed the studio filed it, ticked the line green and moved on, so a
       recordist could produce a whole session of unusable slow passes and be
       told the whole way through that they were succeeding. This is deliberately
       the loudest thing on the screen. -->
  <div class="slow-retry" role="alert" aria-live="assertive">
    <div class="retry-head">
      <span class="retry-icon">✕</span>
      <span class="retry-title">Read that one again</span>
    </div>

    <p class="retry-count">{{ countLine }}</p>

    <!-- Heard against expected, side by side, so "too few" and "too many" are
         one glance apart rather than a sentence to parse. -->
    <div class="retry-pips">
      <span
        v-for="i in expected"
        :key="`e${i}`"
        class="retry-pip"
        :class="i <= detected ? 'heard' : 'missed'"
      >{{ i }}</span>
      <span
        v-for="i in Math.max(0, detected - expected)"
        :key="`x${i}`"
        class="retry-pip extra"
      >+</span>
    </div>

    <p class="retry-advice">{{ advice }}</p>

    <div class="retry-actions">
      <button class="retry-again" @click="$emit('again')">Record it again</button>
      <template v-if="attempts >= 2">
        <button class="retry-keep" @click="$emit('keep')">Keep this take anyway</button>
        <button class="retry-skip" @click="$emit('skip')">Skip this line</button>
      </template>
    </div>
    <p v-if="attempts >= 2" class="retry-attempts">
      {{ attempts }} tries on this line. Keeping it files a take the aligner will refuse to cut.
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // LEGO pieces the script says this phrase is read in.
  expected: { type: Number, required: true },
  // Pieces the recorder actually heard, from the pauses in the take.
  detected: { type: Number, required: true },
  // Pauses that were made but were too short to count — the difference between
  // "you did not pause" and "you paused too quickly", which is the only thing
  // the recordist can act on.
  shortPauses: { type: Number, default: 0 },
  // How long a pause has to last to count, ms.
  thresholdMs: { type: Number, default: 400 },
  // Attempts already made on THIS line, including the one being refused.
  attempts: { type: Number, default: 1 }
})

defineEmits(['again', 'keep', 'skip'])

const countLine = computed(() => {
  const heard = props.detected === 1
    ? 'Heard 1 piece'
    : `Heard ${props.detected} pieces`
  return `${heard} — the script has ${props.expected}.`
})

// Half a second, said the way a person counts it, rather than "400ms".
const holdWords = computed(() =>
  props.thresholdMs >= 450 ? 'a full second' : 'about half a second'
)

const advice = computed(() => {
  if (props.detected > props.expected) {
    return 'Too many pauses. Read each piece straight through and only pause at the ▬ markers.'
  }
  if (props.shortPauses > 0) {
    return `Your pauses were too quick to register. Hold each ▬ for ${holdWords.value} before carrying on.`
  }
  return `Pause at every ▬ marker — hold each one for ${holdWords.value}.`
})
</script>

<style scoped>
.slow-retry {
  /* Pinned to the bottom of the SCREEN, not placed in the page.
     The first version of this sat in the document above the teleprompter, on
     the reasoning that the eye is already on the script. At 390px it was
     scrolled clean off the top of the viewport by the teleprompter's own
     auto-scroll — the e2e screenshot showed a recording session with no sign
     of the refusal anywhere on the phone. A panel that has to be scrolled to
     is exactly the "little message" this replaces.
     Bottom, not top: the top-right corner is the fixed REC pill's, and the
     buttons belong under the thumb of a hand holding a phone. */
  position: fixed;
  left: 8px;
  right: 8px;
  bottom: 10px;
  z-index: 60;
  max-height: 78vh;
  overflow-y: auto;
  border: 3px solid #ff3b30;
  border-radius: 16px;
  /* Opaque, not a wash: it sits over live content and has to be readable. */
  background: var(--canvas, #12161f);
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.55), 0 0 0 9999px rgba(0, 0, 0, 0.35);
  padding: 1rem;
  animation: retryFlash 0.9s ease-in-out 3;
}

/* Wider screens: keep it a panel rather than a stretched banner. */
@media (min-width: 720px) {
  .slow-retry {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: 560px;
  }
}

@keyframes retryFlash {
  0%, 100% { border-color: #ff3b30; }
  50% { border-color: #fff; }
}

@media (prefers-reduced-motion: reduce) {
  .slow-retry { animation: none; }
}

.retry-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.retry-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #ff3b30;
  color: #fff;
  font-weight: 800;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.retry-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: #ff3b30;
}

.retry-count {
  margin: 0 0 0.6rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ink, #fff);
}

.retry-pips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.6rem;
}

.retry-pip {
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 700;
  border: 2px solid;
}

.retry-pip.heard {
  border-color: var(--color-emerald, #06ffa5);
  color: var(--color-emerald, #06ffa5);
  background: rgba(6, 255, 165, 0.12);
}

/* A piece the recordist never gave the recorder — drawn as a hole, not as a
   dimmed version of a good one. */
.retry-pip.missed {
  border-style: dashed;
  border-color: #ff3b30;
  color: #ff3b30;
  background: transparent;
}

.retry-pip.extra {
  border-color: #ff3b30;
  color: #fff;
  background: #ff3b30;
}

.retry-advice {
  margin: 0 0 0.9rem;
  font-size: 1.05rem;
  line-height: 1.4;
  color: var(--ink, #fff);
}

.retry-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* One-handed on a 390px screen: full-width, 52px tall, thumb-reachable. */
.retry-actions button {
  width: 100%;
  min-height: 52px;
  border-radius: 12px;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  border: 2px solid transparent;
}

.retry-again {
  background: #ff3b30;
  color: #fff;
}

.retry-keep,
.retry-skip {
  background: transparent;
  border-color: var(--line, rgba(255, 255, 255, 0.3)) !important;
  color: var(--muted, rgba(255, 255, 255, 0.75));
}

.retry-attempts {
  margin: 0.6rem 0 0;
  font-size: 0.85rem;
  color: var(--muted, rgba(255, 255, 255, 0.6));
}
</style>
