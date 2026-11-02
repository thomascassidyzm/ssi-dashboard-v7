// A NEW BUILD REACHES A TAB THAT IS NEVER HIDDEN (Aran, 2026-10-15, job #829). The open tab used
// to look for a new build only when it came back into view (visibilitychange). A booth left open
// on a Chromebook is never out of view, so it kept running the build it was opened with: #823
// ("What I'm doing" lists every section) was live for fifteen minutes and his panel still drew
// the old rule that dropped a finished section. Now it also looks on every page move, and every
// few minutes. A page move or a return to the tab reloads at once. The timed look reloads only a
// page that has said an idle reload is safe for it (the booth: everything it keeps is on the
// device) — any other page, an editor with words half typed, is left alone and gets the new
// build on its next page move. Nothing reloads while a page HOLDS it because leaving would lose
// work (the booth while the mic is live); then it reloads the moment that hold is let go.
//
// A HELD RELOAD IS SAID OUT LOUD (Auke, fry_for_eng, 2026-11-02, job #43). The Record Room's
// script recorder never held the reload at all, so a deploy mid-session reloaded the tab and
// every take still in its in-memory upload queue went with it. It holds now, and while a new
// build is waiting on a hold `reloadWaiting` is true, so the page can show a quiet "a new version
// is ready, it will load when you finish" instead of either reloading or saying nothing.
import { ref } from 'vue'

export const VERSION_POLL_MS = 5 * 60 * 1000

/** True while a new build has been seen and its reload is waiting for a hold to be let go. */
export const reloadWaiting = ref(false)

const holds = new Set()
const idleOk = new Set()
let pendingReload = null
let newBuildSeen = false

/** A page on which a reload loses nothing says so (`on`) while it is up, so the timed look may reload it. */
export function allowIdleReload(key, on) {
  if (on) idleOk.add(key)
  else idleOk.delete(key)
}

/** A page that would lose work on a reload holds it (`on`), and lets go (`!on`). */
export function holdReload(key, on) {
  if (on) holds.add(key)
  else holds.delete(key)
  if (!holds.size && pendingReload) {
    const go = pendingReload
    pendingReload = null
    reloadWaiting.value = false
    go()
  }
}

export function reloadHeld() { return holds.size > 0 }

/**
 * current      — the build this tab is running (__GIT_COMMIT__)
 * fetchLatest  — async () => the build deployed now, or null when it cannot be read
 * reload       — () => reloads the page
 * Returns an uninstall function.
 */
export function installVersionReload({ current, fetchLatest, reload, router = null, doc = document, setIntervalImpl = setInterval, clearIntervalImpl = clearInterval, pollMs = VERSION_POLL_MS }) {
  if (!current) return () => {}
  let checking = false
  // `timed`: the periodic look, which reloads only a page that allows an idle reload.
  async function check(timed = false) {
    if (checking || pendingReload) return
    checking = true
    try {
      if (!newBuildSeen) {
        const latest = await fetchLatest()
        if (!latest || latest === current) return
        newBuildSeen = true
      }
      if (timed && !idleOk.size) return
      if (reloadHeld()) { pendingReload = reload; reloadWaiting.value = true }
      else reload()
    } catch { /* offline, or no version.json yet */ } finally { checking = false }
  }
  const onVisible = () => { if (doc.visibilityState === 'visible') check() }
  doc.addEventListener('visibilitychange', onVisible)
  const timer = setIntervalImpl(() => check(true), pollMs)
  const offRoute = router && typeof router.afterEach === 'function' ? router.afterEach(() => { check() }) : null
  return () => {
    doc.removeEventListener('visibilitychange', onVisible)
    clearIntervalImpl(timer)
    if (typeof offRoute === 'function') offRoute()
  }
}

/** Test seam: forget every hold and any reload waiting on one. */
export function resetVersionReload() { holds.clear(); idleOk.clear(); pendingReload = null; newBuildSeen = false; reloadWaiting.value = false }
