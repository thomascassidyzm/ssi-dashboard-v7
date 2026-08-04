/**
 * overlayPlacement — pure geometry for WalkOverlay's card and anchor checks.
 *
 * Ported near-verbatim from ssi-learning-app (types stripped). Split out of the
 * component so the two runtime guardrails that live in geometry stay
 * unit-testable:
 *
 * 1. Escape-hatch invariant: navigation must stay reachable in ONE tap on
 *    every clip step. In Popty that tap is AppNavbar, which publishes its own
 *    measured height as --app-navbar-height (56px at desktop width) — so the
 *    clip card, the only pointer-eating part of the overlay, is NEVER placed
 *    into that zone. If an anchor-relative placement would reach it, the card
 *    drops to bottom-center instead (the ring still marks the element).
 * 2. Anchor-drift honesty: an element that resolves but has collapsed to zero
 *    size (v-show off, display:none ancestor, emptied container) is NOT a
 *    usable anchor — binding it would pulse a ring at 0,0 pointing at nothing.
 */

/** Fallback height of AppNavbar — the nav-escape zone. */
export const TOP_CHROME_PX = 56
export const PAD = 6
export const CARD_W = 340
export const CARD_H_EST = 190
const EDGE = 12

/** A resolved element only counts as an anchor if it occupies real space. */
export function isAnchorUsable(rect) {
  return !!rect && rect.width > 0 && rect.height > 0
}

/**
 * Place the card near the anchor without ever covering the navbar.
 * `topChrome` = the measured navbar height in px (defaults to TOP_CHROME_PX).
 * Pass rect=null for terminal / timed-out / unanchored states.
 */
export function placeCard(rect, vw, vh, topChrome = TOP_CHROME_PX) {
  const w = Math.min(CARD_W, vw - 24)
  const bottomCenter = {
    left: `${(vw - w) / 2}px`,
    bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
    width: `${w}px`,
  }
  if (!rect) return bottomCenter
  const minTop = topChrome + EDGE
  const left = Math.max(EDGE, Math.min(rect.left, vw - w - EDGE))
  const below = rect.bottom + PAD + EDGE
  if (below + CARD_H_EST < vh) {
    return { left: `${left}px`, top: `${Math.max(below, minTop)}px`, width: `${w}px` }
  }
  const above = rect.top - PAD - EDGE
  // Card would span [above - CARD_H_EST, above] — only allowed when its top
  // edge stays clear of the nav-escape zone.
  if (above - CARD_H_EST > minTop && rect.top <= vh) {
    return { left: `${left}px`, bottom: `${vh - above}px`, width: `${w}px` }
  }
  // Anchor taller than the viewport, off-screen, or too close to the navbar:
  // quiet bottom-center — reachable, and never over the escape.
  return bottomCenter
}
