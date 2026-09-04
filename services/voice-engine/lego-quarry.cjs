/**
 * lego-quarry.cjs — THE MINIMAL PHRASE SET, computed once, called twice.
 *
 * Tom, 2026-09-02: "ideally I just want the minimal phrase set, that I can
 * record so we can test the dice and splice approach." This module answers the
 * question underneath that: given a course and a seed ceiling, what is the
 * SMALLEST set of pieces a human has to read so that clean splicing can
 * regenerate every practice phrase in scope?
 *
 * THE COVERING UNIT IS THE LEGO, NOT THE WORD (Tom's ruling, same day). Word
 * boundaries are where coarticulation damage is worst — which is why a gapped
 * read is needed at all. A LEGO already functions as a unit in the course, so
 * cutting at LEGO joints cuts where the language itself has a seam: a bigger
 * set than a word list, far smaller than every phrase, and each piece was
 * spoken as one natural gesture. Words are the FALLBACK, used only where no
 * LEGO covers the span — and they are READ TOO, not treated as free.
 *
 * TWO SPEEDS, and the distinction is load-bearing rather than cosmetic:
 *   - the quarry pieces are read GAPPED — naturally but slowly, with dead space
 *     around the words, so a cut lands in silence rather than mid-gesture;
 *   - the seed sentences are read WHOLE, at natural pace. A real whole
 *     recording always beats an assembled one, so anything that appears whole
 *     is ground truth that splice never has to touch.
 * Every piece this module returns carries `readStyle`, and the booth reads it.
 *
 * THE SET IS A FIXED SIZE, AND IT DOES NOT SHRINK AS YOU READ IT (2026-09-03).
 * Every covering LEGO and every fallback word is returned every time, each
 * carrying `free`, `freeReason` and the `audioId` already in its slot. Free
 * pieces used to be filtered out of `pieces` altogether, which meant a piece
 * disappeared the instant it was recorded and the booth could only ever say
 * "none recorded yet". Whether a clip counts as a given recordist's own take is
 * decided in ONE place -- take-selection.cjs -- and never here.
 *
 * WHAT COUNTS AS ALREADY-FREE, AND WHAT DOES NOT.
 *   - A unit with its own human clip is free, permanently. It is not splice
 *     material; it IS the teaching audio (Pool A, Kai's ruling 2026-08-21).
 *   - A POD line is free ONLY where the whole line is the unit. Pods are
 *     natural speech and services/voice-engine/align.cjs reads its boundaries
 *     from the PAUSES in a gapped read: on real Welsh takes it found ZERO of 88
 *     LEGO boundaries in natural-cadence audio (docs/recording/natural-take-
 *     lego-extraction-eval-2026-08-22.md). So "chop a pod at LEGO joints" is
 *     not a capability this estate has, and it is not counted as free.
 *   - PODS ARE PER LANGUAGE, not per course (Tom, 2026-09-02).
 *
 * This computation lived in tools/recording/measure-lego-quarry-2026-09-02.cjs
 * (job #125). It is here so the recordist queue and the measurement tool are
 * ONE computation with two callers — a screen that disagrees with the number in
 * the report is worse than either.
 *
 * Read-only. Nothing in here writes.
 */

'use strict'

const { normalizeForDb } = require('../shared/text-normalize.cjs')
const { canonicalLanguage } = require('../shared/clip-identity.cjs')

/** The default seed ceiling: 13 minutes of reading, which is an evening job. */
const DEFAULT_MAX_SEED = 30

// Natural reading pace. 2.5 words/second is the conventional read-aloud figure;
// the gapped read is slower and carries a deliberate pause at every cut point.
const WORDS_PER_SEC_NATURAL = 2.5
const GAPPED_SLOWDOWN = 1.6
const PAUSE_PER_CUT_SEC = 0.5
const SETUP_PER_LINE_SEC = 2.5   // finding the line, breathing, the odd re-read

const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean)
const norm = (t) => normalizeForDb(String(t || ''))

