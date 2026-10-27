/**
 * booth-home.cjs — THE BOOTH'S HOME SCREEN: what a reader has to record, as cards and batches,
 * without sending them every line.
 *
 * Aran, 2026-10-14 (job #347, choosing Option A of the #335 mockups): the booth page opened by
 * fetching his WHOLE queue — 2060 lines, 2.2MB — and drawing every line, then dropped him on the
 * first unread line in queue order, which was a Health test line, not the 640 new sentences he
 * came to read. The home screen asks for a SUMMARY instead (this file), and the reader opens ONE
 * batch, whose lines alone come over the wire (`selectBatch`).
 *
 * DISPLAY AND TRANSPORT ONLY. Which lines are in the queue, their order, and what counts as
 * recorded are decided upstream (recordist-queue.cjs, phrase-queue.cjs) and are read here, never
 * re-decided: a track is a run of the queue's own lines in the queue's own order, a batch is a
 * slice of that run, and `recorded` is the wire line's own flag.
 *
 * ONE DEFINITION, TWO CALLERS: the summary and the batch read both cut with `trackKeyOf` and
 * `chunkTrack`, so the batch a card promises is the batch that loads.
 *
 * Pure: no I/O.
 */
'use strict'

const { isPhraseQueueCourse, PHRASE_QUEUE_COURSES } = require('./phrase-queue.cjs')

/**
 * ONE PHRASE CARD PER COURSE AND PASS (Aran, 2026-10-27, job #179). A reader of BOTH relaunch
 * courses — his English booth reads the English of North and South — had one card per pass
 * holding both courses' batches, titled after its first (North): 7,658 South lines sat on
 * "North practice phrases pass 1". Each course now has its own card per pass.
 *
 * The key of a reader's FIRST phrase course (PHRASE_QUEUE_COURSES order) stays `phrase.<pass>`,
 * so every existing address, tick and stored batch place keeps meaning what it meant (Catrin's
 * and Dan's single-course cards, Aran's North); a further course is `phrase.<pass>.<courseCode>`.
 * Identical English across courses is still ONE line (phrase-queue mergeAcrossCourses), on the
 * card of the batch that reaches it first, and its one take fills both courses' slots.
 */
function primaryPhraseCourse(phraseBatchesOrLines) {
  const have = new Set((phraseBatchesOrLines || []).map((b) => b.courseCode))
  return Object.keys(PHRASE_QUEUE_COURSES).find((c) => have.has(c)) || null
}
function phraseTrackKey(pass, courseCode, primary) {
  return !courseCode || courseCode === primary ? `phrase.${pass}` : `phrase.${pass}.${courseCode}`
}
/** `phrase.<pass>[.<courseCode>]` → {pass, courseCode}; a bare key is the primary course. */
function parsePhraseTrackKey(key, primary) {
  const [, pass, ...rest] = String(key).split('.')
  return { pass: Number(pass), courseCode: rest.length ? rest.join('.') : primary }
}
/** The plan batches one phrase card holds, in card order (card batch n = index + 1). */
function phraseBatchesOfTrack(key, phraseBatches) {
  if (!Array.isArray(phraseBatches)) return []
  const primary = primaryPhraseCourse(phraseBatches)
  const { pass, courseCode } = parsePhraseTrackKey(key, primary)
  return phraseBatches.filter((b) => b.pass === pass && (!courseCode || b.courseCode === courseCode))
}

/**
 * New sentences are read in batches of this many lines (Aran, 2026-10-14: "split the 640 new
 * North sentences into batches of about 100"). The cut is over every line, recorded or not, in
 * queue order, so a batch never changes under a reader while they record it.
 */
const SEED_BATCH_LINES = 100

/**
 * LEGOs are read in batches of this many too (Aran, 2026-10-14, job #378: every new-course LEGO
 * without a recording needs one — about 1,291 lines each for Dan and Eleri — "in batches of
 * about 100 in course order"). Same cut as sentences: every line, in queue order.
 */
const LEGO_BATCH_LINES = 100

/** The batch size of a track, or 0 for a track that is read whole (a script). */
function batchSizeOf(key) {
  if (key.startsWith('seed.')) return SEED_BATCH_LINES
  if (key.startsWith('lego.')) return LEGO_BATCH_LINES
  return 0
}

