/**
 * booth-rerecord.cjs — THE "RE-RECORD" CARD'S LIST: the lines of a reader's own work that have
 * slipped through, gathered in one place so they can be read again in one sitting.
 *
 * Aran, 2026-10-15 (job #788): "I'm concerned there are a few missing from one batch I did, and
 * that these re-records haven't gone well. … give me a 're-record' card on my recording page,
 * where all the misses get dumped together." The #769 audit found S1374 and S1379 unrecorded in
 * the middle of a batch he had otherwise finished, and nothing on the booth said so.
 *
 * THE SERVER'S HALF of the list. Two of the three reasons a line is on it are knowable here:
 *
 *   'skipped'       — an unrecorded line that sits BEFORE the furthest recorded line of a batch
 *                     he has started. Lines past the furthest one are simply not read yet: they
 *                     are the batch, not a miss.
 *   'text_changed'  — an unrecorded line whose words were edited after he recorded it: one of his
 *                     own takes still says the OLD words, and those words now belong to no line
 *                     of his (an "orphan" take). See pairTextChanges for how a take is matched
 *                     to the line it used to be.
 *
 * The third reason, a take the server REFUSED ("no audible speech"), is never stored — the bytes
 * stay on the reader's device — so it is merged in by the page (src/views/recordist/rerecord-list.js),
 * which is also where a line with a take STILL UPLOADING is taken off the list: a take on its way
 * up is not a miss, and only the device knows it is there.
 *
 * READ ONLY, and decides nothing upstream: which lines are his, their order, the batches and
 * whether a line is recorded all come from the queue (recordist-queue.cjs, booth-home.cjs).
 *
 * Pure: no I/O.
 */
'use strict'

const { trackKeyOf, chunkTrack, primaryPhraseCourse, phraseTrackKey } = require('./booth-home.cjs')
const { audioKeyCandidates, normalizeForAudio } = require('../shared/text-normalize.cjs')

/** The track key of the re-record batch itself (`?track=rerecord&batch=1`). */
const RERECORD_TRACK = 'rerecord'

/**
 * Every batch of the reader's work as the booth cuts it, with its lines in the order the booth
 * walks them: `{ track, batch, lines }`. Non-phrase tracks come from the queue's own lines (cut
 * by booth-home.cjs); phrase batches from every phrase line of the plan (`phraseLines`), grouped
 * by (pass, batch, course) and numbered as the home card numbers them (`phraseBatches`).
 */
function batchesOf(queueLines, phraseLines = [], phraseBatches = []) {
  const out = []
  const byKey = new Map()
  for (const l of queueLines || []) {
    if ((l.kind || 'pod') === 'phrase') continue // the served phrase batch is in phraseLines too
    const key = trackKeyOf(l)
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(l)
  }
  for (const [key, lines] of byKey) {
    chunkTrack(key, lines).forEach((b, i) => out.push({ track: key, batch: i + 1, lines: b }))
  }
  const groups = new Map()
  for (const l of phraseLines || []) {
    const g = `${l.phrasePass}\u0000${l.phraseBatch}\u0000${l.courseCode}`
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g).push(l)
  }
  // One card per course and pass, numbered as the home card numbers them (booth-home, job #179).
  const primary = primaryPhraseCourse(phraseBatches)
  const cardN = new Map()
  for (const b of phraseBatches || []) {
    const track = phraseTrackKey(b.pass, b.courseCode, primary)
    const n = (cardN.get(track) || 0) + 1
    cardN.set(track, n)
    const lines = groups.get(`${b.pass}\u0000${b.batch}\u0000${b.courseCode}`)
    if (lines && lines.length) out.push({ track, batch: n, lines })
  }
  return out
}

/**
 * How much of a batch, up to a line, must be recorded for that line to count as how far he got.
 * A phrase or LEGO line is often recorded by a take of the same words read in ANOTHER batch, so
 * a batch he never opened can have a recorded line near its end; taken as his furthest line, that
 * listed 1,400 "skips" on Aran's first live read (job #788). A reader who worked through a batch
 * has most of it recorded up to where he stopped.
 */
