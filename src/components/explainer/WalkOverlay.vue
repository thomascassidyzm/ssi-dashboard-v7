<script setup>
// WalkOverlay — the ONE "how this works clip" overlay, mounted once in
// App.vue, rendering whichever clip useWalkthrough holds. Ported from
// ssi-learning-app (types stripped, restyled onto Popty's tokens).
//
// The grammar: user-paced Back/Next, step dots, pulse ring on the anchored
// element, Skip always visible — anchored to REAL elements by reference
// (getBoundingClientRect), never heuristics, and never a modal trap: the page
// underneath stays fully interactive (the overlay is pointer-events:none
// except the card itself).
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useWalkthrough, ANCHOR_TIMEOUT_MS, effectiveAdvance } from '@/walkthrough/useWalkthrough'
import { placeCard, isAnchorUsable, PAD, TOP_CHROME_PX } from '@/walkthrough/overlayPlacement'

const { activeWalk, stepIndex, showingTerminal, currentStep, chainedWalk, stopWalk, startWalk, next, back } = useWalkthrough()
const route = useRoute()

// A clip belongs to the page it was offered on — navigating away ends it.
watch(() => route.path, (to, from) => {
  if (activeWalk.value && to !== from) stopWalk()
})

// ─── Anchor resolution: live element lookup with a bounded wait ───
const anchorEl = ref(null)
const anchorTimedOut = ref(false)
const rect = ref(null)
let pollTimer = null
let timeoutTimer = null
let clickTarget = null

function onAnchorClick() {
  if (currentStep.value && effectiveAdvance(currentStep.value) === 'click') next()
}

function detachClick() {
  if (clickTarget) {
    clickTarget.removeEventListener('click', onAnchorClick, true)
    clickTarget = null
  }
}

function clearTimers() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null }
}

function bindAnchor(el) {
  anchorEl.value = el
  anchorTimedOut.value = false
  rect.value = el.getBoundingClientRect()
  // Oversized anchors (taller than the viewport) scroll to their top edge —
  // block:'center' on a 5000px element lands mid-nowhere.
  const oversize = rect.value.height > window.innerHeight * 0.7
  el.scrollIntoView({ block: oversize ? 'start' : 'center', behavior: 'smooth' })
  const step = currentStep.value
  // effectiveAdvance, not the raw pack value: a click-advance on a destructive
  // or money-spending anchor degrades to show-and-point even if a stale pack
  // slipped past the compiler's denylist gate.
  const mode = step ? effectiveAdvance(step) : 'next'
  if (mode === 'click') {
    detachClick()
    clickTarget = el
    // Capture-phase listener: the element's own handler still runs — the clip
    // observes the user's real tap, it never intercepts or performs it.
    el.addEventListener('click', onAnchorClick, true)
  } else if (mode === 'visible') {
    // A "visible" step exists to wait for this element — it has now arrived.
    next()
  }
}

function resolveAnchor() {
  clearTimers()
  detachClick()
  anchorEl.value = null
  anchorTimedOut.value = false
  rect.value = null
  const step = currentStep.value
  if (!activeWalk.value || showingTerminal.value || !step) return
  // An element that exists but occupies no space (v-show off, hidden ancestor)
  // is NOT a usable anchor — binding it would ring 0,0.
  const find = () => {
    const el = document.querySelector(`[data-walk="${step.anchor}"]`)
    return el && isAnchorUsable(el.getBoundingClientRect()) ? el : null
  }
  const now = find()
  if (now) { bindAnchor(now); return }
  pollTimer = setInterval(() => {
    const el = find()
    if (el) { clearTimers(); bindAnchor(el) }
  }, 150)
  timeoutTimer = setTimeout(() => {
    // Never hang: show the step's text unanchored, Next always available — but
    // keep a slow poll going so a late-arriving anchor still re-binds.
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
    timeoutTimer = null
    anchorTimedOut.value = true
    pollTimer = setInterval(() => {
      const el = find()
      if (el) { clearTimers(); bindAnchor(el) }
    }, 500)
  }, ANCHOR_TIMEOUT_MS)
}