/** Which card a wire line belongs to. URL-safe: course codes and pod slugs are [a-z0-9_-]. */
function trackKeyOf(line) {
  const kind = line.kind || 'pod'
  if (kind === 'phrase') return line.phraseTrack || `phrase.${line.phrasePass || 1}`
  if (kind === 'seed') return `seed.${line.courseCode || 'all'}`
  // A Take G line is the same pod line read with gaps, queued straight after it, so it is part
  // of its pod's script rather than a card of its own.
  if ((kind === 'pod' || kind === 'takeg') && line.podSlug) return `pod.${line.podSlug}`
  return `${kind}.${line.courseCode || 'all'}`
}

/** A track's lines cut into batches. Sentence and LEGO tracks are cut; a script is read whole. */
function chunkTrack(key, lines) {
  const size = batchSizeOf(key)
  if (!size || lines.length <= size) return [lines]
  const out = []
  for (let i = 0; i < lines.length; i += size) out.push(lines.slice(i, i + size))
  return out
}

function groupTracks(lines) {
  const byKey = new Map()
  for (const line of lines) {
    const key = trackKeyOf(line)
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(line)
  }
  return byKey
}

const countRecorded = (lines) => lines.reduce((n, l) => n + (l.recorded ? 1 : 0), 0)

/**
 * The home screen's whole payload.
 *
 * @param {object[]} lines the queue's wire lines, recorded ones INCLUDED, in queue order
 * @param {object|null} phrases the queue's phrase summary (servePhraseBatch), or null
 * @param {object[]|null} phraseBatches every phrase batch of this reader (phraseBatchList)
 * @returns {object[]} tracks, in first-appearance (queue) order
 */
function buildHomeTracks(lines, phrases = null, phraseBatches = null) {
  const tracks = []
  for (const [key, trackLines] of groupTracks(lines)) {
    if (key.startsWith('phrase.')) continue // drawn from the whole plan below, not the one served batch
    const first = trackLines[0]
    let at = 0
    const batches = chunkTrack(key, trackLines).map((b, i) => {
      const from = at + 1
      at += b.length
      return { n: i + 1, from, to: at, total: b.length, recorded: countRecorded(b) }
    })
    tracks.push({
      key,
      kind: first.kind || 'pod',
      courseCode: first.courseCode || null,
      podSlug: first.podSlug || null,
      podTitle: first.podTitle || null,
      // Which side the card reads: 'known' on Aran's English LEGO cards (job #255), so the booth can name them.
      role: first.role || null,
      // A sentence of a course whose phrases this booth records (the v2 relaunch sandboxes) is
      // NEW reading, even though its seed row already exists in that course. #335 found these
      // 640 new North sentences filed under "seeds already in the course — not new".
      newCourse: isPhraseQueueCourse(first.courseCode),
      seedExisting: (first.kind === 'seed') ? trackLines.every((l) => !!l.seedExisting) : null,
      total: trackLines.length,
      recorded: countRecorded(trackLines),
      batches,
    })
  }
  if (phrases && !phrases.unavailable && Array.isArray(phraseBatches) && phraseBatches.length) {
    const primary = primaryPhraseCourse(phraseBatches)
    const courses = Object.keys(PHRASE_QUEUE_COURSES).filter((c) => phraseBatches.some((b) => b.courseCode === c))
    for (const pass of [1, 2]) for (const courseCode of courses) {
      const mine = phraseBatches.filter((b) => b.pass === pass && b.courseCode === courseCode)
      if (!mine.length) continue
      const total = mine.reduce((n, b) => n + b.total, 0)
      const recorded = mine.reduce((n, b) => n + b.recorded, 0)
      tracks.push({
        key: phraseTrackKey(pass, courseCode, primary),
        kind: 'phrase',
        pass,
        courseCode,
        total,
        recorded,
        // Every batch of the plan can be opened (job #697); `current` marks the one the queue
        // serves, which is what Up next recommends.
        batches: mine.map((b, i) => ({
          n: i + 1,
          batch: b.batch,
          courseCode: b.courseCode,
          courseLabel: b.courseLabel,
          firstSeed: b.firstSeed,
          lastSeed: b.lastSeed,
          total: b.total,
          recorded: b.recorded,
          held: b.held,
          current: isServedPhraseBatch(phrases, pass, b),
        })),
      })
    }
  }
  return tracks
}

/** Is this plan batch the one the queue is serving now? Same test the card's `current` uses. */
const isServedPhraseBatch = (phrases, pass, b) =>
  !!(phrases && phrases.pass === pass && phrases.batch === b.batch && phrases.courseCode === b.courseCode)

/**
 * The card number (`n`, 1-based within its pass) of the phrase batch the queue serves now, or
 * null when the pass has no served batch. A phrase card numbers its batches over the WHOLE plan
 * (buildHomeTracks) while the queue only ever carries the served batch's lines, so a batch
 * number from the card has to be matched against the plan, never used as an index into the
 * served lines — #365 found batch 2+ coming back empty that way.
 */