const REACHED_DENSITY = 0.5

/**
 * THE SKIPS of one batch: unrecorded lines before the furthest line he reached — the furthest
 * recorded line at which at least REACHED_DENSITY of the batch so far is recorded. A batch with
 * nothing recorded has not been started and has no skips.
 */
function skippedIn(batchLines) {
  let furthest = -1
  let recorded = 0
  batchLines.forEach((l, i) => {
    if (!l.recorded) return
    recorded += 1
    if (recorded / (i + 1) >= REACHED_DENSITY) furthest = i
  })
  return batchLines.slice(0, Math.max(furthest, 0)).filter((l) => !l.recorded)
}

const words = (t) => normalizeForAudio(t || '').split(/\s+/).filter(Boolean)

/** How alike two texts are, 0..1: shared words over all words (multiset Dice). */
function similarity(a, b) {
  const wa = words(a)
  const wb = words(b)
  if (!wa.length || !wb.length) return 0
  const pool = new Map()
  for (const w of wb) pool.set(w, (pool.get(w) || 0) + 1)
  let common = 0
  for (const w of wa) {
    const n = pool.get(w) || 0
    if (n) { common += 1; pool.set(w, n - 1) }
  }
  return (2 * common) / (wa.length + wb.length)
}

/** How sure a match must be. With the take's own seed number to agree, less is needed. */
const MATCH_SAME_SEED = 0.34
const MATCH_TEXT_ONLY = 0.75

/** course_audio role a line's take is filed under, when the line says. */
function takeRoleOf(line) {
  const r = line && line.role
  if (r === 'target1' || r === 'target2' || r === 'known') return r
  if (r === 'target') return 'target1'
  return null
}

/**
 * THE TEXT CHANGES: pair unrecorded lines with ORPHAN takes — takes of this voice whose words
 * match no line of theirs any more, because the line they were read for has since been edited.
 *
 * A pair needs the same course and (where both say) the same role, and the words must be close:
 * at least MATCH_SAME_SEED alike when the take's own provenance names the same seed as the line,
 * else MATCH_TEXT_ONLY. Practice phrases of one seed are alike by design ("Dw i eisiau mynd" /
 * "Dw i eisiau bwyta"), which is why the bar is high without a seed to agree on. Pairs are taken
 * best first and each take is used once, so an edited line gets its own old take, not a
 * neighbour's.
 *
 * A RECORDED LINE CLAIMS ITS ORPHAN TOO (Aran, 2026-10-16, job #261). A line that was edited AND
 * read again leaves its old take an orphan for good. Matched against unrecorded lines only, that
 * orphan was handed to whichever unread neighbour looked most like it — "do, o'n i'n ddigon lwcus
 * i deithio i Affrica" (the S1379 seed before Affrica became Affrig, re-read 15 Oct) was put on the
 * card as the old words of the phrase "llynedd o'n i'n ddigon lwcus", a line he had never read,
 * and as he read each neighbour it hopped to the next. So every line competes: an orphan whose
 * best match is a recorded line is that line's history, and is not a text change of anything.
 * On a tie the unrecorded line keeps it — asking once too often beats dropping an edited line.
 *
 * @param {object[]} lines wire lines; recorded ones claim orphans but are never returned
 * @param {Set<string>} liveKeys audio keys of EVERY line of this reader, recorded or not
 * @param {object[]} takes {id, text, text_normalized, course_code, role, created_at, seedNumber?}
 * @returns {Map<string, object>} lineId -> the take it used to be (unrecorded lines only)
 */
