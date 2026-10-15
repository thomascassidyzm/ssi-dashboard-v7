// THE QUEUE PICKS UP NEW WORK WHEN THE BOOTH COMES BACK INTO VIEW (job #804, Kai, 15 Oct).
// The booth read its lines once, on arrival, and never again: a line newly cast to a voice
// (Dan, human_dan_cym_s) did not appear until he reloaded the page by hand. Now coming back to
// the tab — or the window regaining focus — reads the queue again, quietly, keeping his place.
//
// Never while he is recording (the mic is open on a line), never while takes are still going up
// from this device (the server's count and the device's would disagree for no reason), never on a
// screen that is still loading or broken, and not more than once in REFRESH_MIN_GAP_MS — a phone
// coming back fires visibilitychange AND focus together, and a fidgety tab-switcher should not
// turn into a stream of whole-queue reads.
export const REFRESH_MIN_GAP_MS = 30000
export const REFRESHABLE_PHASES = new Set(['home', 'ready', 'done'])

export function shouldRefreshQueue({ visible = true, active = true, phase, busy, arming, editing, pending = 0, lastAt = 0, now = Date.now(), minGapMs = REFRESH_MIN_GAP_MS } = {}) {
  if (!visible || !active) return false
  if (!REFRESHABLE_PHASES.has(phase)) return false
  if (busy || arming || editing) return false
  if (pending > 0) return false
  return now - lastAt >= minGapMs
}
