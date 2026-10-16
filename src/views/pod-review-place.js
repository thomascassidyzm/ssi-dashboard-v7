// WHERE A PROOFREADER LEFT OFF IN A POD, AND WHAT SURVIVES A RELOAD (job #244, Deborah 16 Oct).
//
// Deborah, proofreading the cym_s health pod: "Every so often I get Not responding … I get stuck
// quite often. And then it jumps back to the start." Two things did that on 16 Oct:
//  - every merge to Popty main ships a new build (about 20 that day), and main.js reloads an open
//    tab on its next return into view (versionReload.js) — the page came back at line 1, with this
//    session's ✓ PROOFREAD badges gone;
//  - every merge also restarts the API (tools/deploy/auto-deploy-prod.cjs), so a tick or the pod
//    read landing in those seconds failed, and the page showed an error instead of the script.
//
// So the page remembers the line, in localStorage per course + pod (no schema change on the one
// live database for a reading position; another browser simply has no place to offer), keeps this
// session's ticks/edits in sessionStorage, and retries a request that met a restarting server.
const PLACE_PREFIX = 'popty_pod_place:'
const SETTLED_PREFIX = 'popty_pod_settled:'

const placeKey = (courseCode, slug) => `${PLACE_PREFIX}${courseCode}:${slug}`
const settledKey = (courseCode, slug) => `${SETTLED_PREFIX}${courseCode}:${slug}`

export function readPodPlace(courseCode, slug) {
  try {
    const v = JSON.parse(localStorage.getItem(placeKey(courseCode, slug)) || 'null')
    return v && v.sentenceId && Number.isFinite(v.order) ? v : null
  } catch { return null }
}

export function savePodPlace(courseCode, slug, sent, now = Date.now()) {
  if (!sent?.id || !Number.isFinite(sent.global_order)) return null
  const place = { sentenceId: sent.id, order: sent.global_order, at: new Date(now).toISOString() }
  try { localStorage.setItem(placeKey(courseCode, slug), JSON.stringify(place)) } catch { /* private mode: no memory */ }
  return place
}

/**
 * The row to land on: the remembered line if it is on screen, else the first shown line after it
 * (a filtered view may not show it), else the last line. `shown` is in page order.
 */
export function landingRow(shown, place) {
  if (!place || !shown?.length) return null
  return shown.find(s => s.id === place.sentenceId)
    || shown.find(s => s.global_order >= place.order)
    || shown[shown.length - 1]
}

// THIS SESSION'S verdicts. The server forgets a ticked line's draft flag, so without this a reload
// took every ✓ PROOFREAD badge and the Done count with it.
export function readSettled(courseCode, slug) {
  try {
    const v = JSON.parse(sessionStorage.getItem(settledKey(courseCode, slug)) || 'null')
    return { proofread: new Set(v?.proofread || []), edited: new Set(v?.edited || []) }
  } catch { return { proofread: new Set(), edited: new Set() } }
}

export function saveSettled(courseCode, slug, proofread, edited) {
  try {
    sessionStorage.setItem(settledKey(courseCode, slug), JSON.stringify({ proofread: [...proofread], edited: [...edited] }))
  } catch { /* non-fatal */ }
}

/** Did this page load come from a reload (a new build arriving, or F5) rather than a click? */
export function cameFromReload(perf = typeof performance !== 'undefined' ? performance : null) {
  try { return perf?.getEntriesByType?.('navigation')?.[0]?.type === 'reload' } catch { return false }
}

// A restart takes the API away for a few seconds: the request either never connects (fetch throws)
// or the proxy in front answers 502/503/504. Those are worth asking again; any other answer is the
// server's real answer and is returned as it is. Only for requests that are safe to repeat — the
// tick sends its direction ({undo}), an edit sends the whole text, a read changes nothing.
const RESTARTING = new Set([502, 503, 504])
export async function fetchThroughRestart(doFetch, { delaysMs = [1500, 3000, 6000], sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  for (let attempt = 0; ; attempt++) {
    const last = attempt >= delaysMs.length
    try {
      const res = await doFetch()
      if (!RESTARTING.has(res.status) || last) return res
    } catch (err) {
      if (last) throw err
    }
    await sleep(delaysMs[attempt])
  }
}