async function page(db, table, select, apply) {
  const out = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await apply(db.from(table).select(select)).range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data || []))
    if ((data || []).length < PAGE) break
  }
  return out
}

/**
 * Tile a phrase from the LEGO inventory, longest piece first. Returns the LEGO
 * keys used, and any words left over — the word-sized FALLBACK pieces.
 */
function tile(phraseText, legosByFirstWord) {
  const w = words(norm(phraseText))
  const used = []
  const leftover = []
  let i = 0
  while (i < w.length) {
    let matched = null
    // Longest LEGO starting here wins.
    for (const cand of legosByFirstWord.get(w[i]) || []) {
      const cw = cand.words
      if (cw.length > w.length - i) continue
      let ok = true
      for (let k = 0; k < cw.length; k++) if (cw[k] !== w[i + k]) { ok = false; break }
      if (ok) { matched = cand; break }
    }
    if (matched) { used.push(matched.key); i += matched.words.length }
    else { leftover.push(w[i]); i += 1 }
  }
  return { used, leftover }
}

/** Build the first-word index the tiler walks. Longest LEGO first. */
function indexInventory(inventory) {
  const byFirstWord = new Map()
  for (const l of inventory) {
    const k = l.words[0]
    if (!byFirstWord.has(k)) byFirstWord.set(k, [])
    byFirstWord.get(k).push(l)
  }
  return byFirstWord
}

/**
 * The minimal set for one course, up to a seed ceiling.
 *
 * @param {object} db supabase client
 * @param {string} courseCode
 * @param {object} [opts]
 * @param {number} [opts.maxSeed] seed ceiling (default 30)
 * @param {boolean} [opts.includePods] mine this language's pods for free lines.
 *        The measurement tool wants it; the queue does not pay for it, because
 *        no zzz course has a pod and the read costs a language-wide scan.
 * @returns {Promise<{courseCode, language, pieces, seeds, stats}|null>}
 *   `pieces` — the WHOLE quarry, longest first, free pieces included:
 *   {key, text, knownText, words, source:'lego'|'word', legoId, audioId,
 *   readStyle:'gapped', free, freeReason}
 *   `seeds`  — the whole natural reads: {seedId, seedNumber, text, knownText,
 *   readStyle:'natural', hasClip}
 */