function servedPhraseBatchN(trackKey, phrases, phraseBatches) {
  const pass = Number(String(trackKey).split('.')[1])
  if (!phrases || phrases.unavailable || !Array.isArray(phraseBatches)) return null
  const i = phraseBatchesOfTrack(trackKey, phraseBatches).findIndex((b) => isServedPhraseBatch(phrases, pass, b))
  return i >= 0 ? i + 1 : null
}

/**
 * ANY PHRASE BATCH OF THE PLAN, by its card number (job #697, Aran: "we should be able to open
 * the current batch or future batches"). The served batch answers from the queue's own lines; any
 * other is read from the plan through `ctx.openPhraseBatch` — a read that moves no pointer, so
 * opening a future batch never changes which batch the queue serves anyone.
 * Returns {lines, summary} (summary = the opened batch's, same shape as queue.phrases) or null.
 */
function openPhraseBatch(trackLines, trackKey, n, ctx = {}) {
  if (n === servedPhraseBatchN(trackKey, ctx.phrases, ctx.phraseBatches)) return { lines: trackLines, summary: ctx.phrases }
  const pass = Number(trackKey.split('.')[1])
  const entry = phraseBatchesOfTrack(trackKey, ctx.phraseBatches)[n - 1] || null
  if (!entry || typeof ctx.openPhraseBatch !== 'function') return null
  const got = ctx.openPhraseBatch({ pass, batch: entry.batch, courseCode: entry.courseCode })
  return got && got.summary ? got : null
}

/**
 * The lines of ONE batch, for the booth's record screen. Unknown track or batch → [].
 *
 * PHRASE TRACKS: the queue holds only the batch it is serving, so the served batch answers from
 * its lines and any other batch of the plan is read on request (openPhraseBatch). Which batch is
 * SERVED is the queue's rule and is unchanged.
 *
 * @param {{phrases?: object, phraseBatches?: object[], openPhraseBatch?: Function}} [ctx]
 */
function selectBatch(lines, trackKey, batchN, ctx = {}) {
  const n = Number.isFinite(batchN) && batchN >= 1 ? batchN : 1
  if (trackKey.startsWith('phrase.')) {
    const trackLines = lines.filter((l) => trackKeyOf(l) === trackKey)
    const got = openPhraseBatch(trackLines, trackKey, n, ctx)
    return got ? got.lines : []
  }
  const trackLines = lines.filter((l) => trackKeyOf(l) === trackKey)
  if (!trackLines.length) return []
  const batches = chunkTrack(trackKey, trackLines)
  return batches[n - 1] || []
}

/**
 * WHICH KINDS OF SECTION THIS ANSWER COULD NOT COUNT (Aran, 2026-10-15, job #823: whole sections
 * kept disappearing from his booth home). The practice-phrase plan is read on its own, and when
 * that read fails or times out the queue carries `phrases: {unavailable: true}` and no phrase
 * lines — which used to send a home screen with no phrase sections at all, as if he had none.
 * The answer now says it is partial, so nothing downstream reads an absence as "not cast".
 */
function partialKinds(queue) {
  return queue && queue.phrases && queue.phrases.unavailable ? ['phrase'] : []
}

/**
 * A SECTION IS NEVER DROPPED BECAUSE ITS COUNT FAILED (job #823). Given this answer's tracks, the
 * kinds it could not count, and the last tracks this voice was sent in full, the sections of an
 * uncounted kind are carried over with their last known counts and marked `counting: true`.
 * Sections of every other kind are this answer's own. Pure.
 */
function withLastKnownSections(tracks, partial, lastKnown) {
  if (!partial || !partial.length || !Array.isArray(lastKnown) || !lastKnown.length) return tracks
  const kinds = new Set(partial)
  const have = new Set(tracks.map((t) => t.key))
  const carried = lastKnown.filter((t) => kinds.has(t.kind) && !have.has(t.key)).map((t) => ({ ...t, counting: true }))
  return carried.length ? [...tracks, ...carried] : tracks
}

module.exports = { primaryPhraseCourse, phraseTrackKey, parsePhraseTrackKey, phraseBatchesOfTrack, partialKinds, withLastKnownSections, SEED_BATCH_LINES, LEGO_BATCH_LINES, trackKeyOf, chunkTrack, buildHomeTracks, selectBatch, openPhraseBatch, servedPhraseBatchN }
