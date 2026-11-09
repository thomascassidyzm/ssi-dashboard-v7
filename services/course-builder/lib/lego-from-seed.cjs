/**
 * LEGO-FROM-SEED — is a LEGO's target made of its own seed's words, in the seed's order?
 *
 * THE RULE (canon L26, Kai 2026-09-09/10): a LEGO may contain only words its own seed
 * says. Kai's 9 Nov 2026 ruling on fry_for_eng (job #486, F1): LEGOs that swap in a
 * word the seed does not say are re-cut to the seed's own words.
 *
 * WHY THIS IS AT THE SUBMIT GATE (the root cause #486 found). The seed/complete gate
 * checks TILING only in one direction: every seed word must be covered by a LEGO or by
 * prior vocab. Nothing checked the other direction, so a LEGO could carry words the
 * seed never says and still pass. The fry_for_eng builder did exactly that whenever a
 * verb-final clause wrapped a long noun phrase and the whole clause broke the
 * 8-syllable LEGO cap (L3): it shortened the clause by putting a PRONOUN in for the
 * seed's noun (S0519L02 "ik haw se noch net sjoen" for "harren nije poppe", S0553L03
 * "ik fyn it hiel ûnsjoch" for "de lytse tsjerke", S0535L04, S0573L03). A prose rule
 * in the course's grammar_rules went live on 4 Nov and S0573 was still built that way
 * after it, because a rule in a 160k-character brief is not a gate.
 *
 * WHAT IT CHECKS. The LEGO's target tokens must appear in the seed's target tokens as
 * an in-order subsequence. Gaps are allowed — the stage-1 split shape ("ik hie it net
 * sein" from "ik hie it net op krekt deselde manier sein") drops a constituent another
 * LEGO teaches, and that is legitimate. A word that is not in the seed, or a reordering
 * the seed does not say ("dat er it net kieze soe" against "dat er net it … kieze soe"),
 * fails. What it CANNOT see: a LEGO that drops a modifier from inside its span
 * (S0571L03 dropped "hiel", S0590L02 dropped "lêste") is a gapped subsequence like the
 * legitimate splits, so that half stays a reading job.
 *
 * Bound clitics are not loosened here: "dat" is not "datstû" (Kai, 9 Nov: the clitic
 * belongs with its conjunction). Diacritics and case ARE folded, so a seed that writes
 * sentence-initial "Us" does not fail a LEGO that writes "ús" — that is a spelling
 * question about the seed, not a LEGO built from other words.
 *
 * Target side only: the known side has its own legitimate departures (want-you-to
 * English "that you ask", bare "to" on infinitives) that need judgement, not a gate.
 * Spaceless scripts are excluded and reported as excluded, never as clean (canon WC-F2).
 */
'use strict'

// Courses where a failure BLOCKS the submission. Everywhere else it is a warning on the
// response, so other builds are not stopped by a check that was calibrated on one course.
// Kai's ruling (9 Nov 2026, job #486) covers fry_for_eng; widening it is his call.
const BLOCKING_COURSES = new Set(['fry_for_eng'])

const SPACELESS = /[぀-ヿ㐀-䶿一-鿿豈-﫿฀-໿ក-៿က-႟ༀ-࿿]/u

function tokenise(text) {
  if (!text) return []
  const norm = String(text).normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC').toLowerCase()
  return norm.match(/[\p{L}\p{N}]+(?:['’ʼ][\p{L}\p{N}]+)*/gu) || []
}

/**
 * Which LEGO target words cannot be matched, in order, against the seed target?
 * Returns { status: 'ok' | 'excluded_spaceless' | 'excluded_empty', unmatched: string[] }.
 */
function legoWordsNotFromSeed(legoTarget, seedTarget) {
  if (SPACELESS.test(legoTarget || '') || SPACELESS.test(seedTarget || '')) {
    return { status: 'excluded_spaceless', unmatched: [] }
  }
  const lego = tokenise(legoTarget)
  const seed = tokenise(seedTarget)
  if (!lego.length || !seed.length) return { status: 'excluded_empty', unmatched: [] }
  const straight = unmatchedInOrder(lego, seed)
  if (!straight.length || lego.length < 2) return { status: 'ok', unmatched: straight }
  // VERB-SECOND INVERSION is not a reordering the seed lacks. A seed that fronts a word
  // inverts subject and verb ("Nee, spitigernôch haw ik se net sjoen", "…woe ik graach
  // ûntspanne"); its LEGO is rightly taught in plain order ("ik haw se net sjoen",
  // S0183L02; "ik woe graach ûntspanne", S0110L04). So the LEGO also passes with its
  // first two words swapped — but only where the seed really has those two words side by
  // side in the inverted order. Nothing wider: "dat er it net" stays a failure, and so does
  // "datstû it net graach brûkst" against "It is ûngewoan datstû dyn auto…" (S0121L03).
  const inverted = seed.some((w, k) => w === lego[1] && seed[k + 1] === lego[0])
  if (!inverted) return { status: 'ok', unmatched: straight }
  const swapped = unmatchedInOrder([lego[1], lego[0], ...lego.slice(2)], seed)
  return { status: 'ok', unmatched: swapped.length < straight.length ? swapped : straight }
}

/** Greedy in-order subsequence match: the LEGO words left over. */
function unmatchedInOrder(lego, seed) {
  const unmatched = []
  let i = 0
  for (const w of lego) {
    let j = i
    while (j < seed.length && seed[j] !== w) j += 1
    if (j < seed.length) i = j + 1
    else unmatched.push(w)
  }
  return unmatched
}

/** One finding per LEGO that fails, shaped for the seed/complete error or warning list. */
function checkLegosFromSeed(courseCode, seedTarget, legos, seedId) {
  const findings = []
  for (const lego of legos || []) {
    const r = legoWordsNotFromSeed(lego.target, seedTarget)
    if (r.status === 'ok' && r.unmatched.length) {
      findings.push({
        lego_id: `${seedId}L${String(lego.idx).padStart(2, '0')}`,
        known: lego.known,
        target: lego.target,
        not_from_seed: r.unmatched,
      })
    }
  }
  return { blocking: BLOCKING_COURSES.has(courseCode), findings }
}

const HINT = 'A LEGO is a piece of its own seed: its target uses only the seed\'s words, in the seed\'s order (canon L26). '
  + 'Never put a pronoun in for the seed\'s noun ("ik haw se noch net sjoen" where the seed says "harren nije poppe"), and never reorder the seed. '
  + 'If the whole clause is over the 8-syllable cap, leave out a piece another LEGO already teaches and keep the rest in seed order '
  + '("ik hie it net sein" from "ik hie it net op krekt deselde manier sein"). If no cut fits, say so in the chat for a human to rule on.'

module.exports = { BLOCKING_COURSES, tokenise, legoWordsNotFromSeed, checkLegosFromSeed, HINT }
