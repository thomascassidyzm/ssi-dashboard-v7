/**
 * THE BOOTH'S HOME SCREEN, decided here and drawn by BoothHome.vue (Aran, 2026-10-14, job #347).
 *
 * He chose Option A of the #335 mockups — a home screen of cards, one per piece of work — with
 * Option B's "Up next" card on top and Option C's tickable boxes down the side, so he chooses
 * which batches and scripts he is doing and Up next only ever offers one of those.
 *
 * UP NEXT ORDER, his ruling: new sentences before practice phrases, then everything else in the
 * queue's own order. LEGOs sit between the two (job #378: "sentences, then LEGOs, then phrases"). Within a piece of work, the first ticked batch that still has lines to read
 * and can be opened (practice phrases open one batch at a time — the queue's rule, not ours).
 *
 * The ticks are this browser's memory of what he is doing and nothing else: they decide what Up
 * next offers, never which lines are in the queue or how they are served. Stored as what he has
 * UNticked, so a piece of work that appears later starts ticked. An unticked piece of work is
 * also HIDDEN from the cards (Aran, job #378: "unchecking a tickbox on the right must hide the
 * matching card"); the tick list keeps it, so ticking it again brings it back.
 */

/** A batch's own id in the tick list. */
export const batchTickId = (trackKey, n) => `${trackKey}#${n}`

export const isNewWork = (t) =>
  t.kind === 'phrase' || (t.kind === 'lego' && !!t.newCourse) || (t.kind === 'seed' && (t.newCourse || t.seedExisting === false))

/** A piece of work cut into batches the reader ticks one by one (sentences, LEGOs). */
export const hasBatchTicks = (t) => (t.kind === 'seed' || t.kind === 'lego') && (t.batches || []).length > 1

const left = (x) => Math.max(0, (x.total || 0) - (x.recorded || 0))
export const isFinished = (t) => t.total > 0 && left(t) === 0

/** Practice phrases: pass 2 waits for pass 1; within a pass only the batch being served opens. */
export function trackLocked(t, tracks) {
  if (t.kind !== 'phrase' || t.pass !== 2) return false
  const p1 = tracks.find((x) => x.key === 'phrase.1')
  return !!(p1 && !isFinished(p1))
}
export function batchOpenable(t, b, tracks) {
  if (t.kind !== 'phrase') return true
  return !trackLocked(t, tracks) && !!b.current
}

/** Up next's order: new sentences, then LEGOs, then practice phrases (pass 1, pass 2), then the rest. */
export function orderedTracks(tracks) {
  const rank = (t) => (t.kind === 'seed' && isNewWork(t) ? 0 : t.kind === 'lego' && isNewWork(t) ? 1 : t.kind === 'phrase' ? 2 : 3)
  return tracks.map((t, i) => ({ t, i })).sort((a, b) => (rank(a.t) - rank(b.t)) || (a.i - b.i)).map((x) => x.t)
}

/** The three groups on the page: new work, other scripts, finished. Empty tracks are dropped. */
export function groupTracks(tracks) {
  const live = tracks.filter((t) => t.total > 0)
  return {
    main: orderedTracks(live.filter((t) => isNewWork(t) && !isFinished(t))),
    other: live.filter((t) => !isNewWork(t) && !isFinished(t)),
    finished: live.filter(isFinished),
  }
}

export function isTicked(off, id) { return !off.has(id) }

/** The cards to draw: unticked ones are hidden. Returns {shown, hidden}. */
export function splitTicked(tracks, off = new Set()) {
  const shown = []
  const hidden = []
  for (const t of tracks) (isTicked(off, t.key) ? shown : hidden).push(t)
  return { shown, hidden }
}

/** A card's batch rows to draw: an unticked batch is hidden like an unticked card. */
export function shownBatches(t, off = new Set()) {
  if (!hasBatchTicks(t)) return t.batches || []
  return (t.batches || []).filter((b) => isTicked(off, batchTickId(t.key, b.n)))
}

/**
 * What Up next offers: {track, batch} or null. Ticks: a track unticked is skipped whole; a batch
 * unticked is skipped within its track.
 */
export function upNext(tracks, off = new Set()) {
  for (const t of orderedTracks(tracks)) {
    if (isFinished(t) || !isTicked(off, t.key) || trackLocked(t, tracks)) continue
    for (const b of t.batches || []) {
      if (left(b) === 0) continue
      if (!batchOpenable(t, b, tracks)) continue
      if (hasBatchTicks(t) && !isTicked(off, batchTickId(t.key, b.n))) continue
      return { track: t, batch: b }
    }
  }
  return null
}

/** The batch to open when a whole card is tapped, or null when he should pick from its list. */
export function firstOpenBatch(t, tracks) {
  return (t.batches || []).find((b) => left(b) > 0 && batchOpenable(t, b, tracks)) || null
}

const tickKey = (voiceId) => `booth.home.unticked.${voiceId}`
export function loadUnticked(voiceId, storage = globalThis.localStorage) {
  try {
    const raw = storage && storage.getItem(tickKey(voiceId))
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch { return new Set() }
}
export function saveUnticked(voiceId, off, storage = globalThis.localStorage) {
  try { storage && storage.setItem(tickKey(voiceId), JSON.stringify([...off])) } catch { /* private mode */ }
}

// THE LAST HOME SCREEN, kept on this device (job #378). A phone coming back to the tab often
// reloads the page; the home screen is drawn from this at once and replaced by the server's
// answer when it lands, so a reload is never a blank "Getting your lines…" again.
const snapKey = (voiceId) => `booth.home.summary.${voiceId}`
export const SNAPSHOT_MAX_AGE_MS = 7 * 24 * 3600 * 1000
export function loadSummarySnapshot(voiceId, storage = globalThis.localStorage, now = Date.now()) {
  try {
    const raw = storage && storage.getItem(snapKey(voiceId))
    const snap = raw ? JSON.parse(raw) : null
    if (!snap || !snap.data || !Array.isArray(snap.data.tracks) || now - snap.at > SNAPSHOT_MAX_AGE_MS) return null
    return snap.data
  } catch { return null }
}
export function saveSummarySnapshot(voiceId, data, storage = globalThis.localStorage, now = Date.now()) {
  try { storage && storage.setItem(snapKey(voiceId), JSON.stringify({ at: now, data })) } catch { /* private mode / full */ }
}