function pairTextChanges(lines, liveKeys, takes) {
  const orphans = (takes || []).filter((t) => !audioKeyCandidates(t.text_normalized || t.text).some((k) => liveKeys.has(k)))
  if (!orphans.length || !lines.some((l) => !l.recorded)) return new Map()
  const byCourse = new Map()
  for (const t of orphans) {
    if (!byCourse.has(t.course_code)) byCourse.set(t.course_code, [])
    byCourse.get(t.course_code).push(t)
  }
  const pairs = []
  for (const line of lines) {
    const role = takeRoleOf(line)
    for (const t of byCourse.get(line.courseCode) || []) {
      if (role && t.role && t.role !== role) continue
      const sameSeed = line.seedNumber != null && t.seedNumber != null && Number(t.seedNumber) === Number(line.seedNumber)
      if (line.seedNumber != null && t.seedNumber != null && !sameSeed) continue
      const s = similarity(line.text, t.text)
      if (s >= (sameSeed ? MATCH_SAME_SEED : MATCH_TEXT_ONLY) && s < 1) pairs.push({ line, take: t, s: s + (sameSeed ? 1 : 0) })
    }
  }
  pairs.sort((a, b) => (b.s - a.s) || (Number(!!a.line.recorded) - Number(!!b.line.recorded)))
  const out = new Map()
  const usedTakes = new Set()
  for (const p of pairs) {
    if (out.has(p.line.id) || usedTakes.has(p.take.id)) continue
    out.set(p.line.id, p.take)
    usedTakes.add(p.take.id)
  }
  const claimedByRecorded = new Set()
  for (const p of pairs) {
    if (p.line.recorded && out.get(p.line.id) === p.take) claimedByRecorded.add(p.take.id)
  }
  for (const p of pairs) if (p.line.recorded) out.delete(p.line.id)
  // ONE OLD TAKE CAN BE THE OLD WORDS OF SEVERAL LINES (job #159). Two lines that said the same words
  // were served by one recording; when both are edited the take can only be handed to one of them
  // above, and the other — S1642L02B03 "ond sut wyt ti'n teimlo?", beaten for the take of "ond sut
  // dach chi'n teimlo?" by B01 — dropped off the card with no old take at all. So a line still
  // without a take may SHARE the one it most resembles. Shared pairs are marked (`out.shared`), as
  // they are a guess the editor's time must back: see withEditors.
  const sharedTakes = new Set()
  const seen = new Set()
  for (const p of pairs) {
    if (p.line.recorded || out.has(p.line.id) || seen.has(p.line.id)) continue
    seen.add(p.line.id) // pairs are sorted best first: this is the line's best take
    if (!usedTakes.has(p.take.id) || claimedByRecorded.has(p.take.id) || p.s < 1 + MATCH_SAME_SEED) continue // sharing needs the seed to agree; a take a RECORDED line claimed (job #261) is never shared
    out.set(p.line.id, p.take)
    sharedTakes.add(p.line.id)
  }
  out.shared = sharedTakes
  return out
}

const KIND_RANK = { seed: 0, lego: 1, phrase: 2 }

/**
 * COURSE ORDER, for walking the re-record batch: by course (first appearance), then seed, then
 * sentence before its LEGOs before its phrases, then the queue's own order.
 */
function courseOrder(lines, firstIndex) {
  const courseAt = new Map()
  lines.forEach((l) => { if (!courseAt.has(l.courseCode)) courseAt.set(l.courseCode, courseAt.size) })
  const seed = (l) => (l.seedNumber == null ? Number.MAX_SAFE_INTEGER : Number(l.seedNumber))
  const kind = (l) => (KIND_RANK[l.kind] == null ? 3 : KIND_RANK[l.kind])
  return [...lines].sort((a, b) =>
    (courseAt.get(a.courseCode) - courseAt.get(b.courseCode)) ||
    (seed(a) - seed(b)) ||
    (kind(a) - kind(b)) ||
    ((a.phrasePass || 0) - (b.phrasePass || 0)) ||
    (firstIndex.get(a.id) - firstIndex.get(b.id)))
}

/**
 * Every batch and line of this reader, indexed once: `pool` maps every line id to its wire line
 * and its place; `liveKeys` holds the audio keys of every line's CURRENT words; `courses` the
 * courses that have an unrecorded line (the only courses a text change can be in).
 */
