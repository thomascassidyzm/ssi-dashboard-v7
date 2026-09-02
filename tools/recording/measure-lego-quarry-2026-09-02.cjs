/**
 * THE FOUR NUMBERS. How much must a human actually read before dice-and-splice
 * can regenerate every phrase in a ~100-seed taster course?
 *
 * Tom, 2026-09-02: a community course must not need someone recording phrases
 * for a week before it is usable. Someone picks ~100 seeds; Popty computes the
 * MINIMAL SET a human records so that clean splicing regenerates the rest.
 *
 * THE COVERING UNIT IS THE LEGO, NOT THE WORD (Tom's ruling, same day). Word
 * boundaries are where coarticulation damage is worst -- which is why the gapped
 * read is needed at all. A LEGO already functions as a unit in the course, so
 * cutting at LEGO joints cuts where the language itself has a seam: a bigger set
 * than a word list, far smaller than every phrase, and each piece was spoken as
 * one natural gesture. Words are the FALLBACK, used only where no LEGO can be
 * reused.
 *
 * WHAT COUNTS AS ALREADY-FREE, AND WHAT DOES NOT.
 *   - A unit with its own human clip is free, permanently. It is not splice
 *     material; it IS the teaching audio (Pool A, Kai's ruling 2026-08-21).
 *   - A POD line is free ONLY where the whole line is the unit. Pods are natural
 *     speech, and services/voice-engine/align.cjs reads its boundaries from the
 *     PAUSES in a gapped read: on real Welsh takes it found ZERO of 88 LEGO
 *     boundaries in natural-cadence audio (docs/recording/natural-take-lego-
 *     extraction-eval-2026-08-22.md). So "chop a pod at LEGO joints" is not a
 *     capability this estate has, and it is not counted as free here.
 *   - PODS ARE PER LANGUAGE, not per course (Tom, 2026-09-02): pod mining is
 *     scoped by language, or the count manufactures phantom backlog.
 *
 * Read-only. Touches nothing.
 *
 *   node tools/recording/measure-lego-quarry-2026-09-02.cjs cym_n_for_eng 100
 */
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const { normalizeForDb } = require('../../services/shared/text-normalize.cjs')
const { canonicalLanguage } = require('../../services/shared/clip-identity.cjs')

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const COURSE = process.argv[2] || 'cym_n_for_eng'
const MAX_SEED = parseInt(process.argv[3] || '100', 10)

// Natural reading pace. 2.5 words/second is the conventional read-aloud figure;
// the gapped read is slower and carries a deliberate pause at every cut point.
const WORDS_PER_SEC_NATURAL = 2.5
const GAPPED_SLOWDOWN = 1.6
const PAUSE_PER_CUT_SEC = 0.5
const SETUP_PER_LINE_SEC = 2.5   // finding the line, breathing, the odd re-read

const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean)
const norm = (t) => normalizeForDb(String(t || ''))

async function page(table, select, apply) {
  const out = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    let q = db.from(table).select(select)
    q = apply(q)
    const { data, error } = await q.range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data || []))
    if ((data || []).length < PAGE) break
  }
  return out
}

/**
 * Tile a phrase from the LEGO inventory, longest piece first. Returns the LEGOs
 * used, and any words left over -- the word-sized FALLBACK pieces.
 */
