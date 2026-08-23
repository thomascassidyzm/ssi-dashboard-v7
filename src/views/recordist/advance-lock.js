// src/views/recordist/advance-lock.js
//
// ONE LINE, ONE STEP FORWARD.
//
// Aran, mid-session on 2026-08-23: he tapped Next at the same moment
// auto-advance fired and the studio jumped two lines, with no way back. Two
// separate things wanted to move him on, neither of them knew about the other,
// and the only thing standing between them was a 250ms tap debounce shared with
// Again.
//
// A time window is the wrong instrument. The two advances are legitimately
// separated in time — the recordist's thumb is not racing the watcher by
// milliseconds, it is arriving a beat after it. Widening the window to cover
// that would start eating deliberate taps. What is actually wrong is not WHEN
// the second advance happens, it is WHERE IT COMES FROM: both of them are a step
// away from a line that has already been stepped away from.
//
// So the lock is keyed on the line, not the clock:
//
//   * Every advance names the line it is leaving. The first one from that line
//     wins; every later one from the same line is refused, whichever of them was
//     the tap and whichever was the watcher.
//   * A tap that lands just after an advance the recordist did not make was
//     aimed at the line that has just gone. It is refused for `autoGraceMs` —
//     because his thumb was committed before the screen changed under it, and
//     honouring it would skip a line he has not read. That is the exact defect
//     he hit, and it is not a same-line collision: by the time his tap arrives
//     the index has already moved, so nothing keyed on the line alone can see
//     it. (Only an AUTO advance arms this. A tap following his own tap is his
//     own doing and is left alone.)
//   * Back RELEASES the line it returns to. He came back deliberately to read it
//     again, so the step he already spent on it is forgiven, and the next
//     advance from it is allowed.
//
// Pure and clock-injectable so the whole race is testable without a microphone.

// How long after an automatic advance a manual tap is read as "meant for the
// line that has just gone". Long enough to cover a thumb already in flight,
// short enough that a deliberate second tap still lands.
export const AUTO_GRACE_MS = 600

export function createAdvanceLock({ autoGraceMs = AUTO_GRACE_MS, now = () => Date.now() } = {}) {
  // Lines we have already stepped away from.
  const spent = new Set()
  // When the last advance the recordist did NOT make happened.
  let lastAutoAt = -Infinity

  return {
    /**
     * Ask to advance away from `key`. Returns true exactly once per line, and
     * only the caller that gets `true` may move the index.
     *
     * @param {string|number} key    the line being left (its id, ideally)
     * @param {'tap'|'auto'} source  who is asking
     */
    claim(key, source = 'tap') {
      if (key === null || key === undefined) return false
      if (spent.has(key)) return false
      if (source === 'tap' && now() - lastAutoAt < autoGraceMs) return false
      spent.add(key)
      if (source === 'auto') lastAutoAt = now()
      return true
    },

    /** Returning to a line deliberately gives it its step back. */
    release(key) {
      spent.delete(key)
      // He has taken hold of the wheel; nothing is in flight against him.
      lastAutoAt = -Infinity
    },

    /** A fresh session starts with a clean sheet. */
    reset() {
      spent.clear()
      lastAutoAt = -Infinity
    },

    isSpent(key) { return spent.has(key) },
  }
}
