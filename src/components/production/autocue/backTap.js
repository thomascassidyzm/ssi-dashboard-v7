// src/components/production/autocue/backTap.js
/**
 * WHAT THE BACK BUTTON MEANS.
 *
 * Back used to move the autocue to the previous take on the FIRST press, which
 * is the one thing a recordist almost never wants from it. The press they
 * actually make mid-line is "I fluffed that — let me take it from the top",
 * and a surface that answers it by skipping backwards has thrown away the line
 * they were reading AND landed them on one that was already fine (Kai,
 * 2026-08-21).
 *
 * So Back takes the media-player convention every phone already teaches:
 *
 *   * ONE tap  → restart the take you are on. The line does not move.
 *   * TWO taps inside WINDOW_MS → go to the previous take.
 *
 * The window is deliberately short. Longer than a double-tap and an ordinary
 * pair of separate restarts becomes a skip backwards; shorter and the second
 * tap misses. 500 ms is the middle of the phone convention's 400-600 ms band,
 * and this file is where that number lives for the whole studio.
 *
 * A restart fires IMMEDIATELY on the first tap rather than waiting the window
 * out to see whether a second one arrives. Nothing a restart does has to be
 * undone by a subsequent skip — the previous-take move simply happens on top
 * of it — and holding the response back half a second would make the button
 * feel dead in the hand of someone who is mid-performance.
 */

export const BACK_DOUBLE_TAP_MS = 500

/**
 * @param {object} handlers
 * @param {() => void} handlers.onRestart   first tap: restart the current take
 * @param {() => void} handlers.onPrevious  second tap inside the window
 * @param {number} [handlers.windowMs]
 * @param {() => number} [handlers.now]     injectable clock, for tests
 */
export function createBackTap({ onRestart, onPrevious, windowMs = BACK_DOUBLE_TAP_MS, now = () => Date.now() }) {
  let lastTapAt = null

  function tap() {
    const at = now()
    if (lastTapAt !== null && at - lastTapAt <= windowMs) {
      // Second tap of a pair. Cleared rather than carried, so three taps are a
      // restart-then-skip and a fresh restart, never two skips.
      lastTapAt = null
      onPrevious()
      return 'previous'
    }
    lastTapAt = at
    onRestart()
    return 'restart'
  }

  // Leaving the recording phase must not leave a half-finished pair armed: a
  // tap on the way out and a tap on the way back in are not a double-tap.
  function reset() {
    lastTapAt = null
  }

  return { tap, reset }
}
