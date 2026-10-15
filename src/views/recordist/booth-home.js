/**
 * THE BOOTH'S HOME SCREEN, decided here and drawn by BoothHome.vue (Aran, 2026-10-14, job #347).
 *
 * He chose Option A of the #335 mockups — a home screen of cards, one per piece of work — with
 * Option B's "Up next" card on top and Option C's tickable boxes down the side, so he chooses
 * which batches and scripts he is doing and Up next only ever offers one of those.
 *
 * UP NEXT ORDER, his ruling: new sentences before practice phrases, then everything else in the
 * queue's own order. LEGOs sit between the two (job #378: "sentences, then LEGOs, then phrases"). Within a piece of work, the first ticked batch that still has lines to read
 * and can be opened (practice phrases are recommended one served batch at a time; every batch can still be opened by hand).
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

// A line read on this device and still uploading is NOT left to read (job #791): `uploading` is
// set by withDeviceTakes below, and counts as done everywhere a batch is judged.
const left = (x) => Math.max(0, (x.total || 0) - (x.recorded || 0) - (x.uploading || 0))
export const isFinished = (t) => t.total > 0 && left(t) === 0

/**
 * THE DEVICE'S TAKES IN THE HOME COUNTS (Aran, 2026-10-15, job #791: "it shows me as NOT having
 * recorded any of the batches I have just done" — 242 takes were still on his Chromebook's shelf).
 * The summary counts what the SERVER holds; this adds, per batch, the lines with a take still on
 * this device as `uploading` (amber), never as `recorded` (green, the server's word).
 *   unsent      — line ids with bytes on this device the server has not confirmed
 *   placeOf(id) — {track, batch, recorded?} or null when this device does not know where the line is
 * A line the server already counts (a re-read of a recorded line) adds nothing, and a batch never
 * shows more than its total.
 */
export function withDeviceTakes(tracks, { unsent = [], placeOf = () => null } = {}) {
  const per = new Map()
  for (const id of unsent) {
    const p = placeOf(id)
    if (!p || p.recorded) continue
    const k = batchTickId(p.track, p.batch)
    per.set(k, (per.get(k) || 0) + 1)
  }
  if (!per.size) return tracks
  return tracks.map((t) => {
    let up = 0
    const batches = (t.batches || []).map((b) => {
      const n = Math.min(per.get(batchTickId(t.key, b.n)) || 0, Math.max(0, (b.total || 0) - (b.recorded || 0)))
      if (!n) return b
      up += n
      return { ...b, uploading: n }
    })
    return up ? { ...t, batches, uploading: up } : t
  })
}

/**
 * WHAT THIS DEVICE HAS RECORDED OF THE BATCH ON SCREEN, by line id (job #818). `credit` is
 * { 'track#n': [lineId] }; returns it unchanged unless the lines on screen are the batch the
 * address names — `served` is the server's answer they came in ({ track, batch }), and until it
 * names `scope` the lines belong to the batch just left. Ids only ever accumulate.
 */
export function creditLoadedBatch(credit, { scope, served, lines, isRecorded }) {
  if (!scope || !served || served.track !== scope.track || Number(served.batch) !== Number(scope.batch)) return credit
  const k = `${scope.track}#${scope.batch}`
  const have = new Set(credit[k] || [])
  const before = have.size
  for (const l of lines || []) if (isRecorded(l)) have.add(l.id)
  return have.size === before ? credit : { ...credit, [k]: [...have] }
}

// WHERE EACH LINE THIS DEVICE HAS OPENED SITS (job #791), so a take still on the shelf can be
// counted against its batch without reading the whole queue. lineId → [track, batch, recorded].
// Kept small: entries for lines no longer on the shelf are dropped once it passes PLACES_MAX.
const placesKey = (voiceId) => `booth.home.places.${voiceId}`
export const PLACES_MAX = 4000
export function loadPlaces(voiceId, storage = globalThis.localStorage) {
  try {
    const obj = JSON.parse((storage && storage.getItem(placesKey(voiceId))) || '{}')
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {}
  } catch { return {} }
}
/** Merge `entries` ({lineId: [track, batch, recorded]}) in; returns the stored map. */
export function savePlaces(voiceId, entries, { keep = null, storage = globalThis.localStorage } = {}) {
  let all = { ...loadPlaces(voiceId, storage), ...entries }
  const ids = Object.keys(all)
  if (ids.length > PLACES_MAX && keep) {
    const pruned = {}
    for (const id of ids) if (keep.has(id) || id in entries) pruned[id] = all[id]
    all = pruned
  }
  try { storage && storage.setItem(placesKey(voiceId), JSON.stringify(all)) } catch { /* private mode / full */ }
  return all
}
export function placeFromEntry(e) {
  return Array.isArray(e) && e.length >= 2 ? { track: e[0], batch: e[1], recorded: !!e[2] } : null
}

/**
 * UP NEXT'S RULE, not a lock: practice phrases are RECOMMENDED one served batch at a time, and
 * pass 2 only once pass 1 is finished. It decides what Up next and a whole-card tap offer; it no
 * longer decides what can be opened (Aran, job #697: "we should be able to open the current batch
 * or future batches").
 */
