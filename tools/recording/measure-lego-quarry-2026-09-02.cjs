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
const { buildLegoQuarry } = require('../../services/voice-engine/lego-quarry.cjs')

// THE COMPUTATION LIVES IN services/voice-engine/lego-quarry.cjs, not here.
// The recordist booth serves the same set to Tom as its own queue section, and
// a screen that disagrees with this report would be worse than either number on
// its own. This script is now one of two callers of one function.
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const COURSE = process.argv[2] || 'cym_n_for_eng'
const MAX_SEED = parseInt(process.argv[3] || '100', 10)

;(async () => {
  const q = await buildLegoQuarry(db, COURSE, { maxSeed: MAX_SEED, includePods: true })
  if (!q) { console.error(`No course ${COURSE}`); process.exit(1) }
  const s = q.stats
  const mins = (sec) => `${Math.round(sec / 60)} min`
  console.log(`
${COURSE} -- seeds 1..${MAX_SEED} (${q.language})
${'='.repeat(58)}
  inventory            ${s.legoRows} LEGO rows, ${s.distinctLegos} distinct by clip identity
                       ${s.phrases} practice phrases, ${s.seedCount} seed sentences

(a) COVERING SET       ${s.coveringSet} distinct LEGOs regenerate every phrase
                       ${s.phrasesFullyTiled}/${s.phrases} phrases tile from LEGOs alone
                       ${s.fallbackWords} word-sized fallback pieces needed on top

(b) ALREADY FREE       ${s.ownClip} have their own human clip already
                       ${s.fromPodAsRead} more are a whole recorded POD line, usable as read
                       ${s.ownClip + s.fromPodAsRead} free in total
                       (a further ${s.podChoppable} sit INSIDE a recorded pod line -- not counted:
                        the aligner reads boundaries from pauses, and found 0 of 88
                        LEGO boundaries in natural-cadence Welsh)

(c) A HUMAN MUST READ  ${s.quarryLegos} LEGOs, gapped, as the splice quarry
                       ${s.quarryFallbackWords} single words no LEGO covers -- the fallback, read too
                       ${s.quarryPieces} pieces in the quarry altogether
                       ${s.seedsWhole} seed sentences, whole, at natural speed
                       ${s.phrasesWithoutOwnClip} phrases have no whole recording of their own

(d) ROUGHLY            the gapped quarry: ${mins(s.quarrySeconds)}
                       the seed sentences: ${mins(s.seedSeconds)}
                       -> ${s.lines} lines, ${mins(s.totalSeconds)} of reading in total
`)
})().catch((e) => { console.error(e.message); process.exit(1) })