function tile(phraseText, legosByFirstWord, legoSet) {
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

;(async () => {
  const { data: course } = await db.from('courses').select('course_code, target_lang, known_lang').eq('course_code', COURSE).single()
  const language = canonicalLanguage(course.target_lang)

  const legos = await page('course_legos', 'lego_id, seed_number, target_text, target1_audio_id',
    (q) => q.eq('course_code', COURSE).lte('seed_number', MAX_SEED))
  const phrases = await page('course_practice_phrases', 'id, seed_number, target_text, target1_audio_id',
    (q) => q.eq('course_code', COURSE).lte('seed_number', MAX_SEED))
  const seeds = await page('course_seeds', 'id, seed_number, target_text, target1_audio_id',
    (q) => q.eq('course_code', COURSE).lte('seed_number', MAX_SEED))

  // ---- the LEGO inventory, deduped by clip identity (text), longest first ----
  const legoByKey = new Map()
  for (const l of legos) {
    const key = norm(l.target_text)
    if (!key) continue
    if (!legoByKey.has(key)) legoByKey.set(key, { key, text: l.target_text, words: words(key), audio: !!l.target1_audio_id })
    else if (l.target1_audio_id) legoByKey.get(key).audio = true
  }
  const inventory = [...legoByKey.values()].sort((a, b) => b.words.length - a.words.length)
  const byFirstWord = new Map()
  for (const l of inventory) {
    const k = l.words[0]
    if (!byFirstWord.has(k)) byFirstWord.set(k, [])
    byFirstWord.get(k).push(l)
  }

  // ---- (a) the covering set: LEGOs actually needed to reassemble the phrases ----
  const needed = new Set()
  let fallbackWords = new Set()
  let phrasesFullyTiled = 0
  for (const p of phrases) {
    const { used, leftover } = tile(p.target_text, byFirstWord, legoByKey)
    for (const u of used) needed.add(u)
    for (const lw of leftover) fallbackWords.add(lw)
    if (!leftover.length) phrasesFullyTiled += 1
  }
  // Seeds are read whole -- they are their own natural read, not assembled.
  const coveringSet = [...needed]

  // ---- (b) what is already free ----
  // b1: the unit's OWN human clip.
  const ownClip = new Set()
  for (const key of coveringSet) if (legoByKey.get(key).audio) ownClip.add(key)

  // b2: pod lines OF THIS LANGUAGE (never of this course alone) that are already
  // recorded AND whose whole line IS the unit -- usable as read, no chopping.
  const langCourses = (await db.from('courses').select('course_code, target_lang')).data
    .filter((c) => { try { return canonicalLanguage(c.target_lang) === language } catch { return false } })
    .map((c) => c.course_code)
  const pods = (await db.from('listening_pods').select('id, course_code').in('course_code', langCourses)).data || []
  const podLines = pods.length
    ? await page('listening_pod_sentences', 'id, target_text, target_audio_id', (q) => q.in('pod_id', pods.map((p) => p.id)))
    : []
  const recordedPodText = new Set(podLines.filter((s) => s.target_audio_id).map((s) => norm(s.target_text)))
  const fromPodAsRead = new Set(coveringSet.filter((k) => !ownClip.has(k) && recordedPodText.has(k)))

  // How much a pod COULD buy if natural speech were choppable at LEGO joints --
  // reported, never counted, because it is not a capability this estate has.
  let podChoppable = 0
  for (const k of coveringSet) {
    if (ownClip.has(k) || fromPodAsRead.has(k)) continue
    const lw = legoByKey.get(k).words.join(' ')
    for (const t of recordedPodText) { if (t === lw || t.includes(` ${lw} `) || t.startsWith(`${lw} `) || t.endsWith(` ${lw}`)) { podChoppable += 1; break } }
  }

  // ---- (c) what a human must actually read ----
  const quarry = coveringSet.filter((k) => !ownClip.has(k) && !fromPodAsRead.has(k))
  // A phrase that already has its OWN whole natural recording is done for good --
  // a real whole read always beats an assembled one -- and is not splice material.
  const phrasesWhole = phrases.filter((p) => !p.target1_audio_id)
  const seedsWhole = seeds.filter((s) => !s.target1_audio_id)

  // ---- (d) how long ----
  // THE FALLBACK WORDS ARE PART OF THE READ. A word that no LEGO covers still has
  // to come from somewhere, so it is read too -- Tom's ruling is that words are
  // the fallback, not that they are free. Counting only the LEGOs would have
  // understated the list by nearly half on a from-scratch course.
  const fallbackNeeded = [...fallbackWords].filter((w) => !ownClip.has(w) && !fromPodAsRead.has(w) && !legoByKey.has(w))
  const quarryPieces = quarry.length + fallbackNeeded.length
  const quarryWords = quarry.reduce((n, k) => n + legoByKey.get(k).words.length, 0) + fallbackNeeded.length
  const quarryCuts = quarry.reduce((n, k) => n + Math.max(0, legoByKey.get(k).words.length - 1), 0)
  const quarrySec = quarryPieces * SETUP_PER_LINE_SEC +
    (quarryWords / WORDS_PER_SEC_NATURAL) * GAPPED_SLOWDOWN + quarryCuts * PAUSE_PER_CUT_SEC
  const seedWords = seedsWhole.reduce((n, s) => n + words(s.target_text).length, 0)
  const seedSec = seedsWhole.length * SETUP_PER_LINE_SEC + seedWords / WORDS_PER_SEC_NATURAL

  const mins = (s) => `${Math.round(s / 60)} min`
  console.log(`
${COURSE} -- seeds 1..${MAX_SEED} (${language})
${'='.repeat(58)}
  inventory            ${legos.length} LEGO rows, ${legoByKey.size} distinct by clip identity
                       ${phrases.length} practice phrases, ${seeds.length} seed sentences

(a) COVERING SET       ${coveringSet.length} distinct LEGOs regenerate every phrase
                       ${phrasesFullyTiled}/${phrases.length} phrases tile from LEGOs alone
                       ${fallbackWords.size} word-sized fallback pieces needed on top

(b) ALREADY FREE       ${ownClip.size} have their own human clip already
                       ${fromPodAsRead.size} more are a whole recorded POD line, usable as read
                       ${ownClip.size + fromPodAsRead.size} free in total
                       (a further ${podChoppable} sit INSIDE a recorded pod line -- not counted:
                        the aligner reads boundaries from pauses, and found 0 of 88
                        LEGO boundaries in natural-cadence Welsh)

(c) A HUMAN MUST READ  ${quarry.length} LEGOs, gapped, as the splice quarry
                       ${fallbackNeeded.length} single words no LEGO covers -- the fallback, read too
                       ${quarryPieces} pieces in the quarry altogether
                       ${seedsWhole.length} seed sentences, whole, at natural speed
                       ${phrasesWhole.length} phrases have no whole recording of their own

(d) ROUGHLY            the gapped quarry: ${mins(quarrySec)}
                       the seed sentences: ${mins(seedSec)}
                       -> ${mins(quarrySec + seedSec)} of reading in total
`)
})().catch((e) => { console.error(e.message); process.exit(1) })