export function trackLocked(t, tracks) {
  if (t.kind !== 'phrase' || t.pass !== 2) return false
  const p1 = tracks.find((x) => x.key === 'phrase.1')
  return !!(p1 && !isFinished(p1))
}
/** Is this the batch Up next may recommend? Sentences and LEGOs: any; phrases: the served one. */
export function batchRecommendable(t, b, tracks) {
  if (t.kind !== 'phrase') return true
  return !trackLocked(t, tracks) && !!b.current
}
/** Can the reader open this batch from the home cards or the tick panel? Every batch can be. */
export function batchOpenable() { return true }

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

/** The card list never repeats the Up next hero (Aran, 2026-10-15): drop the hero's section from it. */
export function withoutHero(tracks, hero) {
  return hero ? tracks.filter((t) => t.key !== hero.track.key) : tracks
}

/**
 * EVERY SECTION, ALWAYS LISTED (Aran, 2026-10-15, job #823: "This page should always show all the
 * available sets. They should all be listed in the right-hand side, and if they're checked in the
 * right-hand side they should appear on the left as well").
 *
 * The tick panel used to list only unfinished sections, so a section went missing the moment it
 * read as finished — all recorded, or all amber with takes still uploading (#791), or credited
 * with another batch's lines (#818) — which is how the North LEGOs and then the North sentences
 * vanished. The panel now lists every section with lines, finished ones last and marked so.
 */
export function tickableTracks(tracks) {
  const g = groupTracks(tracks)
  return [...g.main, ...g.other, ...g.finished]
}

/**
 * THE LEFT-HAND SIDE, decided in one place so it can be tested: Up next, the cards, the finished
 * rows, and what is hidden because he unticked it. Every ticked section is on the left — as the
 * Up next hero (whose card is not repeated, #708), as a card, or as a finished row — and every
 * unticked one is named in the hidden note. Nothing else drops a section.
 */
export function homeLayout(tracks, off = new Set()) {
  const g = groupTracks(tracks)
  const hero = upNext(tracks, off)
  const main = splitTicked(g.main, off)
  const other = splitTicked(g.other, off)
  const finished = splitTicked(g.finished, off)
  return {
    hero,
    main: withoutHero(main.shown, hero),
    other: withoutHero(other.shown, hero),
    finished: finished.shown,
    hidden: [...main.hidden, ...other.hidden, ...finished.hidden],
    tickables: [...g.main, ...g.other, ...g.finished],
  }
}

/**
 * A PARTIAL SUMMARY NEVER DROPS A SECTION (job #823). When the server could not count one kind
 * of section this time (`partial: ['phrase']` — the practice-phrase plan read failed or timed
 * out), the sections of that kind from the home screen already drawn (or this device's kept one)
 * are carried over with their last known counts and marked `counting`, until a full answer
 * replaces them. Sections of every other kind come from the new answer as they are.
 */
export function keepListedSections(fresh, previous) {
  if (!fresh || !Array.isArray(fresh.tracks)) return fresh
  const partial = new Set(Array.isArray(fresh.partial) ? fresh.partial : [])
  if (fresh.phrases && fresh.phrases.unavailable) partial.add('phrase')
  if (!partial.size || !previous || !Array.isArray(previous.tracks)) return fresh
  const have = new Set(fresh.tracks.map((t) => t.key))
  const carried = previous.tracks
    .filter((t) => partial.has(t.kind) && !have.has(t.key))
    .map((t) => ({ ...t, counting: true }))
  if (!carried.length) return fresh
  const out = { ...fresh, tracks: [...fresh.tracks, ...carried] }
  // Keep the phrase summary the carried cards were drawn with, so their batch names still read.
  if (partial.has('phrase') && previous.phrases && !previous.phrases.unavailable) out.phrases = previous.phrases
  return out
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
      if (!batchRecommendable(t, b, tracks)) continue
      if (hasBatchTicks(t) && !isTicked(off, batchTickId(t.key, b.n))) continue
      return { track: t, batch: b }
    }
  }
  return null
}

/** The batch to open when a whole card is tapped, or null when he should pick from its list. */
export function firstOpenBatch(t, tracks) {
  return (t.batches || []).find((b) => left(b) > 0 && batchRecommendable(t, b, tracks)) || null
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

// WHICH SECTIONS' BATCH LISTS ARE OPEN in the tick panel (job #392): shut unless he opened one,
// remembered per section key on this device. Section keys name the course, so one list serves
// every voice's booth.
const TICKS_OPEN_KEY = 'popty.boothTicksOpen'
export function loadTicksOpen(storage = globalThis.localStorage) {
  try {
    const arr = JSON.parse((storage && storage.getItem(TICKS_OPEN_KEY)) || '[]')
    return Array.isArray(arr) ? arr.filter((k) => typeof k === 'string') : []
  } catch { return [] }
}
export function saveTicksOpen(keys, storage = globalThis.localStorage) {
  try { storage && storage.setItem(TICKS_OPEN_KEY, JSON.stringify([...new Set(keys)])) } catch { /* private mode */ }
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
