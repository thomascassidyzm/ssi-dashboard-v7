/**
 * THE BOOTH'S HOME SCREEN, decided here and drawn by BoothHome.vue (Aran, 2026-10-14, job #347).
 *
 * He chose Option A of the #335 mockups — a home screen of cards, one per piece of work — with
 * Option B's "Up next" card on top and Option C's tickable boxes down the side, so he chooses
 * which batches and scripts he is doing and Up next only ever offers one of those.
 *
 * UP NEXT ORDER, his ruling: new sentences before practice phrases, then everything else in the
 * queue's own order. Within a piece of work, the first ticked batch that still has lines to read
 * and can be opened (practice phrases open one batch at a time — the queue's rule, not ours).
 *
 * The ticks are this browser's memory of what he is doing and nothing else: they decide what Up
 * next offers, never which lines are in the queue or how they are served. Stored as what he has
 * UNticked, so a piece of work that appears later starts ticked.
 */

/** A batch's own id in the tick list. */
export const batchTickId = (trackKey, n) => `${trackKey}#${n}`

export const isNewWork = (t) =>
  t.kind === 'phrase' || (t.kind === 'seed' && (t.newCourse || t.seedExisting === false))

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

/** Up next's order: new sentences, then practice phrases (pass 1, pass 2), then the rest. */
export function orderedTracks(tracks) {
  const rank = (t) => (t.kind === 'seed' && isNewWork(t) ? 0 : t.kind === 'phrase' ? 1 : 2)
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
      if (t.batches.length > 1 && !isTicked(off, batchTickId(t.key, b.n))) continue
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