function indexQueue(queue) {
  const phraseLines = typeof queue.allPhraseLines === 'function' ? queue.allPhraseLines() : (queue.lines || []).filter((l) => l.kind === 'phrase')
  const batches = batchesOf(queue.lines, phraseLines, queue.phraseBatches || [])
  const pool = new Map()
  const firstIndex = new Map()
  for (const b of batches) {
    for (const l of b.lines) {
      if (pool.has(l.id)) continue
      pool.set(l.id, { line: l, track: b.track, batch: b.batch })
      firstIndex.set(l.id, firstIndex.size)
    }
  }
  const liveKeys = new Set()
  const courses = new Set()
  for (const { line } of pool.values()) {
    for (const k of audioKeyCandidates(line.text)) liveKeys.add(k)
    if (!line.recorded && line.courseCode) courses.add(line.courseCode)
  }
  return { batches, pool, firstIndex, liveKeys, courses: [...courses] }
}

/** Is this stored take an orphan: do its words belong to no line of this reader any more? */
const isOrphanTake = (idx, take) => !audioKeyCandidates(take.text_normalized || take.text).some((k) => idx.liveKeys.has(k))

/**
 * THE LIST. `queue` is buildQueue's result (lines with recorded ones included; `allPhraseLines`
 * and `phraseBatches` when the reader reads phrases); `takes` this voice's stored takes.
 *
 * @returns {{items: object[], pool, firstIndex}} items in course order; `pool` maps every line
 *   id of this reader to its wire line and its place, for the batch read.
 */
function buildRerecordList(queue, takes = [], idx = indexQueue(queue)) {
  const { batches, pool, firstIndex, liveKeys } = idx
  const why = new Map()
  for (const b of batches) for (const l of skippedIn(b.lines)) why.set(l.id, { why: 'skipped' })
  const paired = pairTextChanges([...pool.values()].map((p) => p.line), liveKeys, takes)
  for (const [id, take] of paired) {
    why.set(id, {
      why: 'text_changed', oldText: take.text, recordedAt: take.created_at || null,
      ...(paired.shared && paired.shared.has(id) ? { shared: true, was: why.get(id) || null } : {}),
    })
  }
  const lines = courseOrder([...why.keys()].map((id) => pool.get(id).line), firstIndex)
  const items = lines.map((l) => {
    const p = pool.get(l.id)
    const w = why.get(l.id)
    return {
      lineId: l.id,
      why: w.why,
      text: l.text,
      knownText: l.knownText || null,
      oldText: w.oldText || null,
      recordedAt: w.recordedAt || null,
      ...(w.shared ? { sharedTake: true, was: w.was ? w.was.why : null } : {}),
      kind: l.kind || 'pod',
      courseCode: l.courseCode || null,
      seedNumber: l.seedNumber || null,
      track: p.track,
      batch: p.batch,
    }
  })
  return { items, pool, firstIndex }
}

/**
 * THE FOURTH REASON, 'didnt_match' (job #842, Tom's condition on moving the script check after
 * the upload's reply): a take that was SAVED but whose background whisper check says it does not
 * say its line (services/take-text-check-queue.cjs failuresFor). Unlike the other three the line
 * IS recorded — that is the point: the take is stored, and still needs reading again. A failure
 * for a line no longer in the reader's lines is dropped (nothing to open).
 *
 * @param {{items, pool, firstIndex}} list buildRerecordList's result (not mutated)
 * @param {object[]} failures {lineId, takeId, heard, reason, checkedAt}
 * @returns {{items, pool, firstIndex}} the list with didnt_match items added, in course order
 */
function withTextCheckFailures(list, failures = []) {
  const byId = new Map(list.items.map((it) => [it.lineId, it]))
  for (const f of failures || []) {
    const p = f && list.pool.get(f.lineId)
    if (!p) continue
    const l = p.line
    // The failed take is the line's newest news: it outranks a skip or a text change.
    byId.set(l.id, {
      lineId: l.id,
      why: 'didnt_match',
      text: l.text,
      knownText: l.knownText || null,
      oldText: null,
      recordedAt: f.takenAt || null,
      heard: f.heard || null,
      takeId: f.takeId || null,
      kind: l.kind || 'pod',
      courseCode: l.courseCode || null,
      seedNumber: l.seedNumber || null,
      track: p.track,
      batch: p.batch,
    })
  }
  const order = courseOrder([...byId.keys()].map((id) => list.pool.get(id).line), list.firstIndex)
  return { ...list, items: order.map((l) => byId.get(l.id)) }
}

