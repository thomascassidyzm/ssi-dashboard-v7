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
 *   `pieces` — the quarry, longest first: {key, text, knownText, words,
 *   source:'lego'|'word', legoId, readStyle:'gapped', free, freeReason}
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
      })
    } else if (l.target1_audio_id) legoByKey.get(key).audio = true
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

  // ---- (c) what a human must actually read ----
  const quarryKeys = coveringSet.filter((k) => !ownClip.has(k) && !fromPodAsRead.has(k))
  const fallbackNeeded = [...fallbackWords]
    .filter((w) => !ownClip.has(w) && !fromPodAsRead.has(w) && !legoByKey.has(w))

  // Longest first, so the hardest reads happen while the voice is fresh and the
  // single words are the easy tail (Tom's ordering, 2026-09-02).
  const pieces = [
    ...quarryKeys.map((k) => {
      const l = legoByKey.get(k)
      return {
        key: k, text: l.text, knownText: l.knownText, words: l.words.length,
        source: 'lego', legoId: l.legoId, readStyle: 'gapped',
        free: false, freeReason: null,
      }
    }),
    ...fallbackNeeded.map((w) => ({
      key: w, text: w, knownText: null, words: 1,
      source: 'word', legoId: null, readStyle: 'gapped',
      free: false, freeReason: null,
    })),
  ].sort((a, b) => (b.words - a.words) || a.key.localeCompare(b.key))

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
  const quarryWords = pieces.reduce((n, p) => n + p.words, 0)
  const quarryCuts = pieces.reduce((n, p) => n + Math.max(0, p.words - 1), 0)
  const quarrySec = pieces.length * SETUP_PER_LINE_SEC +
    (quarryWords / WORDS_PER_SEC_NATURAL) * GAPPED_SLOWDOWN + quarryCuts * PAUSE_PER_CUT_SEC
  const seedsWhole = seeds.filter((s) => !s.hasClip)
  const seedWords = seedsWhole.reduce((n, s) => n + words(s.text).length, 0)
  const seedSec = seedsWhole.length * SETUP_PER_LINE_SEC + seedWords / WORDS_PER_SEC_NATURAL

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
      quarryLegos: quarryKeys.length,
      quarryFallbackWords: fallbackNeeded.length,
      quarryPieces: pieces.length,
      seedsWhole: seedsWhole.length,
      phrasesWithoutOwnClip: phrases.filter((p) => !p.target1_audio_id).length,
      lines: pieces.length + seedsWhole.length,
      quarrySeconds: Math.round(quarrySec),
      seedSeconds: Math.round(seedSec),
      totalSeconds: Math.round(quarrySec + seedSec),
    },
  }
}

module.exports = {
  buildLegoQuarry,
  tile,
  indexInventory,
  DEFAULT_MAX_SEED,
}
