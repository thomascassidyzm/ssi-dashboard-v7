<template>
  <!-- Gated by the same inject as every other piece of teaching copy. The live
       recorder has no notion of tutorial steps and must never grow a step
       counter — see tutorialMode.js. -->
  <nav v-if="on" ref="navRef" class="tutorial-progress" aria-label="Tutorial progress">
    <ol class="steps">
      <li
        v-for="(s, i) in steps"
        :key="s.key"
        :ref="(el) => setStepRef(el, i)"
        class="step"
        :class="{ done: i < current, now: i === current }"
      >
        <span class="dot" aria-hidden="true"></span>
        <span class="label">{{ s.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useTutorialMode } from './tutorialMode'

const props = defineProps({
  steps: { type: Array, required: true },   // [{ key, label }]
  current: { type: Number, default: 0 },
})

const on = useTutorialMode()

// Ten steps do not fit across a 390 px phone, so the strip scrolls sideways
// inside itself. Left alone, the later steps sit off-screen and the recordist
// gets no sense of where they are — so keep the ACTIVE step in view.
const navRef = ref(null)
const stepEls = []
function setStepRef(el, i) {
  if (el) stepEls[i] = el
}

watch(() => props.current, async (i) => {
  await nextTick()
  const nav = navRef.value
  const el = stepEls[i]
  if (!nav || !el) return
  // scrollIntoView would also scroll the PAGE on some engines; move the strip's
  // own scrollLeft instead so the recording screen never jumps under them.
  nav.scrollTo({
    left: Math.max(0, el.offsetLeft - (nav.clientWidth / 2) + (el.offsetWidth / 2)),
    behavior: 'smooth',
  })
}, { immediate: true })
</script>

<style scoped>
.tutorial-progress {
  position: relative;
  z-index: 1;
  margin: 0 0 1.5rem;
  /* A long spine at phone width scrolls sideways INSIDE this strip rather than
     widening the page — the studio itself must never scroll horizontally. */
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.steps {
  display: flex;
  align-items: flex-start;
  gap: 0;
  list-style: none;
  margin: 0;
  padding: 0 0 0.25rem;
  min-width: max-content;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  flex: 0 0 auto;
  padding: 0 0.55rem;
  position: relative;
}

/* The connecting rail, drawn between dots rather than as a separate element. */
.step:not(:first-child)::before {
  content: '';
  position: absolute;
  top: 5px;
  right: 50%;
  left: -50%;
  height: 2px;
  background: var(--color-graphite, var(--surface-3));
}

.step.done::before,
.step.now::before {
  background: var(--color-emerald, #06ffa5);
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-graphite, var(--surface-3));
  position: relative;
  z-index: 1;
}

.step.done .dot { background: var(--color-emerald, #06ffa5); }

.step.now .dot {
  background: var(--color-tungsten, var(--accent));
  box-shadow: 0 0 0 4px rgba(255, 166, 48, 0.22);
}

.label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-paper-dim, var(--muted));
  white-space: nowrap;
}

.step.now .label {
  color: var(--color-tungsten, var(--accent));
  font-weight: 600;
}

.step.done .label { color: var(--color-paper-dim, var(--muted)); }
</style>