async function buildLegoQuarry(db, courseCode, { maxSeed = DEFAULT_MAX_SEED, includePods = false } = {}) {
  const { data: course } = await db
    .from('courses').select('course_code, target_lang, known_lang').eq('course_code', courseCode).maybeSingle()
  if (!course) return null
  let language = null
  try { language = canonicalLanguage(course.target_lang) } catch { language = course.target_lang }

  const ceiling = (q) => q.eq('course_code', courseCode).lte('seed_number', maxSeed)
  const legos = await page(db, 'course_legos', 'lego_id, seed_number, known_text, target_text, target1_audio_id', ceiling)
  const phrases = await page(db, 'course_practice_phrases', 'id, seed_number, target_text, target1_audio_id', ceiling)
  const seedRows = await page(db, 'course_seeds', 'id, seed_number, known_text, target_text, target1_audio_id', ceiling)

  // ---- the LEGO inventory, deduped by clip identity (text), longest first ----
  const legoByKey = new Map()
  for (const l of legos) {
    const key = norm(l.target_text)
    if (!key) continue
    if (!legoByKey.has(key)) {
      legoByKey.set(key, {
        key, text: l.target_text, knownText: l.known_text || null,
        words: words(key), audio: !!l.target1_audio_id, legoId: l.lego_id,
        // WHICH clip fills the slot, not merely that one does. The queue needs
        // the id so it can ask whose voice it is: a slot filled by somebody else
        // is not this recordist's take (#378, 2026-09-03).
        audioId: l.target1_audio_id || null,
      })
    } else if (l.target1_audio_id) {
      legoByKey.get(key).audio = true
      if (!legoByKey.get(key).audioId) legoByKey.get(key).audioId = l.target1_audio_id
    }
  }
  const inventory = [...legoByKey.values()].sort((a, b) => b.words.length - a.words.length)
  const byFirstWord = indexInventory(inventory)

  // ---- (a) the covering set: LEGOs actually needed to reassemble the phrases ----
  const needed = new Set()
  const fallbackWords = new Set()
  let phrasesFullyTiled = 0
  for (const p of phrases) {
    const { used, leftover } = tile(p.target_text, byFirstWord)
    for (const u of used) needed.add(u)
    for (const lw of leftover) fallbackWords.add(lw)
    if (!leftover.length) phrasesFullyTiled += 1
  }
  const coveringSet = [...needed]

  // ---- (b) what is already free ----
  const ownClip = new Set(coveringSet.filter((k) => legoByKey.get(k).audio))

  let fromPodAsRead = new Set()
  let podChoppable = 0
  if (includePods) {
    const langCourses = ((await db.from('courses').select('course_code, target_lang')).data || [])
      .filter((c) => { try { return canonicalLanguage(c.target_lang) === language } catch { return false } })
      .map((c) => c.course_code)
    const pods = langCourses.length
      ? ((await db.from('listening_pods').select('id, course_code').in('course_code', langCourses)).data || [])
      : []
    const podLines = pods.length
      ? await page(db, 'listening_pod_sentences', 'id, target_text, target_audio_id', (q) => q.in('pod_id', pods.map((p) => p.id)))
      : []
    const recordedPodText = new Set(podLines.filter((s) => s.target_audio_id).map((s) => norm(s.target_text)))
    fromPodAsRead = new Set(coveringSet.filter((k) => !ownClip.has(k) && recordedPodText.has(k)))
    // How much a pod COULD buy if natural speech were choppable at LEGO joints
    // — reported, never counted, because it is not a capability this estate has.
    for (const k of coveringSet) {
      if (ownClip.has(k) || fromPodAsRead.has(k)) continue
      const lw = legoByKey.get(k).words.join(' ')
      for (const t of recordedPodText) {
        if (t === lw || t.includes(` ${lw} `) || t.startsWith(`${lw} `) || t.endsWith(` ${lw}`)) { podChoppable += 1; break }
      }
    }
  }

  // ---- (c) THE SET IS THE SET. FREENESS IS A PROPERTY OF A PIECE, NEVER A
  //          REASON TO DROP IT FROM THE LIST. ------------------------------
  //
  // This filtered the free pieces OUT, and that one line was the whole of the
  // 2026-09-03 booth defect. The moment Tom read a chunk, the take was linked
  // into course_legos.target1_audio_id, `ownClip` grew by one, and the piece
  // VANISHED from the set — so his own screen said "none recorded yet · 130
  // still to read" while 27 of his takes sat in the database, none of them
  // listed under "what you've already recorded" and none of them countable.
  // A set that shrinks as you read it cannot show progress: there is nothing
  // left to mark done.
  //
  // So every covering LEGO and every fallback word is returned, always, each
  // carrying whether it is already free and WHICH CLIP makes it so. Deciding
  // whether that clip counts as THIS recordist's take is not this module's
  // job — it belongs to the one resolver in take-selection.cjs, which is the
  // only thing on the estate allowed to answer it.
  const fallbackNeeded = [...fallbackWords].filter((w) => !legoByKey.has(w))

  const freeReasonFor = (k) => (ownClip.has(k) ? 'own_clip' : (fromPodAsRead.has(k) ? 'pod_as_read' : null))

  // Longest first, so the hardest reads happen while the voice is fresh and the
  // single words are the easy tail (Tom's ordering, 2026-09-02).
  const pieces = [
    ...coveringSet.map((k) => {
      const l = legoByKey.get(k)
      const reason = freeReasonFor(k)
      return {
        key: k, text: l.text, knownText: l.knownText, words: l.words.length,
        source: 'lego', legoId: l.legoId, readStyle: 'gapped',
        // The clip already in this LEGO's own slot, if any. Null is "empty".
        audioId: l.audioId || null,
        free: !!reason, freeReason: reason,
      }
    }),
    ...fallbackNeeded.map((w) => ({
      key: w, text: w, knownText: null, words: 1,
      source: 'word', legoId: null, readStyle: 'gapped',
      // A span of a sentence owns no row, so it has no slot to be filled: a
      // fallback word is only ever scored by clip identity.
      audioId: null,
      free: false, freeReason: null,
    })),
  ].sort((a, b) => (b.words - a.words) || a.key.localeCompare(b.key))

  // What is STILL TO READ, as its own set — the remainder, kept separately so
  // the SIZE of the set and the PROGRESS through it are two different numbers
  // in two different places, and neither has to shrink to express the other.
  const toRead = pieces.filter((p) => !p.free)

  const seeds = seedRows
    .slice()
    .sort((a, b) => (a.seed_number || 0) - (b.seed_number || 0))
    .map((s) => ({
      seedId: s.id, seedNumber: s.seed_number,
      text: String(s.target_text || '').trim(), knownText: s.known_text || null,
      readStyle: 'natural', hasClip: !!s.target1_audio_id,
    }))
    .filter((s) => s.text)

  // ---- (d) how long ----
  //
  // Measured over the WHOLE SET, not over what is left. "The minimal set --
  // 198 lines, about 13 minutes" is how big the job is, and it is the number a
  // person uses to choose a seed ceiling; it must not move because somebody has
  // started. The remainder is `stats.toRead`, and the recordist's own screen
  // says how far through they are from their own takes rather than from here.
  const timeFor = (quarryPieces, seedLines) => {
    const w = quarryPieces.reduce((n, p) => n + p.words, 0)
    const cuts = quarryPieces.reduce((n, p) => n + Math.max(0, p.words - 1), 0)
    const qSec = quarryPieces.length * SETUP_PER_LINE_SEC +
      (w / WORDS_PER_SEC_NATURAL) * GAPPED_SLOWDOWN + cuts * PAUSE_PER_CUT_SEC
    const sWords = seedLines.reduce((n, s) => n + words(s.text).length, 0)
    const sSec = seedLines.length * SETUP_PER_LINE_SEC + sWords / WORDS_PER_SEC_NATURAL
    return { quarrySeconds: Math.round(qSec), seedSeconds: Math.round(sSec), totalSeconds: Math.round(qSec + sSec) }
  }
  const seedsUnread = seeds.filter((s) => !s.hasClip)
  const whole = timeFor(pieces, seeds)
  const left = timeFor(toRead, seedsUnread)

  return {
    courseCode, language, maxSeed, pieces, seeds,
    stats: {
      legoRows: legos.length,
      distinctLegos: legoByKey.size,
      phrases: phrases.length,
      seedCount: seeds.length,
      coveringSet: coveringSet.length,
      phrasesFullyTiled,
      fallbackWords: fallbackWords.size,
      ownClip: ownClip.size,
      fromPodAsRead: fromPodAsRead.size,
      podChoppable,
      quarryLegos: coveringSet.length,
      quarryFallbackWords: fallbackNeeded.length,
      quarryPieces: pieces.length,
      seedsWhole: seeds.length,
      phrasesWithoutOwnClip: phrases.filter((p) => !p.target1_audio_id).length,
      lines: pieces.length + seeds.length,
      quarrySeconds: whole.quarrySeconds,
      seedSeconds: whole.seedSeconds,
      totalSeconds: whole.totalSeconds,
      // THE REMAINDER, for anything that reports the reading burden rather than
      // the size of the set -- the measurement tool's section (c) and (d).
      toRead: {
        legos: toRead.filter((p) => p.source === 'lego').length,
        words: toRead.filter((p) => p.source === 'word').length,
        pieces: toRead.length,
        seeds: seedsUnread.length,
        lines: toRead.length + seedsUnread.length,
        quarrySeconds: left.quarrySeconds,
        seedSeconds: left.seedSeconds,
        totalSeconds: left.totalSeconds,
      },
    },
  }
}

module.exports = {
  buildLegoQuarry,
  tile,
  indexInventory,
  DEFAULT_MAX_SEED,
}
