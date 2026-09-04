// A DEPLOY MUST NOT DISARM THE TAB THAT IS ALREADY OPEN (2026-09-04).
//
// Popty's routes are lazy: clicking a nav link fetches `/assets/<Page>-<hash>.js`.
// The hash changes on every build, so the moment a new deploy lands, every chunk
// name the OPEN tab knows about stops existing. Vercel's SPA rewrite then makes
// the miss silent — a missing asset answers 200 with index.html, not 404 — so the
// dynamic import rejects, the router navigation rejects, and the click does
// NOTHING. Nothing logs to the page, nothing changes, the current view keeps
// working. It reads exactly like "lots of top nav links not working", which is
// what Tom hit at 18:24Z on 2026-09-04, three minutes after b0ab4a29 deployed.
//
// The version check in main.js does not catch this: it only fires on
// `visibilitychange`, and a person clicking around inside one tab never leaves it.
//
// So: when a navigation fails because its code could not be fetched, the tab is
// out of date by definition. Reload it AT THE DESTINATION — the user gets the
// page they clicked, from the new build. Once only, guarded, so a genuinely
// broken chunk cannot become a reload loop.

const GUARD_KEY = 'popty-chunk-reload'

/** Is this the browser telling us a lazily-loaded route chunk would not load? */
export function isChunkLoadError(error) {
  const message = String(error?.message || error || '')
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    // Vercel's rewrite hands back index.html, so the browser refuses the MIME type.
    /expected a JavaScript(?:-or-Wasm)? module/i.test(message) ||
    /Unexpected token '<'/.test(message)
  )
}

export function installChunkReloadRecovery(router, win = window, store = win?.sessionStorage) {
  router.onError((error, to) => {
    if (!isChunkLoadError(error)) return
    const target = to?.fullPath || win.location.pathname
    let already = null
    try { already = store?.getItem(GUARD_KEY) } catch { /* private mode */ }
    if (already === target) return // already tried this once; let the error stand
    try { store?.setItem(GUARD_KEY, target) } catch { /* private mode */ }
    win.location.assign(target)
  })

  // A navigation that completes proves the tab's code is current again.
  router.afterEach(() => {
    try { store?.removeItem(GUARD_KEY) } catch { /* private mode */ }
  })
}