/**
 * THE RE-RECORD BATCH's lines, for the record screen: every listed line plus the `also` ids the
 * page sends (its refused takes), unrecorded ones only, in course order. Each wire line carries
 * `rerecordWhy` (and `rerecordOldText` for a text change) so the screen can say why it is there.
 */
function rerecordBatchLines(list, alsoIds = []) {
  const want = new Map(list.items.map((it) => [it.lineId, it]))
  for (const id of alsoIds) {
    const p = list.pool.get(id)
    if (p && !p.line.recorded && !want.has(id)) want.set(id, { lineId: id, why: 'refused', oldText: null })
  }
  const lines = courseOrder([...want.keys()].map((id) => list.pool.get(id)).filter(Boolean).map((p) => p.line), list.firstIndex)
  return lines.map((l) => {
    const w = want.get(l.id)
    return {
      ...l,
      rerecordWhy: w.why,
      rerecordOldText: w.oldText || null,
      // a saved take that did not match its words: what whisper heard, and which take (job #842)
      ...(w.why === 'didnt_match' ? { rerecordHeard: w.heard || null, rerecordTakeId: w.takeId || null } : {}),
    }
  })
}

/** Which of the page's refused-take ids now have a good take (so the card drops them). */
function recordedAmong(list, ids = []) {
  return ids.filter((id) => { const p = list.pool.get(id); return !!(p && p.line.recorded) })
}

/**
 * Refused-take ids the re-record batch can NOT open: no longer in the artist's lines at all. The
 * card drops them from its count (they wait under "Clear old ones"), so the count and the batch
 * come from this one answer (Aran, job #806: "1 line to re-record" opened an empty batch).
 */
function goneAmong(list, ids = []) {
  return ids.filter((id) => !list.pool.get(id))
}

const EDIT_TABLES = { phrase: 'course_practice_phrases', seed: 'course_seeds', lego: 'course_legos' }

/**
 * WHERE A LINE'S WORDS LIVE, so a text change can say who made it (Aran, 2026-10-16, job #261:
 * "each one says WHY … 'text changed by X on <date>'"). `phrase:<course>:<id>:<role>` is the
 * phrase row `<course>:<id>`; `seed:<uuid>:<role>` and `lego:<uuid>:<role>` are rows by id. Pod
 * and other lines have no single content row: null, and the card says only that the text changed.
 */
function editRowOf(lineId) {
  const m = /^(phrase|seed|lego):(.+):([a-z0-9_]+)$/.exec(String(lineId || ''))
  return m ? { table: EDIT_TABLES[m[1]], id: m[2] } : null
}

/**
 * The text-change items with who last edited each row and when (`changedBy`, `changedAt`), from
 * `editors` (lineId -> {by, at}). A row with no attribution (a NULL last_edit_event_id means "none
 * was captured", never a guess — Tom, 2026-09-01) is left without one.
 */
function withEditors(list, editors = new Map()) {
  const items = []
  for (const it of list.items) {
    const e = it.why === 'text_changed' && editors.get(it.lineId)
    const out = e ? { ...it, changedBy: e.by || null, changedAt: e.at || null } : it
    if (it.sharedTake) {
      // A take shared with another line is a text change only when this line's own edit came after
      // the take (job #159); with no edit on record it is not claimed.
      const edited = e && e.at && it.recordedAt && new Date(e.at) > new Date(it.recordedAt)
      if (!edited) {
        if (it.was === 'skipped') items.push({ ...it, why: 'skipped', oldText: null, recordedAt: null, sharedTake: undefined, was: undefined })
        continue
      }
    }
    items.push(out)
  }
  return { ...list, items }
}

module.exports = {
  editRowOf, withEditors,
  goneAmong,
  RERECORD_TRACK, REACHED_DENSITY, MATCH_SAME_SEED, MATCH_TEXT_ONLY,
  batchesOf, skippedIn, similarity, pairTextChanges, courseOrder, indexQueue, isOrphanTake,
  buildRerecordList, rerecordBatchLines, recordedAmong, withTextCheckFailures,
}