watch([activeWalk, stepIndex, showingTerminal], resolveAnchor, { immediate: true })

// Track the anchor's geometry while active (scroll, layout shifts, resize).
let trackTimer = null
function retrack() {
  if (anchorEl.value?.isConnected) {
    const r = anchorEl.value.getBoundingClientRect()
    if (isAnchorUsable(r)) rect.value = r
    else resolveAnchor() // element collapsed to zero size (hidden) — re-resolve
  } else if (anchorEl.value) {
    resolveAnchor() // element unmounted (e.g. panel closed)
  }
}
watch(activeWalk, (walk) => {
  if (walk && !trackTimer) {
    trackTimer = setInterval(retrack, 200)
    window.addEventListener('scroll', retrack, { passive: true, capture: true })
    window.addEventListener('resize', retrack, { passive: true })
  } else if (!walk && trackTimer) {
    clearInterval(trackTimer)
    trackTimer = null
    window.removeEventListener('scroll', retrack, true)
    window.removeEventListener('resize', retrack)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  clearTimers()
  detachClick()
  if (trackTimer) clearInterval(trackTimer)
  window.removeEventListener('scroll', retrack, true)
  window.removeEventListener('resize', retrack)
})

// ─── Geometry ───
// AppNavbar publishes its own measured height as --app-navbar-height; read it
// per clip so the card never covers the nav escape (fallback = TOP_CHROME_PX).
const topChrome = ref(TOP_CHROME_PX)
watch(activeWalk, (walk) => {
  if (!walk) return
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-navbar-height'))
  topChrome.value = Number.isFinite(v) && v > 0 ? v : TOP_CHROME_PX
}, { immediate: true })

const ringStyle = computed(() => {
  const r = rect.value
  if (!r) return null
  return {
    top: `${r.top - PAD}px`,
    left: `${r.left - PAD}px`,
    width: `${r.width + PAD * 2}px`,
    height: `${r.height + PAD * 2}px`,
  }
})

// placeCard owns the numbers — including the escape-hatch invariant: the card
// never covers the navbar, and bottom-center clears the home indicator.
const cardStyle = computed(() => {
  const unanchored = !rect.value || showingTerminal.value || anchorTimedOut.value
  return placeCard(unanchored ? null : rect.value, window.innerWidth, window.innerHeight, topChrome.value)
})

// Markdown-lite: **bold** only, escaped first (same rule as HowThisWorks).
function renderSay(text) {
  const escaped = String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

const cardText = computed(() => {
  if (showingTerminal.value) return activeWalk.value?.steps[activeWalk.value.steps.length - 1]?.terminal ?? ''
  return currentStep.value?.say ?? ''
})
const isClickStep = computed(() =>
  !showingTerminal.value && !anchorTimedOut.value &&
  !!currentStep.value && effectiveAdvance(currentStep.value) === 'click')
const isLastStep = computed(() => !!activeWalk.value && stepIndex.value === activeWalk.value.steps.length - 1)
const atEnd = computed(() => showingTerminal.value || (isLastStep.value && !activeWalk.value?.steps[stepIndex.value]?.terminal))
const nextLabel = computed(() => (atEnd.value ? 'Done' : 'Next'))
// Founder ruling: a clip is fewer than five steps, so a longer journey is
// chained. At the end, the next clip is offered — never auto-played.
const showChain = computed(() => atEnd.value && !!chainedWalk.value)
// The choice kind is what the step IS — surfaced as a tiny kicker so the user
// knows whether they are clicking, setting or toggling.
const choiceLabel = computed(() => (showingTerminal.value ? '' : currentStep.value?.choice ?? ''))
</script>

<template>
  <div v-if="activeWalk" class="walk-overlay" data-walk-overlay>
    <!-- Pulse ring on the real element — pointer-events:none, page stays live -->
    <div v-if="ringStyle && !showingTerminal" class="walk-ring" :style="ringStyle">
      <div class="walk-pulse"></div>
    </div>

    <div class="walk-card" :style="cardStyle" data-walk-card>
      <div class="walk-card-head">
        <span class="walk-kicker">{{ activeWalk.title }}</span>
        <button type="button" class="walk-close" aria-label="Skip clip" @click="stopWalk">×</button>
      </div>
      <span v-if="choiceLabel" class="walk-choice">{{ choiceLabel }}</span>
      <!-- eslint-disable-next-line vue/no-v-html — compiled repo pack content, escaped in renderSay -->
      <p class="walk-say" v-html="renderSay(cardText)"></p>
      <p v-if="isClickStep" class="walk-hint">Tap the highlighted control to continue — or skip.</p>
      <div class="walk-foot">
        <div class="walk-dots">
          <span
            v-for="(s, i) in activeWalk.steps" :key="s.anchor + i"
            class="walk-dot" :class="{ 'is-active': !showingTerminal && i === stepIndex, 'is-done': showingTerminal || i < stepIndex }"
          ></span>
        </div>
        <div class="walk-nav">
          <button v-if="stepIndex > 0 || showingTerminal" type="button" class="walk-btn" @click="back">Back</button>
          <button v-if="showChain" type="button" class="walk-btn walk-btn-primary" @click="startWalk(chainedWalk.id)">
            Next: {{ chainedWalk.title }}
          </button>
          <button v-else-if="!isClickStep" type="button" class="walk-btn walk-btn-primary" @click="next">{{ nextLabel }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.walk-overlay { position: fixed; inset: 0; z-index: 9500; pointer-events: none; }

.walk-ring {
  position: fixed;
  border: 2px solid var(--accent);
  border-radius: 10px;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent);
  transition: top 0.15s ease, left 0.15s ease, width 0.15s ease, height 0.15s ease;
}
.walk-pulse {
  position: absolute; inset: -2px;
  border: 2px solid var(--accent);
  border-radius: 10px;
  animation: walkPulse 1.6s ease-out infinite;
}
@keyframes walkPulse {
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(1.12); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .walk-pulse { animation: none; opacity: 0.5; }
  .walk-ring { transition: none; }
}

.walk-card {
  position: fixed;
  pointer-events: auto;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.28);
  padding: 14px 16px 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.walk-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.walk-kicker {
  font-family: var(--font-mono);
  font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--accent);
}
.walk-choice {
  align-self: flex-start;
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--faint);
  border: 1px solid var(--line); border-radius: 999px; padding: 1px 7px;
}
.walk-close {
  background: none; border: none; cursor: pointer; padding: 0 2px; line-height: 1;
  font-size: 18px; color: var(--faint);
}
.walk-close:hover { color: var(--ink); }
.walk-say { margin: 0; font-size: 0.875rem; line-height: 1.55; color: var(--muted); }
.walk-say :deep(strong) { color: var(--ink); font-weight: 600; }
.walk-hint { margin: 0; font-size: 0.75rem; color: var(--faint); font-style: italic; }

.walk-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.walk-dots { display: flex; gap: 5px; }
.walk-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--surface-3);
  transition: all 0.2s ease;
}
.walk-dot.is-active { background: var(--accent); transform: scale(1.35); }
.walk-dot.is-done { background: color-mix(in srgb, var(--accent) 45%, transparent); }

.walk-nav { display: flex; gap: 6px; }
.walk-btn {
  padding: 6px 14px; font: inherit; font-size: 0.75rem; font-weight: 600;
  border-radius: 999px; border: 1px solid var(--line);
  background: var(--surface-2); color: var(--muted); cursor: pointer;
}
.walk-btn:hover { background: var(--surface-3); color: var(--ink); }
.walk-btn-primary { background: var(--accent); border-color: transparent; color: #0f172a; }
.walk-btn-primary:hover { background: var(--accent); filter: brightness(1.1); color: #0f172a; }
</style>
