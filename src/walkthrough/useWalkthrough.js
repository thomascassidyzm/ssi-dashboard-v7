/**
 * useWalkthrough — the "how this works clips" runtime state machine.
 *
 * Ported from ssi-learning-app's useWalkthrough.ts (types stripped; Popty is
 * plain JavaScript, no tsconfig). One module-level singleton, same pattern as
 * Popty's other shared composables: any surface can offer a clip, one
 * WalkOverlay (mounted once in App.vue) renders whichever is active.
 *
 * Clips NEVER auto-play — startWalk only ever runs from a user tap on a
 * noticing-invitation CTA or a How-this-works "Show me" link, and the compiler
 * forbids any other call site structurally. Clips run on the REAL page over
 * REAL data: show-and-point by default (advance "next"), the user's own click
 * advances "click" steps (the overlay listens, never intercepts), and the
 * compiler refuses click-advance on destructive or money-spending verbs.
 *
 * Anchors are data-walk="<id>" attributes on real elements — resolution is a
 * live querySelector with a bounded wait; a step whose anchor never shows
 * within ANCHOR_TIMEOUT_MS renders unanchored with Next (a clip must never
 * hang).
 */
import { ref, computed } from 'vue'
import pack from './pack.json'

// Where a clip can live. Popty's existing `section` key — the one
// HowThisWorks.vue already takes as a prop and HowAndWhy.vue already orders in
// SECTION_ORDER — rather than a second place vocabulary. One concept, not two.
// The compiler's gatePlaces reads this list in lockstep.
export const KNOWN_PLACES = ['home', 'courses', 'checking', 'record-room', 'admin', 'how']

export const ANCHOR_TIMEOUT_MS = 5000

// Runtime mirror of the compiler's destructive-verb denylist (tools/
// walkthrough/lib.mjs — lockstep-checked there, like KNOWN_PLACES). Re-derived
// for Popty's own surface: builds, TTS spend, audio passes, course deletion
// cost money and are irreversible, so this errs strict.
//
// The compiler refuses to BUILD a click-advance step on these; this mirror
// means even a stale or hand-edited pack.json cannot make the overlay attach a
// click-advance listener to one — the step degrades to show-and-point (Next).
export const DESTRUCTIVE_ANCHOR_PATTERNS = [
  /delete/i, /purge/i, /remove/i, /reset/i, /revoke/i, /submit/i,
  /generate/i, /tts/i, /audio-pass/i, /regenerate/i, /rebuild/i, /build-start/i,
  /publish/i, /approve/i, /deploy/i, /spend/i, /queue/i, /cascade/i, /merge/i,
]

export function isDestructiveAnchor(anchorId) {
  return DESTRUCTIVE_ANCHOR_PATTERNS.some((re) => re.test(anchorId))
}

/** The advance mode the runtime will actually honour for a step. */
export function effectiveAdvance(step) {
  if (step.advance?.on === 'click' && isDestructiveAnchor(step.anchor)) return 'next'
  return step.advance?.on ?? 'next'
}

// Only AUTHORED clips are offerable. Skeleton entries exist so the inventory of
// what Popty can DO is visible and countable; an unwritten clip is never shown.
const walks = (pack.walks ?? []).filter((w) => w.status === 'authored')

const activeWalk = ref(null)
const stepIndex = ref(0)
const showingTerminal = ref(false)

/** Clips offerable at a persona × place. */
export function walksFor(persona, place) {
  return walks.filter((w) => w.place.section === place && w.personas.includes(persona))
}

export function walkById(id) {
  return walks.find((w) => w.id === id) ?? null
}

function stamp() {
  // DOM breadcrumb — ported from the learning app's engine so a future e2e
  // harness has something to assert on. No harness in Popty yet (v1 is
  // verified by hand).
  const el = document.documentElement
  if (activeWalk.value) {
    el.setAttribute('data-walk-active', `${activeWalk.value.id}:${stepIndex.value}${showingTerminal.value ? ':done' : ''}`)
  } else {
    el.removeAttribute('data-walk-active')
  }
}

// Engine-level escape hatch: Esc always ends the clip — registered here (not in
// the overlay) so it works even if the overlay's card is off-screen.
function onEscape(e) {
  if (e.key === 'Escape') stopWalk()
}

export function startWalk(id) {
  const walk = walkById(id)
  if (!walk) return false
  activeWalk.value = walk
  stepIndex.value = 0
  showingTerminal.value = false
  document.addEventListener('keydown', onEscape)
  stamp()
  return true
}

export function stopWalk() {
  activeWalk.value = null
  stepIndex.value = 0
  showingTerminal.value = false
  document.removeEventListener('keydown', onEscape)
  stamp()
}

function advance() {
  const walk = activeWalk.value
  if (!walk) return
  if (stepIndex.value < walk.steps.length - 1) {
    stepIndex.value += 1
  } else if (walk.steps[stepIndex.value]?.terminal && !showingTerminal.value) {
    showingTerminal.value = true
  } else {
    stopWalk()
    return
  }
  stamp()
}

function back() {
  if (showingTerminal.value) {
    showingTerminal.value = false
  } else if (stepIndex.value > 0) {
    stepIndex.value -= 1
  }
  stamp()
}

/**
 * The clip this one chains into, if any. Founder ruling: a clip is fewer than
 * five steps, so a longer journey is more than one clip — `next` is how they
 * join up. Flat pointer, not nesting.
 */
export function nextWalk(walk) {
  return walk?.next ? walkById(walk.next) : null
}

export function useWalkthrough() {
  return {
    activeWalk: computed(() => activeWalk.value),
    stepIndex: computed(() => stepIndex.value),
    showingTerminal: computed(() => showingTerminal.value),
    currentStep: computed(() => (activeWalk.value ? activeWalk.value.steps[stepIndex.value] ?? null : null)),
    chainedWalk: computed(() => nextWalk(activeWalk.value)),
    startWalk,
    stopWalk,
    next: advance,
    back,
  }
}
